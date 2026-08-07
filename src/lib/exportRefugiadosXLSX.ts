import * as XLSX from 'xlsx';
import { formatAgeParts } from './formatAge';
import { formatCedula } from './formatCedula';
import { obtenerHistoriasClinicas } from './salud';
import type { Refugiado, Familia } from '../types';

export async function exportarRefugiadosXLSX(
  refugiados: Refugiado[],
  familias: Familia[],
  campamentoId: string,
  nombreCamp: string,
  prefijo: 'integrantes' | 'retirados'
): Promise<void> {
  const now = new Date();
  const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

  const historias = await obtenerHistoriasClinicas(campamentoId);
  const historiasMap: Record<string, string> = {};
  historias.forEach(h => {
    const parts: string[] = [];
    if (h.tipo_discapacidad) parts.push(`Discapacidad: ${h.tipo_discapacidad}`);
    for (let i = 1; i <= 10; i++) {
      const val = (h as unknown as Record<string, unknown>)[`enf_cronica_${i}`] as string | undefined;
      if (val) parts.push(`Enf. Crónica ${i}: ${val}`);
    }
    if (parts.length > 0) historiasMap[h.refugiado_id] = parts.join(', ');
  });

  const sheetName = prefijo === 'retirados' ? 'Retirados' : 'Integrantes';

  const data = [...refugiados]
    .sort((a, b) => {
      if (a.familia_id && b.familia_id) {
        if (a.familia_id === b.familia_id) {
          return a.es_jefe_familia ? -1 : b.es_jefe_familia ? 1 : 0;
        }
        const famA = familias.find(f => f.id === a.familia_id)?.nombre || '';
        const famB = familias.find(f => f.id === b.familia_id)?.nombre || '';
        return famA.localeCompare(famB);
      }
      if (a.familia_id) return -1;
      if (b.familia_id) return 1;
      return (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true });
    })
    .map(r => {
      let jerarquiaStr = 'Jefe de Familia';
      if (!r.es_jefe_familia && r.familia_id) {
        const familia = familias.find(f => f.id === r.familia_id);
        jerarquiaStr = `Miembro (${familia?.nombre || 'Desconocida'})`;
      }
      const ageParts = formatAgeParts(r.fecha_nacimiento);
      return {
        'Código': r.codigo || '-',
        'Cédula': formatCedula(r.cedula) ?? 'S/N',
        'Género': r.genero ? 'M' : 'F',
        'Apellidos': r.apellidos,
        'Nombres': r.nombres,
        'Fecha de Nacimiento': r.fecha_nacimiento
          ? `${String(r.fecha_nacimiento.getDate()).padStart(2, '0')}/${String(r.fecha_nacimiento.getMonth() + 1).padStart(2, '0')}/${r.fecha_nacimiento.getFullYear()}`
          : '',
        'Edad (Valor)': ageParts?.valor ?? '',
        'Edad (Unidad)': ageParts?.unidad ?? '',
        'Jerarquía': jerarquiaStr,
        'Cama': r.nro_cama || '-',
        'Estatus': r.hogar_solidario || 'PRESENTE',
        'Teléfono': r.telefono || '—',
        'Parentesco': r.parentesco || '—',
        'Observaciones': historiasMap[r.id] || '',
      };
    });

  const ws = XLSX.utils.json_to_sheet(data);
  const colWidths = [
    { wch: 10 },
    { wch: 12 },
    { wch: 8 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 30 },
    { wch: 8 },
    { wch: 16 },
    { wch: 20 },
    { wch: 55 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${prefijo}-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`);
}
