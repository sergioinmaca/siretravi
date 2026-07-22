export interface Modulo {
  id: string;
  nombre: string;
  literas: number;
  camas_individuales: number;
  camas_duplex: number;
  croquis_data?: string; // JSON serializado del canvas
}

export interface Campamento {
  id: string;
  nombre: string;
  ubicacion: string;
  capacidad_maxima: number;
  estado: 'activo' | 'inactivo';
  tipo_contabilizacion: 'cama' | 'elemento';
  croquis_general?: string | null;
  modulos: Modulo[];
}

export interface Familia {
  id: string;
  campamento_id: string;
  nombre: string;
}

export interface Usuario {
  id: string;
  nickname: string;
  nombres: string;
  apellidos: string;
  clave: string;
  es_master: boolean;
  activo: boolean;
}

export interface ModuloSistema {
  id: string;
  nombre: string;
}

export interface Accion {
  id: string;
  modulo_id: string;
  nombre: string;
}

export interface Permiso {
  id: string;
  usuario_id: string;
  modulo_id: string;
  acciones: string[];
  campamentos: string[] | null;
}

export interface Evento {
  id: string;
  id_campamento: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  hora_inicio: string;
  hora_fin?: string;
  tipo: 'permanente' | 'unico';
  categoria_id?: string;
  created_at?: string;
}

export interface EventoOcurrencia extends Evento {
  fecha_ocurrencia: string;
}

export interface CategoriaEvento {
  id: string;
  nombre: string;
  color: string;
  created_at?: string;
}

export interface Refugiado {
  id: string;
  campamento_id: string;
  familia_id?: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  cedula?: number;
  genero: boolean;
  fecha_nacimiento: Date;
  es_jefe_familia: boolean;
  nro_cama?: string;
  procedencia: string;
  fecha_ingreso?: Date;
  direccion_exacta?: string;
  discapacidad: boolean;
  embarazo: boolean;
  tiempo_embarazo?: number;
  mascotas: boolean;
  tipo_mascota?: string;
  mascota_sexo?: boolean;
  mascota_raza?: string;
  mascota_nombre?: string;
  mascota_edad?: number;
  mascota_foto_url?: string;
  telefono?: number;
  profesion?: string;
  talla_camisa?: string;
  talla_pantalon?: string;
  talla_zapatos?: string;
  alergias: boolean;
  enfermedad_cronica: boolean;
  lesion_sismo: boolean;
  adulto_mayor_dependencia: boolean;
  lactante?: boolean;
  nivel_educativo?: string;
  condicion_vivienda?: string;
  tenencia_vivienda?: string;
  ingreso_familiar?: string;
  observaciones?: string;
  observaciones_generales?: string;
  parentesco?: string;
  foto_url?: string;
}

export interface HistoriaClinica {
  id: string;
  refugiado_id: string;
  tipo_discapacidad?: string;
  tipo_alergia?: string;
  medicamento_enfermedad?: string;
  lesion_sismo_detalle?: string;
  adulto_mayor_detalle?: string;
  lactante_detalle?: string;
  enfermedades_previas?: string;
  cirugias?: string;
  examen_subjetivo?: string;
  examen_objetivo?: string;
  examen_diagnostico?: string;
  fecha_apertura: Date;
  created_at: Date;
  enf_cronica_1?: string;
  tratamiento_1?: string;
  enf_cronica_2?: string;
  tratamiento_2?: string;
  enf_cronica_3?: string;
  tratamiento_3?: string;
  enf_cronica_4?: string;
  tratamiento_4?: string;
  enf_cronica_5?: string;
  tratamiento_5?: string;
  enf_cronica_6?: string;
  tratamiento_6?: string;
  enf_cronica_7?: string;
  tratamiento_7?: string;
  enf_cronica_8?: string;
  tratamiento_8?: string;
  enf_cronica_9?: string;
  tratamiento_9?: string;
  enf_cronica_10?: string;
  tratamiento_10?: string;
}

