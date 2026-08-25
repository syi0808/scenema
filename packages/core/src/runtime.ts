import { ScenemaError } from "./errors.js";
import type {
  Actor,
  ConditionWaiter,
  Presenter,
  RuntimeInspection,
  ScenarioDefinition,
  ScenarioSession,
  SceneDefinition,
  SceneMatcher,
  SessionStore,
  StepDefinition,
  Target,
  TransitionDefinition,
} from "./types.js";

export interface RuntimeOptions {
  actor: Actor;
  presenter: Presenter;
  sessionStore: SessionStore;
  sceneMatcher: SceneMatcher;
  conditionWaiter: ConditionWaiter;
  createId?: () => string;
  now?: () => number;
  clickDelay?: number;
  defaultTransitionTimeout?: number;
  onError?: (error: ScenemaError, inspection: RuntimeInspection) => void;
  logger?: (message: string, context?: Record<string, unknown>) => void;
  onSessionChange?: (session: ScenarioSession) => void;
  onSessionStop?: () => void;
}

export class ScenarioRuntime {
  private scenario: ScenarioDefinition | null = null;
  private session: ScenarioSession | null = null;
  private operation: Promise<void> | null = null;
  private readonly createId: () => string;
  private readonly now: () => number;

  constructor(private readonly options: RuntimeOptions) {
    this.createId = options.createId ?? (() => globalThis.crypto.randomUUID());
    this.now = options.now ?? Date.now;
  }

  async start(scenario: ScenarioDefinition): Promise<ScenarioSession> {
    if (this.session) this.stop();
    this.scenario = scenario;
    const scene = await this.findMatchingScene();
    if (!scene) return this.fail("SCENE_NOT_FOUND", "No scene matches the current document.");
    const firstStep = scene.steps[0];
    if (!firstStep) return this.fail("INVALID_SCENARIO", `Scene ${scene.id} has no steps.`);

    const timestamp = this.now();
    this.session = {
      schemaVersion: 1,
      id: this.createId(),
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      sceneId: scene.id,
      stepId: firstStep.id,
      phase: "enter",
      revision: 0,
      updatedAt: timestamp,
    };
    this.persist("session started");
    await this.activateStep(scene, firstStep);
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
    this.log("session restored");
    if (session.phase === "complete") return;
    if (session.phase === "transition") return this.reconcile();

    const scene = this.requireScene(session.sceneId);
    const step = this.requireStep(scene, session.stepId);
    if (!(await this.options.sceneMatcher.matches(scene))) {
      return this.fail(
        "SCENE_NOT_FOUND",
        `Persisted scene ${scene.id} does not match the current document.`,
      );
    }

    if (session.phase === "commit") {
      await this.verifyAndAdvance(scene, step);
      return;
    }
    if (session.phase === "enter") {
      await this.activateStep(scene, step);
      return;
    }
    await this.restoreCursor();
    await this.showPresentation(scene, step);
  }

  proceed(): Promise<void> {
    if (this.operation) return this.operation;
    if (this.session?.phase !== "present") {
      return Promise.reject(
        new ScenemaError("INVALID_RUNTIME_STATE", "proceed() is only valid while presenting."),
      );
    }
    this.operation = this.commitCurrentStep().finally(() => {
      this.operation = null;
    });
    return this.operation;
  }

  async previous(): Promise<void> {
    const session = this.requireSession();
    if (session.phase !== "present") {
      return this.fail("INVALID_RUNTIME_STATE", "previous() is only valid while presenting.");
    }
    const scene = this.requireScene(session.sceneId);
    const currentIndex = scene.steps.findIndex((step) => step.id === session.stepId);
    if (currentIndex <= 0) return;
    const previousStep = scene.steps[currentIndex - 1];
    if (previousStep) await this.activateStep(scene, previousStep);
  }

  stop(): void {
    this.options.presenter.dismiss();
    if (this.session) {
      this.options.sessionStore.remove(this.session.id);
      this.options.onSessionStop?.();
    }
    this.session = null;
    this.scenario = null;
    this.log("session stopped");
  }

