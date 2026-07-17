import { useState, useEffect, useMemo } from 'react';
import { X, Save, Search, User, Users, MapPin, Plus, FileText, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCampamento } from '../../context/CampamentoContext';
import { useAuth } from '../../context/AuthContext';
import { obtenerTiposActa, crearActa } from '../../lib/actas';
import { formatAge } from '../../lib/formatAge';
import { formatCedula } from '../../lib/formatCedula';
import { toDateInput } from '../../lib/formatDate';
import ActaPreview from './ActaPreview';
import TipoActaModal from './TipoActaModal';
import type { Refugiado, TipoActa } from '../../types';

interface LevantarActaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function LevantarActaModal({ isOpen, onClose, onSaved }: LevantarActaModalProps) {
  const { campamentoSeleccionado, refugiados, familias } = useCampamento();
  const { tienePermiso } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [refugiadoEncontrado, setRefugiadoEncontrado] = useState<Refugiado | null>(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Refugiado[]>([]);
  const [tiposActa, setTiposActa] = useState<TipoActa[]>([]);
  const [tipoActaId, setTipoActaId] = useState('');
  const [tipoActaModalOpen, setTipoActaModalOpen] = useState(false);
  const [valoresFormulario, setValoresFormulario] = useState<Record<string, string>>({});
  const [edadCalculada, setEdadCalculada] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRefugiadoEncontrado(null);
    setCedulaBusqueda('');
    setResultadosBusqueda([]);
    setTipoActaId('');
    setValoresFormulario({});
    setErrorMsg('');
    setEdadCalculada('');
    obtenerTiposActa().then(setTiposActa);
  }, [isOpen]);

  const tipoActaSeleccionado = useMemo(
    () => tiposActa.find(t => t.id === tipoActaId) || null,
    [tiposActa, tipoActaId]
  );

  const resetValoresFormulario = () => {
    setValoresFormulario({});
  };

  useEffect(() => {
    resetValoresFormulario();
  }, [tipoActaId]);

  const seleccionarRefugiado = (refugiado: Refugiado) => {
    setRefugiadoEncontrado(refugiado);
    setEdadCalculada(formatAge(new Date(refugiado.fecha_nacimiento)));
    setResultadosBusqueda([]);
  };

  const buscarRefugiado = () => {
    if (!cedulaBusqueda.trim()) return;
    const busqueda = cedulaBusqueda.trim().toUpperCase();
    const resultados = refugiados.filter(r => {
      if (r.campamento_id !== campamentoSeleccionado?.id) return false;
      const nombres = (r.nombres || '').toUpperCase();
      const apellidos = (r.apellidos || '').toUpperCase();
      const cedulaStr = r.cedula?.toString() || '';
      const codigo = (r.codigo || '').toUpperCase();
      return (
        nombres.includes(busqueda) ||
        apellidos.includes(busqueda) ||
        cedulaStr.includes(busqueda) ||
        codigo.includes(busqueda)
      );
    });

    if (resultados.length === 0) {
      setErrorMsg('No se encontró ningún integrante con ese criterio de búsqueda en este campamento.');
      setRefugiadoEncontrado(null);
      setResultadosBusqueda([]);
    } else if (resultados.length === 1) {
      setErrorMsg('');
      setResultadosBusqueda([]);
      seleccionarRefugiado(resultados[0]);
    } else {
      setErrorMsg('');
      setResultadosBusqueda(resultados);
    }
  };

  const actualizarValor = (clave: string, valor: string) => {
    setValoresFormulario(prev => ({ ...prev, [clave]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refugiadoEncontrado) {
      setErrorMsg('Debe buscar un integrante primero.');
      return;
    }
    if (!tipoActaId) {
      setErrorMsg('Debe seleccionar un tipo de acta.');
      return;
    }

    const camposRequeridos = tipoActaSeleccionado?.plantilla.campos.filter(c => c.requerido) || [];
    for (const campo of camposRequeridos) {
      if (!valoresFormulario[campo.clave]?.trim()) {
        setErrorMsg(`El campo "${campo.etiqueta}" es obligatorio.`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      let createdBy: string | undefined;
      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_id', user.id)
          .single();
        if (usuario) createdBy = usuario.id;
      }

      await crearActa({
        tipo_acta_id: tipoActaId,
        refugiado_id: refugiadoEncontrado.id,
        campamento_id: refugiadoEncontrado.campamento_id,
        fecha: toDateInput(new Date()),
        contenido: valoresFormulario,
        created_by: createdBy,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el acta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const familiaDelRefugiado = refugiadoEncontrado
    ? familias.find(f => f.id === refugiadoEncontrado.familia_id)
    : null;

  const jefeFamilia = refugiadoEncontrado?.es_jefe_familia
    ? refugiadoEncontrado
    : refugiadoEncontrado?.familia_id
      ? refugiados.find(r => r.familia_id === refugiadoEncontrado.familia_id && r.es_jefe_familia)
      : null;

  const sistemaVars: Record<string, string> = {
    fecha_actual: new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    nombre_campamento: campamentoSeleccionado?.nombre || '',
    direccion_campamento: campamentoSeleccionado?.ubicacion || '',
    nombre_completo_integrante: refugiadoEncontrado
      ? `${refugiadoEncontrado.nombres} ${refugiadoEncontrado.apellidos}`
      : '',
    cedula_integrante: refugiadoEncontrado?.cedula
      ? `V-${formatCedula(refugiadoEncontrado.cedula)}`
      : '',
    codigo_integrante: refugiadoEncontrado?.codigo || '',
    jefe_familia: jefeFamilia ? `${jefeFamilia.nombres} ${jefeFamilia.apellidos}` : '',
    cedula_jefe_familia: jefeFamilia?.cedula ? `V-${formatCedula(jefeFamilia.cedula)}` : '',
    nro_cama: refugiadoEncontrado?.nro_cama || '',
  };

  const puedeCrearTipo = tienePermiso('Actas', 'Modificar');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Levantar Acta</h2>
            <p className="text-sm text-gray-500 mt-1">
              Campamento: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <FileText size={20} className="text-green-600" />
              <p className="font-medium">Acta levantada exitosamente!</p>
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0" />
              <p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}

          <form id="levantar-acta-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-blue/10 rounded-lg">
                  <Search size={18} className="text-caracas-blue" />
                </div>
                <h3 className="font-semibold text-gray-800">Buscar Integrante</h3>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buscar por cédula, nombre, apellido o código de refugiado
                    </label>
                    <input
                      type="text"
                      value={cedulaBusqueda}
                      onChange={(e) => { setCedulaBusqueda(e.target.value); setResultadosBusqueda([]); setErrorMsg(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarRefugiado(); } }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                      placeholder="Escriba la cédula, nombre, apellido o código"
                    />
                    {resultadosBusqueda.length > 1 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {resultadosBusqueda.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => seleccionarRefugiado(r)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <p className="font-semibold text-gray-800">{r.nombres} {r.apellidos}</p>
                            <p className="text-xs text-gray-500">
                              {r.codigo && <span>Código: {r.codigo} | </span>}
                              C.I: {formatCedula(r.cedula) ?? 'N/A'} | Cama: {r.nro_cama || 'N/A'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={buscarRefugiado}
                    className="px-6 py-2.5 bg-caracas-blue text-white rounded-xl font-medium hover:bg-blue-800 transition-colors"
                  >
                    Buscar
                  </button>
                </div>
                {refugiadoEncontrado && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="font-semibold text-green-800">
                      {refugiadoEncontrado.nombres} {refugiadoEncontrado.apellidos}
                    </p>
                    <p className="text-sm text-green-700">
                      {refugiadoEncontrado.codigo && <span>Código: {refugiadoEncontrado.codigo} | </span>}
                      C.I: {formatCedula(refugiadoEncontrado.cedula) ?? 'N/A'} | Edad: {edadCalculada || 'N/A'} | Cama: {refugiadoEncontrado.nro_cama || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {refugiadoEncontrado && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-caracas-blue/10 rounded-lg">
                      <User size={18} className="text-caracas-blue" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Datos del Integrante</h3>
                    <span className="text-xs text-gray-400 ml-2">(Solo vista)</span>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nombres</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.nombres}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Apellidos</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.apellidos}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cédula</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{formatCedula(refugiadoEncontrado.cedula) ?? 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.codigo || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Edad</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{edadCalculada || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nro de Cama</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.nro_cama || 'Sin asignar'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-caracas-green/10 rounded-lg">
                      <Users size={18} className="text-caracas-green" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Jerarquía Familiar</h3>
                    <span className="text-xs text-gray-400 ml-2">(Solo vista)</span>
                  </div>
                  <div className="p-6">
                    {refugiadoEncontrado.es_jefe_familia ? (
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl inline-block">
                        Es Jefe de Familia
                      </p>
                    ) : (
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl inline-block">
                        {familiaDelRefugiado ? `Pertenece a: ${familiaDelRefugiado.nombre}` : 'Sin familia asignada'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <MapPin size={18} className="text-yellow-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800">Ubicación</h3>
                    <span className="text-xs text-gray-400 ml-2">(Solo vista)</span>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Procedencia</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiadoEncontrado.procedencia || 'No registrada'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Ingreso</label>
                      <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">
                        {refugiadoEncontrado.fecha_ingreso
                          ? new Date(refugiadoEncontrado.fecha_ingreso).toLocaleDateString('es-ES')
                          : 'No registrada'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText size={18} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Datos del Acta</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Acta <span className="text-caracas-red">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={tipoActaId}
                      onChange={(e) => setTipoActaId(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    >
                      <option value="">-- SELECCIONE --</option>
                      {tiposActa.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                    {puedeCrearTipo && (
                      <button
                        type="button"
                        onClick={() => setTipoActaModalOpen(true)}
                        className="px-4 py-2.5 bg-caracas-green hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-1.5"
                        title="Crear nuevo tipo de acta"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {tipoActaSeleccionado && (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    {tipoActaSeleccionado.plantilla.campos.map(campo => (
                      <div key={campo.clave}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {campo.etiqueta}
                          {campo.requerido && <span className="text-caracas-red ml-1">*</span>}
                        </label>
                        {campo.tipo === 'textarea' ? (
                          <textarea
                            value={valoresFormulario[campo.clave] || ''}
                            onChange={e => actualizarValor(campo.clave, e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all resize-none"
                            placeholder={campo.placeholder || `Ingrese ${campo.etiqueta.toLowerCase()}`}
                          />
                        ) : campo.tipo === 'select' ? (
                          <select
                            value={valoresFormulario[campo.clave] || ''}
                            onChange={e => actualizarValor(campo.clave, e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                          >
                            <option value="">-- SELECCIONE --</option>
                            {(campo.opciones || []).map(op => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        ) : campo.tipo === 'date' ? (
                          <input
                            type="date"
                            value={valoresFormulario[campo.clave] || ''}
                            onChange={e => actualizarValor(campo.clave, e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                          />
                        ) : (
                          <input
                            type="text"
                            value={valoresFormulario[campo.clave] || ''}
                            onChange={e => actualizarValor(campo.clave, e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                            placeholder={campo.placeholder || `Ingrese ${campo.etiqueta.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tipoActaSeleccionado && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye size={18} className="text-gray-500" />
                      <h4 className="font-semibold text-gray-700">Vista Previa del Documento</h4>
                    </div>
                    <ActaPreview
                      contenido={tipoActaSeleccionado.plantilla.contenido}
                      sistema={sistemaVars}
                      valores={valoresFormulario}
                    />
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            form="levantar-acta-form"
            type="submit"
            disabled={(!refugiadoEncontrado || !tipoActaId) || isSubmitting}
            className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : 'Generar Acta'}
          </button>
        </div>
      </div>

      <TipoActaModal
        isOpen={tipoActaModalOpen}
        onClose={() => setTipoActaModalOpen(false)}
        onSaved={() => {
          obtenerTiposActa().then(setTiposActa);
        }}
      />
    </div>
  );
}
