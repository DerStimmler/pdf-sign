import Konva from 'konva';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import type { FilterSettings } from './filter-settings';
import Transformer = Konva.Transformer;

export async function generatePdfImages(file: File): Promise<{ image: Konva.Image; pageIndex: number }[]> {
  const url = URL.createObjectURL(file);
  const pdf = await pdfjs.getDocument(url).promise;

  const pdfPageCount = pdf.numPages;

  let cumulativeHeight = 0;

  const images: { image: Konva.Image; pageIndex: number }[] = [];

  const imageLoadingPromises: Promise<void>[] = [];

  for (let i = 1; i <= pdfPageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const img = new Image();
    img.src = canvas.toDataURL();

    const imageLoadingPromise = new Promise<void>((resolve) => {
      img.onload = () => {
        const pdfImage = new Konva.Image({
          image: img,
          x: 0,
          y: cumulativeHeight,
          width: canvas.width,
          height: canvas.height
        });
        images.push({ image: pdfImage, pageIndex: i - 1 });
        cumulativeHeight += canvas.height;
        resolve();
      };
    });

    imageLoadingPromises.push(imageLoadingPromise);
  }

  await Promise.all(imageLoadingPromises);

  return images;
}

export async function renderPdfImages(
  pdfImages: { image: Konva.Image; pageIndex: number }[],
  layer: Konva.Layer,
  stageConfig: Konva.ContainerConfig
) {
  layer.clear();
  layer.removeChildren();

  let cumulativeHeight = 0;
  let maxWidth = 0;

  pdfImages.forEach((pdfImage) => {
    layer.add(pdfImage.image);
    pdfImage.image.cache();
    cumulativeHeight += pdfImage.image.height();
    maxWidth = maxWidth > pdfImage.image.width() ? maxWidth : pdfImage.image.width();
  });

  stageConfig.height = cumulativeHeight;
  stageConfig.width = maxWidth;
}

export async function generateSignatureImage(dataUrl: string): Promise<Konva.Image> {
  const img = new Image();
  img.src = dataUrl;

  return await new Promise<Konva.Image>((resolve) => {
    img.onload = () => {
      const konvaImage = new Konva.Image({
        image: img,
        draggable: true
      });
      resolve(konvaImage);
    };
  });
}

export async function renderSignatureImage(image: Konva.Image, layer: Konva.Layer, transformer: Transformer) {
  layer.clear();
  layer.removeChildren();

  layer.add(image);

  if (transformer) {
    transformer.nodes([image]);
    layer.add(transformer);
  }
}

export async function savePdfWithoutFilters(
  pdfFile: File,
  pdfImages: { image: Konva.Image; pageIndex: number }[],
  signatureImage: Konva.Image,
  layer: Konva.Layer,
  stage: Konva.Stage
): Promise<Uint8Array> {
  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const {
    x: signatureX,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight
  } = signatureImage.getClientRect();

  // Determine which page the image is on
  let targetPageIndex: number | null = null;

  for (let i = 0; i < pdfImages.length; i++) {
    const pdfImageObj = pdfImages[i];
    const pageImage = pdfImageObj.image;
    const pageIndex = pdfImageObj.pageIndex;

    const pagePos = pageImage.getClientRect();
    const { y: pageY, height: pageHeight } = pagePos;

    // Check if the draggable image's top edge is within the current page's bounds
    if (signatureY >= pageY && signatureY < pageY + pageHeight) {
      targetPageIndex = pageIndex;
      break;
    }
  }

  if (targetPageIndex === null) {
    console.error('Could not determine which page the image is on.');
    throw new Error('Could not determine which page the image is on.');
  }

  // Temporarily remove the Transformer before capturing the canvas
  const transformer = signatureImage
    .getLayer()
    ?.findOne<Konva.Transformer>(
      (node: Konva.Node) => node instanceof Konva.Transformer && node.nodes().includes(signatureImage)
    );

  if (transformer) {
    transformer.visible(false);
    layer.batchDraw();
  }

  const targetPage = pdfDoc.getPage(targetPageIndex);
  const pdfHeight = targetPage.getHeight();
  // Adjust for the different coordinate systems
  const adjustedY = pdfHeight - (signatureY - pdfImages[targetPageIndex].image.getClientRect().y + signatureHeight);

  // Create a temporary canvas to crop the image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = signatureWidth;
  tempCanvas.height = signatureHeight;
  const tempContext = tempCanvas.getContext('2d')!;

  // Draw the cropped image onto the temporary canvas
  tempContext.drawImage(
    stage.toCanvas(),
    signatureX,
    signatureY,
    signatureWidth,
    signatureHeight, // Source rectangle
    0,
    0,
    signatureWidth,
    signatureHeight // Destination rectangle
  );

  // Get the cropped image data URL
  const imageDataUrl = tempCanvas.toDataURL('image/png');

  // Re-add the Transformer after capturing the canvas
  if (transformer) {
    transformer.visible(true);
    layer.batchDraw(); // Redraw the layer to add the transformer's border back
  }

  // Embed the image into the PDF
  const imageBytes = await fetch(imageDataUrl).then((res) => res.arrayBuffer());
  const pdfImage = await pdfDoc.embedPng(imageBytes);

  // Add the image to the target page
  targetPage.drawImage(pdfImage, {
    x: signatureX,
    y: adjustedY,
    width: signatureWidth,
    height: signatureHeight
  });

  // Serialize the PDF and trigger a download
  return await pdfDoc.save();
}

