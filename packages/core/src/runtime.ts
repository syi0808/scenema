import { ScenemaError } from "./errors.js";
import type {
  Actor,
  ClickOperation,
  ConditionWaiter,
  CursorMoveOperation,
  Durability,
  NavigationOperation,
  Operation,
  OperationExecutionContext,
  OperationHandler,
  PresentOperation,
  Presenter,
  PressOperation,
  ResolvedTarget,
  RuntimeInspection,
  RuntimeStatus,
  ScenarioDefinition,
  ScenarioSession,
  SessionStore,
  StepDefinition,
  Target,
  TypeOperation,
  WaitOperation,
} from "./types.js";

export interface RuntimeOptions {
  actor: Actor;
  presenter: Presenter;
  sessionStore: SessionStore;
  conditionWaiter: ConditionWaiter;
  operationHandlers?: Readonly<Record<string, OperationHandler>>;
  resolveTarget?: (target: Target) => Promise<ResolvedTarget> | ResolvedTarget;
  createId?: () => string;
  now?: () => number;
  clickDelay?: number;
  cursorMoveDelay?: number;
  defaultNavigationTimeout?: number;
  onError?: (error: ScenemaError, inspection: RuntimeInspection) => void;
  logger?: (message: string, context?: Record<string, unknown>) => void;
  onSessionChange?: (session: ScenarioSession, status: RuntimeStatus) => void;
  onSessionStop?: () => void;
}

interface OperationLocation {
  step: StepDefinition;
  stepIndex: number;
  operation: Operation;
  operationIndex: number;
  address: string;
}

export class ScenarioRuntime {
  private scenario: ScenarioDefinition | null = null;
  private session: ScenarioSession | null = null;
  private activeOperation: Promise<void> | null = null;
  private reconciliation: Promise<void> | null = null;
  private status: RuntimeStatus = "idle";
  private readyStepId: string | null = null;
  private readonly createId: () => string;
  private readonly now: () => number;

  constructor(private readonly options: RuntimeOptions) {
    this.createId = options.createId ?? (() => globalThis.crypto.randomUUID());
    this.now = options.now ?? Date.now;
  }

  async start(scenario: ScenarioDefinition): Promise<ScenarioSession> {
    if (this.session) this.stop();
    this.activeOperation = null;
    this.reconciliation = null;
    const firstStep = scenario.steps[0];
    if (!firstStep) return this.fail("INVALID_SCENARIO", "A scenario needs at least one step.");

    this.scenario = scenario;
    this.readyStepId = null;
    this.status = "running";
    this.session = {
      schemaVersion: 2,
      id: this.createId(),
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      position: { stepId: firstStep.id, operationIndex: 0 },
      completedOperations: [],
      revision: 0,
      updatedAt: this.now(),
    };
    this.persist("session started");
    await this.drive();
    return this.requireSession();
  }

  async resume(scenario: ScenarioDefinition, session: ScenarioSession): Promise<void> {
    if (scenario.id !== session.scenarioId) {
      return this.fail("SCENARIO_NOT_FOUND", `Session expects scenario ${session.scenarioId}.`);
    }
    if (scenario.version !== session.scenarioVersion) {
      return this.fail("SCENARIO_VERSION_MISMATCH", "Persisted scenario version is incompatible.", {
        persisted: session.scenarioVersion,
        current: scenario.version,
      });
    }

    this.scenario = scenario;
    this.session = session;
    this.readyStepId = null;
    this.status = session.pendingOperation?.kind === "navigate" ? "navigating" : "running";
    this.requireStep(session.position.stepId);
    this.log("session restored");

    if (session.pendingOperation) {
      if (session.pendingOperation.kind === "navigate") {
        await this.reconcile();
        return;
      }
      if (session.pendingOperation.durability === "at-most-once") {
        this.completePendingAtMostOnce();
      }
    }

    await this.restoreCursor();
    await this.drive();
  }

