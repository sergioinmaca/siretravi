import { useState, useCallback, useEffect, useRef } from 'react';

type CameraStatus = 'idle' | 'starting' | 'active' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: 'Permiso de cámara denegado. Conceda acceso desde la configuración del navegador.',
  NotFoundError: 'No se detectó ninguna cámara en este dispositivo.',
  NotReadableError: 'La cámara está en uso por otra aplicación.',
  OverconstrainedError: 'No se encontró una cámara que cumpla con los requisitos.',
};

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setStatus('idle');
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('La cámara solo funciona en conexiones seguras (HTTPS).');
      setStatus('error');
      return;
    }

    setError(null);
    setStatus('starting');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('active');
    } catch (err: any) {
      stopCamera();
      const name = err?.name || '';
      const message = ERROR_MESSAGES[name] || `Error al acceder a la cámara: ${err?.message || 'desconocido'}`;
      setError(message);
      setStatus('error');
    }
  }, [stopCamera]);

  const capturePhoto = useCallback(
    (video: HTMLVideoElement, canvas: HTMLCanvasElement): File | null => {
      if (!streamRef.current || !video.videoWidth) return null;

      const scale = 2;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.scale(-scale, scale);
      ctx.drawImage(video, -canvas.width / scale, 0, canvas.width / scale, canvas.height / scale);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const byteString = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });

      return new File([blob], `camara_${Date.now()}.jpg`, { type: 'image/jpeg' });
    },
    []
  );

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    stream,
    error,
    status,
    startCamera,
    stopCamera,
    capturePhoto,
    setError,
    setStatus,
  };
}
