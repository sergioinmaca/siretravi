import React, { useState, useEffect } from 'react';
import { useCampamento } from '../../context/CampamentoContext';
import { User, Users, MapPin, Save, AlertCircle, CheckCircle2, X, Accessibility } from 'lucide-react';
import type { Refugiado } from '../../types';
import { formatAge } from '../../lib/formatAge';

interface RegistroModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiadoToEdit?: Refugiado | null;
}

export default function RegistroModal({ isOpen, onClose, refugiadoToEdit }: RegistroModalProps) {
  const { campamentoSeleccionado, familias = [], refugiados = [], agregarFamilia, agregarRefugiado, actualizarRefugiado } = useCampamento();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!refugiadoToEdit;

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    genero: 'M',
    fechaNacimiento: '',
    edad: '',
    esJefeFamilia: true,
    familiaId: '',
    nroCama: '',
    procedencia: '',
    fechaIngreso: '',
    direccionExacta: '',
    discapacidad: false,
    tipoDiscapacidad: '',
    embarazo: false,
    tiempoEmbarazo: '',
    mascotas: false,
    tipoMascota: '',
    mascotaSexo: '',
    mascotaRaza: '',
    mascotaNombre: '',
    mascotaEdad: ''
  });

  // Precargar datos cuando se edita
  useEffect(() => {
    if (isOpen && refugiadoToEdit) {
      const birth = new Date(refugiadoToEdit.fecha_nacimiento);
      const y = birth.getFullYear().toString().padStart(4, '0');
      const m = (birth.getMonth() + 1).toString().padStart(2, '0');
      const d = birth.getDate().toString().padStart(2, '0');

      setFormData({
        nombres: refugiadoToEdit.nombres,
        apellidos: refugiadoToEdit.apellidos,
        cedula: refugiadoToEdit.cedula?.toString() || '',
        genero: refugiadoToEdit.genero ? 'M' : 'F',
        fechaNacimiento: `${y}-${m}-${d}`,
        edad: '',
        esJefeFamilia: refugiadoToEdit.es_jefe_familia,
        familiaId: refugiadoToEdit.familia_id || '',
        nroCama: refugiadoToEdit.nro_cama || '',
        procedencia: refugiadoToEdit.procedencia,
        fechaIngreso: refugiadoToEdit.fecha_ingreso
          ? new Date(refugiadoToEdit.fecha_ingreso).toISOString().split('T')[0]
          : '',
        direccionExacta: refugiadoToEdit.direccion_exacta || '',
        discapacidad: refugiadoToEdit.discapacidad,
        tipoDiscapacidad: refugiadoToEdit.tipo_discapacidad || '',
        embarazo: refugiadoToEdit.embarazo,
        tiempoEmbarazo: refugiadoToEdit.tiempo_embarazo?.toString() || '',
        mascotas: refugiadoToEdit.mascotas,
        tipoMascota: refugiadoToEdit.tipo_mascota || '',
        mascotaSexo: refugiadoToEdit.mascota_sexo === true ? 'M' : refugiadoToEdit.mascota_sexo === false ? 'F' : '',
        mascotaRaza: refugiadoToEdit.mascota_raza || '',
        mascotaNombre: refugiadoToEdit.mascota_nombre || '',
        mascotaEdad: refugiadoToEdit.mascota_edad?.toString() || ''
      });
    } else if (isOpen && !refugiadoToEdit) {
      setFormData({
        nombres: '', apellidos: '', cedula: '', genero: 'M',
        fechaNacimiento: '', edad: '', esJefeFamilia: true, familiaId: '',
        nroCama: '', procedencia: '', fechaIngreso: '', direccionExacta: '',
        discapacidad: false, tipoDiscapacidad: '',
        embarazo: false, tiempoEmbarazo: '', mascotas: false, tipoMascota: '',
        mascotaSexo: '', mascotaRaza: '', mascotaNombre: '', mascotaEdad: ''
      });
    }
  }, [isOpen, refugiadoToEdit]);

  useEffect(() => {
    if (formData.fechaNacimiento) {
      setFormData(prev => ({ ...prev, edad: formatAge(new Date(formData.fechaNacimiento)) }));
    }
  }, [formData.fechaNacimiento]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'text') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campamentoSeleccionado) return;

    if (isEditing) {
      const confirmar = window.confirm('¿Estás seguro de que deseas modificar este registro?');
      if (!confirmar) return;
    }

    setIsSubmitting(true);

    let finalFamiliaId = formData.familiaId;

    if (formData.esJefeFamilia) {
      const nombreFamilia = `FAMILIA ${formData.nombres} ${formData.apellidos}`;
      const familiaCreada = await agregarFamilia({
        id: '',
        campamento_id: campamentoSeleccionado.id,
        nombre: nombreFamilia
      });
      finalFamiliaId = familiaCreada?.id || '';
    }

    const payload: Refugiado = {
      id: refugiadoToEdit?.id || '',
      campamento_id: campamentoSeleccionado.id,
      familia_id: finalFamiliaId,
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      cedula: formData.cedula ? parseInt(formData.cedula) : undefined,
      genero: formData.genero === 'M',
      fecha_nacimiento: new Date(formData.fechaNacimiento),
      es_jefe_familia: formData.esJefeFamilia,
      nro_cama: formData.nroCama || undefined,
      procedencia: formData.procedencia,
      fecha_ingreso: formData.fechaIngreso ? new Date(formData.fechaIngreso) : undefined,
      direccion_exacta: formData.direccionExacta || undefined,
      discapacidad: formData.discapacidad,
      tipo_discapacidad: formData.tipoDiscapacidad,
      embarazo: formData.embarazo,
      tiempo_embarazo: formData.tiempoEmbarazo ? parseInt(formData.tiempoEmbarazo) : undefined,
      mascotas: formData.mascotas,
      tipo_mascota: formData.tipoMascota,
      mascota_sexo: formData.mascotaSexo === 'M' ? true : formData.mascotaSexo === 'F' ? false : undefined,
      mascota_raza: formData.mascotaRaza || undefined,
      mascota_nombre: formData.mascotaNombre || undefined,
      mascota_edad: formData.mascotaEdad ? parseInt(formData.mascotaEdad) : undefined
    };

    if (isEditing && refugiadoToEdit) {
      await actualizarRefugiado(refugiadoToEdit.id, payload);
    } else {
      await agregarRefugiado(payload);
    }

    setIsSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up relative">
        
        {/* Cabecera del Modal */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isEditing ? 'Modificar Refugiado' : 'Registrar Nuevo Refugiado'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Destino: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30">
          
          {!campamentoSeleccionado && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <AlertCircle size={20} />
              <p className="font-medium text-sm">Debes seleccionar un campamento en la barra superior antes de registrar.</p>
            </div>
          )}

          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <CheckCircle2 size={20} className="text-green-600" />
              <p className="font-medium">{isEditing ? '¡Refugiado modificado exitosamente!' : '¡Refugiado registrado exitosamente!'}</p>
            </div>
          )}

          <form id="registro-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Tarjeta 1: Datos Personales */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-blue/10 rounded-lg">
                  <User size={18} className="text-caracas-blue" />
                </div>
                <h3 className="font-semibold text-gray-800">1. Datos Personales</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-caracas-red">*</span></label>
                  <input required type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. MARÍA ALEJANDRA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-caracas-red">*</span></label>
                  <input required type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. RODRÍGUEZ SILVA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cédula (Opcional)</label>
                  <input type="number" name="cedula" value={formData.cedula} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" placeholder="Ej. 12345678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                  <select name="genero" value={formData.genero} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                    <option value="M">MASCULINO</option>
                    <option value="F">FEMENINO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento <span className="text-caracas-red">*</span></label>
                  <input required type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                  <input type="text" name="edad" value={formData.edad} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 outline-none" placeholder="Calculada auto" readOnly />
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Familia */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-green/10 rounded-lg">
                  <Users size={18} className="text-caracas-green" />
                </div>
                <h3 className="font-semibold text-gray-800">2. Jerarquía Familiar</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex gap-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="jerarquia" checked={formData.esJefeFamilia} onChange={() => setFormData(prev => ({...prev, esJefeFamilia: true}))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                    <span className="text-gray-700 font-medium">Es Jefe de Familia</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="jerarquia" checked={!formData.esJefeFamilia} onChange={() => setFormData(prev => ({...prev, esJefeFamilia: false}))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                    <span className="text-gray-700 font-medium">Pertenece a una familia</span>
                  </label>
                </div>
                {!formData.esJefeFamilia && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Familia Existente <span className="text-caracas-red">*</span></label>
                    <select required={!formData.esJefeFamilia} name="familiaId" value={formData.familiaId} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                      <option value="">-- SELECCIONE FAMILIA --</option>
                      {familias
                        .filter(f => f.campamento_id === campamentoSeleccionado?.id)
                        .map(fam => (
                        <option key={fam.id} value={fam.id}>{fam.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta 3: Ubicación */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <MapPin size={18} className="text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-800">3. Ubicación y Procedencia</h3>
              </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nro de Cama</label>
                  <input type="text" name="nroCama" value={formData.nroCama} onChange={handleChange} maxLength={3} pattern="[0-9]{0,3}" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" placeholder="EJ. 042" />
                  {formData.nroCama && refugiados.some(
                    r => r.campamento_id === campamentoSeleccionado?.id && r.nro_cama === formData.nroCama && r.id !== refugiadoToEdit?.id
                  ) && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Esta cama ya tiene ocupantes
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Procedencia <span className="text-caracas-red">*</span></label>
                  <input required type="text" name="procedencia" value={formData.procedencia} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. MAIQUETÍA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Exacta</label>
                  <input type="text" name="direccionExacta" value={formData.direccionExacta} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. CALLE PRINCIPAL, CASA NRO 5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso</label>
                  <input type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Tarjeta 4: Información Adicional */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Accessibility size={18} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800">4. Información Adicional</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.discapacidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, discapacidad: e.target.checked }))}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">¿Presenta alguna discapacidad?</span>
                  </label>
                  {formData.discapacidad && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Discapacidad</label>
                      <input
                        type="text"
                        value={formData.tipoDiscapacidad}
                        onChange={(e) => setFormData(prev => ({ ...prev, tipoDiscapacidad: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                        placeholder="EJ. MOTORA, VISUAL, AUDITIVA"
                      />
                    </div>
                  )}
                </div>

                {formData.genero === 'F' && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.embarazo}
                        onChange={(e) => setFormData(prev => ({ ...prev, embarazo: e.target.checked }))}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                      />
                      <span className="text-gray-700 font-medium">¿Se encuentra en estado de embarazo?</span>
                    </label>
                    {formData.embarazo && (
                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de Embarazo (semanas)</label>
                      <input
                        type="number"
                        min={1}
                        max={42}
                        value={formData.tiempoEmbarazo}
                        onChange={(e) => setFormData(prev => ({ ...prev, tiempoEmbarazo: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                        placeholder="Ej. 24"
                      />
                    </div>
                    )}
                  </div>
                )}

                {formData.esJefeFamilia && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.mascotas}
                        onChange={(e) => setFormData(prev => ({ ...prev, mascotas: e.target.checked }))}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                      />
                      <span className="text-gray-700 font-medium">¿Tiene mascotas a su cargo?</span>
                    </label>
                    {formData.mascotas && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Mascota</label>
                          <input
                            type="text"
                            value={formData.tipoMascota}
                            onChange={(e) => setFormData(prev => ({ ...prev, tipoMascota: e.target.value.toUpperCase() }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                            placeholder="EJ. PERRO, GATO, AVES"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sexo de la Mascota</label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="mascotaSexo"
                                checked={formData.mascotaSexo === 'M'}
                                onChange={() => setFormData(prev => ({ ...prev, mascotaSexo: 'M' }))}
                                className="w-5 h-5 text-caracas-red focus:ring-caracas-red"
                              />
                              <span className="text-gray-700">MACHO</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="mascotaSexo"
                                checked={formData.mascotaSexo === 'F'}
                                onChange={() => setFormData(prev => ({ ...prev, mascotaSexo: 'F' }))}
                                className="w-5 h-5 text-caracas-red focus:ring-caracas-red"
                              />
                              <span className="text-gray-700">HEMBRA</span>
                            </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
                            <input
                              type="text"
                              value={formData.mascotaRaza}
                              onChange={(e) => setFormData(prev => ({ ...prev, mascotaRaza: e.target.value.toUpperCase() }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                              placeholder="EJ. PASTOR ALEMÁN"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                              type="text"
                              value={formData.mascotaNombre}
                              onChange={(e) => setFormData(prev => ({ ...prev, mascotaNombre: e.target.value.toUpperCase() }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase"
                              placeholder="EJ. FIRULAIS"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={formData.mascotaEdad}
                              onChange={(e) => setFormData(prev => ({ ...prev, mascotaEdad: e.target.value }))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all"
                              placeholder="Ej. 3"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer del Modal */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button form="registro-form" type="submit" disabled={!campamentoSeleccionado || isSubmitting} className="flex items-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-8 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={18} />
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar Registro'}
          </button>
        </div>

      </div>
    </div>
  );
}