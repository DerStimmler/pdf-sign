<script lang="ts">
  import '../app.css';
  import '../body.css';
</script>

<main class="container mx-auto py-4 grid gap-4">
  <h1
    class="place-self-center text-6xl leading-[inherit] font-bold w-max m-0 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
  >
    pdf-sign
  </h1>
  <p class="place-self-center opacity-80 mb-4">Easily sign your PDFs locally in your browser for maximum privacy.</p>
  <slot></slot>
</main>
