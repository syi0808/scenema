<script lang="ts">
  import { createTourPresenter } from "@scenema/presenter";
  import { createScenema, defineScenario, type Scenema } from "scenema";
  import { onMount, tick } from "svelte";

  import Button from "./Button.svelte";

  type DemoState = "projects" | "new" | "ready";

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  let stage: HTMLElement | undefined = undefined;
  let runtime: Scenema | null = null;
  let state = $state<DemoState>(stateFromPath());
  let projectName = $state("");
  let formError = $state("");
  let status = $state("Preparing the demo…");
  let statusState = $state<"ready" | "error">("ready");
  let running = $state(false);
  let starting = $state(false);

  const scenario = defineScenario({
    id: "create-project-demo",
    version: 2,
    scenes: [
      {
        id: "projects",
        match: { pathname: sitePath("/try/projects"), visible: "#project-list" },
        steps: [
          {
            id: "create-project",
            target: "#create-project",
            enter: { cursor: "move" },
            present: {
              title: "Create a project",
              description: "You decide when the next action happens.",
            },
            transition: { trigger: { click: true }, to: "project-create" },
          },
        ],
      },
      {
        id: "project-create",
        match: { pathname: sitePath("/try/projects/new"), visible: "#project-form" },
        steps: [
          {
            id: "project-name",
            target: "#project-name",
            enter: { cursor: "move" },
            present: { title: "Name the project" },
            commit: { type: { value: "Launch workspace" } },
            exit: { until: { value: "Launch workspace" } },
          },
          {
            id: "submit-project",
            target: "#submit-project",
            enter: { cursor: "move" },
            present: { title: "Create the project" },
            transition: { trigger: { click: true }, to: "project-ready" },
          },
        ],
      },
      {
        id: "project-ready",
        match: {
          pathname: sitePath("/try/projects/launch-workspace"),
          visible: "#project-ready",
        },
        steps: [
          {
            id: "complete",
            present: {
              title: "The scenario stayed with you",
              description: "The pathname changed twice. The same sequence continued.",
            },
          },
        ],
      },
    ],
  });

  const steps: { id: DemoState; title: string }[] = [
    { id: "projects", title: "Create project" },
    { id: "new", title: "Name it" },
    { id: "ready", title: "Confirm route" },
  ];

  const activeIndex = $derived(steps.findIndex((step) => step.id === state));
  const routeLabel = $derived(routeForState(state));

  onMount(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    runtime = createScenema({
      scenarios: [scenario],
      actorble: {
        feedback: "cursor",
        motion: !reduceMotion,
        ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
      },
      presenter: createTourPresenter({
        document,
        container: stage,
        overlay: { color: "#0f172a", opacity: 0.58, padding: 8, borderRadius: 8 },
      }),
      onError(error) {
        status = `${error.message} Reset the demo and try again.`;
        statusState = "error";
      },
    });

    const handlePopState = async () => {
      if (routePath() === "/") {
        runtime?.stop();
        running = false;
        status = "Demo paused. Start again when you choose.";
      }
      state = stateFromPath();
      await tick();
      if (runtime?.inspect().session) await runtime.reconcile().catch(() => undefined);
    };
    window.addEventListener("popstate", handlePopState);

    void runtime
      .bootstrap()
      .then((restored) => {
        running = restored;
        status = restored
          ? "Your guided demo resumed at the current route."
          : "Ready when you are. The first step waits for you.";
      })
      .catch(() => {
        running = false;
        status = "Ready when you are. The first step waits for you.";
      });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      runtime?.dispose();
    };
  });

  export async function start(): Promise<void> {
    if (!runtime || starting) return;
    starting = true;
    statusState = "ready";
    status = "Starting the guided demo…";
    if (state !== "projects" || routePath() !== "/try/projects") {
      await navigate("projects", true);
    }
    try {
      await runtime.start(scenario);
      running = true;
      status = "Demo running. Use the guide to advance each step.";
    } catch (error) {
      statusState = "error";
      status = error instanceof Error ? error.message : "The demo could not start. Reset and try again.";
    } finally {
      starting = false;
    }
  }

  async function navigate(nextState: DemoState, replace = false): Promise<void> {
    const url = sitePath(routeForState(nextState));
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    state = nextState;
    if (nextState !== "new") {
      projectName = "";
      formError = "";
    }
    await tick();
    if (runtime?.inspect().session) {
      queueMicrotask(() => void runtime?.reconcile().catch(() => undefined));
    }
  }

  function reset(): void {
    runtime?.stop();
    running = false;
    starting = false;
    statusState = "ready";
    status = "Demo reset. Start again when you choose.";
    void navigate("projects", true);
  }

  function submitProject(event: SubmitEvent): void {
    event.preventDefault();
    if (!projectName.trim()) {
      formError = "Enter a project name to continue.";
      return;
    }
    void navigate("ready");
  }

  function routeForState(value: DemoState): string {
    if (value === "new") return "/try/projects/new";
    if (value === "ready") return "/try/projects/launch-workspace";
    return "/try/projects";
  }

  function stateFromPath(): DemoState {
    const path = routePath();
    if (path === "/try/projects/new") return "new";
    if (path === "/try/projects/launch-workspace") return "ready";
    return "projects";
  }

  function sitePath(path: string): string {
    if (!basePrefix) return path;
    return path === "/" ? `${basePrefix}/` : `${basePrefix}${path}`;
  }

  function routePath(path = location.pathname): string {
    if (!basePrefix) return path;
    if (path === basePrefix || path === `${basePrefix}/`) return "/";
    return path.startsWith(`${basePrefix}/`) ? path.slice(basePrefix.length) : path;
  }
