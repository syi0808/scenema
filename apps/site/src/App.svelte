<script lang="ts">
  import CodeShowcase from "./lib/CodeShowcase.svelte";
  import Examples from "./lib/Examples.svelte";
  import Footer from "./lib/Footer.svelte";
  import GettingStarted from "./lib/GettingStarted.svelte";
  import Header from "./lib/Header.svelte";
  import Hero from "./lib/Hero.svelte";
  import LandingDemo from "./lib/LandingDemo.svelte";
  import type { CodeExampleId, DemoId } from "./lib/examples";

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  let landingDemo: LandingDemo | undefined = undefined;
  let hero: Hero | undefined = undefined;
  let selectedCode = $state<CodeExampleId>("product-tour");

  function runDemo(id: DemoId, event?: MouseEvent): void {
    event?.preventDefault();
    hero?.handoffAmbientCursor();
    void landingDemo?.start(id);
  }

  function acquireActorble(): ReturnType<Hero["acquireActorble"]> {
    if (!hero) throw new Error("The landing Actorble instance is not ready.");
    return hero.acquireActorble();
  }

  function prepareDemo(id: DemoId): void {
    if (id !== "single-highlight") selectedCode = "product-tour";
  }

  function sitePath(path: string): string {
    if (!basePrefix) return path;
    return path === "/" ? `${basePrefix}/` : `${basePrefix}${path}`;
  }
</script>

<svelte:head>
  <title>Scenema — Declarative choreography for real web applications</title>
  <meta
    name="description"
    content="Scenema connects user-paced guidance, real DOM actions, and page navigation in one declarative scenario."
  />
  <meta name="theme-color" content="#f8fafc" />
</svelte:head>

<Header assetPath={sitePath("/assets/scenema-symbol.png")} homePath={sitePath("/")} />

<main id="main">
  <Hero
    bind:this={hero}
    assetPath={sitePath("/assets/scenema-symbol.png")}
    onStart={(event) => runDemo("page-tour", event)}
  />
  <Examples onRun={runDemo} />
  <CodeShowcase selected={selectedCode} onSelect={(id) => (selectedCode = id)} />
  <GettingStarted />
</main>

<Footer />

<LandingDemo
  bind:this={landingDemo}
  {acquireActorble}
  onPrepare={prepareDemo}
  onCursorRelease={() => hero?.destroyActorbleCursor()}
/>
