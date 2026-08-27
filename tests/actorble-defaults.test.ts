// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import {
  resolveScenemaActorbleOptions,
  SCENEMA_ACTORBLE_CURSOR_SCALE,
} from "../packages/scenema/src/actor/actorble.js";

describe("Scenema Actorble defaults", () => {
  it("starts the pointer at the center of the viewport", () => {
    const options = resolveScenemaActorbleOptions(document);

    expect(options.pointer?.initialPosition).toEqual({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  });

  it("preserves a custom initial pointer position", () => {
    const options = resolveScenemaActorbleOptions(document, {
      pointer: { initialPosition: { x: 120, y: 80 } },
    });

    expect(options.pointer?.initialPosition).toEqual({ x: 120, y: 80 });
  });

  it("uses deliberate motion, click, and typing durations", () => {
    const options = resolveScenemaActorbleOptions(document);

    expect(options.actionDefaults).toEqual({
      moveTo: { motion: { kind: "ease", timing: "ease-in-out", duration: 800 } },
      click: {
        motion: { kind: "ease", timing: "ease-in-out", duration: 1000 },
        pressDwell: 240,
      },
      typeInto: {
        delay: 20,
        focusStrategy: "click",
        focusClick: {
          motion: { kind: "ease", timing: "ease-in-out", duration: 1000 },
          pressDwell: 240,
        },
      },
    });
  });

  it("uses a larger cursor by default", () => {
    const options = resolveScenemaActorbleOptions(document, {
      feedback: { cursor: true, keystroke: true, text: "masked" },
    });

    expect(options.visualLayer).toMatchObject({
      options: {
        cursorScale: SCENEMA_ACTORBLE_CURSOR_SCALE,
        textVisibility: "masked",
      },
    });
  });

  it("preserves a custom visual layer", () => {
    const visualLayer = {
      showCursor: vi.fn(),
      highlightTarget: vi.fn(),
      showClick: vi.fn(),
      showFocus: vi.fn(),
      showTyping: vi.fn(),
      showKeystroke: vi.fn(),
      clearFeedback: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
    };

    expect(resolveScenemaActorbleOptions(document, { visualLayer }).visualLayer).toBe(visualLayer);
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
      typeInto: {
        delay: 20,
        focusStrategy: "click",
        focusClick: {
          motion: { kind: "ease", timing: "ease-in-out", duration: 1000 },
          pressDwell: 240,
        },
      },
    });
  });

  it("replaces the click motion profile with a duration override", () => {
    const options = resolveScenemaActorbleOptions(document, {
      actionDefaults: { click: { duration: 400 } },
    });

    expect(options.actionDefaults?.click).toEqual({ duration: 400, pressDwell: 240 });
  });

  it("replaces the typing focus-click motion profile with a duration override", () => {
    const options = resolveScenemaActorbleOptions(document, {
      actionDefaults: { typeInto: { focusClick: { duration: 400 } } },
    });

    expect(options.actionDefaults?.typeInto).toEqual({
      delay: 20,
      focusStrategy: "click",
      focusClick: { duration: 400, pressDwell: 240 },
    });
  });
});