  async reconcile(): Promise<void> {
    const session = this.requireSession();
    const transition = session.transition;
    if (session.phase !== "transition" || !transition) {
      const scene = this.requireScene(session.sceneId);
      if (!(await this.options.sceneMatcher.matches(scene))) {
        return this.abort(
          "SCENE_NOT_FOUND",
          `Scene ${scene.id} no longer matches the current document.`,
        );
      }
      return;
    }

    if (this.now() - transition.startedAt >= transition.timeout) {
      return this.fail("TRANSITION_TIMEOUT", `Transition to ${transition.toScene} timed out.`, {
        transition,
      });
    }

    const destination = this.requireScene(transition.toScene);
    if (!(await this.options.sceneMatcher.matches(destination))) {
      this.log("transition pending", { toScene: destination.id });
      return;
    }

    transition.status = "arrived";
    this.persist("transition arrived");
    const firstStep = destination.steps[0];
    if (!firstStep) return this.fail("INVALID_SCENARIO", `Scene ${destination.id} has no steps.`);
    await this.activateStep(destination, firstStep);
  }

  inspect(): RuntimeInspection {
    const session = this.session;
    const scene =
      session && this.scenario
        ? this.scenario.scenes.find(({ id }) => id === session.sceneId)
        : undefined;
    const step = scene?.steps.find(({ id }) => id === session?.stepId);
    return {
      session: session ? structuredClone(session) : null,
      currentScene: scene ?? null,
      currentStep: step ?? null,
      currentPhase: session?.phase ?? "idle",
      pendingTransition: session?.transition ? structuredClone(session.transition) : null,
    };
  }

  private async activateStep(scene: SceneDefinition, step: StepDefinition): Promise<void> {
    const session = this.requireSession();
    this.options.presenter.dismiss();
    session.sceneId = scene.id;
    session.stepId = step.id;
    session.phase = "enter";
    delete session.transition;

    let cursorTarget: Target | undefined;
    if (step.enter) {
      cursorTarget =
        step.enter.cursor === "move" ? this.requireTarget(step) : step.enter.cursor.moveTo;
      session.cursorTarget = cursorTarget;
    }
    this.persist("step enter");
    if (cursorTarget) await this.options.actor.moveTo(cursorTarget);
    await this.showPresentation(scene, step);
  }

