import { useState, useRef, useEffect } from 'react';
import {
  X, User, Users, MapPin, Accessibility, Shirt,
  Calendar, Phone, Briefcase, GraduationCap, Heart,
  PawPrint, AlertTriangle, Baby, Stethoscope, FileText, Loader2, Camera,
  Save, Trash2, ChevronLeft, ChevronRight, Activity, Gift, HeartHandshake,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useFotoUpload } from '../../hooks/useFotoUpload';
import { useCampamento } from '../../context/CampamentoContext';
import { formatAge } from '../../lib/formatAge';
import { formatCedula } from '../../lib/formatCedula';
import { toDisplayDate } from '../../lib/formatDate';
import { obtenerHistoriaClinicaPorRefugiado, obtenerAtencionesPorHistoriaClinica } from '../../lib/salud';
import type { Refugiado, AtencionMedica } from '../../types';
import { useAuth } from '../../context/AuthContext';


interface FichaRefugiadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiado: Refugiado | null;
  onActualizarFoto: (foto_url: string | null) => void;
  onActualizarMascotaFoto: (mascota_foto_url: string | null) => void;
}

export default function FichaRefugiadoModal({ isOpen, onClose, refugiado, onActualizarFoto, onActualizarMascotaFoto }: FichaRefugiadoModalProps) {
  const { familias = [], campamentos = [], actualizarFotoRefugiado } = useCampamento();
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pagina, setPagina] = useState<1 | 2>(1);
  const [atenciones, setAtenciones] = useState<AtencionMedica[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  const [mascotaPreviewUrl, setMascotaPreviewUrl] = useState<string | null>(null);
  const [mascotaFotoFile, setMascotaFotoFile] = useState<File | null>(null);
  const mascotaFileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    uploadError,
    setUploadError,
    validarArchivo,
    uploadFoto: uploadFotoHook,
    deleteStorageFile,
    leerArchivoComoDataURL,
  } = useFotoUpload();

  const canSave = !!fotoFile || !!mascotaFotoFile;
  const canDelete = !!refugiado?.foto_url;
  const canDeleteMascota = !!refugiado?.mascota_foto_url;

  const { usuarioActual } = useAuth();
  const esMaster = usuarioActual?.es_master === true;

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(refugiado?.foto_url || null);
      setMascotaPreviewUrl(refugiado?.mascota_foto_url || null);
      setFotoFile(null);
      setMascotaFotoFile(null);
      setUploadError(null);
      setPagina(1);

      if (refugiado?.id) {
        setLoadingRegistros(true);
        obtenerHistoriaClinicaPorRefugiado(refugiado.id).then(async (hc) => {
          if (hc) {
            const atts = await obtenerAtencionesPorHistoriaClinica(hc.id);
            setAtenciones(atts);
          } else {
            setAtenciones([]);
          }
        }).finally(() => setLoadingRegistros(false));
      }
    } else {
      setPreviewUrl(null);
      setMascotaPreviewUrl(null);
      setFotoFile(null);
      setMascotaFotoFile(null);
      setUploadError(null);
      setAtenciones([]);
    }
  }, [isOpen, refugiado?.id, refugiado?.foto_url, refugiado?.mascota_foto_url, setUploadError]);

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

      const logoDataUrl = await loadImageAsDataUrl('/logorepublica.jpg');
      const photoDataUrl = refugiado.foto_url ? await loadImageAsDataUrl(refugiado.foto_url) : null;
      const mascotaPhotoDataUrl = refugiado.mascota_foto_url ? await loadImageAsDataUrl(refugiado.mascota_foto_url) : null;

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
        'C\u00e9dula de Identidad:', formatCedula(refugiado.cedula) ?? 'S/N',
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
        if (mascotaPhotoDataUrl) {
          const mpX = pageW - margin - 25;
          const mpY = y;
          pdf.addImage(mascotaPhotoDataUrl, 'PNG', mpX, mpY, 20, 20);
          const photoBottom = mpY + 20;
          drawFieldRowCols([
            ['Tipo:', refugiado.tipo_mascota || '—'],
            ['Nombre:', refugiado.mascota_nombre || '—'],
            ['Sexo:', refugiado.mascota_sexo === true ? 'Macho' : refugiado.mascota_sexo === false ? 'Hembra' : '—'],
          ]);
          drawFieldRowLR(
            'Raza:', refugiado.mascota_raza || '—',
            'Edad (a\u00f1os):', refugiado.mascota_edad?.toString() || '—',
          );
          if (y < photoBottom) y = photoBottom + 2;
        } else {
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

      // ── 8. ATENCIONES, BENEFICIOS Y DONACIONES ──

      drawSectionHeader('8', 'Atenciones, Beneficios y Donaciones');

      if (atencionesFiltradas.length === 0) {
        ensureSpace(6);
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(156, 163, 175);
        pdf.text('Sin registros', margin + 3, y + 4);
        y += 8;
      } else {
        atencionesFiltradas.forEach((a, idx) => {
          if (idx > 0) {
            ensureSpace(4);
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.line(margin, y, pageW - margin, y);
            y += 4;
          }

          ensureSpace(10);

          const indentX = margin + 8;
          const indentW = contentW - 8;

          const fechaStr = a.fecha_atencion instanceof Date
            ? `${a.fecha_atencion.getDate().toString().padStart(2, '0')}/${(a.fecha_atencion.getMonth() + 1).toString().padStart(2, '0')}/${a.fecha_atencion.getFullYear()}`
            : '';

          let subLabel = '';
          if (a.tipo === 'medica') {
            subLabel = (a as any).especialidad_1 || '';
          } else {
            const prefix = a.tipo === 'beneficio' ? 'beneficio' : 'donacion';
            subLabel = (a as any)[`${prefix}_tipo_1`] || '';
          }

          const tipoLabel = a.tipo === 'medica' ? 'ATENCIÓN MÉDICA' : a.tipo === 'beneficio' ? 'BENEFICIO' : 'DONACIÓN';
          const tituloLinea = subLabel ? `${tipoLabel} — ${subLabel} — ${fechaStr}` : `${tipoLabel} — ${fechaStr}`;

          pdf.setFillColor(243, 244, 246);
          pdf.rect(indentX, y, indentW, 6, 'F');
          pdf.setDrawColor(220, 38, 38);
          pdf.setLineWidth(1);
          pdf.line(indentX, y, indentX, y + 6);
          pdf.setFont('Helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.text(tituloLinea, indentX + 3, y + 4.2);
          y += 8;

          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(60, 60, 60);

          if (a.tipo === 'medica') {
            for (let i = 1; i <= 10; i++) {
              const esp = (a as any)[`especialidad_${i}`];
              const diag = (a as any)[`diagnostico_${i}`];
              const resp = (a as any)[`responsable_${i}`];
              const trat = (a as any)[`tratamiento_${i}`];
              if (!esp) break;

              const lines: string[] = [`Especialidad: ${esp}`];
              if (diag) lines.push(`Diagnóstico: ${diag}`);
              if (resp) lines.push(`Responsable: ${resp}`);
              if (trat) lines.push(`Tratamiento: ${trat}`);

              lines.forEach(line => {
                ensureSpace(5);
                pdf.text(`  ${line}`, indentX + 3, y + 4);
                y += 5;
              });

              if (i < 10 && (a as any)[`especialidad_${i + 1}`]) {
                y += 1;
              }
            }
          } else {
            const prefix = a.tipo === 'beneficio' ? 'beneficio' : 'donacion';
            for (let i = 1; i <= 10; i++) {
              const tipo = (a as any)[`${prefix}_tipo_${i}`];
              const desc = (a as any)[`${prefix}_descripcion_${i}`];
              const entregado = (a as any)[`${prefix}_entregado_por_${i}`];
              if (!tipo) break;

              const lines: string[] = [`Tipo: ${tipo}`];
              if (desc) lines.push(`Descripción: ${desc}`);
              if (entregado) lines.push(`Entregado por: ${entregado}`);

              lines.forEach(line => {
                ensureSpace(5);
                pdf.text(`  ${line}`, indentX + 3, y + 4);
                y += 5;
              });

              if (i < 10 && (a as any)[`${prefix}_tipo_${i + 1}`]) {
                y += 1;
              }
            }
          }

          y += 2;
        });
      }

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

  const handleSelectFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !refugiado) return;

    const error = validarArchivo(file);
    if (error) {
      setUploadError(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    const dataUrl = await leerArchivoComoDataURL(file);
    setPreviewUrl(dataUrl);
    setFotoFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectMascotaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !refugiado) return;

    const error = validarArchivo(file);
    if (error) {
      setUploadError(error);
      if (mascotaFileInputRef.current) mascotaFileInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    const dataUrl = await leerArchivoComoDataURL(file);
    setMascotaPreviewUrl(dataUrl);
    setMascotaFotoFile(file);
    if (mascotaFileInputRef.current) mascotaFileInputRef.current.value = '';
  };

  const handleGuardar = async () => {
    if ((!fotoFile && !mascotaFotoFile) || !refugiado) return;
    setIsSaving(true);
    try {
      let newFotoUrl: string | null | undefined = undefined;
      let newMascotaFotoUrl: string | null | undefined = undefined;
      let fotoChanged = false;
      let mascotaChanged = false;

      if (fotoFile) {
        const url = await uploadFotoHook(fotoFile, refugiado.campamento_id, refugiado.id);
        if (url) {
          if (refugiado.foto_url) {
            await deleteStorageFile(refugiado.foto_url);
          }
          newFotoUrl = url;
          fotoChanged = true;
        } else {
          setIsSaving(false);
          return;
        }
      }

      if (mascotaFotoFile) {
        const url = await uploadFotoHook(mascotaFotoFile, refugiado.campamento_id, refugiado.id, 'mascota');
        if (url) {
          if (refugiado.mascota_foto_url) {
            await deleteStorageFile(refugiado.mascota_foto_url);
          }
          newMascotaFotoUrl = url;
          mascotaChanged = true;
        } else {
          setIsSaving(false);
          return;
        }
      }

      if (fotoChanged || mascotaChanged) {
        const updateData: { foto_url?: string | null; mascota_foto_url?: string | null } = {};
        if (fotoChanged) updateData.foto_url = newFotoUrl;
        if (mascotaChanged) updateData.mascota_foto_url = newMascotaFotoUrl;
        const ok = await actualizarFotoRefugiado(refugiado.id, updateData);
        if (!ok) {
          setUploadError('No se pudo guardar la foto en la ficha del integrante.');
          setIsSaving(false);
          return;
        }

        if (fotoChanged) {
          onActualizarFoto(newFotoUrl ?? null);
          setPreviewUrl(newFotoUrl ?? null);
        }
        if (mascotaChanged) {
          onActualizarMascotaFoto(newMascotaFotoUrl ?? null);
          setMascotaPreviewUrl(newMascotaFotoUrl ?? null);
        }
      }

      setFotoFile(null);
      setMascotaFotoFile(null);
      setUploadError(null);
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
      const urlToDelete = refugiado?.foto_url;
      if (urlToDelete && refugiado) {
        await deleteStorageFile(urlToDelete);
      }

      if (refugiado) {
        await actualizarFotoRefugiado(refugiado.id, { foto_url: null });
      }

      onActualizarFoto(null);
      setPreviewUrl(null);
      setFotoFile(null);
      setUploadError(null);
    } catch (err) {
      console.error('Error eliminando foto:', err);
      setUploadError('No se pudo eliminar la foto. Intente de nuevo.');
    }
  };

  const handleEliminarMascota = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar la foto de la mascota?')) return;

    try {
      const urlToDelete = refugiado?.mascota_foto_url;
      if (urlToDelete && refugiado) {
        await deleteStorageFile(urlToDelete);
      }

      if (refugiado) {
        await actualizarFotoRefugiado(refugiado.id, { mascota_foto_url: null });
      }

      onActualizarMascotaFoto(null);
      setMascotaPreviewUrl(null);
      setMascotaFotoFile(null);
      setUploadError(null);
    } catch (err) {
      console.error('Error eliminando foto de mascota:', err);
      setUploadError('No se pudo eliminar la foto de la mascota. Intente de nuevo.');
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setMascotaPreviewUrl(null);
    setFotoFile(null);
    setMascotaFotoFile(null);
    setUploadError(null);
    onClose();
  };

  const familia = refugiado.familia_id
    ? familias.find(f => f.id === refugiado.familia_id)
    : null;

  const jerarquiaLabel = refugiado.es_jefe_familia
    ? 'Jefe de Familia'
    : `Miembro (${familia?.nombre || 'Familia Desconocida'})`;

  const atencionesFiltradas = atenciones.filter(a => {
    if (a.tipo === 'beneficio' || a.tipo === 'donacion') return true;
    if (a.tipo === 'medica' && a.especialidad_1) return true;
    return false;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Hidden file inputs for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelectFoto}
        />
        <input
          ref={mascotaFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelectMascotaFoto}
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
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6 min-h-[600px]">

          {pagina === 2 ? (
            /* ── Página 2: Atenciones, Beneficios y Donaciones ── */
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Activity size={18} className="text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Atenciones, Beneficios y Donaciones</h3>
                </div>
                <div className="p-6">
                  {loadingRegistros ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                      <Loader2 size={32} className="animate-spin" />
                    </div>
                  ) : atencionesFiltradas.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Activity size={40} className="mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No hay registros de atenciones, beneficios o donaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {atencionesFiltradas.map((a) => (
                        <div key={a.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {a.tipo === 'medica' && <Activity size={16} className="text-caracas-red" />}
                              {a.tipo === 'beneficio' && <Gift size={16} className="text-green-600" />}
                              {a.tipo === 'donacion' && <HeartHandshake size={16} className="text-purple-600" />}
                              <span className="font-semibold text-sm text-gray-700 uppercase">
                                {a.tipo === 'medica' ? 'Atención Médica' : a.tipo === 'beneficio' ? 'Beneficio' : 'Donación'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {a.fecha_atencion instanceof Date ? toDisplayDate(a.fecha_atencion) : ''}
                            </span>
                          </div>
                          {a.tipo === 'medica' && (
                            <div className="space-y-1 text-sm text-gray-600">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map(i => {
                                const esp = (a as any)[`especialidad_${i}`];
                                const diag = (a as any)[`diagnostico_${i}`];
                                const trat = (a as any)[`tratamiento_${i}`];
                                const resp = (a as any)[`responsable_${i}`];
                                if (!esp) return null;
                                return (
                                  <div key={i} className="pl-6 border-l-2 border-caracas-red/30 ml-1 py-1">
                                    <p><span className="font-medium">Especialidad:</span> {esp}</p>
                                    {diag && <p><span className="font-medium">Diagnóstico:</span> {diag}</p>}
                                    {resp && <p><span className="font-medium">Responsable:</span> {resp}</p>}
                                    {trat && <p><span className="font-medium">Tratamiento:</span> {trat}</p>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {(a.tipo === 'beneficio' || a.tipo === 'donacion') && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                              {(() => {
                                const rows: any[] = [];
                                for (let i = 1; i <= 10; i++) {
                                  const prefix = a.tipo === 'beneficio' ? 'beneficio' : 'donacion';
                                  const tipo = (a as any)[`${prefix}_tipo_${i}`];
                                  const desc = (a as any)[`${prefix}_descripcion_${i}`];
                                  const entregado = (a as any)[`${prefix}_entregado_por_${i}`];
                                  if (!tipo) continue;
                                  rows.push(
                                    <div key={i} className={i === 1 ? '' : 'col-span-3 border-t border-gray-100 pt-2 mt-2'}>
                                      {i === 1 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          <div><span className="font-medium">Tipo:</span> {tipo}</div>
                                          {desc && <div className="md:col-span-1"><span className="font-medium">Descripción:</span> {desc}</div>}
                                          {entregado && <div><span className="font-medium">Entregado por:</span> {entregado}</div>}
                                        </div>
                                      ) : (
                                        <>
                                          <p className="font-medium">Ítem #{i}: {tipo}</p>
                                          {desc && <p>{desc}</p>}
                                          {entregado && <p className="text-gray-500">Entregado por: {entregado}</p>}
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                                return rows;
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Página 1: Datos del Integrante ── */
            <div className="space-y-6">
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
                        className="w-28 h-32 object-contain rounded-xl border-2 border-gray-200 bg-gray-100"
                      />
                    </div>
                  ) : esMaster ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-caracas-red hover:text-caracas-red hover:bg-red-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  ) : (
                    <div className="w-28 h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] text-gray-300 text-center leading-tight">Sin foto</span>
                    </div>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1 text-center leading-tight">{uploadError}</p>
                  )}
                  {fotoFile && (
                    <p className="text-xs text-amber-600 mt-1 text-center leading-tight font-medium">Debe guardar para mantener los cambios</p>
                  )}
                  {esMaster && canDelete && (
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
                  <FichaField label="Cédula" value={formatCedula(refugiado.cedula) ?? 'S/N'} />
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
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      {mascotaPreviewUrl ? (
                        <div className="relative">
                          <img
                            src={mascotaPreviewUrl}
                            alt="Foto de la mascota"
                            className="w-24 h-[100px] object-contain rounded-xl border-2 border-gray-200 bg-gray-100"
                          />
                        </div>
                      ) : (
                        esMaster ? (
                          <button
                            onClick={() => mascotaFileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-24 h-[100px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-caracas-red hover:text-caracas-red hover:bg-red-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 size={20} className="animate-spin" />
                                <span className="text-[8px] font-medium text-center leading-tight">Subiendo...</span>
                              </>
                            ) : (
                              <>
                                <Camera size={20} />
                                <span className="text-[9px] font-medium text-center leading-tight">Foto<br />Mascota</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="w-24 h-[100px] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                            <span className="text-[9px] text-gray-300 text-center leading-tight">Sin foto</span>
                          </div>
                        )
                      )}
                      {mascotaFotoFile && (
                        <p className="text-xs text-amber-600 mt-1 text-center leading-tight font-medium">Debe guardar</p>
                      )}
                      {esMaster && canDeleteMascota && (
                        <button
                          onClick={handleEliminarMascota}
                          disabled={isUploading}
                          className="w-24 mt-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          )}

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setPagina(1)}
                disabled={pagina === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pagina === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm'
                }`}
              >
                <ChevronLeft size={16} />
                Información del Integrante
              </button>
              <button
                onClick={() => setPagina(2)}
                disabled={pagina === 2}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pagina === 2
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm'
                }`}
              >
                Atenciones y Registros
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {esMaster && pagina === 1 && (
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
              )}
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
    const MAX = 300;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > MAX || h > MAX) {
      const ratio = Math.min(MAX / w, MAX / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
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

