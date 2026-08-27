<script lang="ts">
  import Button from "./Button.svelte";

  let {
    onStart,
    assetPath,
    homePath,
  }: { onStart: () => void; assetPath: string; homePath: string } = $props();
</script>

<header class="site-header">
  <div class="container site-header__inner">
    <a class="wordmark" href={homePath} aria-label="Scenema home">
      <img src={assetPath} width="28" height="28" alt="" />
      <span>Scenema</span>
    </a>
    <nav class="site-nav" aria-label="Primary navigation">
      <a href="#examples">Examples</a>
      <a href="#scenario-code">Code</a>
      <a href="https://github.com/syi0808/scenema" rel="noreferrer">GitHub</a>
    </nav>
    <Button label="Show demo" href="#examples" size="small" onclick={onStart} />
  </div>
</header>
