<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Drawer from '$lib/components/ui/drawer';
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
  let windowWidth = $state(0);
  let isDesktop = $derived(windowWidth > 768);

  $inspect(isDesktop);

  function handleFileSelection(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;
    const file = files.item(0);

    if (!file) return;

    signatureDataUrl = URL.createObjectURL(file);
  }

  function handleDrawing(dataUrl: string) {
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

<svelte:window bind:innerWidth={windowWidth} />

{#if isDesktop}
  <Dialog.Root bind:open={isOpen}>
    <Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Select signature</Dialog.Trigger>
    <Dialog.Content>
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
{:else}
  <Drawer.Root bind:open={isOpen}>
    <Drawer.Trigger class={buttonVariants({ variant: 'outline' })}>Select signature</Drawer.Trigger>
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Select signature</Drawer.Title>
        <Drawer.Description>
          Select your signature by uploading an image or drawing it directly in your browser.
        </Drawer.Description>
      </Drawer.Header>
      <div class="p-4">
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
      </div>
      <Drawer.Footer>
        <Button type="submit" onclick={select}>Select</Button>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
{/if}
