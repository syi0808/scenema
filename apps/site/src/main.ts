import { createTourPresenter } from "@scenema/presenter";
import { createScenema, defineScenario, type Scenema } from "scenema";

import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
let demoRuntime: Scenema | null = null;
const themeKey = "scenema:theme";

applySavedTheme();

const demoScenario = defineScenario({
  id: "create-project-demo",
  version: 1,
  scenes: [
    {
      id: "projects",
      match: { pathname: sitePath("/demo/projects"), visible: "#project-list" },
      steps: [
        {
          id: "create-project",
          target: "#create-project",
          enter: { cursor: "move" },
          present: {
            title: "Create your first project",
            description: "You set the pace. Select Next when you’re ready.",
          },
          transition: { trigger: { click: true }, to: "project-create" },
        },
      ],
    },
    {
      id: "project-create",
      match: { pathname: sitePath("/demo/projects/new"), visible: "#project-form" },
      steps: [
        {
          id: "project-name",
          target: "#project-name",
          enter: { cursor: "move" },
          present: { title: "Give the project a name" },
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
        pathname: sitePath("/demo/projects/launch-workspace"),
        visible: "#project-ready",
      },
      steps: [
        {
          id: "complete",
          present: {
            title: "The scenario stayed with you",
            description: "The route changed twice. The same scenario continued.",
          },
        },
      ],
    },
  ],
});

function renderLanding(): void {
  document.title = "Scenema — Direct the real product";
  app.innerHTML = `
    <header class="site-header">
      <div class="shell site-header__inner">
        <a class="wordmark" href="${sitePath("/")}" data-route aria-label="Scenema home"><span aria-hidden="true">S/</span> Scenema</a>
        <nav class="site-nav" aria-label="Primary navigation">
          <a href="#model">The model</a>
          <a href="#protocol">Protocol</a>
          <button class="theme-toggle" type="button" data-theme-toggle>Dark mode</button>
          <a class="button button--small" href="${sitePath("/demo/projects")}" data-route>Run live scenario</a>
        </nav>
      </div>
    </header>
    <main id="main">
      <section class="hero shell" aria-labelledby="hero-title">
        <div class="hero__copy">
          <p class="overline"><span>Product choreography</span><span>Web runtime</span></p>
          <h1 id="hero-title">Direct the<br><em>real</em> product.</h1>
          <p class="hero__lead">Scenema turns live interfaces into guided sequences. Your user calls the next scene. Scenema moves, types, clicks, and keeps the story intact across navigation.</p>
          <div class="hero__actions">
            <a class="button" href="${sitePath("/demo/projects")}" data-route>Run the live scenario <span aria-hidden="true">→</span></a>
            <a class="text-link" href="#model">Understand the model</a>
          </div>
        </div>
        <div class="sequence" aria-label="Example scenario sequence">
          <div class="sequence__head"><span>Scenario / create-project</span><span>3 scenes</span></div>
          <ol>
            <li class="is-active"><span class="sequence__index">01</span><div><strong>Projects</strong><code>/projects</code></div><span class="sequence__state">Current</span></li>
            <li><span class="sequence__index">02</span><div><strong>Name project</strong><code>/projects/new</code></div><span class="sequence__action">Type</span></li>
            <li><span class="sequence__index">03</span><div><strong>Project ready</strong><code>/projects/:slug</code></div><span class="sequence__action">Arrive</span></li>
          </ol>
          <div class="sequence__foot"><span>User: proceed</span><span>Scenema: perform →</span></div>
        </div>
      </section>

      <section class="statement" id="model">
        <div class="shell statement__grid">
          <p class="section-index">01 / The model</p>
          <div class="statement__body">
            <h2>Not a tour painted<br>over your interface.</h2>
            <p>Scenema understands the interface itself. Each Scene matches a real route and visible state. Each Step acts on a real DOM target.</p>
          </div>
          <div class="model-lines">
            <div><span>01</span><strong>People choose when.</strong><p>Every Step waits. Nothing races ahead of the person watching.</p></div>
            <div><span>02</span><strong>Scenema performs how.</strong><p>Pointer, click, and type actions run against the live product.</p></div>
            <div><span>03</span><strong>State survives the cut.</strong><p>Checkpoints restore the right Scene after SPA or full-page navigation.</p></div>
          </div>
        </div>
      </section>

      <section class="protocol-section" id="protocol">
        <div class="shell">
          <div class="protocol-heading">
            <p class="section-index">02 / Runtime protocol</p>
            <h2>One sequence.<br>Every navigation model.</h2>
            <p>SPA runtimes continue. MPA runtimes restart. The protocol stays the same, so the scenario remains portable.</p>
          </div>
          <ol class="protocol" aria-label="Scenema runtime protocol">
            <li><span>01</span><strong>Present</strong><small>Show the current Step</small></li>
            <li><span>02</span><strong>Proceed</strong><small>Wait for user intent</small></li>
            <li><span>03</span><strong>Checkpoint</strong><small>Persist before action</small></li>
            <li><span>04</span><strong>Perform</strong><small>Act on the product</small></li>
            <li><span>05</span><strong>Reconcile</strong><small>Resolve the next Scene</small></li>
          </ol>
        </div>
      </section>

      <section class="definition-section">
        <div class="shell definition-grid">
          <div class="definition-copy">
            <p class="section-index">03 / Define once</p>
            <h2>The route is part of the script.</h2>
            <p>Define stable UI states, targets, and transitions. Scenema handles the document lifetime underneath.</p>
            <a class="text-link" href="${sitePath("/demo/projects")}" data-route>See this scenario run →</a>
          </div>
          <div class="code-window" aria-label="Scenario TypeScript example">
            <div class="code-window__bar"><span>create-project.ts</span><span>TypeScript</span></div>
            <pre><code><span class="code-key">defineScenario</span>({
  id: <span class="code-string">"create-project"</span>,
  scenes: [{
    id: <span class="code-string">"projects"</span>,
    match: { pathname: <span class="code-string">"/projects"</span> },
    steps: [{
      target: <span class="code-string">"#create-project"</span>,
      transition: {
        trigger: { click: <span class="code-key">true</span> },
        to: <span class="code-string">"project-create"</span>
      }
    }]
  }]
})</code></pre>
          </div>
        </div>
      </section>

      <section class="final-section">
        <div class="shell final-cta">
          <div><p class="section-index">Next scene</p><h2>Watch the interface<br>tell the story.</h2></div>
          <a class="button button--light" href="${sitePath("/demo/projects")}" data-route>Run the live scenario <span aria-hidden="true">→</span></a>
        </div>
      </section>
    </main>
    <footer class="shell site-footer"><span><strong>Scenema</strong> / Product choreography runtime</span><span>Persist → Perform → Reconcile</span></footer>`;
  bindThemeToggle();
}

function renderDemoShell(): void {
  document.title = "Live demo — Scenema";
  app.innerHTML = `
    <div class="demo-page">
      <header class="demo-header">
        <div class="shell demo-header__inner">
          <a class="wordmark" href="${sitePath("/")}" data-route aria-label="Scenema home"><span aria-hidden="true">S/</span> Scenema</a>
          <span class="demo-header__label">Live scenario / Create project</span>
          <div class="demo-header__actions">
            <button class="text-button" id="reset-demo" type="button">Reset demo</button>
            <button class="theme-toggle" type="button" data-theme-toggle>Dark mode</button>
            <a class="button button--small button--secondary" href="${sitePath("/")}" data-route>Exit</a>
          </div>
        </div>
      </header>
      <main id="main" class="demo-layout">
        <aside class="demo-sidebar"><span class="demo-sidebar__label">Demo application</span><strong>Northstar</strong><nav aria-label="Demo workspace"><a href="${sitePath("/demo/projects")}" data-demo-route aria-current="page">Projects <span>02</span></a></nav></aside>
        <section class="demo-workspace" id="demo-workspace"></section>
      </main>
      <div class="demo-status" role="status" aria-live="polite"><span>Status</span><p id="demo-status">Loading demo…</p></div>
    </div>`;
  bindThemeToggle();
  document.querySelector("#reset-demo")?.addEventListener("click", resetDemo);
  document.querySelector("[data-demo-route]")?.addEventListener("click", (event) => {
    event.preventDefault();
    navigateDemo("/demo/projects");
  });
  renderDemoContent();
}

function renderDemoContent(): void {
  const workspace = document.querySelector<HTMLElement>("#demo-workspace");
  if (!workspace) return;
  if (routePath() === "/demo/projects/new") {
    workspace.innerHTML = `
      <div class="workspace-header"><div><span class="workspace-kicker">Projects / New</span><h1>New project</h1></div></div>
      <form class="form" id="project-form" novalidate>
        <div class="field"><label for="project-name">Project name</label><input id="project-name" name="name" autocomplete="off" aria-describedby="name-help name-error"><small id="name-help">Use a name your team will recognize.</small></div>
        <p class="field-error" id="name-error" role="alert"></p>
        <div class="form-actions"><button class="button" id="submit-project" type="submit">Create project</button><button class="button button--secondary" id="cancel-project" type="button">Cancel</button></div>
      </form>`;
    const form = document.querySelector<HTMLFormElement>("#project-form")!;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>("#project-name")!;
      const error = document.querySelector<HTMLElement>("#name-error")!;
      if (!input.value.trim()) {
        input.setAttribute("aria-invalid", "true");
        error.textContent = "Enter a project name to continue.";
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      error.textContent = "";
      navigateDemo("/demo/projects/launch-workspace");
    });
    document
      .querySelector("#cancel-project")
      ?.addEventListener("click", () => navigateDemo("/demo/projects"));
    return;
  }
  if (routePath() === "/demo/projects/launch-workspace") {
    workspace.innerHTML = `
      <div class="success-state" id="project-ready"><p class="success-state__mark">Scenario complete</p><h1>Launch workspace<br>is ready.</h1><p>The interface changed routes twice. Scenema stayed with the same sequence.</p><button class="button button--secondary" id="return-projects" type="button">Return to projects</button></div>`;
    document.querySelector("#return-projects")?.addEventListener("click", resetDemo);
    return;
  }
  workspace.innerHTML = `
    <div class="workspace-header"><div><span class="workspace-kicker">Workspace / 02 projects</span><h1>Projects</h1></div><button class="button" id="create-project" type="button">Create project</button></div>
    <div class="project-list" id="project-list"><div class="project-row"><div><strong>Website refresh</strong><span>Design and engineering</span></div><span>12 members</span></div><div class="project-row"><div><strong>Research library</strong><span>Customer insights</span></div><span>6 members</span></div></div>`;
  document
    .querySelector("#create-project")
    ?.addEventListener("click", () => navigateDemo("/demo/projects/new"));
}

