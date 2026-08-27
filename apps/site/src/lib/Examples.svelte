<script lang="ts">
  import { examples, type ExampleId } from "./examples";

  let {
    selected,
    clickCount,
    typeValue,
    onSelect,
    onClick,
    onType,
    onNavigate,
  }: {
    selected: ExampleId;
    clickCount: number;
    typeValue: string;
    onSelect: (id: ExampleId) => void;
    onClick: () => void;
    onType: (value: string) => void;
    onNavigate: () => void;
  } = $props();

  let highlighted = $state(false);
  const activeExample = $derived(examples.find((example) => example.id === selected)!);

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
      document.querySelector<HTMLButtonElement>(`#example-tab-${next.id}`)?.focus(),
    );
  }
</script>

<section class="examples-section container" id="examples" aria-labelledby="examples-title">
  <div class="section-heading section-heading--split">
    <div>
      <p class="eyebrow">Examples</p>
      <h2 id="examples-title">The page is the playground.</h2>
    </div>
    <p>Run each action yourself, or start the guided demo and let Scenema perform the same actions against these controls.</p>
  </div>

  <div class="example-frame">
    <div class="example-tabs" role="tablist" aria-label="Scenema examples">
      {#each examples as example, index}
        <button
          id={`example-tab-${example.id}`}
          type="button"
          role="tab"
          aria-selected={selected === example.id}
          aria-controls="example-panel"
          tabindex={selected === example.id ? 0 : -1}
          onclick={() => onSelect(example.id)}
          onkeydown={(event) => handleTabKeydown(event, index)}
        >{example.label}</button>
      {/each}
    </div>

    <div class="example-panel" id="example-panel" role="tabpanel" aria-labelledby={`example-tab-${selected}`}>
      <div class="example-panel__copy">
        <p class="meta">{activeExample.label} example</p>
        <h3>{activeExample.title}</h3>
        <p>{activeExample.description}</p>
      </div>

      <div class="example-playground" data-example={selected}>
        {#if selected === "highlight"}
          <div class="highlight-example">
            <button class="feature-target" id="highlight-example-target" type="button" data-highlighted={highlighted}>New workspace insights</button>
            <button class="button button--secondary" id="highlight-example-action" type="button" onclick={() => (highlighted = !highlighted)}>{highlighted ? "Clear highlight" : "Highlight feature"}</button>
          </div>
        {:else if selected === "click"}
          <div class="click-example">
            <button class="button" id="click-example-action" type="button" onclick={onClick}>Run action</button>
            <p id="click-example-count" role="status" aria-live="polite"><strong>{clickCount}</strong><span>actions completed</span></p>
          </div>
        {:else if selected === "type"}
          <div class="type-example">
            <label for="type-example-input">Workspace name</label>
            <input id="type-example-input" autocomplete="off" value={typeValue} oninput={(event) => onType(event.currentTarget.value)} />
            <button class="button button--quiet button--small" type="button" onclick={() => onType("")}>Clear</button>
          </div>
        {:else}
          <div class="navigation-example">
            <div><span>Current pathname</span><code>/examples/navigation</code></div>
            <button class="button" id="navigation-example-action" type="button" onclick={onNavigate}>Continue on this route</button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
