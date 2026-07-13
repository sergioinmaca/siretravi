import { useState, useMemo } from 'react';
import { FileText, Presentation, ShieldOff, Loader2 } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';

export default function Reportes() {
  const { campamentoSeleccionado, refugiados = [], familias = [] } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoKidsError, setLogoKidsError] = useState(false);

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Reportes', campamentoSeleccionado.id, 'Ver')
    : true;

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
    let nna_0_3 = 0;
    let nna_4_6 = 0;
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

        if (edad <= 3) nna_0_3++;
        else if (edad <= 6) nna_4_6++;
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
      nna_0_3,
      nna_4_6,
      nna_7_12,
      nna_adolescentes,
      nna_embarazadas,
      nna_discapacidad,
      nna_femenina,
      nna_masculino,
      totalNNA: nna_femenina + nna_masculino
    };
  }, [refugiadosDelCampamento, familiasDelCampamento]);

  // SVG de borde bandera decorativa nacional para el reporte
  const BorderDecoration = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1120 790" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 30,300 L 30,50 A 20,20 0 0,1 50,30 L 400,30" stroke="#C21807" strokeWidth="8" strokeLinecap="round" />
      <path d="M 410,30 L 710,30" stroke="#1D4ED8" strokeWidth="5" strokeLinecap="round" />
      <path d="M 720,30 L 1070,30 A 20,20 0 0,1 1090,50 L 1090,300" stroke="#007F5F" strokeWidth="8" strokeLinecap="round" />
      <path d="M 30,320 L 30,740 A 20,20 0 0,0 50,760 L 400,760" stroke="#007F5F" strokeWidth="8" strokeLinecap="round" />
      <path d="M 410,760 L 710,760" stroke="#1D4ED8" strokeWidth="5" strokeLinecap="round" />
      <path d="M 720,760 L 1070,760 A 20,20 0 0,0 1090,740 L 1090,320" stroke="#C21807" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );



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

  // Gráficos dinámicos SVG para inyectar en los reportes
  const renderPieChart = () => {
    const total = datosReporte.masculinos + datosReporte.femeninos;
    if (total === 0) return null;
    const femPct = Math.round((datosReporte.femeninos / total) * 100);
    const mascPct = Math.round((datosReporte.masculinos / total) * 100);

    const radius = 60;
    const circ = 2 * Math.PI * radius;
    const femStroke = (femPct / 100) * circ;
    const mascStroke = (mascPct / 100) * circ;

    // Calcular ángulos intermedios para situar las etiquetas de porcentaje
    const femAngle = (femPct * 3.6) / 2 - 90;
    const mascAngle = femPct * 3.6 + (mascPct * 3.6) / 2 - 90;

    const radFem = (femAngle * Math.PI) / 180;
    const radMasc = (mascAngle * Math.PI) / 180;

    // Posición del label dentro del aro de color
    const labelR = 60;
    const xFem = 110 + labelR * Math.cos(radFem);
    const yFem = 110 + labelR * Math.sin(radFem);
    const xMasc = 110 + labelR * Math.cos(radMasc);
    const yMasc = 110 + labelR * Math.sin(radMasc);

    return (
      <svg width="290" height="220" viewBox="0 0 290 220" className="mx-auto">
        <circle cx="110" cy="110" r={radius} fill="transparent" stroke="#F97316" strokeWidth="42" strokeDasharray={`${femStroke} ${circ}`} />
        <circle cx="110" cy="110" r={radius} fill="transparent" stroke="#3B82F6" strokeWidth="42" strokeDasharray={`${mascStroke} ${circ}`} strokeDashoffset={-femStroke} />

        {/* Etiquetas de porcentaje */}
        {femPct > 0 && (
          <g transform={`translate(${xFem - 16}, ${yFem - 10})`}>
            <rect width="32" height="18" rx="4" fill="#FFFFFF" stroke="#F97316" strokeWidth="1" />
            <text x="16" y="13" textAnchor="middle" className="text-[10px] font-black fill-slate-800">{femPct}%</text>
          </g>
        )}
        {mascPct > 0 && (
          <g transform={`translate(${xMasc - 16}, ${yMasc - 10})`}>
            <rect width="32" height="18" rx="4" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1" />
            <text x="16" y="13" textAnchor="middle" className="text-[10px] font-black fill-slate-800">{mascPct}%</text>
          </g>
        )}

        {/* Leyenda */}
        <g transform="translate(195, 80)">
          <rect width="10" height="10" rx="2" fill="#3B82F6" />
          <text x="15" y="9" className="text-[9px] font-bold fill-slate-600">MASCULINOS</text>

          <rect y="18" width="10" height="10" rx="2" fill="#F97316" />
          <text x="15" y="27" className="text-[9px] font-bold fill-slate-600">FEMENINOS</text>
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
      <div className="w-[380px] h-[210px] flex flex-col justify-between border-l-2 border-slate-700 pl-4 py-2 relative">
        {categories.map((cat, idx) => {
          const widthPct = Math.max(8, (cat.val / maxVal) * 82); // Mínimo de ancho visual
          return (
            <div key={idx} className="flex items-center w-full">
              <span className="text-[11px] font-black text-slate-500 w-[170px] text-right pr-3">
                {cat.key}
              </span>
              <div className="flex-1 flex items-center">
                {cat.val > 0 && (
                  <span className="text-[11px] font-black text-slate-800 mr-2">{cat.val}</span>
                )}
                {cat.val === 0 && (
                  <span className="text-[11px] font-black text-slate-400 mr-2">0</span>
                )}
                <div
                  className="h-5 rounded-md transition-all shadow-sm border border-black/5"
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
              Resumen enfocado a la población infantil y juvenil menor de 18 años. Clasifica por rangos de edad (0-3, 4-6, 7-12, adolescentes) y detecta alertas críticas como discapacidad e infancia gestante.
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

      </div>

      {/* ========================================================================= */}
      {/* ÁREA DE RENDERIZADO OCULTA - MANTIENE FORMATO 1120x790 (APROX 4:3) PARA LA EXPORTACIÓN */}
      {/* ========================================================================= */}
      {campamentoSeleccionado && (
        <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden select-none bg-slate-900">

          {/* REPORTE 1: DEMOGRÁFICO GENERAL (2 PÁGINAS) */}
          <div id="reporte-demografico-render" className="flex flex-col">

            {/* PÁGINA 1 */}
            <div className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between p-12 overflow-hidden">
              <BorderDecoration />

              {/* Header */}
              <div className="text-center mt-6 z-10">
                <h2 className="text-[22px] font-black text-slate-800 uppercase tracking-wide">
                  {campamentoSeleccionado.nombre}
                </h2>
              </div>

              {/* Content body */}
              <div className="flex-1 flex items-center justify-between px-16 gap-8 z-10">
                {/* Tablas izquierdas */}
                <div className="w-[450px] space-y-6">
                  {/* Tabla Familias */}
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-3.5 text-xs font-bold text-left tracking-wide">FAMILIAS LA GUAIRA</td>
                        <td className="p-3.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.familiasLaGuaira).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3.5 text-xs font-bold text-left tracking-wide">FAMILIAS CARACAS</td>
                        <td className="p-3.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.familiasCaracas).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 font-black">
                        <td className="p-3.5 text-xs text-left tracking-wide">TOTAL</td>
                        <td className="p-3.5 text-lg text-center text-[#C21807] w-24">
                          {String(datosReporte.totalFamilias).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Tabla Genero */}
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-3.5 text-xs font-bold text-left tracking-wide">MASCULINOS</td>
                        <td className="p-3.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.masculinos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-3.5 text-xs font-bold text-left tracking-wide">FEMENINOS</td>
                        <td className="p-3.5 text-lg font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.femeninos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 font-black">
                        <td className="p-3.5 text-xs text-left tracking-wide">TOTAL</td>
                        <td className="p-3.5 text-lg text-center w-24">
                          {String(datosReporte.totalRefugiados).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gráfico circular */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    {renderPieChart()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between px-10 mb-4 z-10 shrink-0">
                <img src="/logorepublica.png" alt="Logo República" className="h-12 w-auto object-contain" />
                <img src="/logovererojo.png" alt="Logo Venezuela" className="h-12 w-auto object-contain" />
                <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-12 w-auto object-contain" />
              </div>
            </div>

            {/* PÁGINA 2 */}
            <div className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between p-12 overflow-hidden">
              <BorderDecoration />

              {/* Header */}
              <div className="text-center mt-6 z-10">
                <h2 className="text-[22px] font-black text-slate-800 uppercase tracking-wide">
                  {campamentoSeleccionado.nombre}
                </h2>
              </div>

              {/* Content body */}
              <div className="flex-1 flex items-center justify-between px-16 gap-8 z-10">
                {/* Tabla demográfica general */}
                <div className="w-[450px]">
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <th colSpan={2} className="p-3 text-center text-xs font-black tracking-wider text-slate-700">
                          POBLACIÓN CENSADA LA GUAIRA - CARACAS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-xs font-bold tracking-wide">ADULTOS</td>
                        <td className="p-2.5 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.adultos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-xs font-bold tracking-wide">ADULTOS MAYORES</td>
                        <td className="p-2.5 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.adultosMayores).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-xs font-bold tracking-wide">NIÑAS Y NIÑOS</td>
                        <td className="p-2.5 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.ninasNinos).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-xs font-bold tracking-wide">ADOLESCENTES</td>
                        <td className="p-2.5 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.adolescentes).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-xs font-bold tracking-wide">EMBARAZADAS</td>
                        <td className="p-2.5 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.embarazadas).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-xs font-bold tracking-wide">DISCAPACITADOS</td>
                        <td className="p-2.5 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.discapacitados).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="p-3 text-xs tracking-wide">TOTAL</td>
                        <td className="p-3 text-md text-center w-24">
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
              <div className="flex items-end justify-between px-10 mb-4 z-10 shrink-0">
                <img src="/logorepublica.png" alt="Logo República" className="h-12 w-auto object-contain" />
                <img src="/logovererojo.png" alt="Logo Venezuela" className="h-12 w-auto object-contain" />
                <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-12 w-auto object-contain" />
              </div>
            </div>

          </div>

          {/* REPORTE 2: NIÑOS, NIÑAS Y ADOLESCENTES (1 PÁGINA) */}
          <div id="reporte-nna-render" className="flex flex-col">

            <div className="report-page w-[1120px] h-[790px] bg-white relative flex flex-col justify-between p-12 overflow-hidden">
              <BorderDecoration />

              {/* Header */}
              <div className="text-center mt-6 z-10">
                <h2 className="text-[22px] font-black text-slate-800 uppercase tracking-wide">
                  {campamentoSeleccionado.nombre}
                </h2>
              </div>

              {/* Content body */}
              <div className="flex-1 flex items-center justify-between px-16 gap-8 z-10">
                {/* Tablas izquierdas */}
                <div className="w-[450px] space-y-5">
                  <table className="w-full border-collapse border border-slate-300 text-slate-800">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <th colSpan={2} className="p-3 text-center text-xs font-black tracking-wider text-slate-700">
                          NIÑAS – NIÑOS Y ADOLESCENTES LA GUAIRA - CARACAS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold tracking-wide">0-3 AÑOS</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_0_3).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold tracking-wide">4-6 AÑOS</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_4_6).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold tracking-wide">7-12 AÑOS</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_7_12).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold tracking-wide">ADOLESCENTES</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_adolescentes).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold tracking-wide">ADOLESCENTE EMBARAZADA</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_embarazadas).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold tracking-wide">DISCAPACIDAD</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-24">
                          {String(datosReporte.nna_discapacidad).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td className="p-2.5 text-xs tracking-wide">TOTAL</td>
                        <td className="p-2.5 text-md text-center w-24">
                          {String(datosReporte.totalNNA).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Tabla de desglose por sexo en niños */}
                  <table className="w-[300px] border-collapse border border-slate-300 text-slate-800 mx-auto">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-2 text-xs font-bold text-left tracking-wide">FEMENINA</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-20">
                          {String(datosReporte.nna_femenina).padStart(2, '0')}
                        </td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="p-2 text-xs font-bold text-left tracking-wide">MASCULINO</td>
                        <td className="p-2 text-md font-black text-center text-[#C21807] w-20">
                          {String(datosReporte.nna_masculino).padStart(2, '0')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Ilustración de Niños */}
                <div className="flex-1 flex flex-col items-center">
                  {logoKidsError ? (
                    <KidsIllustrationFallback />
                  ) : (
                    <img
                      src="/ninos.png"
                      alt="Ilustración Niños"
                      className="max-h-[350px] w-auto object-contain"
                      onError={() => setLogoKidsError(true)}
                    />
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between px-10 mb-4 z-10 shrink-0">
                <img src="/logorepublica.png" alt="Logo República" className="h-12 w-auto object-contain" />
                <img src="/logovererojo.png" alt="Logo Venezuela" className="h-12 w-auto object-contain" />
                <img src="/logoalcadia.png" alt="Logo Alcaldía" className="h-12 w-auto object-contain" />
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
