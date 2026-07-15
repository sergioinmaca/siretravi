import { useState, useRef, useEffect } from 'react';
import {
  X, User, Users, MapPin, Accessibility, Shirt,
  Calendar, Phone, Briefcase, GraduationCap, Heart,
  PawPrint, AlertTriangle, Baby, Stethoscope, FileText, Loader2, Camera,
  Save, Trash2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { useCampamento } from '../../context/CampamentoContext';
import { formatAge } from '../../lib/formatAge';
import { toDisplayDate } from '../../lib/formatDate';
import type { Refugiado } from '../../types';


interface FichaRefugiadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiado: Refugiado | null;
  onActualizarFoto: (foto_url: string | null) => void;
}

export default function FichaRefugiadoModal({ isOpen, onClose, refugiado, onActualizarFoto }: FichaRefugiadoModalProps) {
  const { familias = [], actualizarRefugiado } = useCampamento();
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = !refugiado?.foto_url && !storageUrl;
  const canSave = !!storageUrl;
  const canDelete = !!refugiado?.foto_url || !!storageUrl;

  useEffect(() => {
    if (isOpen) {
      const saved = refugiado?.foto_url || null;
      setPreviewUrl(saved);
      setStorageUrl(null);
      setUploadError(null);
    } else {
      setPreviewUrl(null);
      setStorageUrl(null);
      setUploadError(null);
    }
  }, [isOpen, refugiado?.foto_url]);

  if (!isOpen || !refugiado) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const container = document.getElementById('ficha-refugiado-pdf');
      if (!container) return;

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Ficha_${refugiado.nombres}_${refugiado.apellidos}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !refugiado) return;

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const ext = file.name.split('.').pop();
      const path = `${refugiado.campamento_id}/${refugiado.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('fotos-integrantes')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('fotos-integrantes')
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      setStorageUrl(publicUrl);
      setPreviewUrl(publicUrl);
    } catch (err) {
      console.error('Error subiendo foto:', err);
      setUploadError('No se pudo subir la foto. Intente de nuevo.');
      setPreviewUrl(refugiado.foto_url || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGuardar = async () => {
    if (!storageUrl || !refugiado) return;
    setIsSaving(true);
    try {
      await actualizarRefugiado(refugiado.id, { ...refugiado, foto_url: storageUrl });
      onActualizarFoto(storageUrl);
      setPreviewUrl(storageUrl);
      setStorageUrl(null);
    } catch (err) {
      console.error('Error guardando foto:', err);
      setUploadError('No se pudo guardar la foto en la ficha.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar la foto?')) return;

    try {
      const urlToDelete = storageUrl || refugiado?.foto_url;
      if (urlToDelete && refugiado) {
        const pathMatch = urlToDelete.match(/\/fotos-integrantes\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('fotos-integrantes').remove([pathMatch[1]]);
        }
      }

      if (refugiado) {
        await actualizarRefugiado(refugiado.id, { ...refugiado, foto_url: undefined });
      }

      onActualizarFoto(null);
      setStorageUrl(null);
      setPreviewUrl(null);
      setUploadError(null);
    } catch (err) {
      console.error('Error eliminando foto:', err);
      setUploadError('No se pudo eliminar la foto. Intente de nuevo.');
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setStorageUrl(null);
    setUploadError(null);
    onClose();
  };

  const familia = refugiado.familia_id
    ? familias.find(f => f.id === refugiado.familia_id)
    : null;

  const jerarquiaLabel = refugiado.es_jefe_familia
    ? 'Jefe de Familia'
    : `Miembro (${familia?.nombre || 'Familia Desconocida'})`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelectAndUpload}
        />

        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Ficha del Integrante</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {refugiado.apellidos}, {refugiado.nombres} — Cód. {refugiado.codigo || '—'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* Tarjeta 1: Datos Personales */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-blue/10 rounded-lg">
                <User size={18} className="text-caracas-blue" />
              </div>
              <h3 className="font-semibold text-gray-800">Datos Personales</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-start gap-6">
                <div className="shrink-0">
                  {previewUrl ? (
                    <div className="relative group">
                      <img
                        src={previewUrl}
                        alt="Foto del integrante"
                        className="w-28 h-32 object-cover rounded-xl border-2 border-gray-200"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canUpload || isUploading}
                      className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-caracas-red hover:text-caracas-red hover:bg-red-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={canUpload ? 'Subir foto' : 'La foto ya está guardada'}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          <span className="text-[10px] font-medium text-center leading-tight">Subiendo...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={24} />
                          <span className="text-[10px] font-medium text-center leading-tight">Subir<br />foto</span>
                        </>
                      )}
                    </button>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1 text-center leading-tight">{uploadError}</p>
                  )}
                  {storageUrl && (
                    <p className="text-xs text-amber-600 mt-1 text-center leading-tight font-medium">Debe guardar para mantener los cambios</p>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleEliminar}
                      disabled={isUploading}
                      className="w-28 mt-2 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Eliminar foto
                    </button>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FichaField label="Código" value={refugiado.codigo || '—'} />
                  <FichaField label="Cédula" value={refugiado.cedula?.toString() || 'S/N'} />
                  <FichaField label="Nombres" value={refugiado.nombres} />
                  <FichaField label="Apellidos" value={refugiado.apellidos} />
                </div>
              </div>
              <FichaField label="Género" value={refugiado.genero ? 'Masculino' : 'Femenino'} />
              <FichaField
                label="Fecha de Nacimiento"
                value={toDisplayDate(refugiado.fecha_nacimiento)}
              />
              <FichaField label="Edad" value={formatAge(refugiado.fecha_nacimiento)} />
              <FichaField
                label="Teléfono"
                icon={<Phone size={14} />}
                value={refugiado.telefono?.toString() || '—'}
              />
              <FichaField
                label="Profesión / Ocupación"
                icon={<Briefcase size={14} />}
                value={refugiado.profesion || '—'}
              />
              <FichaField
                label="Nivel Educativo"
                icon={<GraduationCap size={14} />}
                value={refugiado.nivel_educativo || '—'}
              />
            </div>
          </div>

          {/* Tarjeta 2: Información Familiar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-caracas-green/10 rounded-lg">
                <Users size={18} className="text-caracas-green" />
              </div>
              <h3 className="font-semibold text-gray-800">Información Familiar</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField
                label="Jerarquía Familiar"
                value={jerarquiaLabel}
                mono
              />
              {!refugiado.es_jefe_familia && (
                <FichaField
                  label="Parentesco con el jefe/a"
                  value={refugiado.parentesco || '—'}
                />
              )}
            </div>
          </div>

          {/* Tarjeta 3: Ubicación y Procedencia */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <MapPin size={18} className="text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Ubicación y Procedencia</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FichaField label="Nro de Cama" value={refugiado.nro_cama || '—'} />
              <FichaField label="Procedencia" value={refugiado.procedencia || '—'} />
              <FichaField label="Dirección Exacta" value={refugiado.direccion_exacta || '—'} />
              <FichaField
                label="Fecha de Ingreso"
                icon={<Calendar size={14} />}
                value={refugiado.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—'}
              />
            </div>
          </div>

          {/* Tarjeta 4: Información Adicional */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Accessibility size={18} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Información Adicional</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <BadgeSiNo
                  label="Discapacidad"
                  value={refugiado.discapacidad}
                  icon={<Accessibility size={14} />}
                />
                <BadgeSiNo
                  label="Alergias"
                  value={refugiado.alergias}
                  icon={<AlertTriangle size={14} />}
                />
                <BadgeSiNo
                  label="Enfermedad Crónica"
                  value={refugiado.enfermedad_cronica}
                  icon={<Stethoscope size={14} />}
                />
                <BadgeSiNo
                  label="Lesión por Sismo"
                  value={refugiado.lesion_sismo}
                  icon={<AlertTriangle size={14} />}
                />
                <BadgeSiNo
                  label="Adulto Mayor Dependencia"
                  value={refugiado.adulto_mayor_dependencia}
                  icon={<User size={14} />}
                />
                {refugiado.lactante !== undefined && (
                  <BadgeSiNo
                    label="Lactante"
                    value={refugiado.lactante}
                    icon={<Baby size={14} />}
                  />
                )}
                {!refugiado.genero && (
                  <>
                    <BadgeSiNo
                      label="Embarazo"
                      value={refugiado.embarazo}
                      icon={<Heart size={14} />}
                    />
                    {refugiado.embarazo && refugiado.tiempo_embarazo && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-pink-50 text-pink-700">
                        <Baby size={14} />
                        {refugiado.tiempo_embarazo} semanas
                      </span>
                    )}
                  </>
                )}
                <BadgeSiNo
                  label="Mascotas a cargo"
                  value={refugiado.mascotas}
                  icon={<PawPrint size={14} />}
                />
              </div>

              {refugiado.mascotas && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalles de la Mascota</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FichaField label="Tipo de Mascota" value={refugiado.tipo_mascota || '—'} />
                    <FichaField
                      label="Sexo"
                      value={
                        refugiado.mascota_sexo === true
                          ? 'Macho'
                          : refugiado.mascota_sexo === false
                            ? 'Hembra'
                            : '—'
                      }
                    />
                    <FichaField label="Raza" value={refugiado.mascota_raza || '—'} />
                    <FichaField label="Nombre" value={refugiado.mascota_nombre || '—'} />
                    <FichaField
                      label="Edad (años)"
                      value={refugiado.mascota_edad?.toString() || '—'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 5: Vestimenta */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Shirt size={18} className="text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Vestimenta</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FichaField label="Talla de Camisa" value={refugiado.talla_camisa || '—'} />
              <FichaField label="Talla de Pantalón" value={refugiado.talla_pantalon || '—'} />
              <FichaField label="Talla de Zapatos" value={refugiado.talla_zapatos || '—'} />
            </div>
          </div>

          {/* Tarjeta 6: Observaciones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText size={18} className="text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Observaciones</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {refugiado.observaciones || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleGuardar}
            disabled={!canSave || isSaving}
            className="flex items-center justify-center gap-2 bg-caracas-blue hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <FileText size={18} />
            )}
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button onClick={handleClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>

      {/* PDF Generation Off-Screen Template */}
      <div
        id="ficha-refugiado-pdf"
        className="absolute left-[-9999px] top-[-9999px] bg-white text-black font-sans w-[800px] h-[1130px] pt-4 px-12 pb-12 flex flex-col justify-between select-none"
        style={{
          boxSizing: 'border-box',
          lineHeight: '1.25'
        }}
      >
        {/* CABECERA */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          {/* Logo Alcaldia de Caracas */}
          <div className="flex flex-col items-center w-32 shrink-0">
            <svg className="w-12 h-12 text-red-600 animate-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-[10px] font-black text-center mt-1 uppercase leading-none tracking-tight">
              Alcaldía<br />de Caracas
            </span>
          </div>
          {/* Titulo */}
          <div className="flex-1 text-center px-4 mt-2">
            <h2 className="text-sm font-black uppercase tracking-wider">
              FICHA DE INTEGRANTE
            </h2>
          </div>
          {/* Integrante Nro + Foto */}
          <div className="text-right mt-2 shrink-0 flex flex-col items-end gap-3">
            <div className="flex items-baseline justify-end">
              <span className="text-xs font-bold uppercase shrink-0">INTEGRANTE Nº:</span>
              <span className="w-28 text-center ml-1 font-bold text-red-600 text-sm leading-none">
                {refugiado.codigo || '—'}
              </span>
            </div>
            {refugiado.foto_url ? (
              <img
                src={refugiado.foto_url}
                alt="Foto integrante"
                className="w-[90px] h-[110px] object-cover border border-gray-400"
              />
            ) : (
              <div className="w-[90px] h-[110px] border border-dashed border-gray-400 flex items-center justify-center">
                <span className="text-[9px] text-gray-400 text-center leading-tight">Foto</span>
              </div>
            )}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 py-6 space-y-6">
          {/* 1. DATOS PERSONALES */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              1. Datos Personales
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Nombres y Apellidos:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {refugiado.nombres} {refugiado.apellidos}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Cédula de Identidad:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {refugiado.cedula?.toString() || 'S/N'}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Fecha de Nacimiento:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {toDisplayDate(refugiado.fecha_nacimiento)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-baseline col-span-1">
                  <span className="font-bold text-xs shrink-0">Edad:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {formatAge(refugiado.fecha_nacimiento)}
                  </span>
                </div>
                <div className="flex items-center col-span-2 gap-4">
                  <span className="font-bold text-xs shrink-0">Género:</span>
                  <div className="flex gap-4">
                    <PDFCheckbox checked={refugiado.genero} label="Masculino (M)" />
                    <PDFCheckbox checked={!refugiado.genero} label="Femenino (F)" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-xs shrink-0">Nivel Educativo:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {['Ninguno', 'Primaria', 'Secundaria', 'Universitario'].map((level) => {
                    const isSelected = refugiado.nivel_educativo?.toUpperCase().includes(level.toUpperCase()) ||
                      (level === 'Ninguno' && !refugiado.nivel_educativo);
                    return (
                      <PDFCheckbox key={level} checked={isSelected} label={level} />
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Teléfono:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {refugiado.telefono?.toString() || '—'}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Profesión / Ocupación:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {refugiado.profesion || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. INFORMACIÓN FAMILIAR Y UBICACIÓN */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              2. Ubicación e Información Familiar
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-xs shrink-0">Jerarquía Familiar:</span>
                  <div className="flex gap-4">
                    <PDFCheckbox checked={refugiado.es_jefe_familia} label="Jefe de Familia" />
                    <PDFCheckbox checked={!refugiado.es_jefe_familia} label="Miembro" />
                  </div>
                </div>
                {!refugiado.es_jefe_familia && (
                  <div className="flex items-baseline">
                    <span className="font-bold text-xs shrink-0">Parentesco con el Jefe/a:</span>
                    <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                      {refugiado.parentesco || '—'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Nro de Cama:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {refugiado.nro_cama || '—'}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Fecha de Ingreso:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {refugiado.fecha_ingreso ? toDisplayDate(refugiado.fecha_ingreso) : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Procedencia:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {refugiado.procedencia || '—'}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Dirección Exacta:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {refugiado.direccion_exacta || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. EVALUACIÓN DE SALUD Y CONDICIONES ESPECIALES */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              3. Evaluación de Salud y Condiciones Especiales
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs shrink-0">¿Lesión por sismo?:</span>
                  <PDFCheckbox checked={refugiado.lesion_sismo} label="Sí" />
                  <PDFCheckbox checked={!refugiado.lesion_sismo} label="No" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs shrink-0">¿Enf. Crónica?:</span>
                  <PDFCheckbox checked={refugiado.enfermedad_cronica} label="Sí" />
                  <PDFCheckbox checked={!refugiado.enfermedad_cronica} label="No" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs shrink-0">¿Tiene Alergias?:</span>
                  <PDFCheckbox checked={refugiado.alergias} label="Sí" />
                  <PDFCheckbox checked={!refugiado.alergias} label="No" />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-xs shrink-0">Condiciones Especiales (Marcar si aplica):</span>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <PDFCheckbox checked={refugiado.embarazo} label={`Embarazada ${refugiado.embarazo && refugiado.tiempo_embarazo ? `(Gestación: ${refugiado.tiempo_embarazo} semanas)` : ''}`} />
                  <PDFCheckbox checked={!!refugiado.lactante} label="Lactante" />
                  <PDFCheckbox checked={refugiado.discapacidad} label="Persona con discapacidad" />
                  <PDFCheckbox checked={refugiado.adulto_mayor_dependencia} label="Adulto mayor con dependencia" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. DETALLES DE MASCOTA */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              4. Detalles de Mascota
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs shrink-0">¿Tiene mascotas a cargo?:</span>
                <PDFCheckbox checked={refugiado.mascotas} label="Sí" />
                <PDFCheckbox checked={!refugiado.mascotas} label="No" />
              </div>

              {refugiado.mascotas && (
                <div className="grid grid-cols-3 gap-3 pl-4">
                  <div className="flex items-baseline">
                    <span className="font-bold text-xs shrink-0">Tipo:</span>
                    <span className="flex-1 ml-1.5 px-1 text-xs text-black font-semibold leading-none">
                      {refugiado.tipo_mascota || '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold text-xs shrink-0">Nombre:</span>
                    <span className="flex-1 ml-1.5 px-1 text-xs text-black font-semibold leading-none">
                      {refugiado.mascota_nombre || '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold text-xs shrink-0">Sexo:</span>
                    <span className="flex-1 ml-1.5 px-1 text-xs text-black font-semibold leading-none">
                      {refugiado.mascota_sexo === true ? 'Macho' : refugiado.mascota_sexo === false ? 'Hembra' : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="font-bold text-xs shrink-0">Raza:</span>
                    <span className="flex-1 ml-1.5 px-1 text-xs text-black font-semibold leading-none">
                      {refugiado.mascota_raza || '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline col-span-2">
                    <span className="font-bold text-xs shrink-0">Edad (años):</span>
                    <span className="flex-1 ml-1.5 px-1 text-xs text-black font-semibold leading-none">
                      {refugiado.mascota_edad?.toString() || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. VESTIMENTA */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              5. Tallas de Vestimenta
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Camisa:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {refugiado.talla_camisa || '—'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Pantalón:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {refugiado.talla_pantalon || '—'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Zapatos:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {refugiado.talla_zapatos || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 6. OBSERVACIONES */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              6. Observaciones
            </h3>
            <div className="p-2 border border-gray-300 rounded min-h-[60px]">
              <p className="text-xs text-black leading-relaxed whitespace-pre-wrap">
                {refugiado.observaciones || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA Y FIRMAS */}
        <div className="grid grid-cols-2 gap-16 pt-8 border-t border-gray-300">
          <div className="text-center">

            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 block">

            </span>
          </div>
          <div className="text-center">

            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 block">

            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FichaField({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</h4>
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className={`font-medium ${mono ? 'text-caracas-blue bg-caracas-blue/5 px-2.5 py-1 rounded-lg text-sm' : 'text-gray-800'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function BadgeSiNo({
  label,
  value,
  icon,
}: {
  label: string;
  value: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${value
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-gray-50 text-gray-400 border border-gray-100'
        }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}: {value ? 'Sí' : 'No'}
    </span>
  );
}

function PDFCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-black"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        {checked && (
          <>
            <line x1="8" y1="8" x2="16" y2="16" />
            <line x1="16" y1="8" x2="8" y2="16" />
          </>
        )}
      </svg>
      <span className="text-xs text-black font-medium">{label}</span>
    </span>
  );
}