  proceed(): Promise<void> {
    if (this.activeOperation) return this.activeOperation;
    const location = this.currentLocation();
    if (this.status !== "presenting" || !location || location.operation.kind !== "present") {
      return Promise.reject(
        new ScenemaError("INVALID_RUNTIME_STATE", "proceed() is only valid while presenting."),
      );
    }
    const presentation = location.operation as PresentOperation;
    if ((presentation.advance ?? "user") !== "user") {
      return Promise.reject(
        new ScenemaError(
          "INVALID_RUNTIME_STATE",
          "The current presentation advances automatically.",
        ),
      );
    }

    const activeOperation = this.proceedFromPresentation(location).finally(() => {
      if (this.activeOperation === activeOperation) this.activeOperation = null;
    });
    this.activeOperation = activeOperation;
    return this.activeOperation;
  }

  back(): Promise<void> {
    if (this.activeOperation) return this.activeOperation;
    if (this.status !== "presenting") {
      return Promise.reject(
        new ScenemaError("INVALID_RUNTIME_STATE", "back() is only valid while presenting."),
      );
    }
    const activeOperation = this.showPreviousPresentation().finally(() => {
      if (this.activeOperation === activeOperation) this.activeOperation = null;
    });
    this.activeOperation = activeOperation;
    return this.activeOperation;
  }

  stop(): void {
    this.options.presenter.dismiss();
    if (this.session) {
      this.options.sessionStore.remove(this.session.id);
      this.options.onSessionStop?.();
    }
    this.session = null;
    this.scenario = null;
    this.activeOperation = null;
    this.reconciliation = null;
    this.readyStepId = null;
    this.status = "idle";
    this.log("session stopped");
  }

  reconcile(): Promise<void> {
    if (this.reconciliation) return this.reconciliation;
    const reconciliation = this.reconcileNavigation().finally(() => {
      if (this.reconciliation === reconciliation) this.reconciliation = null;
    });
    this.reconciliation = reconciliation;
    return this.reconciliation;
  }

  private async reconcileNavigation(): Promise<void> {
    const session = this.requireSession();
    const pending = session.pendingOperation;
    if (!pending || pending.kind !== "navigate") return;
    if (pending.timeout !== undefined && this.now() - pending.startedAt >= pending.timeout) {
      return this.fail("NAVIGATION_TIMEOUT", "Navigation did not reach the next step in time.", {
        pendingOperation: pending,
      });
    }

    this.status = "navigating";
    if (this.currentAddress() === pending.address) {
      this.addCompleted(pending.address);
      this.advancePosition();
      pending.status = "performed";
      this.persist("navigation performed");
    }

    const step = this.currentStep();
    if (!step) {
      delete session.pendingOperation;
      this.completeScenario();
      return;
    }
    if (step.ready) {
      const remaining =
        pending.timeout === undefined
          ? undefined
          : Math.max(0, pending.startedAt + pending.timeout - this.now());
      try {
        await this.options.conditionWaiter.waitFor(
          step.ready,
          remaining === undefined ? undefined : { timeout: remaining },
        );
      } catch (error) {
        if (error instanceof ScenemaError && error.code === "TARGET_NOT_FOUND") {
          return this.fail(
            "NAVIGATION_TIMEOUT",
            "Navigation did not satisfy the next step readiness in time.",
            { pendingOperation: pending, cause: error },
          );
        }
        throw error;
      }
      if (this.session !== session) return;
    }
    this.readyStepId = step.id;
    delete session.pendingOperation;
    this.status = "running";
    this.persist("navigation reconciled");
    await this.drive();
  }

  inspect(): RuntimeInspection {
    const session = this.session;
    const currentStep = session && this.scenario ? this.findStep(session.position.stepId) : null;
    const currentOperation =
      currentStep?.operations[session?.position.operationIndex ?? -1] ?? null;
    return {
      session: session ? structuredClone(session) : null,
      currentStep,
      currentOperation,
      status: this.status,
      pendingOperation: session?.pendingOperation
        ? structuredClone(session.pendingOperation)
        : null,
    };
  }

