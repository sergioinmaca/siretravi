import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Square, Eraser, Undo2, BedDouble, BedSingle, MousePointer2, RotateCw, Trash2, XCircle, Copy, Clipboard, Link, Unlink, Type, Grid3x3 } from 'lucide-react';

type Tool = 'select' | 'pencil' | 'rectangle' | 'eraser' | 'litera' | 'individual' | 'duplex' | 'text';

type CanvasObject = {
  kind: 'bed';
  id: string;
  x: number;
  y: number;
  rotation: number;
  groupId?: string;
  bedType: 'litera' | 'individual' | 'duplex';
} | {
  kind: 'rectangle';
  id: string;
  x: number;
  y: number;
  rotation: number;
  groupId?: string;
  width: number;
  height: number;
  color: string;
} | {
  kind: 'text';
  id: string;
  x: number;
  y: number;
  rotation: number;
  groupId?: string;
  text: string;
  fontSize: number;
  color: string;
};

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

interface CroquisEditorProps {
  width?: number;
  height?: number;
  maxLiteras?: number;
  maxIndividuales?: number;
  maxDuplex?: number;
  tipoContabilizacion?: 'cama' | 'elemento';
  initialData?: string;
  onChange?: (data: string) => void;
}

export default function CroquisEditor({ width = 700, height = 400, maxLiteras = 0, maxIndividuales = 0, maxDuplex = 0, tipoContabilizacion = 'elemento', initialData, onChange }: CroquisEditorProps) {
  // Bandera: el canvas está listo para ser renderizado
  const isInitialized = useRef(false);
  // Capturamos initialData en un ref al momento del montaje.
  // Esto evita que cualquier cambio posterior de la prop (causado por onChange -> updateCarpa)
  // vuelva a disparar el effect de inicialización y cree un bucle infinito.
  const initialDataRef = useRef(initialData);
  // Ref para onChange: permite que el effect de serialización use siempre la versión
  // más reciente del callback sin tenerlo como dependencia reactiva.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  // Ref para tipoContabilizacion: se sincroniza en cada render para que renderCanvas
  // siempre lea el valor actual sin necesidad de recrear la función.
  const tipoContabilizacionRef = useRef(tipoContabilizacion);
  useEffect(() => { tipoContabilizacionRef.current = tipoContabilizacion; });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#374151');
  const lineWidth = 3;

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<ImageData[]>([]);

  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clipboard state
  const [clipboard, setClipboard] = useState<CanvasObject[]>([]);
  const [pasteOffset, setPasteOffset] = useState(0);

  // Grid
  const [showGrid, setShowGrid] = useState(true);

  // Interaction state
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({ startX: 0, startY: 0, endX: 0, endY: 0, active: false });
  const [isDraggingObjects, setIsDraggingObjects] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [objectsBeforeDrag, setObjectsBeforeDrag] = useState<CanvasObject[]>([]);

  const getOffCtx = useCallback(() => {
    const offscreen = offscreenRef.current;
    if (!offscreen) return null;
    return offscreen.getContext('2d');
  }, []);

  // Guardar snapshot del canvas (solo fondo/paredes, SIN camas) en el historial
  const saveSnapshot = useCallback(() => {
    const offCtx = getOffCtx();
    if (!offCtx) return;
    const offscreen = offscreenRef.current;
    if (!offscreen) return;
    const data = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    setHistory(prev => [...prev.slice(-20), data]);
  }, [getOffCtx]);

  // ─── Inicialización única al montar ────────────────────────────────────────
  // Se usa initialDataRef (no la prop directamente) para que este effect NUNCA
  // se re-ejecute cuando el padre actualice initialData vía onChange → updateCarpa.
  // Sin esto se forma un bucle: img.onload → setBeds → onChange → initialData cambia
  // → effect vuelve a correr → img.onload → ... infinito.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const data = initialDataRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crear offscreen canvas para la capa de dibujo (sin camas)
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    offscreenRef.current = offscreen;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const initBlank = () => {
      offCtx.fillStyle = '#FFFFFF';
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveSnapshot();
      isInitialized.current = true;
    };

    if (!data) {
      // Canvas en blanco (modo creación)
      initBlank();
      return;
    }

    // Modo edición: cargar el croquis guardado
    isInitialized.current = false;
    try {
      const parsed = JSON.parse(data);
      const savedObjects: CanvasObject[] = parsed.objects || [];

      if (parsed.drawingBase64) {
        const img = new Image();
        img.onload = () => {
          offCtx.fillStyle = '#FFFFFF';
          offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
          offCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveSnapshot();
          setObjects(savedObjects);
          isInitialized.current = true;
        };
        img.onerror = () => {
          initBlank();
          setObjects(savedObjects);
        };
        img.src = parsed.drawingBase64;
      } else {
        initBlank();
        setObjects(savedObjects);
      }
    } catch {
      initBlank();
    }
  }, []);

  const getObjectDimensions = (obj: CanvasObject) => {
    if (obj.kind === 'bed') {
      const w = obj.bedType === 'duplex' ? 50 : obj.bedType === 'litera' ? 36 : 28;
      const h = obj.bedType === 'litera' ? 52 : 36;
      return { w, h };
    }
    if (obj.kind === 'text') {
      const approxW = obj.text.length * obj.fontSize * 0.55;
      return { w: approxW, h: obj.fontSize * 1.4 };
    }
    return { w: obj.width, h: obj.height };
  };

  const isPointInObject = (x: number, y: number, obj: CanvasObject) => {
    const { w, h } = getObjectDimensions(obj);
    const maxDim = Math.max(w, h) / 2;
    return (x >= obj.x - maxDim && x <= obj.x + maxDim && y >= obj.y - maxDim && y <= obj.y + maxDim);
  };

  const isObjectInSelectionBox = (obj: CanvasObject, box: SelectionBox) => {
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);
    return obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY;
  };

  // Dibujar grid de referencia
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!showGrid) return;
    const step = 25;
    ctx.save();
    for (let x = 0; x <= w; x += step) {
      const isMajor = x % 100 === 0;
      ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = isMajor ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      const isMajor = y % 100 === 0;
      ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = isMajor ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }, [showGrid]);

  // Renderizar
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const offscreen = offscreenRef.current;
    if (!offscreen) return;

    // Restaurar la capa de dibujo desde el offscreen canvas (SIN camas)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0);
    drawGrid(ctx, canvas.width, canvas.height);

    let objectCounter = 0;

    objects.forEach(obj => {
      ctx.save();
      const { w, h } = getObjectDimensions(obj);
      const isSelected = selectedIds.includes(obj.id);

      ctx.translate(obj.x, obj.y);
      ctx.rotate((obj.rotation * Math.PI) / 180);

      if (obj.kind === 'bed') {
        const bgColor = obj.bedType === 'litera' ? '#3B82F6' : obj.bedType === 'individual' ? '#10B981' : '#F59E0B';

        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        if (isSelected && !obj.groupId) {
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
          ctx.setLineDash([]);
        }

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (obj.bedType === 'litera') {
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 4, 0);
          ctx.lineTo(w / 2 - 4, 0);
          ctx.stroke();
        }

        ctx.rotate(-(obj.rotation * Math.PI) / 180);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal 17px Inter, sans-serif';

        if (tipoContabilizacionRef.current === 'cama') {
          if (obj.bedType === 'individual' || obj.bedType === 'duplex') {
            objectCounter++;
            ctx.fillText(String(objectCounter).padStart(2, '0'), 0, 0);
          } else {
            const num1 = objectCounter + 1;
            const num2 = objectCounter + 2;
            objectCounter += 2;
            const isHorizontal = obj.rotation === 90 || obj.rotation === 270;
            if (isHorizontal) {
              ctx.fillText(String(num1).padStart(2, '0'), -14, 0);
              ctx.fillText(String(num2).padStart(2, '0'), 14, 0);
            } else {
              ctx.fillText(String(num1).padStart(2, '0'), 0, -14);
              ctx.fillText(String(num2).padStart(2, '0'), 0, 14);
            }
          }
        } else {
          objectCounter++;
          const objNumber = objectCounter;
          if (obj.bedType === 'litera') {
            const isHorizontal = obj.rotation === 90 || obj.rotation === 270;
            if (isHorizontal) {
              ctx.fillText(String(objNumber).padStart(2, '0'), -14, 0);
              ctx.fillText(String(objNumber).padStart(2, '0'), 14, 0);
            } else {
              ctx.fillText(String(objNumber).padStart(2, '0'), 0, -14);
              ctx.fillText(String(objNumber).padStart(2, '0'), 0, 14);
            }
          } else {
            ctx.fillText(String(objNumber).padStart(2, '0'), 0, 0);
          }
        }
      } else if (obj.kind === 'text') {
        ctx.rotate(-(obj.rotation * Math.PI) / 180);
        ctx.fillStyle = obj.color;
        ctx.font = `bold ${obj.fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.text, 0, 0);

        if (isSelected && !obj.groupId) {
          const tw = ctx.measureText(obj.text).width;
          const th = obj.fontSize * 1.4;
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-tw / 2 - 6, -th / 2 - 4, tw + 12, th + 8);
          ctx.setLineDash([]);
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.fill();

        ctx.strokeStyle = obj.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isSelected && !obj.groupId) {
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    });

    // Dibujar cuadros delimitadores para grupos seleccionados
    const selectedGroupIds = new Set(
      objects.filter(o => selectedIds.includes(o.id) && o.groupId).map(o => o.groupId)
    );

    selectedGroupIds.forEach(groupId => {
      if (!groupId) return;
      const groupObjects = objects.filter(o => o.groupId === groupId);
      if (groupObjects.length === 0) return;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      groupObjects.forEach(o => {
        const { w, h } = getObjectDimensions(o);
        const maxDim = Math.max(w, h) / 2 + 8;
        if (o.x - maxDim < minX) minX = o.x - maxDim;
        if (o.x + maxDim > maxX) maxX = o.x + maxDim;
        if (o.y - maxDim < minY) minY = o.y - maxDim;
        if (o.y + maxDim > maxY) maxY = o.y + maxDim;
      });

      ctx.save();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

      // Dibujar pequeño indicador de grupo
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(minX - 1.25, minY - 16, 46, 16);
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GRUPO', minX + 21.75, minY - 8);

      ctx.restore();
    });

    // Dibujar caja de selección (si está activa)
    if (selectionBox.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const rectX = Math.min(selectionBox.startX, selectionBox.endX);
      const rectY = Math.min(selectionBox.startY, selectionBox.endY);
      const rectW = Math.abs(selectionBox.endX - selectionBox.startX);
      const rectH = Math.abs(selectionBox.endY - selectionBox.startY);

      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.restore();
    }

  }, [objects, history, selectedIds, selectionBox, drawGrid]);

  useEffect(() => {
    // No renderizar hasta que la inicialización (sync o async) haya terminado
    if (!isInitialized.current) return;
    renderCanvas();
  }, [renderCanvas]);

  // Re-renderizar cuando cambie el modo de contabilización
  useEffect(() => {
    if (!isInitialized.current) return;
    renderCanvas();
  }, [tipoContabilizacion]);

  // Serializar datos (solo cuando objects o history cambian realmente)
  useEffect(() => {
    if (!onChangeRef.current) return;
    const offscreen = offscreenRef.current;
    if (!offscreen) return;

    const drawingBase64 = offscreen.toDataURL('image/png');
    const serialized = JSON.stringify({ drawingBase64, objects });
    onChangeRef.current(serialized);
  }, [objects, history]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);

    if (tool === 'select') {
      const clickedObj = [...objects].reverse().find(o => isPointInObject(pos.x, pos.y, o));

      if (clickedObj) {
        const idsToSelect = clickedObj.groupId
          ? objects.filter(o => o.groupId === clickedObj.groupId).map(o => o.id)
          : [clickedObj.id];

        if (!selectedIds.includes(clickedObj.id)) {
          if (e.shiftKey) {
            setSelectedIds(prev => Array.from(new Set([...prev, ...idsToSelect])));
          } else {
            setSelectedIds(idsToSelect);
          }
        } else if (e.shiftKey) {
          setSelectedIds(prev => prev.filter(id => !idsToSelect.includes(id)));
          return;
        }

        setIsDraggingObjects(true);
        setDragStartPos(pos);
        setObjectsBeforeDrag([...objects]);
      } else {
        if (!e.shiftKey) setSelectedIds([]);
        setSelectionBox({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y, active: true });
      }
      return;
    }

    if (tool === 'litera' || tool === 'individual' || tool === 'duplex') {
      const currentCount = objects.filter(o => o.kind === 'bed' && o.bedType === tool).length;
      const limit = tool === 'litera' ? maxLiteras : tool === 'individual' ? maxIndividuales : maxDuplex;

      if (currentCount >= limit) return;

      const newObj: CanvasObject = {
        kind: 'bed',
        bedType: tool,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        id: `bed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      };
      setObjects(prev => [...prev, newObj]);
      setSelectedIds([newObj.id]);
      return;
    }

    if (tool === 'text') {
      const texto = window.prompt('Ingresa el texto:');
      if (texto && texto.trim()) {
        const newObj: CanvasObject = {
          kind: 'text',
          text: texto.trim(),
          fontSize: 14,
          color: color,
          x: pos.x,
          y: pos.y,
          rotation: 0,
          id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        };
        setObjects(prev => [...prev, newObj]);
        setSelectedIds([newObj.id]);
      }
      return;
    }

    if (tool === 'rectangle') {
      setIsDrawing(true);
      setStartPos(pos);
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      const offCtx = getOffCtx();
      if (offCtx) {
        offCtx.beginPath();
        offCtx.moveTo(pos.x, pos.y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);

    if (tool === 'select') {
      if (isDraggingObjects) {
        let dx = pos.x - dragStartPos.x;
        let dy = pos.y - dragStartPos.y;

        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) {
            dy = 0;
          } else {
            dx = 0;
          }
        }

        setObjects(objectsBeforeDrag.map(o => {
          if (selectedIds.includes(o.id)) {
            return { ...o, x: o.x + dx, y: o.y + dy };
          }
          return o;
        }));
      } else if (selectionBox.active) {
        setSelectionBox(prev => ({ ...prev, endX: pos.x, endY: pos.y }));
      }
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'pencil') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      const offCtx = getOffCtx();
      if (offCtx) {
        offCtx.strokeStyle = color;
        offCtx.lineWidth = lineWidth;
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';
        offCtx.lineTo(pos.x, pos.y);
        offCtx.stroke();
      }
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = lineWidth * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      const offCtx = getOffCtx();
      if (offCtx) {
        offCtx.strokeStyle = '#FFFFFF';
        offCtx.lineWidth = lineWidth * 4;
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';
        offCtx.lineTo(pos.x, pos.y);
        offCtx.stroke();
      }
    } else if (tool === 'rectangle') {
      const offscreen = offscreenRef.current;
      if (offscreen) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreen, 0, 0);
      }
      drawGrid(ctx, canvas.width, canvas.height);
      objects.forEach(obj => {
        ctx.save();
        const { w, h } = getObjectDimensions(obj);
        ctx.translate(obj.x, obj.y);
        ctx.rotate((obj.rotation * Math.PI) / 180);
        if (obj.kind === 'bed') {
          const bgColor = obj.bedType === 'litera' ? '#3B82F6' : obj.bedType === 'individual' ? '#10B981' : '#F59E0B';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 4);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (obj.bedType === 'litera') {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.moveTo(-w / 2 + 4, 0);
            ctx.lineTo(w / 2 - 4, 0);
            ctx.stroke();
          }
        } else if (obj.kind === 'text') {
          ctx.rotate(-(obj.rotation * Math.PI) / 180);
          ctx.fillStyle = obj.color;
          ctx.font = `bold ${obj.fontSize}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.text, 0, 0);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 4);
          ctx.fill();
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);

    if (tool === 'select') {
      if (isDraggingObjects) {
        setIsDraggingObjects(false);
      } else if (selectionBox.active) {
        const box = { ...selectionBox };
        setSelectionBox(prev => ({ ...prev, active: false }));

        const objectsInBox = objects.filter(o => isObjectInSelectionBox(o, box));
        if (objectsInBox.length > 0) {
          setSelectedIds(prev => {
            let newIds: string[] = [];
            objectsInBox.forEach(o => {
              if (o.groupId) {
                newIds.push(...objects.filter(obj => obj.groupId === o.groupId).map(obj => obj.id));
              } else {
                newIds.push(o.id);
              }
            });
            return Array.from(new Set([...prev, ...newIds]));
          });
        }
      }
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (tool === 'rectangle') {
        const rectW = Math.abs(pos.x - startPos.x);
        const rectH = Math.abs(pos.y - startPos.y);
        if (rectW > 2 && rectH > 2) {
          const newObj: CanvasObject = {
            kind: 'rectangle',
            x: (startPos.x + pos.x) / 2,
            y: (startPos.y + pos.y) / 2,
            width: rectW,
            height: rectH,
            color: color,
            rotation: 0,
            id: `rect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          };
          setObjects(prev => [...prev, newObj]);
          setSelectedIds([newObj.id]);
        }
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    const clickedObj = [...objects].reverse().find(o => isPointInObject(pos.x, pos.y, o));
    if (clickedObj && clickedObj.kind === 'text') {
      const nuevoTexto = window.prompt('Editar texto:', clickedObj.text);
      if (nuevoTexto !== null) {
        setObjects(prev => prev.map(o =>
          o.id === clickedObj.id && o.kind === 'text'
            ? { ...o, text: nuevoTexto.trim() || o.text }
            : o
        ));
      }
    }
  };

  const rotateSelected = () => {
    if (selectedIds.length === 0) return;

    setObjects(prev => {
      const selected = prev.filter(o => selectedIds.includes(o.id));

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      selected.forEach(o => {
        if (o.x < minX) minX = o.x;
        if (o.x > maxX) maxX = o.x;
        if (o.y < minY) minY = o.y;
        if (o.y > maxY) maxY = o.y;
      });
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      return prev.map(o => {
        if (selectedIds.includes(o.id)) {
          const newX = cx - (o.y - cy);
          const newY = cy + (o.x - cx);
          return { ...o, x: newX, y: newY, rotation: (o.rotation + 90) % 360 };
        }
        return o;
      });
    });
  };

  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const newGroupId = `group-${Date.now()}`;
    setObjects(prev => prev.map(o =>
      selectedIds.includes(o.id) ? { ...o, groupId: newGroupId } : o
    ));
  };

  const ungroupSelected = () => {
    if (selectedIds.length === 0) return;
    setObjects(prev => prev.map(o =>
      selectedIds.includes(o.id) ? { ...o, groupId: undefined } : o
    ));
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    setObjects(prev => prev.filter(o => !selectedIds.includes(o.id)));
    setSelectedIds([]);
  };

  const copySelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = objects.filter(o => selectedIds.includes(o.id));
    setClipboard(selected);
    setPasteOffset(0);
  }, [objects, selectedIds]);

  const pasteClipboard = useCallback(() => {
    if (clipboard.length === 0) return;

    const PASTE_DELTA = 20;
    const newOffset = pasteOffset + PASTE_DELTA;

    const groupIdMap = new Map<string, string>();
    const newObjects: CanvasObject[] = [];

    clipboard.forEach(o => {
      let newGroupId = undefined;
      if (o.groupId) {
        if (!groupIdMap.has(o.groupId)) {
          groupIdMap.set(o.groupId, `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        }
        newGroupId = groupIdMap.get(o.groupId);
      }

      const prefix = o.kind === 'bed' ? 'bed' : 'rect';
      newObjects.push({
        ...o,
        x: o.x + newOffset,
        y: o.y + newOffset,
        id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        groupId: newGroupId
      } as CanvasObject);
    });

    if (newObjects.length === 0) return;

    setObjects(prev => [...prev, ...newObjects]);
    setSelectedIds(newObjects.map(o => o.id));
    setPasteOffset(newOffset);
  }, [clipboard, objects, pasteOffset]);

  const clearAll = () => {
    if (window.confirm('⚠️ ¿Estás seguro de que deseas eliminar todas las paredes y camas de este croquis? Esta acción no se puede deshacer.')) {
      setObjects([]);
      setSelectedIds([]);
      setHistory([]);
      setClipboard([]);
      setPasteOffset(0);

      const offscreen = offscreenRef.current;
      const offCtx = getOffCtx();
      if (offscreen && offCtx) {
        offCtx.fillStyle = '#FFFFFF';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      saveSnapshot();
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const offCtx = getOffCtx();
    const offscreen = offscreenRef.current;
    if (offCtx && offscreen && newHistory.length > 0) {
      offCtx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
    setObjects(prev => prev.slice(0, -1));
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        rotateSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        groupSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        ungroupSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, copySelected, pasteClipboard]);

  const tools: { id: Tool; icon: React.ReactNode; label: string; color?: string }[] = [
    { id: 'select', icon: <MousePointer2 size={16} />, label: 'Seleccionar' },
    { id: 'pencil', icon: <Pencil size={16} />, label: 'Lápiz' },
    { id: 'rectangle', icon: <Square size={16} />, label: 'Rectángulo' },
    { id: 'eraser', icon: <Eraser size={16} />, label: 'Borrador' },
    { id: 'litera', icon: <BedDouble size={16} />, label: `Litera (${objects.filter(o => o.kind === 'bed' && o.bedType === 'litera').length}/${maxLiteras})`, color: '#3B82F6' },
    { id: 'individual', icon: <BedSingle size={16} />, label: `Individual (${objects.filter(o => o.kind === 'bed' && o.bedType === 'individual').length}/${maxIndividuales})`, color: '#10B981' },
    { id: 'duplex', icon: <BedDouble size={16} />, label: `Duplex (${objects.filter(o => o.kind === 'bed' && o.bedType === 'duplex').length}/${maxDuplex})`, color: '#F59E0B' },
    { id: 'text', icon: <Type size={16} />, label: 'Texto', color: '#6B7280' },
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Barra de herramientas principal */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-wrap">
        {tools.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tool === t.id
              ? 'bg-gray-800 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-200'
              }`}
          >
            <span style={t.color && tool !== t.id ? { color: t.color } : {}}>{t.icon}</span>
            {t.label}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          Color:
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
          />
        </label>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => setShowGrid(prev => !prev)}
          title={showGrid ? 'Ocultar Grid' : 'Mostrar Grid'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showGrid
            ? 'bg-gray-200 text-gray-700'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Grid3x3 size={16} />
          Grid
        </button>
      </div>

      {/* Barra de Acciones y Selección */}
      <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 px-2">
            {selectedIds.length > 0 ? `${selectedIds.length} seleccionado(s)` : 'Modo: ' + tools.find(t => t.id === tool)?.label}
          </span>

          {selectedIds.length > 0 && (
            <>
              {selectedIds.length > 1 && (
                <button
                  type="button"
                  onClick={groupSelected}
                  title="Agrupar (Ctrl+G)"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  <Link size={14} /> Agrupar
                </button>
              )}
              {selectedIds.some(id => objects.find(o => o.id === id)?.groupId) && (
                <button
                  type="button"
                  onClick={ungroupSelected}
                  title="Desagrupar (Ctrl+U)"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200"
                >
                  <Unlink size={14} /> Desagrupar
                </button>
              )}
              <button
                type="button"
                onClick={rotateSelected}
                title="Rotar (R)"
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
              >
                <RotateCw size={14} /> Rotar (R)
              </button>
              <button
                type="button"
                onClick={copySelected}
                title="Copiar (Ctrl+C)"
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors border border-violet-100"
              >
                <Copy size={14} /> Copiar (Ctrl+C)
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                title="Eliminar (Suprimir)"
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </>
          )}

          {clipboard.length > 0 && (
            <button
              type="button"
              onClick={pasteClipboard}
              title="Pegar (Ctrl+V)"
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
            >
              <Clipboard size={14} /> Pegar {clipboard.length} elem. (Ctrl+V)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            title="Deshacer trazo"
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Undo2 size={14} /> Deshacer Trazo
          </button>

          <button
            type="button"
            onClick={clearAll}
            title="Limpiar Todo"
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle size={14} /> Limpiar Todo
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className={`w-full block bg-gray-50/50 ${tool === 'select' ? 'cursor-default' :
          tool === 'litera' || tool === 'individual' || tool === 'duplex' || tool === 'text' ? 'cursor-crosshair' :
            tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
          }`}
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
