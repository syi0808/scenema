<script lang="ts">
  import { exampleById, examples, type ExampleId } from "./examples";

  let { selected, onSelect }: { selected: ExampleId; onSelect: (id: ExampleId) => void } = $props();
  const activeExample = $derived(exampleById(selected));

  function handleTabKeydown(event: KeyboardEvent, index: number): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + examples.length) % examples.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % examples.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = examples.length - 1;
    const next = examples[nextIndex];
    onSelect(next.id);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`#code-tab-${next.id}`)?.focus(),
    );
  }
</script>

<section class="code-section" id="scenario-code" aria-labelledby="code-title">
  <div class="container code-section__grid">
    <div class="section-heading">
      <p class="eyebrow">Same interface, same targets</p>
      <h2 id="code-title">The sequence is the source of truth.</h2>
      <p>Every example points to the control you just used. Choose an action to see the scenario behind it.</p>
      <a class="text-link" href="https://github.com/syi0808/scenema#readme">Read the documentation <span aria-hidden="true">→</span></a>
    </div>

    <div class="code-showcase">
      <div class="code-tabs" role="tablist" aria-label="Scenario code examples">
        {#each examples as example, index}
          <button id={`code-tab-${example.id}`} type="button" role="tab" aria-selected={selected === example.id} aria-controls="scenario-code-panel" tabindex={selected === example.id ? 0 : -1} onclick={() => onSelect(example.id)} onkeydown={(event) => handleTabKeydown(event, index)}>{example.label}</button>
        {/each}
      </div>
      <div class="code-panel" id="scenario-code-panel" role="tabpanel" aria-label={`${activeExample.label} scenario code`}>
        <div class="code-panel__bar"><span>{activeExample.id}.ts</span><code>{activeExample.path}</code></div>
        <pre><code>{activeExample.code}</code></pre>
      </div>
    </div>
  </div>
</section>
