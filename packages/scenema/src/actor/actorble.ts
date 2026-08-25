import {
  createActorble,
  type Actorble,
  type ActorbleFacadeOptions,
  type BrowserActionDefaults,
} from "@actorble/browser";

export type ScenemaActorbleOptions = ActorbleFacadeOptions;

export const SCENEMA_ACTORBLE_ACTION_DEFAULTS = {
  moveTo: { duration: 800 },
  click: { duration: 800, pressDwell: 180 },
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
    moveTo: { ...SCENEMA_ACTORBLE_ACTION_DEFAULTS.moveTo, ...overrides.moveTo },
    click: { ...SCENEMA_ACTORBLE_ACTION_DEFAULTS.click, ...overrides.click },
    typeInto: { ...SCENEMA_ACTORBLE_ACTION_DEFAULTS.typeInto, ...overrides.typeInto },
  };
}
