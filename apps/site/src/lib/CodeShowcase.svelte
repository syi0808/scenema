<script lang="ts">
  import { codeExampleById, codeExamples, type CodeExampleId } from "./examples";

  let {
    selected,
    onSelect,
  }: { selected: CodeExampleId; onSelect: (id: CodeExampleId) => void } = $props();
  const activeExample = $derived(codeExampleById(selected));

  function handleTabKeydown(event: KeyboardEvent, index: number): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + codeExamples.length) % codeExamples.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % codeExamples.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = codeExamples.length - 1;
    const next = codeExamples[nextIndex];
    onSelect(next.id);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`#code-tab-${next.id}`)?.focus(),
    );
  }
</script>

<section class="code-section" id="scenario-code" aria-labelledby="code-title">
  <div class="container">
    <div class="section-heading">
      <h2 id="code-title">Your first scenario</h2>
      <p>Describe the page, the target, and what happens when the user continues.</p>
    </div>

    <div class="code-showcase">
      <div class="code-tabs" role="tablist" aria-label="Scenario code examples">
        {#each codeExamples as example, index}
          <button
            id={`code-tab-${example.id}`}
            type="button"
            role="tab"
            aria-selected={selected === example.id}
            aria-controls="scenario-code-panel"
            tabindex={selected === example.id ? 0 : -1}
            onclick={() => onSelect(example.id)}
            onkeydown={(event) => handleTabKeydown(event, index)}
          >{example.label}</button>
        {/each}
      </div>
      <div
        class="code-panel"
        id="scenario-code-panel"
        role="tabpanel"
        aria-label={`${activeExample.label} scenario code`}
      >
        <div class="code-panel__bar"><span>{activeExample.filename}</span></div>
        <pre><code>{activeExample.code}</code></pre>
      </div>
    </div>
  </div>
</section>
