<script lang="ts">
  import Button from "./Button.svelte";
</script>

<section class="getting-started" id="get-started" aria-labelledby="get-started-title">
  <div class="container getting-started__grid">
    <div>
      <h2 id="get-started-title">Get started</h2>
      <p>Scenema is an early MVP. Run the current workspace from the repository.</p>
    </div>
    <div class="getting-started__actions" id="getting-started-actions">
      <pre class="install-command"><code>git clone https://github.com/syi0808/scenema.git
cd scenema &amp;&amp; pnpm install</code></pre>
      <div>
        <Button label="Read the README" href="https://github.com/syi0808/scenema#readme" />
        <Button
          label="View on GitHub"
          href="https://github.com/syi0808/scenema"
          variant="secondary"
        />
      </div>
    </div>
  </div>
</section>
