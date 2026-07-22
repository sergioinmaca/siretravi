import { useRef, useEffect, useState, useCallback } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { Camera, X, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function calcContainerCrop(container: HTMLDivElement): CropRect | null {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  if (cw === 0 || ch === 0) return null;

  const containerRatio = cw / ch;
  const cropRatio = 5 / 6;

  let w: number;
  let h: number;

  if (containerRatio > cropRatio) {
    h = ch * 0.85;
    w = h * cropRatio;
  } else {
    w = cw * 0.85;
    h = w / cropRatio;
  }

  return {
    x: (cw - w) / 2,
    y: (ch - h) / 2,
    w,
    h,
  };
}

function containerCropToVideoCrop(
  containerCrop: CropRect,
  container: HTMLDivElement,
  video: HTMLVideoElement
): CropRect | null {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (cw === 0 || ch === 0 || vw === 0 || vh === 0) return null;

  const scale = Math.max(cw / vw, ch / vh);
  const videoDisplayW = vw * scale;
  const videoDisplayH = vh * scale;
  const offsetX = (cw - videoDisplayW) / 2;
  const offsetY = (ch - videoDisplayH) / 2;

  const x = (containerCrop.x - offsetX) / scale;
  const y = (containerCrop.y - offsetY) / scale;
  const w = containerCrop.w / scale;
  const h = containerCrop.h / scale;

  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    w: Math.round(Math.min(w, vw - x)),
    h: Math.round(Math.min(h, vh - y)),
  };
}

export default function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { stream, error, status, devices, selectedDeviceId, startCamera, stopCamera, selectDevice, enumerateDevices, capturePhoto } = useCamera();
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [containerCrop, setContainerCrop] = useState<CropRect | null>(null);

  const updateCrop = useCallback(() => {
    if (containerRef.current) {
      setContainerCrop(calcContainerCrop(containerRef.current));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      setCapturedFile(null);
      setCapturedPreview(null);
    }
  }, [isOpen, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedFile]);

  useEffect(() => {
    if (status === 'active') {
      enumerateDevices();
    }
  }, [status, enumerateDevices]);

  useEffect(() => {
    if (status !== 'active') return;
    const container = containerRef.current;
    if (!container) return;

    updateCrop();
    const observer = new ResizeObserver(() => updateCrop());
    observer.observe(container);
    return () => observer.disconnect();
  }, [status, updateCrop]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;
    if (!containerCrop) return;

    const videoCrop = containerCropToVideoCrop(
      containerCrop,
      containerRef.current,
      videoRef.current
    );

    const file = capturePhoto(videoRef.current, canvasRef.current, videoCrop ?? undefined);
    if (!file) return;

    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = () => setCapturedPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedFile(null);
    setCapturedPreview(null);
  };

  if (!isOpen) return null;

  const canCapture = status === 'active' && !capturedFile;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tomar Foto</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {status === 'starting'
                ? 'Activando cámara...'
                : capturedFile
                  ? 'Vista previa — confirme o retome'
                  : status === 'active'
                    ? 'Encuádrese dentro del recuadro y capture'
                    : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4 bg-gray-50/30">
          {status === 'starting' && (
            <div className="w-full aspect-[4/3] rounded-2xl bg-gray-200 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <Loader2 size={40} className="animate-spin" />
                <span className="text-sm">Activando cámara...</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full aspect-[4/3] rounded-2xl bg-gray-200 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-500 px-6 text-center">
                <AlertTriangle size={40} className="text-amber-500" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {(status === 'active' || capturedPreview) && (
            <div
              ref={containerRef}
              className="w-full rounded-2xl overflow-hidden bg-black relative"
            >
              {capturedPreview ? (
                <img
                  src={capturedPreview}
                  alt="Foto capturada"
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover scale-x-[-1]"
                />
              )}

              {!capturedFile && containerCrop && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <div
                    style={{
                      width: containerCrop.w,
                      height: containerCrop.h,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {canCapture && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleCapture}
                className="w-20 h-20 rounded-full bg-caracas-red hover:bg-red-800 transition-colors shadow-lg flex items-center justify-center"
              >
                <Camera size={28} className="text-white" />
              </button>

              {devices.length > 1 && (
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-gray-400 shrink-0" />
                  <select
                    value={selectedDeviceId || devices[0]?.deviceId || ''}
                    onChange={(e) => selectDevice(e.target.value)}
                    className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red transition-all max-w-[200px] truncate"
                  >
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Cámara ${d.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {capturedFile && (
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                <RefreshCw size={16} />
                Retomar
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-caracas-red hover:bg-red-700 text-white transition-colors text-sm font-medium shadow-lg"
              >
                <Check size={16} />
                Usar esta foto
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
