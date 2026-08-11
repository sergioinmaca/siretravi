import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ShieldOff, Settings, CalendarRange } from 'lucide-react';
import dayjs from '../lib/dayjs';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchSlots,
  fetchMenu,
  fetchPresentes,
  crearComida,
  crearComidas,
  actualizarComida,
  eliminarComida,
  guardarSlots,
} from '../lib/cocina';
import VistaSemanal from '../components/cocina/VistaSemanal';
import EditarComidaModal from '../components/cocina/EditarComidaModal';
import CompletarSemanaModal from '../components/cocina/CompletarSemanaModal';
import ConfigHorariosModal from '../components/cocina/ConfigHorariosModal';
import type { CocinaSlot, ComidaMenu, TipoComida } from '../types';

const getMonday = (d: dayjs.Dayjs) => {
  const day = d.day();
  return day === 0 ? d.add(-6, 'day') : d.add(1 - day, 'day');
};

interface CeldaEdicion {
  fecha: string;
  tipo: TipoComida;
  comida: ComidaMenu | null;
}

export default function Cocina() {
  const { campamentoSeleccionado } = useCampamento();
  const { usuarioActual, tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Cocina', campamentoSeleccionado.id, 'Ver')
    : true;

  const puedeCrear = campamentoSeleccionado
    ? tienePermisoPorCampamento('Cocina', campamentoSeleccionado.id, 'Crear')
    : false;
  const puedeModificar = campamentoSeleccionado
    ? tienePermisoPorCampamento('Cocina', campamentoSeleccionado.id, 'Modificar')
    : false;
  const puedeEliminar = campamentoSeleccionado
    ? tienePermisoPorCampamento('Cocina', campamentoSeleccionado.id, 'Eliminar')
    : false;

  const [semanaActual, setSemanaActual] = useState(() => getMonday(dayjs().tz('America/Caracas')));
  const [slots, setSlots] = useState<CocinaSlot[]>([]);
  const [comidas, setComidas] = useState<ComidaMenu[]>([]);
  const [presentes, setPresentes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [celdaEdicion, setCeldaEdicion] = useState<CeldaEdicion | null>(null);
  const [isCompletarOpen, setIsCompletarOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const campamentoId = campamentoSeleccionado?.id;

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => semanaActual.add(i, 'day')),
    [semanaActual]
  );

  const fechaDesde = semanaActual.format('YYYY-MM-DD');
  const fechaHasta = semanaActual.add(6, 'day').format('YYYY-MM-DD');
  const hoy = dayjs().tz('America/Caracas').format('YYYY-MM-DD');

  useEffect(() => {
    if (!campamentoId) return;
    setLoading(true);
    Promise.all([fetchSlots(campamentoId), fetchPresentes(campamentoId)])
      .then(([slotsData, presentesData]) => {
        setSlots(slotsData);
        setPresentes(presentesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [campamentoId]);

  useEffect(() => {
    if (!campamentoId) return;
    fetchMenu(campamentoId, fechaDesde, fechaHasta)
      .then(setComidas)
      .catch(console.error);
  }, [campamentoId, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (!campamentoId) return;
    setSemanaActual(getMonday(dayjs().tz('America/Caracas')));
  }, [campamentoId]);

  const mapa = useMemo(() => {
    const m = new Map<string, ComidaMenu>();
    comidas.forEach((c) => m.set(`${c.fecha}|${c.tipo}`, c));
    return m;
  }, [comidas]);

  const handleCellClick = useCallback((fecha: string, tipo: TipoComida, comida: ComidaMenu | null) => {
    setCeldaEdicion({ fecha, tipo, comida });
  }, []);

  const handleSaveCelda = async (data: {
    menu: string;
    bebida: string;
    hora_servicio: string;
    raciones: number;
    responsable?: string;
  }) => {
    if (!campamentoSeleccionado || !celdaEdicion) return;

    if (celdaEdicion.comida) {
      const actualizada = await actualizarComida(celdaEdicion.comida.id, data);
      setComidas((prev) => prev.map((c) => (c.id === actualizada.id ? actualizada : c)));
    } else {
      const nueva = await crearComida({
        campamento_id: campamentoSeleccionado.id,
        fecha: celdaEdicion.fecha,
        tipo: celdaEdicion.tipo,
        ...data,
      });
      setComidas((prev) => [...prev, nueva]);
    }
  };

  const handleDeleteCelda = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta comida?')) return;
    await eliminarComida(id);
    setComidas((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCompletarSemana = async (entries: {
    fecha: string;
    tipo: TipoComida;
    menu: string;
    bebida: string;
    hora_servicio: string;
    raciones: number;
    responsable?: string;
  }[]) => {
    if (!campamentoSeleccionado) return { creadas: 0, omitidas: entries.length };

    const existentes = new Set(comidas.map((c) => `${c.fecha}|${c.tipo}`));
    const nuevas = entries.filter((en) => !existentes.has(`${en.fecha}|${en.tipo}`));
    const omitidas = entries.length - nuevas.length;

    if (nuevas.length === 0) {
      return { creadas: 0, omitidas };
    }

    const insertadas = await crearComidas(
      nuevas.map((en) => ({ campamento_id: campamentoSeleccionado.id, ...en }))
    );
    setComidas((prev) => [...prev, ...insertadas]);
    return { creadas: insertadas.length, omitidas };
  };

  const handleConfigSave = async (slotsData: {
    tipo: TipoComida;
    activo: boolean;
    hora_servicio: string;
  }[]) => {
    if (!campamentoSeleccionado) return;
    const actualizados = await guardarSlots(campamentoSeleccionado.id, slotsData);
    setSlots(actualizados);
  };

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">
          No tienes permisos para ver la cocina de {campamentoSeleccionado?.nombre}
        </p>
      </div>
    );
  }

  if (!campamentoSeleccionado) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin campamento seleccionado</p>
        <p className="text-sm text-gray-400 mt-1">Selecciona un campamento en la barra superior</p>
      </div>
    );
  }

  const slotsActivos = slots.filter((s) => s.activo);
  const semanaVacia = !loading && comidas.length === 0;

  const navegarAtras = () => setSemanaActual((prev) => prev.add(-7, 'day'));
  const navegarAdelante = () => setSemanaActual((prev) => prev.add(7, 'day'));
  const irHoy = () => setSemanaActual(getMonday(dayjs().tz('America/Caracas')));

  return (
    <div className="flex-1 grid grid-rows-[auto_auto_1fr] gap-1.5 min-h-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Cocina</h1>
        <div className="flex items-center gap-2">
          {(puedeCrear || puedeModificar) && (
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Settings size={18} />
              Horarios
            </button>
          )}
          {puedeCrear && (
            <button
              onClick={() => setIsCompletarOpen(true)}
              className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md"
            >
              <CalendarRange size={18} />
              Completar Semana
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={navegarAtras}
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-700 min-w-[220px] text-center">
          Semana del {dias[0].format('DD/MM/YYYY')} al {dias[6].format('DD/MM/YYYY')}
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
        <span className="ml-2 text-xs text-gray-400">
          Raciones por defecto: <span className="font-semibold text-gray-600">{presentes}</span> presentes
        </span>
      </div>

      {semanaVacia && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>Sin menú esta semana.</span>
          {puedeCrear && (
            <button
              onClick={() => setIsCompletarOpen(true)}
              className="text-caracas-red font-semibold hover:underline"
            >
              Completar semana
            </button>
          )}
        </div>
      )}

      {loading && slots.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400">
          <p className="text-lg font-medium">Cargando menú...</p>
        </div>
      ) : (
        <VistaSemanal
          dias={dias}
          slots={slotsActivos}
          mapa={mapa}
          hoy={hoy}
          puedeCrear={puedeCrear}
          puedeModificar={puedeModificar}
          puedeEliminar={puedeEliminar}
          onCellClick={handleCellClick}
          onDelete={handleDeleteCelda}
        />
      )}

      <EditarComidaModal
        isOpen={!!celdaEdicion}
        campamentoId={campamentoSeleccionado.id}
        fecha={celdaEdicion?.fecha || ''}
        tipo={celdaEdicion?.tipo || 'desayuno'}
        comida={celdaEdicion?.comida || null}
        slotHora={
          slots.find((s) => s.tipo === celdaEdicion?.tipo)?.hora_servicio || '07:00'
        }
        racionesDefault={presentes}
        campamentoNombre={campamentoSeleccionado.nombre}
        soloLectura={!puedeCrear && !puedeModificar}
        puedeEliminar={puedeEliminar}
        onClose={() => setCeldaEdicion(null)}
        onSave={handleSaveCelda}
        onDelete={handleDeleteCelda}
      />

      <CompletarSemanaModal
        isOpen={isCompletarOpen}
        campamentoId={campamentoSeleccionado.id}
        campamentoNombre={campamentoSeleccionado.nombre}
        dias={dias}
        slots={slotsActivos}
        racionesDefault={presentes}
        responsableDefault={usuarioActual ? `${usuarioActual.nombres} ${usuarioActual.apellidos}` : ''}
        onClose={() => setIsCompletarOpen(false)}
        onSave={handleCompletarSemana}
      />

      <ConfigHorariosModal
        isOpen={isConfigOpen}
        campamentoNombre={campamentoSeleccionado.nombre}
        slots={slots}
        onClose={() => setIsConfigOpen(false)}
        onSave={handleConfigSave}
      />
    </div>
  );
}
