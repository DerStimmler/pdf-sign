<script lang="ts">
  import Spinner from '$lib/Spinner.svelte';
  import Konva from 'konva';
  import * as pdfjs from 'pdfjs-dist';
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs';
  import { onDestroy, untrack } from 'svelte';
  import type { FilterSettings } from './filter-settings';
  import Settings from './Settings.svelte';
  import { Stage, Layer, Transformer } from 'svelte-konva';
  import * as Card from '$lib/components/ui/card';
  import {
    applyFiltersToPdfImages,
    applyFiltersToSignatureImage,
    generatePdfImages,
    generateSignatureImage,
    renderPdfImages,
    renderSignatureImage,
    savePdfWithFilters,
    savePdfWithoutFilters
  } from './konva-service';
  import { downloadBlob } from '$lib';
  import { Button } from '$lib/components/ui/button';
  pdfjs.GlobalWorkerOptions.workerSrc = import.meta.url + 'pdfjs-dist/build/pdf.worker.mjs';

  let isRendering = $state(false);

  let stage: Konva.Stage | null | undefined = $state(undefined);
  let stageConfig: Konva.ContainerConfig = $state({
    width: 0,
    height: 0
  });

  let pdfLayer: Konva.Layer | undefined = $state(undefined);
  let pdfLayerConfig: Konva.LayerConfig = $state({ listening: false });

  let signatureLayer: Konva.Layer | undefined = $state(undefined);
  let signatureLayerConfig: Konva.LayerConfig = $state({});

  let pdfFile: File | null = $state(null);
  let pdfImages: { image: Konva.Image; pageIndex: number }[] = $state([]);
  let pdfImagesWithFilter: { image: Konva.Image; pageIndex: number }[] = $state([]);

  let signatureImage: Konva.Image | null = $state(null);
  let signatureImageDataUrl: string | null = $state(null);
  let signatureImageWithFilter: Konva.Image | null = $state(null);

  let signatureTransformer: Konva.Transformer | undefined = $state(undefined);
  let signatureTransformerConfig: Konva.TransformerConfig = $state({
    enabledAnchors: [
      'top-left',
      'top-right',
      'top-center',
      'bottom-left',
      'bottom-right',
      'bottom-center',
      'middle-left',
      'middle-right'
    ],
    keepRatio: false,
    borderDash: [3, 3],
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315]
  });

  let filterSettings: FilterSettings = $state({
    applyFilter: false,
    contrast: 50,
    blur: 0.01,
    noise: 0.1,
    brightness: -0.1,
    rotation: 0
  });

  $effect(() => {
    if (!pdfFile) return;

    isRendering = true;

    generatePdfImages(pdfFile).then((images) => (pdfImages = images));
  });

  $effect(() => {
    if (!pdfImages || !pdfLayer) return;

    isRendering = true;

    if (filterSettings.applyFilter && pdfLayer) {
      pdfImagesWithFilter = applyFiltersToPdfImages(pdfImages, filterSettings);
      untrack(() => {
        renderPdfImages(pdfImagesWithFilter, pdfLayer!, stageConfig).then(() => (isRendering = false));
      });
    } else if (!filterSettings.applyFilter && pdfLayer) {
      untrack(() => {
        renderPdfImages(pdfImages, pdfLayer!, stageConfig).then(() => (isRendering = false));
      });
    }
  });

  $effect(() => {
    if (!signatureImageDataUrl) return;

    isRendering = true;

    generateSignatureImage(signatureImageDataUrl).then((image) => (signatureImage = image));
  });

  $effect(() => {
    if (!signatureImage || !signatureLayer) return;

    isRendering = true;

    if (filterSettings.applyFilter && signatureImage && signatureLayer) {
      signatureImageWithFilter = applyFiltersToSignatureImage(signatureImage, filterSettings);
      untrack(() => {
        if (signatureImage && signatureImageWithFilter) {
          copyImageDimensions(signatureImage, signatureImageWithFilter);
        }
        renderSignatureImage(signatureImageWithFilter!, signatureLayer!, signatureTransformer!).then(
          () => (isRendering = false)
        );
      });
    } else if (!filterSettings.applyFilter && signatureImage && signatureLayer) {
      untrack(() => {
        if (signatureImage && signatureImageWithFilter) {
          copyImageDimensions(signatureImageWithFilter, signatureImage);
        }
        renderSignatureImage(signatureImage!, signatureLayer!, signatureTransformer!).then(() => (isRendering = false));
      });
    }
  });

  function copyImageDimensions(sourceImage: Konva.Image, targetImage: Konva.Image) {
    targetImage.position(sourceImage.position());
    targetImage.size(sourceImage.size());
    targetImage.rotation(sourceImage.rotation());
    targetImage.scale(sourceImage.scale());
    targetImage.skew(sourceImage.skew());
  }

  async function savePdf() {
    if (!pdfFile || !signatureImageDataUrl) {
      alert('Please select both PDF and signature.');
      return;
    }

    if (!filterSettings.applyFilter) {
      const pdfBytes = await savePdfWithoutFilters(pdfFile!, pdfImages!, signatureImage!, pdfLayer!, stage!);
      downloadBlob([pdfBytes], 'application/pdf', pdfFile.name.replace('.pdf', '-signed.pdf'));
    } else {
      const pdfBytes = await savePdfWithFilters(pdfImagesWithFilter, signatureImageWithFilter!, pdfLayer!, stage!);
      downloadBlob([pdfBytes], 'application/pdf', pdfFile.name.replace('.pdf', '-signed.pdf'));
    }
  }

  onDestroy(() => {
    stage?.destroy();
  });
</script>

<div class="grid md:grid-cols-[max-content_1fr] gap-8 place-self-center">
  <div class="md:sticky h-max top-32 grid gap-8">
    <Card.Root>
      <Card.Header>
        <Card.Title>Configuration</Card.Title>
      </Card.Header>
      <Card.Content>
        <Settings
          changePdf={(file) => (pdfFile = file)}
          changeSignature={(dataUrl) => (signatureImageDataUrl = dataUrl)}
          bind:filterSettings
        ></Settings>
      </Card.Content>
      <Card.Footer>
        <Button onclick={savePdf}>Sign PDF</Button>
      </Card.Footer>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <Card.Title>Instruction</Card.Title>
      </Card.Header>
      <Card.Content>
        <ol class="list-decimal list-inside text-opacity-70">
          <li>Select your PDF</li>
          <li>Select your signature</li>
          <li>Position your signature as you like</li>
          <li>Optional: emulate printing and scanning</li>
          <li>Sign and download PDF</li>
        </ol>
      </Card.Content>
    </Card.Root>
  </div>

  <div class="w-fit flex min-w-24">
    <Card.Root>
      <Card.Header>
        <Card.Title>Preview</Card.Title>
      </Card.Header>
      <Card.Content>
        {#if !pdfFile}
          <div class="grid h-full place-items-center min-w-80">
            <p class="italic">No PDF selected</p>
          </div>
        {/if}

        {#if isRendering}
          <div class="grid h-full min-w-24 place-items-center">
            <Spinner></Spinner>
          </div>
        {/if}

        <div class:invisible={isRendering || !pdfFile}>
          <Stage bind:handle={stage} bind:config={stageConfig}>
            <Layer bind:handle={pdfLayer} bind:config={pdfLayerConfig}></Layer>
            <Layer bind:handle={signatureLayer} bind:config={signatureLayerConfig}>
              <Transformer bind:handle={signatureTransformer} bind:config={signatureTransformerConfig}></Transformer>
            </Layer>
          </Stage>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
</div>
