import { useRef, useEffect, useState, useCallback, forwardRef } from 'react';

interface PlacedBed {
  type: 'litera' | 'individual' | 'duplex';
  x: number;
  y: number;
  rotation: number;
  id: string;
}

interface PlacedRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
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

interface BedRenderInfo {
  numbers: string[];
  occupiedNumbers: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

interface HoveredBed {
  numbers: string[];
  occupiedNumbers: string[];
  x: number;
  y: number;
}

interface CroquisViewerProps {
  croquisData: string;
  moduloNombre: string;
  width?: number;
  height?: number;
  elementNumberOffset?: number;
  tipoContabilizacion?: 'cama' | 'elemento';
  occupiedBeds?: string[];
  bedOccupants?: Record<string, string[]>;
  literasCount?: number;
  individualesCount?: number;
  duplexCount?: number;
  disponiblesModulo?: number;
  bedColorMap?: Record<string, string>;
  portrait?: boolean;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;

const CroquisViewer = forwardRef<HTMLCanvasElement, CroquisViewerProps>(function CroquisViewer({ croquisData, moduloNombre, width = 700, height = 600, elementNumberOffset = 0, tipoContabilizacion = 'elemento', occupiedBeds = [], bedOccupants = {}, literasCount, individualesCount, duplexCount, disponiblesModulo, bedColorMap, portrait = false }, ref) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const bedsRenderRef = useRef<BedRenderInfo[]>([]);
  const [hoveredBed, setHoveredBed] = useState<HoveredBed | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const pinchRef = useRef({ dist: 0, zoom: 1, offsetX: 0, offsetY: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef(false);

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    internalCanvasRef.current = node;
    if (typeof ref === 'function') { ref(node); }
    else if (ref) { ref.current = node; }
  }, [ref]);

  useEffect(() => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let beds: PlacedBed[] = [];
    let rectangles: PlacedRectangle[] = [];
    let texts: PlacedText[] = [];
    let drawingBase64: string | null = null;

    try {
      const parsed = JSON.parse(croquisData);
      const rawObjects: Record<string, unknown>[] = parsed.objects || parsed.beds || [];
      drawingBase64 = parsed.drawingBase64 || null;
      beds = rawObjects
        .filter(o => o.kind === 'bed' || !o.kind)
        .map(o => ({
          type: (o.bedType as PlacedBed['type']) || (o.type as PlacedBed['type']) || 'individual',
          x: o.x as number,
          y: o.y as number,
          rotation: o.rotation as number,
          id: o.id as string,
        }));
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

    const occupiedSet = new Set(occupiedBeds);
    const accumulator: BedRenderInfo[] = [];

    const finishRender = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (portrait) { ctx.translate(width, 0); ctx.rotate(Math.PI / 2); }
      ctx.translate(offsetX, offsetY);
      ctx.scale(zoom, zoom);
      drawBedsWithNumbers(ctx, beds, elementNumberOffset, tipoContabilizacion, occupiedSet, accumulator, bedColorMap);
      drawRectangles(ctx, rectangles);
      drawTexts(ctx, texts);
      bedsRenderRef.current = accumulator;
    };

    if (drawingBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (portrait) { ctx.translate(width, 0); ctx.rotate(Math.PI / 2); }
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, 0, 0);
        drawBedsWithNumbers(ctx, beds, elementNumberOffset, tipoContabilizacion, occupiedSet, accumulator, bedColorMap);
        drawRectangles(ctx, rectangles);
        drawTexts(ctx, texts);
        bedsRenderRef.current = accumulator;
      };
      img.src = drawingBase64;
    } else {
      finishRender();
    }
  }, [croquisData, elementNumberOffset, tipoContabilizacion, occupiedBeds, zoom, offsetX, offsetY]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    let x: number, y: number;
    if (portrait) {
      x = sy;
      y = width - sx;
    } else {
      x = sx;
      y = sy;
    }
    return { wx: (x - offsetX) / zoom, wy: (y - offsetY) / zoom };
  }, [portrait, height, offsetX, offsetY, zoom]);


  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const dx = (e.clientX - panStartRef.current.x) * scaleX;
      const dy = (e.clientY - panStartRef.current.y) * scaleY;
      if (portrait) {
        setOffsetX(panStartRef.current.offsetX + dy);
        setOffsetY(panStartRef.current.offsetY - dx);
      } else {
        setOffsetX(panStartRef.current.offsetX + dx);
        setOffsetY(panStartRef.current.offsetY + dy);
      }
      return;
    }

    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const { wx: worldX, wy: worldY } = screenToWorld(mouseX, mouseY);

    let found: HoveredBed | null = null;
    for (const bed of bedsRenderRef.current) {
      const dx = worldX - bed.x;
      const dy = worldY - bed.y;
      const angle = (bed.rotation * Math.PI) / 180;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      if (Math.abs(localX) <= bed.w / 2 && Math.abs(localY) <= bed.h / 2) {
        if (bed.occupiedNumbers.length > 0) {
          found = {
            numbers: bed.numbers,
            occupiedNumbers: bed.occupiedNumbers,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
        }
        break;
      }
    }
    setHoveredBed(found);
  }, [zoom, offsetX, offsetY]);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredBed(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (zoom <= 1.0) return;
    isPanningRef.current = true;
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    panStartRef.current = {
      x: e.clientX * (canvas.width / rect.width),
      y: e.clientY * (canvas.height / rect.height),
      offsetX,
      offsetY
    };
  }, [zoom, offsetX, offsetY]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const getTouchCenter = (touches: React.TouchList) => {
    const t0 = touches[0];
    const t1 = touches[1];
    return { cx: (t0.clientX + t1.clientX) / 2, cy: (t0.clientY + t1.clientY) / 2 };
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (zoom <= 1.0 && e.touches.length < 2) {
      if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        longPressTimerRef.current = setTimeout(() => {
          isLongPressActiveRef.current = true;
          const canvas = internalCanvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          isPanningRef.current = true;
          panStartRef.current = {
            x: touch.clientX * (canvas.width / rect.width),
            y: touch.clientY * (canvas.height / rect.height),
            offsetX,
            offsetY
          };
        }, 1500);
      }
      return;
    }
    e.preventDefault();
    const canvas = internalCanvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      pinchRef.current = { dist, zoom, offsetX, offsetY };
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      isPanningRef.current = true;
      panStartRef.current = {
        x: touch.clientX * (canvas.width / rect.width),
        y: touch.clientY * (canvas.height / rect.height),
        offsetX,
        offsetY
      };
    }
  }, [zoom, offsetX, offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current && !isLongPressActiveRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      return;
    }
    e.preventDefault();
    const canvas = internalCanvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 2) {
      const p = pinchRef.current;
      const newDist = getTouchDistance(e.touches);
      const { cx, cy } = getTouchCenter(e.touches);
      const rect = canvas.getBoundingClientRect();
      const canvasX = (cx - rect.left) * (canvas.width / rect.width);
      const canvasY = (cy - rect.top) * (canvas.height / rect.height);
      const rx = portrait ? canvasY : canvasX;
      const ry = portrait ? width - canvasX : canvasY;
      const scale = newDist / p.dist;
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, p.zoom * scale));
      const newOffsetX = rx - (rx - p.offsetX) * (newZoom / p.zoom);
      const newOffsetY = ry - (ry - p.offsetY) * (newZoom / p.zoom);
      if (newZoom <= 1.0) {
        setZoom(1.0);
        setOffsetX(0);
        setOffsetY(0);
      } else {
        setZoom(newZoom);
        setOffsetX(newOffsetX);
        setOffsetY(newOffsetY);
      }
    } else if (e.touches.length === 1 && isPanningRef.current) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const sx = touch.clientX * (canvas.width / rect.width);
      const sy = touch.clientY * (canvas.height / rect.height);
      const dx = sx - panStartRef.current.x;
      const dy = sy - panStartRef.current.y;
      if (portrait) {
        setOffsetX(panStartRef.current.offsetX + dy);
        setOffsetY(panStartRef.current.offsetY - dx);
      } else {
        setOffsetX(panStartRef.current.offsetX + dx);
        setOffsetY(panStartRef.current.offsetY + dy);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      isPanningRef.current = false;
      return;
    }
    if (e.touches.length === 0) {
      isPanningRef.current = false;
    } else if (e.touches.length === 1 && zoom > 1.0) {
      isPanningRef.current = true;
      const touch = e.touches[0];
      const canvas = internalCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      panStartRef.current = {
        x: touch.clientX * (canvas.width / rect.width),
        y: touch.clientY * (canvas.height / rect.height),
        offsetX,
        offsetY
      };
    }
  }, [offsetX, offsetY]);

  const zoomIn = useCallback(() => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const worldX = (-offsetX) / zoom;
    const worldY = (-offsetY) / zoom;
    const newZoom = Math.min(ZOOM_MAX, Math.round((zoom + ZOOM_STEP) * 10) / 10);
    setZoom(newZoom);
    setOffsetX(-worldX * newZoom);
    setOffsetY(-worldY * newZoom);
  }, [zoom, offsetX, offsetY]);

  const zoomOut = useCallback(() => {
    const worldX = (-offsetX) / zoom;
    const worldY = (-offsetY) / zoom;
    const newZoom = Math.max(ZOOM_MIN, Math.round((zoom - ZOOM_STEP) * 10) / 10);
    if (newZoom <= 1.0) {
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
    } else {
      setZoom(newZoom);
      setOffsetX(-worldX * newZoom);
      setOffsetY(-worldY * newZoom);
    }
  }, [zoom, offsetX, offsetY]);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-caracas-red rounded-full" />
        <h4 className="font-semibold text-gray-800">{moduloNombre}</h4>
      </div>
      {literasCount !== undefined && individualesCount !== undefined && duplexCount !== undefined && (
        <div className="grid grid-cols-2 md:flex md:items-center gap-x-0 gap-y-1 text-sm text-gray-500 md:pl-5 max-md:pl-0 [&>*:nth-child(even)]:-ml-2.5">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#3B82F6]" />
            <span className="font-medium">{literasCount}</span> Literas
            <span className="text-xs text-gray-400">
              {tipoContabilizacion === 'cama' ? `(${literasCount * 2} camas)` : `(${literasCount} elem.)`}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#10B981]" />
            <span className="font-medium">{individualesCount}</span> Individuales
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F59E0B]" />
            <span className="font-medium">{duplexCount}</span> Duplex
          </span>
          {disponiblesModulo !== undefined && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#6B7280]" />
              <span className="font-medium">{disponiblesModulo}</span> Disponibles
            </span>
          )}
        </div>
      )}
      <div className="box-border border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white" style={portrait ? { width: '92vw', height: '550px' } : undefined}>
        <div className="relative">
          <canvas
            ref={setCanvasRef}
            width={width}
            height={height}
            className={`block ${zoom > 1.0 ? 'cursor-grab' : 'cursor-default'}`}
            style={{ width: '100%', height: '100%', maxWidth: '100%', boxSizing: 'border-box', imageRendering: 'auto', touchAction: 'none' }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          {hoveredBed && (
            <div
              className="absolute z-50 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
              style={portrait ? {
                left: hoveredBed.y,
                top: hoveredBed.x + 12,
                transform: 'rotate(90deg)',
                transformOrigin: '0 0',
              } : {
                left: hoveredBed.x + 12,
                top: hoveredBed.y,
                transform: 'translateX(-50%) translateY(calc(-100% - 5px))',
              }}
            >
              {hoveredBed.numbers.map(num => {
                const occupants = hoveredBed.occupiedNumbers.includes(num) ? (bedOccupants[num] || []) : [];
                return (
                  <div key={num} className="border-b border-gray-700 last:border-0 py-0.5">
                    <div className="font-semibold text-white/80">Cama {num}</div>
                    {occupants.length > 0 ? occupants.map((name, i) => (
                      <div key={i} className="pl-2 text-white">{name}</div>
                    )) : (
                      <div className="pl-2 text-gray-400">Libre</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {zoom !== 1.0 && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 justify-center py-2 bg-gray-50/90 z-10">
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
          )}
        </div>
      </div>
    </div>
  );
});

export default CroquisViewer;

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

function drawBedsWithNumbers(
  ctx: CanvasRenderingContext2D,
  beds: PlacedBed[],
  offset: number,
  modo: 'cama' | 'elemento' = 'elemento',
  occupiedBedsSet: Set<string> = new Set(),
  bedsRenderAccumulator: BedRenderInfo[] = [],
  bedColorMap?: Record<string, string>
) {
  let elementCounter = offset;

  beds.forEach(bed => {
    const w = bed.type === 'duplex' ? 50 : bed.type === 'litera' ? 36 : 28;
    const h = bed.type === 'litera' ? 52 : 36;
    const bgColor = bed.type === 'litera' ? '#3B82F6' : bed.type === 'individual' ? '#10B981' : '#F59E0B';

    let actualNumbers: string[] = [];

    if (modo === 'cama') {
      if (bed.type === 'individual' || bed.type === 'duplex') {
        elementCounter++;
        actualNumbers = [String(elementCounter).padStart(3, '0')];
      } else {
        actualNumbers = [
          String(elementCounter + 1).padStart(3, '0'),
          String(elementCounter + 2).padStart(3, '0'),
        ];
        elementCounter += 2;
      }
    } else {
      elementCounter++;
      actualNumbers = [String(elementCounter).padStart(3, '0')];
    }

    const occupiedNumbers = actualNumbers.filter(n => occupiedBedsSet.has(n));

    bedsRenderAccumulator.push({
      numbers: actualNumbers,
      occupiedNumbers,
      x: bed.x,
      y: bed.y,
      w,
      h,
      rotation: bed.rotation,
    });

    ctx.save();
    ctx.translate(bed.x, bed.y);
    ctx.rotate((bed.rotation * Math.PI) / 180);

    // Sombra
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Fondo base (color tipo)
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.shadowColor = 'transparent';

      // Para litera en modo cama: pintar cada mitad independientemente
    if (modo === 'cama' && bed.type === 'litera') {
      const topOcc = occupiedNumbers.includes(actualNumbers[0]);
      const bottomOcc = occupiedNumbers.includes(actualNumbers[1]);

      if (topOcc || bottomOcc) {
        const swapped = bed.rotation === 90 || bed.rotation === 180;
        const topY = swapped ? 0 : -h / 2;
        const topH = swapped ? h / 2 : h / 2;
        const bottomY = swapped ? -h / 2 : 0;
        const bottomH = swapped ? h / 2 : h / 2;

        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.save();
        ctx.clip();

        if (topOcc) {
          ctx.fillStyle = bedColorMap?.[actualNumbers[0]] || '#EF4444';
          ctx.fillRect(-w / 2, topY, w, topH);
        }
        if (bottomOcc) {
          ctx.fillStyle = bedColorMap?.[actualNumbers[1]] || '#EF4444';
          ctx.fillRect(-w / 2, bottomY, w, bottomH);
        }

        ctx.restore();
      }
    } else if (occupiedNumbers.length > 0) {
      ctx.fillStyle = bedColorMap?.[occupiedNumbers[0]] || '#EF4444';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill();
    }

    // Borde: blanco siempre
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Divisoria de litera
    if (bed.type === 'litera') {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, 0);
      ctx.lineTo(w / 2 - 4, 0);
      ctx.stroke();
    }

    // Desrotar para dibujar textos siempre legibles
    ctx.rotate(-(bed.rotation * Math.PI) / 180);
    const isHorizontal = bed.rotation === 90 || bed.rotation === 270;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = isHorizontal
      ? 'normal 12.5px Inter, sans-serif'
      : 'normal 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (modo === 'cama') {
      const num1 = actualNumbers[0];
      if (bed.type === 'individual' || bed.type === 'duplex') {
        ctx.fillText(num1, 0, 0);
      } else {
        const num2 = actualNumbers[1];
        if (isHorizontal) {
          ctx.fillText(num1, -13, 0);
          ctx.fillText(num2, 14, 0);
        } else {
          ctx.fillText(num1, 0, -12);
          ctx.fillText(num2, 0, 12);
        }
      }
    } else {
      const num = actualNumbers[0];
      if (bed.type === 'litera') {
        if (isHorizontal) {
          ctx.fillText(num, -10, 0);
          ctx.fillText(num, 10, 0);
        } else {
          ctx.fillText(num, 0, -10);
          ctx.fillText(num, 0, 10);
        }
      } else {
        ctx.fillText(num, 0, 0);
      }
    }

    ctx.restore();
  });
}

/** Utility: count how many elements a croquis contains (for offset chaining between modulos) */
export function countElements(croquisData: string, modo: 'cama' | 'elemento' = 'elemento'): number {
  try {
    const parsed = JSON.parse(croquisData);
    const rawObjects: Record<string, unknown>[] = parsed.objects || parsed.beds || [];
    const beds = rawObjects
      .filter(o => o.kind === 'bed' || !o.kind)
      .map(o => ({
        type: (o.bedType as PlacedBed['type']) || (o.type as PlacedBed['type']) || 'individual',
      }));
    if (modo === 'cama') {
      return beds.reduce((sum, bed) => {
        return sum + (bed.type === 'litera' ? 2 : 1);
      }, 0);
    }
    return beds.length;
  } catch {
    return 0;
  }
}

export function contarTiposDesdeCroquis(croquisData: string): { literas: number; individuales: number; duplex: number } {
  try {
    const parsed = JSON.parse(croquisData || '{}');
    const rawObjects: Record<string, unknown>[] = parsed.objects || parsed.beds || [];
    const beds = rawObjects
      .filter(o => o.kind === 'bed' || !o.kind)
      .map(o => ({
        type: (o.bedType as string) || (o.type as string) || 'individual',
      }));
    return {
      literas: beds.filter(b => b.type === 'litera').length,
      individuales: beds.filter(b => b.type === 'individual').length,
      duplex: beds.filter(b => b.type === 'duplex').length,
    };
  } catch {
    return { literas: 0, individuales: 0, duplex: 0 };
  }
}
