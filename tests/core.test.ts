import {
  ScenarioRuntime,
  ScenemaError,
  deserializeSession,
  defineScenario,
  type Actor,
  type Presenter,
  type ScenarioSession,
  type SessionStore,
} from "@scenema/core";
import { describe, expect, it, vi } from "vitest";

class MemoryStore implements SessionStore {
  sessions = new Map<string, ScenarioSession>();
  writes: ScenarioSession[] = [];

  read(id: string) {
    return this.sessions.get(id) ?? null;
  }

  write(session: ScenarioSession) {
    const copy = structuredClone(session);
    this.sessions.set(copy.id, copy);
    this.writes.push(copy);
  }

  remove(id: string) {
    this.sessions.delete(id);
  }
}

function createHarness(overrides: { actor?: Actor; matchedScene?: () => string } = {}) {
  const store = new MemoryStore();
  const actor: Actor = overrides.actor ?? {
    moveTo: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    type: vi.fn(async () => undefined),
  };
  const presenter: Presenter = { present: vi.fn(), dismiss: vi.fn() };
  let matchedScene = "main";
  const runtime = new ScenarioRuntime({
    actor,
    presenter,
    sessionStore: store,
    sceneMatcher: {
      matches: async (scene) => scene.id === (overrides.matchedScene?.() ?? matchedScene),
    },
    conditionWaiter: { waitFor: vi.fn(async () => undefined) },
    createId: () => "session-1",
    now: () => 100,
  });
  return { runtime, store, actor, presenter, setMatchedScene: (id: string) => (matchedScene = id) };
}

describe("ScenarioRuntime", () => {
  it("runs guided steps through enter, present, commit, and complete", async () => {
    const scenario = defineScenario({
      id: "typing",
      version: 1,
      scenes: [
        {
          id: "main",
          match: { pathname: "/" },
          steps: [
            {
              id: "name",
              target: "#name",
              enter: { cursor: "move" },
              present: { title: "Name it" },
              commit: { type: { value: "Scenema" } },
              exit: { until: { value: "Scenema" } },
            },
          ],
        },
      ],
    });
    const { runtime, store, actor, presenter } = createHarness();

    await runtime.start(scenario);
    expect(actor.moveTo).toHaveBeenCalledWith("#name");
    expect(presenter.present).toHaveBeenCalledOnce();
    expect(runtime.inspect().currentPhase).toBe("present");

    await runtime.proceed();
    expect(actor.type).toHaveBeenCalledWith("#name", "Scenema");
    expect(runtime.inspect().currentPhase).toBe("complete");
    expect(store.writes.map(({ phase }) => phase)).toEqual([
      "enter",
      "enter",
      "present",
      "commit",
      "complete",
    ]);
  });

  it("persists a prepared transition before performing its trigger", async () => {
    let currentScene = "source";
    const store = new MemoryStore();
    const click = vi.fn(async () => {
      const checkpoint = store.writes.at(-1)!;
      expect(checkpoint.phase).toBe("transition");
      expect(checkpoint.transition?.status).toBe("prepared");
      currentScene = "destination";
    });
    const runtime = new ScenarioRuntime({
      actor: { moveTo: vi.fn(), click, type: vi.fn() },
      presenter: { present: vi.fn(), dismiss: vi.fn() },
      sessionStore: store,
      sceneMatcher: { matches: async (scene) => scene.id === currentScene },
      conditionWaiter: { waitFor: vi.fn() },
      createId: () => "session-1",
      now: () => 1_000,
    });
    const scenario = defineScenario({
      id: "navigation",
      version: 1,
      scenes: [
        {
          id: "source",
          match: {},
          steps: [
            {
              id: "go",
              target: "#go",
              transition: { trigger: { click: true }, to: "destination" },
            },
          ],
        },
        { id: "destination", match: {}, steps: [{ id: "arrived", present: { title: "Arrived" } }] },
      ],
    });

    await runtime.start(scenario);
    await runtime.proceed();

    expect(click).toHaveBeenCalledOnce();
    expect(runtime.inspect()).toMatchObject({
      currentPhase: "present",
      currentScene: { id: "destination" },
      currentStep: { id: "arrived" },
    });
    const arrivedWrite = store.writes.find(({ transition }) => transition?.status === "arrived");
    expect(arrivedWrite).toBeDefined();
  });

  it("restores a presenting step without replaying enter choreography", async () => {
    const scenario = defineScenario({
      id: "restore",
      version: 1,
      scenes: [
        {
          id: "main",
          match: {},
          steps: [
            { id: "one", target: "#one", enter: { cursor: "move" }, present: { title: "One" } },
          ],
        },
      ],
    });
    const first = createHarness();
    const session = await first.runtime.start(scenario);
    const second = createHarness();

    await second.runtime.resume(scenario, structuredClone(session));

    expect(second.actor.moveTo).not.toHaveBeenCalled();
    expect(second.presenter.present).toHaveBeenCalledOnce();
    expect(second.runtime.inspect().currentPhase).toBe("present");
  });

  it("uses the persisted absolute start time for transition timeouts", async () => {
    let now = 1_000;
    const runtime = new ScenarioRuntime({
      actor: { moveTo: vi.fn(), click: vi.fn(), type: vi.fn() },
      presenter: { present: vi.fn(), dismiss: vi.fn() },
      sessionStore: new MemoryStore(),
      sceneMatcher: { matches: async (scene) => scene.id === "source" },
      conditionWaiter: { waitFor: vi.fn() },
      createId: () => "session-1",
      now: () => now,
    });
    const scenario = defineScenario({
      id: "timeout",
      version: 1,
      scenes: [
        {
          id: "source",
          match: {},
          steps: [
            {
              id: "go",
              target: "#go",
              transition: { trigger: { click: true }, to: "destination", timeout: 500 },
            },
          ],
        },
        { id: "destination", match: {}, steps: [{ id: "done" }] },
      ],
    });
    await runtime.start(scenario);
    await runtime.proceed();
    now = 1_500;

    await expect(runtime.reconcile()).rejects.toMatchObject({ code: "TRANSITION_TIMEOUT" });
  });
});

describe("defineScenario", () => {
  it("rejects transitions to unknown scenes", () => {
    expect(() =>
      defineScenario({
        id: "bad",
        version: 1,
        scenes: [
          {
            id: "only",
            match: {},
            steps: [
              { id: "go", target: "#go", transition: { trigger: { click: true }, to: "missing" } },
            ],
          },
        ],
      }),
    ).toThrow(/unknown scene/);
  });
});

describe("session codec", () => {
  it("rejects a transition phase without a checkpoint", () => {
    expect(() =>
      deserializeSession(
        JSON.stringify({
          schemaVersion: 1,
          id: "session",
          scenarioId: "demo",
          scenarioVersion: 1,
          sceneId: "a",
          stepId: "one",
          phase: "transition",
          revision: 1,
          updatedAt: 1,
        }),
      ),
    ).toThrowError(ScenemaError);
  });
});
