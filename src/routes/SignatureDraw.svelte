<script lang="ts">
  import { Button } from '$lib/components/ui/button';

  type SignatureDialogProps = {
    close: (dataUrl: string) => void;
  };

  let { close }: SignatureDialogProps = $props();

  let canvasContainerWidth = $state(0);
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

  $effect(() => {
    if (!canvas) return;

    if (canvas.width === 0) canvas.width = canvasContainerWidth;
  });

  function getOffset(event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      const { offsetX, offsetY } = event;
      return { offsetX, offsetY };
    } else if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      const rect = canvas!.getBoundingClientRect();
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top
      };
    }
    return { offsetX: 0, offsetY: 0 };
  }

  function startDrawing(event: MouseEvent | TouchEvent) {
    isDrawing = true;
    const { offsetX, offsetY } = getOffset(event);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  }

  function draw(event: MouseEvent | TouchEvent) {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getOffset(event);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  }

  function stopDrawing(event: MouseEvent | TouchEvent) {
    if (event.cancelable) event.preventDefault();
    isDrawing = false;
    close(canvas!.toDataURL()!);
  }

  function reset() {
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
  }
</script>

<div class="grid gap-2">
  <p class="text-sm">Draw your signature in the following field:</p>
  <div bind:clientWidth={canvasContainerWidth}>
    <canvas
      bind:this={canvas}
      width="0"
      height="150"
      class="bg-white border-border border rounded-md"
      onmousedown={startDrawing}
      onmousemove={draw}
      onmouseup={stopDrawing}
      onmouseleave={stopDrawing}
      ontouchstart={startDrawing}
      ontouchmove={draw}
      ontouchend={stopDrawing}
    >
    </canvas>
  </div>
  <Button onclick={reset} variant="ghost">Reset</Button>
</div>
