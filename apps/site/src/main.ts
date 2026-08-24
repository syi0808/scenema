import { createTourPresenter } from "@scenema/presenter";
import { createScenema, defineScenario, type Actor, type Scenema } from "scenema";

import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
let demoRuntime: Scenema | null = null;

const demoScenario = defineScenario({
  id: "create-project-demo",
  version: 1,
  scenes: [
    {
      id: "projects",
      match: { pathname: "/demo/projects", visible: "#project-list" },
      steps: [{
        id: "create-project",
        target: "#create-project",
        enter: { cursor: "move" },
        present: {
          title: "Create your first project",
          description: "You set the pace. Select Next when you’re ready.",
        },
        transition: { trigger: { click: true }, to: "project-create" },
      }],
    },
    {
      id: "project-create",
      match: { pathname: "/demo/projects/new", visible: "#project-form" },
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
      match: { pathname: "/demo/projects/launch-workspace", visible: "#project-ready" },
      steps: [{
        id: "complete",
        present: {
          title: "The scenario stayed with you",
          description: "The route changed twice. The same scenario continued.",
        },
      }],
    },
  ],
});

class DemoActor implements Actor {
  private readonly cursor: HTMLElement;
  private readonly reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor() {
    this.cursor = document.querySelector<HTMLElement>("#actor-cursor")!;
  }

  async moveTo(target: string): Promise<void> {
    const element = this.resolve(target);
    element.scrollIntoView({ block: "center", behavior: this.reduceMotion ? "auto" : "smooth" });
    await nextFrame();
    const rect = element.getBoundingClientRect();
    this.cursor.style.setProperty("--cursor-x", `${rect.left + rect.width / 2}px`);
    this.cursor.style.setProperty("--cursor-y", `${rect.top + rect.height / 2}px`);
    this.cursor.dataset.visible = "true";
    setDemoStatus(`Cursor moved to ${accessibleName(element)}.`);
    if (!this.reduceMotion) await delay(540);
  }

  async click(target: string): Promise<void> {
    await this.moveTo(target);
    const element = this.resolve(target);
    this.cursor.dataset.clicking = "true";
    element.click();
    setDemoStatus(`${accessibleName(element)} selected.`);
    await delay(this.reduceMotion ? 0 : 120);
    delete this.cursor.dataset.clicking;
  }

  async type(target: string, value: string): Promise<void> {
    const element = this.resolve(target);
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
      throw new TypeError(`${target} does not accept text.`);
    }
    element.focus();
    element.value = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    setDemoStatus(`Entered “${value}”.`);
  }

  private resolve(target: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) throw new Error(`Demo target not found: ${target}`);
    return element;
  }
}

function renderLanding(): void {
  document.title = "Scenema — Choreography for real products";
  app.innerHTML = `
    <header class="site-header">
      <div class="shell site-header__inner">
        <a class="wordmark" href="/" data-route>Scenema</a>
        <nav class="site-nav" aria-label="Primary navigation">
          <a href="#principles">Principles</a>
          <a href="#architecture">Architecture</a>
          <a class="button button--small" href="/demo/projects" data-route>Run the demo</a>
        </nav>
      </div>
    </header>
    <main id="main">
      <section class="shell hero">
        <div class="hero__copy">
          <p class="eyebrow">Product choreography runtime</p>
          <h1>Guide people through the real product.</h1>
          <p class="hero__lead">Scenema runs declarative product tours on your application. People choose when to continue; Scenema moves, clicks, types, and survives navigation.</p>
          <div class="hero__actions">
            <a class="button" href="/demo/projects" data-route>Run the live demo</a>
            <a class="button button--secondary" href="#architecture">See how it works</a>
          </div>
        </div>
        <div class="code-window" aria-label="Scenario code example">
          <div class="code-window__bar"><span>onboarding.ts</span><span>same DSL · SPA + MPA</span></div>
          <pre><code><span class="code-key">defineScenario</span>({
  id: <span class="code-string">"create-project"</span>,
  scenes: [{
    id: <span class="code-string">"projects"</span>,
    match: {
      pathname: <span class="code-string">"/projects"</span>,
      visible: <span class="code-string">"#project-list"</span>
    },
    steps: [{
      target: <span class="code-string">"#create-project"</span>,
      present: { title: <span class="code-string">"Create a project"</span> },
      transition: {
        trigger: { click: <span class="code-key">true</span> },
        to: <span class="code-string">"project-create"</span>
      }
    }]
  }]
});</code></pre>
        </div>
      </section>

      <section class="section" id="principles">
        <div class="shell">
          <div class="section-heading">
            <h2>The user controls the pace. Scenema controls the choreography.</h2>
            <p>A scenario is not a recording. It understands stable UI states and performs real interactions only after the user proceeds.</p>
          </div>
          <div class="principles">
            <article class="principle"><span class="principle__number">01</span><h3>Real interactions</h3><p>Move, click, and type against actual DOM targets. The product behaves exactly as it does for a person.</p></article>
            <article class="principle"><span class="principle__number">02</span><h3>Navigation is explicit</h3><p>Transitions name their destination Scene. Router choice and document lifetime stay outside the scenario.</p></article>
            <article class="principle"><span class="principle__number">03</span><h3>Progress survives</h3><p>Checkpoint before action. Resume from the same logical state after route changes, reloads, or full navigation.</p></article>
          </div>
        </div>
      </section>

      <section class="section" id="architecture">
        <div class="shell">
          <div class="section-heading">
            <h2>One protocol across every page.</h2>
            <p>SPA runtimes survive. MPA runtimes restart. Both follow the same sequence, so scenario definitions stay portable.</p>
          </div>
          <div class="protocol" aria-label="Scenema runtime protocol">
            <div class="protocol__step"><span>01</span><strong>Present</strong></div>
            <div class="protocol__step"><span>02</span><strong>Proceed</strong></div>
            <div class="protocol__step"><span>03</span><strong>Checkpoint</strong></div>
            <div class="protocol__step"><span>04</span><strong>Perform</strong></div>
            <div class="protocol__step"><span>05</span><strong>Reconcile</strong></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="shell final-cta">
          <h2>See the runtime act on a real interface.</h2>
          <a class="button" href="/demo/projects" data-route>Start the guided demo</a>
        </div>
      </section>
    </main>
    <footer class="shell site-footer"><span>Scenema</span><span>Declarative scenarios for real web applications.</span></footer>`;
}

