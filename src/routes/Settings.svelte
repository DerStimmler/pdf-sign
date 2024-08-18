<script lang="ts">
  import type { FilterSettings } from './filter-settings';

  type SettingsProps = {
    filterSettings: FilterSettings;
    savePdf: () => void;
    changePdf: (file: File) => void;
    changeSignature: (file: File) => void;
  };

  let { savePdf, changePdf, changeSignature, filterSettings = $bindable() }: SettingsProps = $props();

  async function handlePdfChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files.item(0);

    if (!file) return;

    changePdf(file);
  }

  async function handleSignatureChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files.item(0);

    if (!file) return;

    changeSignature(file);
  }
</script>

<div class="grid gap-2">
  <div class="grid gap-1">
    <div class="font-bold text-sm opacity-80">PDF</div>
    <input type="file" accept=".pdf" onchange={handlePdfChange} />
  </div>
  <div class="grid gap-1">
    <div class="font-bold text-sm opacity-80">Signature</div>
    <input type="file" accept="image/*" onchange={handleSignatureChange} />
  </div>
  <div class="grid gap-1">
    <div class="font-bold text-sm opacity-80">Apply scan emulation filter</div>
    <input class="place-self-start" type="checkbox" bind:checked={filterSettings.applyFilter} />
  </div>
  <button
    class="bg-indigo-500 hover:bg-indigo-600 transition-colors duration-300 font-bold py-2 px-4 rounded"
    onclick={savePdf}>Sign PDF</button
  >
</div>
