import { useRef, useEffect, useState, useCallback, forwardRef } from 'react';

interface PlacedRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  id: string;
  texto?: string;
}

interface PlacedLine {
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotation: number;
  color: string;
  id: string;
}

interface PlacedText {
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  color: string;
  id: string;
}

interface ParsedData {
  drawingBase64: string | null;
  rectangles: PlacedRectangle[];
  lines: PlacedLine[];
  texts: PlacedText[];
}

interface PlanoGeneralViewerProps {
  croquisData: string;
  planoNombre: string;
  width?: number;
  height?: number;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;

const PlanoGeneralViewer = forwardRef<HTMLCanvasElement, PlanoGeneralViewerProps>(function PlanoGeneralViewer({ croquisData, planoNombre, width = 1100, height = 700 }, ref) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const parsedDataRef = useRef<ParsedData>({ drawingBase64: null, rectangles: [], lines: [], texts: [] });

  const [zoom, setZoom] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    internalCanvasRef.current = node;
    if (typeof ref === 'function') { ref(node); }
    else if (ref) { ref.current = node; }
  }, [ref]);

  useEffect(() => {
    parsedDataRef.current = parseData();
  }, [croquisData]);

  useEffect(() => {
    triggerRender();
  }, [zoom, offsetX, offsetY]);

  function parseData(): ParsedData {
    let drawingBase64: string | null = null;
    let rectangles: PlacedRectangle[] = [];
    let lines: PlacedLine[] = [];
    let texts: PlacedText[] = [];

    try {
      const parsed = JSON.parse(croquisData || '{}');
      const rawObjects: Record<string, unknown>[] = parsed.objects || [];
      drawingBase64 = parsed.drawingBase64 || null;

      rectangles = rawObjects
        .filter(o => o.kind === 'rectangle')
        .map(o => ({
          x: o.x as number,
          y: o.y as number,
          width: o.width as number,
          height: o.height as number,
          rotation: o.rotation as number,
          color: o.color as string,
          id: o.id as string,
          texto: o.texto as string | undefined,
        }));

      lines = rawObjects
        .filter(o => o.kind === 'line')
        .map(o => ({
          x: o.x as number,
          y: o.y as number,
          dx: o.dx as number,
          dy: o.dy as number,
          rotation: o.rotation as number,
          color: o.color as string,
          id: o.id as string,
        }));

      texts = rawObjects
        .filter(o => o.kind === 'text')
        .map(o => ({
          text: o.text as string,
          x: o.x as number,
          y: o.y as number,
          rotation: o.rotation as number,
          fontSize: o.fontSize as number,
          color: o.color as string,
          id: o.id as string,
        }));
    } catch {
      // blank
    }

    return { drawingBase64, rectangles, lines, texts };
  }

  function triggerRender() {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = parsedDataRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);

    if (data.drawingBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        drawRectangles(ctx, data.rectangles);
        drawLines(ctx, data.lines);
        drawTexts(ctx, data.texts);
        ctx.restore();
      };
      img.src = data.drawingBase64;
    } else {
      drawRectangles(ctx, data.rectangles);
      drawLines(ctx, data.lines);
      drawTexts(ctx, data.texts);
      ctx.restore();
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (zoom <= 1.0) return;
    isPanningRef.current = true;
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    panStartRef.current = {
      x: e.clientX * scaleX,
      y: e.clientY * scaleY,
      offsetX,
      offsetY
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanningRef.current) return;
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = e.clientX * scaleX - panStartRef.current.x;
    const dy = e.clientY * scaleY - panStartRef.current.y;
    setOffsetX(panStartRef.current.offsetX + dx);
    setOffsetY(panStartRef.current.offsetY + dy);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (zoom <= 1.0) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    isPanningRef.current = true;
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    panStartRef.current = {
      x: touch.clientX * scaleX,
      y: touch.clientY * scaleY,
      offsetX,
      offsetY
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPanningRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = touch.clientX * scaleX - panStartRef.current.x;
    const dy = touch.clientY * scaleY - panStartRef.current.y;
    setOffsetX(panStartRef.current.offsetX + dx);
    setOffsetY(panStartRef.current.offsetY + dy);
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const worldX = (screenX - offsetX) / zoom;
    const worldY = (screenY - offsetY) / zoom;
    const direction = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round((zoom + direction * ZOOM_STEP) * 10) / 10));
    if (newZoom === zoom) return;
    if (newZoom <= 1.0) {
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
    } else {
      setZoom(newZoom);
      setOffsetX(screenX - worldX * newZoom);
      setOffsetY(screenY - worldY * newZoom);
    }
  };

  const zoomIn = () => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldX = (centerX - offsetX) / zoom;
    const worldY = (centerY - offsetY) / zoom;
    const newZoom = Math.min(ZOOM_MAX, Math.round((zoom + ZOOM_STEP) * 10) / 10);
    setZoom(newZoom);
    setOffsetX(centerX - worldX * newZoom);
    setOffsetY(centerY - worldY * newZoom);
  };

  const zoomOut = () => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const worldX = (canvas.width / 2 - offsetX) / zoom;
    const worldY = (canvas.height / 2 - offsetY) / zoom;
    const newZoom = Math.max(ZOOM_MIN, Math.round((zoom - ZOOM_STEP) * 10) / 10);
    if (newZoom <= 1.0) {
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
    } else {
      setZoom(newZoom);
      setOffsetX(canvas.width / 2 - worldX * newZoom);
      setOffsetY(canvas.height / 2 - worldY * newZoom);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-caracas-red rounded-full" />
        <h4 className="font-semibold text-gray-800">{planoNombre}</h4>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <canvas
          ref={setCanvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className={`w-full block ${zoom > 1.0 ? 'cursor-grab' : 'cursor-default'}`}
          style={{ imageRendering: 'auto', touchAction: zoom > 1.0 ? 'none' : 'auto' }}
        />
        <div className="flex items-center gap-2 justify-center py-2 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="px-2 py-0.5 border rounded text-xs disabled:opacity-30 hover:bg-gray-200 transition-colors"
          >−</button>
          <span className="text-xs w-10 text-center text-gray-500">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="px-2 py-0.5 border rounded text-xs disabled:opacity-30 hover:bg-gray-200 transition-colors"
          >+</button>
        </div>
      </div>
    </div>
  );
});

