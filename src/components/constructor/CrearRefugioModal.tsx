import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown, ChevronUp, Tent, MapPin, Trash2 } from 'lucide-react';
import { useCampamento } from '../../context/CampamentoContext';
import type { Modulo, Campamento, CroquisGeneral } from '../../types';
import CroquisEditor from './CroquisEditor';
import { countElements, contarTiposDesdeCroquis } from './CroquisViewer';

interface ModuloDraft {
  nombre: string;
  literas: number;
  camas_individuales: number;
  camas_duplex: number;
  croquis_data: string;
  expanded: boolean;
}

interface PlanoDraft {
  nombre: string;
  croquis_data: string;
  expanded: boolean;
}

interface CrearRefugioModalProps {
  isOpen: boolean;
  onClose: () => void;
  campamentoToEdit?: Campamento | null;
}

export default function CrearRefugioModal({ isOpen, onClose, campamentoToEdit }: CrearRefugioModalProps) {
  const { agregarCampamento, actualizarCampamento, eliminarCampamento, refugiados, familias } = useCampamento();
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [tipoContabilizacion, setTipoContabilizacion] = useState<'cama' | 'elemento'>('elemento');
  const [cantidadModulos, setCantidadModulos] = useState(0);
  const [modulos, setModulos] = useState<ModuloDraft[]>([]);
  const [cantidadPlanos, setCantidadPlanos] = useState(0);
  const [planos, setPlanos] = useState<PlanoDraft[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-cargar datos si estamos en modo edición
  useEffect(() => {
    if (isOpen && campamentoToEdit) {
      setNombre(campamentoToEdit.nombre);
      setUbicacion(campamentoToEdit.ubicacion);
      setTipoContabilizacion(campamentoToEdit.tipo_contabilizacion || 'elemento');
      setCantidadModulos(campamentoToEdit.modulos.length);
      setModulos(campamentoToEdit.modulos.map((c, index) => ({
        ...c,
        croquis_data: c.croquis_data || '',
        expanded: index === 0
      })));
      if (campamentoToEdit.croquis_general && campamentoToEdit.croquis_general.length > 0) {
        setCantidadPlanos(campamentoToEdit.croquis_general.length);
        setPlanos(campamentoToEdit.croquis_general.map((p, index) => ({
          ...p,
          croquis_data: p.croquis_data || '',
          expanded: index === 0
        })));
      } else {
        setCantidadPlanos(0);
        setPlanos([]);
      }
    } else if (isOpen && !campamentoToEdit) {
      // Limpiar al abrir para crear nuevo
      setNombre('');
      setUbicacion('');
      setTipoContabilizacion('elemento');
      setCantidadModulos(0);
      setModulos([]);
      setCantidadPlanos(0);
      setPlanos([]);
    }
  }, [isOpen, campamentoToEdit]);

  // Cuando cambia la cantidad de modulos, generar/destruir subformularios
  const handleCantidadModulosChange = (val: number) => {
    const n = Math.max(0, Math.min(val, 20)); // maximo 20 modulos
    setCantidadModulos(n);
    setModulos(prev => {
      if (n > prev.length) {
        // Agregar nuevos
        const nuevas: ModuloDraft[] = [];
        for (let i = prev.length; i < n; i++) {
          nuevas.push({
            nombre: `MÓDULO ${String.fromCharCode(65 + i)}`, // A, B, C...
            literas: 0,
            camas_individuales: 0,
            camas_duplex: 0,
            croquis_data: '',
            expanded: i === prev.length // Solo expandir la nueva primera
          });
        }
        return [...prev, ...nuevas];
      } else {
        // Recortar
        return prev.slice(0, n);
      }
    });
  };

  const updateModulo = (index: number, field: keyof ModuloDraft, value: string | number | boolean) => {
    setModulos(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const toggleModulo = (index: number) => {
    setModulos(prev => prev.map((c, i) => i === index ? { ...c, expanded: !c.expanded } : c));
  };

  const handleCantidadPlanosChange = (val: number) => {
    const n = Math.max(0, Math.min(val, 20));
    setCantidadPlanos(n);
    setPlanos(prev => {
      if (n > prev.length) {
        const nuevas: PlanoDraft[] = [];
        for (let i = prev.length; i < n; i++) {
          nuevas.push({
            nombre: `Plano ${i + 1}`,
            croquis_data: '',
            expanded: i === prev.length
          });
        }
        return [...prev, ...nuevas];
      } else {
        return prev.slice(0, n);
      }
    });
  };

  const updatePlano = (index: number, field: keyof PlanoDraft, value: string | boolean) => {
    setPlanos(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const togglePlano = (index: number) => {
    setPlanos(prev => prev.map((p, i) => i === index ? { ...p, expanded: !p.expanded } : p));
  };

  const calcularCapacidadTotal = () => {
    return modulos.reduce((total, c) => {
      return total + countElements(c.croquis_data, tipoContabilizacion);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const modulosFinales: Modulo[] = modulos.map((c, i) => ({
        id: campamentoToEdit?.modulos[i]?.id || `modulo-${Date.now()}-${i}`,
        nombre: c.nombre,
        literas: c.literas,
        camas_individuales: c.camas_individuales,
        camas_duplex: c.camas_duplex,
        croquis_data: c.croquis_data
      }));

      const planosFinales: CroquisGeneral[] = planos.map(p => ({
        nombre: p.nombre,
        croquis_data: p.croquis_data
      }));

      if (campamentoToEdit) {
        if (!window.confirm(`¿Estás seguro que deseas sobreescribir los datos del campamento "${nombre.toUpperCase()}"?`)) {
          setIsSubmitting(false);
          return;
        }
        await actualizarCampamento(campamentoToEdit.id, {
          ...campamentoToEdit,
          nombre: nombre.toUpperCase(),
          ubicacion: ubicacion.toUpperCase(),
          capacidad_maxima: calcularCapacidadTotal(),
          tipo_contabilizacion: tipoContabilizacion,
          croquis_general: planosFinales.length > 0 ? planosFinales : null,
          modulos: modulosFinales
        });
      } else {
        await agregarCampamento({
          id: `camp-${Date.now()}`,
          nombre: nombre.toUpperCase(),
          ubicacion: ubicacion.toUpperCase(),
          capacidad_maxima: calcularCapacidadTotal(),
          estado: 'activo',
          tipo_contabilizacion: tipoContabilizacion,
          croquis_general: planosFinales.length > 0 ? planosFinales : null,
          modulos: modulosFinales
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error al guardar el campamento:', err);
      alert('Ocurrió un error al guardar los cambios. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!campamentoToEdit) return;

    const tieneRefugiados = refugiados.some(r => r.campamento_id === campamentoToEdit.id);
    const tieneFamilias = familias.some(f => f.campamento_id === campamentoToEdit.id);

    if (tieneRefugiados || tieneFamilias) {
      alert(`⚠️ No puedes eliminar el campamento "${campamentoToEdit.nombre}" porque tiene integrantes o familias asignadas. Debes reasignarlos o eliminarlos primero.`);
      return;
    }

    if (window.confirm(`⚠️ ¿Estás seguro de que deseas eliminar por completo el campamento "${campamentoToEdit.nombre}"? Esta acción no se puede deshacer.`)) {
      eliminarCampamento(campamentoToEdit.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl flex flex-col overflow-hidden my-4">

        {/* Header del Modal */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {campamentoToEdit ? 'Editar Campamento' : 'Crear Nuevo Campamento'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {campamentoToEdit ? 'Modifica las características del campamento y sus módulos' : 'Define las características del campamento y sus módulos'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">

          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <Save size={20} className="text-green-600" />
              <p className="font-medium">
                {campamentoToEdit ? '¡Campamento actualizado exitosamente!' : '¡Campamento creado exitosamente! Ya está disponible en el selector del Header.'}
              </p>
            </div>
          )}

          <form id="crear-refugio-form" onSubmit={handleSubmit} >

            {/* Sección 1: Datos Generales */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-red/10 rounded-lg">
                  <MapPin size={18} className="text-caracas-red" />
                </div>
                <h3 className="font-semibold text-gray-800">Datos Generales del Campamento</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Campamento <span className="text-caracas-red">*</span></label>
                  <input
                    required
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                    placeholder="EJ. CAMPAMENTO CENTRO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación <span className="text-caracas-red">*</span></label>
                  <input
                    required
                    type="text"
                    value={ubicacion}
                    onChange={e => setUbicacion(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                    placeholder="EJ. AV. BOLÍVAR, CARACAS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Módulos <span className="text-caracas-red">*</span></label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={20}
                    value={cantidadModulos || ''}
                    onChange={e => handleCantidadModulosChange(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="Ej. 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contabilización de Camas <span className="text-caracas-red">*</span></label>
                  <div className="flex gap-6 h-[42px] items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoContabilizacion"
                        checked={tipoContabilizacion === 'cama'}
                        onChange={() => setTipoContabilizacion('cama')}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red"
                      />
                      <span className="text-gray-700 font-medium">Por cama</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoContabilizacion"
                        checked={tipoContabilizacion === 'elemento'}
                        onChange={() => setTipoContabilizacion('elemento')}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red"
                      />
                      <span className="text-gray-700 font-medium">Por elemento (mueble)</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="bg-caracas-red/5 p-4 rounded-xl border border-caracas-red/10 w-full">
                    <p className="text-sm text-gray-600">Capacidad Total Estimada</p>
                    <p className="text-3xl font-bold text-caracas-red">{calcularCapacidadTotal()} <span className="text-sm font-normal text-gray-500">camas</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seccion: Planos Generales */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-caracas-red/10 rounded-lg">
                    <MapPin size={18} className="text-caracas-red" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">PLANOS GENERALES</h3>
                    <p className="text-xs text-gray-500">Croquis generales del campamento (ej: pisos, areas)</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Planos <span className="text-caracas-red">*</span></label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={cantidadPlanos || ''}
                    onChange={e => handleCantidadPlanosChange(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="Ej. 2"
                  />
                </div>

                {cantidadPlanos === 0 && (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400">
                    <MapPin size={36} className="mb-3 opacity-40" />
                    <p className="font-medium text-gray-500">Ingresa la cantidad de planos para comenzar a dibujar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Acordeones de Planos */}
            {planos.map((plano, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => togglePlano(index)}
                  className="w-full bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-caracas-red/10 rounded-lg">
                      <MapPin size={18} className="text-caracas-red" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-800">{plano.nombre || `Plano ${index + 1}`}</h3>
                      <p className="text-xs text-gray-500">Croquis general del campamento</p>
                    </div>
                  </div>
                  {plano.expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {plano.expanded && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Plano</label>
                      <input
                        type="text"
                        value={plano.nombre}
                        onChange={e => updatePlano(index, 'nombre', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm uppercase"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-3">
                        Coloca rectangulos para representar modulos, areas o pasillos. Haz doble-click en un rectangulo para agregarle texto.
                      </p>
                      <CroquisEditor
                        modo="general"
                        width={1500}
                        height={700}
                        initialData={campamentoToEdit ? (plano.croquis_data || undefined) : undefined}
                        onChange={(data) => updatePlano(index, 'croquis_data', data)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Seccion 2: Subformularios por Modulo (acordeones) */}
            {modulos.map((modulo, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                {/* Cabecera del acordeon */}
                <button
                  type="button"
                  onClick={() => toggleModulo(index)}
                  className="w-full bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-caracas-blue/10 rounded-lg">
                      <Tent size={18} className="text-caracas-blue" />
                    </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-800">{modulo.nombre || `Modulo ${index + 1}`}</h3>
                        {(() => {
                          const tipos = contarTiposDesdeCroquis(modulo.croquis_data || '');
                          return (
                            <p className="text-xs text-gray-500">
                              {tipos.literas} literas · {tipos.individuales} individuales · {tipos.duplex} duplex
                              {' · '}
                              <span className="font-semibold text-caracas-red">
                                {countElements(modulo.croquis_data || '', tipoContabilizacion)} camas total
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                  </div>
                  {modulo.expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>

                {/* Contenido del acordeon */}
                {modulo.expanded && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Modulo</label>
                        <input
                          type="text"
                          value={modulo.nombre}
                          onChange={e => updateModulo(index, 'nombre', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Literas</label>
                        <input
                          type="number"
                          min={0}
                          value={modulo.literas || ''}
                          onChange={e => updateModulo(index, 'literas', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Camas Individuales</label>
                        <input
                          type="number"
                          min={0}
                          value={modulo.camas_individuales || ''}
                          onChange={e => updateModulo(index, 'camas_individuales', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Camas Duplex</label>
                        <input
                          type="number"
                          min={0}
                          value={modulo.camas_duplex || ''}
                          onChange={e => updateModulo(index, 'camas_duplex', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Editor de Croquis */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Croquis del Modulo</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Utiliza las herramientas para dibujar las paredes y luego coloca los iconos de camas sobre el plano.
                      </p>
                      <CroquisEditor
                        width={1100}
                        height={700}
                        maxLiteras={modulo.literas}
                        maxIndividuales={modulo.camas_individuales}
                        maxDuplex={modulo.camas_duplex}
                        tipoContabilizacion={tipoContabilizacion}
                        initialData={campamentoToEdit ? modulo.croquis_data : undefined}
                        onChange={(data) => {
                          updateModulo(index, 'croquis_data', data);
                        }}
                        elementNumberOffset={(() => {
                          let offset = 0;
                          for (let i = 0; i < index; i++) {
                            offset += countElements(modulos[i].croquis_data || '', tipoContabilizacion);
                          }
                          return offset;
                        })()}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {cantidadModulos === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-400">
                <Tent size={48} className="mb-4 opacity-40" />
                <p className="font-medium text-gray-500">Ingresa la cantidad de módulos para comenzar a configurarlos</p>
              </div>
            )}

          </form>
        </div>

        {/* Footer del Modal */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <p className="text-sm text-gray-500">
            {cantidadModulos > 0 && (
              <span>
                {cantidadModulos} módulo{cantidadModulos > 1 ? 's' : ''} configurado{cantidadModulos > 1 ? 's' : ''} · <span className="font-semibold text-caracas-red">{calcularCapacidadTotal()} camas totales</span>
              </span>
            )}
          </p>
          <div className="flex gap-3">
            {campamentoToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-red-600 font-medium hover:bg-red-50 transition-colors border border-red-100 mr-auto"
              >
                <Trash2 size={18} />
                Eliminar Campamento
              </button>
            )}
            <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button
              form="crear-refugio-form"
              type="submit"
              disabled={cantidadModulos === 0 || isSubmitting}
              className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSubmitting ? 'Guardando...' : campamentoToEdit ? 'Guardar Cambios' : 'Crear Campamento'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