  private async drive(): Promise<void> {
    const session = this.requireSession();
    if (session.pendingOperation?.kind === "navigate") {
      await this.reconcile();
      return;
    }
    this.status = "running";

    while (this.session === session) {
      const step = this.currentStep();
      if (!step) {
        this.completeScenario();
        return;
      }
      if (this.readyStepId !== step.id) {
        if (step.ready) await this.options.conditionWaiter.waitFor(step.ready);
        if (this.session !== session) return;
        this.readyStepId = step.id;
      }

      const location = this.currentLocation();
      if (!location) {
        if (!this.advancePosition()) {
          this.completeScenario();
          return;
        }
        continue;
      }

      if (session.completedOperations.includes(location.address)) {
        this.advancePosition();
        continue;
      }

      if (location.operation.kind === "present") {
        const presentation = location.operation as PresentOperation;
        await this.showPresentation(location, presentation);
        if (this.session !== session) return;
        if ((presentation.advance ?? "user") === "user") return;
        this.options.presenter.dismiss();
        this.completeCurrent(location.address, "automatic presentation completed");
        continue;
      }

      await this.executeOperation(location);
      if (location.operation.kind === "navigate") return;
    }
  }

  private async executeOperation(location: OperationLocation): Promise<void> {
    const { operation, address } = location;
    switch (operation.kind) {
      case "cursor.move": {
        const sessionId = this.requireSession().id;
        const cursor = operation as CursorMoveOperation;
        await this.wait(cursor.options?.delay ?? this.options.cursorMoveDelay);
        await this.options.actor.moveTo(await this.resolveTarget(cursor.target), cursor.options);
        if (!this.isCurrent(sessionId, address)) return;
        this.completeCurrent(address, "cursor moved");
        return;
      }
      case "click": {
        const click = operation as ClickOperation;
        await this.executeAtMostOnce(location, async () => {
          await this.wait(click.options?.delay ?? this.options.clickDelay);
          await this.options.actor.click(await this.resolveTarget(click.target), click.options);
        });
        return;
      }
      case "type": {
        const sessionId = this.requireSession().id;
        const type = operation as TypeOperation;
        await this.options.actor.type(
          await this.resolveTarget(type.target),
          type.value,
          type.options,
        );
        if (!this.isCurrent(sessionId, address)) return;
        this.completeCurrent(address, "value typed");
        return;
      }
      case "press": {
        const press = operation as PressOperation;
        if (!this.options.actor.press) {
          return this.fail("TARGET_CAPABILITY_MISMATCH", "The configured actor cannot press keys.");
        }
        await this.executeAtMostOnce(location, async () => {
          await this.wait(press.options?.delay);
          await this.options.actor.press!(press.key, press.options);
        });
        return;
      }
      case "wait": {
        const sessionId = this.requireSession().id;
        const wait = operation as WaitOperation;
        await this.options.conditionWaiter.waitFor(
          wait.condition,
          wait.timeout === undefined ? undefined : { timeout: wait.timeout },
        );
        if (!this.isCurrent(sessionId, address)) return;
        this.completeCurrent(address, "condition satisfied");
        return;
      }
      case "navigate": {
        await this.executeNavigation(location, operation as NavigationOperation);
        return;
      }
      default:
        await this.executeCustom(location);
    }
  }

  private async executeAtMostOnce(
    location: OperationLocation,
    perform: () => Promise<void>,
  ): Promise<void> {
    const sessionId = this.requireSession().id;
    this.preparePending(location, "at-most-once");
    await perform();
    if (!this.isCurrent(sessionId, location.address)) return;
    this.completeCurrent(location.address, `${location.operation.kind} completed`);
  }

