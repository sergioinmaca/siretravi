import { supabase } from './supabase';
import { toDateInput } from './formatDate';
import type { HistoriaClinica, AtencionMedica, Tratamiento } from '../types';

// ── Helpers de mapeo ──────────────────────────────────────────────────────────

function mapHistoriaClinica(row: Record<string, unknown>): HistoriaClinica {
  return {
    id: row.id as string,
    refugiado_id: row.refugiado_id as string,
    tipo_discapacidad: (row.tipo_discapacidad as string) || undefined,
    tipo_alergia: (row.tipo_alergia as string) || undefined,
    medicamento_enfermedad: (row.medicamento_enfermedad as string) || undefined,
    lesion_sismo_detalle: (row.lesion_sismo_detalle as string) || undefined,
    adulto_mayor_detalle: (row.adulto_mayor_detalle as string) || undefined,
    lactante_detalle: (row.lactante_detalle as string) || undefined,
    enfermedades_previas: (row.enfermedades_previas as string) || undefined,
    cirugias: (row.cirugias as string) || undefined,
    examen_subjetivo: (row.examen_subjetivo as string) || undefined,
    examen_objetivo: (row.examen_objetivo as string) || undefined,
    examen_diagnostico: (row.examen_diagnostico as string) || undefined,
    fecha_apertura: new Date(row.fecha_apertura as string),
    created_at: new Date(row.created_at as string),
    enf_cronica_1: (row.enf_cronica_1 as string) || undefined,
    tratamiento_1: (row.tratamiento_1 as string) || undefined,
    enf_cronica_2: (row.enf_cronica_2 as string) || undefined,
    tratamiento_2: (row.tratamiento_2 as string) || undefined,
    enf_cronica_3: (row.enf_cronica_3 as string) || undefined,
    tratamiento_3: (row.tratamiento_3 as string) || undefined,
    enf_cronica_4: (row.enf_cronica_4 as string) || undefined,
    tratamiento_4: (row.tratamiento_4 as string) || undefined,
    enf_cronica_5: (row.enf_cronica_5 as string) || undefined,
    tratamiento_5: (row.tratamiento_5 as string) || undefined,
    enf_cronica_6: (row.enf_cronica_6 as string) || undefined,
    tratamiento_6: (row.tratamiento_6 as string) || undefined,
    enf_cronica_7: (row.enf_cronica_7 as string) || undefined,
    tratamiento_7: (row.tratamiento_7 as string) || undefined,
    enf_cronica_8: (row.enf_cronica_8 as string) || undefined,
    tratamiento_8: (row.tratamiento_8 as string) || undefined,
    enf_cronica_9: (row.enf_cronica_9 as string) || undefined,
    tratamiento_9: (row.tratamiento_9 as string) || undefined,
    enf_cronica_10: (row.enf_cronica_10 as string) || undefined,
    tratamiento_10: (row.tratamiento_10 as string) || undefined,
  };
}

