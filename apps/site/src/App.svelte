<script lang="ts">
  import { onMount, tick } from "svelte";

  import Button from "./lib/Button.svelte";
  import CodeShowcase from "./lib/CodeShowcase.svelte";
  import Examples from "./lib/Examples.svelte";
  import Header from "./lib/Header.svelte";
  import Hero from "./lib/Hero.svelte";
  import LandingDemo from "./lib/LandingDemo.svelte";
  import { exampleById, exampleFromPath, isExamplePath, type ExampleId } from "./lib/examples";

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  let landingDemo: LandingDemo | undefined = undefined;
  let selected = $state<ExampleId>(exampleFromPath(routePath()));
  let clickCount = $state(0);
  let typeValue = $state("");
  let starting = $state(false);
  let completed = $state(false);

  onMount(() => {
    if (!isExamplePath(routePath())) history.replaceState(null, "", sitePath("/"));
    const handlePopState = () => {
      selected = exampleFromPath(routePath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  });

  function startDemo(event?: MouseEvent): void {
    event?.preventDefault();
    void landingDemo?.start();
  }

  function selectExample(next: ExampleId): void {
    selected = next;
    history.pushState(null, "", sitePath(exampleById(next).path));
  }

  function selectExampleForDemo(next: ExampleId): void {
    selected = next;
  }

  function navigateExample(): void {
    selected = "navigation";
    history.pushState(null, "", sitePath("/examples/navigation"));
  }

  async function prepareDemo(): Promise<void> {
    selected = "highlight";
    clickCount = 0;
    typeValue = "";
    completed = false;
    history.replaceState(null, "", sitePath("/"));
    await tick();
  }

  function updateRunning(_running: boolean, nextStarting: boolean): void {
    starting = nextStarting;
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

<svelte:head>
  <title>Scenema — Guide people through your real product</title>
  <meta name="description" content="Scenema performs real clicks, typing, and navigation—one user-paced step at a time." />
  <meta name="theme-color" content="#f8fafc" />
</svelte:head>

<Header onStart={startDemo} assetPath={sitePath("/assets/scenema-symbol.png")} homePath={sitePath("/")} />

<main id="main">
  <Hero onStart={startDemo} {starting} {completed} />
  <LandingDemo
    bind:this={landingDemo}
    onPrepare={prepareDemo}
    onSelectExample={selectExampleForDemo}
    onRunningChange={updateRunning}
    onCompleted={() => (completed = true)}
  />

  <div class="feature-strip" role="group" aria-label="Scenema capabilities">
    <div class="container">
      <span>Real clicks</span><span>Real typing</span><span>Route-aware</span><span>User-paced</span>
    </div>
  </div>

  <Examples
    {selected}
    {clickCount}
    {typeValue}
    onSelect={selectExample}
    onClick={() => (clickCount += 1)}
    onType={(value) => (typeValue = value)}
    onNavigate={navigateExample}
  />

  <CodeShowcase {selected} onSelect={selectExample} />

  <section class="final-callout container" aria-labelledby="final-title">
    <div>
      <p class="eyebrow">Start with one sequence</p>
      <h2 id="final-title">Guide the next action in your product.</h2>
    </div>
    <div class="install-block">
      <code>pnpm add scenema</code>
      <Button label="Get started" href="https://github.com/syi0808/scenema#readme" />
      <Button label="View on GitHub" href="https://github.com/syi0808/scenema" variant="secondary" />
    </div>
  </section>
</main>
