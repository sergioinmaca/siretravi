import { useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export function useFotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validarArchivo = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const typeOk = file.type === '' || ALLOWED_TYPES.includes(file.type);
    const extOk = ALLOWED_EXTENSIONS.includes(ext);

    if (!typeOk && !extOk) {
      return `Formato no permitido. Use JPG, PNG o WEBP.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `La imagen excede el tama\u00f1o m\u00e1ximo de ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const uploadFoto = async (
    file: File,
    campamentoId: string,
    refugiadoId: string,
    subfolder?: string
  ): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const ext = file.name.split('.').pop();
      const folder = subfolder ? `${subfolder}/` : '';
      const path = `${campamentoId}/${refugiadoId}/${folder}${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('fotos-integrantes')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        console.error('[useFotoUpload] Error subiendo foto:', error);
        const msg = (error as any)?.message || '';
        if (msg.includes('mime type') || msg.includes('not supported')) {
          setUploadError('El formato de imagen no está permitido por el servidor. Contacte al administrador.');
        } else {
          setUploadError('No se pudo subir la foto. Intente de nuevo.');
        }
        return null;
      }

      const { data } = supabase.storage.from('fotos-integrantes').getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteStorageFile = async (url: string | null | undefined) => {
    if (!url) return;
    const match = url.match(/\/fotos-integrantes\/(.+)$/);
    if (match) {
      await supabase.storage.from('fotos-integrantes').remove([match[1]]);
    }
  };

  const leerArchivoComoDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const convertirAJPEG = async (file: File): Promise<File> => {
    if (ALLOWED_TYPES.includes(file.type)) return file;

    try {
      const dataUrl = await leerArchivoComoDataURL(file);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
        img.src = dataUrl;
      });

      const MAX_PX = 12_000_000;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w * h > MAX_PX) {
        const r = Math.sqrt(MAX_PX / (w * h));
        w = Math.round(w * r);
        h = Math.round(h * r);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );

      if (!blob) return file;

      const name = file.name.replace(/\.[^.]+$/, '.jpg') || 'foto.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    } catch {
      return file;
    }
  };

  return {
    isUploading,
    uploadError,
    setUploadError,
    validarArchivo,
    uploadFoto,
    deleteStorageFile,
    leerArchivoComoDataURL,
    convertirAJPEG,
  };
}
