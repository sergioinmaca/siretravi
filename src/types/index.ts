export interface Carpa {
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
  carpas: Carpa[];
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

export interface Modulo {
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

export interface Refugiado {
  id: string;
  campamento_id: string;
  familia_id?: string;
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
}

export interface AtencionMedica {
  id: string;
  historia_clinica_id: string;
  fecha_atencion: Date;
  presion_arterial?: string;
  temperatura?: number;
  frecuencia_cardiaca?: number;
  peso?: number;
  talla?: number;
  saturacion_oxigeno?: number;
  observaciones?: string;
  created_at: Date;
}

export interface Tratamiento {
  id: string;
  historia_clinica_id: string;
  medicamento: string;
  hora: string;
  dosis?: string;
  created_at: Date;
}
