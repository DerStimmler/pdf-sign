<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  type SignatureDialogProps = {
    close: (dataUrl: string) => void;
  };

  let { close }: SignatureDialogProps = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let ctx = $derived.by(() => {
    if (!canvas) return new CanvasRenderingContext2D();
    const ctx = canvas.getContext('2d');

    if (!ctx) return new CanvasRenderingContext2D();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    return ctx;
  });
  let isDrawing = $state(false);

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
    close(canvas!.toDataURL()!);
  }

  function reset() {
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
  }
</script>

<div class="grid gap-2">
  <p class="text-sm">Draw your signature in the following field:</p>
  <canvas
    bind:this={canvas}
    width="500"
    height="200"
    class="bg-white border-border border rounded-md"
    onmousedown={startDrawing}
    onmousemove={draw}
    onmouseup={stopDrawing}
    onmouseleave={stopDrawing}
  >
  </canvas>
  <Button onclick={reset} variant="ghost">Reset</Button>
</div>
