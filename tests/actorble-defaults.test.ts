// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { resolveScenemaActorbleOptions } from "../packages/scenema/src/actor/actorble.js";

describe("Scenema Actorble defaults", () => {
  it("uses deliberate motion, click, and typing durations", () => {
    const options = resolveScenemaActorbleOptions(document);

    expect(options.actionDefaults).toEqual({
      moveTo: { motion: { kind: "ease", timing: "ease-in-out", duration: 800 } },
      click: {
        motion: { kind: "ease", timing: "ease-in-out", duration: 1000 },
        pressDwell: 240,
      },
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
      click: {
        motion: { kind: "ease", timing: "ease-in-out", duration: 1000 },
        pressDwell: 50,
      },
      typeInto: { delay: 20 },
    });
  });

  it("replaces the click motion profile with a duration override", () => {
    const options = resolveScenemaActorbleOptions(document, {
      actionDefaults: { click: { duration: 400 } },
    });

    expect(options.actionDefaults?.click).toEqual({ duration: 400, pressDwell: 240 });
  });
});