</script>

<section class="demo-section container" id="live-demo" aria-labelledby="demo-title">
    <div class="section-heading section-heading--split">
      <div>
        <h2 id="demo-title">Watch the URL. Scenema stays with the flow.</h2>
    </div>
    <p>Advance each step yourself. Scenema performs the click, typing, and navigation inside this working interface.</p>
  </div>

  <div class="demo-stage" id="demo-stage" bind:this={stage}>
    <div class="demo-toolbar">
      <div class="route-readout"><code>{routeLabel}</code></div>
      <div class="demo-toolbar__actions">
        <Button label="Reset" variant="quiet" size="small" onclick={reset} />
        {#if !running}
          <Button id="start-tour" label={starting ? "Starting…" : "Start guided demo"} size="small" onclick={start} disabled={starting} />
        {/if}
      </div>
    </div>

    <div class="demo-stage__body">
      <div class="product-shell">
        <aside class="product-sidebar">
          <strong>Northstar</strong>
          <nav aria-label="Demo workspace"><a href={sitePath("/try/projects")} onclick={(event) => { event.preventDefault(); reset(); }} aria-current="page">Projects</a></nav>
        </aside>
        <div class="demo-workspace" id="demo-workspace">
          {#if state === "new"}
            <div class="workspace-header"><h3>New project</h3></div>
            <form class="form" id="project-form" novalidate onsubmit={submitProject}>
              <div class="field">
                <label for="project-name">Project name</label>
                <input id="project-name" name="name" autocomplete="off" aria-describedby="name-help name-error" aria-invalid={formError ? "true" : undefined} bind:value={projectName} oninput={() => (formError = "")} />
                <small id="name-help">Use a name your team will recognize.</small>
              </div>
              <p class="field-error" id="name-error" role="alert">{formError}</p>
              <div class="form-actions">
                <button class="button" id="submit-project" type="submit">Create project</button>
                <Button label="Cancel" variant="secondary" onclick={() => navigate("projects")} />
              </div>
            </form>
          {:else if state === "ready"}
            <div class="success-state" id="project-ready">
              <p class="success-state__mark">Scenario complete</p>
              <h3>Launch workspace is ready.</h3>
              <p>The interface changed pathname twice. Scenema stayed with the same sequence.</p>
              <Button label="Run it again" variant="secondary" onclick={reset} />
            </div>
          {:else}
            <div class="workspace-header">
              <h3>Projects</h3>
              <button class="button" id="create-project" type="button" onclick={() => navigate("new")}>Create project</button>
            </div>
            <div class="project-list" id="project-list">
              <div class="project-row"><div><strong>Website refresh</strong><span>Design and engineering</span></div><span>12 members</span></div>
              <div class="project-row"><div><strong>Research library</strong><span>Customer insights</span></div><span>6 members</span></div>
            </div>
          {/if}
        </div>
      </div>

      <aside class="demo-rail" aria-label="30-second demo steps">
        <div class="demo-rail__heading"><strong>Step {activeIndex + 1} of 3</strong></div>
        <ol>
          {#each steps as step, index}
            <li data-state={index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending"}>
              <strong>{step.title}</strong>
            </li>
          {/each}
        </ol>
      </aside>
    </div>
  </div>
  <p class="status-line" data-state={statusState} role="status" aria-live="polite">{status}</p>
</section>
