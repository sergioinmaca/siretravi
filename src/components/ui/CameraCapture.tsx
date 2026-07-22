import { useRef, useEffect, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { Camera, X, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stream, error, status, startCamera, stopCamera, capturePhoto } = useCamera();
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

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
  }, [stream]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const file = capturePhoto(videoRef.current, canvasRef.current);
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
                    ? 'Encuádrese y presione el botón para capturar'
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
            <div className="w-full rounded-2xl overflow-hidden bg-black relative">
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
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {canCapture && (
            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/10 hover:bg-white/30 transition-all shadow-lg flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
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
