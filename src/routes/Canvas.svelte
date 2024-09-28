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
  import { getDistance } from '$lib/get-distance';
  import { getAngle } from '$lib/get-angle';
  import { getCenter } from '$lib/get-center';
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
    Konva.hitOnDragEnabled = true;
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

  function addMultiTouchSupport(image: Konva.Image) {
    let initialDistance = 0;
    let initialAngle = 0;
    let initialScale = 1;
    let initialRotation = 0;
    let initialMidpoint = { x: 0, y: 0 };
    let initialPosition = { x: 0, y: 0 };
    let initialSkewX = 0;
    let initialSkewY = 0;

    // Set the offset to the center of the image to rotate around the center
    image.offsetX(image.width() / 2);
    image.offsetY(image.height() / 2);

    image.on('touchstart', function (e) {
      const touches = e.evt.touches;

      // Single-finger drag (move the image)
      if (touches.length === 1) {
        const touch = touches[0];
        initialPosition = { x: touch.clientX, y: touch.clientY };
      }

      // Multi-touch gesture (scale, rotate, skew)
      if (touches.length === 2) {
        e.evt.preventDefault();

        const touch1 = touches[0];
        const touch2 = touches[1];

        const p1 = { x: touch1.clientX, y: touch1.clientY };
        const p2 = { x: touch2.clientX, y: touch2.clientY };

        initialDistance = getDistance(p1, p2);
        initialAngle = getAngle(p1, p2);
        initialScale = image.scaleX(); // Assume uniform scaling
        initialRotation = image.rotation();
        initialMidpoint = getCenter(p1, p2);
        initialPosition = { x: image.x(), y: image.y() }; // Store image's initial position

        // Store initial skew values
        initialSkewX = image.skewX();
        initialSkewY = image.skewY();
      }
    });

    image.on('touchmove', function (e) {
      const touches = e.evt.touches;

      // Single-finger drag logic
      if (touches.length === 1) {
        const touch = touches[0];

        // Calculate new position based on touch movement
        const dx = touch.clientX - initialPosition.x;
        const dy = touch.clientY - initialPosition.y;

        image.x(image.x() + dx);
        image.y(image.y() + dy);

        // Update initial position to the current one
        initialPosition = { x: touch.clientX, y: touch.clientY };

        image.getLayer()?.batchDraw();
      }

      // Multi-touch gesture (scale, rotate, skew)
      if (touches.length === 2) {
        e.evt.preventDefault();
        const touch1 = touches[0];
        const touch2 = touches[1];

        const p1 = { x: touch1.clientX, y: touch1.clientY };
        const p2 = { x: touch2.clientX, y: touch2.clientY };

        const newDistance = getDistance(p1, p2);
        const newAngle = getAngle(p1, p2);

        // Calculate the new midpoint and move the image accordingly
        const newMidpoint = getCenter(p1, p2);
        const dx = newMidpoint.x - initialMidpoint.x;
        const dy = newMidpoint.y - initialMidpoint.y;

        image.x(initialPosition.x + dx);
        image.y(initialPosition.y + dy);

        // Calculate the scaling factor
        const scaleFactor = newDistance / initialDistance;

        // Apply scaling (around center)
        image.scaleX(initialScale * scaleFactor);
        image.scaleY(initialScale * scaleFactor);

        // Calculate the new rotation angle
        const angleDiff = (newAngle - initialAngle) * (180 / Math.PI); // Convert to degrees
        image.rotation(initialRotation + angleDiff);

        // Calculate skew based on distance moved (optional logic)
        const skewXChange = (newMidpoint.x - initialMidpoint.x) / 100; // Adjust the divisor for sensitivity
        const skewYChange = (newMidpoint.y - initialMidpoint.y) / 100;

        image.skewX(initialSkewX + skewXChange);
        image.skewY(initialSkewY + skewYChange);

        image.getLayer()?.batchDraw();
      }
    });

    image.on('touchend', function (e) {
      const touches = e.evt.touches;

      // Reset when no fingers are left
      if (touches.length === 0) {
        initialDistance = 0;
        initialAngle = 0;
        initialMidpoint = { x: 0, y: 0 };
      }
    });
  }

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
        renderSignatureImage(signatureImage!, signatureLayer!, signatureTransformer!).then(() => {
          addMultiTouchSupport(signatureImage!);
          isRendering = false;
        });
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

<div class="grid md:grid-cols-2 gap-8 place-self-center">
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
        <Card.Title>Instructions</Card.Title>
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

  <div class="grid">
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