  private async executeNavigation(
    location: OperationLocation,
    navigation: NavigationOperation,
  ): Promise<void> {
    const sessionId = this.requireSession().id;
    const timeout = navigation.timeout ?? this.options.defaultNavigationTimeout ?? 15_000;
    this.preparePending(location, "reconcile", timeout);
    this.status = "navigating";
    const action = navigation.action;
    if (action.kind === "click") {
      await this.wait(action.options?.delay ?? this.options.clickDelay);
      await this.options.actor.click(await this.resolveTarget(action.target), action.options);
    } else {
      if (!this.options.actor.press) {
        return this.fail("TARGET_CAPABILITY_MISMATCH", "The configured actor cannot press keys.");
      }
      await this.wait(action.options?.delay);
      await this.options.actor.press(action.key, action.options);
    }
    if (
      !this.isCurrent(sessionId, location.address) ||
      this.session?.pendingOperation?.address !== location.address
    )
      return;
    await this.reconcile();
  }

  private async executeCustom(location: OperationLocation): Promise<void> {
    const sessionId = this.requireSession().id;
    const handler = this.options.operationHandlers?.[location.operation.kind];
    if (!handler) {
      return this.fail(
        "OPERATION_NOT_FOUND",
        `No operation handler is registered for ${location.operation.kind}.`,
      );
    }
    const durability = handler.durability ?? "replay-safe";
    if (durability !== "replay-safe") this.preparePending(location, durability);
    await handler.execute(location.operation, this.executionContext(location));
    if (!this.isCurrent(sessionId, location.address)) return;
    this.completeCurrent(location.address, `${location.operation.kind} completed`);
  }

  private executionContext(location: OperationLocation): OperationExecutionContext {
    return {
      scenario: this.requireScenario(),
      step: location.step,
      session: this.requireSession(),
      address: location.address,
      actor: this.options.actor,
      waitFor: (condition, options) => this.options.conditionWaiter.waitFor(condition, options),
      resolveTarget: (target) => this.resolveTarget(target),
    };
  }

  private async showPresentation(
    location: OperationLocation,
    presentation: PresentOperation,
  ): Promise<void> {
    const sessionId = this.requireSession().id;
    const checkpoints = this.presentationCheckpoints();
    const progressIndex = checkpoints.findIndex(({ address }) => address === location.address);
    const stepPresentations = location.step.operations.filter(
      (operation) => operation.kind === "present",
    );
    const presentationIndex = stepPresentations.indexOf(presentation);
    const interaction = this.resolveInteraction(location, presentation);
    const target =
      presentation.target === undefined ? undefined : await this.resolveTarget(presentation.target);
    if (!this.isCurrent(sessionId, location.address)) return;
    this.status = "presenting";
    this.persist("presentation checkpoint");
    await this.options.presenter.present(presentation.content, {
      scenarioId: this.requireScenario().id,
      step: { id: location.step.id, index: location.stepIndex },
      presentation: { index: presentationIndex },
      progress: {
        current: progressIndex < 0 ? 0 : progressIndex + 1,
        total: checkpoints.length,
      },
      ...(target === undefined ? {} : { target }),
      canBack: this.previousCheckpoint(location.address) !== null,
      interaction,
      ...(presentation.placement === undefined ? {} : { placement: presentation.placement }),
      controls: {
        proceed: () => void this.proceed(),
        back: () => void this.back(),
        stop: () => this.stop(),
      },
    });
  }

  private resolveInteraction(
    location: OperationLocation,
    presentation: PresentOperation,
  ): "locked" | "passthrough" {
    if (presentation.interaction === "locked" || presentation.interaction === "passthrough") {
      return presentation.interaction;
    }
    const remaining = location.step.operations.slice(location.operationIndex + 1);
    const beforeNextPresentation = remaining.slice(
      0,
      remaining.findIndex((operation) => operation.kind === "present") < 0
        ? remaining.length
        : remaining.findIndex((operation) => operation.kind === "present"),
    );
    return beforeNextPresentation.some((operation) =>
      ["click", "type", "press", "navigate"].includes(operation.kind),
    )
      ? "locked"
      : "passthrough";
  }

