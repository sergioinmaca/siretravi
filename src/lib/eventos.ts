import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import { supabase } from './supabase';
import type { Evento, EventoOcurrencia, CategoriaEvento } from '../types';

dayjs.extend(minMax);

export async function fetchEventos(campamentoId: string, fechaHasta: string): Promise<Evento[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('id_campamento', campamentoId)
    .lte('fecha_inicio', fechaHasta)
    .order('hora_inicio');

  if (error) {
    console.error('Error fetching eventos:', error);
    throw error;
  }

  return (data || []) as Evento[];
}

export async function crearEvento(data: {
  id_campamento: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  hora_inicio: string;
  hora_fin?: string;
  tipo: 'permanente' | 'unico';
  categoria_id?: string;
}): Promise<Evento> {
  const { data: result, error } = await supabase
    .from('eventos')
    .insert({
      id_campamento: data.id_campamento,
      titulo: data.titulo,
      descripcion: data.descripcion || null,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.tipo === 'permanente' ? data.fecha_fin : null,
      hora_inicio: data.hora_inicio,
      hora_fin: data.hora_fin || null,
      tipo: data.tipo,
      categoria_id: data.categoria_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating evento:', error.message, error.details, error.hint, error.code);
    throw new Error(error.message || 'Error al crear el evento');
  }

  return result as Evento;
}

export async function actualizarEvento(id: string, data: {
  titulo?: string;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  hora_inicio?: string;
  hora_fin?: string;
  tipo?: 'permanente' | 'unico';
  categoria_id?: string;
}): Promise<Evento> {
  const payload: Record<string, unknown> = {};
  if (data.titulo !== undefined) payload.titulo = data.titulo;
  if (data.descripcion !== undefined) payload.descripcion = data.descripcion || null;
  if (data.fecha_inicio !== undefined) payload.fecha_inicio = data.fecha_inicio;
  if (data.fecha_fin !== undefined) payload.fecha_fin = data.fecha_fin || null;
  if (data.hora_inicio !== undefined) payload.hora_inicio = data.hora_inicio;
  if (data.hora_fin !== undefined) payload.hora_fin = data.hora_fin || null;
  if (data.tipo !== undefined) {
    payload.tipo = data.tipo;
    payload.fecha_fin = data.tipo === 'permanente' ? data.fecha_fin : null;
  }
  if (data.categoria_id !== undefined) payload.categoria_id = data.categoria_id || null;

  const { data: result, error } = await supabase
    .from('eventos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating evento:', error.message);
    throw new Error(error.message || 'Error al actualizar el evento');
  }

  return result as Evento;
}

export async function eliminarEvento(id: string): Promise<void> {
  const { error } = await supabase
    .from('eventos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting evento:', error.message);
    throw new Error(error.message || 'Error al eliminar el evento');
  }
}

export async function fetchCategorias(): Promise<CategoriaEvento[]> {
  const { data, error } = await supabase
    .from('categorias_evento')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching categorias:', error);
    throw error;
  }

  return (data || []) as CategoriaEvento[];
}

export async function crearCategoria(data: {
  nombre: string;
  color: string;
}): Promise<CategoriaEvento> {
  const { data: result, error } = await supabase
    .from('categorias_evento')
    .insert({
      nombre: data.nombre,
      color: data.color,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating categoria:', error.message);
    throw new Error(error.message || 'Error al crear la categoría');
  }

  return result as CategoriaEvento;
}

export async function eliminarCategoria(id: string): Promise<void> {
  const { error } = await supabase
    .from('categorias_evento')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting categoria:', error.message);
    throw new Error(error.message || 'Error al eliminar la categoría');
  }
}

export async function actualizarCategoria(id: string, data: {
  nombre?: string;
  color?: string;
}): Promise<CategoriaEvento> {
  const payload: Record<string, unknown> = {};
  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.color !== undefined) payload.color = data.color;

  const { data: result, error } = await supabase
    .from('categorias_evento')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating categoria:', error.message);
    throw new Error(error.message || 'Error al actualizar la categoría');
  }

  return result as CategoriaEvento;
}

export function expandirPermanentes(
  eventos: Evento[],
  fechaInicio: string,
  fechaFin: string
): EventoOcurrencia[] {
  const ocurrencias: EventoOcurrencia[] = [];
  const inicioRango = dayjs(fechaInicio);
  const finRango = dayjs(fechaFin);

  for (const evento of eventos) {
    if (evento.tipo === 'unico') {
      const diaEvento = dayjs(evento.fecha_inicio);
      if (diaEvento.isAfter(finRango) || diaEvento.isBefore(inicioRango)) continue;
      ocurrencias.push({
        ...evento,
        fecha_ocurrencia: evento.fecha_inicio,
      });
    } else {
      const fechaFinEvento = evento.fecha_fin || evento.fecha_inicio;
      const inicio = dayjs.max(dayjs(evento.fecha_inicio), inicioRango);
      const fin = dayjs.min(dayjs(fechaFinEvento), finRango);
      let actual = inicio;
      while (actual.isBefore(fin) || actual.isSame(fin, 'day')) {
        ocurrencias.push({
          ...evento,
          fecha_ocurrencia: actual.format('YYYY-MM-DD'),
        });
        actual = actual.add(1, 'day');
      }
    }
  }

  return ocurrencias;
}

export function agruparPorDia(ocurrencias: EventoOcurrencia[]): Map<string, EventoOcurrencia[]> {
  const mapa = new Map<string, EventoOcurrencia[]>();
  for (const o of ocurrencias) {
    const existente = mapa.get(o.fecha_ocurrencia) || [];
    existente.push(o);
    mapa.set(o.fecha_ocurrencia, existente);
  }
  return mapa;
}