  private async restoreCursor(): Promise<void> {
    const target = this.requireSession().cursorTarget;
    if (target && this.options.actor.restoreCursor) {
      try {
        await this.options.actor.restoreCursor(target);
      } catch (error) {
        this.log("cursor restore skipped", {
          target,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async showPresentation(scene: SceneDefinition, step: StepDefinition): Promise<void> {
    const session = this.requireSession();
    session.phase = "present";
    this.persist("step presenting");
    if (!step.present) return;
    const index = scene.steps.findIndex(({ id }) => id === step.id);
    const allSteps = this.requireScenario().scenes.flatMap((candidateScene) =>
      candidateScene.steps.map((candidateStep) => ({ scene: candidateScene, step: candidateStep })),
    );
    const scenarioIndex = allSteps.findIndex(
      (candidate) => candidate.scene.id === scene.id && candidate.step.id === step.id,
    );
    await this.options.presenter.present(step.present, {
      sceneId: scene.id,
      stepId: step.id,
      stepNumber: scenarioIndex + 1,
      totalSteps: allSteps.length,
      canPrevious: index > 0,
      interaction: step.commit || step.transition ? "locked" : "passthrough",
      ...(step.target ? { target: step.target } : {}),
      controls: {
        proceed: () => {
          const operation = this.operation;
          if (operation) void operation.then(() => this.proceed());
          else void this.proceed();
        },
        previous: () => void this.previous(),
        stop: () => this.stop(),
      },
    });
  }

  private async commitCurrentStep(): Promise<void> {
    const session = this.requireSession();
    const scene = this.requireScene(session.sceneId);
    const step = this.requireStep(scene, session.stepId);
    this.options.presenter.dismiss();
    session.phase = "commit";
    this.persist("step committing");

    if (step.transition) {
      await this.performTransition(scene, step, step.transition);
      return;
    }
    if (step.commit) await this.performCommit(step);
    await this.verifyAndAdvance(scene, step);
  }

  private async performCommit(step: StepDefinition): Promise<void> {
    const commit = step.commit;
    if (!commit) return;
    if ("click" in commit) {
      await this.click(commit.click === true ? this.requireTarget(step) : commit.click);
    } else {
      await this.options.actor.type(
        commit.type.target ?? this.requireTarget(step),
        commit.type.value,
      );
    }
  }

  private async performTransition(
    scene: SceneDefinition,
    step: StepDefinition,
    transition: TransitionDefinition,
  ): Promise<void> {
    const session = this.requireSession();
    const target =
      transition.trigger.click === true ? this.requireTarget(step) : transition.trigger.click;
    session.phase = "transition";
    session.transition = {
      id: transition.id ?? `${scene.id}:${step.id}->${transition.to}`,
      fromScene: scene.id,
      fromStep: step.id,
      toScene: transition.to,
      status: "prepared",
      startedAt: this.now(),
      timeout: transition.timeout ?? this.options.defaultTransitionTimeout ?? 15_000,
    };
    this.persist("transition prepared");
    await this.click(target);
    if (
      !this.session ||
      this.session.id !== session.id ||
      session.phase !== "transition" ||
      !session.transition
    )
      return;
    session.transition.status = "triggered";
    this.persist("transition triggered");
    await this.reconcile();
  }

  private async verifyAndAdvance(scene: SceneDefinition, step: StepDefinition): Promise<void> {
    if (step.exit) await this.options.conditionWaiter.waitFor(step.exit.until, step.target);
    const index = scene.steps.findIndex(({ id }) => id === step.id);
    const nextStep = scene.steps[index + 1];
    if (nextStep) {
      await this.activateStep(scene, nextStep);
      return;
    }
    const session = this.requireSession();
    session.phase = "complete";
    delete session.transition;
    this.persist("scenario complete");
    this.options.presenter.dismiss();
  }

  private async click(target: Target): Promise<void> {
    const delay = Math.max(0, this.options.clickDelay ?? 0);
    if (delay > 0) {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delay));
    }
    await this.options.actor.click(target);
  }

  private persist(message: string): void {
    const session = this.requireSession();
    session.revision += 1;
    session.updatedAt = this.now();
    this.options.sessionStore.write(structuredClone(session));
    this.options.onSessionChange?.(structuredClone(session));
    this.log(message, { sceneId: session.sceneId, stepId: session.stepId, phase: session.phase });
  }

  private async findMatchingScene(): Promise<SceneDefinition | null> {
    const scenario = this.requireScenario();
    for (const scene of scenario.scenes) {
      if (await this.options.sceneMatcher.matches(scene)) return scene;
    }
    return null;
  }

  private requireScenario(): ScenarioDefinition {
    if (!this.scenario) throw new ScenemaError("INVALID_RUNTIME_STATE", "No scenario is loaded.");
    return this.scenario;
  }

  private requireSession(): ScenarioSession {
    if (!this.session)
      throw new ScenemaError("INVALID_RUNTIME_STATE", "No scenario session is active.");
    return this.session;
  }

  private requireScene(id: string): SceneDefinition {
    const scene = this.requireScenario().scenes.find((candidate) => candidate.id === id);
    if (!scene)
      throw new ScenemaError("INVALID_SESSION_STATE", `Session references unknown scene ${id}.`);
    return scene;
  }

  private requireStep(scene: SceneDefinition, id: string): StepDefinition {
    const step = scene.steps.find((candidate) => candidate.id === id);
    if (!step)
      throw new ScenemaError(
        "INVALID_SESSION_STATE",
        `Session references unknown step ${scene.id}/${id}.`,
      );
    return step;
  }

  private requireTarget(step: StepDefinition): Target {
    if (!step.target) throw new ScenemaError("TARGET_NOT_FOUND", `Step ${step.id} has no target.`);
    return step.target;
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

  private abort(code: ScenemaError["code"], message: string): never {
    const error = new ScenemaError(code, message);
    const inspection = this.inspect();
    this.stop();
    this.options.onError?.(error, inspection);
    throw error;
  }

  private log(message: string, context?: Record<string, unknown>): void {
    this.options.logger?.(`[scenema] ${message}`, context);
  }
}