  private async proceedFromPresentation(location: OperationLocation): Promise<void> {
    this.options.presenter.dismiss();
    this.status = "running";
    this.completeCurrent(location.address, "presentation proceeded");
    await this.drive();
  }

  private async showPreviousPresentation(): Promise<void> {
    const address = this.currentAddress();
    if (!address) return;
    const previous = this.previousCheckpoint(address);
    if (!previous) return;
    this.options.presenter.dismiss();
    const session = this.requireSession();
    session.position = {
      stepId: previous.step.id,
      operationIndex: previous.operationIndex,
    };
    this.readyStepId = previous.step.id;
    this.persist("presentation moved back");
    await this.showPresentation(previous, previous.operation as PresentOperation);
  }

  private previousCheckpoint(address: string): OperationLocation | null {
    const checkpoints = this.presentationCheckpoints();
    const index = checkpoints.findIndex((candidate) => candidate.address === address);
    return index > 0 ? checkpoints[index - 1]! : null;
  }

  private presentationCheckpoints(): OperationLocation[] {
    const result: OperationLocation[] = [];
    this.requireScenario().steps.forEach((step, stepIndex) => {
      step.operations.forEach((operation, operationIndex) => {
        if (operation.kind !== "present") return;
        const presentation = operation as PresentOperation;
        if ((presentation.advance ?? "user") === "auto") return;
        result.push({
          step,
          stepIndex,
          operation,
          operationIndex,
          address: this.address(step.id, operationIndex),
        });
      });
    });
    return result;
  }

  private preparePending(
    location: OperationLocation,
    durability: Durability,
    timeout?: number,
  ): void {
    const session = this.requireSession();
    session.pendingOperation = {
      address: location.address,
      kind: location.operation.kind,
      durability,
      status: "prepared",
      startedAt: this.now(),
      ...(timeout === undefined ? {} : { timeout }),
    };
    this.persist(`${location.operation.kind} prepared`);
  }

  private completePendingAtMostOnce(): void {
    const session = this.requireSession();
    const pending = session.pendingOperation;
    if (!pending) return;
    this.addCompleted(pending.address);
    if (this.currentAddress() === pending.address) this.advancePosition();
    delete session.pendingOperation;
    this.persist("at-most-once operation recovered");
  }

  private completeCurrent(address: string, message: string): void {
    const session = this.requireSession();
    this.addCompleted(address);
    delete session.pendingOperation;
    this.advancePosition();
    this.persist(message);
  }

  private addCompleted(address: string): void {
    const completed = this.requireSession().completedOperations;
    if (!completed.includes(address)) completed.push(address);
  }

  private advancePosition(): boolean {
    const session = this.requireSession();
    const step = this.requireStep(session.position.stepId);
    const nextOperationIndex = session.position.operationIndex + 1;
    if (nextOperationIndex < step.operations.length) {
      session.position.operationIndex = nextOperationIndex;
      return true;
    }
    const stepIndex = this.requireScenario().steps.indexOf(step);
    const nextStep = this.requireScenario().steps[stepIndex + 1];
    if (!nextStep) {
      session.position.operationIndex = step.operations.length;
      return false;
    }
    session.position = { stepId: nextStep.id, operationIndex: 0 };
    this.readyStepId = null;
    return true;
  }

  private completeScenario(): void {
    const session = this.requireSession();
    delete session.pendingOperation;
    this.status = "complete";
    this.options.presenter.dismiss();
    this.persist("scenario complete");
  }

