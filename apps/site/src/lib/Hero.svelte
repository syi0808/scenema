<script lang="ts">
  import Button from "./Button.svelte";

  let {
    onStart,
    starting,
    completed,
  }: { onStart: (event?: MouseEvent) => void; starting: boolean; completed: boolean } = $props();
</script>

<section class="hero" id="hero-demo" aria-labelledby="hero-title">
  <div class="container hero__grid">
    <div class="hero__copy">
      <p class="eyebrow">Programmable product guidance</p>
      <h1 id="hero-title">Guide people through your real product.</h1>
      <p>Scenema performs real clicks, typing, and navigation—one user-paced step at a time.</p>
      <div class="hero__actions">
        <Button
          id="start-tour"
          label={starting ? "Starting…" : completed ? "Run the demo again" : "Show the demo"}
          href="#examples"
          onclick={onStart}
          disabled={starting}
        />
        <Button label="Get started" href="#scenario-code" variant="secondary" />
      </div>
    </div>

    <div class="sequence-preview" role="group" aria-label="Scenema demo sequence">
      <div class="sequence-preview__bar"><span>Live sequence</span><code>5 steps</code></div>
      <ol>
        <li><span>01</span><strong>Focus the current target</strong></li>
        <li><span>02</span><strong>Click the real control</strong></li>
        <li><span>03</span><strong>Type into the field</strong></li>
        <li><span>04</span><strong>Continue on a new route</strong></li>
        <li><span>05</span><strong>Connect the action to code</strong></li>
      </ol>
    </div>
  </div>
</section>
