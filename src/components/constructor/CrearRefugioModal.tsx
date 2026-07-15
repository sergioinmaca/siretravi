import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown, ChevronUp, Tent, MapPin, Trash2 } from 'lucide-react';
import { useCampamento } from '../../context/CampamentoContext';
import type { Carpa, Campamento } from '../../types';
import CroquisEditor from './CroquisEditor';
import { countElements, contarTiposDesdeCroquis } from './CroquisViewer';

interface CarpaDraft {
  nombre: string;
  literas: number;
  camas_individuales: number;
  camas_duplex: number;
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
  const [cantidadCarpas, setCantidadCarpas] = useState(0);
  const [carpas, setCarpas] = useState<CarpaDraft[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-cargar datos si estamos en modo edición
  useEffect(() => {
    if (isOpen && campamentoToEdit) {
      setNombre(campamentoToEdit.nombre);
      setUbicacion(campamentoToEdit.ubicacion);
      setTipoContabilizacion(campamentoToEdit.tipo_contabilizacion || 'elemento');
      setCantidadCarpas(campamentoToEdit.carpas.length);
      setCarpas(campamentoToEdit.carpas.map((c, index) => ({
        ...c,
        croquis_data: c.croquis_data || '',
        expanded: index === 0
      })));
    } else if (isOpen && !campamentoToEdit) {
      // Limpiar al abrir para crear nuevo
      setNombre('');
      setUbicacion('');
      setTipoContabilizacion('elemento');
      setCantidadCarpas(0);
      setCarpas([]);
    }
  }, [isOpen, campamentoToEdit]);

  // Cuando cambia la cantidad de carpas, generar/destruir subformularios
  const handleCantidadCarpasChange = (val: number) => {
    const n = Math.max(0, Math.min(val, 20)); // máximo 20 carpas
    setCantidadCarpas(n);
    setCarpas(prev => {
      if (n > prev.length) {
        // Agregar nuevas
        const nuevas: CarpaDraft[] = [];
        for (let i = prev.length; i < n; i++) {
          nuevas.push({
            nombre: `CARPA ${String.fromCharCode(65 + i)}`, // A, B, C...
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

  const updateCarpa = (index: number, field: keyof CarpaDraft, value: string | number | boolean) => {
    setCarpas(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const toggleCarpa = (index: number) => {
    setCarpas(prev => prev.map((c, i) => i === index ? { ...c, expanded: !c.expanded } : c));
  };

  const calcularCapacidadTotal = () => {
    return carpas.reduce((total, c) => {
      return total + countElements(c.croquis_data, tipoContabilizacion);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const carpasFinales: Carpa[] = carpas.map((c, i) => ({
        id: campamentoToEdit?.carpas[i]?.id || `carpa-${Date.now()}-${i}`,
        nombre: c.nombre,
        literas: c.literas,
        camas_individuales: c.camas_individuales,
        camas_duplex: c.camas_duplex,
        croquis_data: c.croquis_data
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
          carpas: carpasFinales
        });
      } else {
        await agregarCampamento({
          id: `camp-${Date.now()}`,
          nombre: nombre.toUpperCase(),
          ubicacion: ubicacion.toUpperCase(),
          capacidad_maxima: calcularCapacidadTotal(),
          estado: 'activo',
          tipo_contabilizacion: tipoContabilizacion,
          carpas: carpasFinales
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
              {campamentoToEdit ? 'Modifica las características del campamento y sus carpas' : 'Define las características del campamento y sus carpas'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Carpas <span className="text-caracas-red">*</span></label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={20}
                    value={cantidadCarpas || ''}
                    onChange={e => handleCantidadCarpasChange(Number(e.target.value))}
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

            {/* Sección 2: Subformularios por Carpa (acordeones) */}
            {carpas.map((carpa, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                {/* Cabecera del acordeón */}
                <button
                  type="button"
                  onClick={() => toggleCarpa(index)}
                  className="w-full bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-caracas-blue/10 rounded-lg">
                      <Tent size={18} className="text-caracas-blue" />
                    </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-800">{carpa.nombre || `Carpa ${index + 1}`}</h3>
                        {(() => {
                          const tipos = contarTiposDesdeCroquis(carpa.croquis_data || '');
                          return (
                            <p className="text-xs text-gray-500">
                              {tipos.literas} literas · {tipos.individuales} individuales · {tipos.duplex} duplex
                              {' · '}
                              <span className="font-semibold text-caracas-red">
                                {countElements(carpa.croquis_data || '', tipoContabilizacion)} camas total
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                  </div>
                  {carpa.expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>

                {/* Contenido del acordeón */}
                {carpa.expanded && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Carpa</label>
                        <input
                          type="text"
                          value={carpa.nombre}
                          onChange={e => updateCarpa(index, 'nombre', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Literas</label>
                        <input
                          type="number"
                          min={0}
                          value={carpa.literas || ''}
                          onChange={e => updateCarpa(index, 'literas', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Camas Individuales</label>
                        <input
                          type="number"
                          min={0}
                          value={carpa.camas_individuales || ''}
                          onChange={e => updateCarpa(index, 'camas_individuales', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Camas Duplex</label>
                        <input
                          type="number"
                          min={0}
                          value={carpa.camas_duplex || ''}
                          onChange={e => updateCarpa(index, 'camas_duplex', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Editor de Croquis */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Croquis de la Carpa</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Utiliza las herramientas para dibujar las paredes y luego coloca los íconos de camas sobre el plano.
                      </p>
                      <CroquisEditor
                        width={1100}
                        height={700}
                        maxLiteras={carpa.literas}
                        maxIndividuales={carpa.camas_individuales}
                        maxDuplex={carpa.camas_duplex}
                        tipoContabilizacion={tipoContabilizacion}
                        initialData={campamentoToEdit ? carpa.croquis_data : undefined}
                        onChange={(data) => {
                          updateCarpa(index, 'croquis_data', data);
                          const tipos = contarTiposDesdeCroquis(data);
                          updateCarpa(index, 'literas', tipos.literas);
                          updateCarpa(index, 'camas_individuales', tipos.individuales);
                          updateCarpa(index, 'camas_duplex', tipos.duplex);
                        }}
                        elementNumberOffset={(() => {
                          let offset = 0;
                          for (let i = 0; i < index; i++) {
                            offset += countElements(carpas[i].croquis_data || '', tipoContabilizacion);
                          }
                          return offset;
                        })()}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {cantidadCarpas === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-400">
                <Tent size={48} className="mb-4 opacity-40" />
                <p className="font-medium text-gray-500">Ingresa la cantidad de carpas para comenzar a configurarlas</p>
              </div>
            )}

          </form>
        </div>

        {/* Footer del Modal */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <p className="text-sm text-gray-500">
            {cantidadCarpas > 0 && (
              <span>
                {cantidadCarpas} carpa{cantidadCarpas > 1 ? 's' : ''} configurada{cantidadCarpas > 1 ? 's' : ''} · <span className="font-semibold text-caracas-red">{calcularCapacidadTotal()} camas totales</span>
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
              disabled={cantidadCarpas === 0 || isSubmitting}
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
