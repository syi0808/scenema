<script lang="ts">
  let {
    label,
    href,
    variant = "primary",
    size = "default",
    onclick,
    disabled = false,
    id,
  }: {
    label: string;
    href?: string;
    variant?: "primary" | "secondary" | "quiet";
    size?: "default" | "small";
    onclick?: (event: MouseEvent) => void;
    disabled?: boolean;
    id?: string;
  } = $props();

  const className = $derived(
    `button button--${variant} ${size === "small" ? "button--small" : ""}`,
  );
</script>

{#if href}
  <a {id} class={className} {href} {onclick} aria-disabled={disabled}>{label}</a>
{:else}
  <button {id} class={className} type="button" {onclick} {disabled}>{label}</button>
{/if}
