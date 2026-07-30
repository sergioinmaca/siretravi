import { useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_SIZE_MB = 1;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg'];

export function useFotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validarArchivo = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const typeOk = file.type === '' || ALLOWED_TYPES.includes(file.type);
    const extOk = ALLOWED_EXTENSIONS.includes(ext);

    if (!typeOk && !extOk) {
      return `Formato no permitido. Use JPG o JPEG.`;
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

  const deleteStorageFile = async (url: string | null | undefined): Promise<boolean> => {
    if (!url) return true;
    const match = url.match(/\/fotos-integrantes\/([^?#]+)/);
    if (!match) return true;
    const { error } = await supabase.storage.from('fotos-integrantes').remove([match[1]]);
    if (error) {
      console.error('[useFotoUpload] Error al eliminar archivo de Storage:', error, '| path:', match[1]);
      return false;
    }
    return true;
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

export type MotivoHuerfana =
  | 'integrante_eliminado'
  | 'foto_removida'
  | 'foto_reemplazada'
  | 'desconocido';

export interface FotoHuerfana {
  storage_path: string;
  campamento_id: string;
  refugiado_id: string;
  tipo: 'persona' | 'mascota';
  preview_url: string;
  refugiado_nombre: string | null;
  motivo: MotivoHuerfana;
}

export async function buscarFotosHuerfanas(): Promise<FotoHuerfana[]> {
  const { data, error } = await supabase.rpc('listar_fotos_huerfanas');
  if (error) {
    console.error('[buscarFotosHuerfanas] Error al consultar RPC:', error);
    throw error;
  }
  const raw = (data || []) as { storage_path: string; campamento_id: string; refugiado_id: string; tipo: string }[];

  if (raw.length === 0) return [];

  const { data: todosRefugiados } = await supabase
    .from('refugiados')
    .select('id, foto_url, mascota_foto_url');

  const pathsValidos = new Set<string>();
  const refPorId = new Map<string, { foto_url: string | null; mascota_foto_url: string | null }>();
  for (const r of (todosRefugiados || [])) {
    refPorId.set(r.id, { foto_url: r.foto_url ?? null, mascota_foto_url: r.mascota_foto_url ?? null });
    for (const url of [r.foto_url, r.mascota_foto_url]) {
      if (!url) continue;
      const match = (url as string).match(/\/fotos-integrantes\/([^?#]+)/);
      if (match) pathsValidos.add(match[1]);
    }
  }

  const huerfanasReales = raw.filter(h => !pathsValidos.has(h.storage_path));
  if (huerfanasReales.length < raw.length) {
    console.warn(
      `[buscarFotosHuerfanas] Descartadas ${raw.length - huerfanasReales.length} del RPC (falso positivo detectado).`
    );
  }

  const idsUnicos = [...new Set(huerfanasReales.map(h => h.refugiado_id))];
  const { data: refsData } = await supabase
    .from('refugiados')
    .select('id, nombres, apellidos')
    .in('id', idsUnicos);

  const nombrePorId: Record<string, string> = {};
  for (const r of (refsData || [])) {
    nombrePorId[r.id] = `${r.nombres} ${r.apellidos}`.trim();
  }

  return huerfanasReales.map(h => {
    const ref = refPorId.get(h.refugiado_id);
    let motivo: MotivoHuerfana;

    if (!ref) {
      motivo = 'integrante_eliminado';
    } else {
      const currentUrl = h.tipo === 'persona' ? ref.foto_url : ref.mascota_foto_url;
      if (!currentUrl) {
        motivo = 'foto_removida';
      } else {
        motivo = 'foto_reemplazada';
      }
    }

    return {
      storage_path: h.storage_path,
      campamento_id: h.campamento_id,
      refugiado_id: h.refugiado_id,
      tipo: h.tipo as 'persona' | 'mascota',
      preview_url: supabase.storage.from('fotos-integrantes').getPublicUrl(h.storage_path).data.publicUrl,
      refugiado_nombre: nombrePorId[h.refugiado_id] || null,
      motivo,
    };
  });
}

export async function eliminarFotosHuerfanas(paths: string[]): Promise<{ eliminadas: number; fallidas: string[] }> {
  let eliminadas = 0;
  const fallidas: string[] = [];

  for (const path of paths) {
    const { error } = await supabase.storage.from('fotos-integrantes').remove([path]);
    if (error) {
      console.error('[eliminarFotosHuerfanas] Error al eliminar:', path, error);
      fallidas.push(path);
    } else {
      eliminadas++;
    }
  }

  return { eliminadas, fallidas };
}

export async function vaciarCarpetaRefugiado(campamentoId: string, refugiadoId: string): Promise<void> {
  const prefix = `${campamentoId}/${refugiadoId}/`;
  const pathsToRemove: string[] = [];

  const { data: mainFiles } = await supabase.storage.from('fotos-integrantes').list(prefix);
  if (mainFiles) {
    for (const f of mainFiles) {
      if (f.id) pathsToRemove.push(`${prefix}${f.name}`);
    }
  }

  const mascotaPrefix = `${prefix}mascota/`;
  const { data: mascotaFiles } = await supabase.storage.from('fotos-integrantes').list(mascotaPrefix);
  if (mascotaFiles) {
    for (const f of mascotaFiles) {
      if (f.id) pathsToRemove.push(`${mascotaPrefix}${f.name}`);
    }
  }

  if (pathsToRemove.length > 0) {
    const { error } = await supabase.storage.from('fotos-integrantes').remove(pathsToRemove);
    if (error) {
      console.error('[vaciarCarpetaRefugiado] Error al eliminar archivos:', error);
    }
  }
}
