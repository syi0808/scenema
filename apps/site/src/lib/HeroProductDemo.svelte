<script lang="ts">
  import { onMount } from "svelte";

  const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
  const previewPath = `${basePrefix}/?hero-preview=1`;
  const previewWidth = 1120;

  let frame = $state<HTMLElement>();
  let scale = $state(560 / previewWidth);
  let active = $state(true);

  onMount(() => {
    if (!frame || !window.ResizeObserver || !window.IntersectionObserver) return;
    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width;
      if (width) scale = width / previewWidth;
    });
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => (active = Boolean(entry?.isIntersecting)),
      { threshold: 0.05 },
    );
    resizeObserver.observe(frame);
    visibilityObserver.observe(frame);
    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  });
</script>

<div class="hero-product-demo" bind:this={frame}>
  {#if active}
    <iframe
      title="Scenema autonomous product demo"
      src={previewPath}
      tabindex="-1"
      aria-hidden="true"
      scrolling="no"
      style:transform={`scale(${scale})`}
    ></iframe>
  {/if}
</div>

<style>
  .hero-product-demo {
    width: min(100%, 560px);
    height: 570px;
    position: relative;
    justify-self: end;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-frame);
    background: var(--surface-strong);
    box-shadow: 0 18px 48px rgb(15 23 42 / 12%);
  }

  iframe {
    width: 1120px;
    height: 1240px;
    position: absolute;
    inset: 0 auto auto 0;
    border: 0;
    transform-origin: top left;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .hero-product-demo {
      justify-self: start;
    }
  }

  @media (max-width: 560px) {
    .hero-product-demo {
      height: 460px;
    }
  }
</style>
