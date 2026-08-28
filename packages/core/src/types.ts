export interface TargetContext {
  document: Document;
  location: Location;
}

export type TargetResolver = (context: TargetContext) => Node | null | Promise<Node | null>;

export type Target = string | Node | TargetResolver;
export type ResolvedTarget = string | Node;

export type Placement = "auto" | "top" | "right" | "bottom" | "left";
export type PresentationInteraction = "auto" | "locked" | "passthrough";
export type PresentationAdvance = "user" | "auto";
export type KeyInput = string;

export interface CursorMoveOptions {
  delay?: number;
}

export interface ClickOptions {
  delay?: number;
}

export interface TypeOptions {
  clear?: boolean;
}

export interface PressOptions {
  delay?: number;
}

export interface WaitOptions {
  timeout?: number;
}

export interface NavigationOptions {
  timeout?: number;
}

export interface PresentInput {
  target?: Target;
  title: string;
  description?: string;
  placement?: Placement;
  interaction?: PresentationInteraction;
  advance?: PresentationAdvance;
}

export interface PresentContent {
  title: string;
  description?: string;
}

export interface ExistsCondition {
  kind: "exists";
  target: Target;
}

export interface VisibleCondition {
  kind: "visible";
  target: Target;
}

export interface ValueCondition {
  kind: "value";
  target: Target;
  value: string;
}

export interface PathnameCondition {
  kind: "pathname";
  pathname: string | RegExp;
}

export interface AllCondition {
  kind: "all";
  conditions: readonly ReadyCondition[];
}

export interface AnyCondition {
  kind: "any";
  conditions: readonly ReadyCondition[];
}

export type Condition =
  | ExistsCondition
  | VisibleCondition
  | ValueCondition
  | PathnameCondition
  | AllCondition
  | AnyCondition;

export type ReadyPredicate = (context: TargetContext) => boolean | Promise<boolean>;

export interface ReadyConditionObject {
  pathname?: string | RegExp;
  exists?: Target;
  visible?: Target;
}

export type ReadyCondition = Condition | ReadyPredicate | ReadyConditionObject;

export interface CursorMoveOperation {
  kind: "cursor.move";
  target: Target;
  options?: CursorMoveOptions;
}

export interface PresentOperation {
  kind: "present";
  target?: Target;
  content: PresentContent;
  placement?: Placement;
  interaction?: PresentationInteraction;
  advance?: PresentationAdvance;
}

export interface ClickOperation {
  kind: "click";
  target: Target;
  options?: ClickOptions;
}

export interface TypeOperation {
  kind: "type";
  target: Target;
  value: string;
  options?: TypeOptions;
}

export interface PressOperation {
  kind: "press";
  key: KeyInput;
  options?: PressOptions;
}

export interface WaitOperation {
  kind: "wait";
  condition: ReadyCondition;
  timeout?: number;
}

export interface NavigationOperation {
  kind: "navigate";
  action: ClickOperation | PressOperation;
  timeout?: number;
}

export interface CustomOperation {
  kind: string;
  readonly [key: string]: unknown;
}

export type Operation =
  | CursorMoveOperation
  | PresentOperation
  | ClickOperation
  | TypeOperation
  | PressOperation
  | WaitOperation
  | NavigationOperation
  | CustomOperation;

export interface StepDefinition {
  id: string;
  ready?: ReadyCondition;
  operations: readonly Operation[];
  group?: string;
  meta?: Readonly<Record<string, unknown>>;
}

export interface StepOptions {
  ready?: ReadyCondition;
  group?: string;
  meta?: Readonly<Record<string, unknown>>;
}

export interface ScenarioDefinition {
  id: string;
  version: number;
  steps: readonly StepDefinition[];
}

export interface CursorBuilder {
  move(target: Target, options?: CursorMoveOptions): void;
}

export interface WaitForBuilder {
  exists(target: Target, options?: WaitOptions): void;
  visible(target: Target, options?: WaitOptions): void;
  value(target: Target, value: string, options?: WaitOptions): void;
  condition(condition: ReadyCondition, options?: WaitOptions): void;
}

