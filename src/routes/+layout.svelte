<script lang="ts">
  import '../app.css';
  import '../body.css';
  import '../override.css';
  import { ModeWatcher } from 'mode-watcher';
  import ModeToggle from '$lib/components/ui/mode-toggle/ModeToggle.svelte';
  import { base } from '$app/paths';
</script>

<header class="grid px-8">
  <div class="grid place-items-center">
    <h1
      class="place-self-center text-6xl leading-[inherit] font-bold w-max m-0 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
    >
      pdf-sign
    </h1>
    <p class="font-bold place-self-center opacity-85 mb-4">
      Easily sign your PDFs locally in your browser for maximum privacy.
    </p>
  </div>
</header>

<main class="container mx-auto py-4 grid gap-4">
  <slot></slot>
</main>

<footer class="grid grid-cols-2 px-8">
  <div class="grid place-self-start self-center">
    <a href="https://github.com/derstimmler/pdf-sign">
      <img
        src="{base}/images/github-mark-white.svg"
        width="32"
        height="32"
        alt="github logo"
        class="invert dark:invert-0"
      />
    </a>
  </div>
  <div class="grid place-self-end self-center">
    <ModeToggle></ModeToggle>
  </div>
</footer>

<ModeWatcher></ModeWatcher>
