import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { TipoActa, TipoActaCampo } from '../../types';
import { crearTipoActa, actualizarTipoActa } from '../../lib/actas';
import ActaPreview from './ActaPreview';

interface TipoActaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  tipoToEdit?: TipoActa | null;
}

const SISTEMA_VARS = [
  { clave: 'fecha_actual', label: 'Fecha actual' },
  { clave: 'nombre_campamento', label: 'Nombre del campamento' },
  { clave: 'direccion_campamento', label: 'Dirección del campamento' },
  { clave: 'nombre_completo_integrante', label: 'Nombre completo del integrante' },
  { clave: 'cedula_integrante', label: 'Cédula del integrante' },
  { clave: 'codigo_integrante', label: 'Código del integrante' },
  { clave: 'jefe_familia', label: 'Nombre del jefe de familia' },
  { clave: 'cedula_jefe_familia', label: 'Cédula del jefe de familia' },
  { clave: 'nro_cama', label: 'Número de cama' },
  { clave: 'firma_notificado', label: 'Firma del notificado' },
  { clave: 'firma_jefe_familia', label: 'Firma del jefe de familia' },
  { clave: 'firma_autoridad', label: 'Firma de la autoridad' },
  { clave: 'firma_testigo', label: 'Firma del testigo' },
];

const TIPOS_CAMPO: { value: TipoActaCampo['tipo']; label: string }[] = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'select', label: 'Selección' },
  { value: 'date', label: 'Fecha' },
];

