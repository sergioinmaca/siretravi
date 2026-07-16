import { useState, useRef, useEffect } from 'react';
import {
  X, User, Users, MapPin, Accessibility, Shirt,
  Calendar, Phone, Briefcase, GraduationCap, Heart,
  PawPrint, AlertTriangle, Baby, Stethoscope, FileText, Loader2, Camera,
  Save, Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../../lib/supabase';
import { useCampamento } from '../../context/CampamentoContext';
import { formatAge } from '../../lib/formatAge';
import { toDisplayDate } from '../../lib/formatDate';
import type { Refugiado } from '../../types';


interface FichaRefugiadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiado: Refugiado | null;
  onActualizarFoto: (foto_url: string | null) => void;
}

export default function FichaRefugiadoModal({ isOpen, onClose, refugiado, onActualizarFoto }: FichaRefugiadoModalProps) {
  const { familias = [], campamentos = [], actualizarRefugiado } = useCampamento();
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = !refugiado?.foto_url && !storageUrl;
  const canSave = !!storageUrl;
  const canDelete = !!refugiado?.foto_url || !!storageUrl;

  useEffect(() => {
    if (isOpen) {
      const saved = refugiado?.foto_url || null;
      setPreviewUrl(saved);
      setStorageUrl(null);
      setUploadError(null);
    } else {
      setPreviewUrl(null);
      setStorageUrl(null);
      setUploadError(null);
    }
  }, [isOpen, refugiado?.foto_url]);

  if (!isOpen || !refugiado) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const campName = campamentos.find(c => c.id === refugiado.campamento_id)?.nombre || '—';

      const logoDataUrl = await loadImageAsDataUrl('/logorepublica.png');
      const photoDataUrl = refugiado.foto_url ? await loadImageAsDataUrl(refugiado.foto_url) : null;

      // ── helpers ──

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
      void drawFieldHalfL;

      const drawFieldHalfR = (label: string, value: string) => {
        drawField(label, value, margin + contentW / 2 + 2, contentW / 2 - 2);
      };
      void drawFieldHalfR;

      const drawFieldRow = (label: string, value: string) => {
        ensureSpace(6);
        drawFieldHalfL(label, value);
        y += 6;
      };
      void drawFieldRow;

      const drawFieldRowLR = (lblL: string, valL: string, lblR: string, valR: string) => {
        ensureSpace(6);
        drawFieldHalfL(lblL, valL);
        drawFieldHalfR(lblR, valR);
        y += 6;
      };

      const drawFieldRowThird = (lbl1: string, val1: string, lbl2: string, val2: string, lbl3: string, val3: string) => {
        ensureSpace(6);
        const third = contentW / 3;
        drawField(lbl1, val1, margin, third - 2);
        drawField(lbl2, val2, margin + third + 1, third - 2);
        drawField(lbl3, val3, margin + 2 * third + 2, third - 2);
        y += 6;
      };
      void drawFieldRowThird;

      const drawFieldRowCols = (cols: [string, string][]) => {
        ensureSpace(6);
        const colW = contentW / cols.length;
        cols.forEach(([lbl, val], i) => {
          drawField(lbl, val, margin + i * (colW + 1), colW - 2);
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
        return pdf.getTextWidth(label) + 7;
      };

      const drawCheckboxRow = (items: [boolean, string][]) => {
        ensureSpace(6);
        const gap = 8;
        const totalW = items.reduce((sum, [_, lbl]) => sum + pdf.getTextWidth(lbl) + 7, 0) + gap * (items.length - 1);
        let cx = margin + (contentW - totalW) / 2;
        if (cx < margin) cx = margin;
        items.forEach(([chk, lbl]) => {
          const w = drawCheckbox(chk, lbl, cx);
          cx += w + gap;
        });
        y += 6;
      };

      const drawCheckboxList = (items: [boolean, string][], cols = 2) => {
        ensureSpace(items.length / cols * 6);
        const colW = contentW / cols;
        items.forEach(([chk, lbl], i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = margin + col * colW;
          const cy = y + row * 6;
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.3);
          pdf.rect(cx, cy + 1, 3, 3, 'S');
          if (chk) {
            pdf.setLineWidth(0.4);
            pdf.line(cx, cy + 1, cx + 3, cy + 4);
            pdf.line(cx + 3, cy + 1, cx, cy + 4);
          }
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text(lbl, cx + 4, cy + 4);
        });
        y += Math.ceil(items.length / cols) * 6;
      };

      const drawObservationsSection = (num: string, title: string, text: string) => {
        drawSectionHeader(num, title);
        const boxH = 10;
        const textW = contentW - 6;
        pdf.setDrawColor(156, 163, 175);
        pdf.setLineWidth(0.3);

        if (!text || text === '—') {
          ensureSpace(boxH + 6);
          pdf.rect(margin, y, contentW, boxH, 'S');
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text('—', margin + 3, y + 7);
          y += boxH + 6;
          return;
        }

        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(9);
        const lines = pdf.splitTextToSize(text, textW);
        const totalH = Math.max(lines.length * 5 + 7, boxH);
        ensureSpace(totalH + 6);
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
      pdf.text('FICHA DE INTEGRANTE', pageW / 2, y + 4, { align: 'center' });

      pdf.setFontSize(15);
      pdf.setTextColor(80, 80, 80);
      const safeTextW = 115;
      const campLines = pdf.splitTextToSize(campName, safeTextW);
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
      pdf.text('INTEGRANTE Nº:', pageW - margin - 34, y + 4);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(220, 38, 38);
      const codeLabelW = pdf.getTextWidth('INTEGRANTE Nº:');
      pdf.text(refugiado.codigo || '—', pageW - margin - 34 + codeLabelW + 2, y + 4);

      pdf.setTextColor(0, 0, 0);
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
        'C\u00e9dula de Identidad:', refugiado.cedula?.toString() || 'S/N',
        'Fecha de Nacimiento:', toDisplayDate(refugiado.fecha_nacimiento),
      );

      ensureSpace(6);
      drawField('Edad:', formatAge(refugiado.fecha_nacimiento), margin, contentW / 3 - 2);
      const gX = margin + contentW / 3 + 4;
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('G\u00e9nero:', gX, y + 4);
      drawCheckbox(refugiado.genero, 'Masculino (M)', gX + pdf.getTextWidth('G\u00e9nero:') + 2);
      drawCheckbox(!refugiado.genero, 'Femenino (F)', gX + pdf.getTextWidth('G\u00e9nero:') + 2 + 35);
      y += 6;

      ensureSpace(6);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Nivel Educativo:', margin, y + 4);
      const neX = margin + pdf.getTextWidth('Nivel Educativo:') + 2;
      const niveles = ['Ninguno', 'Primaria', 'Secundaria', 'Universitario'];
      niveles.forEach((level, i) => {
        const isSelected = refugiado.nivel_educativo?.toUpperCase().includes(level.toUpperCase()) ||
          (level === 'Ninguno' && !refugiado.nivel_educativo);
        drawCheckbox(isSelected, level, neX + i * 32);
      });
      y += 6;

      drawFieldRowLR(
        'Tel\u00e9fono:', refugiado.telefono?.toString() || '—',
        'Profesi\u00f3n / Ocupaci\u00f3n:', refugiado.profesion || '—',
      );

      // ── 2. UBICACIÓN E INFORMACIÓN FAMILIAR ──

      drawSectionHeader('2', 'Ubicaci\u00f3n e Informaci\u00f3n Familiar');

      ensureSpace(6);
      const jfY = y;
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Jerarqu\u00eda Familiar:', margin, jfY + 3);
      const jfw = pdf.getTextWidth('Jerarqu\u00eda Familiar:');
      drawCheckbox(refugiado.es_jefe_familia, 'Jefe de Familia', margin + jfw + 2);
      drawCheckbox(!refugiado.es_jefe_familia, 'Miembro', margin + jfw + 2 + 35);
      if (!refugiado.es_jefe_familia) {
        drawField('Parentesco con el Jefe/a:', refugiado.parentesco || '—', margin + contentW / 2, contentW / 2 - 2);
      }
      y += 6;

      drawFieldRowLR(
        'Nro de Cama:', refugiado.nro_cama || '—',
        'Fecha de Ingreso:', refugiado.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—',
      );

      drawFieldFull('Procedencia:', refugiado.procedencia || '—');
      drawFieldFull('Direcci\u00f3n Exacta:', refugiado.direccion_exacta || '—');

      // ── 3. EVALUACIÓN DE SALUD ──

      drawSectionHeader('3', 'Evaluaci\u00f3n de Salud y Condiciones Especiales');

      drawCheckboxRow([
        [refugiado.lesion_sismo, '\u00bfLesi\u00f3n por sismo?: S\u00ed'],
        [!refugiado.lesion_sismo, 'No'],
        [refugiado.enfermedad_cronica, '\u00bfEnf. Cr\u00f3nica?: S\u00ed'],
        [!refugiado.enfermedad_cronica, 'No'],
        [refugiado.alergias, '\u00bfTiene Alergias?: S\u00ed'],
        [!refugiado.alergias, 'No'],
      ]);

      ensureSpace(6);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Condiciones Especiales (Marcar si aplica):', margin, y + 4);
      y += 6;

      const embarazoLabel = refugiado.embarazo && refugiado.tiempo_embarazo
        ? `Embarazada (Gestaci\u00f3n: ${refugiado.tiempo_embarazo} semanas)`
        : 'Embarazada';
      drawCheckboxList([
        [refugiado.embarazo, embarazoLabel],
        [!!refugiado.lactante, 'Lactante'],
        [refugiado.discapacidad, 'Persona con discapacidad'],
        [refugiado.adulto_mayor_dependencia, 'Adulto mayor con dependencia'],
      ], 2);

      // ── 4. DETALLES DE MASCOTA ──

      drawSectionHeader('4', 'Detalles de Mascota');

      drawCheckboxRow([
        [refugiado.mascotas, '\u00bfTiene mascotas a cargo?: S\u00ed'],
        [!refugiado.mascotas, 'No'],
      ]);

      if (refugiado.mascotas) {
        drawFieldRowCols([
          ['Tipo:', refugiado.tipo_mascota || '—'],
          ['Nombre:', refugiado.mascota_nombre || '—'],
          ['Sexo:', refugiado.mascota_sexo === true ? 'Macho' : refugiado.mascota_sexo === false ? 'Hembra' : '—'],
        ]);
        drawFieldRowLR(
          'Raza:', refugiado.mascota_raza || '—',
          'Edad (a\u00f1os):', refugiado.mascota_edad?.toString() || '—',
        );
      }

      // ── 5. TALLAS DE VESTIMENTA ──

      drawSectionHeader('5', 'Tallas de Vestimenta');

      drawFieldRowCols([
        ['Camisa:', refugiado.talla_camisa || '—'],
        ['Pantal\u00f3n:', refugiado.talla_pantalon || '—'],
        ['Zapatos:', refugiado.talla_zapatos || '—'],
      ]);

      // ── 6. OBSERVACIONES SOCIOECONÓMICAS ──

      drawObservationsSection('6', 'Observaciones de la Situaci\u00f3n Socioecon\u00f3mica', refugiado.observaciones || '');

      // ── 7. OBSERVACIONES GENERALES ──

      drawObservationsSection(
        '7',
        'Observaciones Generales',
        (refugiado as any).observaciones_generales || '',
      );

      // ── page numbers ──

      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(6);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`P\u00e1gina ${p} de ${totalPages}`, pageW - margin, pageH - margin, { align: 'right' });
      }

      pdf.save(`Ficha_${refugiado.nombres}_${refugiado.apellidos}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Ocurri\u00f3 un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !refugiado) return;

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const ext = file.name.split('.').pop();
      const path = `${refugiado.campamento_id}/${refugiado.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('fotos-integrantes')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('fotos-integrantes')
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      setStorageUrl(publicUrl);
      setPreviewUrl(publicUrl);
    } catch (err) {
      console.error('Error subiendo foto:', err);
      setUploadError('No se pudo subir la foto. Intente de nuevo.');
      setPreviewUrl(refugiado.foto_url || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGuardar = async () => {
    if (!storageUrl || !refugiado) return;
    setIsSaving(true);
    try {
      await actualizarRefugiado(refugiado.id, { ...refugiado, foto_url: storageUrl });
      onActualizarFoto(storageUrl);
      setPreviewUrl(storageUrl);
      setStorageUrl(null);
    } catch (err) {
      console.error('Error guardando foto:', err);
      setUploadError('No se pudo guardar la foto en la ficha.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar la foto?')) return;

    try {
      const urlToDelete = storageUrl || refugiado?.foto_url;
      if (urlToDelete && refugiado) {
        const pathMatch = urlToDelete.match(/\/fotos-integrantes\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('fotos-integrantes').remove([pathMatch[1]]);
        }
      }

      if (refugiado) {
        await actualizarRefugiado(refugiado.id, { ...refugiado, foto_url: undefined });
      }

      onActualizarFoto(null);
      setStorageUrl(null);
      setPreviewUrl(null);
      setUploadError(null);
    } catch (err) {
      console.error('Error eliminando foto:', err);
      setUploadError('No se pudo eliminar la foto. Intente de nuevo.');
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setStorageUrl(null);
    setUploadError(null);
    onClose();
  };

  const familia = refugiado.familia_id
    ? familias.find(f => f.id === refugiado.familia_id)
    : null;

  const jerarquiaLabel = refugiado.es_jefe_familia
    ? 'Jefe de Familia'
    : `Miembro (${familia?.nombre || 'Familia Desconocida'})`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelectAndUpload}
        />

        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Ficha del Integrante</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {refugiado.apellidos}, {refugiado.nombres} — Cód. {refugiado.codigo || '—'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* Tarjeta 1: Datos Personales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-blue/10 rounded-lg">
                <User size={18} className="text-caracas-blue" />
              </div>
              <h3 className="font-semibold text-gray-800">Datos Personales</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-start gap-6">
                <div className="shrink-0">
                  {previewUrl ? (
                    <div className="relative group">
                      <img
                        src={previewUrl}
                        alt="Foto del integrante"
                        className="w-28 h-32 object-cover rounded-xl border-2 border-gray-200"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canUpload || isUploading}
                      className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-caracas-red hover:text-caracas-red hover:bg-red-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={canUpload ? 'Subir foto' : 'La foto ya está guardada'}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          <span className="text-[10px] font-medium text-center leading-tight">Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={24} />
                          <span className="text-[10px] font-medium text-center leading-tight">Subir<br />foto</span>
                        </>
                      )}
                    </button>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1 text-center leading-tight">{uploadError}</p>
                  )}
                  {storageUrl && (
                    <p className="text-xs text-amber-600 mt-1 text-center leading-tight font-medium">Debe guardar para mantener los cambios</p>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleEliminar}
                      disabled={isUploading}
                      className="w-28 mt-2 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Eliminar foto
                    </button>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FichaField label="Código" value={refugiado.codigo || '—'} />
                  <FichaField label="Cédula" value={refugiado.cedula?.toString() || 'S/N'} />
                  <FichaField label="Nombres" value={refugiado.nombres} />
                  <FichaField label="Apellidos" value={refugiado.apellidos} />
                </div>
              </div>
              <FichaField label="Género" value={refugiado.genero ? 'Masculino' : 'Femenino'} />
              <FichaField
                label="Fecha de Nacimiento"
                value={toDisplayDate(refugiado.fecha_nacimiento)}
              />
              <FichaField label="Edad" value={formatAge(refugiado.fecha_nacimiento)} />
              <FichaField
                label="Teléfono"
                icon={<Phone size={14} />}
                value={refugiado.telefono?.toString() || '—'}
              />
              <FichaField
                label="Profesión / Ocupación"
                icon={<Briefcase size={14} />}
                value={refugiado.profesion || '—'}
              />
              <FichaField
                label="Nivel Educativo"
                icon={<GraduationCap size={14} />}
                value={refugiado.nivel_educativo || '—'}
              />
            </div>
          </div>

          {/* Tarjeta 2: Información Familiar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-green/10 rounded-lg">
                <Users size={18} className="text-caracas-green" />
              </div>
              <h3 className="font-semibold text-gray-800">Información Familiar</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField
                label="Jerarquía Familiar"
                value={jerarquiaLabel}
                mono
              />
              {!refugiado.es_jefe_familia && (
                <FichaField
                  label="Parentesco con el jefe/a"
                  value={refugiado.parentesco || '—'}
                />
              )}
            </div>
          </div>

          {/* Tarjeta 3: Ubicación y Procedencia */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <MapPin size={18} className="text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Ubicación y Procedencia</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField label="Nro de Cama" value={refugiado.nro_cama || '—'} />
              <FichaField label="Procedencia" value={refugiado.procedencia || '—'} />
              <FichaField label="Dirección Exacta" value={refugiado.direccion_exacta || '—'} />
              <FichaField
                label="Fecha de Ingreso"
                icon={<Calendar size={14} />}
                value={refugiado.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—'}
              />
            </div>
          </div>

          {/* Tarjeta 4: Información Adicional */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Accessibility size={18} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Información Adicional</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <BadgeSiNo
                  label="Discapacidad"
                  value={refugiado.discapacidad}
                  icon={<Accessibility size={14} />}
                />
                <BadgeSiNo
                  label="Alergias"
                  value={refugiado.alergias}
                  icon={<AlertTriangle size={14} />}
                />
                <BadgeSiNo
                  label="Enfermedad Crónica"
                  value={refugiado.enfermedad_cronica}
                  icon={<Stethoscope size={14} />}
                />
                <BadgeSiNo
                  label="Lesión por Sismo"
                  value={refugiado.lesion_sismo}
                  icon={<AlertTriangle size={14} />}
                />
                <BadgeSiNo
                  label="Adulto Mayor Dependencia"
                  value={refugiado.adulto_mayor_dependencia}
                  icon={<User size={14} />}
                />
                {refugiado.lactante !== undefined && (
                  <BadgeSiNo
                    label="Lactante"
                    value={refugiado.lactante}
                    icon={<Baby size={14} />}
                  />
                )}
                {!refugiado.genero && (
                  <>
                    <BadgeSiNo
                      label="Embarazo"
                      value={refugiado.embarazo}
                      icon={<Heart size={14} />}
                    />
                    {refugiado.embarazo && refugiado.tiempo_embarazo && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-pink-50 text-pink-700">
                        <Baby size={14} />
                        {refugiado.tiempo_embarazo} semanas
                      </span>
                    )}
                  </>
                )}
                <BadgeSiNo
                  label="Mascotas a cargo"
                  value={refugiado.mascotas}
                  icon={<PawPrint size={14} />}
                />
              </div>

              {refugiado.mascotas && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalles de la Mascota</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FichaField label="Tipo de Mascota" value={refugiado.tipo_mascota || '—'} />
                    <FichaField
                      label="Sexo"
                      value={
                        refugiado.mascota_sexo === true
                          ? 'Macho'
                          : refugiado.mascota_sexo === false
                            ? 'Hembra'
                            : '—'
                      }
                    />
                    <FichaField label="Raza" value={refugiado.mascota_raza || '—'} />
                    <FichaField label="Nombre" value={refugiado.mascota_nombre || '—'} />
                    <FichaField
                      label="Edad (años)"
                      value={refugiado.mascota_edad?.toString() || '—'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 5: Vestimenta */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Shirt size={18} className="text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Vestimenta</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FichaField label="Talla de Camisa" value={refugiado.talla_camisa || '—'} />
              <FichaField label="Talla de Pantalón" value={refugiado.talla_pantalon || '—'} />
              <FichaField label="Talla de Zapatos" value={refugiado.talla_zapatos || '—'} />
            </div>
          </div>

          {/* Tarjeta 6: Observaciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText size={18} className="text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Observaciones</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {refugiado.observaciones || '—'}
              </p>
            </div>
          </div>

          {/* Tarjeta 7: Observaciones Generales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText size={18} className="text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Observaciones Generales</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {refugiado.observaciones_generales || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleGuardar}
            disabled={!canSave || isSaving}
            className="flex items-center justify-center gap-2 bg-caracas-blue hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
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
          <button onClick={handleClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
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
  icon,
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
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className={`font-medium ${mono ? 'text-caracas-blue bg-caracas-blue/5 px-2.5 py-1 rounded-lg text-sm' : 'text-gray-800'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function BadgeSiNo({
  label,
  value,
  icon,
}: {
  label: string;
  value: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${value
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-gray-50 text-gray-400 border border-gray-100'
        }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}: {value ? 'Sí' : 'No'}
    </span>
  );
}

