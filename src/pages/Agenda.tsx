import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, ShieldOff, Edit, FileDown } from 'lucide-react';
import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { fetchEventos, fetchCategorias, crearEvento, expandirPermanentes, agruparPorDia } from '../lib/eventos';
import { formatTime12h, formatHourLabel } from '../lib/formatTime';
import CalendarioMensual from '../components/agenda/CalendarioMensual';
import CalendarioSemanal from '../components/agenda/CalendarioSemanal';
import CrearEventoModal from '../components/agenda/CrearEventoModal';
import EditorEventosModal from '../components/agenda/EditorEventosModal';
import type { Evento, CategoriaEvento, EventoOcurrencia } from '../types';

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
    fetchCategorias().then(setCategorias).catch(console.error);
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

  const getCategoriaColor = (categoriaId?: string, tipo?: string): string => {
    if (categoriaId) {
      const cat = categorias.find(c => c.id === categoriaId);
      if (cat) return cat.color;
    }
    return tipo === 'permanente' ? '#A855F7' : '#3B82F6';
  };

  const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

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
    const pdf = new jsPDF('landscape', 'mm', 'letter');
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const m = 5;

    const fx = (pdf.internal as any).scaleFactor as number;
    const tw = (t: string) => pdf.getStringUnitWidth(t) * pdf.getFontSize() / fx;
    const trunc = (t: string, maxW: number) => {
      if (tw(t) <= maxW) return t;
      for (let i = t.length; i > 0; i--) {
        const s = t.slice(0, i) + '...';
        if (tw(s) <= maxW) return s;
      }
      return '...';
    };

    const getMonday = (d: dayjs.Dayjs) => {
      const day = d.day();
      return day === 0 ? d.add(-6, 'day') : d.add(1 - day, 'day');
    };
    const getCol = (d: number) => d === 0 ? 6 : d - 1;
    const timeToHours = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h + m / 60;
    };

    try {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${campamentoSeleccionado?.nombre || ''}`, m, m + 5);
      pdf.setFontSize(8);
      pdf.text(`Agenda ${tituloPeriodo()}`, m, m + 9);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generado: ${dayjs().format('DD/MM/YYYY')}`, m, m + 13);

      const categoriasEnRango = new Map<string, CategoriaEvento>();
      for (const e of eventos) {
        if (e.categoria_id) {
          const cat = categorias.find(c => c.id === e.categoria_id);
          if (cat && !categoriasEnRango.has(cat.id)) categoriasEnRango.set(cat.id, cat);
        }
      }

      const catsArr = Array.from(categoriasEnRango.values());
      const legendX = pw / 2;
      const legendY = m + 5;
      const legendCols = 3;
      const rightW = pw - m - legendX;
      const legendItemW = rightW / legendCols;
      catsArr.forEach((cat, idx) => {
        const col = idx % legendCols;
        const row = Math.floor(idx / legendCols);
        const x = legendX + col * legendItemW;
        const y = legendY + row * 5;
        const rgb = hexToRgb(cat.color);
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.circle(x, y, 1.5, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(cat.nombre, x + 3, y + 1);
      });
      const legendRows = Math.ceil(catsArr.length / legendCols);
      const calY = Math.max(m + 17, legendY + legendRows * 5 + 2);
      const dayH = 8;
      let calGridH = 0;

      if (vista === 'mes') {
        const inicioMes = currentDate.startOf('month');
        const finMes = currentDate.endOf('month');
        const inicioCal = getMonday(inicioMes.startOf('week'));
        const finCal = (() => {
          const eow = finMes.endOf('week');
          return eow.day() === 0 ? eow : eow.add(7 - eow.day(), 'day');
        })();

        const semanas: dayjs.Dayjs[][] = [];
        let actual = inicioCal;
        while (actual.isBefore(finCal) || actual.isSame(finCal, 'day')) {
          const s: dayjs.Dayjs[] = [];
          for (let i = 0; i < 7; i++) { s.push(actual); actual = actual.add(1, 'day'); }
          semanas.push(s);
        }

        const cellW = (pw - m * 2) / 7;
        const availH = ph - m - calY - dayH - m;
        const calPct = 0.95;
        const calH = availH * calPct;
        const rowH = calH / semanas.length;
        calGridH = semanas.length * rowH;
        const DIAS_H = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        const eventSlot = 5;
        const numberZone = 6.5;
        const fitNoBadge = Math.max(1, Math.floor((rowH - numberZone) / eventSlot));
        const fitWithBadge = Math.max(1, Math.floor((rowH - numberZone - 2) / eventSlot));

        for (let d = 0; d < 7; d++) {
          const cx = m + d * cellW;
          pdf.setFillColor(243, 244, 246);
          pdf.rect(cx, calY, cellW, dayH, 'F');
          pdf.setDrawColor(229, 231, 235);
          pdf.rect(cx, calY, cellW, dayH, 'S');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(107, 114, 128);
          pdf.text(DIAS_H[d], cx + cellW / 2, calY + dayH / 2 + 1.5, { align: 'center' });
        }

        for (let s = 0; s < semanas.length; s++) {
          for (let d = 0; d < 7; d++) {
            const dia = semanas[s][d];
            const dateStr = dia.format('YYYY-MM-DD');
            const cx = m + d * cellW;
            const cy = calY + dayH + s * rowH;
            const esHoy = dateStr === dayjs().format('YYYY-MM-DD');
            const esMesActual = dia.isSame(inicioMes, 'month');
            const evts = eventosPorDia.get(dateStr) || [];

            pdf.setDrawColor(229, 231, 235);
            pdf.rect(cx, cy, cellW, rowH, 'S');

            if (esHoy) {
              pdf.setFillColor(239, 246, 255);
              pdf.rect(cx + 0.5, cy + 0.5, cellW - 1, rowH - 1, 'F');
            }

            if (esHoy) {
              pdf.setFillColor(37, 99, 235);
              pdf.circle(cx + 4, cy + 3.5, 3, 'F');
              pdf.setTextColor(255, 255, 255);
            } else {
              pdf.setTextColor(esMesActual ? 55 : 156, esMesActual ? 65 : 163, esMesActual ? 75 : 174);
            }
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text(dia.format('D'), cx + 4, cy + 4.5, { align: 'center' });

            const mostrarMas = evts.length > fitNoBadge;
            const visibleCount = mostrarMas ? fitWithBadge : Math.min(evts.length, fitNoBadge);
            const sobra = evts.length - visibleCount;

            evts.slice(0, visibleCount).forEach((e, i) => {
              const ey = cy + numberZone + i * eventSlot;
              const color = getCategoriaColor(e.categoria_id, e.tipo);
              const rgb = hexToRgb(color);
              pdf.setFillColor(rgb.r, rgb.g, rgb.b);
              pdf.roundedRect(cx + 1, ey, cellW - 2, 4.5, 0.5, 0.5, 'F');
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(7);
              pdf.setFont('helvetica', 'normal');
              const tituloTrunc = trunc(e.titulo, cellW - 4);
              pdf.text(tituloTrunc, cx + cellW / 2, ey + 3.2, { align: 'center' });
            });

            if (sobra > 0) {
              pdf.setFontSize(7);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(107, 114, 128);
              const sy = cy + numberZone + visibleCount * eventSlot + 1;
              pdf.text(`+${sobra} más`, cx + cellW / 2, sy, { align: 'center' });
            }
          }
        }
      } else {
        const HORAS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const inicioSem = getMonday(currentDate);
        const diasSem: dayjs.Dayjs[] = [];
        for (let i = 0; i < 7; i++) diasSem.push(inicioSem.add(i, 'day'));

        const hourColW = 13;
        const dayColW = (pw - m - hourColW - m) / 7;
        const availH = ph - m - calY - dayH - m;
        const calH = availH * 0.68;
        const hourRowH = calH / HORAS.length;
        calGridH = HORAS.length * hourRowH;
        const gridY = calY + dayH;

        // Day headers (two-line format)
        for (let d = 0; d < 7; d++) {
          const cx = m + hourColW + d * dayColW;
          const dia = diasSem[d];
          const dateStr = dia.format('YYYY-MM-DD');
          const esHoy = dateStr === dayjs().format('YYYY-MM-DD');

          pdf.setFillColor(243, 244, 246);
          pdf.rect(cx, calY, dayColW, dayH, 'F');
          pdf.setDrawColor(229, 231, 235);
          pdf.rect(cx, calY, dayColW, dayH, 'S');

          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          pdf.text(DIAS_SEM[d], cx + dayColW / 2, calY + 2, { align: 'center' });

          if (esHoy) {
            pdf.setFillColor(37, 99, 235);
            pdf.circle(cx + dayColW / 2, calY + dayH / 2 + 1, 3, 'F');
            pdf.setTextColor(255, 255, 255);
          } else {
            pdf.setTextColor(55, 65, 81);
          }
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text(dia.format('D'), cx + dayColW / 2, calY + dayH / 2 + 3, { align: 'center' });
        }

        // Hour labels + grid
        pdf.setFillColor(243, 244, 246);
        pdf.rect(m, calY, hourColW, dayH, 'F');

        for (let h = 0; h < HORAS.length; h++) {
          const hora = HORAS[h];
          const ry = gridY + h * hourRowH;

          pdf.setDrawColor(229, 231, 235);
          pdf.rect(m, ry, hourColW, hourRowH, 'S');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          pdf.text(formatHourLabel(hora), m + hourColW - 1, ry + hourRowH / 2 + 1.2, { align: 'right' });

          for (let d = 0; d < 7; d++) {
            const cx = m + hourColW + d * dayColW;
            const dateStr = diasSem[d].format('YYYY-MM-DD');
            const esHoy = dateStr === dayjs().format('YYYY-MM-DD');

            pdf.setDrawColor(229, 231, 235);
            pdf.rect(cx, ry, dayColW, hourRowH, 'S');

            if (esHoy) {
              pdf.setFillColor(239, 246, 255);
              pdf.rect(cx + 0.5, ry + 0.5, dayColW - 1, hourRowH - 1, 'F');
            }
          }
        }

        // Events con stacking (posicionados por hora exacta)
        const stackOffset = 2.5;
        for (let d = 0; d < 7; d++) {
          const dateStr = diasSem[d].format('YYYY-MM-DD');
          const cx = m + hourColW + d * dayColW;

          const evts = eventosPorDia.get(dateStr) || [];
          if (evts.length === 0) continue;

          const sorted = [...evts].sort((a, b) => {
            const c = a.hora_inicio.localeCompare(b.hora_inicio);
            if (c !== 0) return c;
            return (b.hora_fin || '24:00').localeCompare(a.hora_fin || '24:00');
          });

          const stack: number[] = [];

          for (const e of sorted) {
            const startH = timeToHours(e.hora_inicio);
            const endH = Math.min(timeToHours(e.hora_fin || '22:00'), 22);
            const top = Math.max(0, startH - 6) * hourRowH;
            const h = Math.max(hourRowH * 0.3, (endH - startH) * hourRowH);

            while (stack.length > 0 && stack[0] <= startH) {
              stack.shift();
            }

            const level = stack.length;
            stack.push(endH);
            stack.sort((a, b) => a - b);

            const left = level * stackOffset;
            const w = dayColW - left - 0.5;

            if (w < 5) continue;

            const color = getCategoriaColor(e.categoria_id, e.tipo);
            const rgb = hexToRgb(color);
            const ey = gridY + top;

            pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            pdf.roundedRect(cx + left, ey, w, h, 0.5, 0.5, 'F');
            pdf.setTextColor(255, 255, 255);

            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'bold');
            pdf.text(trunc(e.titulo, w - 2), cx + left + 1.5, ey + 2);
          }
        }
      }

      if (vista === 'mes') {
        pdf.addPage();
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${campamentoSeleccionado?.nombre || ''}`, m, m + 5);
        pdf.setFontSize(8);
        pdf.text(`Agenda ${tituloPeriodo()} - Listado de eventos`, pw - m, m + 5, { align: 'right' });
      } else if (vista === 'semana') {
        pdf.addPage();
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${campamentoSeleccionado?.nombre || ''}`, m, m + 5);
        pdf.setFontSize(8);
        pdf.text(`Agenda ${tituloPeriodo()} - Listado de eventos`, pw - m, m + 5, { align: 'right' });
      }

      const actY = (vista === 'mes' || vista === 'semana') ? m + 16 : calY + dayH + calGridH + 4;
      const DIAS_N = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const gap = 1;
      const numCols = vista === 'mes' ? 6 : 7;
      const colW = (pw - m * 2 - (numCols - 1) * gap) / numCols;
      const colXs = Array.from({ length: numCols }, (_, i) => m + i * (colW + gap));

      const occs = expandirPermanentes(eventos, fechaDesde, fechaHasta);
      const agrup = agruparPorDia(occs);
      const dias = Array.from(agrup.keys()).sort();

      if (dias.length > 0) {
        const finAct = vista === 'semana' ? m + 16 + (ph - 2 * m - 16) * 0.55 : ph - m;

        pdf.setDrawColor(200, 200, 200);
        for (let i = 1; i < numCols; i++) {
          pdf.line(colXs[i], actY, colXs[i], finAct);
        }

        const colYs = Array(numCols).fill(actY);

        const renderEntry = (col: number, e: EventoOcurrencia) => {
          if (colYs[col] > finAct - 2) return;
          const hStr = e.hora_fin
            ? `${formatTime12h(e.hora_inicio)} - ${formatTime12h(e.hora_fin)}`
            : formatTime12h(e.hora_inicio);
          const color = getCategoriaColor(e.categoria_id, e.tipo);
          const rgb = hexToRgb(color);
          
          pdf.setFontSize(8);
          const wrapped = pdf.splitTextToSize(e.titulo, colW - 2);
          for (let i = 0; i < wrapped.length; i++) {
            if (colYs[col] > finAct - 2) break;
            pdf.setTextColor(rgb.r, rgb.g, rgb.b);
            pdf.text(wrapped[i], colXs[col] + 2, colYs[col]);
            colYs[col] += 3.5;
          }
          
          if (colYs[col] > finAct - 2) return;
          pdf.setFontSize(7);
          pdf.setTextColor(156, 163, 175);
          pdf.text(hStr, colXs[col] + 2, colYs[col]);
          colYs[col] += 5;

          if (vista === 'semana' && e.descripcion && e.tipo !== 'permanente') {
            if (colYs[col] > finAct - 2) return;
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            const descWrapped = pdf.splitTextToSize(e.descripcion, colW - 2);
            for (const line of descWrapped) {
              if (colYs[col] > finAct - 2) break;
              pdf.text(line, colXs[col] + 2, colYs[col]);
              colYs[col] += 3;
            }
          }
        };

        if (vista === 'semana') {
          for (const dateStr of dias) {
            const dia = dayjs(dateStr);
            const col = getCol(dia.day());
            if (colYs[col] > finAct - 5) break;
            const evts = agrup.get(dateStr) || [];

            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(55, 65, 81);
            pdf.text(`${DIAS_N[col]} ${dia.format('D')}`, colXs[col], colYs[col]);
            colYs[col] += 4.5;

            pdf.setFont('helvetica', 'normal');
            for (const e of evts) renderEntry(col, e);
            colYs[col] += 1;
          }
        } else {
          const total = dias.length;
          let col = 0;
          for (let idx = 0; idx < total; idx++) {
            if (colYs[col] > finAct - 5) {
              col++;
              if (col >= numCols) break;
            }
            const dateStr = dias[idx];
            const evts = agrup.get(dateStr) || [];
            const dia = dayjs(dateStr);

            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(55, 65, 81);
            pdf.text(`${DIAS_N[getCol(dia.day())]} ${dia.format('D')}`, colXs[col], colYs[col]);
            colYs[col] += 4.5;

            pdf.setFont('helvetica', 'normal');
            for (const e of evts) {
              if (colYs[col] > finAct - 2) {
                col++;
                if (col >= numCols) break;
              }
              renderEntry(col, e);
            }
            colYs[col] += 1;
          }
        }

        if (vista === 'semana') {
          const permDesc = eventos.filter(e => e.tipo === 'permanente' && e.descripcion);
          if (permDesc.length > 0) {
            const unicos = Array.from(new Map(permDesc.map(e => [e.id, e])).values());
            const ly = finAct + 4;
            pdf.setDrawColor(200, 200, 200);
            pdf.line(m, ly, pw - m, ly);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(55, 65, 81);
            pdf.text('Eventos permanentes:', m, ly + 4);
            pdf.setFontSize(7);
            let py = ly + 9;
            for (const e of unicos) {
              if (py > ph - m - 2) break;
              const rgb = hexToRgb(getCategoriaColor(e.categoria_id, e.tipo));
              pdf.setFillColor(rgb.r, rgb.g, rgb.b);
              pdf.circle(m + 1.5, py - 0.5, 1.5, 'F');
              pdf.setTextColor(rgb.r, rgb.g, rgb.b);
              pdf.setFont('helvetica', 'bold');
              pdf.text(e.titulo + ':', m + 4, py);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(75, 85, 99);
              const descWrapped = pdf.splitTextToSize(e.descripcion as string, pw - m * 2 - 4);
              for (const line of descWrapped) {
                if (py > ph - m - 2) break;
                pdf.text(line, m + 4, py);
                py += 3;
              }
              py += 2;
            }
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
            className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            <FileDown size={16} />
            Exportar PDF Impresión
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
        <div className="min-h-0 overflow-hidden flex flex-col">
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
