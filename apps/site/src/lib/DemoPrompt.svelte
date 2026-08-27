<script lang="ts">
  import { onMount, tick } from "svelte";

  let { onRun }: { onRun: () => void | Promise<void> } = $props();

  const storageKey = "scenema:demo-prompt-seen";
  let dialog = $state<HTMLDialogElement>();
  let runButton = $state<HTMLButtonElement>();
  let visible = $state(false);

  onMount(() => {
    if (window.sessionStorage.getItem(storageKey)) return;
    visible = true;
    void tick().then(() => {
      dialog?.showModal?.();
      runButton?.focus();
    });
  });

  function choose(runDemo: boolean): void {
    window.sessionStorage.setItem(storageKey, "true");
    dialog?.close?.();
    visible = false;
    if (runDemo) void tick().then(onRun);
  }
</script>

{#if visible}
  <dialog
    bind:this={dialog}
    class="demo-prompt"
    aria-labelledby="demo-prompt-title"
    oncancel={(event) => {
      event.preventDefault();
      choose(false);
    }}
  >
    <h2 id="demo-prompt-title">See Scenema in action?</h2>
    <div class="demo-prompt__actions">
      <button class="button button--secondary" type="button" onclick={() => choose(false)}
        >Not now</button
      >
      <button bind:this={runButton} class="button" type="button" onclick={() => choose(true)}
        >Run demo</button
      >
    </div>
  </dialog>
{/if}
