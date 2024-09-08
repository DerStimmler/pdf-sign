<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { Button, buttonVariants } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import SignatureDraw from './SignatureDraw.svelte';

  type SignatureDialogProps = {
    close: (dataUrl: string) => void;
  };

  let { close }: SignatureDialogProps = $props();
  let isOpen = $state(false);
  let signatureDataUrl: string | null = $state(null);

  function handleFileSelection(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files.item(0);

    if (!file) return;

    signatureDataUrl = URL.createObjectURL(file);
  }

  function handleDrawing(dataUrl: string) {
    console.log(dataUrl);
    signatureDataUrl = dataUrl;
  }

  function select() {
    if (signatureDataUrl) {
      close(signatureDataUrl);
      isOpen = false;
    }
  }

  let currentTab: 'file' | 'draw' = $state('file');
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Select signature</Dialog.Trigger>
  <Dialog.Content class="max-w-fit">
    <Dialog.Header>
      <Dialog.Title>Select signature</Dialog.Title>
      <Dialog.Description>
        Select your signature by uploading an image or drawing it directly in your browser.
      </Dialog.Description>
    </Dialog.Header>
    <Tabs.Root bind:value={currentTab}>
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="file">File upload</Tabs.Trigger>
        <Tabs.Trigger value="draw">Draw</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="file">
        <Input id="picture" type="file" accept="image/*" onchange={handleFileSelection} />
      </Tabs.Content>
      <Tabs.Content value="draw">
        <SignatureDraw close={handleDrawing}></SignatureDraw>
      </Tabs.Content>
    </Tabs.Root>
    <Dialog.Footer>
      <Button type="submit" onclick={select}>Select</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
