import { supabase } from './supabase';
import type { Acta, TipoActa, TipoActaResumen } from '../types';

function mapTipoActa(row: Record<string, unknown>): TipoActa {
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    descripcion: (row.descripcion as string) || undefined,
    plantilla: row.plantilla as TipoActa['plantilla'],
    activo: row.activo as boolean,
    created_at: row.created_at as string,
  };
}

function mapTipoActaResumen(row: Record<string, unknown>): TipoActaResumen {
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    descripcion: (row.descripcion as string) || undefined,
    activo: row.activo as boolean,
    created_at: row.created_at as string,
  };
}

function mapActa(row: Record<string, unknown>): Acta {
  return {
    id: row.id as string,
    codigo: row.codigo as string,
    tipo_acta_id: row.tipo_acta_id as string,
    refugiado_id: row.refugiado_id as string,
    campamento_id: row.campamento_id as string,
    fecha: row.fecha as string,
    contenido: row.contenido as Record<string, string>,
    created_by: (row.created_by as string) || undefined,
    created_at: row.created_at as string,
  };
}

export async function obtenerTiposActa(): Promise<TipoActaResumen[]> {
  const { data, error } = await supabase
    .from('tipo_acta')
    .select('id, nombre, descripcion, activo, created_at')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error('Error al obtener tipos de acta');
  }

  const tipos = ((data || []) as Record<string, unknown>[]).map(mapTipoActaResumen);

  console.log('[Actas] Conexión OK — Tipos obtenidos:', tipos.length, tipos.map(t => t.nombre));

  if (tipos.length === 0) {
    console.warn('[Actas] POSIBLE BUG: 0 tipos de acta retornados. ¿Hay registros con activo=true en tipo_acta?');
  }

  return tipos;
}

export async function obtenerTipoActa(id: string): Promise<TipoActa | null> {
  const { data, error } = await supabase
    .from('tipo_acta')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapTipoActa(data as Record<string, unknown>);
}

export async function crearTipoActa(tipo: Omit<TipoActa, 'id' | 'activo' | 'created_at'>): Promise<TipoActa | null> {
  const { data, error } = await supabase
    .from('tipo_acta')
    .insert({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || null,
      plantilla: tipo.plantilla,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error al crear tipo de acta:', error);
    return null;
  }

  return mapTipoActa(data as Record<string, unknown>);
}

export async function actualizarTipoActa(id: string, tipo: Partial<TipoActa>): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (tipo.nombre !== undefined) payload.nombre = tipo.nombre;
  if (tipo.descripcion !== undefined) payload.descripcion = tipo.descripcion;
  if (tipo.plantilla !== undefined) payload.plantilla = tipo.plantilla;
  if (tipo.activo !== undefined) payload.activo = tipo.activo;

  const { error } = await supabase
    .from('tipo_acta')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Error al actualizar tipo de acta:', error);
    return false;
  }

  return true;
}

export async function obtenerActas(campamentoId: string): Promise<Acta[]> {
  const { data, error } = await supabase
    .from('actas')
    .select('*')
    .eq('campamento_id', campamentoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener actas:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapActa);
}

export async function crearActa(acta: Omit<Acta, 'id' | 'codigo' | 'created_at'>): Promise<Acta | null> {
  // Obtener siguiente código
  let secuencia = 1;
  const { data: actual } = await supabase
    .from('contadores_actas')
    .select('ultimo_secuencia')
    .eq('campamento_id', acta.campamento_id)
    .maybeSingle();

  if (actual) {
    secuencia = (actual.ultimo_secuencia as number) + 1;
    await supabase
      .from('contadores_actas')
      .update({ ultimo_secuencia: secuencia } as Record<string, unknown>)
      .eq('campamento_id', acta.campamento_id);
  } else {
    await supabase
      .from('contadores_actas')
      .insert({ campamento_id: acta.campamento_id, ultimo_secuencia: 1 });
  }

  const codigo = `ACT-${String(secuencia).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('actas')
    .insert({
      codigo,
      tipo_acta_id: acta.tipo_acta_id,
      refugiado_id: acta.refugiado_id,
      campamento_id: acta.campamento_id,
      fecha: acta.fecha,
      contenido: acta.contenido,
      created_by: acta.created_by || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error al crear acta:', error);
    return null;
  }

  return mapActa(data as Record<string, unknown>);
}

export async function eliminarActa(id: string): Promise<boolean> {
  console.log('[Actas] Eliminando acta:', id);
  const { error } = await supabase
    .from('actas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Actas] Error al eliminar acta:', error);
    return false;
  }

  console.log('[Actas] Acta eliminada OK');
  return true;
}

export async function contarActasPorRefugiado(campamentoId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('actas')
    .select('refugiado_id')
    .eq('campamento_id', campamentoId);

  if (error || !data) return {};

  const conteo: Record<string, number> = {};
  data.forEach(a => {
    const rid = a.refugiado_id as string;
    conteo[rid] = (conteo[rid] || 0) + 1;
  });

  return conteo;
}

export async function contarActasPorTipo(campamentoId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('actas')
    .select('tipo_acta_id')
    .eq('campamento_id', campamentoId);

  if (error || !data) return {};

  const conteo: Record<string, number> = {};
  data.forEach(a => {
    const tid = a.tipo_acta_id as string;
    conteo[tid] = (conteo[tid] || 0) + 1;
  });

  return conteo;
}
