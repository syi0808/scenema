import { ScenemaError } from "./errors.js";
import type {
  ClickOptions,
  Condition,
  CursorMoveOptions,
  KeyInput,
  NavigationOptions,
  Operation,
  PluginDefinition,
  PresentInput,
  PressOptions,
  ReadyCondition,
  ScenarioDefinition,
  StepBuilder,
  StepDefinition,
  StepOptions,
  Target,
  TypeOptions,
  WaitOptions,
} from "./types.js";

export function defineScenario<const T extends ScenarioDefinition>(scenario: T): T {
  if (!scenario.id || !Number.isInteger(scenario.version) || scenario.version < 1) {
    throw new ScenemaError(
      "INVALID_SCENARIO",
      "A scenario needs an id and a positive integer version.",
    );
  }
  if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new ScenemaError("INVALID_SCENARIO", "A scenario needs at least one step.");
  }

  const stepIds = new Set<string>();
  for (const candidate of scenario.steps) {
    if (!candidate.id || stepIds.has(candidate.id)) {
      throw new ScenemaError(
        "INVALID_SCENARIO",
        `Step id is missing or duplicated: ${candidate.id}`,
      );
    }
    stepIds.add(candidate.id);
    if (!Array.isArray(candidate.operations)) {
      throw new ScenemaError("INVALID_SCENARIO", `Step ${candidate.id} needs an operations array.`);
    }
    for (const operation of candidate.operations) {
      if (!operation || typeof operation.kind !== "string" || operation.kind.length === 0) {
        throw new ScenemaError(
          "INVALID_SCENARIO",
          `Step ${candidate.id} contains an invalid operation.`,
        );
      }
    }
  }

  return scenario;
}

export function step(id: string, build: (step: StepBuilder) => void): StepDefinition;
export function step(
  id: string,
  options: StepOptions,
  build: (step: StepBuilder) => void,
): StepDefinition;
export function step(
  id: string,
  optionsOrBuild: StepOptions | ((step: StepBuilder) => void),
  maybeBuild?: (step: StepBuilder) => void,
): StepDefinition {
  if (!id) throw new ScenemaError("INVALID_SCENARIO", "A step needs an id.");
  const options = typeof optionsOrBuild === "function" ? {} : optionsOrBuild;
  const build = typeof optionsOrBuild === "function" ? optionsOrBuild : maybeBuild;
  if (!build) throw new ScenemaError("INVALID_SCENARIO", `Step ${id} needs a builder.`);

  const operations: Operation[] = [];
  const addWait = (condition: ReadyCondition, options?: WaitOptions) => {
    operations.push({
      kind: "wait",
      condition,
      ...(options?.timeout === undefined ? {} : { timeout: options.timeout }),
    });
  };
  const builder: StepBuilder = {
    cursor: {
      move(target: Target, operationOptions?: CursorMoveOptions) {
        operations.push({
          kind: "cursor.move",
          target,
          ...(operationOptions ? { options: operationOptions } : {}),
        });
      },
    },
    present(input: PresentInput | string) {
      const normalized = typeof input === "string" ? { title: input } : input;
      operations.push({
        kind: "present",
        content: {
          title: normalized.title,
          ...(normalized.description === undefined ? {} : { description: normalized.description }),
        },
        ...(normalized.target === undefined ? {} : { target: normalized.target }),
        ...(normalized.placement === undefined ? {} : { placement: normalized.placement }),
        interaction: normalized.interaction ?? "auto",
        advance: normalized.advance ?? "user",
      });
    },
    click(target: Target, operationOptions?: ClickOptions) {
      operations.push({
        kind: "click",
        target,
        ...(operationOptions ? { options: operationOptions } : {}),
      });
    },
    type(target: Target, value: string, operationOptions?: TypeOptions) {
      operations.push({
        kind: "type",
        target,
        value,
        ...(operationOptions ? { options: operationOptions } : {}),
      });
    },
    press(key: KeyInput, operationOptions?: PressOptions) {
      operations.push({
        kind: "press",
        key,
        ...(operationOptions ? { options: operationOptions } : {}),
      });
    },
    waitFor: {
      exists: (target, waitOptions) => addWait(exists(target), waitOptions),
      visible: (target, waitOptions) => addWait(visible(target), waitOptions),
      value: (target, value, waitOptions) => addWait(valueIs(target, value), waitOptions),
      condition: addWait,
    },
    navigate: {
      click(target: Target, operationOptions?: ClickOptions & NavigationOptions) {
        const { timeout, ...actionOptions } = operationOptions ?? {};
        operations.push({
          kind: "navigate",
          action: {
            kind: "click",
            target,
            ...(Object.keys(actionOptions).length === 0 ? {} : { options: actionOptions }),
          },
          ...(timeout === undefined ? {} : { timeout }),
        });
      },
      press(key: KeyInput, operationOptions?: PressOptions & NavigationOptions) {
        const { timeout, ...actionOptions } = operationOptions ?? {};
        operations.push({
          kind: "navigate",
          action: {
            kind: "press",
            key,
            ...(Object.keys(actionOptions).length === 0 ? {} : { options: actionOptions }),
          },
          ...(timeout === undefined ? {} : { timeout }),
        });
      },
    },
    use(operation: Operation) {
      if (!operation || typeof operation.kind !== "string" || operation.kind.length === 0) {
        throw new ScenemaError("INVALID_SCENARIO", `Step ${id} received an invalid operation.`);
      }
      operations.push(operation);
    },
  };

  const result = build(builder);
  if (isPromiseLike(result)) {
    throw new ScenemaError(
      "INVALID_SCENARIO",
      `Step ${id} builder must be synchronous; async workflow callbacks are not supported.`,
    );
  }

  return {
    id,
    ...(options.ready === undefined ? {} : { ready: normalizeReady(options.ready) }),
    operations,
    ...(options.group === undefined ? {} : { group: options.group }),
    ...(options.meta === undefined ? {} : { meta: options.meta }),
  };
}

export function exists(target: Target): Condition {
  return { kind: "exists", target };
}

export function visible(target: Target): Condition {
  return { kind: "visible", target };
}

export function valueIs(target: Target, value: string): Condition {
  return { kind: "value", target, value };
}

export function pathname(value: string | RegExp): Condition {
  return { kind: "pathname", pathname: value };
}

export function all(...conditions: readonly ReadyCondition[]): Condition {
  return { kind: "all", conditions };
}

export function any(...conditions: readonly ReadyCondition[]): Condition {
  return { kind: "any", conditions };
}

export function normalizeReady(condition: ReadyCondition): ReadyCondition {
  if (typeof condition === "function" || "kind" in condition) return condition;
  const conditions: ReadyCondition[] = [];
  if (condition.pathname !== undefined) conditions.push(pathname(condition.pathname));
  if (condition.exists !== undefined) conditions.push(exists(condition.exists));
  if (condition.visible !== undefined) conditions.push(visible(condition.visible));
  if (conditions.length === 1) return conditions[0]!;
  return all(...conditions);
}

export function definePlugin<const T extends PluginDefinition>(plugin: T): T {
  return plugin;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
