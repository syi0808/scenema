<script lang="ts">
  import Button from "./Button.svelte";
  import { demos, type DemoId } from "./examples";

  let { onRun }: { onRun: (id: DemoId, event?: MouseEvent) => void } = $props();
</script>

<section class="examples-section" id="examples" aria-labelledby="examples-title">
  <div class="container">
    <h2 id="examples-title">Examples</h2>
    <p>Run Scenema against the elements already on this page.</p>
    <div class="example-actions" id="example-actions">
      {#each demos as demo, index}
        <Button
          id={`run-${demo.id}`}
          label={demo.label}
          href={index === 0 ? "#examples" : index === 1 ? "#get-started" : "#scenario-code"}
          variant={index === 0 ? "primary" : "secondary"}
          onclick={(event) => onRun(demo.id, event)}
        />
      {/each}
    </div>
  </div>
</section>