export default PlanoGeneralViewer;

function drawRectangles(ctx: CanvasRenderingContext2D, rects: PlacedRectangle[]) {
  rects.forEach(rect => {
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.rotate((rect.rotation * Math.PI) / 180);

    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 4);
    ctx.fill();

    ctx.strokeStyle = rect.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (rect.texto) {
      const padding = 4;
      const availableW = rect.width - padding * 2;
      const availableH = rect.height - padding * 2;
      const isVertical = rect.height > rect.width;

      ctx.fillStyle = rect.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const words = rect.texto.split(' ');
      const MIN_FONT = 6;
      const MAX_FONT = 32;
      const lineHeightRatio = 1.3;

      let bestLines: string[] = [];
      let bestFontSize = MIN_FONT;

      for (let fontSize = MAX_FONT; fontSize >= MIN_FONT; fontSize -= 1) {
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const lineHeight = fontSize * lineHeightRatio;
        const maxLineW = isVertical ? availableH : availableW;

        const lines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          if (ctx.measureText(testLine).width <= maxLineW) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = words[i];
          }
        }
        if (currentLine) lines.push(currentLine);

        const totalH = lines.length * lineHeight;
        const maxTotalH = isVertical ? availableW : availableH;
        const allFit = lines.every(l => ctx.measureText(l).width <= maxLineW);

        if (totalH <= maxTotalH && allFit) {
          bestLines = lines;
          bestFontSize = fontSize;
          break;
        }
      }

      if (bestLines.length === 0) {
        bestFontSize = MIN_FONT;
        ctx.font = `bold ${MIN_FONT}px Inter, sans-serif`;
        const maxLineW = isVertical ? availableH : availableW;
        const lineHeight = MIN_FONT * lineHeightRatio;
        const lines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          if (ctx.measureText(testLine).width <= maxLineW) {
            currentLine = testLine;
          } else {
            if (lines.length * lineHeight + lineHeight <= (isVertical ? availableW : availableH)) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = currentLine + '...';
              break;
            }
          }
        }
        if (currentLine) lines.push(currentLine);
        bestLines = lines;
      }

      const lineHeight = bestFontSize * lineHeightRatio;
      const totalH = bestLines.length * lineHeight;

      if (isVertical) {
        ctx.save();
        ctx.rotate(-Math.PI / 2);
        ctx.font = `bold ${bestFontSize}px Inter, sans-serif`;
        const startY = -totalH / 2 + lineHeight / 2;
        for (let i = 0; i < bestLines.length; i++) {
          ctx.fillText(bestLines[i], 0, startY + i * lineHeight);
        }
        ctx.restore();
      } else {
        ctx.font = `bold ${bestFontSize}px Inter, sans-serif`;
        const startY = -totalH / 2 + lineHeight / 2;
        for (let i = 0; i < bestLines.length; i++) {
          ctx.fillText(bestLines[i], 0, startY + i * lineHeight);
        }
      }
    }

    ctx.restore();
  });
}

function drawLines(ctx: CanvasRenderingContext2D, lines: PlacedLine[]) {
  lines.forEach(l => {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(-l.dx, -l.dy);
    ctx.lineTo(l.dx, l.dy);
    ctx.strokeStyle = l.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  });
}

function drawTexts(ctx: CanvasRenderingContext2D, texts: PlacedText[]) {
  texts.forEach(t => {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  });
}
