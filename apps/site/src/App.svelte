<script lang="ts">
  import Button from "./lib/Button.svelte";
  import DemoStage from "./lib/DemoStage.svelte";
  import Header from "./lib/Header.svelte";

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  let demoStage: DemoStage | undefined = undefined;

  function startDemo(event?: MouseEvent): void {
    event?.preventDefault();
    document.querySelector("#live-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    void demoStage?.start();
  }

  function sitePath(path: string): string {
    if (!basePrefix) return path;
    return path === "/" ? `${basePrefix}/` : `${basePrefix}${path}`;
  }
</script>

<svelte:head>
  <title>Scenema — Guide people through your real product</title>
  <meta name="description" content="Scenema performs real clicks, typing, and navigation—one user-paced step at a time." />
  <meta name="theme-color" content="#f3f1eb" />
</svelte:head>

<Header onStart={startDemo} assetPath={sitePath("/assets/scenema-symbol.png")} homePath={sitePath("/")} />

<main id="main">
  <section class="hero container" aria-labelledby="hero-title">
    <div class="hero__copy">
      <h1 id="hero-title">Guide people through your real product.</h1>
      <p>Scenema performs real clicks, typing, and navigation—one user-paced step at a time.</p>
      <div class="hero__actions">
        <Button label="Start the 30-second demo" href="#live-demo" onclick={startDemo} />
        <a class="text-link" href="#scenario-code">See the scenario code <span aria-hidden="true">↓</span></a>
      </div>
    </div>
    <p class="hero__note"><span>Open source TypeScript</span><span>SPA + page reload recovery</span><span>Framework-agnostic DOM runtime</span></p>
  </section>

  <DemoStage bind:this={demoStage} />

  <section class="evidence-section container" aria-labelledby="evidence-title">
    <div class="section-heading">
      <p class="meta">What just happened</p>
      <h2 id="evidence-title">A guide that acts on the product, not around it.</h2>
    </div>
    <div class="evidence-list">
      <article><span>01</span><h3>You chose when to continue.</h3><p>Every step waited for your intent.</p></article>
      <article><span>02</span><h3>Scenema clicked and typed.</h3><p>The actions ran against real DOM targets.</p></article>
      <article><span>03</span><h3>The same scenario survived navigation.</h3><p>The pathname changed while progress continued.</p></article>
    </div>
  </section>

  <section class="code-section" id="scenario-code" aria-labelledby="code-title">
    <div class="container code-section__grid">
      <div class="section-heading">
        <p class="meta">The scenario behind the demo</p>
        <h2 id="code-title">Interface states become a sequence.</h2>
        <p>Match each route, point to a stable target, and define the action. The runtime checkpoints progress before navigation begins.</p>
        <a class="text-link" href="https://github.com/syi0808/scenema#readme">Read the documentation <span aria-hidden="true">→</span></a>
      </div>
      <div class="code-panel" aria-label="Scenario TypeScript example">
        <div class="code-panel__bar"><span>create-project.ts</span><span>TypeScript</span></div>
        <pre><code><span class="code-muted">// The scene matches the real interface.</span>
<span class="code-key">defineScenario</span>(&#123;
  id: <span class="code-string">"create-project"</span>,
  scenes: [&#123;
    id: <span class="code-string">"projects"</span>,
    match: &#123;
      pathname: <span class="code-string">"/try/projects"</span>,
      visible: <span class="code-string">"#project-list"</span>
    &#125;,
    steps: [&#123;
      target: <span class="code-string">"#create-project"</span>,
      transition: &#123;
        trigger: &#123; click: <span class="code-key">true</span> &#125;,
        to: <span class="code-string">"project-create"</span>
      &#125;
    &#125;]
  &#125;]
&#125;)</code></pre>
      </div>
    </div>
  </section>

  <section class="final-callout container" aria-labelledby="final-title">
    <div><p class="meta">Start with one flow</p><h2 id="final-title">Add your first scenario.</h2></div>
    <div class="install-block"><code>pnpm add scenema</code><Button label="View on GitHub" href="https://github.com/syi0808/scenema" variant="secondary" /></div>
  </section>
</main>
