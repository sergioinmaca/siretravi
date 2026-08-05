import { useState, useMemo, useRef, useCallback } from 'react';
import { Users, BedDouble, Tent, Home, Baby, Heart, Sparkles, ShieldOff, FileDown, Loader2, Milk, UserCheck, HeartPulse, Accessibility } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import CroquisViewer, { countElements, contarTiposDesdeCroquis } from '../components/constructor/CroquisViewer';
import PlanoGeneralViewer from '../components/constructor/PlanoGeneralViewer';
import jsPDF from 'jspdf';

export default function Inicio() {
  const { campamentoSeleccionado, refugiados = [] } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();
  const isMobile = useIsMobile();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Inicio', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver los datos de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }

  const refugiadosDelCampamento = campamentoSeleccionado
    ? refugiados.filter(r => r.campamento_id === campamentoSeleccionado.id)
    : [];

  const refugiadosActivos = refugiadosDelCampamento.filter(
    r => (r.hogar_solidario || '').toUpperCase() !== 'RETIRADO'
  );

  const refugiadosPresentes = refugiadosDelCampamento.filter(
    r => ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE') === 'PRESENTE'
  );

  const jefesActivos = refugiadosActivos.filter(r => r.es_jefe_familia === true);

  const occupiedBeds = useMemo(() => {
    return refugiadosDelCampamento
      .map(r => r.nro_cama)
      .filter((cama): cama is string => !!cama);
  }, [refugiadosDelCampamento]);

  const bedOccupants = useMemo(() => {
    const map: Record<string, string[]> = {};
    refugiadosDelCampamento.forEach(r => {
      if (r.nro_cama) {
        if (!map[r.nro_cama]) map[r.nro_cama] = [];
        map[r.nro_cama].push(`${r.nombres} ${r.apellidos}`);
      }
    });
    return map;
  }, [refugiadosDelCampamento]);

  const uniqueOccupiedBedsSet = useMemo(() => new Set(occupiedBeds), [occupiedBeds]);

  const totalRefugiados = refugiadosPresentes.length;
  const totalHombres = refugiadosPresentes.filter(r => r.genero === true).length;
  const totalMujeres = refugiadosPresentes.filter(r => r.genero === false).length;

  const totalFamilias = campamentoSeleccionado
    ? new Set(jefesActivos.filter(r => r.familia_id).map(r => r.familia_id)).size
    : 0;

  // Optimización: calcular las edades de los refugiados una sola vez usando useMemo
  const refugiadosConEdad = useMemo(() => {
    const hoy = new Date();
    return refugiadosActivos.map(r => {
      const nacimiento = new Date(r.fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return { ...r, edad };
    });
  }, [refugiadosActivos]);

  // ── Nuevos indicadores demográficos ─────────────────────────────────────
  const ninos = refugiadosConEdad.filter(r => r.edad <= 11);
  const ninosH = ninos.filter(r => r.genero === true).length;
  const ninosM = ninos.filter(r => r.genero === false).length;

  const adolescentes = refugiadosConEdad.filter(r => r.edad >= 12 && r.edad <= 17);
  const adolescentesH = adolescentes.filter(r => r.genero === true).length;
  const adolescentesM = adolescentes.filter(r => r.genero === false).length;

  const adultoMayor = refugiadosConEdad.filter(r => (r.genero === true && r.edad >= 60) || (r.genero === false && r.edad >= 55));
  const adultoMayorH = adultoMayor.filter(r => r.genero === true).length;
  const adultoMayorM = adultoMayor.filter(r => r.genero === false).length;

  const lactantes = refugiadosConEdad.filter(r => r.edad >= 0 && r.edad <= 2);
  const lactantesH = lactantes.filter(r => r.genero === true).length;
  const lactantesM = lactantes.filter(r => r.genero === false).length;

  const noLactantes = refugiadosConEdad.filter(r => r.edad >= 3 && r.edad <= 11);
  const noLactantesH = noLactantes.filter(r => r.genero === true).length;
  const noLactantesM = noLactantes.filter(r => r.genero === false).length;

  const embarazadas = refugiadosActivos.filter(r => r.genero === false && r.embarazo === true).length;
  const discapacitados = refugiadosActivos.filter(r => r.discapacidad === true).length;

  const adultos = refugiadosConEdad.filter(r =>
    (r.genero === true && r.edad >= 18 && r.edad < 60) ||
    (r.genero === false && r.edad >= 18 && r.edad < 55)
  );
  const adultosH = adultos.filter(r => r.genero === true).length;
  const adultosM = adultos.filter(r => r.genero === false).length;

  // Filtrar solo jefes de familia para calculos basados en familias
  const totalJefes = jefesActivos.length;

  // Datos para grafico de dona – Tenencia de Vivienda (solo jefes)
  const tenenciaData = useMemo(() => {
    const map = new Map<string, number>();
    jefesActivos.forEach(j => {
      const t = j.tenencia_vivienda?.trim() || 'Sin especificar';
      map.set(t, (map.get(t) || 0) + 1);
    });
    const categorias = ['Propia', 'Alquilada', 'Compartida/Familiar', 'Pensión', 'Sin especificar'];
    return categorias
      .map(nombre => ({
        nombre,
        cantidad: map.get(nombre) || 0,
      }))
      .filter(c => c.cantidad > 0);
  }, [jefesActivos]);

  // Colores para la dona de tenencia
  const tenenciaColores: Record<string, string> = {
    'Propia': '#007229',
    'Alquilada': '#0033A0',
    'Compartida/Familiar': '#FFD100',
    'Pensión': '#bc2f4a',
    'Sin especificar': '#9CA3AF',
  };

  // SVG dona – constantes
  const DONA_RADIUS = 70;
  const DONA_CIRCUMFERENCE = 2 * Math.PI * DONA_RADIUS;

  const donaSectores = useMemo(() => {
    let offset = 0;
    return tenenciaData.map(c => {
      const pct = c.cantidad / totalJefes;
      const dash = pct * DONA_CIRCUMFERENCE;
      const sector = { ...c, pct, dash, offset };
      offset += dash;
      return sector;
    });
  }, [tenenciaData, totalJefes]);

  // Datos para gráfico de dona – Situación de Estatus (todos los integrantes del campamento)
  const totalIntegrantes = refugiadosDelCampamento.length;
  const estatusData = useMemo(() => {
    const categorias = ['PRESENTE', 'HOGAR SOLIDARIO', 'RETIRADO'];
    const map = new Map<string, number>();
    refugiadosDelCampamento.forEach(r => {
      const s = ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
      map.set(s, (map.get(s) || 0) + 1);
    });
    return categorias
      .map(nombre => ({ nombre, cantidad: map.get(nombre) || 0 }))
      .filter(c => c.cantidad > 0);
  }, [refugiadosDelCampamento]);

  const estatusColores: Record<string, string> = {
    'PRESENTE': '#10B981',
    'HOGAR SOLIDARIO': '#F59E0B',
    'RETIRADO': '#EF4444',
  };

  const estatusSectores = useMemo(() => {
    if (totalIntegrantes === 0) return [];
    let offset = 0;
    return estatusData.map(c => {
      const pct = c.cantidad / totalIntegrantes;
      const dash = pct * DONA_CIRCUMFERENCE;
      const sector = { ...c, pct, dash, offset };
      offset += dash;
      return sector;
    });
  }, [estatusData, totalIntegrantes]);

  // Calcular ranking de procedencias (solo jefes de familia)
  const procedenciasMap = new Map<string, number>();
  jefesActivos.forEach(r => {
    const proc = r.procedencia?.trim() || 'SIN ESPECIFICAR';
    procedenciasMap.set(proc, (procedenciasMap.get(proc) || 0) + 1);
  });
  const procedenciasRanking = Array.from(procedenciasMap.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const maxProcedencia = procedenciasRanking.length > 0 ? procedenciasRanking[0].cantidad : 1;

  // Colores vibrantes para las barras
  const barColors = [
    '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4',
    '#8B5CF6', '#EC4899', '#84CC16', '#F97316', '#14B8A6',
    '#A855F7', '#3B82F6', '#E11D48', '#22C55E', '#EAB308'
  ];

  // Estado para tooltip
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Calcular offsets de numeracion para encadenar numeros entre modulos
  const modulos = campamentoSeleccionado?.modulos || [];
  const tipoContabilizacion = campamentoSeleccionado?.tipo_contabilizacion || 'elemento';
  const modulosConOffset = modulos.map((modulo, index) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += countElements(modulos[i].croquis_data || '', tipoContabilizacion);
    }
    return { modulo, offset };
  });

  const totalesCroquis = modulos.reduce(
    (acc, modulo) => {
      const c = contarTiposDesdeCroquis(modulo.croquis_data || '');
      acc.literas += c.literas;
      acc.individuales += c.individuales;
      acc.duplex += c.duplex;
      return acc;
    },
    { literas: 0, individuales: 0, duplex: 0 }
  );

  const totalCamasCroquis = tipoContabilizacion === 'cama'
    ? totalesCroquis.literas * 2 + totalesCroquis.individuales + totalesCroquis.duplex
    : totalesCroquis.literas + totalesCroquis.individuales + totalesCroquis.duplex;
  const disponiblesCroquis = Math.max(0, totalCamasCroquis - uniqueOccupiedBedsSet.size);

  const [exportandoPDF, setExportandoPDF] = useState(false);
  const croquisCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [exportandoPlanosPDF, setExportandoPlanosPDF] = useState(false);
  const planosCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [planosExpandidos, setPlanosExpandidos] = useState<Record<number, boolean>>({});

  // ── Exportar PDF de Distribución (estructura Reportes) ────────────────────
  const handleExportCroquisPDF = useCallback(async () => {
    setExportandoPDF(true);
    try {
      // Preload images for watermark, border and footer
      const loadImage = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const [wmImg, brdImg, logoRepublica, logoVenezuela, logoAlcaldia] = await Promise.all([
        loadImage('/marcaagua.png'),
        loadImage('/bordedeco.png'),
        loadImage('/logorepublica.jpg'),
        loadImage('/logovererojo.png'),
        loadImage('/logoalcadia.png'),
      ]);

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageW = 297;
      const pageH = 210;
      const marginL = 12;
      const marginR = 12;
      const marginT = 8;
      const marginB = 10.5;
      const usableW = pageW - marginL - marginR;
      const imgPadding = 2;
      const imgMaxW = usableW - imgPadding * 2;
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';
      const totalCamas = tipoContabilizacion === 'cama'
        ? totalesCroquis.literas * 2 + totalesCroquis.individuales + totalesCroquis.duplex
        : totalesCroquis.literas + totalesCroquis.individuales + totalesCroquis.duplex;
      const totalOcupadas = occupiedBeds.length;
      const pctOcup = totalCamas > 0 ? Math.round((totalOcupadas / totalCamas) * 100) : 0;

      for (let i = 0; i < modulos.length; i++) {
        if (i > 0) pdf.addPage();

        // ── Fondo: marca de agua (48% page, bottom-right) ────────────────────
        if (wmImg) {
          const wmAspect = wmImg.naturalWidth / wmImg.naturalHeight;
          const wmW = pageW * 0.48;
          const wmH = wmW / wmAspect;
          pdf.addImage(wmImg, 'PNG', pageW - wmW, pageH - wmH, wmW, wmH);
        }

        // ── Borde decorativo (full page) ─────────────────────────────────────
        if (brdImg) {
          pdf.addImage(brdImg, 'PNG', 0, 0, pageW, pageH);
        }

        // ── Header: título + fecha ───────────────────────────────────────────
        const headerY = marginT + 6;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text('DISTRIBUCIÓN DEL CAMPAMENTO', marginL, headerY);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Emitido: ${fecha}`, pageW - marginR, headerY, { align: 'right' });

        // Nombre del campamento en rojo
        const campY = headerY + 8;
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(194, 24, 7);
        pdf.text(nombreCamp, marginL, campY);

        // ── Stats generales (separador + indicadores) ────────────────────────
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        const lineY = campY + 6;
        pdf.line(marginL, lineY, pageW - marginR, lineY);

        const statsY = lineY + 6;
        const colW = usableW / 5;
        const statItems = [
          { label: 'Literas', value: String(totalesCroquis.literas), sub: tipoContabilizacion === 'cama' ? `(${totalesCroquis.literas * 2} camas)` : `(${totalesCroquis.literas} elem.)`, color: '#3B82F6' },
          { label: 'Individuales', value: String(totalesCroquis.individuales), sub: `(${totalesCroquis.individuales} camas)`, color: '#10B981' },
          { label: 'Duplex', value: String(totalesCroquis.duplex), sub: `(${totalesCroquis.duplex} camas)`, color: '#F59E0B' },
          { label: 'Total Camas', value: String(totalCamas), sub: '', color: '#6B7280' },
          { label: 'Ocupadas', value: `${totalOcupadas} (${pctOcup}%)`, sub: '', color: '#EF4444' },
        ];
        statItems.forEach((item, j) => {
          const cx = marginL + colW * j + colW / 2;
          pdf.setFillColor(item.color);
          pdf.circle(cx - 1, statsY + 1.5, 2.5, 'F');
          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 41, 59);
          pdf.text(item.value, cx + 4, statsY + 2.5);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          const valueW = pdf.getTextWidth(item.value);
          pdf.text(item.label, cx + 4, statsY + 6);
          if (item.sub) {
            pdf.setFontSize(6.5);
            pdf.setTextColor(156, 163, 175);
            pdf.text(item.sub, cx + 4 + valueW + 3, statsY + 2.5);
          }
        });

        // ── Seccion de modulo ──────────────────────────────────────────────────
        const moduloSectionY = statsY + 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Modulo: ${modulos[i].nombre}`, marginL, moduloSectionY);

        // Indicadores por modulo
        const tiposModulo = contarTiposDesdeCroquis(modulos[i].croquis_data || '');
        const tipoY = moduloSectionY + 5;
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');

        pdf.setFillColor('#3B82F6');
        pdf.circle(marginL + 5, tipoY, 2, 'F');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`${tiposModulo.literas} Literas`, marginL + 9, tipoY + 1.5);

        pdf.setFillColor('#10B981');
        pdf.circle(marginL + 60, tipoY, 2, 'F');
        pdf.text(`${tiposModulo.individuales} Individuales`, marginL + 64, tipoY + 1.5);

        pdf.setFillColor('#F59E0B');
        pdf.circle(marginL + 115, tipoY, 2, 'F');
        pdf.text(`${tiposModulo.duplex} Duplex`, marginL + 119, tipoY + 1.5);

        const labelBottom = tipoY + 5;

        // ── Croquis (canvas → PNG) ──────────────────────────────────────────
        const cvs = croquisCanvasRefs.current[i];
        if (cvs) {
          const imgData = cvs.toDataURL('image/png');
          const imgH = (cvs.height / cvs.width) * imgMaxW;
          const croquisY = labelBottom + 4;
          const footerAreaStart = pageH - marginB - 22;
          const availableH = footerAreaStart - croquisY;
          const finalH = Math.min(imgH, availableH);
          const finalW = finalH < imgH ? (finalH / cvs.height) * cvs.width : imgMaxW;
          const imgX = marginL + imgPadding + (imgMaxW - finalW) / 2;
          pdf.addImage(imgData, 'PNG', imgX, croquisY, finalW, finalH);
        }

        // ── Footer: logos institucionales ─────────────────────────────────────
        const logoH = 18;
        const logoBottom = pageH - marginB;
        const logoY = logoBottom - logoH;
        const footerPaddingX = 10.6;

        if (logoRepublica) {
          const lw = (logoRepublica.naturalWidth / logoRepublica.naturalHeight) * logoH;
          pdf.addImage(logoRepublica, 'PNG', footerPaddingX, logoY, lw, logoH);
        }
        if (logoVenezuela) {
          const lw = (logoVenezuela.naturalWidth / logoVenezuela.naturalHeight) * logoH;
          pdf.addImage(logoVenezuela, 'PNG', pageW / 2 - lw / 2, logoY, lw, logoH);
        }
        if (logoAlcaldia) {
          const lw = (logoAlcaldia.naturalWidth / logoAlcaldia.naturalHeight) * logoH;
          pdf.addImage(logoAlcaldia, 'PNG', pageW - footerPaddingX - lw, logoY, lw, logoH);
        }
      }

      pdf.save(`distribucion-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.pdf`);
    } catch (err) {
      console.error('Error generando PDF de distribución:', err);
    } finally {
      setExportandoPDF(false);
    }
  }, [campamentoSeleccionado, totalesCroquis, occupiedBeds, tipoContabilizacion, modulos]);

  // ── Datos de planos ─────────────────────────────────────────────────────
  const planos = campamentoSeleccionado?.croquis_general || [];

  // ── Exportar PDF de Planos Generales (vector + raster 2x) ─────────────────
  const handleExportPlanosPDF = useCallback(async () => {
    if (planos.length === 0) return;
    setExportandoPlanosPDF(true);
    try {
      const loadImage = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const [wmImg, brdImg, logoRepublica, logoVenezuela, logoAlcaldia] = await Promise.all([
        loadImage('/marcaagua.png'),
        loadImage('/bordedeco.png'),
        loadImage('/logorepublica.jpg'),
        loadImage('/logovererojo.png'),
        loadImage('/logoalcadia.png'),
      ]);

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageW = 297;
      const pageH = 210;
      const marginL = 12;
      const marginR = 12;
      const marginT = 8;
      const marginB = 10.5;
      const usableW = pageW - marginL - marginR;
      const imgMaxW = usableW;
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';

      for (let i = 0; i < planos.length; i++) {
        if (i > 0) pdf.addPage();

        if (wmImg) {
          const wmAspect = wmImg.naturalWidth / wmImg.naturalHeight;
          const wmW = pageW * 0.48;
          const wmH = wmW / wmAspect;
          pdf.addImage(wmImg, 'PNG', pageW - wmW, pageH - wmH, wmW, wmH);
        }
        if (brdImg) {
          pdf.addImage(brdImg, 'PNG', 0, 0, pageW, pageH);
        }

        const headerY = marginT + 6;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text('PLANOS GENERALES', marginL, headerY);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Emitido: ${fecha}`, pageW - marginR, headerY, { align: 'right' });

        const campY = headerY + 8;
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(194, 24, 7);
        pdf.text(nombreCamp, marginL, campY);

        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        const lineY = campY + 6;
        pdf.line(marginL, lineY, pageW - marginR, lineY);

        const planoSectionY = lineY + 8;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Plano: ${planos[i].nombre}`, marginL, planoSectionY);

        const labelBottom = planoSectionY + 5;

        // Capa raster: capturar canvas a 2x e incrustarlo como fondo
        const cvs = planosCanvasRefs.current[i];
        if (cvs) {
          const scaleFactor = 4;
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = cvs.width * scaleFactor;
          tmpCanvas.height = cvs.height * scaleFactor;
          const tmpCtx = tmpCanvas.getContext('2d');
          if (tmpCtx) {
            tmpCtx.scale(scaleFactor, scaleFactor);
            tmpCtx.drawImage(cvs, 0, 0);
            const imgData = tmpCanvas.toDataURL('image/png');
            const imgH = (cvs.height / cvs.width) * imgMaxW;
            const croquisY = labelBottom + 4;
            const footerAreaStart = pageH - marginB - 22;
            const availableH = footerAreaStart - croquisY;
            const finalH = Math.min(imgH, availableH);
            const finalW = finalH < imgH ? (finalH / cvs.height) * cvs.width : imgMaxW;
            const imgX = marginL + (imgMaxW - finalW) / 2;
            pdf.addImage(imgData, 'PNG', imgX, croquisY, finalW, finalH);
          }
        }

        // Footer
        const logoH = 18;
        const logoBottom = pageH - marginB;
        const logoY = logoBottom - logoH;
        const footerPaddingX = 10.6;
        if (logoRepublica) {
          const lw = (logoRepublica.naturalWidth / logoRepublica.naturalHeight) * logoH;
          pdf.addImage(logoRepublica, 'PNG', footerPaddingX, logoY, lw, logoH);
        }
        if (logoVenezuela) {
          const lw = (logoVenezuela.naturalWidth / logoVenezuela.naturalHeight) * logoH;
          pdf.addImage(logoVenezuela, 'PNG', pageW / 2 - lw / 2, logoY, lw, logoH);
        }
        if (logoAlcaldia) {
          const lw = (logoAlcaldia.naturalWidth / logoAlcaldia.naturalHeight) * logoH;
          pdf.addImage(logoAlcaldia, 'PNG', pageW - footerPaddingX - lw, logoY, lw, logoH);
        }
      }

      pdf.save(`planos-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.pdf`);
    } catch (err) {
      console.error('Error generando PDF de planos:', err);
    } finally {
      setExportandoPlanosPDF(false);
    }
  }, [campamentoSeleccionado, planos]);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Visión General</h2>
        <p className="text-gray-500 max-md:max-w-[calc(100vw-2rem)] max-md:[overflow-wrap:anywhere]">
          Mostrando indicadores para: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-6 max-md:-mx-4">
        {/* Modulos Activos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-blue flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-caracas-blue max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2">
          <Tent size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
          <div className="max-md:hidden p-4 bg-caracas-blue/10 rounded-xl text-caracas-blue shrink-0">
            <Tent size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-black truncate max-md:text-white">Modulos Activos</p>
            <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{campamentoSeleccionado?.modulos?.length || 0}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
              Instalados
            </p>
          </div>
        </div>

        {/* Capacidad / Camas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-green flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-caracas-green max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2">
          <BedDouble size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
          <div className="max-md:hidden p-4 bg-caracas-green/10 rounded-xl text-caracas-green shrink-0">
            <BedDouble size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-black truncate max-md:text-white">Camas Disponibles</p>
            <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{disponiblesCroquis}</p>
            <p className="text-xs text-gray-400 mt-1 max-md:text-base max-md:text-yellow-300">
              <span className="text-caracas-red font-medium max-md:text-yellow-300">{uniqueOccupiedBedsSet.size}</span> Ocupadas / {totalCamasCroquis} Totales
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-6 max-md:-mx-4">
        {/* Total Personas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-red flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-caracas-red max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2">
          <Users size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
          <div className="max-md:hidden p-4 bg-caracas-red/10 rounded-xl text-caracas-red shrink-0">
            <Users size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-black truncate max-md:text-white">Total de Personas Presentes</p>
            <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{totalRefugiados}</p>
            <p className="text-xs text-gray-400 mt-1 max-md:text-base max-md:text-yellow-300">
              <span className="text-blue-600 font-medium max-md:text-blue-300">{totalHombres}</span> H · <span className="text-pink-600 font-medium max-md:text-pink-300">{totalMujeres}</span> M
            </p>
          </div>
        </div>

        {/* Total Familias */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-indigo-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2">
          <Home size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
          <div className="max-md:hidden p-4 bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0">
            <Home size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-black truncate max-md:text-white">Total de Familias</p>
            <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{totalFamilias}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
              Grupos familiares
            </p>
          </div>
        </div>
      </div>

      {/* Embarazadas y Discapacitados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-6 max-md:-mx-4">
        {/* Embarazadas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-pink-500 flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-pink-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2">
          <HeartPulse size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
          <div className="max-md:hidden p-4 bg-pink-500/10 rounded-xl text-pink-500 shrink-0">
            <HeartPulse size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-black truncate max-md:text-white">Embarazadas</p>
            <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{embarazadas}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
              Mujeres en estado de gestación
            </p>
          </div>
        </div>

        {/* Discapacitados */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 flex items-center gap-4 hover:shadow-md transition-shadow max-md:bg-purple-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:gap-2">
          <Accessibility size={isMobile ? 18 : 32} className="max-md:text-white shrink-0 md:hidden" />
          <div className="max-md:hidden p-4 bg-purple-500/10 rounded-xl text-purple-500 shrink-0">
            <Accessibility size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-black truncate max-md:text-white">Discapacitados</p>
            <p className="text-3xl font-bold text-gray-900 max-md:text-white max-md:text-xl">{discapacitados}</p>
            <p className="text-xs text-gray-400 mt-1 truncate max-md:text-base max-md:text-yellow-300">
              Personas con condición especial
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores Demográficos Detallados */}
      <div className="space-y-6">
        {/* Cards de Niñez */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-6 max-md:-mx-4">
          {/* Niños (0-11) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400 hover:shadow-md transition-shadow max-md:bg-[#e76e1c] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3">
            <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
              <Baby size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-3 bg-orange-100 rounded-xl text-orange-500">
                <Baby size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-black max-md:text-white">Niños</p>
                <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{ninos.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
              0 a 11 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{ninosH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{ninosM} M</span>
            </p>
          </div>

          {/* Niños Lactantes (0-3) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400 hover:shadow-md transition-shadow max-md:bg-[#e98b3f] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3">
            <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
              <Milk size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-3 bg-sky-100 rounded-xl text-sky-500">
                <Milk size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-black max-md:text-white">Niños Lactantes</p>
                <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{lactantes.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
              0 a 2 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{lactantesH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{lactantesM} M</span>
            </p>
          </div>

          {/* No Lactantes (4-11) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500 hover:shadow-md transition-shadow max-md:bg-[#ce8043] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3">
            <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
              <Baby size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-3 bg-amber-100 rounded-xl text-amber-600">
                <Baby size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-black max-md:text-white">No Lactantes</p>
                <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{noLactantes.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
              3 a 11 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{noLactantesH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{noLactantesM} M</span>
            </p>
          </div>
        </div>

        {/* Adolescentes, Adultos, Adulto Mayor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-6 max-md:-mx-4">
          {/* Adolescentes (12-17) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow max-md:bg-amber-500 max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3">
            <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
              <Sparkles size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-3 bg-yellow-100 rounded-xl text-yellow-600">
                <Sparkles size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-black max-md:text-white">Adolescentes</p>
                <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{adolescentes.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
              12 a 17 años · <span className="text-blue-600 font-medium max-md:text-blue-200">{adolescentesH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{adolescentesM} M</span>
            </p>
          </div>

          {/* Adultos (18-59 H / 18-54 M) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-400 hover:shadow-md transition-shadow max-md:bg-[#48ba8d] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3">
            <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
              <UserCheck size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <UserCheck size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-black max-md:text-white">Adultos</p>
                <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{adultos.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
              H 18-59 / M 18-54 · <span className="text-blue-600 font-medium max-md:text-blue-200">{adultosH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{adultosM} M</span>
            </p>
          </div>

          {/* Adulto Mayor */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-rose-400 hover:shadow-md transition-shadow max-md:bg-[#d57177] max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:border-l-0 max-md:px-4 max-md:py-3">
            <div className="flex items-center gap-3 mb-4 max-md:gap-2 max-md:mb-0">
              <Heart size={isMobile ? 18 : 28} className="max-md:text-white shrink-0 md:hidden" />
              <div className="max-md:hidden p-3 bg-rose-100 rounded-xl text-rose-500">
                <Heart size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-black max-md:text-white">Adulto Mayor</p>
                <p className="text-2xl font-bold text-gray-900 max-md:text-white max-md:text-lg">{adultoMayor.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 max-md:text-base max-md:text-yellow-300">
              H &ge;60 / M &ge;55 · <span className="text-blue-600 font-medium max-md:text-blue-200">{adultoMayorH} H</span> · <span className="text-pink-600 font-medium max-md:text-pink-200">{adultoMayorM} M</span>
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard: Tenencia de Vivienda + Estatus | Ranking de Procedencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUMNA IZQUIERDA: Tenencia de Vivienda + Situación de Estatus apilados */}
        <div className="flex flex-col gap-y-2 md:gap-6">

          {/* Grafico de Dona – Tenencia de Vivienda */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-caracas-red rounded-full"></div>
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">Tenencia de Vivienda</h2>
            </div>

            {tenenciaData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="relative w-40 h-40 shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                    <circle cx="100" cy="100" r={DONA_RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="28" />
                    {donaSectores.map(s => (
                      <circle
                        key={s.nombre}
                        cx="100" cy="100" r={DONA_RADIUS}
                        fill="none"
                        stroke={tenenciaColores[s.nombre] || '#9CA3AF'}
                        strokeWidth="28"
                        strokeDasharray={`${s.dash} ${DONA_CIRCUMFERENCE - s.dash}`}
                        strokeDashoffset={-s.offset}
                        strokeLinecap="butt"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{totalJefes}</span>
                    <span className="text-xs text-black">Familias</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5 min-w-0">
                  {tenenciaData.map(c => (
                    <div key={c.nombre} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tenenciaColores[c.nombre] || '#9CA3AF' }} />
                        <span className="text-gray-600 truncate">{c.nombre}</span>
                      </div>
                      <span className="font-semibold text-gray-800 tabular-nums shrink-0 ml-2">
                        {c.cantidad} <span className="text-gray-400 font-normal">({((c.cantidad / totalJefes) * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p className="font-medium">No hay jefes de familia registrados.</p>
              </div>
            )}
          </div>

          {/* Grafico de Dona – Situación de Estatus (todos los integrantes) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">Situación de Estatus</h2>
            </div>

            {estatusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="relative w-40 h-40 shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                    <circle cx="100" cy="100" r={DONA_RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="28" />
                    {estatusSectores.map(s => (
                      <circle
                        key={s.nombre}
                        cx="100" cy="100" r={DONA_RADIUS}
                        fill="none"
                        stroke={estatusColores[s.nombre] || '#9CA3AF'}
                        strokeWidth="28"
                        strokeDasharray={`${s.dash} ${DONA_CIRCUMFERENCE - s.dash}`}
                        strokeDashoffset={-s.offset}
                        strokeLinecap="butt"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{totalIntegrantes}</span>
                    <span className="text-[11px] text-black text-center leading-tight -mt-1">Integrantes<br/>Registrados</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5 min-w-0">
                  {estatusData.map(c => (
                    <div key={c.nombre} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: estatusColores[c.nombre] || '#9CA3AF' }} />
                        <span className="text-gray-600 truncate capitalize">{c.nombre.charAt(0) + c.nombre.slice(1).toLowerCase()}</span>
                      </div>
                      <span className="font-semibold text-gray-800 tabular-nums shrink-0 ml-2">
                        {c.cantidad} <span className="text-gray-400 font-normal">({((c.cantidad / totalIntegrantes) * 100).toFixed(1)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p className="font-medium">No hay integrantes registrados.</p>
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA DERECHA: Ranking de Procedencias */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:max-w-[calc(100vw-1rem)] max-md:-ml-4 max-md:mr-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Ranking de Procedencias</h2>
          </div>

          {procedenciasRanking.length > 0 ? (
            <div className="space-y-3">
              {procedenciasRanking.map((proc, index) => {
                const pct = (proc.cantidad / maxProcedencia) * 100;
                const color = barColors[index % barColors.length];
                return (
                  <div
                    key={proc.nombre}
                    className={`flex items-center gap-3 group relative max-md:flex-col max-md:items-start max-md:gap-1 max-md:overflow-hidden ${hoveredBar === index ? 'z-50 max-md:overflow-visible' : 'z-0'}`}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <p className="text-xs font-semibold text-gray-500 text-right w-36 shrink-0 truncate uppercase max-md:w-full max-md:text-left max-md:whitespace-normal max-md:overflow-visible" title={proc.nombre}>
                      {proc.nombre}
                    </p>
                    <div className="flex-1 h-7 bg-gray-50 rounded-md relative max-md:w-full max-md:flex-none">
                      <div
                        className="h-full rounded-md transition-all duration-500 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          minWidth: '24px',
                          opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.4
                        }}
                      />
                      {hoveredBar === index && (
                        <div className="absolute left-1/2 -translate-x-1/2 -top-14 bg-white border border-gray-200 shadow-xl rounded-lg px-4 py-2 z-[999] whitespace-nowrap pointer-events-none">
                          <p className="text-xs font-bold text-gray-700">{proc.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {proc.nombre}: <span className="font-bold text-gray-800">{proc.cantidad}</span> familias <span className="text-gray-400 font-medium">({((proc.cantidad / totalJefes) * 100).toFixed(1)}%)</span>
                          </p>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45 -mt-1"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <p className="font-medium">No hay jefes de familia registrados para mostrar procedencias.</p>
            </div>
          )}
        </div>

      </div>

      {/* Planos Generales */}
      {planos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:shadow-none max-md:border-0 max-md:rounded-none max-md:p-0 max-md:-mx-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Planos Generales ({campamentoSeleccionado?.nombre || 'Ninguno'})
          </h2>
          <button
            type="button"
            onClick={handleExportPlanosPDF}
            disabled={exportandoPlanosPDF}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm mb-4 ${exportandoPlanosPDF
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-caracas-red hover:bg-red-800 text-white'
              }`}
          >
            {exportandoPlanosPDF ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {exportandoPlanosPDF ? 'Generando...' : 'Exportar PDF Planos'}
          </button>

          <div className="space-y-6">
            {planos.map((plano, index) => {
              const expandido = planosExpandidos[index] ?? true;
              return (
                <div key={index}>
                  <button
                    type="button"
                    onClick={() => setPlanosExpandidos(prev => ({ ...prev, [index]: !expandido }))}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-2"
                  >
                    <span className="font-medium text-gray-700 text-sm">{plano.nombre}</span>
                    <span className="text-xs text-gray-400">{expandido ? '▲' : '▼'}</span>
                  </button>
                  {expandido && (
                    <div className={isMobile ? (index % 2 === 0 ? 'bg-[#FFF8E7] py-4' : 'bg-transparent py-4') : ''}>
                    <PlanoGeneralViewer
                      ref={(el) => { planosCanvasRefs.current[index] = el; }}
                      croquisData={plano.croquis_data || '{}'}
                      planoNombre={plano.nombre}
                width={isMobile ? 400 : 1500}
                      height={700}
                    />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribucion del Campamento — Croquis por Modulo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-md:bg-transparent max-md:shadow-none max-md:border-0 max-md:rounded-none max-md:px-4 max-md:py-4">
        <h2 className="text-[16.5px] font-semibold text-gray-800 mb-2 break-words">
          Distribucion del Campamento ({campamentoSeleccionado?.nombre || 'Ninguno'})
        </h2>
        <button
          type="button"
          onClick={handleExportCroquisPDF}
          disabled={exportandoPDF}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm mb-4 ${exportandoPDF
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-caracas-red hover:bg-red-800 text-white'
            }`}
        >
          {exportandoPDF ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileDown size={16} />
          )}
          {exportandoPDF ? 'Generando...' : 'Exportar PDF Impresión'}
        </button>
        {/* Resumen real desde croquis */}
        {(totalesCroquis.literas > 0 || totalesCroquis.individuales > 0 || totalesCroquis.duplex > 0) && (
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#3B82F6]" />
              <span className="font-medium">{totalesCroquis.literas}</span> Literas
              <span className="text-xs text-gray-400">
                {tipoContabilizacion === 'cama' ? `(${totalesCroquis.literas * 2} camas)` : `(${totalesCroquis.literas} elem.)`}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10B981]" />
              <span className="font-medium">{totalesCroquis.individuales}</span> Individuales
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#F59E0B]" />
              <span className="font-medium">{totalesCroquis.duplex}</span> Duplex
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#6B7280]" />
              <span className="font-medium">{disponiblesCroquis}</span> Disponibles
            </span>
          </div>
        )}
      </div>

      <div className="max-md:p-0 max-md:-mx-4">
        {modulosConOffset.length > 0 ? (
          <div className="space-y-8">
            {modulosConOffset.map(({ modulo, offset }, index) => {
              const tiposModulo = contarTiposDesdeCroquis(modulo.croquis_data || '');
              const totalCamasModulo = tipoContabilizacion === 'cama'
                ? tiposModulo.literas * 2 + tiposModulo.individuales + tiposModulo.duplex
                : tiposModulo.literas + tiposModulo.individuales + tiposModulo.duplex;
              const elementosModulo = countElements(modulo.croquis_data || '', tipoContabilizacion);
              const minCamaModulo = offset + 1;
              const maxCamaModulo = offset + elementosModulo;
              let ocupadasModulo = 0;
              uniqueOccupiedBedsSet.forEach(b => {
                const n = parseInt(b, 10);
                if (n >= minCamaModulo && n <= maxCamaModulo) ocupadasModulo++;
              });
              const disponiblesModulo = Math.max(0, totalCamasModulo - ocupadasModulo);
              return (
              <div key={modulo.id} className={isMobile ? (index % 2 === 0 ? 'bg-[#FFF8E7] px-4 py-4' : 'bg-transparent px-4 py-4') : ''}>
              <CroquisViewer
                ref={(el) => { croquisCanvasRefs.current[index] = el; }}
                croquisData={modulo.croquis_data || '{}'}
                moduloNombre={modulo.nombre}
                elementNumberOffset={offset}
                width={1500}
                height={isMobile ? 1500 : 800}
                portrait={isMobile}
                tipoContabilizacion={tipoContabilizacion}
                occupiedBeds={occupiedBeds}
                bedOccupants={bedOccupants}
                literasCount={tiposModulo.literas}
                individualesCount={tiposModulo.individuales}
                duplexCount={tiposModulo.duplex}
                disponiblesModulo={disponiblesModulo}
              />
              </div>
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors">
            <Tent size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-gray-500">No hay modulos configurados para este campamento.</p>
            <p className="text-sm text-gray-400 mt-1">Ve al modulo Constructor para crear un campamento con modulos y croquis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