export interface NavigationBuilder {
  click(target: Target, options?: ClickOptions & NavigationOptions): void;
  press(key: KeyInput, options?: PressOptions & NavigationOptions): void;
}

export interface StepBuilder {
  cursor: CursorBuilder;
  present(input: PresentInput | string): void;
  click(target: Target, options?: ClickOptions): void;
  type(target: Target, value: string, options?: TypeOptions): void;
  press(key: KeyInput, options?: PressOptions): void;
  waitFor: WaitForBuilder;
  navigate: NavigationBuilder;
  use(operation: Operation): void;
}

export type Durability = "replay-safe" | "at-most-once" | "reconcile";
export type PendingOperationStatus = "prepared" | "performed";

export interface PendingOperation {
  address: string;
  kind: string;
  durability: Durability;
  status: PendingOperationStatus;
  startedAt: number;
  timeout?: number;
}

export interface ScenarioSession {
  schemaVersion: 1;
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  position: {
    stepId: string;
    operationIndex: number;
  };
  completedOperations: string[];
  pendingOperation?: PendingOperation;
  revision: number;
  updatedAt: number;
}

export interface SessionStore {
  read(id: string): ScenarioSession | null;
  write(session: ScenarioSession): void;
  remove(id: string): void;
}

export interface Actor {
  moveTo(target: ResolvedTarget, options?: CursorMoveOptions): Promise<void>;
  restoreCursor?(target: ResolvedTarget): Promise<void>;
  click(target: ResolvedTarget, options?: ClickOptions): Promise<void>;
  type(target: ResolvedTarget, value: string, options?: TypeOptions): Promise<void>;
  press?(key: KeyInput, options?: PressOptions): Promise<void>;
}

export interface PresenterControls {
  proceed(): void;
  back(): void;
  stop(): void;
}

export interface PresenterContext {
  scenarioId: string;
  step: {
    id: string;
    index: number;
  };
  presentation: {
    index: number;
  };
  progress: {
    current: number;
    total: number;
  };
  target?: ResolvedTarget;
  canBack: boolean;
  interaction: PresentationInteraction;
  placement?: Placement;
  controls: PresenterControls;
}

export interface Presenter {
  present(presentation: PresentContent, context: PresenterContext): Promise<void> | void;
  dismiss(): void;
}

export interface ConditionWaiter {
  waitFor(condition: ReadyCondition, options?: WaitOptions): Promise<void>;
}

export interface OperationExecutionContext {
  scenario: ScenarioDefinition;
  step: StepDefinition;
  session: ScenarioSession;
  address: string;
  actor: Actor;
  waitFor(condition: ReadyCondition, options?: WaitOptions): Promise<void>;
  resolveTarget(target: Target): Promise<ResolvedTarget>;
}

export interface OperationHandler<T extends Operation = Operation> {
  durability?: Durability;
  execute(operation: T, context: OperationExecutionContext): Promise<void> | void;
}

export interface PluginDefinition {
  operations: Readonly<Record<string, OperationHandler>>;
}

export type ScenemaErrorCode =
  | "TARGET_NOT_FOUND"
  | "TARGET_CAPABILITY_MISMATCH"
  | "NAVIGATION_TIMEOUT"
  | "SCENARIO_NOT_FOUND"
  | "SCENARIO_VERSION_MISMATCH"
  | "INVALID_SESSION_STATE"
  | "INVALID_SCENARIO"
  | "INVALID_RUNTIME_STATE"
  | "OPERATION_NOT_FOUND";

export type RuntimeStatus = "idle" | "running" | "presenting" | "navigating" | "complete";

export interface RuntimeInspection {
  session: ScenarioSession | null;
  currentStep: StepDefinition | null;
  currentOperation: Operation | null;
  status: RuntimeStatus;
  pendingOperation: PendingOperation | null;
}
