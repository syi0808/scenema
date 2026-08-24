export type Target = string;

export interface SceneMatch {
  pathname?: string | RegExp;
  search?: Record<string, string>;
  hash?: string;
  visible?: Target;
}

export interface StepPresentation {
  title: string;
  description?: string;
}

export interface UntilCondition {
  visible?: Target;
  value?: string;
  timeout?: number;
}

export interface StepDefinition {
  id: string;
  target?: Target;
  enter?: {
    cursor: "move" | { moveTo: Target };
  };
  present?: StepPresentation;
  commit?: { click: Target | true } | { type: { value: string; target?: Target } };
  exit?: { until: UntilCondition };
  transition?: TransitionDefinition;
}

export interface TransitionDefinition {
  id?: string;
  trigger: { click: Target | true };
  to: string;
  timeout?: number;
}

export interface SceneDefinition {
  id: string;
  match: SceneMatch;
  steps: readonly StepDefinition[];
}

export interface ScenarioDefinition {
  id: string;
  version: number;
  scenes: readonly SceneDefinition[];
}

export type SessionPhase = "enter" | "present" | "commit" | "transition" | "complete";
export type TransitionStatus = "prepared" | "triggered" | "arrived";

export interface TransitionCheckpoint {
  id: string;
  fromScene: string;
  fromStep: string;
  toScene: string;
  status: TransitionStatus;
  startedAt: number;
  timeout: number;
}

export interface ScenarioSession {
  schemaVersion: 1;
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  sceneId: string;
  stepId: string;
  phase: SessionPhase;
  transition?: TransitionCheckpoint;
  revision: number;
  updatedAt: number;
}

export interface SessionStore {
  read(id: string): ScenarioSession | null;
  write(session: ScenarioSession): void;
  remove(id: string): void;
}

export interface Actor {
  moveTo(target: Target): Promise<void>;
  click(target: Target): Promise<void>;
  type(target: Target, value: string): Promise<void>;
}

export interface PresenterControls {
  proceed(): void;
  previous(): void;
  stop(): void;
}

export interface PresenterContext {
  sceneId: string;
  stepId: string;
  stepNumber: number;
  totalSteps: number;
  canPrevious: boolean;
  target?: Target;
  controls: PresenterControls;
}

export interface Presenter {
  present(presentation: StepPresentation, context: PresenterContext): Promise<void> | void;
  dismiss(): void;
}

export interface SceneMatcher {
  matches(scene: SceneDefinition): Promise<boolean>;
}

export interface ConditionWaiter {
  waitFor(condition: UntilCondition, target?: Target): Promise<void>;
}

export type ScenemaErrorCode =
  | "TARGET_NOT_FOUND"
  | "TRANSITION_TIMEOUT"
  | "SCENARIO_NOT_FOUND"
  | "SCENARIO_VERSION_MISMATCH"
  | "INVALID_SESSION_STATE"
  | "SCENE_NOT_FOUND"
  | "INVALID_SCENARIO"
  | "INVALID_RUNTIME_STATE";

export interface RuntimeInspection {
  session: ScenarioSession | null;
  currentScene: SceneDefinition | null;
  currentStep: StepDefinition | null;
  currentPhase: SessionPhase | "idle";
  pendingTransition: TransitionCheckpoint | null;
}
