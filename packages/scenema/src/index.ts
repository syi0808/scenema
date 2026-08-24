import {
  ScenemaError,
  ScenarioRuntime,
  type Actor,
  type Presenter,
  type RuntimeInspection,
  type ScenarioDefinition,
  type ScenarioSession,
  type ScenemaErrorCode,
} from "@scenema/core";
import {
  ActiveSessionPointer,
  DomActor,
  DomConditionWaiter,
  DomSceneMatcher,
  LocalStorageSessionStore,
  createNavigationObserver,
  type NavigationObserver,
} from "@scenema/runtime-web";

export interface ScenemaOptions {
  scenarios?: readonly ScenarioDefinition[];
  actor?: Actor;
  presenter: Presenter;
  window?: Window;
  document?: Document;
  transitionTimeout?: number;
  conditionTimeout?: number;
  logger?: (message: string, context?: Record<string, unknown>) => void;
  onError?: (error: ScenemaError, inspection: RuntimeInspection) => void;
}

export interface Scenema {
  register(scenario: ScenarioDefinition): void;
  start(scenario: string | ScenarioDefinition): Promise<ScenarioSession>;
  bootstrap(): Promise<boolean>;
  proceed(): Promise<void>;
  previous(): Promise<void>;
  stop(): void;
  reconcile(): Promise<void>;
  inspect(): RuntimeInspection;
  dispose(): void;
}

export function createScenema(options: ScenemaOptions): Scenema {
  const window = options.window ?? globalThis.window;
  const document = options.document ?? window.document;
  const registry = new Map<string, ScenarioDefinition>();
  for (const scenario of options.scenarios ?? []) registry.set(scenario.id, scenario);

  const store = new LocalStorageSessionStore(window.localStorage);
  const activeSession = new ActiveSessionPointer(window.sessionStorage);
  let transitionTimer: number | undefined;
  let runtime!: ScenarioRuntime;
  const scheduleTransitionTimeout = (session: ScenarioSession | null) => {
    if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    transitionTimer = undefined;
    if (session?.phase !== "transition" || !session.transition || session.transition.status === "arrived") return;
    const remaining = Math.max(0, session.transition.startedAt + session.transition.timeout - Date.now());
    transitionTimer = window.setTimeout(() => {
      transitionTimer = undefined;
      void runtime.reconcile().catch((error: unknown) => reportUnexpected(error, options, runtime));
    }, remaining);
  };
  runtime = new ScenarioRuntime({
    actor: options.actor ?? new DomActor(document),
    presenter: options.presenter,
    sessionStore: store,
    sceneMatcher: new DomSceneMatcher({ window, document }),
    conditionWaiter: new DomConditionWaiter({ window, document }, options.conditionTimeout),
    ...(options.transitionTimeout === undefined ? {} : { defaultTransitionTimeout: options.transitionTimeout }),
    ...(options.logger ? { logger: options.logger } : {}),
    ...(options.onError ? { onError: options.onError } : {}),
    onSessionChange(session) {
      if (session.phase === "complete") activeSession.clear();
      else activeSession.set(session.id);
      scheduleTransitionTimeout(session);
    },
  });
  const navigation: NavigationObserver = createNavigationObserver(window);
  const unsubscribe = navigation.subscribe(() => {
    if (!runtime.inspect().session) return;
    void runtime.reconcile().catch((error: unknown) => reportUnexpected(error, options, runtime));
  });

  return {
    register(scenario) {
      registry.set(scenario.id, scenario);
    },
    async start(scenarioOrId) {
      const scenario =
        typeof scenarioOrId === "string" ? registry.get(scenarioOrId) : scenarioOrId;
      if (!scenario) throw new ScenemaError("SCENARIO_NOT_FOUND", `Scenario was not registered: ${scenarioOrId}`);
      registry.set(scenario.id, scenario);
      return runtime.start(scenario);
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
        throw new ScenemaError("SCENARIO_NOT_FOUND", `Scenario was not registered: ${session.scenarioId}`);
      }
      try {
        await runtime.resume(scenario, session);
        scheduleTransitionTimeout(runtime.inspect().session);
      } catch (error) {
        runtime.stop();
        activeSession.clear();
        throw error;
      }
      return true;
    },
    proceed: () => runtime.proceed(),
    previous: () => runtime.previous(),
    stop() {
      runtime.stop();
      activeSession.clear();
    },
    reconcile: () => runtime.reconcile(),
    inspect: () => runtime.inspect(),
    dispose() {
      unsubscribe();
      navigation.dispose();
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    },
  };
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
