import { useState, useEffect } from 'react';
import { X, Save, Activity, Gift, HeartHandshake, Search, User } from 'lucide-react';
import { toDateInput } from '../../lib/formatDate';
import { formatCedula } from '../../lib/formatCedula';
import { formatAge } from '../../lib/formatAge';
import DateInput from '../ui/DateInput';
import { supabase } from '../../lib/supabase';
import { agregarRegistroAtencion } from '../../lib/salud';
import { useCampamento } from '../../context/CampamentoContext';
import type { Refugiado } from '../../types';

interface AtencionMedicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  historiaClinicaId?: string;
  refugiadoNombre?: string;
}

type TipoAtencion = 'medica' | 'beneficio' | 'donacion';

const TIPOS: { value: TipoAtencion; label: string; icon: any }[] = [
  { value: 'medica', label: 'Atención Médica', icon: Activity },
  { value: 'beneficio', label: 'Beneficio', icon: Gift },
  { value: 'donacion', label: 'Donación', icon: HeartHandshake },
];

const CANTIDAD_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

function buildFilasVacias(cantidad: number) {
  if (cantidad > 10) cantidad = 10;
  return Array.from({ length: cantidad }, () => ({
    especialidad: '', diagnostico: '', tratamiento: '',
    tipo: '', descripcion: '', entregadoPor: '', fecha: '',
  }));
}

