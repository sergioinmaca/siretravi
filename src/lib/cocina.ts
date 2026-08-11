import { supabase } from './supabase';
import { TIPOS_COMIDA } from '../types';
import type { CocinaSlot, ComidaMenu, TipoComida } from '../types';

export const DEFAULT_SLOTS_CONFIG: { tipo: TipoComida; activo: boolean; hora_servicio: string }[] = [
  { tipo: 'desayuno', activo: true, hora_servicio: '07:00' },
  { tipo: 'merienda_1', activo: false, hora_servicio: '10:00' },
  { tipo: 'almuerzo', activo: true, hora_servicio: '12:00' },
  { tipo: 'merienda_2', activo: false, hora_servicio: '15:00' },
  { tipo: 'cena', activo: true, hora_servicio: '18:00' },
  { tipo: 'merienda_3', activo: false, hora_servicio: '20:00' },
];

export function sortSlots(slots: CocinaSlot[]): CocinaSlot[] {
  return [...slots].sort(
    (a, b) => TIPOS_COMIDA.indexOf(a.tipo) - TIPOS_COMIDA.indexOf(b.tipo)
  );
}

export async function fetchSlots(campamentoId: string): Promise<CocinaSlot[]> {
  const { data, error } = await supabase
    .from('cocina_slots')
    .select('*')
    .eq('campamento_id', campamentoId);

  if (error) {
    console.error('Error fetching cocina_slots:', error);
    throw error;
  }

  if (data && data.length > 0) {
    return sortSlots(data as CocinaSlot[]);
  }

  const rows = DEFAULT_SLOTS_CONFIG.map((s) => ({
    campamento_id: campamentoId,
    tipo: s.tipo,
    activo: s.activo,
    hora_servicio: s.hora_servicio,
  }));

  const { data: inserted, error: insError } = await supabase
    .from('cocina_slots')
    .insert(rows)
    .select();

  if (insError) {
    console.error('Error seeding cocina_slots:', insError);
    throw insError;
  }

  return sortSlots((inserted || []) as CocinaSlot[]);
}

export async function guardarSlots(
  campamentoId: string,
  slots: { tipo: TipoComida; activo: boolean; hora_servicio: string }[]
): Promise<CocinaSlot[]> {
  const rows = slots.map((s) => ({
    campamento_id: campamentoId,
    tipo: s.tipo,
    activo: s.activo,
    hora_servicio: s.hora_servicio,
  }));

  const { data, error } = await supabase
    .from('cocina_slots')
    .upsert(rows, { onConflict: 'campamento_id,tipo' })
    .select();

  if (error) {
    console.error('Error saving cocina_slots:', error);
    throw error;
  }

  return sortSlots((data || []) as CocinaSlot[]);
}

export async function fetchMenu(
  campamentoId: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<ComidaMenu[]> {
  const { data, error } = await supabase
    .from('cocina_menu')
    .select('*')
    .eq('campamento_id', campamentoId)
    .gte('fecha', fechaDesde)
    .lte('fecha', fechaHasta)
    .order('fecha');

  if (error) {
    console.error('Error fetching cocina_menu:', error);
    throw error;
  }

  return (data || []) as ComidaMenu[];
}

export async function fetchResponsables(campamentoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('cocina_menu')
    .select('responsable')
    .eq('campamento_id', campamentoId)
    .not('responsable', 'is', null);

  if (error) {
    console.error('Error fetching responsables:', error);
    throw error;
  }

  const set = new Set<string>();
  (data || []).forEach((r) => {
    const v = ((r as { responsable?: string | null }).responsable || '').trim().toUpperCase();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export async function fetchPresentes(campamentoId: string): Promise<number> {
  const { data, error } = await supabase
    .from('refugiados')
    .select('hogar_solidario')
    .eq('campamento_id', campamentoId);

  if (error) {
    console.error('Error fetching presentes:', error);
    throw error;
  }

  return (data || []).filter(
    (r) => ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE') === 'PRESENTE'
  ).length;
}

export async function crearComida(data: {
  campamento_id: string;
  fecha: string;
  tipo: TipoComida;
  menu: string;
  bebida: string;
  raciones: number;
  hora_servicio: string;
  responsable?: string;
}): Promise<ComidaMenu> {
  if (!data.menu.trim()) {
    throw new Error('El menú es obligatorio');
  }
  if (!data.bebida.trim()) {
    throw new Error('La bebida es obligatoria');
  }

  const { data: result, error } = await supabase
    .from('cocina_menu')
    .insert({
      campamento_id: data.campamento_id,
      fecha: data.fecha,
      tipo: data.tipo,
      menu: data.menu.trim(),
      bebida: data.bebida.trim(),
      raciones: data.raciones,
      hora_servicio: data.hora_servicio,
      responsable: data.responsable?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Esta comida ya está cargada');
    }
    console.error('Error creating comida:', error.message, error.details, error.hint, error.code);
    throw new Error(error.message || 'Error al crear la comida');
  }

  return result as ComidaMenu;
}

export async function crearComidas(
  data: {
    campamento_id: string;
    fecha: string;
    tipo: TipoComida;
    menu: string;
    bebida: string;
    raciones: number;
    hora_servicio: string;
    responsable?: string;
  }[]
): Promise<ComidaMenu[]> {
  const rows = data.map((d) => {
    if (!d.menu.trim()) {
      throw new Error('El menú es obligatorio');
    }
    if (!d.bebida.trim()) {
      throw new Error('La bebida es obligatoria');
    }
    return {
      campamento_id: d.campamento_id,
      fecha: d.fecha,
      tipo: d.tipo,
      menu: d.menu.trim(),
      bebida: d.bebida.trim(),
      raciones: d.raciones,
      hora_servicio: d.hora_servicio,
      responsable: d.responsable?.trim() || null,
    };
  });

  const { data: result, error } = await supabase
    .from('cocina_menu')
    .insert(rows)
    .select();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Una o más comidas ya están cargadas');
    }
    console.error('Error creating comidas:', error.message);
    throw new Error(error.message || 'Error al crear las comidas');
  }

  return (result || []) as ComidaMenu[];
}

export async function actualizarComida(
  id: string,
  data: {
    menu?: string;
    bebida?: string;
    raciones?: number;
    hora_servicio?: string;
    responsable?: string;
  }
): Promise<ComidaMenu> {
  const payload: Record<string, unknown> = {};
  if (data.menu !== undefined) {
    if (!data.menu.trim()) {
      throw new Error('El menú es obligatorio');
    }
    payload.menu = data.menu.trim();
  }
  if (data.bebida !== undefined) {
    if (!data.bebida.trim()) {
      throw new Error('La bebida es obligatoria');
    }
    payload.bebida = data.bebida.trim();
  }
  if (data.raciones !== undefined) payload.raciones = data.raciones;
  if (data.hora_servicio !== undefined) payload.hora_servicio = data.hora_servicio;
  if (data.responsable !== undefined) payload.responsable = data.responsable.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data: result, error } = await supabase
    .from('cocina_menu')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating comida:', error.message);
    throw new Error(error.message || 'Error al actualizar la comida');
  }

  return result as ComidaMenu;
}

export async function eliminarComida(id: string): Promise<void> {
  const { error } = await supabase
    .from('cocina_menu')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting comida:', error.message);
    throw new Error(error.message || 'Error al eliminar la comida');
  }
}
