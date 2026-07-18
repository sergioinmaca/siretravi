import { useState, useEffect, useRef } from 'react';
import { X, FileText, User, Users, MapPin, Download } from 'lucide-react';
import { useCampamento } from '../../context/CampamentoContext';
import { obtenerTipoActa } from '../../lib/actas';
import { formatAge } from '../../lib/formatAge';
import { formatCedula } from '../../lib/formatCedula';
import ActaPreview from './ActaPreview';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Acta, Refugiado, TipoActa } from '../../types';

interface ActaLecturaModalProps {
  isOpen: boolean;
  acta: Acta | null;
  refugiado: Refugiado | undefined;
  onClose: () => void;
}

export default function ActaLecturaModal({ isOpen, onClose, acta, refugiado }: ActaLecturaModalProps) {
  const { campamentoSeleccionado, refugiados } = useCampamento();
  const [tipoActa, setTipoActa] = useState<TipoActa | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !acta) return;
    setLoading(true);
    setTipoActa(null);
    obtenerTipoActa(acta.tipo_acta_id).then(data => {
      setTipoActa(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [isOpen, acta]);

  const handleExportarPdf = async () => {
    if (!previewRef.current || !acta) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Acta_${acta.codigo}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      setExportando(false);
    }
  };

  if (!isOpen || !acta) return null;

  const jefeFamilia = refugiado?.es_jefe_familia
    ? refugiado
    : refugiado?.familia_id
      ? refugiados.find(r => r.familia_id === refugiado.familia_id && r.es_jefe_familia)
      : null;

  const sistemaVars: Record<string, string> = {
    fecha_actual: new Date(acta.fecha).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    nombre_campamento: campamentoSeleccionado?.nombre || '',
    direccion_campamento: campamentoSeleccionado?.ubicacion || '',
    nombre_completo_integrante: refugiado
      ? `${refugiado.nombres} ${refugiado.apellidos}`
      : '',
    cedula_integrante: refugiado?.cedula
      ? `V-${formatCedula(refugiado.cedula)}`
      : '',
    codigo_integrante: refugiado?.codigo || '',
    jefe_familia: jefeFamilia ? `${jefeFamilia.nombres} ${jefeFamilia.apellidos}` : '',
    cedula_jefe_familia: jefeFamilia?.cedula ? `V-${formatCedula(jefeFamilia.cedula)}` : '',
    nro_cama: refugiado?.nro_cama || '',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Lectura de Acta</h2>
            <p className="text-sm text-gray-500 mt-1 space-x-4">
              <span>{acta.codigo}</span>
              <span>·</span>
              <span>{tipoActa?.nombre || 'Cargando...'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-gray-50/30 space-y-6">
          {refugiado && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-caracas-blue/10 rounded-lg">
                    <User size={18} className="text-caracas-blue" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Datos del Integrante</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombres</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiado.nombres}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Apellidos</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiado.apellidos}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cédula</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{formatCedula(refugiado.cedula) ?? 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiado.codigo || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Edad</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{formatAge(new Date(refugiado.fecha_nacimiento)) || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nro de Cama</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiado.nro_cama || 'Sin asignar'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-caracas-green/10 rounded-lg">
                    <Users size={18} className="text-caracas-green" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Jerarquía Familiar</h3>
                </div>
                <div className="p-6">
                  {refugiado.es_jefe_familia ? (
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl inline-block">Es Jefe de Familia</p>
                  ) : (
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl inline-block">
                      {jefeFamilia ? `Jefe de Familia: ${jefeFamilia.nombres} ${jefeFamilia.apellidos}` : 'Sin familia asignada'}
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
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Procedencia</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">{refugiado.procedencia || 'No registrada'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Ingreso</label>
                    <p className="font-semibold text-gray-800 bg-gray-100 px-4 py-2.5 rounded-xl">
                      {refugiado.fecha_ingreso
                        ? new Date(refugiado.fecha_ingreso).toLocaleDateString('es-ES')
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
              <h3 className="font-semibold text-gray-800">Contenido del Acta</h3>
            </div>
            <div className="p-6" ref={previewRef}>
              {loading ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="font-medium">Cargando contenido...</p>
                </div>
              ) : tipoActa ? (
                <ActaPreview
                  contenido={tipoActa.plantilla.contenido}
                  sistema={sistemaVars}
                  valores={acta.contenido}
                />
              ) : (
                <div className="py-8 text-center text-gray-400">
                  <p className="font-medium">No se pudo cargar la plantilla del acta</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleExportarPdf}
            disabled={exportando || !tipoActa}
            className="flex items-center gap-2 bg-caracas-blue hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            {exportando ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
