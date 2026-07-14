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
  return {
    id: row.id as string,
    historia_clinica_id: row.historia_clinica_id as string,
    fecha_atencion: new Date(row.fecha_atencion as string),
    presion_arterial: (row.presion_arterial as string) || undefined,
    temperatura: (row.temperatura as number) || undefined,
    frecuencia_cardiaca: (row.frecuencia_cardiaca as number) || undefined,
    peso: (row.peso as number) || undefined,
    talla: (row.talla as number) || undefined,
    saturacion_oxigeno: (row.saturacion_oxigeno as number) || undefined,
    observaciones: (row.observaciones as string) || undefined,
    created_at: new Date(row.created_at as string),
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

export async function agregarAtencionMedica(nueva: AtencionMedica): Promise<AtencionMedica> {
  const { data, error } = await supabase
    .from('atenciones_medicas')
    .insert({
      historia_clinica_id: nueva.historia_clinica_id,
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
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Error al registrar atención médica');
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
