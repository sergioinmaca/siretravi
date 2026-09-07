import * as XLSX from 'xlsx';
import { formatAgeParts } from './formatAge';
import { formatCedula } from './formatCedula';
import type { Refugiado, Familia } from '../types';

const siNo = (v: boolean | undefined | null): string => (v ? 'Sí' : 'No');

const formatoFecha = (d?: Date): string => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export function exportarTablaIntegrantesXLSX(
  refugiados: Refugiado[],
  familias: Familia[],
  nombreCamp: string
): void {
  const now = new Date();
  const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

  const data = [...refugiados]
    .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true }))
    .map(r => {
      let jerarquiaStr = 'Jefe de Familia';
      let familiaNombre = '';
      if (!r.es_jefe_familia && r.familia_id) {
        const familia = familias.find(f => f.id === r.familia_id);
        familiaNombre = familia?.nombre || '';
        jerarquiaStr = `Miembro (${familia?.nombre || 'Desconocida'})`;
      } else if (r.es_jefe_familia && r.familia_id) {
        const familia = familias.find(f => f.id === r.familia_id);
        familiaNombre = familia?.nombre || '';
      }
      const ageParts = formatAgeParts(r.fecha_nacimiento);
      const mascotaSexo = r.mascota_sexo === undefined || r.mascota_sexo === null ? '' : r.mascota_sexo ? 'M' : 'H';
      return {
        'Código': r.codigo || '-',
        'Cédula': formatCedula(r.cedula, r.nacionalidad) ?? 'S/N',
        'Nacionalidad': r.nacionalidad || '',
        'Apellidos': r.apellidos,
        'Nombres': r.nombres,
        'Género': r.genero ? 'M' : 'F',
        'Fecha de Nacimiento': formatoFecha(r.fecha_nacimiento),
        'Edad (Valor)': ageParts?.valor ?? '',
        'Edad (Unidad)': ageParts?.unidad ?? '',
        'Jerarquía': jerarquiaStr,
        'Familia': familiaNombre,
        'Cama': r.nro_cama || '-',
        'Estatus': r.hogar_solidario || 'PRESENTE',
        'Estado': r.estado || '',
        'Municipio': r.municipio || '',
        'Parroquia': r.parroquia || '',
        'Fecha de Ingreso': formatoFecha(r.fecha_ingreso),
        'Dirección Exacta': r.direccion_exacta || '',
        'Teléfono': r.telefono || '',
        'Profesión': r.profesion || '',
        'Parentesco': r.parentesco || '',
        'Discapacidad': siNo(r.discapacidad),
        'Embarazo': siNo(r.embarazo),
        'Tiempo de Embarazo (sem.)': r.tiempo_embarazo ?? '',
        'Mascotas': siNo(r.mascotas),
        'Tipo de Mascota': r.tipo_mascota || '',
        'Sexo de Mascota': mascotaSexo,
        'Raza de Mascota': r.mascota_raza || '',
        'Nombre de Mascota': r.mascota_nombre || '',
        'Edad de Mascota': r.mascota_edad ?? '',
        'Talla Camisa': r.talla_camisa || '',
        'Talla Pantalón': r.talla_pantalon || '',
        'Talla Zapatos': r.talla_zapatos || '',
        'Alergias': siNo(r.alergias),
        'Enfermedad Crónica': siNo(r.enfermedad_cronica),
        'Lesión por Sismo': siNo(r.lesion_sismo),
        'Adulto Mayor (dependencia)': siNo(r.adulto_mayor_dependencia),
        'Lactante': siNo(r.lactante),
        'Nivel Educativo': r.nivel_educativo || '',
        'Condición de Vivienda': r.condicion_vivienda || '',
        'Tenencia de Vivienda': r.tenencia_vivienda || '',
        'Ingreso Familiar': r.ingreso_familiar || '',
        'Registro Captahuella': siNo(r.registro_captahuella),
        'Registro Único de Vivienda': siNo(r.registro_unico_vivienda),
        'Observaciones': r.observaciones || '',
        'Observaciones Generales': r.observaciones_generales || '',
      };
    });

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = [
    { wch: 10 },  // Código
    { wch: 14 },  // Cédula
    { wch: 12 },  // Nacionalidad
    { wch: 22 },  // Apellidos
    { wch: 22 },  // Nombres
    { wch: 8 },   // Género
    { wch: 16 },  // Fecha de Nacimiento
    { wch: 12 },  // Edad (Valor)
    { wch: 14 },  // Edad (Unidad)
    { wch: 30 },  // Jerarquía
    { wch: 24 },  // Familia
    { wch: 8 },   // Cama
    { wch: 16 },  // Estatus
    { wch: 16 },  // Estado
    { wch: 18 },  // Municipio
    { wch: 18 },  // Parroquia
    { wch: 16 },  // Fecha de Ingreso
    { wch: 32 },  // Dirección Exacta
    { wch: 16 },  // Teléfono
    { wch: 18 },  // Profesión
    { wch: 16 },  // Parentesco
    { wch: 12 },  // Discapacidad
    { wch: 10 },  // Embarazo
    { wch: 20 },  // Tiempo de Embarazo
    { wch: 10 },  // Mascotas
    { wch: 16 },  // Tipo de Mascota
    { wch: 14 },  // Sexo de Mascota
    { wch: 16 },  // Raza de Mascota
    { wch: 18 },  // Nombre de Mascota
    { wch: 14 },  // Edad de Mascota
    { wch: 14 },  // Talla Camisa
    { wch: 14 },  // Talla Pantalón
    { wch: 14 },  // Talla Zapatos
    { wch: 10 },  // Alergias
    { wch: 16 },  // Enfermedad Crónica
    { wch: 14 },  // Lesión por Sismo
    { wch: 22 },  // Adulto Mayor
    { wch: 10 },  // Lactante
    { wch: 16 },  // Nivel Educativo
    { wch: 20 },  // Condición de Vivienda
    { wch: 20 },  // Tenencia de Vivienda
    { wch: 18 },  // Ingreso Familiar
    { wch: 18 },  // Registro Captahuella
    { wch: 22 },  // Registro Único de Vivienda
    { wch: 32 },  // Observaciones
    { wch: 32 },  // Observaciones Generales
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tabla Integrantes');
  XLSX.writeFile(wb, `tabla-integrantes-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`);
}
