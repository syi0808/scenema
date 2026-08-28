import {
  ScenarioRuntime,
  ScenemaError,
  deserializeSession,
  definePlugin,
  defineScenario,
  step,
  visible,
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

function createHarness(
  overrides: {
    actor?: Actor;
    store?: MemoryStore;
    clickDelay?: number;
    operationHandlers?: ConstructorParameters<typeof ScenarioRuntime>[0]["operationHandlers"];
  } = {},
) {
  const store = overrides.store ?? new MemoryStore();
  const actor: Actor = overrides.actor ?? {
    moveTo: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    type: vi.fn(async () => undefined),
    press: vi.fn(async () => undefined),
  };
  const presenter: Presenter = { present: vi.fn(), dismiss: vi.fn() };
  const conditionWaiter = { waitFor: vi.fn(async () => undefined) };
  const runtime = new ScenarioRuntime({
    actor,
    presenter,
    sessionStore: store,
    conditionWaiter,
    createId: () => "session-1",
    now: () => 100,
    ...(overrides.clickDelay === undefined ? {} : { clickDelay: overrides.clickDelay }),
    ...(overrides.operationHandlers ? { operationHandlers: overrides.operationHandlers } : {}),
  });
  return { runtime, store, actor, presenter, conditionWaiter };
}

describe("step builder", () => {
  it("builds an ordered operation definition synchronously", () => {
    const definition = step("create", { ready: visible("#form") }, (s) => {
      s.cursor.move("#name");
      s.present({ target: "#name", title: "Name it" });
      s.type("#name", "Scenema");
      s.waitFor.value("#name", "Scenema", { timeout: 100 });
      s.navigate.click("#next", { timeout: 500 });
    });

    expect(definition).toEqual({
      id: "create",
      ready: { kind: "visible", target: "#form" },
      operations: [
        { kind: "cursor.move", target: "#name" },
        {
          kind: "present",
          target: "#name",
          content: { title: "Name it" },
          interaction: "auto",
          advance: "user",
        },
        { kind: "type", target: "#name", value: "Scenema" },
        {
          kind: "wait",
          condition: { kind: "value", target: "#name", value: "Scenema" },
          timeout: 100,
        },
        {
          kind: "navigate",
          action: { kind: "click", target: "#next" },
          timeout: 500,
        },
      ],
    });
  });

  it("rejects async workflow builders", () => {
    expect(() =>
      step("async", (async (s) => {
        s.present("Nope");
      }) as unknown as (builder: Parameters<Parameters<typeof step>[1]>[0]) => void),
    ).toThrow(/synchronous/);
  });

  it("accepts declarative steps and rejects duplicate ids", () => {
    expect(() =>
      defineScenario({
        id: "duplicate",
        version: 1,
        steps: [
          { id: "same", operations: [] },
          { id: "same", operations: [] },
        ],
      }),
    ).toThrow(/duplicated/);
  });
});

describe("ScenarioRuntime", () => {
  it("executes operations in source order and pauses at presentations", async () => {
    const scenario = defineScenario({
      id: "typing",
      version: 1,
      steps: [
        step("name", (s) => {
          s.cursor.move("#name");
          s.present({ target: "#name", title: "Name it" });
          s.type("#name", "Scenema");
          s.waitFor.value("#name", "Scenema");
        }),
      ],
    });
    const { runtime, actor, presenter, conditionWaiter } = createHarness();

    await runtime.start(scenario);
    expect(actor.moveTo).toHaveBeenCalledWith("#name", undefined);
    expect(runtime.inspect()).toMatchObject({ status: "presenting", currentStep: { id: "name" } });
    expect(presenter.present).toHaveBeenCalledWith(
      { title: "Name it" },
      expect.objectContaining({
        progress: { current: 1, total: 1 },
        interaction: "locked",
      }),
    );

    await runtime.proceed();
    expect(actor.type).toHaveBeenCalledWith("#name", "Scenema", undefined);
    expect(conditionWaiter.waitFor).toHaveBeenCalledWith(
      { kind: "value", target: "#name", value: "Scenema" },
      undefined,
    );
    expect(runtime.inspect().status).toBe("complete");
  });

  it("counts user presentations instead of steps", async () => {
    const scenario = defineScenario({
      id: "progress",
      version: 1,
      steps: [
        step("one", (s) => {
          s.present({ title: "Loading", advance: "auto" });
          s.present("A");
          s.click("#effect");
          s.present("B");
        }),
        step("two", (s) => s.present("C")),
      ],
    });
    const { runtime, presenter } = createHarness();

    await runtime.start(scenario);
    expect(presenter.present).toHaveBeenLastCalledWith(
      { title: "A" },
      expect.objectContaining({ progress: { current: 1, total: 3 } }),
    );
    await runtime.proceed();
    expect(presenter.present).toHaveBeenLastCalledWith(
      { title: "B" },
      expect.objectContaining({ progress: { current: 2, total: 3 } }),
    );
    await runtime.proceed();
    expect(presenter.present).toHaveBeenLastCalledWith(
      { title: "C" },
      expect.objectContaining({ progress: { current: 3, total: 3 } }),
    );
  });

  it("moves back by presentation checkpoint without replaying effects", async () => {
    const scenario = defineScenario({
      id: "back",
      version: 1,
      steps: [
        step("flow", (s) => {
          s.present("A");
          s.click("#effect");
          s.present("B");
        }),
      ],
    });
    const { runtime, actor, presenter } = createHarness();

    await runtime.start(scenario);
    await runtime.proceed();
    await runtime.back();
    expect(presenter.present).toHaveBeenLastCalledWith(
      { title: "A" },
      expect.objectContaining({ canBack: false }),
    );
    await runtime.proceed();

    expect(actor.click).toHaveBeenCalledOnce();
    expect(presenter.present).toHaveBeenLastCalledWith(
      { title: "B" },
      expect.objectContaining({ progress: { current: 2, total: 2 } }),
    );
  });

  it("persists an at-most-once checkpoint before clicking", async () => {
    const never = new Promise<void>(() => undefined);
    const store = new MemoryStore();
    const first = createHarness({
      store,
      actor: {
        moveTo: vi.fn(),
        click: vi.fn(() => never),
        type: vi.fn(),
      },
    });
    const scenario = defineScenario({
      id: "recover-click",
      version: 1,
      steps: [
        step("flow", (s) => {
          s.present("Before");
          s.click("#effect");
          s.present("After");
        }),
      ],
    });

    await first.runtime.start(scenario);
    void first.runtime.proceed();
    await vi.waitFor(() =>
      expect(store.writes.at(-1)?.pendingOperation).toMatchObject({
        kind: "click",
        durability: "at-most-once",
        status: "prepared",
      }),
    );

    const second = createHarness();
    await second.runtime.resume(scenario, structuredClone(store.writes.at(-1)!));
    expect(second.actor.click).not.toHaveBeenCalled();
    expect(second.presenter.present).toHaveBeenCalledWith({ title: "After" }, expect.any(Object));
  });

  it("persists and reconciles navigation into the next ready step", async () => {
    const store = new MemoryStore();
    const scenario = defineScenario({
      id: "navigation",
      version: 1,
      steps: [
        step("leave", (s) => {
          s.present("Leave");
          s.navigate.click("#next");
        }),
        step("arrive", { ready: visible("#arrived") }, (s) => s.present("Arrived")),
      ],
    });
    const { runtime, actor, presenter, conditionWaiter } = createHarness({ store });

    await runtime.start(scenario);
    await runtime.proceed();

    const prepared = store.writes.find((session) => session.pendingOperation?.kind === "navigate");
    expect(prepared?.pendingOperation).toMatchObject({
      address: "leave/1",
      durability: "reconcile",
      status: "prepared",
    });
    expect(actor.click).toHaveBeenCalledOnce();
    expect(conditionWaiter.waitFor).toHaveBeenCalledWith(visible("#arrived"), expect.any(Object));
    expect(presenter.present).toHaveBeenLastCalledWith(
      { title: "Arrived" },
      expect.objectContaining({ step: { id: "arrive", index: 1 } }),
    );
  });

  it("executes registered plugin operations", async () => {
    const execute = vi.fn();
    const plugin = definePlugin({ operations: { "scroll.to": { execute } } });
    const scenario = defineScenario({
      id: "plugin",
      version: 1,
      steps: [step("custom", (s) => s.use({ kind: "scroll.to", target: "#pricing" }))],
    });
    const { runtime } = createHarness({ operationHandlers: plugin.operations });

    await runtime.start(scenario);

    expect(execute).toHaveBeenCalledWith(
      { kind: "scroll.to", target: "#pricing" },
      expect.objectContaining({ address: "custom/0" }),
    );
    expect(runtime.inspect().status).toBe("complete");
  });
});

describe("session codec", () => {
  it("round-trips an operation position", () => {
    const session = deserializeSession(
      JSON.stringify({
        schemaVersion: 1,
        id: "session",
        scenarioId: "demo",
        scenarioVersion: 1,
        position: { stepId: "one", operationIndex: 3 },
        completedOperations: ["one/0", "one/1"],
        revision: 1,
        updatedAt: 1,
      }),
    );

    expect(session.position).toEqual({ stepId: "one", operationIndex: 3 });
  });

  it("rejects an unsupported session schema", () => {
    expect(() =>
      deserializeSession(
        JSON.stringify({
          schemaVersion: 2,
          id: "session",
          scenarioId: "demo",
          scenarioVersion: 1,
          position: { stepId: "one", operationIndex: 0 },
          completedOperations: [],
          revision: 1,
          updatedAt: 1,
        }),
      ),
    ).toThrowError(ScenemaError);
  });
});
