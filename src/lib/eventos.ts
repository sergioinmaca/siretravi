import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import { supabase } from './supabase';
import type { Evento, EventoOcurrencia } from '../types';

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
  hora_fin: string;
  tipo: 'permanente' | 'unico';
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
      hora_fin: data.hora_fin,
      tipo: data.tipo,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating evento:', error.message, error.details, error.hint, error.code);
    throw new Error(error.message || 'Error al crear el evento');
  }

  return result as Evento;
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
