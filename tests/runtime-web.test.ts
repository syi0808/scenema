// @vitest-environment jsdom

import { all, exists, pathname, type ScenarioSession } from "@scenema/core";
import { createScenema, defineScenario, step, type Presenter } from "scenema";
import {
  ACTIVE_SESSION_KEY,
  ActiveSessionPointer,
  DomConditionWaiter,
  LocalStorageSessionStore,
  createNavigationObserver,
  resolveDomTarget,
} from "@scenema/runtime-web";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});

describe("web persistence", () => {
  it("stores v2 operation sessions and an active pointer", () => {
    const pointer = new ActiveSessionPointer(sessionStorage);
    const store = new LocalStorageSessionStore(localStorage);
    const session: ScenarioSession = {
      schemaVersion: 2,
      id: "abc",
      scenarioId: "demo",
      scenarioVersion: 2,
      position: { stepId: "one", operationIndex: 1 },
      completedOperations: ["one/0"],
      revision: 2,
      updatedAt: 10,
    };

    pointer.set(session.id);
    store.write(session);

    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBe("abc");
    expect(store.read("abc")).toEqual(session);
    expect(localStorage.getItem("__scenema__:v2:session:abc")).not.toBeNull();
  });
});

describe("DOM runtime primitives", () => {
  it("evaluates composable URL, existence, and predicate readiness", async () => {
    history.replaceState(null, "", "/projects/one");
    document.body.innerHTML = '<main id="project-form"></main>';
    const waiter = new DomConditionWaiter({ window, document }, 100, 5);

    await expect(
      waiter.waitFor(
        all(
          pathname(/^\/projects\//),
          exists("#project-form"),
          ({ document }) => document.querySelector("main") !== null,
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it("distinguishes existence from visibility", async () => {
    document.body.innerHTML = '<div id="hidden" style="display:none"></div>';
    const waiter = new DomConditionWaiter({ window, document }, 10, 1);

    await expect(waiter.waitFor(exists("#hidden"))).resolves.toBeUndefined();
    await expect(waiter.waitFor({ kind: "visible", target: "#hidden" })).rejects.toMatchObject({
      code: "TARGET_NOT_FOUND",
    });
  });

  it("resolves selector, Node, and async function targets", async () => {
    document.body.innerHTML = '<button id="target">Target</button>';
    const target = document.querySelector("#target")!;

    await expect(resolveDomTarget(document, "#target")).resolves.toBe(target);
    await expect(resolveDomTarget(document, target)).resolves.toBe(target);
    await expect(
      resolveDomTarget(document, async ({ document }) => document.querySelector("button")),
    ).resolves.toBe(target);
  });

  it("observes History API navigation and restores patched methods", () => {
    const originalPushState = history.pushState;
    const listener = vi.fn();
    const observer = createNavigationObserver(window);
    observer.subscribe(listener);

    history.pushState(null, "", "/next");
    expect(listener).toHaveBeenCalledOnce();
    observer.dispose();
    expect(history.pushState).toBe(originalPushState);
  });
});

describe("document-lifetime recovery", () => {
  it("bootstraps a prepared navigation in a new runtime", async () => {
    history.replaceState(null, "", "/page-a");
    document.body.innerHTML = '<button id="next">Next</button>';
    const scenario = defineScenario({
      id: "mpa",
      version: 2,
      steps: [
        step("leave", (s) => {
          s.present({ target: "#next", title: "Leave" });
          s.navigate.click("#next");
        }),
        step("resume", { ready: all(pathname("/page-b"), exists("#arrived")) }, (s) => {
          s.present("Resumed");
        }),
      ],
    });
    const never = new Promise<void>(() => undefined);
    const runtimeA = createScenema({
      scenarios: [scenario],
      presenter: { present: vi.fn(), dismiss: vi.fn() },
      actor: { moveTo: vi.fn(), click: vi.fn(() => never), type: vi.fn() },
    });
    await runtimeA.start("mpa");
    void runtimeA.proceed();
    await vi.waitFor(() => {
      const id = sessionStorage.getItem(ACTIVE_SESSION_KEY)!;
      expect(new LocalStorageSessionStore(localStorage).read(id)?.pendingOperation).toMatchObject({
        kind: "navigate",
        status: "prepared",
      });
    });
    runtimeA.dispose();

    history.replaceState(null, "", "/page-b");
    document.body.innerHTML = '<main id="arrived"></main>';
    const secondPresenter: Presenter = { present: vi.fn(), dismiss: vi.fn() };
    const runtimeB = createScenema({ scenarios: [scenario], presenter: secondPresenter });

    await expect(runtimeB.bootstrap()).resolves.toBe(true);
    expect(runtimeB.inspect()).toMatchObject({
      status: "presenting",
      currentStep: { id: "resume" },
      currentOperation: { kind: "present" },
    });
    expect(secondPresenter.present).toHaveBeenCalledOnce();
    runtimeB.stop();
    runtimeB.dispose();
  });
});