  private async restoreCursor(): Promise<void> {
    if (!this.options.actor.restoreCursor) return;
    const currentOrder = this.operationOrder(this.requireSession().position);
    const cursor = this.allLocations()
      .slice(0, currentOrder)
      .reverse()
      .find(
        (location) =>
          location.operation.kind === "cursor.move" &&
          this.requireSession().completedOperations.includes(location.address),
      );
    if (!cursor) return;
    try {
      await this.options.actor.restoreCursor(
        await this.resolveTarget((cursor.operation as CursorMoveOperation).target),
      );
    } catch (error) {
      this.log("cursor restore skipped", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private allLocations(): OperationLocation[] {
    const result: OperationLocation[] = [];
    this.requireScenario().steps.forEach((step, stepIndex) => {
      step.operations.forEach((operation, operationIndex) => {
        result.push({
          step,
          stepIndex,
          operation,
          operationIndex,
          address: this.address(step.id, operationIndex),
        });
      });
    });
    return result;
  }

  private operationOrder(position: ScenarioSession["position"]): number {
    const locations = this.allLocations();
    const index = locations.findIndex(
      ({ step, operationIndex }) =>
        step.id === position.stepId && operationIndex === position.operationIndex,
    );
    return index < 0 ? locations.length : index;
  }

  private currentLocation(): OperationLocation | null {
    const session = this.requireSession();
    const step = this.requireStep(session.position.stepId);
    const operation = step.operations[session.position.operationIndex];
    if (!operation) return null;
    return {
      step,
      stepIndex: this.requireScenario().steps.indexOf(step),
      operation,
      operationIndex: session.position.operationIndex,
      address: this.address(step.id, session.position.operationIndex),
    };
  }

  private currentStep(): StepDefinition | null {
    if (!this.session) return null;
    return this.findStep(this.session.position.stepId);
  }

  private currentAddress(): string | null {
    const session = this.requireSession();
    const step = this.findStep(session.position.stepId);
    if (!step || !step.operations[session.position.operationIndex]) return null;
    return this.address(step.id, session.position.operationIndex);
  }

  private isCurrent(sessionId: string, address: string): boolean {
    return this.session?.id === sessionId && this.currentAddress() === address;
  }

  private address(stepId: string, operationIndex: number): string {
    return `${stepId}/${operationIndex}`;
  }

  private async resolveTarget(target: Target): Promise<ResolvedTarget> {
    if (this.options.resolveTarget) return this.options.resolveTarget(target);
    if (typeof target === "function") {
      return this.fail(
        "TARGET_NOT_FOUND",
        "A target resolver requires a runtime target resolution environment.",
      );
    }
    return target;
  }

  private async wait(delay: number | undefined): Promise<void> {
    const duration = Math.max(0, delay ?? 0);
    if (duration > 0) {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, duration));
    }
  }

  private persist(message: string): void {
    const session = this.requireSession();
    session.revision += 1;
    session.updatedAt = this.now();
    const copy = structuredClone(session);
    this.options.sessionStore.write(copy);
    this.options.onSessionChange?.(structuredClone(session), this.status);
    this.log(message, {
      stepId: session.position.stepId,
      operationIndex: session.position.operationIndex,
      status: this.status,
    });
  }

  private requireScenario(): ScenarioDefinition {
    if (!this.scenario) throw new ScenemaError("INVALID_RUNTIME_STATE", "No scenario is loaded.");
    return this.scenario;
  }

  private requireSession(): ScenarioSession {
    if (!this.session) {
      throw new ScenemaError("INVALID_RUNTIME_STATE", "No scenario session is active.");
    }
    return this.session;
  }

  private findStep(id: string): StepDefinition | null {
    return this.scenario?.steps.find((candidate) => candidate.id === id) ?? null;
  }

  private requireStep(id: string): StepDefinition {
    const step = this.findStep(id);
    if (!step) {
      throw new ScenemaError("INVALID_SESSION_STATE", `Session references unknown step ${id}.`);
    }
    return step;
  }

  private fail(
    code: ScenemaError["code"],
    message: string,
    context: Record<string, unknown> = {},
  ): never {
    const error = new ScenemaError(code, message, context);
    this.options.onError?.(error, this.inspect());
    throw error;
  }

  private log(message: string, context?: Record<string, unknown>): void {
    this.options.logger?.(`[scenema] ${message}`, context);
  }
}
