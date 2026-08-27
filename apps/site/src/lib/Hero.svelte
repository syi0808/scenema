<script lang="ts">
  import Button from "./Button.svelte";

  let {
    assetPath,
    onStart,
  }: { assetPath: string; onStart: (event?: MouseEvent) => void } = $props();
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