function renderDemoShell(): void {
  document.title = "Live demo — Scenema";
  app.innerHTML = `
    <div class="demo-page">
      <header class="demo-header">
        <div class="shell demo-header__inner">
          <a class="wordmark" href="/" data-route>Scenema</a>
          <span class="demo-header__label">Live product demo</span>
          <div class="demo-header__actions">
            <button class="text-button" id="reset-demo" type="button">Reset demo</button>
            <a class="button button--small button--secondary" href="/" data-route>Exit demo</a>
          </div>
        </div>
      </header>
      <main id="main" class="demo-layout">
        <aside class="demo-sidebar"><strong>Northstar</strong><nav aria-label="Demo workspace"><a href="/demo/projects" data-demo-route aria-current="page">Projects</a></nav></aside>
        <section class="demo-workspace" id="demo-workspace"></section>
      </main>
      <p class="demo-status" id="demo-status" aria-live="polite">Loading demo…</p>
      <div class="actor-cursor" id="actor-cursor" aria-hidden="true"></div>
    </div>`;
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
  if (location.pathname === "/demo/projects/new") {
    workspace.innerHTML = `
      <div class="workspace-header"><div><h1>New project</h1><p>Create a workspace for a new initiative.</p></div></div>
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
    document.querySelector("#cancel-project")?.addEventListener("click", () => navigateDemo("/demo/projects"));
    return;
  }
  if (location.pathname === "/demo/projects/launch-workspace") {
    workspace.innerHTML = `
      <div class="success-state" id="project-ready"><div class="success-state__mark" aria-hidden="true">✓</div><h1>Launch workspace is ready.</h1><p>The project was created through real DOM interactions while the scenario followed each route change.</p><button class="button button--secondary" id="return-projects" type="button">Return to projects</button></div>`;
    document.querySelector("#return-projects")?.addEventListener("click", resetDemo);
    return;
  }
  workspace.innerHTML = `
    <div class="workspace-header"><div><h1>Projects</h1><p>Workspaces your team can access.</p></div><button class="button" id="create-project" type="button">Create project</button></div>
    <div class="project-list" id="project-list"><div class="project-row"><div><strong>Website refresh</strong><span>Design and engineering</span></div><span>12 members</span></div><div class="project-row"><div><strong>Research library</strong><span>Customer insights</span></div><span>6 members</span></div></div>`;
  document.querySelector("#create-project")?.addEventListener("click", () => navigateDemo("/demo/projects/new"));
}

async function initializeDemo(): Promise<void> {
  demoRuntime = createScenema({
    scenarios: [demoScenario],
    actor: new DemoActor(),
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
  history.pushState(null, "", path);
  renderDemoContent();
  if (demoRuntime?.inspect().session) queueMicrotask(() => void demoRuntime?.reconcile());
}

function resetDemo(): void {
  demoRuntime?.stop();
  history.replaceState(null, "", "/demo/projects");
  renderDemoContent();
  document.querySelector("#actor-cursor")?.setAttribute("data-visible", "false");
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

function route(): void {
  const isDemo = location.pathname.startsWith("/demo");
  if (isDemo) {
    if (location.pathname === "/demo" || location.pathname === "/demo/") history.replaceState(null, "", "/demo/projects");
    if (demoRuntime) {
      renderDemoContent();
      if (demoRuntime.inspect().session) queueMicrotask(() => void demoRuntime?.reconcile());
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
  if (!link.pathname.startsWith("/demo") && demoRuntime) {
    demoRuntime.stop();
    demoRuntime.dispose();
    demoRuntime = null;
  }
  history.pushState(null, "", link.pathname);
  route();
  window.scrollTo(0, 0);
});
window.addEventListener("popstate", route);

function accessibleName(element: HTMLElement): string {
  return element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.id;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

route();
