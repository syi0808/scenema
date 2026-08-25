// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { resolveScenemaActorbleOptions } from "../packages/scenema/src/actor/actorble.js";

describe("Scenema Actorble defaults", () => {
  it("uses deliberate motion, click, and typing durations", () => {
    const options = resolveScenemaActorbleOptions(document);

    expect(options.actionDefaults).toEqual({
      moveTo: { duration: 800 },
      click: { duration: 800, pressDwell: 180 },
      typeInto: { delay: 100 },
    });
  });

  it("allows individual defaults to be overridden", () => {
    const options = resolveScenemaActorbleOptions(document, {
      actionDefaults: {
        moveTo: { duration: 300 },
        click: { pressDwell: 50 },
        typeInto: { delay: 20 },
      },
    });

    expect(options.actionDefaults).toEqual({
      moveTo: { duration: 300 },
      click: { duration: 800, pressDwell: 50 },
      typeInto: { delay: 20 },
    });
  });
});
