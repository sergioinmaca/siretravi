import { useState, useMemo, useRef, useCallback } from 'react';
import { Users, BedDouble, Tent, Home, Baby, Heart, Sparkles, ShieldOff, FileDown, Loader2, Milk, UserCheck } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import CroquisViewer, { countElements, contarTiposDesdeCroquis } from '../components/constructor/CroquisViewer';
import jsPDF from 'jspdf';

export default function Inicio() {
  const { campamentoSeleccionado, refugiados = [], familias = [] } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

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

  const totalRefugiados = refugiadosDelCampamento.length;
  const totalHombres = refugiadosDelCampamento.filter(r => r.genero === true).length;
  const totalMujeres = refugiadosDelCampamento.filter(r => r.genero === false).length;

  const totalFamilias = campamentoSeleccionado
    ? familias.filter(f => f.campamento_id === campamentoSeleccionado.id).length
    : 0;

  // Optimización: calcular las edades de los refugiados una sola vez usando useMemo
  const refugiadosConEdad = useMemo(() => {
    const hoy = new Date();
    return refugiadosDelCampamento.map(r => {
      const nacimiento = new Date(r.fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return { ...r, edad };
    });
  }, [refugiadosDelCampamento]);

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

  const lactantes = refugiadosConEdad.filter(r => r.edad >= 0 && r.edad <= 3);
  const lactantesH = lactantes.filter(r => r.genero === true).length;
  const lactantesM = lactantes.filter(r => r.genero === false).length;

  const noLactantes = refugiadosConEdad.filter(r => r.edad >= 4 && r.edad <= 11);
  const noLactantesH = noLactantes.filter(r => r.genero === true).length;
  const noLactantesM = noLactantes.filter(r => r.genero === false).length;

  const adultos = refugiadosConEdad.filter(r =>
    (r.genero === true && r.edad >= 18 && r.edad < 60) ||
    (r.genero === false && r.edad >= 18 && r.edad < 55)
  );
  const adultosH = adultos.filter(r => r.genero === true).length;
  const adultosM = adultos.filter(r => r.genero === false).length;

  // Calcular ranking de procedencias
  const procedenciasMap = new Map<string, number>();
  refugiadosDelCampamento.forEach(r => {
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

  // Calcular offsets de numeración para encadenar números entre carpas
  const carpas = campamentoSeleccionado?.carpas || [];
  const tipoContabilizacion = campamentoSeleccionado?.tipo_contabilizacion || 'elemento';
  const carpasConOffset = carpas.map((carpa, index) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += countElements(carpas[i].croquis_data || '', tipoContabilizacion);
    }
    return { carpa, offset };
  });

  const totalesCroquis = carpas.reduce(
    (acc, carpa) => {
      const c = contarTiposDesdeCroquis(carpa.croquis_data || '');
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

      for (let i = 0; i < carpas.length; i++) {
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

        // ── Sección de carpa ──────────────────────────────────────────────────
        const carpaSectionY = statsY + 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Carpa: ${carpas[i].nombre}`, marginL, carpaSectionY);

        // Indicadores por carpa
        const tiposCarpa = contarTiposDesdeCroquis(carpas[i].croquis_data || '');
        const tipoY = carpaSectionY + 5;
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');

        pdf.setFillColor('#3B82F6');
        pdf.circle(marginL + 5, tipoY, 2, 'F');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`${tiposCarpa.literas} Literas`, marginL + 9, tipoY + 1.5);

        pdf.setFillColor('#10B981');
        pdf.circle(marginL + 60, tipoY, 2, 'F');
        pdf.text(`${tiposCarpa.individuales} Individuales`, marginL + 64, tipoY + 1.5);

        pdf.setFillColor('#F59E0B');
        pdf.circle(marginL + 115, tipoY, 2, 'F');
        pdf.text(`${tiposCarpa.duplex} Duplex`, marginL + 119, tipoY + 1.5);

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
  }, [campamentoSeleccionado, totalesCroquis, occupiedBeds, tipoContabilizacion, carpas]);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Visión General</h2>
        <p className="text-gray-500">
          Mostrando indicadores para: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Refugiados */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-red flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-red/10 rounded-xl text-caracas-red shrink-0">
            <Users size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Total de Integrantes</p>
            <p className="text-3xl font-bold text-gray-900">{totalRefugiados}</p>
            <p className="text-xs text-gray-400 mt-1">
              <span className="text-blue-600 font-medium">{totalHombres}</span> H · <span className="text-pink-600 font-medium">{totalMujeres}</span> M
            </p>
          </div>
        </div>

        {/* Total Familias */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0">
            <Home size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Familias</p>
            <p className="text-3xl font-bold text-gray-900">{totalFamilias}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              Grupos familiares
            </p>
          </div>
        </div>

        {/* Capacidad / Camas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-green flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-green/10 rounded-xl text-caracas-green shrink-0">
            <BedDouble size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Camas Disponibles</p>
            <p className="text-3xl font-bold text-gray-900">{disponiblesCroquis}</p>
            <p className="text-xs text-gray-400 mt-1">
              <span className="text-caracas-red font-medium">{uniqueOccupiedBedsSet.size}</span> Ocupadas / {totalCamasCroquis} Totales
            </p>
          </div>
        </div>

        {/* Carpas Activas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-caracas-blue flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-caracas-blue/10 rounded-xl text-caracas-blue shrink-0">
            <Tent size={32} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-500 truncate">Carpas Activas</p>
            <p className="text-3xl font-bold text-gray-900">{campamentoSeleccionado?.carpas?.length || 0}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              Instaladas
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores Demográficos Detallados */}
      <div className="space-y-6">
        {/* Cards de Niñez */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Niños (0-11) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-xl text-orange-500">
                <Baby size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Niños</p>
                <p className="text-2xl font-bold text-gray-900">{ninos.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              0 a 11 años · <span className="text-blue-600 font-medium">{ninosH} H</span> · <span className="text-pink-600 font-medium">{ninosM} M</span>
            </p>
          </div>

          {/* Niños Lactantes (0-3) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-sky-100 rounded-xl text-sky-500">
                <Milk size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Niños Lactantes</p>
                <p className="text-2xl font-bold text-gray-900">{lactantes.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              0 a 3 años · <span className="text-blue-600 font-medium">{lactantesH} H</span> · <span className="text-pink-600 font-medium">{lactantesM} M</span>
            </p>
          </div>

          {/* No Lactantes (4-11) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-300 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                <Baby size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No Lactantes</p>
                <p className="text-2xl font-bold text-gray-900">{noLactantes.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              4 a 11 años · <span className="text-blue-600 font-medium">{noLactantesH} H</span> · <span className="text-pink-600 font-medium">{noLactantesM} M</span>
            </p>
          </div>
        </div>

        {/* Adolescentes, Adultos, Adulto Mayor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Adolescentes (12-17) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
                <Sparkles size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Adolescentes</p>
                <p className="text-2xl font-bold text-gray-900">{adolescentes.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              12 a 17 años · <span className="text-blue-600 font-medium">{adolescentesH} H</span> · <span className="text-pink-600 font-medium">{adolescentesM} M</span>
            </p>
          </div>

          {/* Adultos (18-59 H / 18-54 M) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-400 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <UserCheck size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Adultos</p>
                <p className="text-2xl font-bold text-gray-900">{adultos.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              H 18-59 / M 18-54 · <span className="text-blue-600 font-medium">{adultosH} H</span> · <span className="text-pink-600 font-medium">{adultosM} M</span>
            </p>
          </div>

          {/* Adulto Mayor */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-rose-400 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-500">
                <Heart size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Adulto Mayor</p>
                <p className="text-2xl font-bold text-gray-900">{adultoMayor.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              H &ge;60 / M &ge;55 · <span className="text-blue-600 font-medium">{adultoMayorH} H</span> · <span className="text-pink-600 font-medium">{adultoMayorM} M</span>
            </p>
          </div>
        </div>
      </div>

      {/* Ranking de Procedencias */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                  className={`flex items-center gap-3 group relative ${hoveredBar === index ? 'z-50' : 'z-0'}`}
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <p className="text-xs font-semibold text-gray-500 text-right w-36 shrink-0 truncate uppercase" title={proc.nombre}>
                    {proc.nombre}
                  </p>
                  <div className="flex-1 h-7 bg-gray-50 rounded-md relative">
                    <div
                      className="h-full rounded-md transition-all duration-500 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        minWidth: '24px',
                        opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.4
                      }}
                    />
                    {/* Tooltip */}
                    {hoveredBar === index && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-14 bg-white border border-gray-200 shadow-xl rounded-lg px-4 py-2 z-50 whitespace-nowrap pointer-events-none">
                        <p className="text-xs font-bold text-gray-700">{proc.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {proc.nombre}: <span className="font-bold text-gray-800">{proc.cantidad}</span> personas <span className="text-gray-400 font-medium">({((proc.cantidad / totalRefugiados) * 100).toFixed(1)}%)</span>
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
            <p className="font-medium">No hay integrantes registrados para mostrar procedencias.</p>
          </div>
        )}
      </div>

      {/* Distribución del Campamento — Croquis por Carpa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Distribución del Campamento ({campamentoSeleccionado?.nombre || 'Ninguno'})
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

        {carpasConOffset.length > 0 ? (
          <div className="space-y-8">
            {carpasConOffset.map(({ carpa, offset }, index) => {
              const tiposCarpa = contarTiposDesdeCroquis(carpa.croquis_data || '');
              const totalCamasCarpa = tipoContabilizacion === 'cama'
                ? tiposCarpa.literas * 2 + tiposCarpa.individuales + tiposCarpa.duplex
                : tiposCarpa.literas + tiposCarpa.individuales + tiposCarpa.duplex;
              const elementosCarpa = countElements(carpa.croquis_data || '', tipoContabilizacion);
              const minCamaCarpa = offset + 1;
              const maxCamaCarpa = offset + elementosCarpa;
              let ocupadasCarpa = 0;
              uniqueOccupiedBedsSet.forEach(b => {
                const n = parseInt(b, 10);
                if (n >= minCamaCarpa && n <= maxCamaCarpa) ocupadasCarpa++;
              });
              const disponiblesCarpa = Math.max(0, totalCamasCarpa - ocupadasCarpa);
              return (
              <CroquisViewer
                ref={(el) => { croquisCanvasRefs.current[index] = el; }}
                key={carpa.id}
                croquisData={carpa.croquis_data || '{}'}
                carpaNombre={carpa.nombre}
                elementNumberOffset={offset}
                width={1100}
                height={700}
                tipoContabilizacion={tipoContabilizacion}
                occupiedBeds={occupiedBeds}
                bedOccupants={bedOccupants}
                literasCount={tiposCarpa.literas}
                individualesCount={tiposCarpa.individuales}
                duplexCount={tiposCarpa.duplex}
                disponiblesCarpa={disponiblesCarpa}
              />
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors">
            <Tent size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-gray-500">No hay carpas configuradas para este campamento.</p>
            <p className="text-sm text-gray-400 mt-1">Ve al módulo Constructor para crear un campamento con carpas y croquis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
