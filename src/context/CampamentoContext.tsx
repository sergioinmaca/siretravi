import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toDateInput } from '../lib/formatDate';
import type { Campamento, Refugiado, Familia, Carpa, HistoriaClinica, AtencionMedica, Tratamiento } from '../types';

interface CampamentoContextType {
  campamentos: Campamento[];
  familias: Familia[];
  refugiados: Refugiado[];
  historiasClinicas: HistoriaClinica[];
  atencionesMedicas: AtencionMedica[];
  tratamientos: Tratamiento[];
  campamentoSeleccionado: Campamento | null;
  loading: boolean;
  errorCarga: string | null;
  seleccionarCampamento: (id: string) => void;
  agregarCampamento: (nuevo: Campamento) => Promise<void>;
  actualizarCampamento: (id: string, actualizado: Campamento) => Promise<void>;
  eliminarCampamento: (id: string) => Promise<void>;
  agregarFamilia: (nueva: Familia) => Promise<Familia | null>;
  eliminarFamilia: (id: string) => Promise<void>;
  agregarRefugiado: (nuevo: Refugiado) => Promise<void>;
  eliminarRefugiado: (id: string) => Promise<void>;
  actualizarRefugiado: (id: string, actualizado: Refugiado) => Promise<void>;
  agregarHistoriaClinica: (nueva: HistoriaClinica) => Promise<void>;
  actualizarHistoriaClinica: (id: string, actualizada: HistoriaClinica) => Promise<void>;
  agregarAtencionMedica: (nueva: AtencionMedica) => Promise<void>;
  agregarTratamiento: (nuevo: Tratamiento) => Promise<void>;
  eliminarTratamiento: (id: string) => Promise<void>;
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
  const [historiasClinicas, setHistoriasClinicas] = useState<HistoriaClinica[]>([]);
  const [atencionesMedicas, setAtencionesMedicas] = useState<AtencionMedica[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [campamentoSeleccionado, setCampamentoSeleccionado] = useState<Campamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // ── Carga inicial de datos desde Supabase ──────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    async function ejecutarQueries() {
      const results = await Promise.all([
        supabase.from('campamentos').select('*').order('created_at', { ascending: true }),
        supabase.from('carpas').select('*').order('orden', { ascending: true }),
        supabase.from('familias').select('*').order('created_at', { ascending: true }),
        supabase.from('refugiados').select('*').order('created_at', { ascending: true }),
        supabase.from('historias_clinicas').select('*').order('created_at', { ascending: true }),
        supabase.from('atenciones_medicas').select('*').order('fecha_atencion', { ascending: false }),
        supabase.from('tratamientos').select('*').order('hora', { ascending: true }),
      ]);

      const errores = results.filter(r => r.error !== null);
      return { results, errores };
    }

