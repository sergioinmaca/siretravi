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
  carpaNombre: string;
  width?: number;
  height?: number;
  elementNumberOffset?: number;
  tipoContabilizacion?: 'cama' | 'elemento';
  occupiedBeds?: string[];
  bedOccupants?: Record<string, string[]>;
  literasCount?: number;
  individualesCount?: number;
  duplexCount?: number;
  disponiblesCarpa?: number;
}

const CroquisViewer = forwardRef<HTMLCanvasElement, CroquisViewerProps>(function CroquisViewer({ croquisData, carpaNombre, width = 700, height = 600, elementNumberOffset = 0, tipoContabilizacion = 'elemento', occupiedBeds = [], bedOccupants = {}, literasCount, individualesCount, duplexCount, disponiblesCarpa }, ref) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const bedsRenderRef = useRef<BedRenderInfo[]>([]);
  const [hoveredBed, setHoveredBed] = useState<HoveredBed | null>(null);

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

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let beds: PlacedBed[] = [];
    let rectangles: PlacedRectangle[] = [];
    let texts: PlacedText[] = [];

    try {
      const parsed = JSON.parse(croquisData);
      const rawObjects: Record<string, unknown>[] = parsed.objects || parsed.beds || [];
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

      const occupiedSet = new Set(occupiedBeds);
      const accumulator: BedRenderInfo[] = [];

      if (parsed.drawingBase64) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          drawRectangles(ctx, rectangles);
          drawTexts(ctx, texts);
          drawBedsWithNumbers(ctx, beds, elementNumberOffset, tipoContabilizacion, occupiedSet, accumulator);
          bedsRenderRef.current = accumulator;
        };
        img.src = parsed.drawingBase64;
        return;
      }
    } catch {
      // Si el JSON no parsea, dejamos canvas en blanco
    }

    const occupiedSet = new Set(occupiedBeds);
    const accumulator: BedRenderInfo[] = [];
    drawRectangles(ctx, rectangles);
    drawTexts(ctx, texts);
    drawBedsWithNumbers(ctx, beds, elementNumberOffset, tipoContabilizacion, occupiedSet, accumulator);
    bedsRenderRef.current = accumulator;
  }, [croquisData, elementNumberOffset, tipoContabilizacion, occupiedBeds]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    let found: HoveredBed | null = null;
    for (const bed of bedsRenderRef.current) {
      const dx = mouseX - bed.x;
      const dy = mouseY - bed.y;
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
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredBed(null);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-caracas-red rounded-full" />
        <h4 className="font-semibold text-gray-800">{carpaNombre}</h4>
      </div>
      {literasCount !== undefined && individualesCount !== undefined && duplexCount !== undefined && (
        <div className="flex items-center gap-4 text-sm text-gray-500 pl-5">
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
          {disponiblesCarpa !== undefined && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#6B7280]" />
              <span className="font-medium">{disponiblesCarpa}</span> Disponibles
            </span>
          )}
        </div>
      )}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="relative">
          <canvas
            ref={setCanvasRef}
            width={width}
            height={height}
            className="w-full block"
            style={{ imageRendering: 'auto' }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
          {hoveredBed && (
            <div
              className="absolute z-50 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
              style={{
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
  bedsRenderAccumulator: BedRenderInfo[] = []
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
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.save();
        ctx.clip();

        if (topOcc) {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(-w / 2, -h / 2, w, h / 2);
        }
        if (bottomOcc) {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(-w / 2, 0, w, h / 2);
        }

        ctx.restore();
      }
    } else if (occupiedNumbers.length > 0) {
      ctx.fillStyle = '#EF4444';
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

/** Utility: count how many elements a croquis contains (for offset chaining between carpas) */
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
