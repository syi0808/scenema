import {
  createActorble,
  type Actorble,
  type ActorbleFacadeOptions,
  type BrowserActionDefaults,
} from "@actorble/browser";

export type ScenemaActorbleOptions = ActorbleFacadeOptions;

export const SCENEMA_ACTORBLE_ACTION_DEFAULTS = {
  moveTo: { motion: { kind: "ease", timing: "ease-in-out", duration: 800 } },
  click: {
    motion: { kind: "ease", timing: "ease-in-out", duration: 1000 },
    pressDwell: 240,
  },
  typeInto: { delay: 100 },
} as const satisfies BrowserActionDefaults;

export function createScenemaActorble(
  document: Document,
  options: ScenemaActorbleOptions = {},
): Actorble {
  return createActorble(resolveScenemaActorbleOptions(document, options));
}

export function resolveScenemaActorbleOptions(
  document: Document,
  options: ScenemaActorbleOptions = {},
): ScenemaActorbleOptions {
  return {
    ...options,
    root: options.root ?? document,
    actionDefaults: mergeActionDefaults(options.actionDefaults),
  };
}

function mergeActionDefaults(overrides: BrowserActionDefaults = {}): BrowserActionDefaults {
  return {
    ...SCENEMA_ACTORBLE_ACTION_DEFAULTS,
    ...overrides,
    moveTo: mergePointerActionDefaults(SCENEMA_ACTORBLE_ACTION_DEFAULTS.moveTo, overrides.moveTo),
    click: mergePointerActionDefaults(SCENEMA_ACTORBLE_ACTION_DEFAULTS.click, overrides.click),
    typeInto: { ...SCENEMA_ACTORBLE_ACTION_DEFAULTS.typeInto, ...overrides.typeInto },
  };
}

type PointerActionDefaults = NonNullable<BrowserActionDefaults["click"]>;

function mergePointerActionDefaults(
  defaults: PointerActionDefaults,
  overrides: PointerActionDefaults = {},
): PointerActionDefaults {
  if (overrides.duration === undefined && overrides.motion === undefined) {
    return { ...defaults, ...overrides };
  }

  const { duration: _duration, motion: _motion, ...nonMovementDefaults } = defaults;
  return { ...nonMovementDefaults, ...overrides };
}