    async function cargarDatos(intento: number = 1) {
      if (cancelado) return;
      setLoading(true);
      setErrorCarga(null);

      let { results, errores } = await ejecutarQueries();

      if (errores.length > 0 && intento === 1) {
        console.warn(`[CampamentoContext] ${errores.length} query(s) fallaron (intento 1), reintentando en 500ms...`, errores.map(e => e.error));
        await new Promise(resolve => setTimeout(resolve, 500));
        if (cancelado) return;
        ({ results, errores } = await ejecutarQueries());
      }

      if (errores.length > 0) {
        console.error('[CampamentoContext] Las queries fallaron tras reintento:', errores.map(e => e.error));
        if (!cancelado) {
          setErrorCarga('Error al cargar los datos. Verifica tu conexión e intenta de nuevo.');
          setLoading(false);
        }
        return;
      }

      if (cancelado) return;

      const campsData = results[0].data;
      const carpasData = results[1].data;
      const famData = results[2].data;
      const refData = results[3].data;
      const hcData = results[4].data;
      const atData = results[5].data;
      const trData = results[6].data;

      const campsRows = (campsData || []) as Record<string, unknown>[];
      const carpasRows = (carpasData || []) as Record<string, unknown>[];
      const famRows = (famData || []) as Record<string, unknown>[];
      const refRows = (refData || []) as Record<string, unknown>[];
      const hcRows = (hcData || []) as Record<string, unknown>[];
      const atRows = (atData || []) as Record<string, unknown>[];
      const trRows = (trData || []) as Record<string, unknown>[];

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
        fecha_nacimiento: new Date(r.fecha_nacimiento as string),
        es_jefe_familia: r.es_jefe_familia as boolean,
        nro_cama: (r.nro_cama as string) || '',
        procedencia: (r.procedencia as string) || '',
        fecha_ingreso: r.fecha_ingreso ? new Date(r.fecha_ingreso as string) : undefined,
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
        parentesco: (r.parentesco as string) || undefined,
      }));

      setCampamentos(campamentosMapped);
      setFamilias(familiasMapped);
      setRefugiados(refugiadosMapped);

      const hcMapped: HistoriaClinica[] = hcRows.map(h => ({
        id: h.id as string,
        refugiado_id: h.refugiado_id as string,
        tipo_discapacidad: (h.tipo_discapacidad as string) || undefined,
        tipo_alergia: (h.tipo_alergia as string) || undefined,
        medicamento_enfermedad: (h.medicamento_enfermedad as string) || undefined,
        lesion_sismo_detalle: (h.lesion_sismo_detalle as string) || undefined,
        adulto_mayor_detalle: (h.adulto_mayor_detalle as string) || undefined,
        lactante_detalle: (h.lactante_detalle as string) || undefined,
        enfermedades_previas: (h.enfermedades_previas as string) || undefined,
        cirugias: (h.cirugias as string) || undefined,
        examen_subjetivo: (h.examen_subjetivo as string) || undefined,
        examen_objetivo: (h.examen_objetivo as string) || undefined,
        examen_diagnostico: (h.examen_diagnostico as string) || undefined,
        fecha_apertura: new Date(h.fecha_apertura as string),
        created_at: new Date(h.created_at as string),
        enf_cronica_1: (h.enf_cronica_1 as string) || undefined,
        tratamiento_1: (h.tratamiento_1 as string) || undefined,
        enf_cronica_2: (h.enf_cronica_2 as string) || undefined,
        tratamiento_2: (h.tratamiento_2 as string) || undefined,
        enf_cronica_3: (h.enf_cronica_3 as string) || undefined,
        tratamiento_3: (h.tratamiento_3 as string) || undefined,
        enf_cronica_4: (h.enf_cronica_4 as string) || undefined,
        tratamiento_4: (h.tratamiento_4 as string) || undefined,
        enf_cronica_5: (h.enf_cronica_5 as string) || undefined,
        tratamiento_5: (h.tratamiento_5 as string) || undefined,
        enf_cronica_6: (h.enf_cronica_6 as string) || undefined,
        tratamiento_6: (h.tratamiento_6 as string) || undefined,
        enf_cronica_7: (h.enf_cronica_7 as string) || undefined,
        tratamiento_7: (h.tratamiento_7 as string) || undefined,
        enf_cronica_8: (h.enf_cronica_8 as string) || undefined,
        tratamiento_8: (h.tratamiento_8 as string) || undefined,
        enf_cronica_9: (h.enf_cronica_9 as string) || undefined,
        tratamiento_9: (h.tratamiento_9 as string) || undefined,
        enf_cronica_10: (h.enf_cronica_10 as string) || undefined,
        tratamiento_10: (h.tratamiento_10 as string) || undefined,
      }));
      setHistoriasClinicas(hcMapped);

      const atMapped: AtencionMedica[] = atRows.map(a => ({
        id: a.id as string,
        historia_clinica_id: a.historia_clinica_id as string,
        fecha_atencion: new Date(a.fecha_atencion as string),
        presion_arterial: (a.presion_arterial as string) || undefined,
        temperatura: a.temperatura as number | undefined,
        frecuencia_cardiaca: a.frecuencia_cardiaca as number | undefined,
        peso: a.peso as number | undefined,
        talla: a.talla as number | undefined,
        saturacion_oxigeno: a.saturacion_oxigeno as number | undefined,
        observaciones: (a.observaciones as string) || undefined,
        created_at: new Date(a.created_at as string),
      }));
      setAtencionesMedicas(atMapped);

      const trMapped: Tratamiento[] = trRows.map(t => ({
        id: t.id as string,
        historia_clinica_id: t.historia_clinica_id as string,
        medicamento: t.medicamento as string,
        hora: t.hora as string,
        dosis: (t.dosis as string) || undefined,
        created_at: new Date(t.created_at as string),
      }));
      setTratamientos(trMapped);

      // Auto-seleccionar el primero si existe
      if (campamentosMapped.length > 0) {
        setCampamentoSeleccionado(campamentosMapped[0]);
      }

      setLoading(false);
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
      fecha_nacimiento: new Date(r.fecha_nacimiento),
      es_jefe_familia: r.es_jefe_familia,
      nro_cama: r.nro_cama || '',
      procedencia: r.procedencia || '',
      fecha_ingreso: r.fecha_ingreso ? new Date(r.fecha_ingreso) : undefined,
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
      parentesco: r.parentesco || undefined,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historias_clinicas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setHistoriasClinicas(prev => {
            if (prev.find(h => h.id === payload.new.id)) return prev;
            return [...prev, {
              id: payload.new.id,
              refugiado_id: payload.new.refugiado_id,
              tipo_discapacidad: payload.new.tipo_discapacidad || undefined,
              tipo_alergia: payload.new.tipo_alergia || undefined,
              medicamento_enfermedad: payload.new.medicamento_enfermedad || undefined,
              lesion_sismo_detalle: payload.new.lesion_sismo_detalle || undefined,
              adulto_mayor_detalle: payload.new.adulto_mayor_detalle || undefined,
              lactante_detalle: payload.new.lactante_detalle || undefined,
              enfermedades_previas: payload.new.enfermedades_previas || undefined,
              cirugias: payload.new.cirugias || undefined,
              examen_subjetivo: payload.new.examen_subjetivo || undefined,
              examen_objetivo: payload.new.examen_objetivo || undefined,
              examen_diagnostico: payload.new.examen_diagnostico || undefined,
              fecha_apertura: new Date(payload.new.fecha_apertura),
              created_at: new Date(payload.new.created_at),
              enf_cronica_1: payload.new.enf_cronica_1 || undefined,
              tratamiento_1: payload.new.tratamiento_1 || undefined,
              enf_cronica_2: payload.new.enf_cronica_2 || undefined,
              tratamiento_2: payload.new.tratamiento_2 || undefined,
              enf_cronica_3: payload.new.enf_cronica_3 || undefined,
              tratamiento_3: payload.new.tratamiento_3 || undefined,
              enf_cronica_4: payload.new.enf_cronica_4 || undefined,
              tratamiento_4: payload.new.tratamiento_4 || undefined,
              enf_cronica_5: payload.new.enf_cronica_5 || undefined,
              tratamiento_5: payload.new.tratamiento_5 || undefined,
              enf_cronica_6: payload.new.enf_cronica_6 || undefined,
              tratamiento_6: payload.new.tratamiento_6 || undefined,
              enf_cronica_7: payload.new.enf_cronica_7 || undefined,
              tratamiento_7: payload.new.tratamiento_7 || undefined,
              enf_cronica_8: payload.new.enf_cronica_8 || undefined,
              tratamiento_8: payload.new.tratamiento_8 || undefined,
              enf_cronica_9: payload.new.enf_cronica_9 || undefined,
              tratamiento_9: payload.new.tratamiento_9 || undefined,
              enf_cronica_10: payload.new.enf_cronica_10 || undefined,
              tratamiento_10: payload.new.tratamiento_10 || undefined,
            }];
          });
        } else if (payload.eventType === 'UPDATE') {
          setHistoriasClinicas(prev => prev.map(h => h.id === payload.new.id ? {
            id: payload.new.id,
            refugiado_id: payload.new.refugiado_id,
            tipo_discapacidad: payload.new.tipo_discapacidad || undefined,
            tipo_alergia: payload.new.tipo_alergia || undefined,
            medicamento_enfermedad: payload.new.medicamento_enfermedad || undefined,
            lesion_sismo_detalle: payload.new.lesion_sismo_detalle || undefined,
            adulto_mayor_detalle: payload.new.adulto_mayor_detalle || undefined,
            lactante_detalle: payload.new.lactante_detalle || undefined,
            enfermedades_previas: payload.new.enfermedades_previas || undefined,
            cirugias: payload.new.cirugias || undefined,
            examen_subjetivo: payload.new.examen_subjetivo || undefined,
            examen_objetivo: payload.new.examen_objetivo || undefined,
            examen_diagnostico: payload.new.examen_diagnostico || undefined,
            fecha_apertura: new Date(payload.new.fecha_apertura),
            created_at: new Date(payload.new.created_at),
            enf_cronica_1: payload.new.enf_cronica_1 || undefined,
            tratamiento_1: payload.new.tratamiento_1 || undefined,
            enf_cronica_2: payload.new.enf_cronica_2 || undefined,
            tratamiento_2: payload.new.tratamiento_2 || undefined,
            enf_cronica_3: payload.new.enf_cronica_3 || undefined,
            tratamiento_3: payload.new.tratamiento_3 || undefined,
            enf_cronica_4: payload.new.enf_cronica_4 || undefined,
            tratamiento_4: payload.new.tratamiento_4 || undefined,
            enf_cronica_5: payload.new.enf_cronica_5 || undefined,
            tratamiento_5: payload.new.tratamiento_5 || undefined,
            enf_cronica_6: payload.new.enf_cronica_6 || undefined,
            tratamiento_6: payload.new.tratamiento_6 || undefined,
            enf_cronica_7: payload.new.enf_cronica_7 || undefined,
            tratamiento_7: payload.new.tratamiento_7 || undefined,
            enf_cronica_8: payload.new.enf_cronica_8 || undefined,
            tratamiento_8: payload.new.tratamiento_8 || undefined,
            enf_cronica_9: payload.new.enf_cronica_9 || undefined,
            tratamiento_9: payload.new.tratamiento_9 || undefined,
            enf_cronica_10: payload.new.enf_cronica_10 || undefined,
            tratamiento_10: payload.new.tratamiento_10 || undefined,
          } : h));
        } else if (payload.eventType === 'DELETE') {
          setHistoriasClinicas(prev => prev.filter(h => h.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atenciones_medicas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAtencionesMedicas(prev => {
            if (prev.find(a => a.id === payload.new.id)) return prev;
            return [...prev, {
              id: payload.new.id,
              historia_clinica_id: payload.new.historia_clinica_id,
              fecha_atencion: new Date(payload.new.fecha_atencion),
              presion_arterial: payload.new.presion_arterial || undefined,
              temperatura: payload.new.temperatura || undefined,
              frecuencia_cardiaca: payload.new.frecuencia_cardiaca || undefined,
              peso: payload.new.peso || undefined,
              talla: payload.new.talla || undefined,
              saturacion_oxigeno: payload.new.saturacion_oxigeno || undefined,
              observaciones: payload.new.observaciones || undefined,
              created_at: new Date(payload.new.created_at),
            }];
          });
        } else if (payload.eventType === 'DELETE') {
          setAtencionesMedicas(prev => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tratamientos' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTratamientos(prev => {
            if (prev.find(t => t.id === payload.new.id)) return prev;
            return [...prev, {
              id: payload.new.id,
              historia_clinica_id: payload.new.historia_clinica_id,
              medicamento: payload.new.medicamento,
              hora: payload.new.hora,
              dosis: payload.new.dosis || undefined,
              created_at: new Date(payload.new.created_at),
            }];
          });
        } else if (payload.eventType === 'DELETE') {
          setTratamientos(prev => prev.filter(t => t.id !== payload.old.id));
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
        parentesco: nuevo.parentesco || null,
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
      codigo: data.codigo || '',
      nombres: data.nombres,
      apellidos: data.apellidos,
      cedula: data.cedula || undefined,
      genero: data.genero,
      fecha_nacimiento: new Date(data.fecha_nacimiento),
      es_jefe_familia: data.es_jefe_familia,
      nro_cama: data.nro_cama || '',
      procedencia: data.procedencia || '',
      fecha_ingreso: data.fecha_ingreso ? new Date(data.fecha_ingreso) : undefined,
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
      parentesco: data.parentesco || undefined,
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
        parentesco: actualizado.parentesco || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar refugiado:', error);
      return;
    }

    setRefugiados(prev => prev.map(r => r.id === id ? { ...actualizado, id } : r));
  };

  // ── Agregar Historia Clínica ────────────────────────────────────────────────
  const agregarHistoriaClinica = async (nueva: HistoriaClinica) => {
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

    if (error || !data) {
      console.error('Error al crear historia clínica:', error);
      throw new Error(error?.message || 'Error al crear historia clínica');
    }

    const hcCreada: HistoriaClinica = {
      id: data.id,
      refugiado_id: data.refugiado_id,
      tipo_discapacidad: data.tipo_discapacidad || undefined,
      tipo_alergia: data.tipo_alergia || undefined,
      medicamento_enfermedad: data.medicamento_enfermedad || undefined,
      lesion_sismo_detalle: data.lesion_sismo_detalle || undefined,
      adulto_mayor_detalle: data.adulto_mayor_detalle || undefined,
      lactante_detalle: data.lactante_detalle || undefined,
      enfermedades_previas: data.enfermedades_previas || undefined,
      cirugias: data.cirugias || undefined,
      examen_subjetivo: data.examen_subjetivo || undefined,
      examen_objetivo: data.examen_objetivo || undefined,
      examen_diagnostico: data.examen_diagnostico || undefined,
      fecha_apertura: new Date(data.fecha_apertura),
      created_at: new Date(data.created_at),
      enf_cronica_1: data.enf_cronica_1 || undefined,
      tratamiento_1: data.tratamiento_1 || undefined,
      enf_cronica_2: data.enf_cronica_2 || undefined,
      tratamiento_2: data.tratamiento_2 || undefined,
      enf_cronica_3: data.enf_cronica_3 || undefined,
      tratamiento_3: data.tratamiento_3 || undefined,
      enf_cronica_4: data.enf_cronica_4 || undefined,
      tratamiento_4: data.tratamiento_4 || undefined,
      enf_cronica_5: data.enf_cronica_5 || undefined,
      tratamiento_5: data.tratamiento_5 || undefined,
      enf_cronica_6: data.enf_cronica_6 || undefined,
      tratamiento_6: data.tratamiento_6 || undefined,
      enf_cronica_7: data.enf_cronica_7 || undefined,
      tratamiento_7: data.tratamiento_7 || undefined,
      enf_cronica_8: data.enf_cronica_8 || undefined,
      tratamiento_8: data.tratamiento_8 || undefined,
      enf_cronica_9: data.enf_cronica_9 || undefined,
      tratamiento_9: data.tratamiento_9 || undefined,
      enf_cronica_10: data.enf_cronica_10 || undefined,
      tratamiento_10: data.tratamiento_10 || undefined,
    };
    setHistoriasClinicas(prev => [...prev, hcCreada]);
  };

  // ── Actualizar Historia Clínica ────────────────────────────────────────────
  const actualizarHistoriaClinica = async (id: string, actualizada: HistoriaClinica) => {
    const { error } = await supabase
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
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar historia clínica:', error);
      throw new Error(error.message || 'Error al actualizar historia clínica');
    }

    setHistoriasClinicas(prev => prev.map(h => h.id === id ? { ...actualizada, id } : h));
  };

  // ── Agregar Atención Médica ─────────────────────────────────────────────
  const agregarAtencionMedica = async (nueva: AtencionMedica) => {
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

    if (error || !data) {
      console.error('Error al registrar atención médica:', error);
      throw new Error(error?.message || 'Error al registrar atención médica');
    }

    const atCreada: AtencionMedica = {
      id: data.id,
      historia_clinica_id: data.historia_clinica_id,
      fecha_atencion: new Date(data.fecha_atencion),
      presion_arterial: data.presion_arterial || undefined,
      temperatura: data.temperatura || undefined,
      frecuencia_cardiaca: data.frecuencia_cardiaca || undefined,
      peso: data.peso || undefined,
      talla: data.talla || undefined,
      saturacion_oxigeno: data.saturacion_oxigeno || undefined,
      observaciones: data.observaciones || undefined,
      created_at: new Date(data.created_at),
    };
    setAtencionesMedicas(prev => [...prev, atCreada]);
  };

  // ── Agregar Tratamiento ────────────────────────────────────────────────────
  const agregarTratamiento = async (nuevo: Tratamiento) => {
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

    if (error || !data) {
      console.error('Error al agregar tratamiento:', error);
      throw new Error(error?.message || 'Error al agregar tratamiento');
    }

    const trCreado: Tratamiento = {
      id: data.id,
      historia_clinica_id: data.historia_clinica_id,
      medicamento: data.medicamento,
      hora: data.hora,
      dosis: data.dosis || undefined,
      created_at: new Date(data.created_at),
    };
    setTratamientos(prev => [...prev, trCreado]);
  };

  // ── Eliminar Tratamiento ─────────────────────────────────────────────────
  const eliminarTratamiento = async (id: string) => {
    const { error } = await supabase.from('tratamientos').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar tratamiento:', error);
      return;
    }
    setTratamientos(prev => prev.filter(t => t.id !== id));
  };

  return (
    <CampamentoContext.Provider value={{
      campamentos, familias, refugiados,
      historiasClinicas, atencionesMedicas, tratamientos,
      campamentoSeleccionado, loading, errorCarga, seleccionarCampamento,
      agregarCampamento, actualizarCampamento, eliminarCampamento,
      agregarFamilia, eliminarFamilia, agregarRefugiado, eliminarRefugiado, actualizarRefugiado,
      agregarHistoriaClinica, actualizarHistoriaClinica,
      agregarAtencionMedica, agregarTratamiento, eliminarTratamiento,
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
