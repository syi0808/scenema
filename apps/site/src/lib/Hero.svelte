<script lang="ts">
  import { createScenemaActorble } from "scenema";
  import { onMount } from "svelte";

  import Button from "./Button.svelte";
  import HeroProductDemo from "./HeroProductDemo.svelte";

  let {
    assetPath,
    onStart,
    embedded = false,
  }: { assetPath: string; onStart: (event?: MouseEvent) => void; embedded?: boolean } = $props();

  let cursor: ReturnType<typeof createScenemaActorble> | undefined;

  onMount(() => destroyActorbleCursor);

  export function acquireActorble(): ReturnType<typeof createScenemaActorble> {
    cursor ??= createCursor();
    return cursor;
  }

  export function destroyActorbleCursor(): void {
    cursor?.destroy();
    cursor = undefined;
  }

  function createCursor(): ReturnType<typeof createScenemaActorble> {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return createScenemaActorble(document, {
      feedback: embedded ? { cursor: { label: "Scenema" } } : "cursor",
      motion: !reduceMotion,
      ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
    });
  }
</script>

<section class="hero" id="hero-demo" aria-labelledby="hero-title">
  <div class="container hero__grid">
    <div class="hero__copy" id="hero-copy">
      <h1 id="hero-title">Scenema</h1>
      <p class="hero__lead">Guide people through real product flows.</p>
      <p class="hero__description">
        Connect user-paced guidance, real DOM actions, and page navigation in one declarative
        scenario.
      </p>
      <div class="hero__actions" role="group" aria-label="Scenema actions">
        <Button id="start-tour" label="Show demo" href="#examples" onclick={onStart} />
        <Button label="Get started" href="#get-started" variant="secondary" />
      </div>
    </div>

    {#if embedded}
      <img class="hero__symbol" src={assetPath} alt="" width="420" height="420" />
    {:else}
      <HeroProductDemo />
    {/if}
  </div>
</section>

<style>
  .hero__symbol {
    width: min(100%, 420px);
    height: auto;
    justify-self: end;
  }

  @media (max-width: 900px) {
    .hero__symbol {
      width: min(58vw, 320px);
      justify-self: start;
    }
  }
</style>
