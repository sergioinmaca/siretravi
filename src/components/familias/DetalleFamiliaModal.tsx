import { useState } from 'react';
import { X, Users, BedDouble, Calendar, MapPin, Home, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useCampamento } from '../../context/CampamentoContext';
import { toDisplayDate } from '../../lib/formatDate';
import type { Familia } from '../../types';

interface DetalleFamiliaModalProps {
  isOpen: boolean;
  onClose: () => void;
  familia: Familia | null;
}

export default function DetalleFamiliaModal({ isOpen, onClose, familia }: DetalleFamiliaModalProps) {
  const { refugiados = [] } = useCampamento();
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !familia) return null;

  const integrantes = refugiados.filter(r => r.familia_id === familia.id);
  const jefe = integrantes.find(r => r.es_jefe_familia);

  const sortedIntegrantes = [...integrantes].sort((a, b) =>
    a.es_jefe_familia ? -1 : b.es_jefe_familia ? 1 : 0
  );

  const calcularEdad = (fechaNacimiento: Date | string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const container = document.getElementById('ficha-familiar-pdf');
      if (!container) return;

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Ficha_Familiar_${familia.nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex-1 text-center ml-8">
            <h2 className="text-xl font-bold text-gray-800">Ficha Familiar</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {familia.nombre} — {integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">

          {/* Ficha del Jefe de Familia */}
          {jefe && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fecha de Registro</h4>
                  <div className="flex items-center gap-2 text-gray-800">
                    <Calendar size={16} className="text-caracas-blue shrink-0" />
                    <span className="font-medium">{jefe.fecha_ingreso ? toDisplayDate(jefe.fecha_ingreso) : '—'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Procedencia</h4>
                  <div className="flex items-center gap-2 text-gray-800 justify-end">
                    <MapPin size={16} className="text-caracas-blue shrink-0" />
                    <span className="font-medium">{jefe.procedencia || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dirección</h4>
                <div className="flex items-center gap-2 text-gray-800">
                  <Home size={16} className="text-caracas-blue shrink-0" />
                  <span className="font-medium">{jefe.direccion_exacta || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Integrantes */}
          {integrantes.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Código</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cédula</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Apellidos y Nombres</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Edad</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Género</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Cama</th>
                      <th className="py-4 px-6 font-semibold text-sm text-gray-500">Parentesco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedIntegrantes.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-6 text-sm font-medium text-caracas-blue">{p.codigo || '—'}</td>
                        <td className="py-3 px-6 text-sm font-medium text-gray-700">{p.cedula?.toString() || 'S/N'}</td>
                        <td className="py-3 px-6">
                          <div className="text-sm font-bold text-gray-800">{p.apellidos}</div>
                          <div className="text-xs text-gray-500">{p.nombres}</div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-600">{calcularEdad(p.fecha_nacimiento)} años</td>
                        <td className="py-3 px-6">
                          <span className={`text-sm font-medium ${p.genero ? 'text-blue-600' : 'text-pink-600'}`}>
                            {p.genero ? 'M' : 'F'}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-caracas-red">
                            <BedDouble size={14} />
                            {p.nro_cama || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-600">
                          {p.es_jefe_familia ? '' : (p.parentesco || '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-500">Esta familia no tiene integrantes registrados</p>
            </div>
          )}

          {/* Situación Socioeconómica de la Vivienda de Origen */}
          {jefe && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin size={18} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Situación Socioeconómica de la Vivienda de Origen</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Condición de la vivienda tras el sismo</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.condicion_vivienda || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tenencia de la Vivienda</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.tenencia_vivienda || '—'}</p>
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ingreso Familiar Principal antes de la Emergencia</h4>
                  <p className="text-sm font-medium text-gray-800">{jefe.ingreso_familiar || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
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
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>

      {/* PDF Generation Off-Screen Template */}
      <div
        id="ficha-familiar-pdf"
        className="absolute left-[-9999px] top-[-9999px] bg-white text-black font-sans w-[800px] p-12 flex flex-col select-none"
        style={{
          boxSizing: 'border-box',
          lineHeight: '1.25'
        }}
      >
        {/* CABECERA */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="flex flex-col items-center w-32 shrink-0">
            <svg className="w-12 h-12 text-red-600 animate-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-[10px] font-black text-center mt-1 uppercase leading-none tracking-tight">
              Alcaldía<br />de Caracas
            </span>
          </div>
          <div className="flex-1 text-center px-4 mt-2">
            <h2 className="text-sm font-black uppercase tracking-wider">
              FICHA FAMILIAR
            </h2>
            <p className="text-[10px] font-semibold text-gray-600 mt-1">
              {familia.nombre} — {integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right w-48 mt-2 shrink-0" />
        </div>

        {/* 1. DATOS DEL JEFE DE FAMILIA */}
        {jefe && (
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              1. Datos del Jefe de Familia
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Nombres y Apellidos:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.nombres} {jefe.apellidos}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Cédula:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {jefe.cedula?.toString() || 'S/N'}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Fecha Nacimiento:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {toDisplayDate(jefe.fecha_nacimiento)}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Edad:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {calcularEdad(jefe.fecha_nacimiento)} años
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-xs shrink-0">Género:</span>
                  <div className="flex gap-4">
                    <PDFCheckbox checked={jefe.genero} label="Masculino (M)" />
                    <PDFCheckbox checked={!jefe.genero} label="Femenino (F)" />
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-xs shrink-0">Nro de Cama:</span>
                  <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                    {jefe.nro_cama || '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Fecha de Ingreso:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.fecha_ingreso ? toDisplayDate(jefe.fecha_ingreso) : '—'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Procedencia:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.procedencia || '—'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Dirección Exacta:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.direccion_exacta || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. INTEGRANTES DE LA FAMILIA */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
            2. Integrantes de la Familia
          </h3>
          {integrantes.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Código</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Cédula</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Apellidos y Nombres</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Edad</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Gén</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Cama</th>
                  <th className="border border-gray-300 py-1.5 px-2 text-[10px] font-bold text-left">Parentesco</th>
                </tr>
              </thead>
              <tbody>
                {sortedIntegrantes.map((p) => (
                  <tr key={p.id}>
                    <td className="border border-gray-300 py-1 px-2 text-[9px] font-medium">{p.codigo || '—'}</td>
                    <td className="border border-gray-300 py-1 px-2 text-[9px] font-medium">{p.cedula?.toString() || 'S/N'}</td>
                    <td className="border border-gray-300 py-1 px-2 text-[9px]">
                      <span className="font-bold">{p.apellidos}</span>, {p.nombres}
                    </td>
                    <td className="border border-gray-300 py-1 px-2 text-[9px]">{calcularEdad(p.fecha_nacimiento)}</td>
                    <td className="border border-gray-300 py-1 px-2 text-[9px] text-center">{p.genero ? 'M' : 'F'}</td>
                    <td className="border border-gray-300 py-1 px-2 text-[9px]">{p.nro_cama || '—'}</td>
                    <td className="border border-gray-300 py-1 px-2 text-[9px]">
                      {p.es_jefe_familia ? 'Jefe' : (p.parentesco || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-500 italic">Sin integrantes registrados</p>
          )}
        </div>

        {/* 3. SITUACIÓN SOCIOECONÓMICA */}
        {jefe && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider bg-gray-100 p-1 border-l-4 border-red-600">
              3. Situación Socioeconómica de la Vivienda de Origen
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Condición de la vivienda tras el sismo:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.condicion_vivienda || '—'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Tenencia de la Vivienda:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.tenencia_vivienda || '—'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-xs shrink-0">Ingreso Familiar Principal antes de la Emergencia:</span>
                <span className="flex-1 ml-2 px-1 text-sm font-semibold text-black leading-none">
                  {jefe.ingreso_familiar || '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
