import {
  createActorble,
  type Actorble,
  type ActorbleFacadeOptions,
  BrowserVisualLayer,
  type BrowserActionDefaults,
} from "@actorble/browser";

export type ScenemaActorbleOptions = ActorbleFacadeOptions;

export const SCENEMA_ACTORBLE_CURSOR_SCALE = 1.5;

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
    visualLayer:
      options.visualLayer ??
      new BrowserVisualLayer({
        root: visualLayerRoot(document, options.root),
        cursorScale: SCENEMA_ACTORBLE_CURSOR_SCALE,
        ...(typeof options.feedback === "object" && options.feedback.text !== undefined
          ? { textVisibility: options.feedback.text }
          : {}),
      }),
  };
}

function visualLayerRoot(
  document: Document,
  root: ScenemaActorbleOptions["root"],
): Document | ShadowRoot {
  if (!root) {
    return document;
  }

  if (root.nodeType === 9 || root.nodeType === 11) {
    return root as Document | ShadowRoot;
  }

  return root.ownerDocument ?? document;
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