export default function AtencionMedicaModal({ isOpen, onClose, historiaClinicaId, refugiadoNombre }: AtencionMedicaModalProps) {
  const { campamentoSeleccionado, refugiados } = useCampamento();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [tipo, setTipo] = useState<TipoAtencion>('medica');
  const [fechaAtencion, setFechaAtencion] = useState(toDateInput(new Date()));

  // Signos vitales (solo para medica)
  const [presionArterial, setPresionArterial] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState('');
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [saturacionOxigeno, setSaturacionOxigeno] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Sección dinámica
  const [seccionActiva, setSeccionActiva] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [filas, setFilas] = useState(buildFilasVacias(1));

  // Buscador de refugiado (cuando no viene historiaClinicaId)
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Refugiado[]>([]);
  const [refugiadoEncontrado, setRefugiadoEncontrado] = useState<Refugiado | null>(null);
  const [hcIdLocal, setHcIdLocal] = useState('');
  const campId = campamentoSeleccionado?.id || '';

  useEffect(() => {
    if (isOpen) {
      setTipo('medica');
      setFechaAtencion(toDateInput(new Date()));
      setPresionArterial('');
      setTemperatura('');
      setFrecuenciaCardiaca('');
      setPeso('');
      setTalla('');
      setSaturacionOxigeno('');
      setObservaciones('');
      setSeccionActiva(false);
      setCantidad(1);
      setFilas(buildFilasVacias(1));
      setErrorMsg('');
      if (!historiaClinicaId) {
        setCedulaBusqueda('');
        setResultadosBusqueda([]);
        setRefugiadoEncontrado(null);
        setHcIdLocal('');
      }
    }
  }, [isOpen, historiaClinicaId]);

  const necesitaBusqueda = !historiaClinicaId && !hcIdLocal;

  const buscarRefugiado = async () => {
    if (!cedulaBusqueda.trim()) return;
    const q = cedulaBusqueda.trim().toUpperCase();
    const resultados = refugiados.filter(r => {
      if (r.campamento_id !== campId) return false;
      const nombres = (r.nombres || '').toUpperCase();
      const apellidos = (r.apellidos || '').toUpperCase();
      const cedulaStr = r.cedula?.toString() || '';
      return nombres.includes(q) || apellidos.includes(q) || cedulaStr.includes(q);
    });
    if (resultados.length === 0) {
      alert('No se encontró ningún integrante con ese criterio en este campamento.');
      setRefugiadoEncontrado(null);
      setResultadosBusqueda([]);
    } else if (resultados.length === 1) {
      setResultadosBusqueda([]);
      await seleccionarRefugiado(resultados[0]);
    } else {
      setResultadosBusqueda(resultados);
    }
  };

  const seleccionarRefugiado = async (ref: Refugiado) => {
    const { data: hcs } = await supabase
      .from('historias_clinicas')
      .select('id')
      .eq('refugiado_id', ref.id);
    if (hcs && hcs.length > 0) {
      setHcIdLocal(hcs[0].id);
    } else {
      alert('Este integrante no tiene una historia clínica abierta. Debe abrir una primero.');
      return;
    }
    setRefugiadoEncontrado(ref);
    setResultadosBusqueda([]);
  };

  const handleTipoChange = (nuevo: TipoAtencion) => {
    setTipo(nuevo);
    setSeccionActiva(false);
    setCantidad(1);
    setFilas(buildFilasVacias(1));
  };

  const handleCantidadChange = (n: number) => {
    setCantidad(n);
    setFilas(prev => {
      const nuevas = [...prev];
      while (nuevas.length < n) {
        nuevas.push({ especialidad: '', diagnostico: '', tratamiento: '', tipo: '', descripcion: '', entregadoPor: '', fecha: '' });
      }
      return nuevas.slice(0, n);
    });
  };

  const actualizarFila = (idx: number, campo: string, valor: string) => {
    setFilas(prev => {
      const nuevas = [...prev];
      nuevas[idx] = { ...nuevas[idx], [campo]: valor.toUpperCase() };
      return nuevas;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hcId = historiaClinicaId || hcIdLocal;
    if (!hcId) {
      setErrorMsg('Debe seleccionar un integrante primero.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload: any = {
        id: '',
        historia_clinica_id: hcId,
        tipo,
        fecha_atencion: new Date(fechaAtencion),
        presion_arterial: tipo === 'medica' ? (presionArterial || undefined) : undefined,
        temperatura: tipo === 'medica' && temperatura ? parseFloat(temperatura) : undefined,
        frecuencia_cardiaca: tipo === 'medica' && frecuenciaCardiaca ? parseInt(frecuenciaCardiaca) : undefined,
        peso: tipo === 'medica' && peso ? parseFloat(peso) : undefined,
        talla: tipo === 'medica' && talla ? parseFloat(talla) : undefined,
        saturacion_oxigeno: tipo === 'medica' && saturacionOxigeno ? parseInt(saturacionOxigeno) : undefined,
        observaciones: tipo === 'medica' ? (observaciones || undefined) : undefined,
        created_at: new Date(),
      };

      if (seccionActiva) {
        for (let i = 0; i < cantidad; i++) {
          const idx = i + 1;
          const fila = filas[i];
          if (tipo === 'medica') {
            (payload as any)[`especialidad_${idx}`] = fila.especialidad || undefined;
            (payload as any)[`diagnostico_${idx}`] = fila.diagnostico || undefined;
            (payload as any)[`tratamiento_${idx}`] = fila.tratamiento || undefined;
          } else if (tipo === 'beneficio') {
            (payload as any)[`beneficio_tipo_${idx}`] = fila.tipo || undefined;
            (payload as any)[`beneficio_descripcion_${idx}`] = fila.descripcion || undefined;
            (payload as any)[`beneficio_entregado_por_${idx}`] = fila.entregadoPor || undefined;
            (payload as any)[`beneficio_fecha_${idx}`] = fila.fecha ? new Date(fila.fecha) : undefined;
          } else if (tipo === 'donacion') {
            (payload as any)[`donacion_tipo_${idx}`] = fila.tipo || undefined;
            (payload as any)[`donacion_descripcion_${idx}`] = fila.descripcion || undefined;
            (payload as any)[`donacion_entregado_por_${idx}`] = fila.entregadoPor || undefined;
            (payload as any)[`donacion_fecha_${idx}`] = fila.fecha ? new Date(fila.fecha) : undefined;
          }
        }
      }

      await agregarRegistroAtencion(payload);
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); onClose(); }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const titulo = {
    medica: 'Registrar Atención Médica',
    beneficio: 'Registrar Beneficio',
    donacion: 'Registrar Donación',
  }[tipo];

  const IconoTipo = TIPOS.find(t => t.value === tipo)?.icon || Activity;

  const nombreRefugiado = refugiadoNombre
    ? refugiadoNombre
    : refugiadoEncontrado
      ? `${refugiadoEncontrado.apellidos}, ${refugiadoEncontrado.nombres}`
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{titulo}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {nombreRefugiado ? (
                <>Paciente: <span className="font-semibold text-caracas-red">{nombreRefugiado}</span></>
              ) : (
                <>Campamento: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span></>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <IconoTipo size={20} className="text-green-600" />
              <p className="font-medium">Registro guardado exitosamente!</p>
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <span className="font-medium text-sm">{errorMsg}</span>
            </div>
          )}

          {necesitaBusqueda && !refugiadoEncontrado && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible mb-6">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-blue/10 rounded-lg">
                  <Search size={18} className="text-caracas-blue" />
                </div>
                <h3 className="font-semibold text-gray-800">Buscar Integrante</h3>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por cédula, nombre o apellido</label>
                    <input
                      type="text"
                      value={cedulaBusqueda}
                      onChange={(e) => { setCedulaBusqueda(e.target.value); setResultadosBusqueda([]); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarRefugiado(); } }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                      placeholder="Escriba la cédula, nombre o apellido"
                    />
                    {resultadosBusqueda.length > 1 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {resultadosBusqueda.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => seleccionarRefugiado(r)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <p className="font-semibold text-gray-800">{r.nombres} {r.apellidos}</p>
                            <p className="text-xs text-gray-500">
                              {r.codigo && <>Código: {r.codigo} | </>}
                              C.I: {formatCedula(r.cedula) ?? 'N/A'} | Cama: {r.nro_cama || 'N/A'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={buscarRefugiado} className="px-6 py-2.5 bg-caracas-blue text-white rounded-xl font-medium hover:bg-blue-800 transition-colors">
                    Buscar
                  </button>
                </div>
              </div>
            </div>
          )}

          {necesitaBusqueda && refugiadoEncontrado && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 mb-6">
              <User size={20} className="text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">{refugiadoEncontrado.nombres} {refugiadoEncontrado.apellidos}</p>
                <p className="text-sm text-green-700">C.I: {formatCedula(refugiadoEncontrado.cedula) ?? 'N/A'} | Edad: {formatAge(new Date(refugiadoEncontrado.fecha_nacimiento))} | Cama: {refugiadoEncontrado.nro_cama || 'N/A'}</p>
              </div>
            </div>
          )}

          {(!necesitaBusqueda || refugiadoEncontrado) && (
            <form id="atencion-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de tipo */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de registro</label>
                  <div className="flex gap-2">
                    {TIPOS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleTipoChange(value)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                          tipo === value
                            ? 'bg-caracas-red text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fecha común */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <DateInput
                    label="Fecha de Atención"
                    value={fechaAtencion}
                    onChange={setFechaAtencion}
                    className="w-full md:w-64"
                  />
                </div>
              </div>

              {/* Signos Vitales — solo para medica */}
              {tipo === 'medica' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-caracas-red/10 rounded-lg">
                      <Activity size={18} className="text-caracas-red" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Signos Vitales y Datos de la Consulta</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Presión Arterial</label>
                      <input
                        type="text"
                        value={presionArterial}
                        onChange={e => setPresionArterial(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="EJ. 120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={temperatura}
                        onChange={e => setTemperatura(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="EJ. 36.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia Cardíaca (lpm)</label>
                      <input
                        type="number"
                        value={frecuenciaCardiaca}
                        onChange={e => setFrecuenciaCardiaca(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="EJ. 72"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={peso}
                        onChange={e => setPeso(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="EJ. 70.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Talla (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={talla}
                        onChange={e => setTalla(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="EJ. 170"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Saturación de Oxígeno (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={saturacionOxigeno}
                        onChange={e => setSaturacionOxigeno(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="EJ. 98"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                      <textarea
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value.toUpperCase())}
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none"
                        placeholder="Observaciones de la consulta médica..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sección dinámica */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <IconoTipo size={18} className="text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    {tipo === 'medica' ? 'Especialidades' : tipo === 'beneficio' ? 'Detalle del Beneficio' : 'Detalle de la Donación'}
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seccionActiva}
                      onChange={e => { setSeccionActiva(e.target.checked); if (!e.target.checked) { setCantidad(1); setFilas(buildFilasVacias(1)); } }}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">
                      {tipo === 'medica'
                        ? '¿Requiere atención de especialidad?'
                        : tipo === 'beneficio'
                          ? '¿Desea registrar beneficios?'
                          : '¿Desea registrar donaciones?'}
                    </span>
                  </label>
                  {seccionActiva && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">Cantidad:</label>
                        <select
                          value={cantidad}
                          onChange={e => handleCantidadChange(parseInt(e.target.value))}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                        >
                          {CANTIDAD_OPTIONS.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-4">
                        {Array.from({ length: cantidad }, (_, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-3"># {i + 1}</p>
                            {tipo === 'medica' ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Especialidad</label>
                                  <input
                                    type="text"
                                    value={filas[i]?.especialidad || ''}
                                    onChange={e => actualizarFila(i, 'especialidad', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                                    placeholder="EJ. CARDIOLOGÍA"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Diagnóstico</label>
                                  <input
                                    type="text"
                                    value={filas[i]?.diagnostico || ''}
                                    onChange={e => actualizarFila(i, 'diagnostico', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                                    placeholder="Diagnóstico"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Tratamiento</label>
                                  <input
                                    type="text"
                                    value={filas[i]?.tratamiento || ''}
                                    onChange={e => actualizarFila(i, 'tratamiento', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                                    placeholder="Tratamiento indicado"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                                  <input
                                    type="text"
                                    value={filas[i]?.tipo || ''}
                                    onChange={e => actualizarFila(i, 'tipo', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                                    placeholder="EJ. ALIMENTOS, ROPA, DINERO"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Entregado por</label>
                                  <input
                                    type="text"
                                    value={filas[i]?.entregadoPor || ''}
                                    onChange={e => actualizarFila(i, 'entregadoPor', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                                    placeholder="Nombre de quien entrega"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                                  <input
                                    type="text"
                                    value={filas[i]?.descripcion || ''}
                                    onChange={e => actualizarFila(i, 'descripcion', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                                    placeholder={tipo === 'beneficio' ? 'DESCRIPCIÓN DEL BENEFICIO' : 'DESCRIPCIÓN DEL ARTÍCULO'}
                                  />
                                </div>
                                <div>
                                  <DateInput
                                    label="Fecha de entrega"
                                    value={filas[i]?.fecha || ''}
                                    onChange={(v) => actualizarFila(i, 'fecha', v)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {(!necesitaBusqueda || refugiadoEncontrado) && (
          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button form="atencion-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={18} />
              {isSubmitting ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
