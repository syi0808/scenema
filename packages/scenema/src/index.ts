import {
  ScenemaError,
  ScenarioRuntime,
  type Actor,
  type Presenter,
  type PluginDefinition,
  type RuntimeInspection,
  type RuntimeStatus,
  type ScenarioDefinition,
  type ScenarioSession,
  type ScenemaErrorCode,
} from "@scenema/core";
import {
  ActiveSessionPointer,
  DomConditionWaiter,
  LocalStorageSessionStore,
  createNavigationObserver,
  resolveDomTarget,
  type NavigationObserver,
} from "@scenema/runtime-web";

import { ActorbleActorAdapter } from "./actor/actorble-adapter.js";
import { createScenemaActorble, type ScenemaActorbleOptions } from "./actor/actorble.js";

export interface ScenemaOptions {
  scenarios?: readonly ScenarioDefinition[];
  actor?: Actor;
  actorble?: ScenemaActorbleOptions;
  presenter: Presenter;
  plugins?: readonly PluginDefinition[];
  window?: Window;
  document?: Document;
  navigationTimeout?: number;
  conditionTimeout?: number;
  clickDelay?: number;
  cursorMoveDelay?: number;
  logger?: (message: string, context?: Record<string, unknown>) => void;
  onError?: (error: ScenemaError, inspection: RuntimeInspection) => void;
}

export const SCENEMA_CLICK_DELAY = 300;
export const SCENEMA_CURSOR_MOVE_DELAY = 300;

export interface Scenema {
  register(scenario: ScenarioDefinition): void;
  start(scenario: string | ScenarioDefinition): Promise<ScenarioSession>;
  bootstrap(): Promise<boolean>;
  proceed(): Promise<void>;
  back(): Promise<void>;
  stop(): void;
  inspect(): RuntimeInspection;
  dispose(): void;
}

export function createScenema(options: ScenemaOptions): Scenema {
  const window = options.window ?? globalThis.window;
  const document = options.document ?? window.document;
  const actorbleActor = options.actor
    ? undefined
    : new ActorbleActorAdapter(() => createScenemaActorble(document, options.actorble));
  const actor = options.actor ?? actorbleActor!;
  const registry = new Map<string, ScenarioDefinition>();
  for (const scenario of options.scenarios ?? []) registry.set(scenario.id, scenario);

  const store = new LocalStorageSessionStore(window.localStorage);
  const activeSession = new ActiveSessionPointer(window.sessionStorage);
  let navigationTimer: number | undefined;
  let runtime!: ScenarioRuntime;
  const scheduleNavigationTimeout = (session: ScenarioSession | null) => {
    if (navigationTimer !== undefined) window.clearTimeout(navigationTimer);
    navigationTimer = undefined;
    const pending = session?.pendingOperation;
    if (pending?.kind !== "navigate" || pending.timeout === undefined) return;
    const remaining = Math.max(0, pending.startedAt + pending.timeout - Date.now());
    navigationTimer = window.setTimeout(() => {
      navigationTimer = undefined;
      void runtime
        .reconcile()
        .catch((error: unknown) => reportRuntimeOperationError(error, options, runtime));
    }, remaining);
  };
  const operationHandlers = Object.assign(
    {},
    ...(options.plugins ?? []).map((plugin) => plugin.operations),
  );
  runtime = new ScenarioRuntime({
    actor,
    presenter: options.presenter,
    sessionStore: store,
    conditionWaiter: new DomConditionWaiter({ window, document }, options.conditionTimeout),
    operationHandlers,
    resolveTarget: (target) => resolveDomTarget(document, target),
    clickDelay: Math.max(0, options.clickDelay ?? SCENEMA_CLICK_DELAY),
    cursorMoveDelay: Math.max(0, options.cursorMoveDelay ?? SCENEMA_CURSOR_MOVE_DELAY),
    ...(options.navigationTimeout === undefined
      ? {}
      : { defaultNavigationTimeout: options.navigationTimeout }),
    ...(options.logger ? { logger: options.logger } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
    onSessionChange(session, status: RuntimeStatus) {
      if (status === "complete") {
        activeSession.clear();
        actorbleActor?.destroy();
      } else activeSession.set(session.id);
      scheduleNavigationTimeout(session);
    },
    onSessionStop() {
      activeSession.clear();
      scheduleNavigationTimeout(null);
      actorbleActor?.destroy();
    },
  });
  const navigation: NavigationObserver = createNavigationObserver(window);
  const unsubscribe = navigation.subscribe(() => {
    if (!runtime.inspect().session) return;
    void runtime
      .reconcile()
      .catch((error: unknown) => reportRuntimeOperationError(error, options, runtime));
  });

  return {
    register(scenario) {
      registry.set(scenario.id, scenario);
    },
    async start(scenarioOrId) {
      const scenario = typeof scenarioOrId === "string" ? registry.get(scenarioOrId) : scenarioOrId;
      if (!scenario)
        throw new ScenemaError(
          "SCENARIO_NOT_FOUND",
          `Scenario was not registered: ${scenarioOrId}`,
        );
      registry.set(scenario.id, scenario);
      try {
        return await runtime.start(scenario);
      } catch (error) {
        actorbleActor?.destroy();
        throw error;
      }
    },
    async bootstrap() {
      const id = activeSession.get();
      if (!id) return false;
      let session: ScenarioSession | null;
      try {
        session = store.read(id);
      } catch (error) {
        activeSession.clear();
        reportUnexpected(error, options, runtime);
        return false;
      }
      if (!session) {
        activeSession.clear();
        return false;
      }
      const scenario = registry.get(session.scenarioId);
      if (!scenario) {
        activeSession.clear();
        store.remove(session.id);
        throw new ScenemaError(
          "SCENARIO_NOT_FOUND",
          `Scenario was not registered: ${session.scenarioId}`,
        );
      }
      try {
        await runtime.resume(scenario, session);
        scheduleNavigationTimeout(runtime.inspect().session);
      } catch (error) {
        runtime.stop();
        activeSession.clear();
        throw error;
      }
      return true;
    },
    proceed: () => runtime.proceed(),
    back: () => runtime.back(),
    stop() {
      runtime.stop();
      activeSession.clear();
    },
    inspect: () => runtime.inspect(),
    dispose() {
      unsubscribe();
      navigation.dispose();
      if (navigationTimer !== undefined) window.clearTimeout(navigationTimer);
      actorbleActor?.destroy();
    },
  };
}

function reportRuntimeOperationError(
  error: unknown,
  options: ScenemaOptions,
  runtime: ScenarioRuntime,
): void {
  if (!(error instanceof ScenemaError)) reportUnexpected(error, options, runtime);
}

function reportUnexpected(error: unknown, options: ScenemaOptions, runtime: ScenarioRuntime): void {
  if (error instanceof ScenemaError) options.onError?.(error, runtime.inspect());
  else {
    const wrapped = new ScenemaError(
      "INVALID_RUNTIME_STATE" satisfies ScenemaErrorCode,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
    options.onError?.(wrapped, runtime.inspect());
  }
}

export * from "@scenema/core";
export { createScenemaActorble, type ScenemaActorbleOptions } from "./actor/actorble.js";
