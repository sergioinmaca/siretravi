import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toDateInput, parseDateSafe } from '../lib/formatDate';
import type { Campamento, Refugiado, Familia, Modulo, CroquisGeneral } from '../types';

interface CampamentoContextType {
  campamentos: Campamento[];
  familias: Familia[];
  refugiados: Refugiado[];
  campamentoSeleccionado: Campamento | null;
  loading: boolean;
  errorCarga: string | null;
  seleccionarCampamento: (id: string) => void;
  agregarCampamento: (nuevo: Campamento) => Promise<void>;
  actualizarCampamento: (id: string, actualizado: Campamento) => Promise<void>;
  eliminarCampamento: (id: string) => Promise<void>;
  agregarFamilia: (nueva: Familia) => Promise<Familia | null>;
  eliminarFamilia: (id: string) => Promise<boolean>;
  agregarRefugiado: (nuevo: Refugiado) => Promise<Refugiado | null>;
  eliminarRefugiado: (id: string) => Promise<void>;
  actualizarRefugiado: (id: string, actualizado: Refugiado) => Promise<boolean>;
  actualizarFotoRefugiado: (id: string, data: { foto_url?: string | null; mascota_foto_url?: string | null }) => Promise<boolean>;
  obtenerRefugiadosPaginados: (campamentoId: string, page: number, pageSize: number, searchTerm?: string) => Promise<{ data: Refugiado[]; count: number }>;
  contarRefugiados: (campamentoId: string, genero?: boolean) => Promise<number>;
}

const CampamentoContext = createContext<CampamentoContextType | undefined>(undefined);

// ─── Helpers para mapear la respuesta de Supabase al tipo local ───────────────

function mapCampamento(row: Record<string, unknown>, carpasRows: Record<string, unknown>[]): Campamento {
  const myModulos = carpasRows
    .filter(c => c.campamento_id === row.id)
    .sort((a, b) => (a.orden as number) - (b.orden as number))
    .map(c => ({
      id: c.id as string,
      nombre: c.nombre as string,
      literas: c.literas as number,
      camas_individuales: c.camas_individuales as number,
      camas_duplex: c.camas_duplex as number,
      croquis_data: (c.croquis_data as string) || '',
    }));

  return {
    id: row.id as string,
    nombre: row.nombre as string,
    ubicacion: row.ubicacion as string,
    capacidad_maxima: row.capacidad_maxima as number,
    estado: row.estado as 'activo' | 'inactivo',
    tipo_contabilizacion: (row.tipo_contabilizacion as 'cama' | 'elemento') || 'elemento',
    croquis_general: parseCroquisGeneral(row.croquis_general as string | null),
    modulos: myModulos,
  };
}