function claveDesdeEtiqueta(etiqueta: string): string {
  return etiqueta
    .toLowerCase()
    .replace(/[áäàâ]/g, 'a')
    .replace(/[éëèê]/g, 'e')
    .replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o')
    .replace(/[úüùû]/g, 'u')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function campoVacio(): TipoActaCampo {
  return { clave: '', etiqueta: '', tipo: 'text', requerido: false, placeholder: '' };
}

export default function TipoActaModal({ isOpen, onClose, onSaved, tipoToEdit }: TipoActaModalProps) {
  const isEditing = !!tipoToEdit;
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [campos, setCampos] = useState<TipoActaCampo[]>([campoVacio()]);
  const [contenido, setContenido] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (tipoToEdit) {
      setNombre(tipoToEdit.nombre);
      setDescripcion(tipoToEdit.descripcion || '');
      setCampos(tipoToEdit.plantilla.campos.length > 0 ? tipoToEdit.plantilla.campos : [campoVacio()]);
      setContenido(tipoToEdit.plantilla.contenido);
    } else {
      setNombre('');
      setDescripcion('');
      setCampos([campoVacio()]);
      setContenido('');
    }
    setErrorMsg('');
  }, [isOpen, tipoToEdit]);

  const actualizarCampo = (index: number, parcial: Partial<TipoActaCampo>) => {
    setCampos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...parcial };
      if (parcial.etiqueta !== undefined && !prev[index].clave) {
        next[index].clave = claveDesdeEtiqueta(parcial.etiqueta);
      }
      return next;
    });
  };

  const agregarCampo = () => setCampos(prev => [...prev, campoVacio()]);

  const eliminarCampo = (index: number) => {
    if (campos.length <= 1) return;
    setCampos(prev => prev.filter((_, i) => i !== index));
  };

  const moverCampo = (index: number, direccion: -1 | 1) => {
    const target = index + direccion;
    if (target < 0 || target >= campos.length) return;
    setCampos(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const insertarVariable = (clave: string) => {
    setContenido(prev => prev + `{{${clave}}}`);
  };

  const insertarVariableCampo = (clave: string) => {
    setContenido(prev => prev + `{{${clave}}}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre del tipo de acta es obligatorio.');
      return;
    }
    if (!contenido.trim()) {
      setErrorMsg('La plantilla de contenido es obligatoria.');
      return;
    }

    const camposValidos = campos.filter(c => c.etiqueta.trim());
    if (camposValidos.length === 0) {
      setErrorMsg('Debe definir al menos un campo en el formulario.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const plantilla = {
        nombre_documento: nombre.trim().toUpperCase(),
        campos: camposValidos,
        contenido: contenido.trim(),
      };

      if (isEditing && tipoToEdit) {
        await actualizarTipoActa(tipoToEdit.id, {
          nombre: nombre.trim().toUpperCase(),
          descripcion: descripcion.trim() || undefined,
          plantilla,
        });
      } else {
        await crearTipoActa({
          nombre: nombre.trim().toUpperCase(),
          descripcion: descripcion.trim() || undefined,
          plantilla,
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el tipo de acta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const previewSistema: Record<string, string> = {
    fecha_actual: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    nombre_campamento: '[Nombre del Campamento]',
    direccion_campamento: '[Dirección del Campamento]',
    nombre_completo_integrante: '[Nombre Completo]',
    cedula_integrante: 'V-12345678',
    codigo_integrante: 'CAM-0001',
    jefe_familia: '[Jefe de Familia]',
    cedula_jefe_familia: 'V-87654321',
    nro_cama: '001',
  };

  const previewValores: Record<string, string> = {};
  campos.forEach(c => {
    if (c.clave) {
      previewValores[c.clave] = `[${c.etiqueta}]`;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Modificar Tipo de Acta' : 'Crear Tipo de Acta'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Define la plantilla del documento y los campos del formulario
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <p className="font-medium">{isEditing ? 'Tipo de acta actualizado exitosamente!' : 'Tipo de acta creado exitosamente!'}</p>
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}

          <form id="tipo-acta-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-800">Información General</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del documento <span className="text-caracas-red">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                    placeholder="EJ. ACTA DE NOTIFICACIÓN POR INDISCIPLINA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                    placeholder="Breve descripción del tipo de acta"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Campos del Formulario</h3>
                <button
                  type="button"
                  onClick={agregarCampo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-caracas-blue text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                >
                  <Plus size={16} />
                  Añadir campo
                </button>
              </div>
              <div className="p-6 space-y-3">
                {campos.map((campo, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Etiqueta</label>
                        <input
                          type="text"
                          value={campo.etiqueta}
                          onChange={e => actualizarCampo(index, { etiqueta: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                          placeholder="Ej. Descripción del hecho"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Clave</label>
                        <input
                          type="text"
                          value={campo.clave}
                          onChange={e => actualizarCampo(index, { clave: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm font-mono"
                          placeholder="descripcion_hecho"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                        <select
                          value={campo.tipo}
                          onChange={e => actualizarCampo(index, { tipo: e.target.value as TipoActaCampo['tipo'] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                        >
                          {TIPOS_CAMPO.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={campo.requerido}
                            onChange={e => actualizarCampo(index, { requerido: e.target.checked })}
                            className="w-4 h-4 text-caracas-red focus:ring-caracas-red rounded"
                          />
                          <span className="text-gray-600">Req.</span>
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moverCampo(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                            title="Mover arriba"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverCampo(index, 1)}
                            disabled={index === campos.length - 1}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                            title="Mover abajo"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarCampo(index)}
                            disabled={campos.length <= 1}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 transition-colors"
                            title="Eliminar campo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <button
                          type="button"
                          onClick={() => insertarVariableCampo(campo.clave)}
                          disabled={!campo.clave}
                          className="px-3 py-2 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-30 w-full"
                          title="Insertar {{clave}} en la plantilla"
                        >
                          Insertar
                        </button>
                      </div>
                    </div>
                    {campo.tipo === 'select' && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Opciones (separadas por coma)
                        </label>
                        <input
                          type="text"
                          value={campo.opciones?.join(', ') || ''}
                          onChange={e => actualizarCampo(index, {
                            opciones: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                          placeholder="Opción 1, Opción 2, Opción 3"
                        />
                      </div>
                    )}
                    {campo.placeholder !== undefined && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={campo.placeholder || ''}
                          onChange={e => actualizarCampo(index, { placeholder: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm"
                          placeholder="Texto de ayuda dentro del campo"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-800">Contenido del Documento</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Usa {'{{clave}}'} para insertar campos del formulario y variables del sistema
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-gray-500 mr-1 self-center">Variables del sistema:</span>
                  {SISTEMA_VARS.map(v => (
                    <button
                      key={v.clave}
                      type="button"
                      onClick={() => insertarVariable(v.clave)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-caracas-red/10 hover:text-caracas-red rounded-lg border border-gray-200 transition-colors font-mono"
                      title={v.label}
                    >
                      {'{{'}{v.clave}{'}}'}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-gray-500 mr-1 self-center">Campos del formulario:</span>
                  {campos.filter(c => c.clave).map(c => (
                    <button
                      key={c.clave}
                      type="button"
                      onClick={() => insertarVariableCampo(c.clave!)}
                      className="px-2 py-1 text-xs bg-caracas-blue/10 text-caracas-blue hover:bg-caracas-blue/20 rounded-lg border border-caracas-blue/20 transition-colors font-mono"
                    >
                      {'{{'}{c.clave}{'}}'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={contenido}
                  onChange={e => setContenido(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all font-mono text-sm resize-y leading-relaxed"
                  placeholder="Escribe aquí la plantilla del documento usando {{variables}}..."
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-800">Vista Previa</h3>
              </div>
              <div className="p-6">
                <ActaPreview
                  contenido={contenido}
                  sistema={previewSistema}
                  valores={previewValores}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            form="tipo-acta-form"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Tipo de Acta'}
          </button>
        </div>
      </div>
    </div>
  );
}