export interface AtencionMedica {
  id: string;
  historia_clinica_id: string;
  tipo: 'medica' | 'beneficio' | 'donacion';
  fecha_atencion: Date;
  presion_arterial?: string;
  temperatura?: number;
  frecuencia_cardiaca?: number;
  peso?: number;
  talla?: number;
  saturacion_oxigeno?: number;
  observaciones?: string;
  created_at: Date;
  // tipo = 'medica' — especialidades
  especialidad_1?: string; diagnostico_1?: string; tratamiento_1?: string; responsable_1?: string;
  especialidad_2?: string; diagnostico_2?: string; tratamiento_2?: string; responsable_2?: string;
  especialidad_3?: string; diagnostico_3?: string; tratamiento_3?: string; responsable_3?: string;
  especialidad_4?: string; diagnostico_4?: string; tratamiento_4?: string; responsable_4?: string;
  especialidad_5?: string; diagnostico_5?: string; tratamiento_5?: string; responsable_5?: string;
  especialidad_6?: string; diagnostico_6?: string; tratamiento_6?: string; responsable_6?: string;
  especialidad_7?: string; diagnostico_7?: string; tratamiento_7?: string; responsable_7?: string;
  especialidad_8?: string; diagnostico_8?: string; tratamiento_8?: string; responsable_8?: string;
  especialidad_9?: string; diagnostico_9?: string; tratamiento_9?: string; responsable_9?: string;
  especialidad_10?: string; diagnostico_10?: string; tratamiento_10?: string; responsable_10?: string;
  // tipo = 'beneficio'
  beneficio_tipo_1?: string; beneficio_descripcion_1?: string; beneficio_entregado_por_1?: string; beneficio_fecha_1?: Date;
  beneficio_tipo_2?: string; beneficio_descripcion_2?: string; beneficio_entregado_por_2?: string; beneficio_fecha_2?: Date;
  beneficio_tipo_3?: string; beneficio_descripcion_3?: string; beneficio_entregado_por_3?: string; beneficio_fecha_3?: Date;
  beneficio_tipo_4?: string; beneficio_descripcion_4?: string; beneficio_entregado_por_4?: string; beneficio_fecha_4?: Date;
  beneficio_tipo_5?: string; beneficio_descripcion_5?: string; beneficio_entregado_por_5?: string; beneficio_fecha_5?: Date;
  beneficio_tipo_6?: string; beneficio_descripcion_6?: string; beneficio_entregado_por_6?: string; beneficio_fecha_6?: Date;
  beneficio_tipo_7?: string; beneficio_descripcion_7?: string; beneficio_entregado_por_7?: string; beneficio_fecha_7?: Date;
  beneficio_tipo_8?: string; beneficio_descripcion_8?: string; beneficio_entregado_por_8?: string; beneficio_fecha_8?: Date;
  beneficio_tipo_9?: string; beneficio_descripcion_9?: string; beneficio_entregado_por_9?: string; beneficio_fecha_9?: Date;
  beneficio_tipo_10?: string; beneficio_descripcion_10?: string; beneficio_entregado_por_10?: string; beneficio_fecha_10?: Date;
  // tipo = 'donacion'
  donacion_tipo_1?: string; donacion_descripcion_1?: string; donacion_entregado_por_1?: string; donacion_fecha_1?: Date;
  donacion_tipo_2?: string; donacion_descripcion_2?: string; donacion_entregado_por_2?: string; donacion_fecha_2?: Date;
  donacion_tipo_3?: string; donacion_descripcion_3?: string; donacion_entregado_por_3?: string; donacion_fecha_3?: Date;
  donacion_tipo_4?: string; donacion_descripcion_4?: string; donacion_entregado_por_4?: string; donacion_fecha_4?: Date;
  donacion_tipo_5?: string; donacion_descripcion_5?: string; donacion_entregado_por_5?: string; donacion_fecha_5?: Date;
  donacion_tipo_6?: string; donacion_descripcion_6?: string; donacion_entregado_por_6?: string; donacion_fecha_6?: Date;
  donacion_tipo_7?: string; donacion_descripcion_7?: string; donacion_entregado_por_7?: string; donacion_fecha_7?: Date;
  donacion_tipo_8?: string; donacion_descripcion_8?: string; donacion_entregado_por_8?: string; donacion_fecha_8?: Date;
  donacion_tipo_9?: string; donacion_descripcion_9?: string; donacion_entregado_por_9?: string; donacion_fecha_9?: Date;
  donacion_tipo_10?: string; donacion_descripcion_10?: string; donacion_entregado_por_10?: string; donacion_fecha_10?: Date;
}

export interface Tratamiento {
  id: string;
  historia_clinica_id: string;
  medicamento: string;
  hora: string;
  dosis?: string;
  created_at: Date;
}

export interface TipoActaCampo {
  clave: string;
  etiqueta: string;
  tipo: 'text' | 'textarea' | 'select' | 'date';
  requerido: boolean;
  placeholder?: string;
  opciones?: string[];
}

export interface TipoActaPlantilla {
  nombre_documento: string;
  campos: TipoActaCampo[];
  contenido: string;
}

export interface TipoActa {
  id: string;
  nombre: string;
  descripcion?: string;
  plantilla: TipoActaPlantilla;
  activo: boolean;
  created_at?: string;
}

export interface TipoActaResumen {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
}

export interface Acta {
  id: string;
  codigo: string;
  tipo_acta_id: string;
  refugiado_id: string;
  campamento_id: string;
  fecha: string;
  contenido: Record<string, string>;
  created_by?: string;
  created_at?: string;
}
