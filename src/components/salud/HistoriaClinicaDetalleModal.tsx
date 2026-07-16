import { useState } from 'react';
import {
  X, User, Users, MapPin, Activity, ClipboardList, Stethoscope,
  Accessibility, AlertTriangle, Heart, Baby, FileText, Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useCampamento } from '../../context/CampamentoContext';
import { formatAge } from '../../lib/formatAge';
import { toDisplayDate } from '../../lib/formatDate';
import type { HistoriaClinica, Refugiado } from '../../types';

interface HistoriaClinicaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  historia: HistoriaClinica | null;
  refugiado: Refugiado | null;
}

export default function HistoriaClinicaDetalleModal({
  isOpen,
  onClose,
  historia,
  refugiado,
}: HistoriaClinicaDetalleModalProps) {
  const { familias = [], campamentos = [] } = useCampamento();
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const familia = refugiado?.familia_id
    ? familias.find(f => f.id === refugiado.familia_id)
    : null;

  const jerarquiaLabel = refugiado
    ? refugiado.es_jefe_familia
      ? 'Jefe de Familia'
      : `Miembro (${familia?.nombre || 'Familia Desconocida'})`
    : '—';

  const enfCronicas = (() => {
    const pares: { enfermedad: string; tratamiento: string }[] = [];
    if (!historia) return pares;
    for (let i = 1; i <= 10; i++) {
      const enf = (historia as any)[`enf_cronica_${i}`] as string | undefined;
      const trat = (historia as any)[`tratamiento_${i}`] as string | undefined;
      if (enf && enf.trim()) {
        pares.push({ enfermedad: enf, tratamiento: trat || '' });
      }
    }
    return pares;
  })();

  const tieneInfoAdicionalMedica =
    !!historia?.tipo_discapacidad ||
    !!historia?.tipo_alergia ||
    !!historia?.medicamento_enfermedad ||
    !!historia?.lesion_sismo_detalle ||
    !!historia?.adulto_mayor_detalle ||
    !!historia?.lactante_detalle ||
    enfCronicas.length > 0;

  const tieneDesgloseMedico =
    !!historia?.enfermedades_previas ||
    !!historia?.cirugias;

  const tieneExamenFisico =
    !!historia?.examen_subjetivo ||
    !!historia?.examen_objetivo ||
    !!historia?.examen_diagnostico;

  const handleExportPDF = async () => {
    if (!refugiado) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const campName = campamentos.find((c: any) => c.id === refugiado.campamento_id)?.nombre || '—';
      const logoDataUrl = await loadImageAsDataUrl('/logorepublica.png');
      const photoDataUrl = refugiado.foto_url ? await loadImageAsDataUrl(refugiado.foto_url) : null;

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

      const drawField = (label: string, value: string, x: number, maxW: number) => {
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(label, x, y + 4);
        const labelW = pdf.getTextWidth(label);
        pdf.setFont('Helvetica', 'normal');
        const val = truncate(value || '—', maxW - labelW - 1);
        pdf.text(val, x + labelW + 1, y + 4);
      };

      const drawFieldFull = (label: string, value: string) => {
        ensureSpace(6);
        drawField(label, value, margin, contentW);
        y += 6;
      };

      const drawFieldHalfL = (label: string, value: string) => {
        drawField(label, value, margin, contentW / 2 - 2);
      };

      const drawFieldHalfR = (label: string, value: string) => {
        drawField(label, value, margin + contentW / 2 + 2, contentW / 2 - 2);
      };

      const drawFieldRowLR = (lblL: string, valL: string, lblR: string, valR: string) => {
        ensureSpace(6);
        drawFieldHalfL(lblL, valL);
        drawFieldHalfR(lblR, valR);
        y += 6;
      };

      const drawTextBlock = (title: string, text: string) => {
        ensureSpace(12);
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, margin, y + 4);
        y += 6;

        if (!text || text === '—') {
          pdf.setDrawColor(156, 163, 175);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, y, contentW, 10, 'S');
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text('—', margin + 3, y + 7);
          y += 14;
          return;
        }

        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(9);
        const textW = contentW - 6;
        const lines = pdf.splitTextToSize(text, textW);
        const totalH = Math.max(lines.length * 5 + 7, 10);
        ensureSpace(totalH + 4);
        pdf.setDrawColor(156, 163, 175);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, y, contentW, totalH, 'S');
        lines.forEach((line: string, i: number) => {
          pdf.text(line, margin + 3, y + 7 + i * 5);
        });
        y += totalH + 6;
      };

      // ── CABECERA ──

      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', margin, y, 20, 20);
      }

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DETALLE DE HISTORIA CLÍNICA', pageW / 2, y + 4, { align: 'center' });

      pdf.setFontSize(15);
      pdf.setTextColor(80, 80, 80);
      const campLines = pdf.splitTextToSize(campName, 115);
      const campLineH = 7;
      campLines.forEach((line: string, i: number) => {
        pdf.text(line, pageW / 2, y + 11 + i * campLineH, { align: 'center' });
      });

      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      const planY = y + 11 + campLines.length * campLineH;
      pdf.text('PLAN VENEZUELA RENACE', pageW / 2, planY, { align: 'center' });

      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('PACIENTE N°:', pageW - margin - 34, y + 4);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(220, 38, 38);
      const codeLabelW = pdf.getTextWidth('PACIENTE N°:');
      pdf.text(refugiado.codigo || '—', pageW - margin - 34 + codeLabelW + 2, y + 4);

      const photoX = pageW - margin - 25;
      const photoY = y + 7;
      if (photoDataUrl) {
        pdf.addImage(photoDataUrl, 'PNG', photoX, photoY, 25, 30);
      } else {
        pdf.setDrawColor(156, 163, 175);
        pdf.setLineWidth(0.3);
        pdf.rect(photoX, photoY, 25, 30, 'S');
        pdf.setFontSize(6);
        pdf.setTextColor(156, 163, 175);
        pdf.text('Foto', photoX + 12.5, photoY + 14, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      }

      y += Math.max(40, planY - y + 6);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;

      // ── 1. DATOS PERSONALES ──

      drawSectionHeader('1', 'Datos Personales');

      drawFieldFull('Nombres y Apellidos:', `${refugiado.nombres} ${refugiado.apellidos}`);

      drawFieldRowLR(
        'Cédula de Identidad:', refugiado.cedula?.toString() || 'S/N',
        'Fecha de Nacimiento:', toDisplayDate(refugiado.fecha_nacimiento),
      );

      ensureSpace(6);
      drawField('Edad:', formatAge(refugiado.fecha_nacimiento), margin, contentW / 3 - 2);
      const gX = margin + contentW / 3 + 4;
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Género:', gX, y + 4);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(gX + pdf.getTextWidth('Género:') + 2, y + 1, 3, 3, 'S');
      if (refugiado.genero) {
        pdf.setLineWidth(0.4);
        pdf.line(gX + pdf.getTextWidth('Género:') + 2, y + 1, gX + pdf.getTextWidth('Género:') + 5, y + 4);
        pdf.line(gX + pdf.getTextWidth('Género:') + 5, y + 1, gX + pdf.getTextWidth('Género:') + 2, y + 4);
      }
      pdf.setFont('Helvetica', 'normal');
      pdf.text('Masculino (M)', gX + pdf.getTextWidth('Género:') + 7, y + 4);
      pdf.rect(gX + pdf.getTextWidth('Género:') + 2 + 35, y + 1, 3, 3, 'S');
      if (!refugiado.genero) {
        pdf.setLineWidth(0.4);
        pdf.line(gX + pdf.getTextWidth('Género:') + 2 + 35, y + 1, gX + pdf.getTextWidth('Género:') + 5 + 35, y + 4);
        pdf.line(gX + pdf.getTextWidth('Género:') + 5 + 35, y + 1, gX + pdf.getTextWidth('Género:') + 2 + 35, y + 4);
      }
      pdf.text('Femenino (F)', gX + pdf.getTextWidth('Género:') + 7 + 35, y + 4);
      y += 6;

      drawFieldRowLR(
        'Teléfono:', refugiado.telefono?.toString() || '—',
        'Profesión / Ocupación:', refugiado.profesion || '—',
      );

      drawFieldFull('Nivel Educativo:', refugiado.nivel_educativo || '—');
      drawFieldFull('Fecha Apertura HC:', historia ? toDisplayDate(historia.fecha_apertura) : '—');

      // ── 2. JERARQUÍA FAMILIAR ──

      drawSectionHeader('2', 'Jerarquía Familiar');

      ensureSpace(6);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Jerarquía Familiar:', margin, y + 3);
      const jfw = pdf.getTextWidth('Jerarquía Familiar:');
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(margin + jfw + 2, y + 1, 3, 3, 'S');
      if (refugiado.es_jefe_familia) {
        pdf.setLineWidth(0.4);
        pdf.line(margin + jfw + 2, y + 1, margin + jfw + 5, y + 4);
        pdf.line(margin + jfw + 5, y + 1, margin + jfw + 2, y + 4);
      }
      pdf.setFont('Helvetica', 'normal');
      pdf.text('Jefe de Familia', margin + jfw + 7, y + 4);
      pdf.rect(margin + jfw + 2 + 35, y + 1, 3, 3, 'S');
      if (!refugiado.es_jefe_familia) {
        pdf.setLineWidth(0.4);
        pdf.line(margin + jfw + 2 + 35, y + 1, margin + jfw + 5 + 35, y + 4);
        pdf.line(margin + jfw + 5 + 35, y + 1, margin + jfw + 2 + 35, y + 4);
      }
      pdf.text('Miembro', margin + jfw + 7 + 35, y + 4);
      if (!refugiado.es_jefe_familia) {
        const fam = familias.find((f: any) => f.id === refugiado.familia_id);
        pdf.text(`(${fam?.nombre || 'Familia Desconocida'})`, margin + jfw + 7 + 62, y + 4);
      }
      y += 6;

      if (!refugiado.es_jefe_familia) {
        drawFieldFull('Parentesco con el Jefe/a:', refugiado.parentesco || '—');
      }

      // ── 3. UBICACIÓN Y PROCEDENCIA ──

      drawSectionHeader('3', 'Ubicación y Procedencia');

      drawFieldRowLR(
        'Nro de Cama:', refugiado.nro_cama || '—',
        'Fecha de Ingreso:', refugiado.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—',
      );

      drawFieldFull('Procedencia:', refugiado.procedencia || '—');
      drawFieldFull('Dirección Exacta:', refugiado.direccion_exacta || '—');

      // ── 4. INFORMACIÓN ADICIONAL MÉDICA ──

      if (tieneInfoAdicionalMedica && historia) {
        drawSectionHeader('4', 'Información Adicional Médica');

        if (historia.tipo_discapacidad) {
          drawFieldFull('Discapacidad (Tipo):', historia.tipo_discapacidad);
        }

        if (historia.tipo_alergia) {
          drawFieldFull('Alergias (Tipo):', historia.tipo_alergia);
        }

        if (historia.medicamento_enfermedad) {
          drawFieldFull('Medicamento:', historia.medicamento_enfermedad);
        }

        if (historia.lesion_sismo_detalle) {
          drawFieldFull('Lesión Sismo (Detalle):', historia.lesion_sismo_detalle);
        }

        if (historia.adulto_mayor_detalle) {
          drawFieldFull('Adulto Mayor Dependencia (Detalle):', historia.adulto_mayor_detalle);
        }

        if (historia.lactante_detalle) {
          drawFieldFull('Lactante (Detalle):', historia.lactante_detalle);
        }

        if (enfCronicas.length > 0) {
          ensureSpace(6);
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text('Enfermedades Crónicas:', margin, y + 4);
          y += 6;
          enfCronicas.forEach((ec) => {
            drawFieldFull(`  • ${ec.enfermedad}`, ec.tratamiento ? `Tratamiento: ${ec.tratamiento}` : '—');
          });
        }
      }

      // ── 5. DESGLOSE MÉDICO ──

      if (tieneDesgloseMedico && historia) {
        drawSectionHeader('5', 'Desglose Médico');

        if (historia.enfermedades_previas) {
          drawTextBlock('Enfermedades Previas:', historia.enfermedades_previas);
        }

        if (historia.cirugias) {
          drawTextBlock('Cirugías:', historia.cirugias);
        }
      }

      // ── 6. EXAMEN FÍSICO GENERAL ──

      if (tieneExamenFisico && historia) {
        drawSectionHeader('6', 'Examen Físico General');

        if (historia.examen_subjetivo) {
          drawTextBlock('Subjetivo:', historia.examen_subjetivo);
        }

        if (historia.examen_objetivo) {
          drawTextBlock('Objetivo:', historia.examen_objetivo);
        }

        if (historia.examen_diagnostico) {
          drawTextBlock('Diagnóstico:', historia.examen_diagnostico);
        }
      }

      // ── page numbers ──

      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(6);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`Página ${p} de ${totalPages}`, pageW - margin, pageH - margin, { align: 'right' });
      }

      const patientName = `${refugiado.apellidos}_${refugiado.nombres}`.replace(/\s+/g, '_');
      pdf.save(`Historia_Clinica_${patientName}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Detalle de Historia Clínica</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {refugiado
                ? `${refugiado.apellidos}, ${refugiado.nombres} — Cód. ${refugiado.codigo || '—'}`
                : 'Integrante no disponible'}
              {historia && (
                <> &mdash; Apertura: {toDisplayDate(historia.fecha_apertura)}</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* 1. Datos Personales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-blue/10 rounded-lg">
                <User size={18} className="text-caracas-blue" />
              </div>
              <h3 className="font-semibold text-gray-800">Datos Personales</h3>
            </div>
            <div className="p-6">
              <div className="md:col-span-2 flex items-start gap-6 mb-6">
                <div className="shrink-0">
                  {refugiado?.foto_url ? (
                    <img
                      src={refugiado.foto_url}
                      alt="Foto del integrante"
                      className="w-28 h-32 object-cover rounded-xl border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
                      <User size={24} />
                      <span className="text-[10px] font-medium mt-1">Sin foto</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FichaField label="Código" value={refugiado?.codigo || '—'} />
                  <FichaField label="Cédula" value={refugiado?.cedula?.toString() || 'S/N'} />
                  <FichaField label="Nombres" value={refugiado?.nombres || '—'} />
                  <FichaField label="Apellidos" value={refugiado?.apellidos || '—'} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FichaField label="Género" value={refugiado ? (refugiado.genero ? 'Masculino' : 'Femenino') : '—'} />
                <FichaField
                  label="Fecha de Nacimiento"
                  value={refugiado?.fecha_nacimiento ? toDisplayDate(refugiado.fecha_nacimiento) : '—'}
                />
                <FichaField label="Edad" value={refugiado?.fecha_nacimiento ? formatAge(refugiado.fecha_nacimiento) : '—'} />
                <FichaField label="Teléfono" value={refugiado?.telefono?.toString() || '—'} />
                <FichaField label="Profesión / Ocupación" value={refugiado?.profesion || '—'} />
                <FichaField label="Nivel Educativo" value={refugiado?.nivel_educativo || '—'} />
              </div>
            </div>
          </div>

          {/* 2. Jerarquía Familiar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-green/10 rounded-lg">
                <Users size={18} className="text-caracas-green" />
              </div>
              <h3 className="font-semibold text-gray-800">Jerarquía Familiar</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField label="Jerarquía Familiar" value={jerarquiaLabel} mono />
              {refugiado && !refugiado.es_jefe_familia && (
                <FichaField label="Parentesco con el jefe/a" value={refugiado.parentesco || '—'} />
              )}
            </div>
          </div>

          {/* 3. Ubicación y Procedencia */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <MapPin size={18} className="text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Ubicación y Procedencia</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField label="Nro de Cama" value={refugiado?.nro_cama || '—'} />
              <FichaField label="Procedencia" value={refugiado?.procedencia || '—'} />
              <FichaField label="Dirección Exacta" value={refugiado?.direccion_exacta || '—'} />
              <FichaField
                label="Fecha de Ingreso"
                value={refugiado?.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—'}
              />
            </div>
          </div>

          {/* 4. Información Adicional Médica */}
          {tieneInfoAdicionalMedica && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Activity size={18} className="text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Información Adicional Médica</h3>
              </div>
              <div className="p-6 space-y-4">
                {historia?.tipo_discapacidad && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Accessibility size={14} /> Discapacidad: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.tipo_discapacidad}</p>
                  </div>
                )}

                {historia?.tipo_alergia && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <AlertTriangle size={14} /> Alergias: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.tipo_alergia}</p>
                  </div>
                )}

                {historia?.medicamento_enfermedad && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Activity size={14} /> Medicamento
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.medicamento_enfermedad}</p>
                  </div>
                )}

                {enfCronicas.length > 0 && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Heart size={14} /> Enfermedad Crónica: Sí
                    </span>
                    <div className="mt-2 space-y-2">
                      {enfCronicas.map((ec, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700">{ec.enfermedad}</p>
                          {ec.tratamiento && (
                            <p className="text-sm text-gray-500 mt-1">Tratamiento: {ec.tratamiento}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {historia?.lesion_sismo_detalle && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <AlertTriangle size={14} /> Lesión Sismo: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.lesion_sismo_detalle}</p>
                  </div>
                )}

                {historia?.adulto_mayor_detalle && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <User size={14} /> Adulto Mayor Dependencia: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.adulto_mayor_detalle}</p>
                  </div>
                )}

                {historia?.lactante_detalle && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                      <Baby size={14} /> Lactante: Sí
                    </span>
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{historia.lactante_detalle}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Desglose Médico */}
          {tieneDesgloseMedico && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ClipboardList size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Desglose Médico</h3>
              </div>
              <div className="p-6 space-y-4">
                {historia?.enfermedades_previas && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Enfermedades Previas</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.enfermedades_previas}</p>
                  </div>
                )}
                {historia?.cirugias && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Cirugías</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.cirugias}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Examen Físico General */}
          {tieneExamenFisico && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Stethoscope size={18} className="text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Examen Físico General</h3>
              </div>
              <div className="p-6 space-y-4">
                {historia?.examen_subjetivo && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Subjetivo</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.examen_subjetivo}</p>
                  </div>
                )}
                {historia?.examen_objetivo && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Objetivo</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.examen_objetivo}</p>
                  </div>
                )}
                {historia?.examen_diagnostico && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Diagnóstico</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{historia.examen_diagnostico}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Si no hay info médica registrada */}
          {!tieneInfoAdicionalMedica && !tieneDesgloseMedico && !tieneExamenFisico && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Stethoscope size={18} className="text-gray-500" />
                </div>
                <h3 className="font-semibold text-gray-800">Información Médica</h3>
              </div>
              <div className="p-6 text-center text-gray-400">
                <Stethoscope size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No se ha registrado información médica</p>
                <p className="text-sm mt-1">Utilice el botón de modificar para agregar datos clínicos</p>
              </div>
            </div>
          )}

        </div>

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
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function FichaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</h4>
      <span className={`font-medium ${mono ? 'text-caracas-blue bg-caracas-blue/5 px-2.5 py-1 rounded-lg text-sm' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
