// @vitest-environment jsdom

import { deserializeSession, type ScenarioSession } from "@scenema/core";
import { createScenema, defineScenario, type Presenter } from "scenema";
import {
  ACTIVE_SESSION_KEY,
  ActiveSessionPointer,
  DomConditionWaiter,
  DomSceneMatcher,
  LocalStorageSessionStore,
  createNavigationObserver,
} from "@scenema/runtime-web";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});

describe("web persistence", () => {
  it("stores the active pointer per tab and sessions in local storage", () => {
    const pointer = new ActiveSessionPointer(sessionStorage);
    const store = new LocalStorageSessionStore(localStorage);
    const session: ScenarioSession = {
      schemaVersion: 1,
      id: "abc",
      scenarioId: "demo",
      scenarioVersion: 1,
      sceneId: "main",
      stepId: "one",
      phase: "present",
      revision: 2,
      updatedAt: 10,
    };

    pointer.set(session.id);
    store.write(session);

    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBe("abc");
    expect(store.read("abc")).toEqual(session);
    expect(deserializeSession(localStorage.getItem("__scenema__:v1:session:abc")!)).toEqual(session);
  });
});

describe("DOM runtime primitives", () => {
  it("matches URL and visible DOM conditions", async () => {
    history.replaceState(null, "", "/projects?mode=create#details");
    document.body.innerHTML = '<main id="project-form"></main>';
    const matcher = new DomSceneMatcher({ window, document });

    await expect(matcher.matches({
      id: "create",
      match: { pathname: "/projects", search: { mode: "create" }, hash: "#details", visible: "#project-form" },
      steps: [],
    })).resolves.toBe(true);
  });

  it("waits for input values", async () => {
    document.body.innerHTML = '<input id="name">';
    const waiter = new DomConditionWaiter({ window, document }, 100, 5);
    window.setTimeout(() => {
      (document.querySelector("#name") as HTMLInputElement).value = "Scenema";
    }, 5);

    await expect(waiter.waitFor({ value: "Scenema" }, "#name")).resolves.toBeUndefined();
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
  it("bootstraps a prepared transition in a new runtime", async () => {
    history.replaceState(null, "", "/page-a");
    document.body.innerHTML = '<button id="next">Next</button>';
    const scenario = defineScenario({
      id: "mpa",
      version: 1,
      scenes: [
        { id: "a", match: { pathname: "/page-a", visible: "#next" }, steps: [{ id: "leave", target: "#next", present: { title: "Leave" }, transition: { trigger: { click: true }, to: "b" } }] },
        { id: "b", match: { pathname: "/page-b", visible: "#arrived" }, steps: [{ id: "resume", present: { title: "Resumed" } }] },
      ],
    });
    const firstPresenter: Presenter = { present: vi.fn(), dismiss: vi.fn() };
    const never = new Promise<void>(() => undefined);
    const runtimeA = createScenema({
      scenarios: [scenario],
      presenter: firstPresenter,
      actor: { moveTo: vi.fn(), click: vi.fn(() => never), type: vi.fn() },
    });
    await runtimeA.start("mpa");
    void runtimeA.proceed();
    await vi.waitFor(() => {
      const id = sessionStorage.getItem(ACTIVE_SESSION_KEY)!;
      expect(new LocalStorageSessionStore(localStorage).read(id)?.transition?.status).toBe("prepared");
    });
    runtimeA.dispose();

    history.replaceState(null, "", "/page-b");
    document.body.innerHTML = '<main id="arrived"></main>';
    const secondPresenter: Presenter = { present: vi.fn(), dismiss: vi.fn() };
    const runtimeB = createScenema({ scenarios: [scenario], presenter: secondPresenter });

    await expect(runtimeB.bootstrap()).resolves.toBe(true);
    expect(runtimeB.inspect()).toMatchObject({ currentPhase: "present", currentScene: { id: "b" }, currentStep: { id: "resume" } });
    expect(secondPresenter.present).toHaveBeenCalledOnce();
    runtimeB.stop();
    runtimeB.dispose();
  });
});
