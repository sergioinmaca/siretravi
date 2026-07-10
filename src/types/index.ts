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
  tipo_discapacidad?: string;
  embarazo: boolean;
  tiempo_embarazo?: number;
  mascotas: boolean;
  tipo_mascota?: string;
  mascota_sexo?: boolean;
  mascota_raza?: string;
  mascota_nombre?: string;
  mascota_edad?: number;
}
