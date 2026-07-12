import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Campamento, Refugiado, Familia, Carpa } from '../types';

interface CampamentoContextType {
  campamentos: Campamento[];
  familias: Familia[];
  refugiados: Refugiado[];
  campamentoSeleccionado: Campamento | null;
  loading: boolean;
  seleccionarCampamento: (id: string) => void;
  agregarCampamento: (nuevo: Campamento) => Promise<void>;
  actualizarCampamento: (id: string, actualizado: Campamento) => Promise<void>;
  eliminarCampamento: (id: string) => Promise<void>;
  agregarFamilia: (nueva: Familia) => Promise<Familia | null>;
  eliminarFamilia: (id: string) => Promise<void>;
  agregarRefugiado: (nuevo: Refugiado) => Promise<void>;
  eliminarRefugiado: (id: string) => Promise<void>;
  actualizarRefugiado: (id: string, actualizado: Refugiado) => Promise<void>;
}

const CampamentoContext = createContext<CampamentoContextType | undefined>(undefined);

// ─── Helpers para mapear la respuesta de Supabase al tipo local ───────────────

function mapCampamento(row: Record<string, unknown>, carpasRows: Record<string, unknown>[]): Campamento {
  const myCarpas = carpasRows
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
    carpas: myCarpas,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CampamentoProvider({ children }: { children: ReactNode }) {
  const [campamentos, setCampamentos] = useState<Campamento[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [refugiados, setRefugiados] = useState<Refugiado[]>([]);
  const [campamentoSeleccionado, setCampamentoSeleccionado] = useState<Campamento | null>(null);
  const [loading, setLoading] = useState(true);

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
          nombres: r.nombres as string,
          apellidos: r.apellidos as string,
          cedula: r.cedula as number | undefined,
          genero: r.genero as boolean,
          fecha_nacimiento: new Date(r.fecha_nacimiento as string),
          es_jefe_familia: r.es_jefe_familia as boolean,
          nro_cama: (r.nro_cama as string) || '',
          procedencia: (r.procedencia as string) || '',
          fecha_ingreso: r.fecha_ingreso ? new Date(r.fecha_ingreso as string) : undefined,
          direccion_exacta: (r.direccion_exacta as string) || undefined,
          discapacidad: r.discapacidad as boolean,
          tipo_discapacidad: (r.tipo_discapacidad as string) || undefined,
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
          tipo_alergia: (r.tipo_alergia as string) || undefined,
          enfermedad_cronica: r.enfermedad_cronica as boolean,
          medicamento_enfermedad: (r.medicamento_enfermedad as string) || undefined,
        }));

        setCampamentos(campamentosMapped);
        setFamilias(familiasMapped);
        setRefugiados(refugiadosMapped);

        // Auto-seleccionar el primero si existe
        if (campamentosMapped.length > 0) {
          setCampamentoSeleccionado(campamentosMapped[0]);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
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
      nombres: r.nombres,
      apellidos: r.apellidos,
      cedula: r.cedula || undefined,
      genero: r.genero,
      fecha_nacimiento: new Date(r.fecha_nacimiento),
      es_jefe_familia: r.es_jefe_familia,
      nro_cama: r.nro_cama || '',
      procedencia: r.procedencia || '',
      fecha_ingreso: r.fecha_ingreso ? new Date(r.fecha_ingreso) : undefined,
      direccion_exacta: r.direccion_exacta || undefined,
      discapacidad: r.discapacidad,
      tipo_discapacidad: r.tipo_discapacidad || undefined,
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
      tipo_alergia: r.tipo_alergia || undefined,
      enfermedad_cronica: r.enfermedad_cronica,
      medicamento_enfermedad: r.medicamento_enfermedad || undefined,
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
    if (encontrado) setCampamentoSeleccionado(encontrado);
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
      })
      .select()
      .single();

    if (campError || !campData) {
      console.error('Error al crear campamento:', campError);
      throw new Error(campError?.message || 'Error al crear campamento');
    }

    // 2. Insertar las carpas asociadas
    if (nuevo.carpas.length > 0) {
      const carpasToInsert = nuevo.carpas.map((c, i) => ({
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
        .insert(carpasToInsert)
        .select();

      if (carpasError) {
        console.error('Error al crear carpas:', carpasError);
        throw new Error(carpasError.message || 'Error al crear carpas');
      }

      const carpasGuardadas: Carpa[] = (carpasData || []).map((c: Record<string, unknown>) => ({
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
        carpas: carpasGuardadas,
      };

      setCampamentos(prev => {
        const nuevos = [...prev, campamentoCompleto];
        if (nuevos.length === 1) setCampamentoSeleccionado(campamentoCompleto);
        return nuevos;
      });
    } else {
      const campamentoCompleto: Campamento = { ...campData, carpas: [] };
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
      })
      .eq('id', id);

    if (campError) {
      console.error('Error al actualizar campamento:', campError);
      throw new Error(campError.message || 'Error al actualizar campamento');
    }

    // 2. Borrar carpas antiguas y reinsertar (upsert completo)
    await supabase.from('carpas').delete().eq('campamento_id', id);

    let carpasGuardadas: Carpa[] = [];
    if (actualizado.carpas.length > 0) {
      const carpasToInsert = actualizado.carpas.map((c, i) => ({
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
        .insert(carpasToInsert)
        .select();

      if (carpasError) {
        console.error('Error al actualizar carpas:', carpasError);
        throw new Error(carpasError.message || 'Error al actualizar carpas');
      }

      carpasGuardadas = (carpasData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        nombre: c.nombre as string,
        literas: c.literas as number,
        camas_individuales: c.camas_individuales as number,
        camas_duplex: c.camas_duplex as number,
        croquis_data: (c.croquis_data as string) || '',
      }));
    }

    const campActualizado = { ...actualizado, carpas: carpasGuardadas };
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
    setFamilias(prev => [...prev, familiaCreada]);
    return familiaCreada;
  };

  // ── Eliminar Familia ─────────────────────────────────────────────────────
  const eliminarFamilia = async (id: string) => {
    const { error } = await supabase.from('familias').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar familia:', error);
      return;
    }
    setFamilias(prev => prev.filter(f => f.id !== id));
    setRefugiados(prev => prev.map(r => r.familia_id === id ? { ...r, familia_id: undefined } : r));
  };

  // ── Agregar Refugiado ──────────────────────────────────────────────────────
  const agregarRefugiado = async (nuevo: Refugiado) => {
    const { data, error } = await supabase
      .from('refugiados')
      .insert({
        campamento_id: nuevo.campamento_id,
        familia_id: nuevo.familia_id || null,
        nombres: nuevo.nombres,
        apellidos: nuevo.apellidos,
        cedula: nuevo.cedula || null,
        genero: nuevo.genero,
        fecha_nacimiento: nuevo.fecha_nacimiento instanceof Date
          ? nuevo.fecha_nacimiento.toISOString().split('T')[0]
          : nuevo.fecha_nacimiento,
        es_jefe_familia: nuevo.es_jefe_familia,
        nro_cama: nuevo.nro_cama || null,
        procedencia: nuevo.procedencia || null,
        fecha_ingreso: nuevo.fecha_ingreso instanceof Date
          ? nuevo.fecha_ingreso.toISOString().split('T')[0]
          : (nuevo.fecha_ingreso || null),
        direccion_exacta: nuevo.direccion_exacta || null,
        discapacidad: nuevo.discapacidad,
        tipo_discapacidad: nuevo.tipo_discapacidad || null,
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
        tipo_alergia: nuevo.tipo_alergia || null,
        enfermedad_cronica: nuevo.enfermedad_cronica,
        medicamento_enfermedad: nuevo.medicamento_enfermedad || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error al registrar refugiado:', error);
      return;
    }

    const refugiadoCreado: Refugiado = {
      id: data.id,
      campamento_id: data.campamento_id,
      familia_id: data.familia_id || undefined,
      nombres: data.nombres,
      apellidos: data.apellidos,
      cedula: data.cedula || undefined,
      genero: data.genero,
      fecha_nacimiento: new Date(data.fecha_nacimiento),
      es_jefe_familia: data.es_jefe_familia,
      nro_cama: data.nro_cama || '',
      procedencia: data.procedencia || '',
      discapacidad: data.discapacidad,
      tipo_discapacidad: data.tipo_discapacidad || undefined,
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
      tipo_alergia: data.tipo_alergia || undefined,
      enfermedad_cronica: data.enfermedad_cronica,
      medicamento_enfermedad: data.medicamento_enfermedad || undefined,
    };
    setRefugiados(prev => [...prev, refugiadoCreado]);
  };

  // ── Eliminar Refugiado ─────────────────────────────────────────────────
  const eliminarRefugiado = async (id: string) => {
    const { error } = await supabase.from('refugiados').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar refugiado:', error);
      return;
    }
    setRefugiados(prev => prev.filter(r => r.id !== id));
  };

  // ── Actualizar Refugiado ───────────────────────────────────────────────
  const actualizarRefugiado = async (id: string, actualizado: Refugiado) => {
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
          ? actualizado.fecha_nacimiento.toISOString().split('T')[0]
          : actualizado.fecha_nacimiento,
        es_jefe_familia: actualizado.es_jefe_familia,
        nro_cama: actualizado.nro_cama || null,
        procedencia: actualizado.procedencia || null,
        fecha_ingreso: actualizado.fecha_ingreso instanceof Date
          ? actualizado.fecha_ingreso.toISOString().split('T')[0]
          : (actualizado.fecha_ingreso || null),
        direccion_exacta: actualizado.direccion_exacta || null,
        discapacidad: actualizado.discapacidad,
        tipo_discapacidad: actualizado.tipo_discapacidad || null,
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
        tipo_alergia: actualizado.tipo_alergia || null,
        enfermedad_cronica: actualizado.enfermedad_cronica,
        medicamento_enfermedad: actualizado.medicamento_enfermedad || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar refugiado:', error);
      return;
    }

    setRefugiados(prev => prev.map(r => r.id === id ? { ...actualizado, id } : r));
  };

  return (
    <CampamentoContext.Provider value={{
      campamentos, familias, refugiados,
      campamentoSeleccionado, loading, seleccionarCampamento,
      agregarCampamento, actualizarCampamento, eliminarCampamento,
      agregarFamilia, eliminarFamilia, agregarRefugiado, eliminarRefugiado, actualizarRefugiado,
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