async function initializeDemo(): Promise<void> {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  demoRuntime = createScenema({
    scenarios: [demoScenario],
    actorble: {
      feedback: "cursor",
      motion: !reduceMotion,
      ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
    },
    presenter: createTourPresenter({ document }),
    onError(error) {
      setDemoStatus(`${error.message} Reset the demo and try again.`, true);
    },
  });
  const restored = await demoRuntime.bootstrap();
  if (restored) {
    setDemoStatus("Your guided demo resumed.");
    return;
  }
  setDemoStatus("Demo ready. Start when you choose.");
  addStartTourButton();
}

function navigateDemo(path: string): void {
  history.pushState(null, "", sitePath(path));
  renderDemoContent();
  if (demoRuntime?.inspect().session) {
    queueMicrotask(() => void demoRuntime?.reconcile().catch(() => undefined));
  }
}

function resetDemo(): void {
  demoRuntime?.stop();
  history.replaceState(null, "", sitePath("/demo/projects"));
  renderDemoContent();
  setDemoStatus("Demo reset. Start again when you choose.");
  addStartTourButton();
}

function addStartTourButton(): void {
  if (document.querySelector("#start-tour")) return;
  const startTour = document.createElement("button");
  startTour.type = "button";
  startTour.className = "button button--small";
  startTour.id = "start-tour";
  startTour.textContent = "Start guided demo";
  document.querySelector(".demo-header__actions")?.prepend(startTour);
  startTour.addEventListener("click", async () => {
    startTour.disabled = true;
    startTour.textContent = "Starting…";
    setDemoStatus("Starting guided demo…");
    try {
      await demoRuntime?.start(demoScenario);
      startTour.remove();
    } catch {
      startTour.disabled = false;
      startTour.textContent = "Start guided demo";
    }
  });
}

