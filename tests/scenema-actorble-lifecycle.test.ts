// @vitest-environment jsdom

import type { ActionOrchestrator, VisualLayer } from "@actorble/browser";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createScenema, defineScenario } from "scenema";

const scenario = defineScenario({
  id: "actorble-lifecycle",
  version: 1,
  scenes: [
    {
      id: "main",
      match: {},
      steps: [{ id: "target", target: "#target", enter: { cursor: "move" } }],
    },
  ],
});

describe("Scenema Actorble lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("destroys the cursor and Actorble instance when a tour completes or stops", async () => {
    const orchestrator = {
      moveTo: vi.fn(async () => undefined),
      dispose: vi.fn(),
    } as unknown as ActionOrchestrator;
    const visualLayer = {
      clearFeedback: vi.fn(),
      destroy: vi.fn(),
    } as unknown as VisualLayer;
    const scenema = createScenema({
      scenarios: [scenario],
      presenter: { present: vi.fn(), dismiss: vi.fn() },
      actorble: { orchestrator, visualLayer },
    });

    await scenema.start(scenario.id);
    await scenema.proceed();

    expect(orchestrator.dispose).toHaveBeenCalledOnce();
    expect(visualLayer.clearFeedback).toHaveBeenCalledOnce();
    expect(visualLayer.destroy).toHaveBeenCalledOnce();

    await scenema.start(scenario.id);
    scenema.stop();

    expect(orchestrator.dispose).toHaveBeenCalledTimes(2);
    expect(visualLayer.destroy).toHaveBeenCalledTimes(2);
    scenema.dispose();
  });
});
