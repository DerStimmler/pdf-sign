<script lang="ts">
  import type { FilterSettings } from './filter-settings';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import SelectSignatureDialog from './SelectSignatureDialog.svelte';

  type SettingsProps = {
    filterSettings: FilterSettings;
    changePdf: (file: File) => void;
    changeSignature: (dataUrl: string) => void;
  };

  let { changePdf, changeSignature, filterSettings = $bindable() }: SettingsProps = $props();

  let signatureDataUrl = $state('');

  async function handlePdfChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files.item(0);

    if (!file) return;

    changePdf(file);
  }

  async function handleSignatureChange(dataUrl: string) {
    signatureDataUrl = dataUrl;

    changeSignature(dataUrl);
  }
</script>

<div class="grid gap-4">
  <div class="grid w-full max-w-sm items-center gap-1.5">
    <Label for="pdf">PDF</Label>
    <Input id="pdf" type="file" accept=".pdf" onchange={handlePdfChange} />
  </div>
  <div class="grid w-full max-w-sm items-center gap-1.5">
    <Label for="signature">Signature</Label>
    <div id="signature" class="flex justify-between gap-4">
      <SelectSignatureDialog close={handleSignatureChange}></SelectSignatureDialog>
      {#if signatureDataUrl}
        <div class="">
          <img src={signatureDataUrl} alt="signature" class="bg-white border-border border rounded-md" />
        </div>
      {/if}
    </div>
  </div>
  <div class="items-top flex space-x-2">
    <Checkbox bind:checked={filterSettings.applyFilter} id="filter" />
    <div class="grid gap-1.5 leading-none">
      <Label
        for="filter"
        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >Emulate scanner</Label
      >
      <p class="text-muted-foreground text-sm">Apply filters to emulate the effect of printing and scanning</p>
    </div>
  </div>
</div>