function applyFiltersToImage(konvaImage: Konva.Image, filterSettings: FilterSettings) {
  konvaImage.clearCache();

  konvaImage.filters([Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.Blur, Konva.Filters.Noise]);

  konvaImage.contrast(filterSettings.contrast);
  konvaImage.blurRadius(filterSettings.blur);
  konvaImage.noise(filterSettings.noise);
  konvaImage.brightness(filterSettings.brightness);

  konvaImage.rotation(filterSettings.rotation);

  konvaImage.cache();
}

export function applyFiltersToSignatureImage(signatureImage: Konva.Image, filterSettings: FilterSettings) {
  const signatureImageWithFilter = signatureImage.clone();
  applyFiltersToImage(signatureImageWithFilter, filterSettings);
  return signatureImageWithFilter;
}

export function applyFiltersToPdfImages(
  pdfImages: { image: Konva.Image; pageIndex: number }[],
  filterSettings: FilterSettings
) {
  const filteredImages = pdfImages.map((item) => ({
    image: item.image.clone(),
    pageIndex: item.pageIndex
  }));

  filteredImages.forEach((filteredImage) => {
    applyFiltersToImage(filteredImage.image, filterSettings);
  });

  return filteredImages;
}

export async function savePdfWithFilters(
  pdfImages: { image: Konva.Image; pageIndex: number }[],
  signatureImageWithFilter: Konva.Image,
  layer: Konva.Layer,
  stage: Konva.Stage
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create(); // Create a new PDF document

  const {
    x: signatureX,
    y: signatureY,
    width: signatureWidth,
    height: signatureHeight
  } = signatureImageWithFilter.getClientRect();

  // Determine which page the image is on
  let targetPageIndex: number | null = null;

  for (let i = 0; i < pdfImages.length; i++) {
    const pdfImageObj = pdfImages[i];
    const pageImage = pdfImageObj.image;
    const pageIndex = pdfImageObj.pageIndex;

    const pagePos = pageImage.getClientRect();
    const { y: pageY, height: pageHeight } = pagePos;

    // Check if the draggable image's top edge is within the current page's bounds
    if (signatureY >= pageY && signatureY < pageY + pageHeight) {
      targetPageIndex = pageIndex;
      break;
    }
  }

  if (targetPageIndex === null) {
    console.error('Could not determine which page the image is on.');
    throw new Error('Could not determine which page the image is on.');
  }

  // Temporarily remove the Transformer before capturing the canvas
  const transformer = signatureImageWithFilter
    .getLayer()
    ?.findOne<Konva.Transformer>(
      (node: Konva.Node) => node instanceof Konva.Transformer && node.nodes().includes(signatureImageWithFilter)
    );

  if (transformer) {
    transformer.visible(false);
    layer.batchDraw();
  }

  // Loop through each pdfImage to create pages in the PDF
  for (let i = 0; i < pdfImages.length; i++) {
    const pdfImageObj = pdfImages[i];
    const { width: imageWidth, height: imageHeight } = pdfImageObj.image.getClientRect();

    // Create a new page in the PDF with the size of the current pdfImage
    const page = pdfDoc.addPage([imageWidth, imageHeight]);

    // Convert the current pdfImage to a data URL and embed it into the PDF
    const pageCanvas = pdfImageObj.image.toCanvas();
    const pageImageDataUrl = pageCanvas.toDataURL('image/png');
    const pageImageBytes = await fetch(pageImageDataUrl).then((res) => res.arrayBuffer());
    const embeddedPageImage = await pdfDoc.embedPng(pageImageBytes);

    // Draw the full-page image on the PDF page, filling the entire page
    page.drawImage(embeddedPageImage, {
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight
    });

    // If this is the target page, add the signature image
    if (i === targetPageIndex) {
      const pdfHeight = page.getHeight();
      const adjustedY = pdfHeight - (signatureY - pdfImages[i].image.getClientRect().y + signatureHeight);

      // Create a temporary canvas to capture the signature
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = signatureWidth;
      tempCanvas.height = signatureHeight;
      const tempContext = tempCanvas.getContext('2d')!;

      // Draw the signature image onto the temporary canvas
      tempContext.drawImage(
        stage.toCanvas(),
        signatureX,
        signatureY,
        signatureWidth,
        signatureHeight, // Source rectangle
        0,
        0,
        signatureWidth,
        signatureHeight // Destination rectangle
      );

      // Get the cropped image data URL
      const signatureImageDataUrl = tempCanvas.toDataURL('image/png');
      const signatureImageBytes = await fetch(signatureImageDataUrl).then((res) => res.arrayBuffer());
      const pdfSignatureImage = await pdfDoc.embedPng(signatureImageBytes);

      // Draw the signature image on the target page
      page.drawImage(pdfSignatureImage, {
        x: signatureX,
        y: adjustedY,
        width: signatureWidth,
        height: signatureHeight
      });
    }
  }

  // Re-add the Transformer after capturing the canvas
  if (transformer) {
    transformer.visible(true);
    layer.batchDraw(); // Redraw the layer to add the transformer's border back
  }

  // Serialize the PDF and trigger a download
  return await pdfDoc.save();
}