function mapAtencionMedica(row: Record<string, unknown>): AtencionMedica {
  const r = (k: string) => (row[k] as string) || undefined;
  const n = (k: string) => (row[k] as number) || undefined;
  const d = (k: string) => (row[k] ? new Date(row[k] as string) : undefined);

  return {
    id: row.id as string,
    historia_clinica_id: row.historia_clinica_id as string,
    tipo: (row.tipo as 'medica' | 'beneficio' | 'donacion') || 'medica',
    fecha_atencion: new Date(row.fecha_atencion as string),
    presion_arterial: r('presion_arterial'),
    temperatura: n('temperatura'),
    frecuencia_cardiaca: n('frecuencia_cardiaca'),
    peso: n('peso'),
    talla: n('talla'),
    saturacion_oxigeno: n('saturacion_oxigeno'),
    observaciones: r('observaciones'),
    created_at: new Date(row.created_at as string),
    // especialidades (tipo = 'medica')
    especialidad_1: r('especialidad_1'), diagnostico_1: r('diagnostico_1'), tratamiento_1: r('tratamiento_1'),
    especialidad_2: r('especialidad_2'), diagnostico_2: r('diagnostico_2'), tratamiento_2: r('tratamiento_2'),
    especialidad_3: r('especialidad_3'), diagnostico_3: r('diagnostico_3'), tratamiento_3: r('tratamiento_3'),
    especialidad_4: r('especialidad_4'), diagnostico_4: r('diagnostico_4'), tratamiento_4: r('tratamiento_4'),
    especialidad_5: r('especialidad_5'), diagnostico_5: r('diagnostico_5'), tratamiento_5: r('tratamiento_5'),
    especialidad_6: r('especialidad_6'), diagnostico_6: r('diagnostico_6'), tratamiento_6: r('tratamiento_6'),
    especialidad_7: r('especialidad_7'), diagnostico_7: r('diagnostico_7'), tratamiento_7: r('tratamiento_7'),
    especialidad_8: r('especialidad_8'), diagnostico_8: r('diagnostico_8'), tratamiento_8: r('tratamiento_8'),
    especialidad_9: r('especialidad_9'), diagnostico_9: r('diagnostico_9'), tratamiento_9: r('tratamiento_9'),
    especialidad_10: r('especialidad_10'), diagnostico_10: r('diagnostico_10'), tratamiento_10: r('tratamiento_10'),
    // beneficios
    beneficio_tipo_1: r('beneficio_tipo_1'), beneficio_descripcion_1: r('beneficio_descripcion_1'), beneficio_entregado_por_1: r('beneficio_entregado_por_1'), beneficio_fecha_1: d('beneficio_fecha_1'),
    beneficio_tipo_2: r('beneficio_tipo_2'), beneficio_descripcion_2: r('beneficio_descripcion_2'), beneficio_entregado_por_2: r('beneficio_entregado_por_2'), beneficio_fecha_2: d('beneficio_fecha_2'),
    beneficio_tipo_3: r('beneficio_tipo_3'), beneficio_descripcion_3: r('beneficio_descripcion_3'), beneficio_entregado_por_3: r('beneficio_entregado_por_3'), beneficio_fecha_3: d('beneficio_fecha_3'),
    beneficio_tipo_4: r('beneficio_tipo_4'), beneficio_descripcion_4: r('beneficio_descripcion_4'), beneficio_entregado_por_4: r('beneficio_entregado_por_4'), beneficio_fecha_4: d('beneficio_fecha_4'),
    beneficio_tipo_5: r('beneficio_tipo_5'), beneficio_descripcion_5: r('beneficio_descripcion_5'), beneficio_entregado_por_5: r('beneficio_entregado_por_5'), beneficio_fecha_5: d('beneficio_fecha_5'),
    beneficio_tipo_6: r('beneficio_tipo_6'), beneficio_descripcion_6: r('beneficio_descripcion_6'), beneficio_entregado_por_6: r('beneficio_entregado_por_6'), beneficio_fecha_6: d('beneficio_fecha_6'),
    beneficio_tipo_7: r('beneficio_tipo_7'), beneficio_descripcion_7: r('beneficio_descripcion_7'), beneficio_entregado_por_7: r('beneficio_entregado_por_7'), beneficio_fecha_7: d('beneficio_fecha_7'),
    beneficio_tipo_8: r('beneficio_tipo_8'), beneficio_descripcion_8: r('beneficio_descripcion_8'), beneficio_entregado_por_8: r('beneficio_entregado_por_8'), beneficio_fecha_8: d('beneficio_fecha_8'),
    beneficio_tipo_9: r('beneficio_tipo_9'), beneficio_descripcion_9: r('beneficio_descripcion_9'), beneficio_entregado_por_9: r('beneficio_entregado_por_9'), beneficio_fecha_9: d('beneficio_fecha_9'),
    beneficio_tipo_10: r('beneficio_tipo_10'), beneficio_descripcion_10: r('beneficio_descripcion_10'), beneficio_entregado_por_10: r('beneficio_entregado_por_10'), beneficio_fecha_10: d('beneficio_fecha_10'),
    // donaciones
    donacion_tipo_1: r('donacion_tipo_1'), donacion_descripcion_1: r('donacion_descripcion_1'), donacion_entregado_por_1: r('donacion_entregado_por_1'), donacion_fecha_1: d('donacion_fecha_1'),
    donacion_tipo_2: r('donacion_tipo_2'), donacion_descripcion_2: r('donacion_descripcion_2'), donacion_entregado_por_2: r('donacion_entregado_por_2'), donacion_fecha_2: d('donacion_fecha_2'),
    donacion_tipo_3: r('donacion_tipo_3'), donacion_descripcion_3: r('donacion_descripcion_3'), donacion_entregado_por_3: r('donacion_entregado_por_3'), donacion_fecha_3: d('donacion_fecha_3'),
    donacion_tipo_4: r('donacion_tipo_4'), donacion_descripcion_4: r('donacion_descripcion_4'), donacion_entregado_por_4: r('donacion_entregado_por_4'), donacion_fecha_4: d('donacion_fecha_4'),
    donacion_tipo_5: r('donacion_tipo_5'), donacion_descripcion_5: r('donacion_descripcion_5'), donacion_entregado_por_5: r('donacion_entregado_por_5'), donacion_fecha_5: d('donacion_fecha_5'),
    donacion_tipo_6: r('donacion_tipo_6'), donacion_descripcion_6: r('donacion_descripcion_6'), donacion_entregado_por_6: r('donacion_entregado_por_6'), donacion_fecha_6: d('donacion_fecha_6'),
    donacion_tipo_7: r('donacion_tipo_7'), donacion_descripcion_7: r('donacion_descripcion_7'), donacion_entregado_por_7: r('donacion_entregado_por_7'), donacion_fecha_7: d('donacion_fecha_7'),
    donacion_tipo_8: r('donacion_tipo_8'), donacion_descripcion_8: r('donacion_descripcion_8'), donacion_entregado_por_8: r('donacion_entregado_por_8'), donacion_fecha_8: d('donacion_fecha_8'),
    donacion_tipo_9: r('donacion_tipo_9'), donacion_descripcion_9: r('donacion_descripcion_9'), donacion_entregado_por_9: r('donacion_entregado_por_9'), donacion_fecha_9: d('donacion_fecha_9'),
    donacion_tipo_10: r('donacion_tipo_10'), donacion_descripcion_10: r('donacion_descripcion_10'), donacion_entregado_por_10: r('donacion_entregado_por_10'), donacion_fecha_10: d('donacion_fecha_10'),
  };
}

