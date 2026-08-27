<script lang="ts">
  import { createTourPresenter } from "@scenema/presenter";
  import { createScenema, defineScenario, type Presenter, type Scenema } from "scenema";
  import { onMount, tick } from "svelte";

  import type { DemoId } from "./examples";

  let { onPrepare }: { onPrepare: (id: DemoId) => void } = $props();

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pageTour = defineScenario({
    id: "landing-page-tour",
    version: 1,
    scenes: [
      {
        id: "landing",
        match: { pathname: sitePath("/"), visible: "#hero-copy" },
        steps: [
          {
            id: "first-action",
            target: "#code-tab-dom-action",
            present: {
              title: "Click a real control",
              description: "Continue and Scenema will select the DOM action example.",
            },
            commit: { click: true },
          },
          {
            id: "next-action",
            target: "#code-tab-navigation",
            present: {
              title: "Continue with another action",
              description: "Scenema moves to the next target and selects Navigation.",
            },
            commit: { click: true },
          },
          {
            id: "result",
            target: "#scenario-code-panel",
            present: {
              title: "The page responded",
              description: "The code panel now shows the scenario for the selected action.",
            },
          },
          {
            id: "start",
            target: "#getting-started-actions",
            present: {
              title: "Start with one scenario",
              description: "The repository contains the runtime, presenter, and this live example.",
            },
          },
        ],
      },
    ],
  });

  const singleHighlight = defineScenario({
    id: "landing-single-highlight",
    version: 1,
    scenes: [
      {
        id: "landing",
        match: { pathname: sitePath("/"), visible: "#getting-started-actions" },
        steps: [
          {
            id: "highlight",
            target: "#getting-started-actions",
            present: {
              title: "Start from the repository",
              description: "A single step can focus any stable element on the page.",
            },
          },
        ],
      },
    ],
  });

  const domAction = defineScenario({
    id: "landing-dom-action",
    version: 1,
    scenes: [
      {
        id: "landing",
        match: { pathname: sitePath("/"), visible: "#code-tab-dom-action" },
        steps: [
          {
            id: "click-tab",
            target: "#code-tab-dom-action",
            present: {
              title: "Click a real control",
              description: "Continue and Scenema will select the DOM action example.",
            },
            commit: { click: true },
          },
          {
            id: "show-result",
            target: "#scenario-code-panel",
            present: {
              title: "The interface responded",
              description: "The same action can target controls inside your product.",
            },
          },
        ],
      },
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
  let announcement = $state("");

  onMount(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tourPresenter = createTourPresenter({
      document,
      overlay: { color: "#0f172a", opacity: 0.58, padding: 8, borderRadius: 8 },
    });
    const presenter: Presenter = {
      async present(presentation, context) {
        const target = document.querySelector(context.target ?? "#hero-copy");
        if (target) await scrollTargetIntoView(target, reduceMotion);
        await tick();
        return tourPresenter.present(presentation, context);
      },
      dismiss: tourPresenter.dismiss,
    };

    runtime = createScenema({
      scenarios,
      actorble: {
        feedback: "cursor",
        motion: !reduceMotion,
        ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
      },
      presenter,
      logger(message) {
        if (!message.endsWith("scenario complete")) return;
        const completedDemo = activeDemo;
        activeDemo = null;
        if (!completedDemo) return;
        window.setTimeout(() =>
          document.querySelector<HTMLElement>(focusTargets[completedDemo])?.focus(),
        );
      },
      onError(error) {
        announcement = error.message;
        activeDemo = null;
        starting = false;
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

    return () => runtime?.dispose();
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
    } finally {
      starting = false;
    }
  }

  function sitePath(path: string): string {
    if (!basePrefix) return path;
    return path === "/" ? `${basePrefix}/` : `${basePrefix}${path}`;
  }

  async function scrollTargetIntoView(target: Element, reduceMotion: boolean): Promise<void> {
    if (reduceMotion) {
      target.scrollIntoView({ behavior: "auto", block: "center" });
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
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      view.requestAnimationFrame(() =>
        view.requestAnimationFrame(() => {
          if (!scrolling) finish();
        }),
      );
    });
  }
</script>

<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
