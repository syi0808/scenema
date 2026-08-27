<script lang="ts">
  import { createTourPresenter } from "@scenema/presenter";
  import { createScenema, defineScenario, type Presenter, type Scenema } from "scenema";
  import { onMount, tick } from "svelte";

  import type { ExampleId } from "./examples";

  let {
    onPrepare,
    onSelectExample,
    onRunningChange,
    onCompleted,
  }: {
    onPrepare: () => Promise<void>;
    onSelectExample: (id: ExampleId) => void;
    onRunningChange: (running: boolean, starting: boolean) => void;
    onCompleted: () => void;
  } = $props();

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  let runtime: Scenema | null = null;
  let status = $state("Ready. Start the demo when you choose.");
  let statusState = $state<"ready" | "error">("ready");
  let starting = false;

  const scenario = defineScenario({
    id: "landing-page-demo",
    version: 1,
    scenes: [
      {
        id: "landing",
        match: { pathname: sitePath("/"), visible: "#hero-demo" },
        steps: [
          {
            id: "introduction",
            target: "#hero-demo",
            present: {
              title: "This page is the demo",
              description: "Scenema will act on the controls already in front of you.",
            },
          },
          {
            id: "click-action",
            target: "#click-example-action",
            present: {
              title: "Perform a real click",
              description: "Continue when you are ready. Scenema will click this button.",
            },
            commit: { click: true },
          },
          {
            id: "type-value",
            target: "#type-example-input",
            present: {
              title: "Type into the real field",
              description: "The value is entered through the same DOM target a person uses.",
            },
            commit: { type: { value: "Launch workspace" } },
            exit: { until: { value: "Launch workspace" } },
          },
          {
            id: "change-route",
            target: "#navigation-example-action",
            present: {
              title: "Continue on a new route",
              description: "Scenema prepares the transition before the pathname changes.",
            },
            transition: { trigger: { click: true }, to: "navigation-complete" },
          },
        ],
      },
      {
        id: "navigation-complete",
        match: {
          pathname: sitePath("/examples/navigation"),
          visible: "#scenario-code-panel",
        },
        steps: [
          {
            id: "show-code",
            target: "#scenario-code-panel",
            present: {
              title: "The scenario stayed with the page",
              description: "The target, action, and route transition live in the same sequence.",
            },
          },
        ],
      },
    ],
  });

  const stepExamples: Partial<Record<string, ExampleId>> = {
    "click-action": "click",
    "type-value": "type",
    "change-route": "navigation",
    "show-code": "navigation",
  };

  onMount(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tourPresenter = createTourPresenter({
      document,
      overlay: { color: "#0f172a", opacity: 0.58, padding: 8, borderRadius: 8 },
    });
    const presenter: Presenter = {
      async present(presentation, context) {
        const example = stepExamples[context.stepId];
        if (example) {
          onSelectExample(example);
          await tick();
        }
        document.querySelector(context.target ?? "#hero-demo")?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
        });
        await tick();
        return tourPresenter.present(presentation, context);
      },
      dismiss: tourPresenter.dismiss,
    };

    runtime = createScenema({
      scenarios: [scenario],
      actorble: {
        feedback: "cursor",
        motion: !reduceMotion,
        ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
      },
      presenter,
      logger(message) {
        if (!message.endsWith("scenario complete")) return;
        status = "Demo complete. The landing page handled every action.";
        onRunningChange(false, false);
        onCompleted();
        window.setTimeout(() => document.querySelector<HTMLElement>("#start-tour")?.focus(), 350);
      },
      onError(error) {
        status = `${error.message} Start the demo again to reset it.`;
        statusState = "error";
        starting = false;
        onRunningChange(false, false);
      },
    });

    void runtime.bootstrap().then((restored) => {
      if (!restored) return;
      status = "The demo continued at the current route.";
      onRunningChange(true, false);
    });

    return () => runtime?.dispose();
  });

  export async function start(): Promise<void> {
    if (!runtime || starting) return;
    starting = true;
    statusState = "ready";
    status = "Preparing the landing page demo…";
    onRunningChange(false, true);
    runtime.stop();
    await onPrepare();
    try {
      await runtime.start(scenario);
      status = "Demo running. You choose when each action happens.";
      onRunningChange(true, false);
    } catch (error) {
      statusState = "error";
      status = error instanceof Error ? error.message : "The demo could not start.";
      onRunningChange(false, false);
    } finally {
      starting = false;
    }
  }

  function sitePath(path: string): string {
    if (!basePrefix) return path;
    return path === "/" ? `${basePrefix}/` : `${basePrefix}${path}`;
  }
</script>

<p class="demo-status container" data-state={statusState} role="status" aria-live="polite">{status}</p>