function mapTratamiento(row: Record<string, unknown>): Tratamiento {
  return {
    id: row.id as string,
    historia_clinica_id: row.historia_clinica_id as string,
    medicamento: row.medicamento as string,
    hora: row.hora as string,
    dosis: (row.dosis as string) || undefined,
    created_at: new Date(row.created_at as string),
  };
}

// ── Inserts ──────────────────────────────────────────────────────────────────

export async function agregarHistoriaClinica(nueva: HistoriaClinica): Promise<HistoriaClinica> {
  const { data, error } = await supabase
    .from('historias_clinicas')
    .insert({
      refugiado_id: nueva.refugiado_id,
      tipo_discapacidad: nueva.tipo_discapacidad || null,
      tipo_alergia: nueva.tipo_alergia || null,
      medicamento_enfermedad: nueva.medicamento_enfermedad || null,
      lesion_sismo_detalle: nueva.lesion_sismo_detalle || null,
      adulto_mayor_detalle: nueva.adulto_mayor_detalle || null,
      lactante_detalle: nueva.lactante_detalle || null,
      enfermedades_previas: nueva.enfermedades_previas || null,
      cirugias: nueva.cirugias || null,
      examen_subjetivo: nueva.examen_subjetivo || null,
      examen_objetivo: nueva.examen_objetivo || null,
      examen_diagnostico: nueva.examen_diagnostico || null,
      fecha_apertura: nueva.fecha_apertura instanceof Date
        ? toDateInput(nueva.fecha_apertura)
        : nueva.fecha_apertura,
      enf_cronica_1: nueva.enf_cronica_1 || null,
      tratamiento_1: nueva.tratamiento_1 || null,
      enf_cronica_2: nueva.enf_cronica_2 || null,
      tratamiento_2: nueva.tratamiento_2 || null,
      enf_cronica_3: nueva.enf_cronica_3 || null,
      tratamiento_3: nueva.tratamiento_3 || null,
      enf_cronica_4: nueva.enf_cronica_4 || null,
      tratamiento_4: nueva.tratamiento_4 || null,
      enf_cronica_5: nueva.enf_cronica_5 || null,
      tratamiento_5: nueva.tratamiento_5 || null,
      enf_cronica_6: nueva.enf_cronica_6 || null,
      tratamiento_6: nueva.tratamiento_6 || null,
      enf_cronica_7: nueva.enf_cronica_7 || null,
      tratamiento_7: nueva.tratamiento_7 || null,
      enf_cronica_8: nueva.enf_cronica_8 || null,
      tratamiento_8: nueva.tratamiento_8 || null,
      enf_cronica_9: nueva.enf_cronica_9 || null,
      tratamiento_9: nueva.tratamiento_9 || null,
      enf_cronica_10: nueva.enf_cronica_10 || null,
      tratamiento_10: nueva.tratamiento_10 || null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Error al crear historia clínica');
  return mapHistoriaClinica(data as Record<string, unknown>);
}

export async function actualizarHistoriaClinica(id: string, actualizada: HistoriaClinica): Promise<HistoriaClinica> {
  const { data, error } = await supabase
    .from('historias_clinicas')
    .update({
      tipo_discapacidad: actualizada.tipo_discapacidad || null,
      tipo_alergia: actualizada.tipo_alergia || null,
      medicamento_enfermedad: actualizada.medicamento_enfermedad || null,
      lesion_sismo_detalle: actualizada.lesion_sismo_detalle || null,
      adulto_mayor_detalle: actualizada.adulto_mayor_detalle || null,
      lactante_detalle: actualizada.lactante_detalle || null,
      enfermedades_previas: actualizada.enfermedades_previas || null,
      cirugias: actualizada.cirugias || null,
      examen_subjetivo: actualizada.examen_subjetivo || null,
      examen_objetivo: actualizada.examen_objetivo || null,
      examen_diagnostico: actualizada.examen_diagnostico || null,
      enf_cronica_1: actualizada.enf_cronica_1 || null,
      tratamiento_1: actualizada.tratamiento_1 || null,
      enf_cronica_2: actualizada.enf_cronica_2 || null,
      tratamiento_2: actualizada.tratamiento_2 || null,
      enf_cronica_3: actualizada.enf_cronica_3 || null,
      tratamiento_3: actualizada.tratamiento_3 || null,
      enf_cronica_4: actualizada.enf_cronica_4 || null,
      tratamiento_4: actualizada.tratamiento_4 || null,
      enf_cronica_5: actualizada.enf_cronica_5 || null,
      tratamiento_5: actualizada.tratamiento_5 || null,
      enf_cronica_6: actualizada.enf_cronica_6 || null,
      tratamiento_6: actualizada.tratamiento_6 || null,
      enf_cronica_7: actualizada.enf_cronica_7 || null,
      tratamiento_7: actualizada.tratamiento_7 || null,
      enf_cronica_8: actualizada.enf_cronica_8 || null,
      tratamiento_8: actualizada.tratamiento_8 || null,
      enf_cronica_9: actualizada.enf_cronica_9 || null,
      tratamiento_9: actualizada.tratamiento_9 || null,
      enf_cronica_10: actualizada.enf_cronica_10 || null,
      tratamiento_10: actualizada.tratamiento_10 || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Error al actualizar historia clínica');
  return mapHistoriaClinica(data as Record<string, unknown>);
}

const CAMPOS_NUM = Array.from({ length: 10 }, (_, i) => i + 1);

function buildInsertPayload(nueva: AtencionMedica): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    historia_clinica_id: nueva.historia_clinica_id,
    tipo: nueva.tipo,
    fecha_atencion: nueva.fecha_atencion instanceof Date
      ? toDateInput(nueva.fecha_atencion)
      : nueva.fecha_atencion,
    presion_arterial: nueva.presion_arterial || null,
    temperatura: nueva.temperatura || null,
    frecuencia_cardiaca: nueva.frecuencia_cardiaca || null,
    peso: nueva.peso || null,
    talla: nueva.talla || null,
    saturacion_oxigeno: nueva.saturacion_oxigeno || null,
    observaciones: nueva.observaciones || null,
  };

  for (const i of CAMPOS_NUM) {
    const s = i.toString();
    payload[`especialidad_${s}`] = (nueva as any)[`especialidad_${s}`] || null;
    payload[`diagnostico_${s}`] = (nueva as any)[`diagnostico_${s}`] || null;
    payload[`tratamiento_${s}`] = (nueva as any)[`tratamiento_${s}`] || null;
    payload[`beneficio_tipo_${s}`] = (nueva as any)[`beneficio_tipo_${s}`] || null;
    payload[`beneficio_descripcion_${s}`] = (nueva as any)[`beneficio_descripcion_${s}`] || null;
    payload[`beneficio_entregado_por_${s}`] = (nueva as any)[`beneficio_entregado_por_${s}`] || null;
    payload[`beneficio_fecha_${s}`] = (nueva as any)[`beneficio_fecha_${s}`]
      ? toDateInput((nueva as any)[`beneficio_fecha_${s}`])
      : null;
    payload[`donacion_tipo_${s}`] = (nueva as any)[`donacion_tipo_${s}`] || null;
    payload[`donacion_descripcion_${s}`] = (nueva as any)[`donacion_descripcion_${s}`] || null;
    payload[`donacion_entregado_por_${s}`] = (nueva as any)[`donacion_entregado_por_${s}`] || null;
    payload[`donacion_fecha_${s}`] = (nueva as any)[`donacion_fecha_${s}`]
      ? toDateInput((nueva as any)[`donacion_fecha_${s}`])
      : null;
  }

  return payload;
}

export async function agregarRegistroAtencion(nueva: AtencionMedica): Promise<AtencionMedica> {
  const { data, error } = await supabase
    .from('atenciones_medicas')
    .insert(buildInsertPayload(nueva))
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Error al registrar atención');
  return mapAtencionMedica(data as Record<string, unknown>);
}

export async function agregarTratamiento(nuevo: Tratamiento): Promise<Tratamiento> {
  const { data, error } = await supabase
    .from('tratamientos')
    .insert({
      historia_clinica_id: nuevo.historia_clinica_id,
      medicamento: nuevo.medicamento,
      hora: nuevo.hora,
      dosis: nuevo.dosis || null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Error al agregar tratamiento');
  return mapTratamiento(data as Record<string, unknown>);
}

export async function eliminarTratamiento(id: string): Promise<void> {
  const { error } = await supabase.from('tratamientos').delete().eq('id', id);
  if (error) {
    console.error('Error al eliminar tratamiento:', error);
    throw new Error(error.message || 'Error al eliminar tratamiento');
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function obtenerHistoriasClinicas(campamentoId: string): Promise<HistoriaClinica[]> {
  // Traer historias de refugiados que pertenecen a este campamento
  const { data: refugiados } = await supabase
    .from('refugiados')
    .select('id')
    .eq('campamento_id', campamentoId);

  if (!refugiados || refugiados.length === 0) return [];

  const refIds = refugiados.map(r => r.id);

  const { data, error } = await supabase
    .from('historias_clinicas')
    .select('*')
    .in('refugiado_id', refIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener historias clínicas:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapHistoriaClinica);
}

export async function obtenerTratamientos(historiaIds: string[]): Promise<Tratamiento[]> {
  if (historiaIds.length === 0) return [];

  const { data, error } = await supabase
    .from('tratamientos')
    .select('*')
    .in('historia_clinica_id', historiaIds)
    .order('hora', { ascending: true });

  if (error) {
    console.error('Error al obtener tratamientos:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapTratamiento);
}

export async function obtenerTodasLasHistoriasClinicas(): Promise<HistoriaClinica[]> {
  const { data, error } = await supabase
    .from('historias_clinicas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener todas las historias clínicas:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapHistoriaClinica);
}

export async function obtenerHistoriaClinicaPorRefugiado(refugiadoId: string): Promise<HistoriaClinica | null> {
  const { data, error } = await supabase
    .from('historias_clinicas')
    .select('*')
    .eq('refugiado_id', refugiadoId);

  if (error || !data || data.length === 0) return null;
  return mapHistoriaClinica(data[0] as Record<string, unknown>);
}

export async function obtenerAtencionesPorHistoriaClinica(historiaClinicaId: string): Promise<AtencionMedica[]> {
  const { data, error } = await supabase
    .from('atenciones_medicas')
    .select('*')
    .eq('historia_clinica_id', historiaClinicaId)
    .order('fecha_atencion', { ascending: false });

  if (error) {
    console.error('Error al obtener atenciones:', error);
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map(mapAtencionMedica);
}
