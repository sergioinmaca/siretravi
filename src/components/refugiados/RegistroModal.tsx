import React, { useState, useEffect, useRef } from 'react';
import { useCampamento } from '../../context/CampamentoContext';
import { User, Users, MapPin, Save, AlertCircle, CheckCircle2, X, Accessibility, Shirt, Loader2, Camera, FileText } from 'lucide-react';
import { useFotoUpload } from '../../hooks/useFotoUpload';
import { ESTATUS_OPTIONS, type Refugiado } from '../../types';
import { formatAge } from '../../lib/formatAge';
import { toDateInput, parseDateSafe } from '../../lib/formatDate';
import DateInput from '../ui/DateInput';
import CameraCapture from '../ui/CameraCapture';

interface RegistroModalProps {
  isOpen: boolean;
  onClose: () => void;
  refugiadoToEdit?: Refugiado | null;
}

export default function RegistroModal({ isOpen, onClose, refugiadoToEdit }: RegistroModalProps) {
  const { campamentoSeleccionado, familias = [], refugiados = [], agregarFamilia, agregarRefugiado, actualizarRefugiado, actualizarFotoRefugiado, eliminarFamilia } = useCampamento();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [mascotaFotoFile, setMascotaFotoFile] = useState<File | null>(null);
  const [mascotaFotoPreview, setMascotaFotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showMascotaCamera, setShowMascotaCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mascotaFileInputRef = useRef<HTMLInputElement>(null);
  const {
    isUploading,
    uploadError: fotoUploadError,
    setUploadError: setFotoUploadError,
    validarArchivo,
    uploadFoto: uploadFotoHook,
    deleteStorageFile,
    leerArchivoComoDataURL,
    convertirAJPEG,
  } = useFotoUpload();
  const isEditing = !!refugiadoToEdit;

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    nacionalidad: '',
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
    embarazo: false,
    tiempoEmbarazo: '',
    mascotas: false,
    tipoMascota: '',
    mascotaSexo: '',
    mascotaRaza: '',
    mascotaNombre: '',
    mascotaEdad: '',
    telefono: '',
    profesion: '',
    tallaCamisa: '',
    tallaPantalon: '',
    tallaZapatos: '',
    alergias: false,
    enfermedadCronica: false,
    lesionSismo: false,
    adultoMayorDependencia: false,
    lactante: false,
    nivelEducativo: '',
    condicionVivienda: '',
    tenenciaVivienda: '',
    ingresoFamiliar: '',
    observaciones: '',
    observacionesGenerales: '',
    parentesco: '',
    hogarSolidario: 'PRESENTE',
    registroCaptahuella: 'NO',
    registroUnicoVivienda: 'NO',
  });

  // Precargar datos cuando se edita
  useEffect(() => {
    if (!isOpen) return;

    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    setIsSubmitting(false);
    setShowSuccess(false);
    setShowError(false);

    if (refugiadoToEdit) {
      setFotoPreview(refugiadoToEdit.foto_url || null);
      setFotoFile(null);
      setMascotaFotoPreview(refugiadoToEdit.mascota_foto_url || null);
      setMascotaFotoFile(null);
      const birth = new Date(refugiadoToEdit.fecha_nacimiento);

      setFormData({
        nombres: refugiadoToEdit.nombres,
        apellidos: refugiadoToEdit.apellidos,
        nacionalidad: refugiadoToEdit.nacionalidad || '',
        cedula: refugiadoToEdit.cedula?.toString() || '',
        genero: refugiadoToEdit.genero ? 'M' : 'F',
        fechaNacimiento: toDateInput(birth),
        edad: '',
        esJefeFamilia: refugiadoToEdit.es_jefe_familia,
        familiaId: refugiadoToEdit.familia_id || '',
        nroCama: refugiadoToEdit.nro_cama || '',
        procedencia: refugiadoToEdit.procedencia,
        fechaIngreso: refugiadoToEdit.fecha_ingreso
          ? toDateInput(refugiadoToEdit.fecha_ingreso)
          : '',
        direccionExacta: refugiadoToEdit.direccion_exacta || '',
        discapacidad: refugiadoToEdit.discapacidad,
        embarazo: refugiadoToEdit.embarazo,
        tiempoEmbarazo: refugiadoToEdit.tiempo_embarazo?.toString() || '',
        mascotas: refugiadoToEdit.mascotas,
        tipoMascota: refugiadoToEdit.tipo_mascota || '',
        mascotaSexo: refugiadoToEdit.mascota_sexo === true ? 'M' : refugiadoToEdit.mascota_sexo === false ? 'F' : '',
        mascotaRaza: refugiadoToEdit.mascota_raza || '',
        mascotaNombre: refugiadoToEdit.mascota_nombre || '',
        mascotaEdad: refugiadoToEdit.mascota_edad?.toString() || '',
        telefono: refugiadoToEdit.telefono || '',
        profesion: refugiadoToEdit.profesion || '',
        tallaCamisa: refugiadoToEdit.talla_camisa || '',
        tallaPantalon: refugiadoToEdit.talla_pantalon || '',
        tallaZapatos: refugiadoToEdit.talla_zapatos || '',
        alergias: refugiadoToEdit.alergias,
        enfermedadCronica: refugiadoToEdit.enfermedad_cronica,
        lesionSismo: refugiadoToEdit.lesion_sismo,
        adultoMayorDependencia: refugiadoToEdit.adulto_mayor_dependencia,
        lactante: refugiadoToEdit.lactante || false,
        nivelEducativo: refugiadoToEdit.nivel_educativo || '',
        condicionVivienda: refugiadoToEdit.condicion_vivienda || '',
        tenenciaVivienda: refugiadoToEdit.tenencia_vivienda || '',
        ingresoFamiliar: refugiadoToEdit.ingreso_familiar || '',
        observaciones: refugiadoToEdit.observaciones || '',
        observacionesGenerales: refugiadoToEdit.observaciones_generales || '',
        parentesco: refugiadoToEdit.parentesco || '',
        hogarSolidario: refugiadoToEdit.hogar_solidario || 'PRESENTE',
        registroCaptahuella: refugiadoToEdit.registro_captahuella ? 'SI' : 'NO',
        registroUnicoVivienda: refugiadoToEdit.registro_unico_vivienda ? 'SI' : 'NO',
      });
    } else {
      setFotoPreview(null);
      setFotoFile(null);
      setMascotaFotoPreview(null);
      setMascotaFotoFile(null);
      setFormData({
        nombres: '', apellidos: '', nacionalidad: '', cedula: '', genero: 'M',
        fechaNacimiento: '', edad: '', esJefeFamilia: true, familiaId: '',
        nroCama: '', procedencia: '', fechaIngreso: '', direccionExacta: '',
        discapacidad: false,
        embarazo: false, tiempoEmbarazo: '', mascotas: false, tipoMascota: '',
        mascotaSexo: '', mascotaRaza: '', mascotaNombre: '', mascotaEdad: '',
        telefono: '', profesion: '',
        tallaCamisa: '', tallaPantalon: '', tallaZapatos: '',
        alergias: false,
        enfermedadCronica: false,
        lesionSismo: false,
        adultoMayorDependencia: false,
        lactante: false,
        nivelEducativo: '',
        condicionVivienda: '',
        tenenciaVivienda: '',
        ingresoFamiliar: '',
        observaciones: '',
        observacionesGenerales: '',
        parentesco: '',
        hogarSolidario: 'PRESENTE',
        registroCaptahuella: 'NO',
        registroUnicoVivienda: 'NO',
      });
    }
    return () => {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
      }
    };
  }, [isOpen, refugiadoToEdit]);

  useEffect(() => {
    if (formData.fechaNacimiento) {
      setFormData(prev => ({ ...prev, edad: formatAge(parseDateSafe(formData.fechaNacimiento)) }));
    }
  }, [formData.fechaNacimiento]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    const file = await convertirAJPEG(rawFile);

    const error = validarArchivo(file);
    if (error) {
      setFotoUploadError(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFotoUploadError(null);
    setFotoFile(file);
    const dataUrl = await leerArchivoComoDataURL(file);
    setFotoPreview(dataUrl);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMascotaFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    const file = await convertirAJPEG(rawFile);

    const error = validarArchivo(file);
    if (error) {
      setFotoUploadError(error);
      if (mascotaFileInputRef.current) mascotaFileInputRef.current.value = '';
      return;
    }

    setFotoUploadError(null);
    setMascotaFotoFile(file);
    const dataUrl = await leerArchivoComoDataURL(file);
    setMascotaFotoPreview(dataUrl);
    if (mascotaFileInputRef.current) mascotaFileInputRef.current.value = '';
  };

  const handleCameraCapture = async (file: File) => {
    setFotoUploadError(null);
    const jpeg = await convertirAJPEG(file);
    const error = validarArchivo(jpeg);
    if (error) {
      setFotoUploadError(error);
      return;
    }
    setFotoFile(jpeg);
    const dataUrl = await leerArchivoComoDataURL(jpeg);
    setFotoPreview(dataUrl);
  };

  const handleMascotaCameraCapture = async (file: File) => {
    setFotoUploadError(null);
    const jpeg = await convertirAJPEG(file);
    const error = validarArchivo(jpeg);
    if (error) {
      setFotoUploadError(error);
      return;
    }
    setMascotaFotoFile(jpeg);
    const dataUrl = await leerArchivoComoDataURL(jpeg);
    setMascotaFotoPreview(dataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campamentoSeleccionado || submittingRef.current) return;

    submittingRef.current = true;

    if (isEditing) {
      const confirmar = window.confirm('¿Estás seguro de que deseas modificar este registro?');
      if (!confirmar) {
        submittingRef.current = false;
        return;
      }
    }

    setShowError(false);
    setShowSuccess(false);
    setIsSubmitting(true);

    let familiaCreadaEnEsteSubmit: string | null = null;
    let finalFamiliaId = formData.familiaId;

    console.log('[DEBUG-FAMILIA] RegistroModal.handleSubmit — formData.familiaId:', formData.familiaId, '| esJefeFamilia:', formData.esJefeFamilia, '| isEditing:', isEditing);

    if (formData.esJefeFamilia) {
      if (isEditing && refugiadoToEdit?.familia_id) {
        finalFamiliaId = refugiadoToEdit.familia_id;
      } else {
        const nombreFamilia = `FAMILIA ${formData.nombres} ${formData.apellidos}`;
        const existente = familias.find(
          f => f.campamento_id === campamentoSeleccionado.id && f.nombre === nombreFamilia
        );
        if (existente) {
          finalFamiliaId = existente.id;
        } else {
          const familiaCreada = await agregarFamilia({
            id: '',
            campamento_id: campamentoSeleccionado.id,
            nombre: nombreFamilia
          });
          if (!familiaCreada) {
            setShowError(true);
            setIsSubmitting(false);
            submittingRef.current = false;
            return;
          }
          finalFamiliaId = familiaCreada.id;
          familiaCreadaEnEsteSubmit = familiaCreada.id;
        }
      }
    }

    console.log('[DEBUG-FAMILIA] RegistroModal.handleSubmit — finalFamiliaId:', finalFamiliaId, '| esJefeFamilia:', formData.esJefeFamilia);

    let refugiadoId = refugiadoToEdit?.id || '';
    const campamentoId = campamentoSeleccionado.id;

    const payload: Refugiado = {
      id: refugiadoId,
      campamento_id: campamentoSeleccionado.id,
      familia_id: finalFamiliaId,
      codigo: refugiadoToEdit?.codigo || '',
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      nacionalidad: formData.nacionalidad || undefined,
      cedula: formData.cedula ? parseInt(formData.cedula) : undefined,
      genero: formData.genero === 'M',
      fecha_nacimiento: parseDateSafe(formData.fechaNacimiento),
      es_jefe_familia: formData.esJefeFamilia,
      nro_cama: formData.nroCama || undefined,
      procedencia: formData.procedencia,
      fecha_ingreso: formData.fechaIngreso ? parseDateSafe(formData.fechaIngreso) : undefined,
      direccion_exacta: formData.direccionExacta || undefined,
      discapacidad: formData.discapacidad,
      embarazo: formData.embarazo,
      tiempo_embarazo: formData.tiempoEmbarazo ? parseInt(formData.tiempoEmbarazo) : undefined,
      mascotas: formData.mascotas,
      tipo_mascota: formData.tipoMascota,
      mascota_sexo: formData.mascotaSexo === 'M' ? true : formData.mascotaSexo === 'F' ? false : undefined,
      mascota_raza: formData.mascotaRaza || undefined,
      mascota_nombre: formData.mascotaNombre || undefined,
      mascota_edad: formData.mascotaEdad ? parseInt(formData.mascotaEdad) : undefined,
      telefono: formData.telefono || undefined,
      profesion: formData.profesion || undefined,
      talla_camisa: formData.tallaCamisa || undefined,
      talla_pantalon: formData.tallaPantalon || undefined,
      talla_zapatos: formData.tallaZapatos || undefined,
      alergias: formData.alergias,
      enfermedad_cronica: formData.enfermedadCronica,
      lesion_sismo: formData.lesionSismo,
      adulto_mayor_dependencia: formData.adultoMayorDependencia,
      lactante: formData.genero === 'F' ? formData.lactante : undefined,
      nivel_educativo: formData.nivelEducativo || undefined,
      condicion_vivienda: formData.condicionVivienda || undefined,
      tenencia_vivienda: formData.tenenciaVivienda || undefined,
      ingreso_familiar: formData.ingresoFamiliar || undefined,
      observaciones: formData.observaciones || undefined,
      observaciones_generales: formData.observacionesGenerales || undefined,
      parentesco: formData.parentesco || undefined,
      hogar_solidario: formData.hogarSolidario,
      registro_captahuella: formData.registroCaptahuella === 'SI',
      registro_unico_vivienda: formData.registroUnicoVivienda === 'SI',
      foto_url: refugiadoToEdit?.foto_url || undefined,
      mascota_foto_url: refugiadoToEdit?.mascota_foto_url || undefined,
    };

    let guardadoExitoso = false;

    console.log('[DEBUG-FAMILIA] RegistroModal.handleSubmit — payload.familia_id:', payload.familia_id, '| llamando a', isEditing ? 'actualizarRefugiado' : 'agregarRefugiado');

    if (isEditing && refugiadoToEdit) {
      guardadoExitoso = await actualizarRefugiado(refugiadoToEdit.id, payload);
    } else {
      const refugiadoCreado = await agregarRefugiado(payload);
      guardadoExitoso = !!refugiadoCreado;
      if (refugiadoCreado) {
        refugiadoId = refugiadoCreado.id;
      }
    }

    if (!guardadoExitoso) {
      if (familiaCreadaEnEsteSubmit) {
        await eliminarFamilia(familiaCreadaEnEsteSubmit);
      }
      setShowError(true);
      setIsSubmitting(false);
      submittingRef.current = false;
      return;
    }

    let finalFotoUrl: string | null | undefined = undefined;
    let finalMascotaFotoUrl: string | null | undefined = undefined;
    let fotoChanged = false;
    let mascotaFotoChanged = false;
    let fotoUploadFailed = false;

    if (!isEditing && (fotoFile || mascotaFotoFile)) {
      if (fotoFile) {
        const foto_url = await uploadFotoHook(fotoFile, campamentoId, refugiadoId);
        if (foto_url) {
          finalFotoUrl = foto_url;
          fotoChanged = true;
        } else {
          fotoUploadFailed = true;
        }
      }

      if (mascotaFotoFile) {
        const mascota_foto_url = await uploadFotoHook(mascotaFotoFile, campamentoId, refugiadoId, 'mascota');
        if (mascota_foto_url) {
          finalMascotaFotoUrl = mascota_foto_url;
          mascotaFotoChanged = true;
        } else {
          fotoUploadFailed = true;
        }
      }

      if (fotoChanged || mascotaFotoChanged) {
        const fotoUpdate: { foto_url?: string | null; mascota_foto_url?: string | null } = {};
        if (fotoChanged) fotoUpdate.foto_url = finalFotoUrl;
        if (mascotaFotoChanged) fotoUpdate.mascota_foto_url = finalMascotaFotoUrl;

        const ok = await actualizarFotoRefugiado(refugiadoId, fotoUpdate);
        if (!ok) {
          fotoUploadFailed = true;
          if (finalFotoUrl) await deleteStorageFile(finalFotoUrl);
          if (finalMascotaFotoUrl) await deleteStorageFile(finalMascotaFotoUrl);
        }
      }
    }

    if (isEditing) {
      let deleteOldFotoUrl: string | null = null;
      let deleteOldMascotaFotoUrl: string | null = null;

      if (fotoFile && refugiadoId) {
        const foto_url = await uploadFotoHook(fotoFile, campamentoId, refugiadoId);
        if (foto_url) {
          finalFotoUrl = foto_url;
          fotoChanged = true;
          deleteOldFotoUrl = refugiadoToEdit?.foto_url || null;
        } else {
          fotoUploadFailed = true;
        }
      }

      if (mascotaFotoFile && refugiadoId) {
        const mascota_foto_url = await uploadFotoHook(mascotaFotoFile, campamentoId, refugiadoId, 'mascota');
        if (mascota_foto_url) {
          finalMascotaFotoUrl = mascota_foto_url;
          mascotaFotoChanged = true;
          deleteOldMascotaFotoUrl = refugiadoToEdit?.mascota_foto_url || null;
        } else {
          fotoUploadFailed = true;
        }
      }

      if (!fotoFile && !fotoPreview && refugiadoToEdit?.foto_url) {
        finalFotoUrl = null;
        fotoChanged = true;
        deleteOldFotoUrl = refugiadoToEdit.foto_url;
      }

      if (!mascotaFotoFile && !mascotaFotoPreview && refugiadoToEdit?.mascota_foto_url) {
        finalMascotaFotoUrl = null;
        mascotaFotoChanged = true;
        deleteOldMascotaFotoUrl = refugiadoToEdit.mascota_foto_url;
      }

      if (fotoChanged || mascotaFotoChanged) {
        const fotoUpdate: { foto_url?: string | null; mascota_foto_url?: string | null } = {};
        if (fotoChanged) fotoUpdate.foto_url = finalFotoUrl;
        if (mascotaFotoChanged) fotoUpdate.mascota_foto_url = finalMascotaFotoUrl;

        const ok = await actualizarFotoRefugiado(refugiadoId, fotoUpdate);
        if (!ok) {
          fotoUploadFailed = true;
          if (finalFotoUrl) await deleteStorageFile(finalFotoUrl);
          if (finalMascotaFotoUrl) await deleteStorageFile(finalMascotaFotoUrl);
        } else {
          if (deleteOldFotoUrl) await deleteStorageFile(deleteOldFotoUrl);
          if (deleteOldMascotaFotoUrl) await deleteStorageFile(deleteOldMascotaFotoUrl);
        }
      }
    }

    if (fotoUploadFailed) {
      setShowError(true);
      submittingRef.current = false;
    } else {
      setShowSuccess(true);
      submittingRef.current = false;
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    }

    setIsSubmitting(false);
  };

  const isDirty = () => {
    if (isEditing && refugiadoToEdit) {
      return formData.nombres !== refugiadoToEdit.nombres ||
        formData.apellidos !== refugiadoToEdit.apellidos ||
        (formData.cedula || '') !== (refugiadoToEdit.cedula?.toString() || '') ||
        formData.nacionalidad !== (refugiadoToEdit.nacionalidad || '') ||
        formData.genero !== (refugiadoToEdit.genero ? 'M' : 'F') ||
        formData.fechaNacimiento !== toDateInput(new Date(refugiadoToEdit.fecha_nacimiento)) ||
        formData.nroCama !== (refugiadoToEdit.nro_cama || '') ||
        formData.procedencia !== refugiadoToEdit.procedencia ||
        formData.direccionExacta !== (refugiadoToEdit.direccion_exacta || '') ||
        (formData.fechaIngreso || '') !== (refugiadoToEdit.fecha_ingreso ? toDateInput(refugiadoToEdit.fecha_ingreso) : '') ||
        formData.telefono !== (refugiadoToEdit.telefono || '') ||
        formData.profesion !== (refugiadoToEdit.profesion || '') ||
        formData.tallaCamisa !== (refugiadoToEdit.talla_camisa || '') ||
        formData.tallaPantalon !== (refugiadoToEdit.talla_pantalon || '') ||
        formData.tallaZapatos !== (refugiadoToEdit.talla_zapatos || '') ||
        formData.observaciones !== (refugiadoToEdit.observaciones || '') ||
        formData.observacionesGenerales !== (refugiadoToEdit.observaciones_generales || '') ||
        formData.parentesco !== (refugiadoToEdit.parentesco || '') ||
        formData.nivelEducativo !== (refugiadoToEdit.nivel_educativo || '') ||
        formData.mascotaNombre !== (refugiadoToEdit.mascota_nombre || '') ||
        formData.mascotaRaza !== (refugiadoToEdit.mascota_raza || '') ||
        formData.mascotaEdad !== (refugiadoToEdit.mascota_edad?.toString() || '') ||
        formData.tipoMascota !== (refugiadoToEdit.tipo_mascota || '') ||
        formData.esJefeFamilia !== refugiadoToEdit.es_jefe_familia ||
        formData.discapacidad !== refugiadoToEdit.discapacidad ||
        formData.alergias !== refugiadoToEdit.alergias ||
        formData.enfermedadCronica !== refugiadoToEdit.enfermedad_cronica ||
        formData.lesionSismo !== refugiadoToEdit.lesion_sismo ||
        formData.adultoMayorDependencia !== refugiadoToEdit.adulto_mayor_dependencia ||
        formData.lactante !== (refugiadoToEdit.lactante || false) ||
        formData.embarazo !== refugiadoToEdit.embarazo ||
        formData.mascotas !== refugiadoToEdit.mascotas ||
        formData.hogarSolidario !== (refugiadoToEdit.hogar_solidario || 'PRESENTE') ||
        formData.registroCaptahuella !== (refugiadoToEdit.registro_captahuella ? 'SI' : 'NO') ||
        formData.registroUnicoVivienda !== (refugiadoToEdit.registro_unico_vivienda ? 'SI' : 'NO') ||
        fotoFile !== null ||
        mascotaFotoFile !== null ||
        (fotoPreview !== null && fotoPreview !== refugiadoToEdit.foto_url) ||
        (mascotaFotoPreview !== null && mascotaFotoPreview !== refugiadoToEdit.mascota_foto_url);
    }

    return formData.nombres !== '' ||
      formData.apellidos !== '' ||
      formData.cedula !== '' ||
      formData.genero !== 'M' ||
      formData.fechaNacimiento !== '' ||
      formData.nroCama !== '' ||
      formData.procedencia !== '' ||
      formData.direccionExacta !== '' ||
      formData.fechaIngreso !== '' ||
      formData.telefono !== '' ||
      formData.profesion !== '' ||
      formData.tallaCamisa !== '' ||
      formData.tallaPantalon !== '' ||
      formData.tallaZapatos !== '' ||
      formData.observaciones !== '' ||
      formData.observacionesGenerales !== '' ||
      formData.parentesco !== '' ||
      formData.nivelEducativo !== '' ||
      formData.mascotaNombre !== '' ||
      formData.mascotaRaza !== '' ||
      formData.mascotaEdad !== '' ||
      formData.tipoMascota !== '' ||
      formData.discapacidad !== false ||
      formData.alergias !== false ||
      formData.enfermedadCronica !== false ||
      formData.lesionSismo !== false ||
      formData.adultoMayorDependencia !== false ||
      formData.lactante !== false ||
      formData.embarazo !== false ||
      formData.mascotas !== false ||
      formData.esJefeFamilia !== true ||
      formData.hogarSolidario !== 'PRESENTE' ||
      formData.registroCaptahuella !== 'NO' ||
      formData.registroUnicoVivienda !== 'NO' ||
      fotoFile !== null ||
      mascotaFotoFile !== null ||
      fotoPreview !== null ||
      mascotaFotoPreview !== null;
  };

  const handleClose = () => {
    if (submittingRef.current) return;
    if (isDirty()) {
      if (!window.confirm('Estás saliendo de un registro con información cargada. ¿Seguro que quieres salir?')) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (<>
    <div className="fixed inset-0 z-[60] flex flex-col md:items-center md:justify-center md:p-4 md:bg-gray-900/40 md:backdrop-blur-sm">
      <div className="bg-white w-full h-full pt-4 md:pt-0 md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden animate-slide-up relative">
        
        {/* Cabecera del Modal — Desktop */}
        <div className="hidden md:flex px-8 py-5 border-b border-gray-100 items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-[21px] font-semibold md:text-2xl md:font-bold text-gray-800">
              {isEditing ? 'Modificar Integrante' : 'Registrar Nuevo Integrante'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Destino: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
            </p>
          </div>
          <button onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors hidden md:block">
            <X size={24} />
          </button>
        </div>

        <button onClick={handleClose} className="absolute top-10 right-4 z-20 md:hidden p-2 bg-caracas-red hover:bg-red-800 rounded-full text-white transition-colors">
          <X size={24} />
        </button>

        {/* Cuerpo Scrollable */}
        <div className="px-2 py-4 pb-[72px] md:p-8 overflow-y-auto flex-1 bg-gray-50/30">

          {/* Título móvil — scrollea con el contenido */}
          <div className="md:hidden mb-4">
            <h2 className="text-[21px] font-semibold text-gray-800">
              {isEditing ? 'Modificar Integrante' : 'Registrar Nuevo Integrante'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Destino: <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
            </p>
          </div>

          {!campamentoSeleccionado && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <AlertCircle size={20} />
              <p className="font-medium text-sm">Debes seleccionar un campamento en la barra superior antes de registrar.</p>
            </div>
          )}

          {showSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <CheckCircle2 size={20} className="text-green-600" />
              <p className="font-medium">{isEditing ? '¡Integrante modificado exitosamente!' : '¡Integrante registrado exitosamente!'}</p>
            </div>
          )}

          {showError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3 mb-6 shadow-sm">
              <AlertCircle size={20} className="text-red-600" />
              <p className="font-medium">Error al guardar. Inténtalo de nuevo o contacta al administrador.</p>
            </div>
          )}

          <form id="registro-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Tarjeta 1: Datos Personales */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-caracas-blue/10 rounded-lg">
                  <User size={18} className="text-caracas-blue" />
                </div>
                <h3 className="font-semibold text-gray-800">1. Datos Personales</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                  <div className="flex items-start gap-4">
                    {fotoPreview ? (
                      <div className="relative group shrink-0">
                        <img src={fotoPreview} alt="Preview" className="w-24 h-[100px] object-contain rounded-xl border-2 border-gray-200 bg-gray-100" />
                        <button
                          type="button"
                          onClick={() => { setFotoPreview(null); setFotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-24 h-[100px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-caracas-red hover:text-caracas-red hover:bg-red-50/30 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 size={20} className="animate-spin" />
                              <span className="text-[9px] font-medium">Subiendo...</span>
                            </>
                          ) : (
                            <>
                              <Camera size={20} />
                              <span className="text-[9px] font-medium">Foto</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCamera(true)}
                          disabled={isUploading}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-caracas-red hover:text-caracas-red transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Camera size={14} />
                          <span className="text-[9px] font-medium">Cámara</span>
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                    <input
                      ref={mascotaFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleMascotaFotoChange}
                    />
                    <div>
                      <p className="text-xs text-gray-400 mt-1">Formatos JPG o JPEG. Máx. 1 MB.</p>
                      {fotoUploadError && (
                        <p className="text-xs text-red-500 mt-1">{fotoUploadError}</p>
                      )}
                    </div>
                  </div>
                </div>
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
                  <div className="flex gap-2">
                    <select name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} className="w-20 px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                      <option value="">--</option>
                      <option value="V">V</option>
                      <option value="E">E</option>
                      <option value="P">P</option>
                    </select>
                    <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" placeholder="Ej. 12345678" />
                  </div>
                </div>
                {isEditing && refugiadoToEdit?.codigo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <input type="text" value={refugiadoToEdit.codigo} readOnly className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                  <select name="genero" value={formData.genero} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                    <option value="M">MASCULINO</option>
                    <option value="F">FEMENINO</option>
                  </select>
                </div>
                <DateInput
                  label="Fecha de Nacimiento"
                  required
                  value={formData.fechaNacimiento}
                  onChange={(v) => setFormData(prev => ({ ...prev, fechaNacimiento: v }))}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                  <input type="text" name="edad" value={formData.edad} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 outline-none" placeholder="Calculada auto" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
                  <input type="text" inputMode="numeric" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" placeholder="Ej. 04141234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesión u Ocupación (Opcional)</label>
                  <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. INGENIERO CIVIL" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel Educativo</label>
                  <select name="nivelEducativo" value={formData.nivelEducativo} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                    <option value="">-- SELECCIONE --</option>
                    <option value="Ninguno">NINGUNO</option>
                    <option value="Primaria">PRIMARIA</option>
                    <option value="Secundaria">SECUNDARIA</option>
                    <option value="Universitario">UNIVERSITARIO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Familia */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
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
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco con el jefe/a</label>
                      <input type="text" name="parentesco" value={formData.parentesco} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. HIJO, ESPOSA, HERMANO" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta 3: Ubicación */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <MapPin size={18} className="text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-800">3. Ubicación y Procedencia</h3>
              </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nro de cama / Estatus</label>
                  <div className="flex items-center gap-3">
                    <input type="text" name="nroCama" value={formData.nroCama} onChange={handleChange} maxLength={3} pattern="[0-9]{0,3}" className="w-28 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all" placeholder="EJ. 042" />
                    <select name="hogarSolidario" value={formData.hogarSolidario} onChange={handleChange} className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-gray-800 text-sm">
                      {ESTATUS_OPTIONS.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
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
                <DateInput
                  label="Fecha de Ingreso"
                  value={formData.fechaIngreso}
                  onChange={(v) => setFormData(prev => ({ ...prev, fechaIngreso: v }))}
                />
              </div>
            </div>

            {/* Tarjeta 4: Situación Socioeconómica de la Vivienda de Origen */}
            {formData.esJefeFamilia && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800">4. Situación Socioeconómica de la Vivienda de Origen</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condición de la vivienda tras el sismo</label>
                  <select name="condicionVivienda" value={formData.condicionVivienda} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                    <option value="">-- SELECCIONE --</option>
                    <option value="Pérdida Total/Colapso">PERDIDA TOTAL / COLAPSO</option>
                    <option value="Daño Estructural grave/Inhabitable">DANO ESTRUCTURAL GRAVE / INHABITABLE</option>
                    <option value="Zona de Alto Riesgo/Desalojo Preventivo">ZONA DE ALTO RIESGO / DESALOJO PREVENTIVO</option>
                  </select>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Tenencia de la Vivienda</label>
                  <div className="flex flex-col gap-2 md:flex-row md:gap-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tenenciaVivienda" checked={formData.tenenciaVivienda === 'Propia'} onChange={() => setFormData(prev => ({ ...prev, tenenciaVivienda: 'Propia' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Propia</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tenenciaVivienda" checked={formData.tenenciaVivienda === 'Alquilada'} onChange={() => setFormData(prev => ({ ...prev, tenenciaVivienda: 'Alquilada' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Alquilada</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tenenciaVivienda" checked={formData.tenenciaVivienda === 'Compartida/Familiar'} onChange={() => setFormData(prev => ({ ...prev, tenenciaVivienda: 'Compartida/Familiar' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Compartida / Familiar</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tenenciaVivienda" checked={formData.tenenciaVivienda === 'Pensión'} onChange={() => setFormData(prev => ({ ...prev, tenenciaVivienda: 'Pensión' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Pensión</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Ingreso Familiar Principal antes de la Emergencia</label>
                  <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ingresoFamiliar" checked={formData.ingresoFamiliar === 'Trabajo formal'} onChange={() => setFormData(prev => ({ ...prev, ingresoFamiliar: 'Trabajo formal' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Trabajo formal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ingresoFamiliar" checked={formData.ingresoFamiliar === 'Trabajo Informal/Comercio'} onChange={() => setFormData(prev => ({ ...prev, ingresoFamiliar: 'Trabajo Informal/Comercio' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Trabajo Informal / Comercio</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ingresoFamiliar" checked={formData.ingresoFamiliar === 'Remesas'} onChange={() => setFormData(prev => ({ ...prev, ingresoFamiliar: 'Remesas' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Remesas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ingresoFamiliar" checked={formData.ingresoFamiliar === 'Ayuda Social/Bonos'} onChange={() => setFormData(prev => ({ ...prev, ingresoFamiliar: 'Ayuda Social/Bonos' }))} className="w-5 h-5 text-caracas-red focus:ring-caracas-red" />
                      <span className="text-gray-700">Ayuda Social / Bonos</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                  <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none" placeholder="Observaciones adicionales sobre la situación socioeconómica..." />
                </div>
              </div>
            </div>
            )}

            {/* Tarjeta 5: Información Adicional */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Accessibility size={18} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800">5. Información Adicional</h3>
              </div>
              <div className="p-6 space-y-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.discapacidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, discapacidad: e.target.checked }))}
                    className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                  />
                  <span className="text-gray-700 font-medium">¿Presenta alguna discapacidad?</span>
                </label>

                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.alergias}
                      onChange={(e) => setFormData(prev => ({ ...prev, alergias: e.target.checked }))}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">¿Presenta alguna alergia?</span>
                  </label>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enfermedadCronica}
                      onChange={(e) => setFormData(prev => ({ ...prev, enfermedadCronica: e.target.checked }))}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">¿Posee alguna enfermedad que requiera tratamiento de por vida?</span>
                  </label>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.lesionSismo}
                      onChange={(e) => setFormData(prev => ({ ...prev, lesionSismo: e.target.checked }))}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">¿Presenta alguna lesión física a causa del sismo?</span>
                  </label>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.adultoMayorDependencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, adultoMayorDependencia: e.target.checked }))}
                      className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                    />
                    <span className="text-gray-700 font-medium">¿Adulto mayor en situación de dependencia?</span>
                  </label>
                </div>

                {formData.genero === 'F' && (
                  <div className="border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.lactante}
                        onChange={(e) => setFormData(prev => ({ ...prev, lactante: e.target.checked }))}
                        className="w-5 h-5 text-caracas-red focus:ring-caracas-red rounded"
                      />
                      <span className="text-gray-700 font-medium">¿Es lactante?</span>
                    </label>
                  </div>
                )}

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
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            {mascotaFotoPreview ? (
                              <div className="relative group">
                                <img
                                  src={mascotaFotoPreview}
                                  alt="Foto de la mascota"
                                  className="w-24 h-[100px] object-contain rounded-xl border-2 border-gray-200 bg-gray-100"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => mascotaFileInputRef.current?.click()}
                                  disabled={isUploading}
                                  className="w-24 h-[100px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-caracas-red hover:text-caracas-red hover:bg-red-50/30 transition-colors disabled:opacity-50"
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 size={20} className="animate-spin" />
                                      <span className="text-[8px] font-medium text-center leading-tight">Subiendo...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Camera size={20} />
                                      <span className="text-[9px] font-medium text-center leading-tight">Foto<br />Mascota</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowMascotaCamera(true)}
                                  disabled={isUploading}
                                  className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-caracas-red hover:text-caracas-red transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                  <Camera size={14} />
                                  <span className="text-[9px] font-medium">Cámara</span>
                                </button>
                              </div>
                            )}
                            {mascotaFotoPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMascotaFotoFile(null);
                                  setMascotaFotoPreview(null);
                                  if (mascotaFileInputRef.current) mascotaFileInputRef.current.value = '';
                                }}
                                className="w-24 mt-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                              >
                                Quitar foto
                              </button>
                            )}
                          </div>
                          <div className="flex-1 space-y-4">
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
                              <div className="flex gap-1">
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
              </div>
            </div>
            
            {/* Tarjeta 6: Vestimenta */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Shirt size={18} className="text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800">6. Vestimenta</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla de Camisa (Opcional)</label>
                  <input type="text" name="tallaCamisa" value={formData.tallaCamisa} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. M, L, XL" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla de Pantalón (Opcional)</label>
                  <input type="text" name="tallaPantalon" value={formData.tallaPantalon} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. 32, 34, M, L" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla de Zapatos (Opcional)</label>
                  <input type="text" name="tallaZapatos" value={formData.tallaZapatos} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase" placeholder="EJ. 38, 40, 42" />
                </div>
              </div>
            </div>

            {/* Tarjeta 7: Observaciones Generales */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText size={18} className="text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-800">7. Observaciones Generales (Opcional)</h3>
              </div>
              <div className="p-6">
                <textarea name="observacionesGenerales" value={formData.observacionesGenerales} onChange={handleChange} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all uppercase resize-none" placeholder="Observaciones generales sobre el integrante..." />
              </div>
            </div>

            {/* Tarjeta 8: Registros Institucionales */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800">8. Registros Institucionales</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Registro Captahuella?</label>
                  <select name="registroCaptahuella" value={formData.registroCaptahuella} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Registro Único de Vivienda?</label>
                  <select name="registroUnicoVivienda" value={formData.registroUnicoVivienda} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all">
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botones de acción — solo móvil */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-200 md:hidden">
              <div className="p-6 flex items-center justify-end gap-3">
                <button onClick={handleClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={!campamentoSeleccionado || isSubmitting} className="flex items-center bg-caracas-red hover:bg-red-800 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center">
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar Registro'}
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Footer — Desktop */}
        <div className="hidden md:flex px-8 py-5 border-t border-gray-100 bg-gray-50 shrink-0 items-center justify-end gap-3">
          <button onClick={handleClose} type="button" className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="registro-form" disabled={!campamentoSeleccionado || isSubmitting} className="flex items-center bg-caracas-red hover:bg-red-800 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center">
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar Registro'}
          </button>
        </div>

      </div>
    </div>

    <CameraCapture
      isOpen={showCamera}
      onClose={() => setShowCamera(false)}
      onCapture={handleCameraCapture}
    />

    <CameraCapture
      isOpen={showMascotaCamera}
      onClose={() => setShowMascotaCamera(false)}
      onCapture={handleMascotaCameraCapture}
    />
  </>);
}