<script lang="ts">
  type SignatureDialogProps = {
    close: (dataUrl: string) => void;
  }

  let { close }: SignatureDialogProps = $props();

  let isOpen = $state(false);
  let canvas: HTMLCanvasElement | undefined = $state();
  let ctx = $derived.by(() => {
    if(!canvas) return new CanvasRenderingContext2D();
    const ctx = canvas.getContext('2d');

    if(!ctx) return new CanvasRenderingContext2D();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    return ctx;
  });
  let isDrawing = $state(false);
  let signatureDataUrl: string | null = $state(null);

  function openPopup() {
    isOpen = true;
    signatureDataUrl = null; // Clear previous signature
  }

  function closePopup() {
    isOpen = false;
  }

  function startDrawing(event: MouseEvent) {
    isDrawing = true;
    const { offsetX, offsetY } = event;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  }

  function draw(event: MouseEvent) {
    if (!isDrawing) return;
    const { offsetX, offsetY } = event;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawing = false;
    signatureDataUrl = canvas?.toDataURL() ?? null;
  }

  function saveSignature() {
    if(signatureDataUrl)
      close(signatureDataUrl);

    closePopup();
  }

  function reset() {
    signatureDataUrl = null;
    ctx.clearRect(0,0, canvas!.width, canvas!.height);
  }
</script>

{#if isOpen}
    <div class="z-10 fixed inset-0 backdrop-blur backdrop-opacity-75 transition-[backdrop-filter]" aria-hidden="true">

    <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-black text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-fit">
          <div class="bg-black px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 class="text-base font-semibold leading-6" id="modal-title">Draw your signature</h3>
                <div class="mt-2">
                  <p class="text-sm">Draw your signature in the following field.</p>
                </div>
                <canvas bind:this={canvas} width="500" height="200" class="bg-white"
                        onmousedown={startDrawing}
                        onmousemove={draw}
                        onmouseup={stopDrawing}
                        onmouseleave={stopDrawing}></canvas>
              </div>
            </div>
          </div>
          <div class="bg-black px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-4">
            <button
              class="bg-indigo-500 hover:bg-indigo-600 transition-colors duration-300 font-bold py-2 px-4 rounded"
              onclick={saveSignature}>Save</button
            >
            <button
              class="bg-gray-600 hover:bg-gray-700 transition-colors duration-300 font-bold py-2 px-4 rounded"
              onclick={closePopup}>Cancel</button
            >
            <button
              class="bg-gray-600 hover:bg-gray-700 transition-colors duration-300 font-bold py-2 px-4 rounded"
              onclick={reset}>Reset</button
            >
          </div>
        </div>
      </div>
    </div>
    </div>
{/if}

<button onclick={openPopup}>Open Signature Popup</button>
