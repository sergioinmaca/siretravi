import { useState } from 'react';
import { X, Users, BedDouble, Calendar, MapPin, Home, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { useCampamento } from '../../context/CampamentoContext';
import { toDisplayDate } from '../../lib/formatDate';
import type { Familia } from '../../types';

interface DetalleFamiliaModalProps {
  isOpen: boolean;
  onClose: () => void;
  familia: Familia | null;
}

const loadImageAsDataUrl = (src: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export default function DetalleFamiliaModal({ isOpen, onClose, familia }: DetalleFamiliaModalProps) {
  const { refugiados = [] } = useCampamento();
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !familia) return null;

  const integrantes = refugiados.filter(r => r.familia_id === familia.id);
  const jefe = integrantes.find(r => r.es_jefe_familia);

  const sortedIntegrantes = [...integrantes].sort((a, b) =>
    a.es_jefe_familia ? -1 : b.es_jefe_familia ? 1 : 0
  );

  const calcularEdad = (fechaNacimiento: Date | string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const logoDataUrl = await loadImageAsDataUrl('/logorepublica.png');
      const mascotaPhotoDataUrl = jefe?.mascota_foto_url ? await loadImageAsDataUrl(jefe.mascota_foto_url) : null;

      const newPage = () => {
        pdf.addPage();
        y = margin;
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) newPage();
      };

      const truncate = (text: string, maxW: number, size = 9) => {
        pdf.setFontSize(size);
        let t = text;
        while (t.length > 1 && pdf.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
        return t.length < text.length ? t + '…' : text;
      };

      const drawSectionHeader = (num: string, title: string) => {
        ensureSpace(8);
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, y, contentW, 6, 'F');
        pdf.setDrawColor(220, 38, 38);
        pdf.setLineWidth(1);
        pdf.line(margin, y, margin, y + 6);
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${num}. ${title}`, margin + 3, y + 4.2);
        y += 8;
      };

      const drawFieldFull = (label: string, value: string) => {
        ensureSpace(6);
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(label, margin, y + 4);
        const labelW = pdf.getTextWidth(label);
        pdf.setFont('Helvetica', 'normal');
        const val = truncate(value || '—', contentW - labelW - 1);
        pdf.text(val, margin + labelW + 1, y + 4);
        y += 6;
      };

      const drawFieldRowLR = (lblL: string, valL: string, lblR: string, valR: string) => {
        ensureSpace(6);
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(lblL, margin, y + 4);
        const lwL = pdf.getTextWidth(lblL);
        pdf.setFont('Helvetica', 'normal');
        const halfW = contentW / 2 - 2;
        pdf.text(truncate(valL || '—', halfW - lwL - 1), margin + lwL + 1, y + 4);

        const rx = margin + contentW / 2 + 2;
        pdf.setFont('Helvetica', 'bold');
        pdf.text(lblR, rx, y + 4);
        const lwR = pdf.getTextWidth(lblR);
        pdf.setFont('Helvetica', 'normal');
        pdf.text(truncate(valR || '—', halfW - lwR - 1), rx + lwR + 1, y + 4);
        y += 6;
      };

      const drawFieldRowCols = (cols: [string, string][]) => {
        ensureSpace(6);
        const colW = contentW / cols.length;
        cols.forEach(([lbl, val], i) => {
          const cx = margin + i * (colW + 1);
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text(lbl, cx, y + 4);
          const lw = pdf.getTextWidth(lbl);
          pdf.setFont('Helvetica', 'normal');
          pdf.text(truncate(val || '—', colW - lw - 2), cx + lw + 1, y + 4);
        });
        y += 6;
      };

      const drawCheckbox = (checked: boolean, label: string, x: number) => {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y + 1, 3, 3, 'S');
        if (checked) {
          pdf.setLineWidth(0.4);
          pdf.line(x, y + 1, x + 3, y + 4);
          pdf.line(x + 3, y + 1, x, y + 4);
        }
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(label, x + 4, y + 4);
      };

      const drawCheckboxRow = (items: [boolean, string][]) => {
        ensureSpace(6);
        const gap = 8;
        let cx = margin;
        items.forEach(([chk, lbl]) => {
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9);
          const tw = pdf.getTextWidth(lbl) + 7;
          drawCheckbox(chk, lbl, cx);
          cx += tw + gap;
        });
        y += 6;
      };

      const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
        const rowH = 6;
        const headerH = 7;

        const totalW = colWidths.reduce((a, b) => a + b, 0);
        const scaleFactor = totalW > contentW ? contentW / totalW : 1;
        const scaledWidths = colWidths.map(w => w * scaleFactor);

        ensureSpace(headerH + 2);
        pdf.setFillColor(229, 231, 235);
        pdf.rect(margin, y, contentW, headerH, 'F');

        let cx = margin;
        scaledWidths.forEach((w, i) => {
          if (i < scaledWidths.length - 1) {
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.2);
            pdf.line(cx + w, y, cx + w, y + headerH);
          }
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(0, 0, 0);
          pdf.text(headers[i], cx + 1, y + 5);
          cx += w;
        });
        y += headerH;

        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);

        rows.forEach((row) => {
          ensureSpace(rowH + 2);
          cx = margin;
          row.forEach((cell, i) => {
            pdf.setFont('Helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(0, 0, 0);
            pdf.text(truncate(cell, scaledWidths[i] - 2, 7), cx + 1, y + 4.5);
            cx += scaledWidths[i];
          });
          y += rowH;
        });

        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, y - rows.length * rowH - headerH, contentW, headerH + rows.length * rowH, 'S');
        y += 4;
      };

      // ── CABECERA ──

      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', margin, y, 20, 20);
      }

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('FICHA FAMILIAR', pageW / 2, y + 4, { align: 'center' });

      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`${familia.nombre} — ${integrantes.length} integrante${integrantes.length !== 1 ? 's' : ''}`, pageW / 2, y + 11, { align: 'center' });

      y += 22;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;

      // ── 1. DATOS DEL JEFE DE FAMILIA ──

      if (jefe) {
        drawSectionHeader('1', 'Datos del Jefe de Familia');

        drawFieldFull('Nombres y Apellidos:', `${jefe.nombres} ${jefe.apellidos}`);

        drawFieldRowLR(
          'C\u00e9dula de Identidad:', jefe.cedula?.toString() || 'S/N',
          'Fecha de Nacimiento:', toDisplayDate(jefe.fecha_nacimiento),
        );

        ensureSpace(6);
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('Edad:', margin, y + 4);
        pdf.setFont('Helvetica', 'normal');
        pdf.text(`${calcularEdad(jefe.fecha_nacimiento)} a\u00f1os`, margin + pdf.getTextWidth('Edad:') + 1, y + 4);

        const gX = margin + contentW / 3 + 4;
        pdf.setFont('Helvetica', 'bold');
        pdf.text('G\u00e9nero:', gX, y + 4);
        drawCheckbox(jefe.genero, 'Masculino (M)', gX + pdf.getTextWidth('G\u00e9nero:') + 2);
        drawCheckbox(!jefe.genero, 'Femenino (F)', gX + pdf.getTextWidth('G\u00e9nero:') + 2 + 35);
        y += 6;

        drawFieldRowLR(
          'Nro de Cama:', jefe.nro_cama || '—',
          'Fecha de Ingreso:', jefe.fecha_ingreso ? toDisplayDate(jefe.fecha_ingreso) : '—',
        );

        drawFieldFull('Procedencia:', jefe.procedencia || '—');
        drawFieldFull('Direcci\u00f3n Exacta:', jefe.direccion_exacta || '—');
      }

      // ── 2. INTEGRANTES DE LA FAMILIA ──

      drawSectionHeader('2', 'Integrantes de la Familia');

      if (integrantes.length > 0) {
        const tableHeaders = ['C\u00f3digo', 'C\u00e9dula', 'Apellidos y Nombres', 'Edad', 'G\u00e9n', 'Cama', 'Parentesco'];
        const tableColWidths = [22, 22, 50, 12, 10, 14, 28];

        const tableRows = sortedIntegrantes.map(p => [
          p.codigo || '—',
          p.cedula?.toString() || 'S/N',
          `${p.apellidos}, ${p.nombres}`,
          `${calcularEdad(p.fecha_nacimiento)}`,
          p.genero ? 'M' : 'F',
          p.nro_cama || '—',
          p.es_jefe_familia ? 'Jefe' : (p.parentesco || '—'),
        ]);

        drawTable(tableHeaders, tableRows, tableColWidths);
      } else {
        ensureSpace(6);
        pdf.setFont('Helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Sin integrantes registrados', margin, y + 4);
        y += 6;
      }

      // ── 3. SITUACIÓN SOCIOECONÓMICA ──

      if (jefe) {
        drawSectionHeader('3', 'Situaci\u00f3n Socioecon\u00f3mica de la Vivienda de Origen');

        drawFieldFull('Condici\u00f3n de la vivienda tras el sismo:', jefe.condicion_vivienda || '—');
        drawFieldFull('Tenencia de la Vivienda:', jefe.tenencia_vivienda || '—');
        drawFieldFull('Ingreso Familiar Principal antes de la Emergencia:', jefe.ingreso_familiar || '—');
        drawFieldFull('Observaciones:', jefe.observaciones || '—');
      }

      // ── 4. MASCOTA DE LA FAMILIA ──

      if (jefe) {
        drawSectionHeader('4', 'Mascota de la Familia');

        drawCheckboxRow([
          [jefe.mascotas, '\u00bfTiene mascotas a cargo?: S\u00ed'],
          [!jefe.mascotas, 'No'],
        ]);

        if (jefe.mascotas) {
          if (mascotaPhotoDataUrl) {
            const mpX = pageW - margin - 25;
            const mpY = y;
            pdf.addImage(mascotaPhotoDataUrl, 'PNG', mpX, mpY, 20, 20);
            const photoBottom = mpY + 20;

            drawFieldRowCols([
              ['Tipo:', jefe.tipo_mascota || '—'],
              ['Nombre:', jefe.mascota_nombre || '—'],
              ['Sexo:', jefe.mascota_sexo === true ? 'Macho' : jefe.mascota_sexo === false ? 'Hembra' : '—'],
            ]);
            drawFieldRowLR(
              'Raza:', jefe.mascota_raza || '—',
              'Edad (a\u00f1os):', jefe.mascota_edad?.toString() || '—',
            );
            if (y < photoBottom) y = photoBottom + 2;
          } else {
            drawFieldRowCols([
              ['Tipo:', jefe.tipo_mascota || '—'],
              ['Nombre:', jefe.mascota_nombre || '—'],
              ['Sexo:', jefe.mascota_sexo === true ? 'Macho' : jefe.mascota_sexo === false ? 'Hembra' : '—'],
            ]);
            drawFieldRowLR(
              'Raza:', jefe.mascota_raza || '—',
              'Edad (a\u00f1os):', jefe.mascota_edad?.toString() || '—',
            );
          }
        }
      }

      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(6);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`P\u00e1gina ${p} de ${totalPages}`, pageW - margin, pageH - margin, { align: 'right' });
      }

      pdf.save(`Ficha_Familiar_${familia.nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Ocurri\u00f3 un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Ficha Familiar</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {familia.nombre} — {integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* Ficha del Jefe de Familia */}
          {jefe && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fecha de Registro</h4>
                  <div className="flex items-center gap-2 text-gray-800">
                    <Calendar size={16} className="text-caracas-blue shrink-0" />
                    <span className="font-medium">{jefe.fecha_ingreso ? toDisplayDate(jefe.fecha_ingreso) : '—'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Procedencia</h4>
                  <div className="flex items-center gap-2 text-gray-800 justify-end">
                    <MapPin size={16} className="text-caracas-blue shrink-0" />
                    <span className="font-medium">{jefe.procedencia || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dirección</h4>
                <div className="flex items-center gap-2 text-gray-800">
                  <Home size={16} className="text-caracas-blue shrink-0" />
                  <span className="font-medium">{jefe.direccion_exacta || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Integrantes */}
          {integrantes.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Código</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cédula</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Apellidos y Nombres</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Edad</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Género</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cama</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Parentesco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedIntegrantes.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-6 text-sm font-medium text-caracas-blue">{p.codigo || '—'}</td>
                        <td className="py-3 px-6 text-sm font-medium text-gray-700">{p.cedula?.toString() || 'S/N'}</td>
                        <td className="py-3 px-6">
                          <div className="text-sm font-bold text-gray-800">{p.apellidos}</div>
                          <div className="text-xs text-gray-500">{p.nombres}</div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-600">{calcularEdad(p.fecha_nacimiento)} años</td>
                        <td className="py-3 px-6">
                          <span className={`text-sm font-medium ${p.genero ? 'text-blue-600' : 'text-pink-600'}`}>
                            {p.genero ? 'M' : 'F'}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-caracas-red">
                            <BedDouble size={14} />
                            {p.nro_cama || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-600">
                          {p.es_jefe_familia ? '' : (p.parentesco || '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-500">Esta familia no tiene integrantes registrados</p>
            </div>
          )}

          {/* Situación Socioeconómica de la Vivienda de Origen */}
          {jefe && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Situación Socioeconómica de la Vivienda de Origen</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Condición de la vivienda tras el sismo</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.condicion_vivienda || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tenencia de la Vivienda</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.tenencia_vivienda || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ingreso Familiar Principal antes de la Emergencia</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.ingreso_familiar || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Observaciones</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.observaciones || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <FileText size={18} />
            )}
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
