<script lang="ts">
  import { createTourPresenter } from "@scenema/presenter";
  import {
    createScenema,
    createScenemaActorble,
    defineScenario,
    exists,
    step,
    type Actor,
    type Presenter,
    type ResolvedTarget,
    type Scenema,
  } from "scenema";
  import { onMount, tick } from "svelte";

  import type { DemoId } from "./examples";

  let {
    acquireActorble,
    onPrepare,
    onCursorRelease,
    isolated = false,
  }: {
    acquireActorble: () => ReturnType<typeof createScenemaActorble>;
    onPrepare: (id: DemoId) => void;
    onCursorRelease: () => void;
    isolated?: boolean;
  } = $props();

  const pageTour = defineScenario({
    id: "landing-page-tour",
    version: 1,
    steps: [
      step("first-action", { ready: exists("#hero-copy") }, (s) => {
        s.present({
          target: "#code-tab-dom-action",
              title: "Click a real control",
              description: "Continue and Scenema will select the DOM action example.",
        });
        s.click("#code-tab-dom-action");
      }),
      step("next-action", (s) => {
        s.present({
          target: "#code-tab-navigation",
              title: "Continue with another action",
              description: "Scenema moves to the next target and selects Navigation.",
        });
        s.click("#code-tab-navigation");
      }),
      step("result", (s) => {
        s.present({
          target: "#scenario-code-panel",
              title: "The page responded",
              description: "The code panel now shows the scenario for the selected action.",
        });
      }),
      step("start", (s) => {
        s.present({
          target: "#getting-started-actions",
              title: "Start with one scenario",
              description: "The repository contains the runtime, presenter, and this live example.",
        });
      }),
    ],
  });

  const singleHighlight = defineScenario({
    id: "landing-single-highlight",
    version: 1,
    steps: [
      step("highlight", { ready: exists("#getting-started-actions") }, (s) => {
        s.present({
          target: "#getting-started-actions",
              title: "Start from the repository",
              description: "A single step can focus any stable element on the page.",
        });
      }),
    ],
  });

  const domAction = defineScenario({
    id: "landing-dom-action",
    version: 1,
    steps: [
      step("click-tab", { ready: exists("#code-tab-dom-action") }, (s) => {
        s.present({
          target: "#code-tab-dom-action",
              title: "Click a real control",
              description: "Continue and Scenema will select the DOM action example.",
        });
        s.click("#code-tab-dom-action");
      }),
      step("show-result", (s) => {
        s.present({
          target: "#scenario-code-panel",
              title: "The interface responded",
              description: "The same action can target controls inside your product.",
        });
      }),
    ],
  });

  const scenarios = [pageTour, singleHighlight, domAction];
  const scenarioIds: Record<DemoId, string> = {
    "page-tour": pageTour.id,
    "single-highlight": singleHighlight.id,
    "dom-action": domAction.id,
  };
  const focusTargets: Record<DemoId, string> = {
    "page-tour": "#start-tour",
    "single-highlight": "#run-single-highlight",
    "dom-action": "#run-dom-action",
  };

  let runtime: Scenema | null = null;
  let ready: Promise<void> = Promise.resolve();
  let activeDemo: DemoId | null = null;
  let starting = false;
  let autoplaying = false;
  let announcement = $state("");

  onMount(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tourPresenter = createTourPresenter({
      document,
      overlay: { color: "#0f172a", opacity: 0.58, padding: 8, borderRadius: 8 },
    });
    const presenter: Presenter = {
      async present(presentation, context) {
        const target = toElement(context.target) ?? document.querySelector("#hero-copy");
        if (target) await scrollTargetIntoView(target, reduceMotion);
        await tick();
        await tourPresenter.present(presentation, context);
        if (isolated) {
          document
            .querySelector<HTMLElement>('[data-scenema-presenter="tour"]')
            ?.style.setProperty("z-index", "2147483000", "important");
        }
      },
      dismiss: tourPresenter.dismiss,
    };
    const actor: Actor = {
      moveTo(target) {
        return acquireActorble().moveTo(toActorTarget(target));
      },
      restoreCursor(target) {
        return acquireActorble().moveTo(toActorTarget(target), { duration: 0 });
      },
      click(target) {
        return acquireActorble().click(toActorTarget(target));
      },
      type(target, value) {
        return acquireActorble().typeInto(toActorTarget(target), value);
      },
    };

    runtime = createScenema({
      scenarios,
      actor,
      presenter,
      ...(isolated ? { window: createIsolatedWindow(window), document } : {}),
      logger(message) {
        if (!message.endsWith("scenario complete")) return;
        const completedDemo = activeDemo;
        activeDemo = null;
        if (!completedDemo) return;
        window.setTimeout(() => {
          document.querySelector<HTMLElement>(focusTargets[completedDemo])?.focus();
          onCursorRelease();
        });
      },
      onError(error) {
        announcement = error.message;
        activeDemo = null;
        starting = false;
        onCursorRelease();
      },
    });

    ready = runtime
      .bootstrap()
      .then((restored) => {
        if (!restored) return;
        const scenarioId = runtime?.inspect().session?.scenarioId;
        activeDemo =
          (Object.entries(scenarioIds).find(([, id]) => id === scenarioId)?.[0] as
            | DemoId
            | undefined) ?? null;
      })
      .catch(() => undefined);

    return () => {
      runtime?.dispose();
      onCursorRelease();
    };
  });

  export async function start(id: DemoId): Promise<void> {
    if (!runtime || starting) return;
    starting = true;
    announcement = "";
    await ready;
    runtime.stop();
    onPrepare(id);
    await tick();
    activeDemo = id;
    try {
      await runtime.start(scenarioIds[id]);
    } catch (error) {
      announcement = error instanceof Error ? error.message : "The demo could not start.";
      activeDemo = null;
      onCursorRelease();
    } finally {
      starting = false;
    }
  }

  export async function autoplay(): Promise<void> {
    if (autoplaying) return;
    autoplaying = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const director = createScenemaActorble(document, {
      feedback: isolated ? { cursor: { label: "User" } } : "cursor",
      motion: !reduceMotion,
      ...(reduceMotion
        ? {
            actionDefaults: {
              click: { duration: 0, pressDwell: 0 },
              moveTo: { duration: 0 },
            },
          }
        : {}),
    });

    try {
      await director.click(resolveTarget("#start-tour"), { force: true });
      for (let step = 1; step <= pageTour.steps.length; step += 1) {
        const next = await waitForTourControl(step, pageTour.steps.length);
        await pause(reduceMotion ? 200 : 1_100);
        await director.click(next, { force: true });
      }
      await waitForTourToClose();
    } catch (error) {
      announcement = error instanceof Error ? error.message : "The automatic demo stopped.";
    } finally {
      director.destroy();
      autoplaying = false;
    }
  }

  function resolveTarget(selector: string): Element {
    const target = document.querySelector(selector);
    if (!target) throw new Error(`The demo target was not found: ${selector}`);
    return target;
  }

  function toElement(target: ResolvedTarget | undefined): Element | null {
    if (target === undefined) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target.nodeType === 1 ? (target as Element) : target.parentElement;
  }

  function toActorTarget(target: ResolvedTarget): Element {
    const element = toElement(target);
    if (!element) throw new Error("The demo target is not an element.");
    return element;
  }

  async function waitForTourControl(step: number, total: number): Promise<HTMLButtonElement> {
    return waitForElement(() => {
      const presenter = document.querySelector<HTMLElement>('[data-scenema-presenter="tour"]');
      if (presenter?.shadowRoot?.querySelector(".progress")?.textContent !== `${step} / ${total}`)
        return null;
      return presenter.shadowRoot.querySelector<HTMLButtonElement>(".next");
    });
  }

  async function waitForTourToClose(): Promise<void> {
    await waitForElement(() =>
      document.querySelector('[data-scenema-presenter="tour"]') ? null : document.body,
    );
  }

  async function waitForElement<T extends Element>(resolve: () => T | null): Promise<T> {
    const timeoutAt = performance.now() + 10_000;
    while (performance.now() < timeoutAt) {
      const element = resolve();
      if (element) return element;
      await new Promise<void>((resume) => window.requestAnimationFrame(() => resume()));
    }
    throw new Error("The automatic demo could not find its next control.");
  }

  function pause(duration: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  function createIsolatedWindow(source: Window): Window {
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    return new Proxy(source, {
      get(target, property) {
        if (property === "localStorage") return localStorage;
        if (property === "sessionStorage") return sessionStorage;
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  class MemoryStorage implements Storage {
    readonly #values = new Map<string, string>();

    get length(): number {
      return this.#values.size;
    }

    clear(): void {
      this.#values.clear();
    }

    getItem(key: string): string | null {
      return this.#values.get(key) ?? null;
    }

    key(index: number): string | null {
      return Array.from(this.#values.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.#values.delete(key);
    }

    setItem(key: string, value: string): void {
      this.#values.set(key, String(value));
    }
  }

  async function scrollTargetIntoView(target: Element, reduceMotion: boolean): Promise<void> {
    if (reduceMotion) {
      if (isolated) scrollIsolatedTarget(target, "auto");
      else target.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }
    const view = document.defaultView;
    if (!view) return;
    await new Promise<void>((resolve) => {
      let settledTimer: number | undefined;
      let maximumTimer: number | undefined;
      let finished = false;
      let scrolling = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.removeEventListener("scroll", handleScroll, true);
        if (settledTimer !== undefined) view.clearTimeout(settledTimer);
        if (maximumTimer !== undefined) view.clearTimeout(maximumTimer);
        resolve();
      };
      const handleScroll = () => {
        scrolling = true;
        if (settledTimer !== undefined) view.clearTimeout(settledTimer);
        settledTimer = view.setTimeout(finish, 80);
      };
      document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
      maximumTimer = view.setTimeout(finish, 1_000);
      if (isolated) scrollIsolatedTarget(target, "smooth");
      else target.scrollIntoView({ behavior: "smooth", block: "center" });
      view.requestAnimationFrame(() =>
        view.requestAnimationFrame(() => {
          if (!scrolling) finish();
        }),
      );
    });
  }

  function scrollIsolatedTarget(target: Element, behavior: ScrollBehavior): void {
    const bounds = target.getBoundingClientRect();
    const top = Math.max(0, window.scrollY + bounds.top - (window.innerHeight - bounds.height) / 2);
    window.scrollTo({ top, behavior });
  }
</script>

<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