function setDemoStatus(message: string, error = false): void {
  const status = document.querySelector<HTMLElement>("#demo-status");
  if (!status) return;
  status.textContent = message;
  status.style.color = error ? "var(--danger)" : "";
}

function applySavedTheme(): void {
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.dataset.theme = savedTheme;
  }
}

function activeTheme(): "light" | "dark" {
  const selectedTheme = document.documentElement.dataset.theme;
  if (selectedTheme === "light" || selectedTheme === "dark") return selectedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function bindThemeToggle(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]");
  const updateLabels = (): void => {
    const nextTheme = activeTheme() === "dark" ? "Light" : "Dark";
    buttons.forEach((button) => {
      button.textContent = `${nextTheme} mode`;
      button.setAttribute("aria-label", `Switch to ${nextTheme.toLowerCase()} mode`);
    });
  };
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = activeTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem(themeKey, nextTheme);
      updateLabels();
    });
  });
  updateLabels();
}

function route(): void {
  const pathname = routePath();
  const isDemo = pathname.startsWith("/demo");
  if (isDemo) {
    if (pathname === "/demo" || pathname === "/demo/")
      history.replaceState(null, "", sitePath("/demo/projects"));
    if (demoRuntime) {
      renderDemoContent();
      if (demoRuntime.inspect().session) {
        queueMicrotask(() => void demoRuntime?.reconcile().catch(() => undefined));
      }
      return;
    }
    renderDemoShell();
    void initializeDemo();
    return;
  }
  demoRuntime?.stop();
  demoRuntime?.dispose();
  demoRuntime = null;
  renderLanding();
}

document.addEventListener("click", (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-route]");
  if (!link || link.origin !== location.origin) return;
  event.preventDefault();
  if (!routePath(link.pathname).startsWith("/demo") && demoRuntime) {
    demoRuntime.stop();
    demoRuntime.dispose();
    demoRuntime = null;
  }
  history.pushState(null, "", link.pathname);
  route();
  window.scrollTo(0, 0);
});
window.addEventListener("popstate", route);

function sitePath(path: string): string {
  if (!basePrefix) return path;
  return path === "/" ? `${basePrefix}/` : `${basePrefix}${path}`;
}

function routePath(path = location.pathname): string {
  if (!basePrefix) return path;
  if (path === basePrefix || path === `${basePrefix}/`) return "/";
  return path.startsWith(`${basePrefix}/`) ? path.slice(basePrefix.length) : path;
}

route();
