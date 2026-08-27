<script lang="ts">
  import { createScenemaActorble } from "scenema";
  import { onMount } from "svelte";

  import Button from "./Button.svelte";

  let {
    assetPath,
    onStart,
  }: { assetPath: string; onStart: (event?: MouseEvent) => void } = $props();

  let ambientCursor: ReturnType<typeof createScenemaActorble> | undefined;
  let ambientStopped = true;
  let removeScrollListener = () => {};

  onMount(() => {
    if (window.matchMedia("(max-width: 700px), (prefers-reduced-motion: reduce)").matches) return;
    const title = document.querySelector<HTMLElement>("#hero-title");
    const startButton = document.querySelector<HTMLElement>("#start-tour");
    const symbol = document.querySelector<HTMLElement>(".hero__symbol");
    if (!title || !startButton || !symbol) return;

    ambientStopped = false;
    ambientCursor = createScenemaActorble(document, {
      feedback: "cursor",
      pointer: {
        initialPosition: {
          x: window.innerWidth * 0.76,
          y: Math.min(window.innerHeight * 0.56, 520),
        },
      },
    });
    const stopOnScroll = () => {
      if (window.scrollY > 48) stopAmbientCursor();
    };
    window.addEventListener("scroll", stopOnScroll, { passive: true });
    removeScrollListener = () => window.removeEventListener("scroll", stopOnScroll);
    void animateCursor([title, startButton, symbol, startButton]);

    return stopAmbientCursor;
  });

  export function stopAmbientCursor(): void {
    if (ambientStopped) return;
    ambientStopped = true;
    removeScrollListener();
    removeScrollListener = () => {};
    ambientCursor?.destroy();
    ambientCursor = undefined;
  }

  async function animateCursor(targets: readonly Element[]): Promise<void> {
    await pause(700);
    let index = 0;
    try {
      while (!ambientStopped && ambientCursor) {
        await ambientCursor.moveTo(targets[index], { duration: index % 2 === 0 ? 1_300 : 900 });
        await pause(index === targets.length - 1 ? 1_100 : 520);
        index = (index + 1) % targets.length;
      }
    } catch {
      if (!ambientStopped) stopAmbientCursor();
    }
  }

  function pause(duration: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
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
      <div class="hero__actions">
        <Button id="start-tour" label="Show demo" href="#examples" onclick={onStart} />
        <Button label="Get started" href="#get-started" variant="secondary" />
      </div>
    </div>

    <img class="hero__symbol" src={assetPath} alt="" width="420" height="420" />
  </div>
</section>
