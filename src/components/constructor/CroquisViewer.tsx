import { useRef, useEffect } from 'react';

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

interface CroquisViewerProps {
  croquisData: string; // JSON serializado del editor
  carpaNombre: string;
  width?: number;
  height?: number;
  elementNumberOffset?: number; // Para numerar elementos de forma continua entre carpas
  tipoContabilizacion?: 'cama' | 'elemento';
}

export default function CroquisViewer({ croquisData, carpaNombre, width = 700, height = 400, elementNumberOffset = 0, tipoContabilizacion = 'elemento' }: CroquisViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let beds: PlacedBed[] = [];
    let rectangles: PlacedRectangle[] = [];

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

      // Restaurar el fondo (paredes dibujadas)
      if (parsed.drawingBase64) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          drawRectangles(ctx, rectangles);
          // Dibujar camas encima de rectángulos
          drawBedsWithNumbers(ctx, beds, elementNumberOffset, tipoContabilizacion);
        };
        img.src = parsed.drawingBase64;
        return; // onload se encargará de renderizar
      }
    } catch {
      // Si el JSON no parsea, dejamos canvas en blanco
    }

    // Si no hay drawingBase64, dibujar rectángulos y camas directamente
    drawRectangles(ctx, rectangles);
    drawBedsWithNumbers(ctx, beds, elementNumberOffset, tipoContabilizacion);
  }, [croquisData, elementNumberOffset, tipoContabilizacion]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 bg-caracas-red rounded-full" />
        <h4 className="font-semibold text-gray-800">{carpaNombre}</h4>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full block"
          style={{ imageRendering: 'auto' }}
        />
      </div>
      {/* Leyenda */}
      <div className="flex items-center gap-6 text-xs text-gray-500 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#3B82F6] inline-block" /> Litera (2 camas)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#10B981] inline-block" /> Individual
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#F59E0B] inline-block" /> Duplex (2 camas)
        </div>
      </div>
    </div>
  );
}

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

function drawBedsWithNumbers(ctx: CanvasRenderingContext2D, beds: PlacedBed[], offset: number, modo: 'cama' | 'elemento' = 'elemento') {
  let elementCounter = offset;

  beds.forEach(bed => {
    const w = bed.type === 'duplex' ? 50 : bed.type === 'litera' ? 36 : 28;
    const h = bed.type === 'litera' ? 52 : 36;
    const bgColor = bed.type === 'litera' ? '#3B82F6' : bed.type === 'individual' ? '#10B981' : '#F59E0B';

    ctx.save();
    ctx.translate(bed.x, bed.y);
    ctx.rotate((bed.rotation * Math.PI) / 180);

    // Sombra
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    // Cuerpo
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Borde blanco
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
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isHorizontal = bed.rotation === 90 || bed.rotation === 270;

    if (modo === 'cama') {
      // Por cama: litera/duplex suman 2 números
      if (bed.type === 'individual') {
        elementCounter++;
        ctx.fillText(String(elementCounter).padStart(3, '0'), 0, 0);
      } else {
        const num1 = elementCounter + 1;
        const num2 = elementCounter + 2;
        elementCounter += 2;
        if (isHorizontal) {
          ctx.fillText(String(num1).padStart(3, '0'), -10, 0);
          ctx.fillText(String(num2).padStart(3, '0'), 10, 0);
        } else {
          ctx.fillText(String(num1).padStart(3, '0'), 0, -10);
          ctx.fillText(String(num2).padStart(3, '0'), 0, 10);
        }
      }
    } else {
      // Por elemento (actual): 1 número por mueble
      elementCounter++;
      const num = String(elementCounter).padStart(3, '0');

      if (bed.type === 'litera') {
        // Litera: Colocamos el mismo número en ambas mitades
        if (isHorizontal) {
          ctx.fillText(num, -10, 0);
          ctx.fillText(num, 10, 0);
        } else {
          ctx.fillText(num, 0, -10);
          ctx.fillText(num, 0, 10);
        }
      } else {
        // Individual y Duplex: Un solo número en el centro
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
        return sum + (bed.type === 'individual' ? 1 : 2);
      }, 0);
    }
    return beds.length; // Cada mueble cuenta como 1 elemento
  } catch {
    return 0;
  }
}
