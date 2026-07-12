import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, ShieldOff, Edit, FileDown } from 'lucide-react';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { fetchEventos, fetchCategorias, crearEvento, expandirPermanentes, agruparPorDia } from '../lib/eventos';
import { formatTime12h } from '../lib/formatTime';
import CalendarioMensual from '../components/agenda/CalendarioMensual';
import CalendarioSemanal from '../components/agenda/CalendarioSemanal';
import CrearEventoModal from '../components/agenda/CrearEventoModal';
import EditorEventosModal from '../components/agenda/EditorEventosModal';
import type { Evento, CategoriaEvento } from '../types';

export default function Agenda() {
  const { campamentoSeleccionado } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Agenda', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver la agenda de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }

  const tienePermisoCrear = campamentoSeleccionado
    ? tienePermisoPorCampamento('Agenda', campamentoSeleccionado.id, 'Crear')
    : false;

  const [vista, setVista] = useState<'mes' | 'semana'>('mes');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [modalDate, setModalDate] = useState<dayjs.Dayjs | undefined>();

  const rango = useMemo(() => {
    if (vista === 'mes') {
      return {
        start: currentDate.startOf('month').startOf('week'),
        end: currentDate.endOf('month').endOf('week'),
      };
    }
    return {
      start: currentDate.startOf('week'),
      end: currentDate.endOf('week'),
    };
  }, [vista, currentDate]);

  const fechaDesde = rango.start.format('YYYY-MM-DD');
  const fechaHasta = rango.end.format('YYYY-MM-DD');

  useEffect(() => {
    if (!campamentoSeleccionado) return;
    setLoading(true);
    Promise.all([
      fetchEventos(campamentoSeleccionado.id, fechaHasta),
      fetchCategorias(),
    ]).then(([evts, cats]) => {
      setEventos(evts);
      setCategorias(cats);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [campamentoSeleccionado, fechaHasta]);

  useEffect(() => {
    if (!campamentoSeleccionado) return;
    setCurrentDate(dayjs());
  }, [campamentoSeleccionado]);

  const recargarEventos = () => {
    if (!campamentoSeleccionado) return;
    fetchEventos(campamentoSeleccionado.id, fechaHasta)
      .then(setEventos)
      .catch(console.error);
  };

  const ocurrencias = useMemo(() => {
    try {
      return expandirPermanentes(eventos, fechaDesde, fechaHasta);
    } catch (err) {
      console.error('Error expandiendo permanentes:', err);
      return [];
    }
  }, [eventos, fechaDesde, fechaHasta]);

  const eventosPorDia = useMemo(
    () => agruparPorDia(ocurrencias),
    [ocurrencias]
  );

  const getCategoriaNombre = (categoriaId?: string): string | null => {
    if (!categoriaId) return null;
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nombre || null;
  };

  const handleCrearEvento = async (data: {
    titulo: string;
    fecha_inicio: string;
    hora_inicio: string;
    hora_fin?: string;
    descripcion?: string;
    tipo: 'permanente' | 'unico';
    fecha_fin?: string;
    categoria_id?: string;
  }) => {
    if (!campamentoSeleccionado) return;
    try {
      const nuevo = await crearEvento({
        id_campamento: campamentoSeleccionado.id,
        ...data,
        hora_fin: data.hora_fin || undefined as any,
      });
      setEventos((prev) => [...prev, nuevo]);
    } catch (err) {
      console.error('Error en handleCrearEvento:', err);
      throw err;
    }
  };

  const handleDayClick = (date: dayjs.Dayjs) => {
    setModalDate(date);
    setIsModalOpen(true);
  };

  const navegarAtras = () => {
    setCurrentDate((prev) =>
      vista === 'mes' ? prev.subtract(1, 'month') : prev.subtract(1, 'week')
    );
  };

  const navegarAdelante = () => {
    setCurrentDate((prev) =>
      vista === 'mes' ? prev.add(1, 'month') : prev.add(1, 'week')
    );
  };

  const irHoy = () => setCurrentDate(dayjs());

  const tituloPeriodo = () => {
    if (vista === 'mes') {
      return currentDate.format('MMMM YYYY');
    }
    const start = currentDate.startOf('week');
    const end = currentDate.endOf('week');
    const mismoMes = start.month() === end.month();
    if (mismoMes) {
      return `${start.format('D')} - ${end.format('D')} ${start.format('MMMM YYYY')}`;
    }
    return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`;
  };

  const handleExportPDF = async () => {
    const calendarioEl = document.getElementById('calendario-container');
    if (!calendarioEl) return;

    try {
      const canvas = await html2canvas(calendarioEl, {
        scale: window.devicePixelRatio * 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 5;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`AGENDA - ${campamentoSeleccionado?.nombre || ''} - ${tituloPeriodo()}`, margin, margin + 5);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado: ${dayjs().format('DD/MM/YYYY')}`, margin, margin + 9);

      const categoriasEnRango = new Map<string, CategoriaEvento>();
      for (const e of eventos) {
        if (e.categoria_id) {
          const cat = categorias.find(c => c.id === e.categoria_id);
          if (cat && !categoriasEnRango.has(cat.id)) {
            categoriasEnRango.set(cat.id, cat);
          }
        }
      }

      let leyendaX = pageWidth / 2;
      const catsArray = Array.from(categoriasEnRango.values());
      for (let i = 0; i < catsArray.length; i++) {
        const cat = catsArray[i];
        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return { r, g, b };
        };
        const rgb = hexToRgb(cat.color);
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.circle(leyendaX, margin + 5, 1.5, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(cat.nombre, leyendaX + 3, margin + 6);
        leyendaX += 22;
      }

      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const headerHeight = 20;
      pdf.addImage(imgData, 'PNG', margin, margin + headerHeight, imgWidth, imgHeight);

      const actividadesY = margin + headerHeight + imgHeight + 8;
      const ocurrenciasAct = expandirPermanentes(eventos, fechaDesde, fechaHasta);
      const agrupadas = agruparPorDia(ocurrenciasAct);
      const diasAct = Array.from(agrupadas.keys()).sort();

      if (diasAct.length > 0) {
        const colWidth = (pageWidth - margin * 2) / 3;
        const DIAS_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        let colY = actividadesY;
        let col = 0;
        let maxColH = colY;

        for (const dateStr of diasAct) {
          const evts = agrupadas.get(dateStr) || [];
          const dia = dayjs(dateStr);
          const colX = margin + col * colWidth;

          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${DIAS_NAMES[dia.day()]} ${dia.format('D')}`, colX, colY);
          colY += 4;

          pdf.setFont('helvetica', 'normal');
          for (const e of evts) {
            const horaStr = e.hora_fin
              ? `${formatTime12h(e.hora_inicio)} - ${formatTime12h(e.hora_fin)}`
              : formatTime12h(e.hora_inicio);
            const catNombre = e.categoria_id ? (getCategoriaNombre(e.categoria_id) || '') : '';
            const linea = `${horaStr} · ${e.titulo}${catNombre ? ' · ' + catNombre : ''}`;
            pdf.setFontSize(6);
            pdf.text(linea, colX + 2, colY, { maxWidth: colWidth - 4 });
            colY += 3.5;
          }
          colY += 2;

          if (colY > maxColH) maxColH = colY;

          col++;
          if (col >= 3) {
            col = 0;
            colY = maxColH + 4;
          } else {
            colY = actividadesY;
          }
        }
      }

      pdf.save(`agenda-${dayjs().format('YYYY-MM-DD')}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
    }
  };

  if (!campamentoSeleccionado) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin campamento seleccionado</p>
        <p className="text-sm text-gray-400 mt-1">Selecciona un campamento en la barra superior</p>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-rows-[auto_auto_1fr] gap-1.5 min-h-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        {tienePermisoCrear && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Edit size={18} />
              Editar
            </button>
            <button
              onClick={() => {
                setModalDate(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
            >
              <Plus size={18} />
              Crear Evento
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            title="Exportar PDF"
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <FileDown size={20} />
          </button>
          <button
            onClick={navegarAtras}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-700 min-w-[180px] text-center capitalize">
            {tituloPeriodo()}
          </h2>
          <button
            onClick={navegarAdelante}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={irHoy}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Hoy
          </button>
        </div>

        <select
          value={vista}
          onChange={(e) => setVista(e.target.value as 'mes' | 'semana')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none cursor-pointer appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: '2.5rem',
          }}
        >
          <option value="mes">Mes</option>
          <option value="semana">Semana</option>
        </select>
      </div>

      {loading && eventos.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400">
          <p className="text-lg font-medium">Cargando eventos...</p>
        </div>
      ) : (
        <div id="calendario-container" className="min-h-0 overflow-hidden flex flex-col">
          {vista === 'mes' ? (
            <CalendarioMensual
              currentDate={currentDate}
              eventosPorDia={eventosPorDia}
              onDayClick={handleDayClick}
              categorias={categorias}
            />
          ) : (
            <CalendarioSemanal
              currentDate={currentDate}
              eventosPorDia={eventosPorDia}
              onDayClick={handleDayClick}
              categorias={categorias}
            />
          )}
        </div>
      )}

      <CrearEventoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCrearEvento}
        selectedDate={modalDate}
        campamentoNombre={campamentoSeleccionado.nombre}
        tienePermisoCrear={tienePermisoCrear}
      />

      <EditorEventosModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onEventoUpdated={recargarEventos}
        currentDate={currentDate}
        vista={vista}
        campamentoId={campamentoSeleccionado.id}
        campamentoNombre={campamentoSeleccionado.nombre}
        tienePermisoCrear={tienePermisoCrear}
      />
    </div>
  );
}
