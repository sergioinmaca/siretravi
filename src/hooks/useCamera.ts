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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callRef = useRef(0);

  const stopCamera = useCallback(() => {
    callRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setStatus('idle');
  }, []);

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
    } catch {
      setDevices([]);
    }
  }, []);

  const startCamera = useCallback(async (deviceId?: string | null) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('La cámara solo funciona en conexiones seguras (HTTPS).');
      setStatus('error');
      return;
    }

    const myCall = ++callRef.current;
    setError(null);
    setStatus('starting');

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...(deviceId && deviceId.length > 0 ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'user' } }),
      },
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (callRef.current !== myCall) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('active');
    } catch (err: any) {
      if (callRef.current !== myCall) return;
      stopCamera();
      const name = err?.name || '';
      const message = ERROR_MESSAGES[name] || `Error al acceder a la cámara: ${err?.message || 'desconocido'}`;
      setError(message);
      setStatus('error');
    }
  }, [stopCamera]);

  const selectDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    stopCamera();
    await startCamera(deviceId);
  }, [stopCamera, startCamera]);

  const capturePhoto = useCallback(
    (
      video: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      cropRect?: { x: number; y: number; w: number; h: number }
    ): File | null => {
      if (!streamRef.current || !video.videoWidth) return null;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const scale = 2;

      if (cropRect) {
        canvas.width = cropRect.w * scale;
        canvas.height = cropRect.h * scale;
        ctx.scale(-scale, scale);
        ctx.drawImage(
          video,
          cropRect.x, cropRect.y, cropRect.w, cropRect.h,
          -cropRect.w, 0, cropRect.w, cropRect.h
        );
      } else {
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx.scale(-scale, scale);
        ctx.drawImage(video, -canvas.width / scale, 0, canvas.width / scale, canvas.height / scale);
      }

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
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    enumerateDevices,
    selectDevice,
    capturePhoto,
    setError,
    setStatus,
  };
}
