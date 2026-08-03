import { useState, useMemo, useEffect } from 'react';
import { FileText, Presentation, ShieldOff, Loader2, FileDown } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { formatAgeParts } from '../lib/formatAge';
import { formatCedula } from '../lib/formatCedula';
import { obtenerHistoriasClinicas } from '../lib/salud';
import { countElements } from '../components/constructor/CroquisViewer2';
import type { HistoriaClinica } from '../types';

export default function Reportes() {
  const { campamentoSeleccionado, refugiados = [], familias = [] } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoKidsError, setLogoKidsError] = useState(false);
  const [historias, setHistorias] = useState<HistoriaClinica[]>([]);
  const [historiaDiscapacidadMap, setHistoriaDiscapacidadMap] = useState<Record<string, string>>({});

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Reportes', campamentoSeleccionado.id, 'Ver')
    : true;

  const puedeExportarIntegrantes = campamentoSeleccionado
    ? tienePermisoPorCampamento('Reportes', campamentoSeleccionado.id, 'Exportar')
    : false;

  const fecha = useMemo(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }, []);

  // Clasificación de procedencias (La Guaira vs Caracas)
  const getProcedenciaEstado = (procedencia: string): 'LA GUAIRA' | 'CARACAS' => {
    const clean = (procedencia || '').toUpperCase().trim();
    const keywordsLaGuaira = [
      'LA GUAIRA', 'GUAIRA', 'VARGAS', 'MAIQUETIA', 'MAIQUETÍA', 'MACUTO',
      'CARABALLEDA', 'NAIGUATA', 'NAIGUATÁ', 'CATIA LA MAR', 'CARAYACA', 'CHUSPA', 'CARUAO'
    ];
    if (keywordsLaGuaira.some(kw => clean.includes(kw))) {
      return 'LA GUAIRA';
    }
    return 'CARACAS';
  };

  // Filtrar datos para el campamento seleccionado
  const refugiadosDelCampamento = useMemo(() => {
    if (!campamentoSeleccionado) return [];
    return refugiados.filter(r => r.campamento_id === campamentoSeleccionado.id);
  }, [refugiados, campamentoSeleccionado]);

  useEffect(() => {
    const discapacitados = refugiadosDelCampamento.filter(r => r.discapacidad);
    if (discapacitados.length === 0) {
      setHistoriaDiscapacidadMap({});
      return;
    }
    const ids = discapacitados.map(r => r.id);
    supabase
      .from('historias_clinicas')
      .select('refugiado_id, tipo_discapacidad')
      .in('refugiado_id', ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((h: any) => {
          if (h.tipo_discapacidad) map[h.refugiado_id] = h.tipo_discapacidad;
        });
        setHistoriaDiscapacidadMap(map);
      });
  }, [refugiadosDelCampamento]);

  const familiasDelCampamento = useMemo(() => {
    if (!campamentoSeleccionado) return [];
    return familias.filter(f => f.campamento_id === campamentoSeleccionado.id);
  }, [familias, campamentoSeleccionado]);

  // Cálculos demográficos
  const datosReporte = useMemo(() => {
    const hoy = new Date();

    let totalRefugiados = refugiadosDelCampamento.length;
    let masculinos = 0;
    let femeninos = 0;

    let adultos = 0;
    let adultosMayores = 0;
    let ninasNinos = 0;
    let adolescentes = 0;
    let embarazadas = 0;
    let discapacitados = 0;

    // Brackets NNA
    let nna_0_2 = 0;
    let nna_3_6 = 0;
    let nna_7_12 = 0;
    let nna_adolescentes = 0;
    let nna_embarazadas = 0;
    let nna_discapacidad = 0;
    let nna_femenina = 0;
    let nna_masculino = 0;

    refugiadosDelCampamento.forEach(r => {
      if (r.genero) masculinos++;
      else femeninos++;

      // Calcular edad
      const nacimiento = new Date(r.fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }

      if (edad <= 12) {
        ninasNinos++;
      } else if (edad >= 13 && edad <= 17) {
        adolescentes++;
      } else {
        const esAdultoMayor = (r.genero && edad >= 60) || (!r.genero && edad >= 55);
        if (esAdultoMayor) {
          adultosMayores++;
        } else {
          adultos++;
        }
      }

      if (r.discapacidad) {
        discapacitados++;
      }
      if (!r.genero && r.embarazo) {
        embarazadas++;
      }

      // Demografía NNA (menores de 18 años)
      if (edad <= 17) {
        if (r.genero) nna_masculino++;
        else nna_femenina++;

        if (edad <= 2) nna_0_2++;
        else if (edad <= 6) nna_3_6++;
        else if (edad <= 12) nna_7_12++;
        else if (edad <= 17) nna_adolescentes++;

        if (!r.genero && r.embarazo) {
          nna_embarazadas++;
        }
        if (r.discapacidad) {
          nna_discapacidad++;
        }
      }
    });

    // Contar familias por procedencia (basándonos en la procedencia del jefe de familia o el primer miembro)
    let familiasLaGuaira = 0;
    let familiasCaracas = 0;

    familiasDelCampamento.forEach(fam => {
      const miembros = refugiadosDelCampamento.filter(r => r.familia_id === fam.id);
      if (miembros.length > 0) {
        const jefe = miembros.find(m => m.es_jefe_familia) || miembros[0];
        const procedencia = jefe?.procedencia || '';
        if (getProcedenciaEstado(procedencia) === 'LA GUAIRA') {
          familiasLaGuaira++;
        } else {
          familiasCaracas++;
        }
      } else {
        familiasCaracas++; // default
      }
    });

    const totalFamilias = familiasLaGuaira + familiasCaracas;

    return {
      totalRefugiados,
      masculinos,
      femeninos,
      adultos,
      adultosMayores,
      ninasNinos,
      adolescentes,
      embarazadas,
      discapacitados,
      familiasLaGuaira,
      familiasCaracas,
      totalFamilias,
      nna_0_2,
      nna_3_6,
      nna_7_12,
      nna_adolescentes,
      nna_embarazadas,
      nna_discapacidad,
      nna_femenina,
      nna_masculino,
      totalNNA: nna_femenina + nna_masculino
    };
  }, [refugiadosDelCampamento, familiasDelCampamento]);

  // ── Datos para Reporte de Discapacitados ─────────────────────────────────
  const discapacitadosReporte = useMemo(() => {
    const hoy = new Date();
    return refugiadosDelCampamento
      .filter(r => r.discapacidad)
      .map(r => {
        const nacimiento = new Date(r.fecha_nacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
          edad--;
        }
        return {
          ...r,
          edad,
          tipo_discapacidad: historiaDiscapacidadMap[r.id] || 'No tiene historia abierta',
        };
      })
      .sort((a, b) => {
        const ca = parseInt(a.nro_cama || '9999');
        const cb = parseInt(b.nro_cama || '9999');
        return ca - cb;
      });
  }, [refugiadosDelCampamento, historiaDiscapacidadMap]);

  // ── Agrupación de discapacidades para gráfico de tortas ────────────────────
  const discapacidadGrupos = useMemo(() => {
    const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];
    const map = new Map<string, number>();
    discapacitadosReporte.forEach(r => {
      const tipo = r.tipo_discapacidad;
      map.set(tipo, (map.get(tipo) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, count], idx) => ({ nombre, count, color: COLORS[idx % COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [discapacitadosReporte]);

  // ── Datos para Reporte de Mascotas ───────────────────────────────────────
  const mascotasReporte = useMemo(() => {
    return refugiadosDelCampamento
      .filter(r => r.mascotas && r.tipo_mascota)
      .map((r, i) => {
        return {
          ...r,
          index: i + 1,
          dueno: `${r.nombres} ${r.apellidos}`,
        };
      })
      .sort((a, b) => {
        const tipoComp = (a.tipo_mascota || '').localeCompare(b.tipo_mascota || '');
        if (tipoComp !== 0) return tipoComp;
        return (a.mascota_nombre || '').localeCompare(b.mascota_nombre || '');
      });
  }, [refugiadosDelCampamento]);

  const mascotasGrupos = useMemo(() => {
    const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];
    const map = new Map<string, number>();
    mascotasReporte.forEach(r => {
      const tipo = r.tipo_mascota || 'Sin tipo';
      map.set(tipo, (map.get(tipo) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, count], idx) => ({ nombre, count, color: COLORS[idx % COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [mascotasReporte]);

  const mascotasRazasPorTipo = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    mascotasReporte.forEach(r => {
      const tipo = r.tipo_mascota || 'Sin tipo';
      const raza = r.mascota_raza?.trim() || 'Sin raza';
      if (!map.has(tipo)) map.set(tipo, new Map());
      const razaMap = map.get(tipo)!;
      razaMap.set(raza, (razaMap.get(raza) || 0) + 1);
    });
    return map;
  }, [mascotasReporte]);

  // ── Datos para Reporte de Tenencia de Vivienda ────────────────────────────────
  const jefesVivienda = useMemo(() => {
    return refugiadosDelCampamento
      .filter(r => r.es_jefe_familia === true)
      .sort((a, b) => a.codigo?.localeCompare(b.codigo || ''));
  }, [refugiadosDelCampamento]);

  const tenenciaGrupos = useMemo(() => {
    const map = new Map<string, number>();
    jefesVivienda.forEach(j => {
      const t = j.tenencia_vivienda?.trim() || 'Sin especificar';
      map.set(t, (map.get(t) || 0) + 1);
    });
    const categorias = ['Propia', 'Alquilada', 'Compartida/Familiar', 'Pensión', 'Sin especificar'];
    return categorias
      .map(nombre => ({ nombre, cantidad: map.get(nombre) || 0 }))
      .filter(c => c.cantidad > 0);
  }, [jefesVivienda]);

  const TENENCIA_COLORES: Record<string, string> = {
    'Propia': '#007229',
    'Alquilada': '#0033A0',
    'Compartida/Familiar': '#FFD100',
    'Pensión': '#bc2f4a',
    'Sin especificar': '#9CA3AF',
  };

  // ── Datos para Reporte de Situación de Estatus ─────────────────────────────────
  const estatusReporte = useMemo(() => {
    return refugiadosDelCampamento
      .filter(r => {
        const estatus = ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
        return estatus === 'HOGAR SOLIDARIO' || estatus === 'RETIRADO';
      })
      .map(r => {
        let jerarquia = 'Jefe de Familia';
        if (!r.es_jefe_familia && r.familia_id) {
          const familia = familiasDelCampamento.find(f => f.id === r.familia_id);
          jerarquia = `Miembro (${familia?.nombre || 'Desconocida'})`;
        }
        return { ...r, jerarquia };
      })
      .sort((a, b) => a.codigo?.localeCompare(b.codigo || ''));
  }, [refugiadosDelCampamento, familiasDelCampamento]);

  const estatusGrupos = useMemo(() => {
    const map = new Map<string, number>();
    refugiadosDelCampamento.forEach(r => {
      const s = ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
      map.set(s, (map.get(s) || 0) + 1);
    });
    const categorias = ['PRESENTE', 'HOGAR SOLIDARIO', 'RETIRADO'];
    return categorias
      .map(nombre => ({ nombre, cantidad: map.get(nombre) || 0 }))
      .filter(c => c.cantidad > 0);
  }, [refugiadosDelCampamento]);

  const ESTATUS_COLORES: Record<string, string> = {
    'PRESENTE': '#10B981',
    'HOGAR SOLIDARIO': '#F59E0B',
    'RETIRADO': '#EF4444',
  };

  // ── Historias Clínicas ──────────────────────────────────────────────────────
  useEffect(() => {
    if (campamentoSeleccionado) {
      obtenerHistoriasClinicas(campamentoSeleccionado.id).then(setHistorias);
    }
  }, [campamentoSeleccionado]);

  const historiasClinicasReporte = useMemo(() => {
    const hcRefugiadoIds = new Set(historias.map(h => h.refugiado_id));
    return refugiadosDelCampamento.map(r => {
      const ageParts = formatAgeParts(r.fecha_nacimiento);
      let jerarquiaStr = 'Jefe de Familia';
      if (!r.es_jefe_familia && r.familia_id) {
        const familia = familiasDelCampamento.find(f => f.id === r.familia_id);
        jerarquiaStr = `Miembro (${familia?.nombre || 'Desconocida'})`;
      }
      return {
        ...r,
        edadValor: ageParts?.valor ?? '',
        edadUnidad: ageParts?.unidad ?? '',
        jerarquia: jerarquiaStr,
        tieneHC: hcRefugiadoIds.has(r.id),
      };
    }).sort((a, b) => {
      const ca = parseInt(a.nro_cama || '9999');
      const cb = parseInt(b.nro_cama || '9999');
      return ca - cb;
    });
  }, [refugiadosDelCampamento, familiasDelCampamento, historias]);





  // Fallback para la ilustración de niños
  const KidsIllustrationFallback = () => (
    <svg width="240" height="200" viewBox="0 0 240 200" className="mx-auto mt-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="200" rx="20" fill="#F0FDFA" />
      {/* Ilustración básica geométrica de niños jugando */}
      <circle cx="80" cy="110" r="22" fill="#93C5FD" />
      <path d="M 55,165 C 55,140 70,135 80,135 C 90,135 105,140 105,165 Z" fill="#2563EB" />

      <circle cx="160" cy="100" r="20" fill="#FBCFE8" />
      <path d="M 138,165 C 138,142 150,122 160,122 C 170,122 182,142 182,165 Z" fill="#DB2777" />

      <circle cx="120" cy="120" r="16" fill="#FDE047" />
      <path d="M 102,165 C 102,148 112,138 120,138 C 128,138 138,148 138,165 Z" fill="#CA8A04" />

      {/* Sol y nubes decorativos */}
      <circle cx="210" cy="40" r="12" fill="#FEF08A" />
      <path d="M 30,55 C 30,48 42,42 55,48 C 65,40 85,46 85,55 Z" fill="#E2E8F0" />
    </svg>
  );

  // Lógica para exportar PDF
  const handleExportPDF = async (reportId: string, filename: string) => {
    setIsGenerating(true);
    try {
      const container = document.getElementById(reportId);
      if (!container) return;

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pages = container.querySelectorAll('.report-page');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      }
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Lógica para exportar PowerPoint
  const handleExportPPTX = async (reportId: string, filename: string) => {
    setIsGenerating(true);
    try {
      const container = document.getElementById(reportId);
      if (!container) return;

      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_4x3'; // Coincide con nuestro aspect ratio 1120x790 (aprox 4:3)
      const pages = container.querySelectorAll('.report-page');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const slide = pptx.addSlide();
        slide.addImage({ data: imgData, x: 0, y: 0, w: 10, h: 7.5 });
      }
      pptx.writeFile({ fileName: `${filename}.pptx` });
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el PowerPoint.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Exportar XLSX de Historias Clínicas ─────────────────────────────────────
  const handleExportHistoriasClinicasXLSX = async () => {
    setIsGenerating(true);
    try {
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

      const data = historiasClinicasReporte.map(r => ({
        'Código': r.codigo || '-',
        'Nombre y Apellido': `${r.nombres} ${r.apellidos}`,
        'Edad (Valor)': r.edadValor,
        'Edad (Unidad)': r.edadUnidad,
        'Nro Cama': r.nro_cama || '-',
        'Jerarquía': r.jerarquia,
        'Historia Clínica': r.tieneHC ? 'Sí' : 'No',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const colWidths = [
        { wch: 12 },
        { wch: 35 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 30 },
        { wch: 18 },
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historias Clinicas');
      XLSX.writeFile(wb, `historias-clinicas-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`);
    } catch (err) {
      console.error('Error generando XLSX de historias clínicas:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Exportar XLSX de Integrantes ──────────────────────────────────────────
  const handleExportRefugiadosXLSX = async () => {
    setIsGenerating(true);
    try {
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

      const data = refugiadosDelCampamento.map(r => ({
        codigo: r.codigo,
        familia_id: r.familia_id || null,
        nombres: r.nombres,
        apellidos: r.apellidos,
        cedula: r.cedula || null,
        genero: r.genero,
        fecha_nacimiento: r.fecha_nacimiento instanceof Date ? r.fecha_nacimiento.toISOString().split('T')[0] : r.fecha_nacimiento,
        es_jefe_familia: r.es_jefe_familia,
        nro_cama: r.nro_cama || null,
        procedencia: r.procedencia || null,
        fecha_ingreso: r.fecha_ingreso instanceof Date ? r.fecha_ingreso.toISOString().split('T')[0] : (r.fecha_ingreso || null),
        direccion_exacta: r.direccion_exacta || null,
        discapacidad: r.discapacidad,
        embarazo: r.embarazo,
        tiempo_embarazo: r.tiempo_embarazo || null,
        mascotas: r.mascotas,
        tipo_mascota: r.tipo_mascota || null,
        mascota_sexo: r.mascota_sexo ?? null,
        mascota_raza: r.mascota_raza || null,
        mascota_nombre: r.mascota_nombre || null,
        mascota_edad: r.mascota_edad || null,
        telefono: r.telefono || null,
        profesion: r.profesion || null,
        talla_camisa: r.talla_camisa || null,
        talla_pantalon: r.talla_pantalon || null,
        talla_zapatos: r.talla_zapatos || null,
        alergias: r.alergias,
        enfermedad_cronica: r.enfermedad_cronica,
        lesion_sismo: r.lesion_sismo,
        adulto_mayor_dependencia: r.adulto_mayor_dependencia,
        lactante: r.lactante ?? null,
        nivel_educativo: r.nivel_educativo || null,
        condicion_vivienda: r.condicion_vivienda || null,
        tenencia_vivienda: r.tenencia_vivienda || null,
        ingreso_familiar: r.ingreso_familiar || null,
        observaciones: r.observaciones || null,
        observaciones_generales: r.observaciones_generales || null,
        parentesco: r.parentesco || null,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Integrantes');
      XLSX.writeFile(wb, `integrantes-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`);
    } catch (err) {
      console.error('Error generando XLSX de integrantes:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Resolver el módulo al que pertenece una cama ───────────────────────────
  // La numeración de camas es secuencial por módulo: cada módulo consume
  // countElements(croquis_data, tipo_contabilizacion) números, acumulando offset.
  const moduloDeCama = (nroCama?: string): string => {
    if (!nroCama || !campamentoSeleccionado) return '';
    const num = parseInt(nroCama, 10);
    if (isNaN(num)) return '';
    const modo = campamentoSeleccionado.tipo_contabilizacion || 'elemento';
    let offset = 0;
    for (const mod of campamentoSeleccionado.modulos || []) {
      const total = countElements(mod.croquis_data || '', modo);
      if (total <= 0) continue;
      const min = offset + 1;
      const max = offset + total;
      if (num >= min && num <= max) return mod.nombre;
      offset += total;
    }
    return '';
  };

  // ── Exportar XLSX Data Única de Campamento ─────────────────────────────────
  const buildDataUnicaXLSX = async ({ incluirUbicacion }: { incluirUbicacion: boolean }) => {
    setIsGenerating(true);
    try {
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

      // 1. Cargar historias clínicas para la columna OBSERVACIÓN
      const historias = await obtenerHistoriasClinicas(campamentoSeleccionado!.id);
      const hcMap: Record<string, string> = {};
      historias.forEach(h => {
        const parts: string[] = [];
        if (h.tipo_discapacidad) parts.push(`Discapacidad: ${h.tipo_discapacidad}`);
        for (let i = 1; i <= 10; i++) {
          const val = (h as unknown as Record<string, unknown>)[`enf_cronica_${i}`] as string | undefined;
          if (val) parts.push(`Enf. Crónica ${i}: ${val}`);
        }
        if (parts.length > 0) hcMap[h.refugiado_id] = parts.join(' | ');
      });

      // 2. Construir filas agrupadas por familia
      type PadronRow = {
        nucleoNum: number | null;
        nucleoMiembros: number | null;
        esJefe: boolean;
        nombresApellidos: string;
        cedula: string;
        fechaNacimiento: string;
        sexo: string;
        edad: string;
        parentesco: string;
        telefono: string;
        procedenciaCaracas: string;
        procedenciaLaGuaira: string;
        observacion: string;
        cama?: string;
        modulo?: string;
        separador?: boolean;
      };

      const rows: PadronRow[] = [];
      let nucleoNum = 0;
      let totalFamiliasCaracas = 0;
      let totalFamiliasLaGuaira = 0;
      let totalPersonasCaracas = 0;
      let totalPersonasLaGuaira = 0;

      const familiasSorted = [...familiasDelCampamento].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );

      familiasSorted.forEach(fam => {
        const miembros = refugiadosDelCampamento
          .filter(r => r.familia_id === fam.id)
          .sort((a, b) => (a.es_jefe_familia ? -1 : b.es_jefe_familia ? 1 : 0));
        if (miembros.length === 0) return;
        nucleoNum++;
        const cantMiembros = miembros.length;

        // Procedencia de la familia basada en el jefe (o primer miembro)
        const jefe = miembros.find(m => m.es_jefe_familia) || miembros[0];
        const famProc = getProcedenciaEstado(jefe.procedencia || '');
        if (famProc === 'CARACAS') { totalFamiliasCaracas++; totalPersonasCaracas += cantMiembros; }
        else { totalFamiliasLaGuaira++; totalPersonasLaGuaira += cantMiembros; }

        miembros.forEach((r, idx) => {
          const ageParts = formatAgeParts(r.fecha_nacimiento);
          const edad = ageParts ? `${ageParts.valor} ${ageParts.unidad}` : '';
          const fnDate = r.fecha_nacimiento instanceof Date ? r.fecha_nacimiento : new Date(r.fecha_nacimiento);
          const proc = getProcedenciaEstado(r.procedencia || '');
          const obs: string[] = [];
          if (r.embarazo) obs.push(r.tiempo_embarazo ? `Embarazada (${r.tiempo_embarazo} sem.)` : 'Embarazada');
          const hcObs = hcMap[r.id];
          if (hcObs) obs.push(hcObs);
          rows.push({
            nucleoNum: idx === 0 ? nucleoNum : null,
            nucleoMiembros: idx === 0 ? cantMiembros : null,
            esJefe: r.es_jefe_familia,
            nombresApellidos: `${r.nombres} ${r.apellidos}`,
            cedula: formatCedula(r.cedula, r.nacionalidad) ?? 'S/N',
            fechaNacimiento: `${String(fnDate.getDate()).padStart(2, '0')}/${String(fnDate.getMonth() + 1).padStart(2, '0')}/${fnDate.getFullYear()}`,
            sexo: r.genero ? 'M' : 'F',
            edad,
            parentesco: r.parentesco || '',
            telefono: r.telefono || '',
            procedenciaCaracas: proc === 'CARACAS' ? 'X' : '',
            procedenciaLaGuaira: proc === 'LA GUAIRA' ? 'X' : '',
            observacion: obs.join(' | '),
            cama: incluirUbicacion ? (r.nro_cama || '') : undefined,
            modulo: incluirUbicacion ? moduloDeCama(r.nro_cama) : undefined,
          });
        });
        rows.push({ separador: true } as any);
      });

      // Integrantes sin familia al final
      const sinFamilia = refugiadosDelCampamento
        .filter(r => !r.familia_id)
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true }));
      sinFamilia.forEach(r => {
        nucleoNum++;
        const ageParts = formatAgeParts(r.fecha_nacimiento);
        const edad = ageParts ? `${ageParts.valor} ${ageParts.unidad}` : '';
        const fnDate = r.fecha_nacimiento instanceof Date ? r.fecha_nacimiento : new Date(r.fecha_nacimiento);
        const proc = getProcedenciaEstado(r.procedencia || '');
        if (proc === 'CARACAS') { totalFamiliasCaracas++; totalPersonasCaracas++; }
        else { totalFamiliasLaGuaira++; totalPersonasLaGuaira++; }
        const obs: string[] = [];
        if (r.embarazo) obs.push(r.tiempo_embarazo ? `Embarazada (${r.tiempo_embarazo} sem.)` : 'Embarazada');
        const hcObs = hcMap[r.id];
        if (hcObs) obs.push(hcObs);
        rows.push({
          nucleoNum,
          nucleoMiembros: 1,
          esJefe: true,
          nombresApellidos: `${r.nombres} ${r.apellidos}`,
          cedula: formatCedula(r.cedula) ?? 'S/N',
          fechaNacimiento: `${String(fnDate.getDate()).padStart(2, '0')}/${String(fnDate.getMonth() + 1).padStart(2, '0')}/${fnDate.getFullYear()}`,
          sexo: r.genero ? 'M' : 'F',
          edad,
          parentesco: r.parentesco || '',
          telefono: r.telefono?.toString() || '',
          procedenciaCaracas: proc === 'CARACAS' ? 'X' : '',
          procedenciaLaGuaira: proc === 'LA GUAIRA' ? 'X' : '',
          observacion: obs.join(' | '),
          cama: incluirUbicacion ? (r.nro_cama || '') : undefined,
          modulo: incluirUbicacion ? moduloDeCama(r.nro_cama) : undefined,
        });
        rows.push({ separador: true } as any);
      });

      // 3. Construir hoja con XLSXStyle celda a celda
      const wb = XLSXStyle.utils.book_new();
      const ws: Record<string, any> = {};
      const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

      const borderThin = {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } },
      };

      const setCell = (r: number, c: number, v: any, s?: any) => {
        const addr = XLSXStyle.utils.encode_cell({ r, c });
        ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's', s };
      };

      // Índices de columna según la variante (con o sin ubicación)
      const C = incluirUbicacion
        ? {
            num: 0, nucleo: 1, nombre: 2, cedula: 3, fecha: 4, sexo: 5, edad: 6,
            cama: 7, modulo: 8, parentesco: 9, telefono: 10, caracas: 11, guaira: 12, obs: 13,
          }
        : {
            num: 0, nucleo: 1, nombre: 2, cedula: 3, fecha: 4, sexo: 5, edad: 6,
            cama: -1, modulo: -1, parentesco: 7, telefono: 8, caracas: 9, guaira: 10, obs: 11,
          };

      // ─── FILAS DE ENCABEZADO SUPERIOR (0-3) ───
      setCell(0, 4, 'NOMBRE DEL CAMPAMENTO:', { font: { bold: true } });
      setCell(0, 5, nombreCamp, {});
      setCell(1, 4, 'RESPONSABLE INSTITUCIONAL:', { font: { bold: true } });
      setCell(1, 5, '', {});
      setCell(2, 4, 'PARROQUIA:', { font: { bold: true } });
      setCell(2, 5, '', {});
      setCell(3, 4, 'COMUNA:', { font: { bold: true } });
      setCell(3, 5, '', {});

      // ─── FILAS DE ENCABEZADO DE TABLA (5 y 6 en base-0 -> filas 6 y 7 en Excel) ───
      const headerStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'BDD7EE' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin,
      };

      // Fila 5 & 6:
      const mainHeaders: { col: number; text: string }[] = [
        { col: C.num, text: 'N°' },
        { col: C.nucleo, text: 'NUCLEO\nFAMILIAR' },
        { col: C.nombre, text: 'NOMBRES Y APELLIDOS' },
        { col: C.cedula, text: 'CÉDULA' },
        { col: C.fecha, text: 'FECHA\nNACIMIENTO' },
        { col: C.sexo, text: 'SEXO' },
        { col: C.edad, text: 'EDAD' },
      ];
      if (incluirUbicacion) {
        mainHeaders.push(
          { col: C.cama, text: 'CAMA' },
          { col: C.modulo, text: 'MÓDULO' },
        );
      }
      mainHeaders.push(
        { col: C.parentesco, text: 'PARENTESCO' },
        { col: C.telefono, text: 'TELÉFONO' },
        { col: C.obs, text: 'OBSERVACIÓN\n(Patología, Mujeres Embarazadas, Personas con Condición)' },
      );

      mainHeaders.forEach(({ col, text }) => {
        setCell(5, col, text, headerStyle);
        setCell(6, col, '', headerStyle);
        merges.push({ s: { r: 5, c: col }, e: { r: 6, c: col } });
      });

      // Procedencia (cols C.caracas y C.guaira):
      setCell(5, C.caracas, 'PROCEDENCIA', headerStyle);
      setCell(5, C.guaira, '', headerStyle);
      merges.push({ s: { r: 5, c: C.caracas }, e: { r: 5, c: C.guaira } });

      setCell(6, C.caracas, 'CARACAS', headerStyle);
      setCell(6, C.guaira, 'LA GUAIRA', headerStyle);

      // ─── FILAS DE DATOS (Empiezan en fila 7 base-0 = fila 8 en Excel) ───
      let dataRow = 7;
      const SALMON = 'F4B9A0';

      rows.forEach((row) => {
        if ((row as any).separador) {
          dataRow++; // Fila vacía separadora
          return;
        }

        const isJefe = row.esJefe;
        const bg = isJefe ? SALMON : 'FFFFFF';
        const cellStyle = (extra?: any) => ({
          fill: { fgColor: { rgb: bg } },
          border: borderThin,
          alignment: { wrapText: true, vertical: 'center', ...extra },
        });

        // Fusión vertical de columnas N° y NUCLEO FAMILIAR si la familia tiene más de 1 integrante
        if (row.nucleoNum !== null && row.nucleoMiembros !== null) {
          const numMiembros = row.nucleoMiembros;
          if (numMiembros > 1) {
            merges.push({ s: { r: dataRow, c: 0 }, e: { r: dataRow + numMiembros - 1, c: 0 } });
            merges.push({ s: { r: dataRow, c: 1 }, e: { r: dataRow + numMiembros - 1, c: 1 } });
          }
        }

        setCell(dataRow, C.num,      row.nucleoNum       !== null ? row.nucleoNum       : '', cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.nucleo,   row.nucleoMiembros  !== null ? row.nucleoMiembros  : '', cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.nombre,   row.nombresApellidos,  cellStyle());
        setCell(dataRow, C.cedula,   row.cedula,             cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.fecha,    row.fechaNacimiento,    cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.sexo,     row.sexo,               cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.edad,     row.edad,               cellStyle({ horizontal: 'center' }));
        if (incluirUbicacion) {
          setCell(dataRow, C.cama,   row.cama || '',         cellStyle({ horizontal: 'center' }));
          setCell(dataRow, C.modulo, row.modulo || '',       cellStyle());
        }
        setCell(dataRow, C.parentesco, row.parentesco,         cellStyle());
        setCell(dataRow, C.telefono,   row.telefono,           cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.caracas,    row.procedenciaCaracas,  cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.guaira,     row.procedenciaLaGuaira, cellStyle({ horizontal: 'center' }));
        setCell(dataRow, C.obs,        row.observacion,         cellStyle());

        dataRow++;
      });

      // ─── TABLAS DE TOTALES ───
      const totalsRow = dataRow + 1;
      const labelStyle = { font: { bold: true }, border: borderThin };
      const valStyle   = { border: borderThin, alignment: { horizontal: 'center' } };

      // Tabla izquierda (cols 0-2)
      setCell(totalsRow,     0, 'TOTAL FAMILIAS DE CARACAS',  labelStyle);
      setCell(totalsRow,     1, '', labelStyle);
      merges.push({ s: { r: totalsRow, c: 0 }, e: { r: totalsRow, c: 1 } });
      setCell(totalsRow,     2, totalFamiliasCaracas, valStyle);

      setCell(totalsRow + 1, 0, 'TOTAL PERSONAS DE CARACAS',  labelStyle);
      setCell(totalsRow + 1, 1, '', labelStyle);
      merges.push({ s: { r: totalsRow + 1, c: 0 }, e: { r: totalsRow + 1, c: 1 } });
      setCell(totalsRow + 1, 2, totalPersonasCaracas, valStyle);

      // Tabla derecha (cols 4-6)
      setCell(totalsRow,     4, 'TOTAL FAMILIAS DE LA GUAIRA',  labelStyle);
      setCell(totalsRow,     5, '', labelStyle);
      merges.push({ s: { r: totalsRow, c: 4 }, e: { r: totalsRow, c: 5 } });
      setCell(totalsRow,     6, totalFamiliasLaGuaira, valStyle);

      setCell(totalsRow + 1, 4, 'TOTAL PERSONAS DE LA GUAIRA',  labelStyle);
      setCell(totalsRow + 1, 5, '', labelStyle);
      merges.push({ s: { r: totalsRow + 1, c: 4 }, e: { r: totalsRow + 1, c: 5 } });
      setCell(totalsRow + 1, 6, totalPersonasLaGuaira, valStyle);

      // ─── Metadata de la hoja ───
      const lastRow = totalsRow + 1;
      const lastCol = C.obs;
      ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
      ws['!merges'] = merges;
      const colsBase = [
        { wch: 5 },   // A: N°
        { wch: 8 },   // B: NUCLEO FAMILIAR
        { wch: 30 },  // C: NOMBRES Y APELLIDOS
        { wch: 13 },  // D: CÉDULA
        { wch: 13 },  // E: FECHA NACIMIENTO
        { wch: 6 },   // F: SEXO
        { wch: 12 },  // G: EDAD
      ];
      const colsUbicacion = [
        { wch: 10 },  // H: CAMA
        { wch: 20 },  // I: MÓDULO
      ];
      const colsFin = [
        { wch: 16 },  // PARENTESCO
        { wch: 14 },  // TELÉFONO
        { wch: 10 },  // CARACAS
        { wch: 10 },  // LA GUAIRA
        { wch: 50 },  // OBSERVACIÓN
      ];
      ws['!cols'] = incluirUbicacion ? [...colsBase, ...colsUbicacion, ...colsFin] : [...colsBase, ...colsFin];

      XLSXStyle.utils.book_append_sheet(wb, ws, incluirUbicacion ? 'Data Única (Ubicación)' : 'Data Única');
      const filename = incluirUbicacion
        ? `data-unica-campamento-ubicacion-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`
        : `data-unica-campamento-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`;
      XLSXStyle.writeFile(wb, filename);
    } catch (err) {
      console.error('Error generando Data Única XLSX:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportDataUnicaXLSX = async () => {
    await buildDataUnicaXLSX({ incluirUbicacion: false });
  };

  const handleExportDataUnicaUbicacionXLSX = async () => {
    await buildDataUnicaXLSX({ incluirUbicacion: true });
  };

  // Gráficos dinámicos SVG para inyectar en los reportes
  const renderPieChart = () => {
    const total = datosReporte.masculinos + datosReporte.femeninos;
    if (total === 0) return null;
    const femPct = Math.round((datosReporte.femeninos / total) * 100);
    const mascPct = Math.round((datosReporte.masculinos / total) * 100);

    const radius = 80;
    const circ = 2 * Math.PI * radius;
    const femStroke = (femPct / 100) * circ;
    const mascStroke = (mascPct / 100) * circ;

    const cx = 140;
    const cy = 140;

    const femAngle = (femPct * 3.6) / 2 - 90;
    const mascAngle = femPct * 3.6 + (mascPct * 3.6) / 2 - 90;

    const radFem = (femAngle * Math.PI) / 180;
    const radMasc = (mascAngle * Math.PI) / 180;

    const labelR = 80;
    const xFem = cx + labelR * Math.cos(radFem);
    const yFem = cy + labelR * Math.sin(radFem);
    const xMasc = cx + labelR * Math.cos(radMasc);
    const yMasc = cy + labelR * Math.sin(radMasc);

    return (
      <svg width="420" height="280" viewBox="0 0 420 280" className="mx-auto">
        <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="#F97316" strokeWidth="56" strokeDasharray={`${femStroke} ${circ}`} />
        <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="#3B82F6" strokeWidth="56" strokeDasharray={`${mascStroke} ${circ}`} strokeDashoffset={-femStroke} />

        {femPct > 0 && (
          <g transform={`translate(${xFem - 20}, ${yFem - 14})`}>
            <rect width="42" height="28" rx="5" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5" />
            <text x="21" y="19" textAnchor="middle" className="text-[14px] font-black fill-slate-800">{femPct}%</text>
          </g>
        )}
        {mascPct > 0 && (
          <g transform={`translate(${xMasc - 20}, ${yMasc - 14})`}>
            <rect width="42" height="28" rx="5" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="21" y="19" textAnchor="middle" className="text-[14px] font-black fill-slate-800">{mascPct}%</text>
          </g>
        )}

        {/* Leyenda */}
        <g transform="translate(260, 105)">
          <rect width="14" height="14" rx="3" fill="#3B82F6" />
          <text x="20" y="12" className="text-[16px] font-bold fill-slate-600">MASCULINOS</text>

          <rect y="30" width="14" height="14" rx="3" fill="#F97316" />
          <text x="20" y="42" className="text-[16px] font-bold fill-slate-600">FEMENINOS</text>
        </g>
      </svg>
    );
  };

  const renderBarChart = () => {
    const categories = [
      { key: 'ADULTOS', val: datosReporte.adultos, color: '#94A3B8' },
      { key: 'ADULTOS MAYORES', val: datosReporte.adultosMayores, color: '#475569' },
      { key: 'NIÑAS Y NIÑOS', val: datosReporte.ninasNinos, color: '#FBCFE8' },
      { key: 'ADOLESCENTES', val: datosReporte.adolescentes, color: '#DBEAFE' },
      { key: 'EMBARAZADAS', val: datosReporte.embarazadas, color: '#93C5FD' },
      { key: 'DISCAPACITADOS', val: datosReporte.discapacitados, color: '#FEF08A' },
    ].reverse();

    const maxVal = Math.max(...categories.map(c => c.val)) || 1;

    return (
      <div className="w-[380px] h-[210px] flex flex-col justify-between pl-0 py-2 relative">
        {categories.map((cat, idx) => {
          const widthPct = Math.max(8, (cat.val / maxVal) * 82);
          return (
            <div key={idx} className="flex items-center w-full">
              <span className="text-[16px] font-bold text-slate-600 w-[210px] text-left pr-3 ml-[-9px]">
                {cat.key}
              </span>
              <div className="flex-1 flex items-center ml-[-30px]">
                {cat.val > 0 && (
                  <span className="text-[14px] font-black text-slate-800 w-[28px] text-right mr-2 inline-block">{cat.val}</span>
                )}
                {cat.val === 0 && (
                  <span className="text-[14px] font-black text-slate-400 w-[28px] text-right mr-2 inline-block">0</span>
                )}
                <div
                  className="h-5 rounded-md transition-all shadow-sm border border-black/5 mt-[13px]"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: cat.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este módulo</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver o emitir reportes en este campamento</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Módulo de Reportes</h2>
          <p className="text-gray-500">
            Exporta estadísticas demográficas oficiales para el <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
          </p>
        </div>
        {isGenerating && (
          <div className="flex items-center gap-2 text-caracas-red font-semibold bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
            <Loader2 className="animate-spin" size={18} />
            <span>Generando reporte...</span>
          </div>
        )}
      </div>

      {/* Grid de Tarjetas de Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Card 1: Reporte General Demográfico */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte General Demográfico</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Consolida la información general del Campamento. Incluye dos páginas: distribución de familias por procedencia y desglose completo de grupos etarios censados.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={() => handleExportPDF('reporte-demografico-render', `Reporte_Demografico_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportPPTX('reporte-demografico-render', `Reporte_Demografico_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <Presentation size={18} />
              Exportar PowerPoint
            </button>
          </div>
        </div>

        {/* Card 2: Reporte Niños, Niñas y Adolescentes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte de Niños, Niñas y Adolescentes</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Resumen enfocado a la población infantil y juvenil menor de 18 años. Clasifica por rangos de edad (0-2, 3-6, 7-12, adolescentes) y detecta alertas críticas como discapacidad e infancia gestante.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={() => handleExportPDF('reporte-nna-render', `Reporte_NNA_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportPPTX('reporte-nna-render', `Reporte_NNA_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <Presentation size={18} />
              Exportar PowerPoint
            </button>
          </div>
        </div>

        {/* Card 3: Reporte de Discapacitados */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte de Discapacitados</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Listado completo de personas con discapacidad registradas en el campamento. Incluye datos personales, ubicación de cama y tipo de discapacidad.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={() => handleExportPDF('reporte-discapacitados-render', `Reporte_Discapacitados_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportPPTX('reporte-discapacitados-render', `Reporte_Discapacitados_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <Presentation size={18} />
              Exportar PowerPoint
            </button>
          </div>
        </div>

        {/* Card 4: Reporte de Mascotas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte de Mascotas</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Listado de mascotas registradas en el campamento. Incluye tipo, raza, edad, sexo y el jefe de familia al que pertenecen.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={() => handleExportPDF('reporte-mascotas-render', `Reporte_Mascotas_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportPPTX('reporte-mascotas-render', `Reporte_Mascotas_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <Presentation size={18} />
              Exportar PowerPoint
            </button>
          </div>
        </div>

        {/* Card 5: Reporte de Historias Clínicas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte de Historias Clínicas</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Listado completo de refugiados indicando si tienen o no historia clínica abierta. Incluye código, datos personales, ubicación de cama y jerarquía familiar.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={handleExportHistoriasClinicasXLSX}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Exportar XLSX
            </button>
          </div>
        </div>

        {/* Card 6: Exportar Integrantes */}
        {puedeExportarIntegrantes && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Exportar Integrantes</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Exporta todos los registros de integrantes del campamento actual en formato Excel con las columnas de Supabase, usando el código correlativo como identificador.
              </p>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
              <button
                onClick={handleExportRefugiadosXLSX}
                disabled={!campamentoSeleccionado || isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              >
                <FileDown size={18} />
                Exportar XLSX
              </button>
            </div>
          </div>
        )}

        {/* Card 7: Reporte de Tenencia de Vivienda */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte de Tenencia de Vivienda</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Listado de jefes de familia con su tipo de tenencia de vivienda. Incluye gráfico estadístico de distribución y detalle con código, nombre, procedencia, tenencia y dirección exacta.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={() => handleExportPDF('reporte-tenencia-render', `Reporte_Tenencia_Vivienda_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportPPTX('reporte-tenencia-render', `Reporte_Tenencia_Vivienda_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <Presentation size={18} />
              Exportar PowerPoint
            </button>
          </div>
        </div>

        {/* Card 8: Reporte de Situación de Estatus */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte de Situación de Estatus</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Listado de integrantes en situación de Hogar Solidario o Retirado. Incluye gráfico estadístico de la distribución general de estatus en el campamento.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={() => handleExportPDF('reporte-estatus-render', `Reporte_Situacion_Estatus_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportPPTX('reporte-estatus-render', `Reporte_Situacion_Estatus_${campamentoSeleccionado?.nombre.replace(/\s+/g, '_')}`)}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <Presentation size={18} />
              Exportar PowerPoint
            </button>
          </div>
        </div>

        {/* Card 9: Reporte Data Única de Campamento */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Reporte Data Única de Campamento</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Exporta el padrón nominal completo de integrantes agrupados por núcleo familiar, con procedencia (Caracas / La Guaira), datos personales y observaciones de salud. Formato institucional oficial en Excel.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={handleExportDataUnicaXLSX}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Exportar XLSX
            </button>
          </div>
        </div>

        {/* Card 10: Reporte Data Única con Ubicación */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Data Única con Ubicación</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Padrón nominal completo de integrantes agrupados por núcleo familiar, con cama asignada y módulo de ubicación, además de procedencia (Caracas / La Guaira) y observaciones de salud. Formato institucional oficial en Excel.
            </p>
          </div>
          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
            <button
              onClick={handleExportDataUnicaUbicacionXLSX}
              disabled={!campamentoSeleccionado || isGenerating}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Exportar XLSX
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ÁREA DE RENDERIZADO OCULTA - MANTIENE FORMATO 1120x790 (APROX 4:3) PARA LA EXPORTACIÓN */}
      {/* ========================================================================= */}
      {campamentoSeleccionado && (
        <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden select-none bg-slate-900">

          {/* REPORTE 1: DEMOGRÁFICO GENERAL (2 PÁGINAS) */}
          <div id="reporte-demografico-render" className="flex flex-col">

            {/* PÁGINA 1 */}
            <div className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
              <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
              <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

              {/* Header */}
              <div className="text-center z-10 relative">
                <div className="flex items-center justify-center gap-4">
                  <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                    REPORTE GENERAL DEMOGRÁFICO
                  </h1>
                  <p className="text-[16px] text-slate-500">
                    Fecha: {fecha}
                  </p>
                </div>
                <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                  {campamentoSeleccionado.nombre}
                </h2>
              </div>

              {/* Subtitle */}
              <h3 className="text-center text-[13px] font-black text-slate-700 uppercase tracking-wide mt-3 z-10 relative">
                POBLACIÓN CENSADA LA GUAIRA - CARACAS
              </h3>

              {/* Content body */}
              <div className="flex-1 flex items-center px-16 z-10 relative">
                {/* Tablas izquierdas */}
                <div className="w-[450px] space-y-6">
                  {/* Tabla Familias */}
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold text-left tracking-wide">FAMILIAS LA GUAIRA</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.familiasLaGuaira).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold text-left tracking-wide">FAMILIAS CARACAS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.familiasCaracas).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 font-black">
                        <td className="p-3 text-base text-left tracking-wide">TOTAL</td>
                        <td className="p-3 text-lg text-center text-[#C21807] w-24">
                          {String(datosReporte.totalFamilias).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Tabla Genero */}
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold text-left tracking-wide">MASCULINOS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.masculinos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold text-left tracking-wide">FEMENINOS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.femeninos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 font-black">
                        <td className="p-3 text-base text-left tracking-wide">TOTAL</td>
                        <td className="p-3 text-lg text-center w-24">
                          {String(datosReporte.totalRefugiados).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico circular - absolute */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 z-[5]">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  {renderPieChart()}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
              </div>
            </div>

            {/* PÁGINA 2 */}
            <div className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
              <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
              <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

              {/* Header */}
              <div className="text-center z-10 relative">
                <div className="flex items-center justify-center gap-4">
                  <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                    REPORTE GENERAL DEMOGRÁFICO
                  </h1>
                  <p className="text-[16px] text-slate-500">
                    Fecha: {fecha}
                  </p>
                </div>
                <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                  {campamentoSeleccionado.nombre}
                </h2>
              </div>

              {/* Subtitle */}
              <h3 className="text-center text-[13px] font-black text-slate-700 uppercase tracking-wide mt-3 z-10 relative">
                DISTRIBUCIÓN DE FAMILIAS Y GÉNERO
              </h3>

              {/* Content body */}
              <div className="flex-1 flex items-center justify-between px-16 gap-8 z-10 relative">
                {/* Tabla demográfica general */}
                <div className="w-[450px]">
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold tracking-wide">ADULTOS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.adultos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold tracking-wide">ADULTOS MAYORES</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.adultosMayores).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold tracking-wide">NIÑAS Y NIÑOS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.ninasNinos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold tracking-wide">ADOLESCENTES</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.adolescentes).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold tracking-wide">EMBARAZADAS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.embarazadas).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3 text-base font-bold tracking-wide">DISCAPACITADOS</td>
                        <td className="p-3 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.discapacitados).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="p-3 text-base tracking-wide">TOTAL</td>
                        <td className="p-3 text-lg text-center w-24">
                          {String(datosReporte.totalRefugiados).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gráfico de barras */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    {renderBarChart()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
              </div>
            </div>

          </div>

          {/* REPORTE 2: NIÑOS, NIÑAS Y ADOLESCENTES (1 PÁGINA) */}
          <div id="reporte-nna-render" className="flex flex-col">

            <div className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
              <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
              <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

              {/* Header */}
              <div className="text-center z-10 relative">
                <div className="flex items-center justify-center gap-4">
                  <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                    REPORTE NIÑOS, NIÑAS Y ADOLESCENTES
                  </h1>
                  <p className="text-[16px] text-slate-500">
                    Fecha: {fecha}
                  </p>
                </div>
                <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                  {campamentoSeleccionado.nombre}
                </h2>
                <h3 className="text-center text-[13px] font-black text-slate-700 uppercase tracking-wide mt-3 z-10 relative">
                  NIÑAS, NIÑOS Y ADOLESCENTES LA GUAIRA - CARACAS
                </h3>
              </div>

              {/* Content body */}
              <div className="flex-1 flex items-center px-16 z-10 relative">
                {/* Tablas izquierdas */}
                <div className="w-[450px] space-y-6">
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <th colSpan={2} className="py-1.5 px-1 text-center text-xs font-black tracking-wider text-slate-700">
                          NIÑAS – NIÑOS Y ADOLESCENTES LA GUAIRA - CARACAS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold tracking-wide">0-2 AÑOS</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_0_2).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold tracking-wide">3-6 AÑOS</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_3_6).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold tracking-wide">7-12 AÑOS</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_7_12).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold tracking-wide">ADOLESCENTES</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_adolescentes).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold tracking-wide">ADOLESCENTE EMBARAZADA</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_embarazadas).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold tracking-wide">DISCAPACIDAD</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_discapacidad).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="py-[4.5px] px-0.5 text-base tracking-wide">TOTAL</td>
                        <td className="py-[4.5px] px-0.5 text-lg text-center w-24">
                          {String(datosReporte.totalNNA).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Tabla de desglose por sexo en niños */}
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="py-[4.5px] px-0.5 text-base font-bold text-left tracking-wide">FEMENINA</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_femenina).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="py-[4.5px] px-0.5 text-base font-bold text-left tracking-wide">MASCULINO</td>
                        <td className="py-[4.5px] px-0.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_masculino).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ilustración de Niños - absolute */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 z-[5]">
                {logoKidsError ? (
                  <KidsIllustrationFallback />
                ) : (
                  <img
                    src="/ninos.png"
                    alt="Ilustración Niños"
                    className="h-[512px] w-auto object-contain"
                    onError={() => setLogoKidsError(true)}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
              </div>
            </div>

          </div>

          {/* REPORTE 3: DISCAPACITADOS */}
          {(() => {
            const ROWS_PAGE1 = 7;
            const ROWS_OTHER = 14;
            const total = discapacitadosReporte.length;

            const firstChunk = discapacitadosReporte.slice(0, ROWS_PAGE1);
            const rest = discapacitadosReporte.slice(ROWS_PAGE1);
            const restPageCount = Math.ceil(rest.length / ROWS_OTHER);
            const totalPaginas = 1 + restPageCount;

            const pages = [
              { chunk: firstChunk, isFirst: true },
              ...Array.from({ length: restPageCount }, (_, i) => ({
                chunk: rest.slice(i * ROWS_OTHER, (i + 1) * ROWS_OTHER),
                isFirst: false
              }))
            ];

            const renderDonutChart = () => {
              const cx = 110;
              const cy = 110;
              const outerR = 70;
              const innerR = 42;
              const circ = 2 * Math.PI * outerR;
              let dashOffset = 0;

              if (discapacidadGrupos.length === 0) {
                return (
                  <svg width="210" height="230" viewBox="0 0 210 230" className="mx-auto">
                    <circle cx={cx} cy={cy} r={outerR} fill="transparent" stroke="#E2E8F0" strokeWidth={outerR - innerR} />
                    <circle cx={cx} cy={cy} r={innerR} fill="white" />
                    <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: '16px', fontWeight: 700, fill: '#9CA3AF' }}>Sin datos</text>
                  </svg>
                );
              }

              const segments = discapacidadGrupos.map(g => {
                const pct = g.count / total;
                const dashLen = pct * circ;
                const seg = { ...g, dashLen, dashOffset };
                dashOffset -= dashLen;
                return seg;
              });

              return (
                <svg width="300" height="230" viewBox="0 0 300 230" className="mx-auto">
                  {segments.map((seg, i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={outerR}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={outerR - innerR}
                      strokeDasharray={`${seg.dashLen} ${circ - seg.dashLen}`}
                      strokeDashoffset={seg.dashOffset}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  ))}
                  <circle cx={cx} cy={cy} r={innerR} fill="white" />
                  <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: '28px', fontWeight: 800, fill: '#1E293B' }}>{total}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: '#64748B' }}>TOTAL</text>
                </svg>
              );
            };

            const renderDonutLegend = () => (
              <div className="grid grid-rows-6 grid-flow-col gap-x-6 gap-y-2 max-w-[600px]">
                {discapacidadGrupos.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: g.color }} />
                    <div className="relative -top-[10px]">
                      <span className="text-[16px] font-bold text-slate-600">{g.nombre}</span>{' '}
                      <span className="text-[16px] font-black text-slate-800">{g.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            );

            return (
              <div id="reporte-discapacitados-render" className="flex flex-col">
                {pages.map(({ chunk, isFirst }, pageIdx) => {
                  const rowsPerPage = isFirst ? ROWS_PAGE1 : ROWS_OTHER;

                  return (
                    <div key={pageIdx} className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
                      <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
                      <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

                      {isFirst && (
                        <div className="text-center mt-0 z-10 relative">
                          <div className="flex items-center justify-center gap-4">
                            <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                              REPORTE PERSONAS CON DISCAPACIDAD
                            </h1>
                            <p className="text-[16px] text-slate-500">
                              Fecha: {fecha}
                            </p>
                          </div>
                          <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Reporte de Personas con Discapacidad{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{total}</span>
                            {totalPaginas > 1 ? <span className="text-xs text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span> : null}
                          </h3>
                        </div>
                      )}

                      {!isFirst && (
                        <div className="text-center z-10 relative">
                          <h2 className="text-[20px] font-black text-caracas-red uppercase tracking-wider">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Reporte de personas con discapacidad{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{total}</span>
                            {totalPaginas > 1 ? (
                              <span className="text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span>
                            ) : null}
                          </h3>
                        </div>
                      )}

                      {isFirst && (
                        <div className="flex items-center justify-center gap-0 px-8 z-10 relative">
                          <div className="shrink-0">
                            {renderDonutChart()}
                          </div>
                          <div className="ml-[-55px] mt-[15px]">
                            {renderDonutLegend()}
                          </div>
                        </div>
                      )}

                      <div className={`flex-1 px-8 z-10 relative ${!isFirst ? 'mt-[41px]' : ''}`}>
                        <table className="w-full border-collapse border border-slate-300 text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-300">
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[100px]">CÓDIGO</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300">NOMBRES Y APELLIDOS</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[130px]">CÉDULA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[50px]">EDAD</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[70px]">CAMA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 w-[220px]">TIPO DISCAPACIDAD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((r, idx) => (
                              <tr key={r.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/[.85]'}`}>
                                <td className="py-[4.5px] px-0.5 text-base font-mono text-center border-r border-slate-200">{r.codigo || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.nombres} {r.apellidos}</td>
                                <td className="py-[4.5px] px-0.5 text-base text-center border-r border-slate-200">{formatCedula(r.cedula, r.nacionalidad) ?? '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-lg font-black text-center border-r border-slate-200">{r.edad}</td>
                                <td className="py-[4.5px] px-0.5 text-base font-mono text-center border-r border-slate-200">{r.nro_cama || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base">{r.tipo_discapacidad}</td>
                              </tr>
                            ))}
                            {chunk.length < rowsPerPage && Array.from({ length: rowsPerPage - chunk.length }).map((_, i) => (
                              <tr key={`empty-${i}`} className="border-b border-slate-200 h-[34px]">
                                <td colSpan={6} className="border-r border-slate-200">&nbsp;</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                        <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                        <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                        <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* REPORTE 4: MASCOTAS */}
          {(() => {
            const ROWS_PAGE1 = 7;
            const ROWS_OTHER = 14;
            const total = mascotasReporte.length;

            const firstChunk = mascotasReporte.slice(0, ROWS_PAGE1);
            const rest = mascotasReporte.slice(ROWS_PAGE1);
            const restPageCount = Math.ceil(rest.length / ROWS_OTHER);
            const totalPaginas = 1 + restPageCount;

            const pages = [
              { chunk: firstChunk, isFirst: true },
              ...Array.from({ length: restPageCount }, (_, i) => ({
                chunk: rest.slice(i * ROWS_OTHER, (i + 1) * ROWS_OTHER),
                isFirst: false
              }))
            ];

            const renderDonutChart = () => {
              const cx = 110;
              const cy = 110;
              const outerR = 70;
              const innerR = 42;
              const circ = 2 * Math.PI * outerR;
              let dashOffset = 0;

              if (mascotasGrupos.length === 0) {
                return (
                  <svg width="210" height="230" viewBox="0 0 210 230" className="mx-auto">
                    <circle cx={cx} cy={cy} r={outerR} fill="transparent" stroke="#E2E8F0" strokeWidth={outerR - innerR} />
                    <circle cx={cx} cy={cy} r={innerR} fill="white" />
                    <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: '16px', fontWeight: 700, fill: '#9CA3AF' }}>Sin datos</text>
                  </svg>
                );
              }

              const segments = mascotasGrupos.map(g => {
                const pct = g.count / total;
                const dashLen = pct * circ;
                const seg = { ...g, dashLen, dashOffset };
                dashOffset -= dashLen;
                return seg;
              });

              return (
                <svg width="300" height="230" viewBox="0 0 300 230" className="mx-auto">
                  {segments.map((seg, i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={outerR}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={outerR - innerR}
                      strokeDasharray={`${seg.dashLen} ${circ - seg.dashLen}`}
                      strokeDashoffset={seg.dashOffset}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  ))}
                  <circle cx={cx} cy={cy} r={innerR} fill="white" />
                  <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: '28px', fontWeight: 800, fill: '#1E293B' }}>{total}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: '#64748B' }}>TOTAL</text>
                </svg>
              );
            };

            const renderDonutLegend = () => (
              <div className="grid grid-rows-6 grid-flow-col gap-x-6 gap-y-0 max-w-[600px]">
                {mascotasGrupos.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: g.color }} />
                    <div className="relative -top-[10px]">
                      <span className="text-[16px] font-bold text-slate-600">{g.nombre}</span>{' '}
                      <span className="text-[16px] font-black text-slate-800">{g.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            );

            const renderRazasDescription = () => (
              <>
                {Array.from(mascotasRazasPorTipo.entries()).length > 0 && (
                  <div className="text-[16px]">
                    {Array.from(mascotasRazasPorTipo.entries()).map(([tipo, razas]) => (
                      <div key={tipo}>
                        <span className="font-semibold text-slate-700">{tipo}:</span>{' '}
                        <span className="text-slate-500">
                          {Array.from(razas.entries())
                            .sort((a, b) => b[1] - a[1])
                            .map(([raza, count]) => `${raza} (${count})`)
                            .join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );

            return (
              <div id="reporte-mascotas-render" className="flex flex-col">
                {pages.map(({ chunk, isFirst }, pageIdx) => {
                  const rowsPerPage = isFirst ? ROWS_PAGE1 : ROWS_OTHER;

                  return (
                    <div key={pageIdx} className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
                      <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
                      <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

                      {isFirst && (
                        <div className="text-center mt-0 z-10 relative">
                          <div className="flex items-center justify-center gap-4">
                            <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                              REPORTE DE MASCOTAS
                            </h1>
                            <p className="text-[16px] text-slate-500">
                              Fecha: {fecha}
                            </p>
                          </div>
                          <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Reporte de Mascotas{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{total}</span>
                            {totalPaginas > 1 ? <span className="text-xs text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span> : null}
                          </h3>
                        </div>
                      )}

                      {!isFirst && (
                        <div className="text-center z-10 relative">
                          <h2 className="text-[20px] font-black text-caracas-red uppercase tracking-wider">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Reporte de mascotas{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{total}</span>
                            {totalPaginas > 1 ? (
                              <span className="text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span>
                            ) : null}
                          </h3>
                        </div>
                      )}

                      {isFirst && (
                        <div className="flex items-center gap-0 w-full z-10 relative">
                          <div className="shrink-0">
                            {renderDonutChart()}
                          </div>
                          <div className="w-[300px] ml-[-85px]">
                            {renderDonutLegend()}
                          </div>
                          <div className="flex-1 ml-[-70px] -mt-[75px]">
                            {renderRazasDescription()}
                          </div>
                        </div>
                      )}

                      <div className={`flex-1 px-8 z-10 relative ${isFirst ? 'mt-[-20px]' : 'mt-[41px]'}`}>
                        <table className="w-full border-collapse border border-slate-300 text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-300">
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[40px]">#</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[90px]">TIPO</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[130px]">RAZA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300">PROPIETARIO</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[120px]">MASCOTA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[40px]">SX</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 w-[40px]">ED</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((r, idx) => (
                              <tr key={r.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/[.85]'}`}>
                                <td className="py-[4.5px] px-0.5 text-base text-center border-r border-slate-200">{r.index}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.tipo_mascota || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.mascota_raza || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.dueno}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.mascota_nombre || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base text-center border-r border-slate-200">{r.mascota_sexo === true ? 'M' : r.mascota_sexo === false ? 'H' : '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-lg font-black text-center">{r.mascota_edad ?? '—'}</td>
                              </tr>
                            ))}
                            {chunk.length < rowsPerPage && Array.from({ length: rowsPerPage - chunk.length }).map((_, i) => (
                              <tr key={`empty-${i}`} className="border-b border-slate-200 h-[34px]">
                                <td colSpan={7} className="border-r border-slate-200">&nbsp;</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                        <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                        <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                        <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* REPORTE 7: TENENCIA DE VIVIENDA */}
          {(() => {
            const ROWS_PAGE1 = 5;
            const ROWS_OTHER = 9;
            const total = jefesVivienda.length;

            const firstChunk = jefesVivienda.slice(0, ROWS_PAGE1);
            const rest = jefesVivienda.slice(ROWS_PAGE1);
            const restPageCount = Math.ceil(rest.length / ROWS_OTHER);
            const totalPaginas = 1 + restPageCount;

            const pages = [
              { chunk: firstChunk, isFirst: true },
              ...Array.from({ length: restPageCount }, (_, i) => ({
                chunk: rest.slice(i * ROWS_OTHER, (i + 1) * ROWS_OTHER),
                isFirst: false
              }))
            ];

            const renderTenenciaDonutChart = () => {
              const cx = 110;
              const cy = 110;
              const outerR = 70;
              const innerR = 42;
              const circ = 2 * Math.PI * outerR;
              let dashOffset = 0;

              if (tenenciaGrupos.length === 0) {
                return (
                  <svg width="210" height="230" viewBox="0 0 210 230" className="mx-auto">
                    <circle cx={cx} cy={cy} r={outerR} fill="transparent" stroke="#E2E8F0" strokeWidth={outerR - innerR} />
                    <circle cx={cx} cy={cy} r={innerR} fill="white" />
                    <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: '16px', fontWeight: 700, fill: '#9CA3AF' }}>Sin datos</text>
                  </svg>
                );
              }

              const segments = tenenciaGrupos.map(g => {
                const pct = g.cantidad / total;
                const dashLen = pct * circ;
                const seg = { ...g, dashLen, dashOffset };
                dashOffset -= dashLen;
                return seg;
              });

              return (
                <svg width="300" height="230" viewBox="0 0 300 230" className="mx-auto">
                  {segments.map((seg, i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={outerR}
                      fill="transparent"
                      stroke={TENENCIA_COLORES[seg.nombre] || '#9CA3AF'}
                      strokeWidth={outerR - innerR}
                      strokeDasharray={`${seg.dashLen} ${circ - seg.dashLen}`}
                      strokeDashoffset={seg.dashOffset}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  ))}
                  <circle cx={cx} cy={cy} r={innerR} fill="white" />
                  <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: '28px', fontWeight: 800, fill: '#1E293B' }}>{total}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: '#64748B' }}>FAMILIAS</text>
                </svg>
              );
            };

            const renderTenenciaLegend = () => (
              <div className="grid grid-rows-6 grid-flow-col gap-x-6 gap-y-0 max-w-[600px]">
                {tenenciaGrupos.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: TENENCIA_COLORES[g.nombre] || '#9CA3AF' }} />
                    <div className="relative -top-[10px]">
                      <span className="text-[16px] font-bold text-slate-600">{g.nombre}</span>{' '}
                      <span className="text-[16px] font-black text-slate-800">{g.cantidad}</span>
                    </div>
                  </div>
                ))}
              </div>
            );

            return (
              <div id="reporte-tenencia-render" className="flex flex-col">
                {pages.map(({ chunk, isFirst }, pageIdx) => {
                  const rowsPerPage = isFirst ? ROWS_PAGE1 : ROWS_OTHER;

                  return (
                    <div key={pageIdx} className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
                      <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
                      <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

                      {isFirst && (
                        <div className="text-center mt-0 z-10 relative">
                          <div className="flex items-center justify-center gap-4">
                            <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                              REPORTE DE TENENCIA DE VIVIENDA
                            </h1>
                            <p className="text-[16px] text-slate-500">
                              Fecha: {fecha}
                            </p>
                          </div>
                          <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Reporte de Tenencia de Vivienda{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{total}</span>
                            {totalPaginas > 1 ? <span className="text-xs text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span> : null}
                          </h3>
                        </div>
                      )}

                      {!isFirst && (
                        <div className="text-center z-10 relative">
                          <h2 className="text-[20px] font-black text-caracas-red uppercase tracking-wider">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Reporte de Tenencia de Vivienda{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{total}</span>
                            {totalPaginas > 1 ? (
                              <span className="text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span>
                            ) : null}
                          </h3>
                        </div>
                      )}

                      {isFirst && (
                        <div className="flex items-center justify-center gap-0 px-8 z-10 relative">
                          <div className="shrink-0">
                            {renderTenenciaDonutChart()}
                          </div>
                          <div className="ml-[-55px] mt-[15px]">
                            {renderTenenciaLegend()}
                          </div>
                        </div>
                      )}

                      <div className={`flex-1 px-8 z-10 relative ${!isFirst ? 'mt-[21px]' : '-mt-[20px]'}`}>
                        <table className="w-full border-collapse border border-slate-300 text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-300">
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[80px]">CÓDIGO</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[200px]">JEFE DE FAMILIA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[130px]">PROCEDENCIA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[110px]">TENENCIA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700">DIRECCIÓN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((r, idx) => (
                              <tr key={r.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/[.85]'}`}>
                                <td className="py-[4.5px] px-0.5 text-base font-mono text-center border-r border-slate-200">{r.codigo || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.nombres} {r.apellidos}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.procedencia || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.tenencia_vivienda || 'Sin especificar'}</td>
                                <td className="py-[4.5px] px-0.5 text-[13px] leading-snug break-words">{r.direccion_exacta || '—'}</td>
                              </tr>
                            ))}
                            {chunk.length < rowsPerPage && Array.from({ length: rowsPerPage - chunk.length }).map((_, i) => (
                              <tr key={`empty-${i}`} className="border-b border-slate-200 h-[34px]">
                                <td colSpan={5} className="border-r border-slate-200">&nbsp;</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                        <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                        <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                        <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* REPORTE 8: SITUACIÓN DE ESTATUS */}
          {(() => {
            const ROWS_PAGE1 = 5;
            const ROWS_OTHER = 9;
            const total = refugiadosDelCampamento.length;
            const totalFiltrado = estatusReporte.length;

            const firstChunk = estatusReporte.slice(0, ROWS_PAGE1);
            const rest = estatusReporte.slice(ROWS_PAGE1);
            const restPageCount = Math.ceil(rest.length / ROWS_OTHER);
            const totalPaginas = 1 + restPageCount;

            const pages = [
              { chunk: firstChunk, isFirst: true },
              ...Array.from({ length: restPageCount }, (_, i) => ({
                chunk: rest.slice(i * ROWS_OTHER, (i + 1) * ROWS_OTHER),
                isFirst: false
              }))
            ];

            const renderEstatusDonutChart = () => {
              const cx = 110;
              const cy = 110;
              const outerR = 70;
              const innerR = 42;
              const circ = 2 * Math.PI * outerR;
              let dashOffset = 0;

              if (estatusGrupos.length === 0) {
                return (
                  <svg width="210" height="230" viewBox="0 0 210 230" className="mx-auto">
                    <circle cx={cx} cy={cy} r={outerR} fill="transparent" stroke="#E2E8F0" strokeWidth={outerR - innerR} />
                    <circle cx={cx} cy={cy} r={innerR} fill="white" />
                    <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontSize: '16px', fontWeight: 700, fill: '#9CA3AF' }}>Sin datos</text>
                  </svg>
                );
              }

              const segments = estatusGrupos.map(g => {
                const pct = g.cantidad / total;
                const dashLen = pct * circ;
                const seg = { ...g, dashLen, dashOffset };
                dashOffset -= dashLen;
                return seg;
              });

              return (
                <svg width="300" height="230" viewBox="0 0 300 230" className="mx-auto">
                  {segments.map((seg, i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={outerR}
                      fill="transparent"
                      stroke={ESTATUS_COLORES[seg.nombre] || '#9CA3AF'}
                      strokeWidth={outerR - innerR}
                      strokeDasharray={`${seg.dashLen} ${circ - seg.dashLen}`}
                      strokeDashoffset={seg.dashOffset}
                      transform={`rotate(-90 ${cx} ${cy})`}
                    />
                  ))}
                  <circle cx={cx} cy={cy} r={innerR} fill="white" />
                  <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: '28px', fontWeight: 800, fill: '#1E293B' }}>{total}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: '#64748B' }}>INTEGRANTES</text>
                </svg>
              );
            };

            const renderEstatusLegend = () => (
              <div className="grid grid-rows-6 grid-flow-col gap-x-6 gap-y-0 max-w-[600px]">
                {estatusGrupos.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: ESTATUS_COLORES[g.nombre] || '#9CA3AF' }} />
                    <div className="relative -top-[10px]">
                      <span className="text-[16px] font-bold text-slate-600">{g.nombre}</span>{' '}
                      <span className="text-[16px] font-black text-slate-800">{g.cantidad}</span>
                    </div>
                  </div>
                ))}
              </div>
            );

            return (
              <div id="reporte-estatus-render" className="flex flex-col">
                {pages.map(({ chunk, isFirst }, pageIdx) => {
                  const rowsPerPage = isFirst ? ROWS_PAGE1 : ROWS_OTHER;

                  return (
                    <div key={pageIdx} className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between px-12 pb-[40px] pt-[30px] overflow-hidden">
                      <img src="/marcaagua.png" alt="" className="absolute right-0 bottom-0 pointer-events-none z-0 opacity-100" style={{ maxWidth: '48%', maxHeight: '48%' }} />
                      <img src="/bordedeco.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

                      {isFirst && (
                        <div className="text-center mt-0 z-10 relative">
                          <div className="flex items-center justify-center gap-4">
                            <h1 className="text-[20px] font-black text-slate-800 uppercase tracking-wider">
                              REPORTE DE SITUACIÓN DE ESTATUS
                            </h1>
                            <p className="text-[16px] text-slate-500">
                              Fecha: {fecha}
                            </p>
                          </div>
                          <h2 className="text-[28px] font-bold text-caracas-red uppercase tracking-wide mt-1">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Situación de Estatus — Hogar Solidario y Retirados{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{totalFiltrado}</span>
                            {totalPaginas > 1 ? <span className="text-xs text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span> : null}
                          </h3>
                        </div>
                      )}

                      {!isFirst && (
                        <div className="text-center z-10 relative">
                          <h2 className="text-[20px] font-black text-caracas-red uppercase tracking-wider">
                            {campamentoSeleccionado.nombre}
                          </h2>
                          <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-3">
                            Situación de Estatus — Hogar Solidario y Retirados{' '}
                            <span className="text-slate-400">—</span>{' '}
                            Total: <span className="font-black text-[#C21807]">{totalFiltrado}</span>
                            {totalPaginas > 1 ? (
                              <span className="text-slate-400 ml-2">· Página {pageIdx + 1} de {totalPaginas}</span>
                            ) : null}
                          </h3>
                        </div>
                      )}

                      {isFirst && (
                        <div className="flex items-center justify-center gap-0 px-8 z-10 relative">
                          <div className="shrink-0">
                            {renderEstatusDonutChart()}
                          </div>
                          <div className="ml-[-55px] mt-[15px]">
                            {renderEstatusLegend()}
                          </div>
                        </div>
                      )}

                      <div className={`flex-1 px-8 z-10 relative ${!isFirst ? 'mt-[21px]' : '-mt-[20px]'}`}>
                        <table className="w-full border-collapse border border-slate-300 text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-300">
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[80px]">CÓDIGO</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300 w-[220px]">NOMBRE</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 border-r border-slate-300">JERARQUÍA</th>
                              <th className="py-1.5 px-1 text-xs font-black tracking-wide text-slate-700 w-[140px]">ESTATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunk.map((r, idx) => (
                              <tr key={r.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/[.85]'}`}>
                                <td className="py-[4.5px] px-0.5 text-base font-mono text-center border-r border-slate-200">{r.codigo || '—'}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.nombres} {r.apellidos}</td>
                                <td className="py-[4.5px] px-0.5 text-base border-r border-slate-200">{r.jerarquia}</td>
                                <td className="py-[4.5px] px-0.5 text-base font-semibold text-center">{((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE')}</td>
                              </tr>
                            ))}
                            {chunk.length < rowsPerPage && Array.from({ length: rowsPerPage - chunk.length }).map((_, i) => (
                              <tr key={`empty-${i}`} className="border-b border-slate-200 h-[34px]">
                                <td colSpan={4} className="border-r border-slate-200">&nbsp;</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-end justify-between px-10 mb-px z-10 shrink-0 relative">
                        <img src="/logorepublica.jpg" alt="Logo República" className="h-[68px] w-auto object-contain" />
                        <img src="/logovererojo.png" alt="Logo Venezuela" className="h-[68px] w-auto object-contain" />
                        <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-[68px] w-auto object-contain" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