function parseCroquisGeneral(raw: string | null): CroquisGeneral[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CroquisGeneral[];
    if (parsed && typeof parsed === 'object' && 'drawingBase64' in parsed) {
      return [{ nombre: 'Plano 1', croquis_data: raw }];
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CampamentoProvider({ children }: { children: ReactNode }) {
  const [campamentos, setCampamentos] = useState<Campamento[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [refugiados, setRefugiados] = useState<Refugiado[]>([]);
  const [campamentoSeleccionado, setCampamentoSeleccionado] = useState<Campamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ── Carga inicial de datos desde Supabase ──────────────────────────────────
  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      try {
        // Traer campamentos y carpas en paralelo
        const [{ data: campsData }, { data: carpasData }, { data: famData }, { data: refData }] = await Promise.all([
          supabase.from('campamentos').select('*').order('created_at', { ascending: true }),
          supabase.from('carpas').select('*').order('orden', { ascending: true }),
          supabase.from('familias').select('*').order('created_at', { ascending: true }),
          supabase.from('refugiados').select('*').order('created_at', { ascending: true }),
        ]);

        const campsRows = (campsData || []) as Record<string, unknown>[];
        const carpasRows = (carpasData || []) as Record<string, unknown>[];
        const famRows = (famData || []) as Record<string, unknown>[];
        const refRows = (refData || []) as Record<string, unknown>[];

        const campamentosMapped = campsRows.map(c => mapCampamento(c, carpasRows));

        const familiasMapped: Familia[] = famRows.map(f => ({
          id: f.id as string,
          campamento_id: f.campamento_id as string,
          nombre: f.nombre as string,
        }));

        const refugiadosMapped: Refugiado[] = refRows.map(r => ({
          id: r.id as string,
          campamento_id: r.campamento_id as string,
          familia_id: (r.familia_id as string) || undefined,
          codigo: (r.codigo as string) || '',
          nombres: r.nombres as string,
          apellidos: r.apellidos as string,
          cedula: r.cedula as number | undefined,
          genero: r.genero as boolean,
          fecha_nacimiento: parseDateSafe(r.fecha_nacimiento as string),
          es_jefe_familia: r.es_jefe_familia as boolean,
          nro_cama: (r.nro_cama as string) || '',
          procedencia: (r.procedencia as string) || '',
          fecha_ingreso: r.fecha_ingreso ? parseDateSafe(r.fecha_ingreso as string) : undefined,
          direccion_exacta: (r.direccion_exacta as string) || undefined,
          discapacidad: r.discapacidad as boolean,
          embarazo: r.embarazo as boolean,
          tiempo_embarazo: r.tiempo_embarazo as number | undefined,
          mascotas: r.mascotas as boolean,
          tipo_mascota: (r.tipo_mascota as string) || undefined,
          mascota_sexo: r.mascota_sexo as boolean | undefined,
          mascota_raza: (r.mascota_raza as string) || undefined,
          mascota_nombre: (r.mascota_nombre as string) || undefined,
          mascota_edad: r.mascota_edad as number | undefined,
          telefono: r.telefono as number | undefined,
          profesion: (r.profesion as string) || undefined,
          talla_camisa: (r.talla_camisa as string) || undefined,
          talla_pantalon: (r.talla_pantalon as string) || undefined,
          talla_zapatos: (r.talla_zapatos as string) || undefined,
          alergias: r.alergias as boolean,
          enfermedad_cronica: r.enfermedad_cronica as boolean,
          lesion_sismo: r.lesion_sismo as boolean,
          adulto_mayor_dependencia: r.adulto_mayor_dependencia as boolean,
          lactante: r.lactante as boolean | undefined,
          nivel_educativo: (r.nivel_educativo as string) || undefined,
          condicion_vivienda: (r.condicion_vivienda as string) || undefined,
          tenencia_vivienda: (r.tenencia_vivienda as string) || undefined,
          ingreso_familiar: (r.ingreso_familiar as string) || undefined,
          observaciones: (r.observaciones as string) || undefined,
          observaciones_generales: (r.observaciones_generales as string) || undefined,
          parentesco: (r.parentesco as string) || undefined,
          hogar_solidario: (r.hogar_solidario as string) || 'PRESENTE',
          registro_captahuella: (r.registro_captahuella as boolean) || false,
          registro_unico_vivienda: (r.registro_unico_vivienda as boolean) || false,
          foto_url: (r.foto_url as string) || undefined,
          mascota_foto_url: (r.mascota_foto_url as string) || undefined,
        }));

        setCampamentos(campamentosMapped);
        setFamilias(familiasMapped);
        setRefugiados(refugiadosMapped);

        // Restaurar campamento guardado o seleccionar el primero
        if (campamentosMapped.length > 0) {
          const savedId = localStorage.getItem('campamentoId');
          const saved = savedId ? campamentosMapped.find(c => c.id === savedId) : null;
          setCampamentoSeleccionado(saved || campamentosMapped[0]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        console.error('Error cargando datos:', err);
        setErrorCarga(message);
      } finally {
        setLoading(false);
      }
    }
    cargarDatos();

    // ── Suscripción a Realtime ────────────────────────────────────────────────
    const mapRefugiadoPayload = (r: Record<string, any>): Refugiado => ({
        id: r.id,
        campamento_id: r.campamento_id,
        familia_id: r.familia_id || undefined,
        codigo: r.codigo || '',
        nombres: r.nombres,
        apellidos: r.apellidos,
        cedula: r.cedula || undefined,
        genero: r.genero,
        fecha_nacimiento: parseDateSafe(r.fecha_nacimiento),
        es_jefe_familia: r.es_jefe_familia,
        nro_cama: r.nro_cama || '',
        procedencia: r.procedencia || '',
        fecha_ingreso: r.fecha_ingreso ? parseDateSafe(r.fecha_ingreso) : undefined,
        direccion_exacta: r.direccion_exacta || undefined,
        discapacidad: r.discapacidad,
        embarazo: r.embarazo,
        tiempo_embarazo: r.tiempo_embarazo || undefined,
        mascotas: r.mascotas,
        tipo_mascota: r.tipo_mascota || undefined,
        mascota_sexo: r.mascota_sexo ?? undefined,
        mascota_raza: r.mascota_raza || undefined,
        mascota_nombre: r.mascota_nombre || undefined,
        mascota_edad: r.mascota_edad || undefined,
        telefono: r.telefono || undefined,
        profesion: r.profesion || undefined,
        talla_camisa: r.talla_camisa || undefined,
        talla_pantalon: r.talla_pantalon || undefined,
        talla_zapatos: r.talla_zapatos || undefined,
        alergias: r.alergias,
        enfermedad_cronica: r.enfermedad_cronica,
        lesion_sismo: r.lesion_sismo,
        adulto_mayor_dependencia: r.adulto_mayor_dependencia,
        lactante: r.lactante ?? undefined,
        nivel_educativo: r.nivel_educativo || undefined,
        condicion_vivienda: r.condicion_vivienda || undefined,
        tenencia_vivienda: r.tenencia_vivienda || undefined,
        ingreso_familiar: r.ingreso_familiar || undefined,
        observaciones: r.observaciones || undefined,
        observaciones_generales: r.observaciones_generales || undefined,
        parentesco: r.parentesco || undefined,
        hogar_solidario: r.hogar_solidario || 'PRESENTE',
        registro_captahuella: r.registro_captahuella || false,
        registro_unico_vivienda: r.registro_unico_vivienda || false,
        foto_url: r.foto_url || undefined,
        mascota_foto_url: r.mascota_foto_url || undefined,
      });

      const channel = supabase.channel('campamentos-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'refugiados' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setRefugiados(prev => {
              if (prev.find(r => r.id === payload.new.id)) return prev;
              return [...prev, mapRefugiadoPayload(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setRefugiados(prev => prev.map(r => r.id === payload.new.id ? mapRefugiadoPayload(payload.new) : r));
          } else if (payload.eventType === 'DELETE') {
            setRefugiados(prev => prev.filter(r => r.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'familias' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setFamilias(prev => {
              if (prev.find(f => f.id === payload.new.id)) return prev;
              return [...prev, { id: payload.new.id, campamento_id: payload.new.campamento_id, nombre: payload.new.nombre }];
            });
          } else if (payload.eventType === 'DELETE') {
            setFamilias(prev => prev.filter(f => f.id !== payload.old.id));
          }
        })

        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, []);

  // ── Seleccionar Campamento ─────────────────────────────────────────────────
  const seleccionarCampamento = (id: string) => {
    const encontrado = campamentos.find(c => c.id === id);
    if (encontrado) {
      setCampamentoSeleccionado(encontrado);
      localStorage.setItem('campamentoId', id);
    }
  };

  // ── Agregar Campamento ─────────────────────────────────────────────────────
  const agregarCampamento = async (nuevo: Campamento) => {
    // 1. Insertar el campamento
    const { data: campData, error: campError } = await supabase
      .from('campamentos')
      .insert({
        nombre: nuevo.nombre,
        ubicacion: nuevo.ubicacion,
        capacidad_maxima: nuevo.capacidad_maxima,
        estado: nuevo.estado,
        tipo_contabilizacion: nuevo.tipo_contabilizacion,
        croquis_general: nuevo.croquis_general && nuevo.croquis_general.length > 0 ? JSON.stringify(nuevo.croquis_general) : null,
      })
      .select()
      .single();

    if (campError || !campData) {
      console.error('Error al crear campamento:', campError);
      throw new Error(campError?.message || 'Error al crear campamento');
    }

    // 2. Insertar los modulos asociados
    if (nuevo.modulos.length > 0) {
      const modulosToInsert = nuevo.modulos.map((c, i) => ({
        campamento_id: campData.id,
        nombre: c.nombre,
        literas: c.literas,
        camas_individuales: c.camas_individuales,
        camas_duplex: c.camas_duplex,
        croquis_data: c.croquis_data || null,
        orden: i,
      }));
      const { data: carpasData, error: carpasError } = await supabase
        .from('carpas')
        .insert(modulosToInsert)
        .select();

      if (carpasError) {
        console.error('Error al crear modulos:', carpasError);
        throw new Error(carpasError.message || 'Error al crear modulos');
      }

      const modulosGuardados: Modulo[] = (carpasData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        nombre: c.nombre as string,
        literas: c.literas as number,
        camas_individuales: c.camas_individuales as number,
        camas_duplex: c.camas_duplex as number,
        croquis_data: (c.croquis_data as string) || '',
      }));

      const campamentoCompleto: Campamento = {
        id: campData.id,
        nombre: campData.nombre,
        ubicacion: campData.ubicacion,
        capacidad_maxima: campData.capacidad_maxima,
        estado: campData.estado,
        tipo_contabilizacion: (campData.tipo_contabilizacion as 'cama' | 'elemento') || 'elemento',
        croquis_general: nuevo.croquis_general || null,
        modulos: modulosGuardados,
      };

      setCampamentos(prev => {
        const nuevos = [...prev, campamentoCompleto];
        if (nuevos.length === 1) setCampamentoSeleccionado(campamentoCompleto);
        return nuevos;
      });
    } else {
      const campamentoCompleto: Campamento = { ...campData, croquis_general: null, modulos: [] } as Campamento;
      setCampamentos(prev => {
        const nuevos = [...prev, campamentoCompleto];
        if (nuevos.length === 1) setCampamentoSeleccionado(campamentoCompleto);
        return nuevos;
      });
    }
  };

  // ── Actualizar Campamento ──────────────────────────────────────────────────
  const actualizarCampamento = async (id: string, actualizado: Campamento) => {
    // 1. Actualizar datos del campamento
    const { error: campError } = await supabase
      .from('campamentos')
      .update({
        nombre: actualizado.nombre,
        ubicacion: actualizado.ubicacion,
        capacidad_maxima: actualizado.capacidad_maxima,
        estado: actualizado.estado,
        tipo_contabilizacion: actualizado.tipo_contabilizacion,
        croquis_general: actualizado.croquis_general && actualizado.croquis_general.length > 0 ? JSON.stringify(actualizado.croquis_general) : null,
      })
      .eq('id', id);

    if (campError) {
      console.error('Error al actualizar campamento:', campError);
      throw new Error(campError.message || 'Error al actualizar campamento');
    }

    // 2. Borrar modulos antiguos y reinsertar (upsert completo)
    await supabase.from('carpas').delete().eq('campamento_id', id);

    let modulosGuardados: Modulo[] = [];
    if (actualizado.modulos.length > 0) {
      const modulosToInsert = actualizado.modulos.map((c, i) => ({
        campamento_id: id,
        nombre: c.nombre,
        literas: c.literas,
        camas_individuales: c.camas_individuales,
        camas_duplex: c.camas_duplex,
        croquis_data: c.croquis_data || null,
        orden: i,
      }));
      const { data: carpasData, error: carpasError } = await supabase
        .from('carpas')
        .insert(modulosToInsert)
        .select();

      if (carpasError) {
        console.error('Error al actualizar modulos:', carpasError);
        throw new Error(carpasError.message || 'Error al actualizar modulos');
      }

      modulosGuardados = (carpasData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        nombre: c.nombre as string,
        literas: c.literas as number,
        camas_individuales: c.camas_individuales as number,
        camas_duplex: c.camas_duplex as number,
        croquis_data: (c.croquis_data as string) || '',
      }));
    }

    const campActualizado = { ...actualizado, modulos: modulosGuardados };
    setCampamentos(prev => prev.map(c => c.id === id ? campActualizado : c));
    if (campamentoSeleccionado?.id === id) setCampamentoSeleccionado(campActualizado);
  };

  // ── Eliminar Campamento ────────────────────────────────────────────────────
  const eliminarCampamento = async (id: string) => {
    const { error } = await supabase.from('campamentos').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar campamento:', error);
      return;
    }
    setCampamentos(prev => {
      const restantes = prev.filter(c => c.id !== id);
      if (campamentoSeleccionado?.id === id) {
        setCampamentoSeleccionado(restantes.length > 0 ? restantes[0] : null);
      }
      return restantes;
    });
  };

  // ── Agregar Familia ────────────────────────────────────────────────────────
  const agregarFamilia = async (nueva: Familia): Promise<Familia | null> => {
    const { data, error } = await supabase
      .from('familias')
      .insert({ campamento_id: nueva.campamento_id, nombre: nueva.nombre })
      .select()
      .single();

    if (error || !data) {
      console.error('Error al crear familia:', error);
      return null;
    }

    const familiaCreada: Familia = {
      id: data.id,
      campamento_id: data.campamento_id,
      nombre: data.nombre,
    };
    setFamilias(prev => {
      if (prev.find(f => f.id === familiaCreada.id)) return prev;
      return [...prev, familiaCreada];
    });
    return familiaCreada;
  };

  // ── Eliminar Familia ─────────────────────────────────────────────────────
  const eliminarFamilia = async (id: string): Promise<boolean> => {
    const jefe = refugiados.find(r => r.familia_id === id && r.es_jefe_familia);
    if (jefe) {
      alert(`No se puede eliminar esta familia porque ${jefe.nombres} ${jefe.apellidos} es su Jefe de Familia.${jefe.nro_cama ? ` Cama: ${jefe.nro_cama}.` : ''}`);
      return false;
    }

    const { error } = await supabase.from('familias').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar familia:', error);
      return false;
    }
    setFamilias(prev => prev.filter(f => f.id !== id));
    setRefugiados(prev => prev.map(r => r.familia_id === id ? { ...r, familia_id: undefined } : r));
    return true;
  };

  // ── Agregar Refugiado ──────────────────────────────────────────────────────
  const agregarRefugiado = async (nuevo: Refugiado) => {
    const campPref = campamentos
      .find(c => c.id === nuevo.campamento_id)
      ?.nombre
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || 'CAM';

    let secuencia = 1;
    const { data: actual } = await supabase
      .from('campamento_contadores')
      .select('ultimo_secuencia')
      .eq('campamento_id', nuevo.campamento_id)
      .single();

    if (actual) {
      secuencia = (actual.ultimo_secuencia as number) + 1;
      const { error: updErr } = await supabase
        .from('campamento_contadores')
        .update({ ultimo_secuencia: secuencia } as Record<string, unknown>)
        .eq('campamento_id', nuevo.campamento_id);

      if (updErr) {
        console.error('Error incrementando contador:', updErr);
      }
    } else {
      const { error: insErr } = await supabase
        .from('campamento_contadores')
        .insert({ campamento_id: nuevo.campamento_id, ultimo_secuencia: 1 });

      if (insErr) {
        const { data: retryActual } = await supabase
          .from('campamento_contadores')
          .select('ultimo_secuencia')
          .eq('campamento_id', nuevo.campamento_id)
          .single();
        if (retryActual) {
          secuencia = (retryActual.ultimo_secuencia as number) + 1;
          await supabase
            .from('campamento_contadores')
            .update({ ultimo_secuencia: secuencia } as Record<string, unknown>)
            .eq('campamento_id', nuevo.campamento_id);
        }
      }
    }

    const codigo = `${campPref}-${String(secuencia).padStart(4, '0')}`;

    const { data, error } = await supabase
      .from('refugiados')
      .insert({
        campamento_id: nuevo.campamento_id,
        familia_id: nuevo.familia_id || null,
        codigo,
        nombres: nuevo.nombres,
        apellidos: nuevo.apellidos,
        cedula: nuevo.cedula || null,
        genero: nuevo.genero,
        fecha_nacimiento: nuevo.fecha_nacimiento instanceof Date
          ? toDateInput(nuevo.fecha_nacimiento)
          : nuevo.fecha_nacimiento,
        es_jefe_familia: nuevo.es_jefe_familia,
        nro_cama: nuevo.nro_cama || null,
        procedencia: nuevo.procedencia || null,
        fecha_ingreso: nuevo.fecha_ingreso instanceof Date
          ? toDateInput(nuevo.fecha_ingreso)
          : (nuevo.fecha_ingreso || null),
        direccion_exacta: nuevo.direccion_exacta || null,
        discapacidad: nuevo.discapacidad,
        embarazo: nuevo.embarazo,
        tiempo_embarazo: nuevo.tiempo_embarazo || null,
        mascotas: nuevo.mascotas,
        tipo_mascota: nuevo.tipo_mascota || null,
        mascota_sexo: nuevo.mascota_sexo ?? null,
        mascota_raza: nuevo.mascota_raza || null,
        mascota_nombre: nuevo.mascota_nombre || null,
        mascota_edad: nuevo.mascota_edad || null,
        telefono: nuevo.telefono || null,
        profesion: nuevo.profesion || null,
        talla_camisa: nuevo.talla_camisa || null,
        talla_pantalon: nuevo.talla_pantalon || null,
        talla_zapatos: nuevo.talla_zapatos || null,
        alergias: nuevo.alergias,
        enfermedad_cronica: nuevo.enfermedad_cronica,
        lesion_sismo: nuevo.lesion_sismo,
        adulto_mayor_dependencia: nuevo.adulto_mayor_dependencia,
        lactante: nuevo.lactante ?? null,
        nivel_educativo: nuevo.nivel_educativo || null,
        condicion_vivienda: nuevo.condicion_vivienda || null,
        tenencia_vivienda: nuevo.tenencia_vivienda || null,
        ingreso_familiar: nuevo.ingreso_familiar || null,
        observaciones: nuevo.observaciones || null,
        observaciones_generales: nuevo.observaciones_generales || null,
        parentesco: nuevo.parentesco || null,
        hogar_solidario: nuevo.hogar_solidario || 'PRESENTE',
        registro_captahuella: nuevo.registro_captahuella,
        registro_unico_vivienda: nuevo.registro_unico_vivienda,
        foto_url: nuevo.foto_url || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error al registrar refugiado:', error);
      return null;
    }

    const refugiadoCreado: Refugiado = {
      id: data.id,
      campamento_id: data.campamento_id,
      familia_id: data.familia_id || undefined,
      codigo: data.codigo || '',
      nombres: data.nombres,
      apellidos: data.apellidos,
      cedula: data.cedula || undefined,
      genero: data.genero,
      fecha_nacimiento: parseDateSafe(data.fecha_nacimiento),
      es_jefe_familia: data.es_jefe_familia,
      nro_cama: data.nro_cama || '',
      procedencia: data.procedencia || '',
      fecha_ingreso: data.fecha_ingreso ? parseDateSafe(data.fecha_ingreso) : undefined,
      direccion_exacta: data.direccion_exacta || undefined,
      discapacidad: data.discapacidad,
      embarazo: data.embarazo,
      tiempo_embarazo: data.tiempo_embarazo || undefined,
      mascotas: data.mascotas,
      tipo_mascota: data.tipo_mascota || undefined,
      mascota_sexo: data.mascota_sexo ?? undefined,
      mascota_raza: data.mascota_raza || undefined,
      mascota_nombre: data.mascota_nombre || undefined,
      mascota_edad: data.mascota_edad || undefined,
      telefono: data.telefono || undefined,
      profesion: data.profesion || undefined,
      talla_camisa: data.talla_camisa || undefined,
      talla_pantalon: data.talla_pantalon || undefined,
      talla_zapatos: data.talla_zapatos || undefined,
      alergias: data.alergias,
      enfermedad_cronica: data.enfermedad_cronica,
      lesion_sismo: data.lesion_sismo,
      adulto_mayor_dependencia: data.adulto_mayor_dependencia,
      lactante: data.lactante ?? undefined,
      nivel_educativo: data.nivel_educativo || undefined,
      condicion_vivienda: data.condicion_vivienda || undefined,
      tenencia_vivienda: data.tenencia_vivienda || undefined,
      ingreso_familiar: data.ingreso_familiar || undefined,
      observaciones: data.observaciones || undefined,
      observaciones_generales: (data.observaciones_generales as string) || undefined,
      parentesco: data.parentesco || undefined,
      hogar_solidario: (data.hogar_solidario as string) || 'PRESENTE',
      registro_captahuella: data.registro_captahuella || false,
      registro_unico_vivienda: data.registro_unico_vivienda || false,
      foto_url: (data.foto_url as string) || undefined,
    };
    setRefugiados(prev => {
      if (prev.find(r => r.id === refugiadoCreado.id)) return prev;
      return [...prev, refugiadoCreado];
    });
    return refugiadoCreado;
  };

  // ── Eliminar Refugiado ─────────────────────────────────────────────────
  const eliminarRefugiado = async (id: string) => {
    const refugiado = refugiados.find(r => r.id === id);

    if (refugiado?.foto_url) {
      const match = refugiado.foto_url.match(/\/fotos-integrantes\/(.+)$/);
      if (match) await supabase.storage.from('fotos-integrantes').remove([match[1]]);
    }

    if (refugiado?.mascota_foto_url) {
      const match = refugiado.mascota_foto_url.match(/\/fotos-integrantes\/(.+)$/);
      if (match) await supabase.storage.from('fotos-integrantes').remove([match[1]]);
    }

    const { error } = await supabase.from('refugiados').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar refugiado:', error);
      return;
    }
    setRefugiados(prev => prev.filter(r => r.id !== id));
  };

  // ── Actualizar Refugiado ───────────────────────────────────────────────
  const actualizarRefugiado = async (id: string, actualizado: Refugiado): Promise<boolean> => {
    const { error } = await supabase
      .from('refugiados')
      .update({
        campamento_id: actualizado.campamento_id,
        familia_id: actualizado.familia_id || null,
        nombres: actualizado.nombres,
        apellidos: actualizado.apellidos,
        cedula: actualizado.cedula || null,
        genero: actualizado.genero,
        fecha_nacimiento: actualizado.fecha_nacimiento instanceof Date
          ? toDateInput(actualizado.fecha_nacimiento)
          : actualizado.fecha_nacimiento,
        es_jefe_familia: actualizado.es_jefe_familia,
        nro_cama: actualizado.nro_cama || null,
        procedencia: actualizado.procedencia || null,
        fecha_ingreso: actualizado.fecha_ingreso instanceof Date
          ? toDateInput(actualizado.fecha_ingreso)
          : (actualizado.fecha_ingreso || null),
        direccion_exacta: actualizado.direccion_exacta || null,
        discapacidad: actualizado.discapacidad,
        embarazo: actualizado.embarazo,
        tiempo_embarazo: actualizado.tiempo_embarazo || null,
        mascotas: actualizado.mascotas,
        tipo_mascota: actualizado.tipo_mascota || null,
        mascota_sexo: actualizado.mascota_sexo ?? null,
        mascota_raza: actualizado.mascota_raza || null,
        mascota_nombre: actualizado.mascota_nombre || null,
        mascota_edad: actualizado.mascota_edad || null,
        telefono: actualizado.telefono || null,
        profesion: actualizado.profesion || null,
        talla_camisa: actualizado.talla_camisa || null,
        talla_pantalon: actualizado.talla_pantalon || null,
        talla_zapatos: actualizado.talla_zapatos || null,
        alergias: actualizado.alergias,
        enfermedad_cronica: actualizado.enfermedad_cronica,
        lesion_sismo: actualizado.lesion_sismo,
        adulto_mayor_dependencia: actualizado.adulto_mayor_dependencia,
        lactante: actualizado.lactante ?? null,
        nivel_educativo: actualizado.nivel_educativo || null,
        condicion_vivienda: actualizado.condicion_vivienda || null,
        tenencia_vivienda: actualizado.tenencia_vivienda || null,
        ingreso_familiar: actualizado.ingreso_familiar || null,
        observaciones: actualizado.observaciones || null,
        observaciones_generales: actualizado.observaciones_generales || null,
        parentesco: actualizado.parentesco || null,
        hogar_solidario: actualizado.hogar_solidario || 'PRESENTE',
        registro_captahuella: actualizado.registro_captahuella,
        registro_unico_vivienda: actualizado.registro_unico_vivienda,
        foto_url: actualizado.foto_url || null,
        mascota_foto_url: actualizado.mascota_foto_url || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar refugiado:', error);
      return false;
    }

    setRefugiados(prev => prev.map(r => r.id === id ? { ...actualizado, id } : r));
    return true;
  };

  const actualizarFotoRefugiado = async (id: string, data: { foto_url?: string | null; mascota_foto_url?: string | null }): Promise<boolean> => {
    const updateData: Record<string, unknown> = {};
    if (data.foto_url !== undefined) updateData.foto_url = data.foto_url;
    if (data.mascota_foto_url !== undefined) updateData.mascota_foto_url = data.mascota_foto_url;

    const { error } = await supabase
      .from('refugiados')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[CampamentoContext] Error al actualizar foto de refugiado:', error);
      return false;
    }

    setRefugiados(prev => prev.map(r => r.id === id ? { ...r, ...updateData } as Refugiado : r));
    return true;
  };

  // ── Obtener Refugiados Paginados ─────────────────────────────────────────────
  const obtenerRefugiadosPaginados = useCallback(async (
    campamentoId: string,
    page: number,
    pageSize: number,
    searchTerm?: string
  ): Promise<{ data: Refugiado[]; count: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('refugiados')
      .select('*', { count: 'exact' })
      .eq('campamento_id', campamentoId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (searchTerm?.trim()) {
      const term = searchTerm.trim();
      const textFields = `nombres.ilike.*${term}*,apellidos.ilike.*${term}*,codigo.ilike.*${term}*,nro_cama.ilike.*${term}*,procedencia.ilike.*${term}*`;
      const numTerm = parseInt(term);
      if (!isNaN(numTerm) && String(numTerm) === term) {
        query = query.or(`${textFields},cedula.eq.${numTerm}`);
      } else {
        query = query.or(textFields);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener refugiados paginados:', error);
      return { data: [], count: 0 };
    }

    const mapped = ((data || []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      campamento_id: r.campamento_id as string,
      familia_id: (r.familia_id as string) || undefined,
      codigo: (r.codigo as string) || '',
      nombres: r.nombres as string,
      apellidos: r.apellidos as string,
      cedula: r.cedula as number | undefined,
      genero: r.genero as boolean,
      fecha_nacimiento: parseDateSafe(r.fecha_nacimiento as string),
      es_jefe_familia: r.es_jefe_familia as boolean,
      nro_cama: (r.nro_cama as string) || '',
      procedencia: (r.procedencia as string) || '',
      fecha_ingreso: r.fecha_ingreso ? parseDateSafe(r.fecha_ingreso as string) : undefined,
      direccion_exacta: (r.direccion_exacta as string) || undefined,
      discapacidad: r.discapacidad as boolean,
      embarazo: r.embarazo as boolean,
      tiempo_embarazo: (r.tiempo_embarazo as number) || undefined,
      mascotas: r.mascotas as boolean,
      tipo_mascota: (r.tipo_mascota as string) || undefined,
      mascota_sexo: (r.mascota_sexo as boolean) ?? undefined,
      mascota_raza: (r.mascota_raza as string) || undefined,
      mascota_nombre: (r.mascota_nombre as string) || undefined,
      mascota_edad: (r.mascota_edad as number) || undefined,
      telefono: (r.telefono as number) || undefined,
      profesion: (r.profesion as string) || undefined,
      talla_camisa: (r.talla_camisa as string) || undefined,
      talla_pantalon: (r.talla_pantalon as string) || undefined,
      talla_zapatos: (r.talla_zapatos as string) || undefined,
      alergias: r.alergias as boolean,
      enfermedad_cronica: r.enfermedad_cronica as boolean,
      lesion_sismo: r.lesion_sismo as boolean,
      adulto_mayor_dependencia: r.adulto_mayor_dependencia as boolean,
      lactante: (r.lactante as boolean) ?? undefined,
      nivel_educativo: (r.nivel_educativo as string) || undefined,
      condicion_vivienda: (r.condicion_vivienda as string) || undefined,
      tenencia_vivienda: (r.tenencia_vivienda as string) || undefined,
      ingreso_familiar: (r.ingreso_familiar as string) || undefined,
      observaciones: (r.observaciones as string) || undefined,
      observaciones_generales: (r.observaciones_generales as string) || undefined,
      parentesco: (r.parentesco as string) || undefined,
      hogar_solidario: (r.hogar_solidario as string) || 'PRESENTE',
      registro_captahuella: (r.registro_captahuella as boolean) || false,
      registro_unico_vivienda: (r.registro_unico_vivienda as boolean) || false,
      foto_url: (r.foto_url as string) || undefined,
      mascota_foto_url: (r.mascota_foto_url as string) || undefined,
    })) as Refugiado[];

    return { data: mapped, count: count || 0 };
  }, []);

  // ── Contar Refugiados ───────────────────────────────────────────────────────
  const contarRefugiados = useCallback(async (campamentoId: string, genero?: boolean): Promise<number> => {
    let query = supabase
      .from('refugiados')
      .select('*', { count: 'exact', head: true })
      .eq('campamento_id', campamentoId);

    if (genero !== undefined) {
      query = query.eq('genero', genero);
    }

    const { count, error } = await query;
    if (error) {
      console.error('Error al contar refugiados:', error);
      return 0;
    }
    return count || 0;
  }, []);

  return (
    <CampamentoContext.Provider value={{
      campamentos, familias, refugiados,
      campamentoSeleccionado, loading, errorCarga, seleccionarCampamento,
      agregarCampamento, actualizarCampamento, eliminarCampamento,
      agregarFamilia, eliminarFamilia, agregarRefugiado, eliminarRefugiado, actualizarRefugiado, actualizarFotoRefugiado,
      obtenerRefugiadosPaginados, contarRefugiados,
    }}>
      {children}
    </CampamentoContext.Provider>
  );
}

export function useCampamento() {
  const context = useContext(CampamentoContext);
  if (context === undefined) {
    throw new Error('useCampamento debe ser utilizado dentro de un CampamentoProvider');
  }
  return context;
}
