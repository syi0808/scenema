<script lang="ts">
  import { createScenemaActorble } from "scenema";
  import { onMount } from "svelte";

  import Button from "./Button.svelte";

  let {
    assetPath,
    onStart,
  }: { assetPath: string; onStart: (event?: MouseEvent) => void } = $props();

  let cursor: ReturnType<typeof createScenemaActorble> | undefined;
  let ambientActive = false;
  let removeScrollListener = () => {};

  onMount(() => {
    if (window.matchMedia("(max-width: 700px), (prefers-reduced-motion: reduce)").matches)
      return destroyActorbleCursor;
    const lead = document.querySelector<HTMLElement>("[data-hero-selection]");
    const startButton = document.querySelector<HTMLElement>("#start-tour");
    if (!lead || !startButton) return destroyActorbleCursor;

    cursor = createCursor(true);
    ambientActive = true;
    const stopOnScroll = () => {
      if (window.scrollY > 48) destroyActorbleCursor();
    };
    window.addEventListener("scroll", stopOnScroll, { passive: true });
    removeScrollListener = () => window.removeEventListener("scroll", stopOnScroll);
    void animateCursor(lead, startButton);

    return destroyActorbleCursor;
  });

  export function acquireActorble(): ReturnType<typeof createScenemaActorble> {
    cursor ??= createCursor(false);
    return cursor;
  }

  export function handoffAmbientCursor(): void {
    ambientActive = false;
    removeScrollListener();
    removeScrollListener = () => {};
    window.getSelection()?.removeAllRanges();
  }

  export function destroyActorbleCursor(): void {
    handoffAmbientCursor();
    cursor?.destroy();
    cursor = undefined;
  }

  async function animateCursor(lead: Element, startButton: Element): Promise<void> {
    await pause(850);
    try {
      if (!ambientActive || !cursor) return;
      await cursor.selectText(lead, { duration: 1_200 });
      if (!ambientActive) return;
      await pause(650);
      if (!ambientActive || !cursor) return;
      await cursor.moveTo(startButton, { duration: 850 });
    } catch {
      if (ambientActive) destroyActorbleCursor();
    }
  }

  function createCursor(ambient: boolean): ReturnType<typeof createScenemaActorble> {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return createScenemaActorble(document, {
      feedback: "cursor",
      motion: !reduceMotion,
      ...(ambient
        ? {
            pointer: {
              initialPosition: {
                x: window.innerWidth * 0.76,
                y: Math.min(window.innerHeight * 0.56, 520),
              },
            },
          }
        : {}),
      ...(reduceMotion ? { actionDefaults: { typeInto: { delay: 0 } } } : {}),
    });
  }

  function pause(duration: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }
</script>

<section class="hero" id="hero-demo" aria-labelledby="hero-title">
  <div class="container hero__grid">
    <div class="hero__copy" id="hero-copy">
      <h1 id="hero-title">Scenema</h1>
      <p class="hero__lead">
        Guide people through <span data-hero-selection>real product flows</span>.
      </p>
      <p class="hero__description">
        Connect user-paced guidance, real DOM actions, and page navigation in one declarative
        scenario.
      </p>
      <div class="hero__actions" role="group" aria-label="Scenema actions">
        <Button id="start-tour" label="Show demo" href="#examples" onclick={onStart} />
        <Button label="Get started" href="#get-started" variant="secondary" />
      </div>
    </div>

    <img class="hero__symbol" src={assetPath} alt="" width="420" height="420" />
  </div>
</section>
