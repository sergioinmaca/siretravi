import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Search, ChevronRight, ShieldOff, Trash2, FileDown, Loader2 } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import DetalleFamiliaModal from '../components/familias/DetalleFamiliaModal';
import type { Familia } from '../types';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { formatCedula } from '../lib/formatCedula';

export default function Familias() {
  const { campamentoSeleccionado, familias = [], refugiados = [], eliminarFamilia } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Familias', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver las familias de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamilia, setSelectedFamilia] = useState<Familia | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [exportandoXLSX, setExportandoXLSX] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer URL params al montar
  useEffect(() => {
    const buscar = searchParams.get('buscar');
    const verFamilia = searchParams.get('verFamilia');
    if (buscar || verFamilia) {
      if (buscar) {
        setSearchTerm(buscar);
      }
      if (verFamilia) {
        const fam = familias.find(f => f.id === verFamilia && f.campamento_id === campamentoSeleccionado?.id);
        if (fam) {
          setSelectedFamilia(fam);
          setIsModalOpen(true);
        }
      }
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const familiasDelCampamento = useMemo(() => {
    if (!campamentoSeleccionado) return [];
    const term = searchTerm.toUpperCase();
    return familias
      .filter(f => f.campamento_id === campamentoSeleccionado.id)
      .filter(f => f.nombre.includes(term))
      .map(f => {
        const integrantes = refugiados.filter(r => r.familia_id === f.id);
        console.log('[DEBUG-FAMILIA] Familias — familia:', f.nombre, '| id:', f.id, '| integrantes count:', integrantes.length);
        return { ...f, integrantes: integrantes.length };
      });
  }, [searchTerm, familias, refugiados, campamentoSeleccionado]);

  const openModal = (familia: Familia) => {
    setSelectedFamilia(familia);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFamilia(null);
  };

  const handleEliminar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar esta familia? Esta acción no se puede deshacer.')) {
      eliminarFamilia(id);
    }
  };

  const handleExportPDF = useCallback(async () => {
    setExportandoPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';

      const cols = [
        { key: 'codigo', header: 'C\u00f3digo', w: 22 },
        { key: 'nombre', header: 'Nombres y Apellidos', w: 42 },
        { key: 'cedula', header: 'C\u00e9dula', w: 22 },
        { key: 'sexo', header: 'Sexo', w: 14 },
        { key: 'cama', header: 'Nro Cama', w: 22 },
        { key: 'parentesco', header: 'Parentesco', w: 28 },
      ];
      const tableWidth = cols.reduce((s, c) => s + c.w, 0);
      const headerHeight = 8;
      const rowHeight = 6;
      const titleGap = 4;
      const familyGap = 6;
      const footerH = 10;

      const familiasCamp = familias.filter(f => f.campamento_id === campamentoSeleccionado?.id);

      let currentY = margin;
      let pageNum = 1;

      pdf.setFontSize(14);
      pdf.text(`Relaci\u00f3n de Familias \u2014 ${nombreCamp}`, margin, currentY + 5);
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Emitido: ${fecha}`, pageW - margin, margin + 5, { align: 'right' });
      currentY = margin + 12;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, currentY, pageW - margin, currentY);
      currentY += 6;

      const drawFamilyHeader = (title: string) => {
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text(title, margin, currentY);
        currentY += titleGap;

        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, currentY, tableWidth, headerHeight, 'F');
        let hx = margin;
        cols.forEach(col => {
          pdf.setFontSize(6.5);
          pdf.setTextColor(107, 114, 128);
          pdf.text(col.header, hx + 1.5, currentY + headerHeight - 2);
          hx += col.w;
        });
        currentY += headerHeight;
      };

      let familyIndex = 0;

      familiasCamp.forEach(familia => {
        const miembros = refugiados
          .filter(r => r.familia_id === familia.id)
          .sort((a, b) => {
            if (a.es_jefe_familia) return -1;
            if (b.es_jefe_familia) return 1;
            return (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true });
          });

        if (miembros.length === 0) return;
        familyIndex++;

        const rows = miembros.map(r => ({
          codigo: r.codigo || '-',
          nombre: `${r.nombres} ${r.apellidos}`,
          cedula: formatCedula(r.cedula, r.nacionalidad) ?? 'S/N',
          sexo: r.genero ? 'M' : 'F',
          cama: r.nro_cama || '-',
          parentesco: r.es_jefe_familia ? 'Jefe de Familia' : (r.parentesco || '\u2014'),
        }));

        if (currentY + titleGap + headerHeight + rowHeight > pageH - margin - footerH) {
          pdf.addPage();
          pageNum++;
          currentY = margin;
        }

        drawFamilyHeader(`${familyIndex}. Familia: ${familia.nombre}`);

        rows.forEach((row, ri) => {
          if (currentY + rowHeight > pageH - margin - footerH) {
            pdf.addPage();
            pageNum++;
            currentY = margin;
            drawFamilyHeader(`${familyIndex}. Familia: ${familia.nombre} (cont.)`);
          }

          if (ri % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
          }

          let cx = margin;
          cols.forEach(col => {
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.2);
            pdf.rect(cx, currentY, col.w, rowHeight, 'S');

            const value = String(row[col.key as keyof typeof row] || '');
            pdf.setFontSize(6);
            pdf.setTextColor(55, 65, 81);

            let display = value;
            const maxW = col.w - 3;
            if (pdf.getTextWidth(display) > maxW) {
              while (display.length > 1 && pdf.getTextWidth(display + '\u2026') > maxW) {
                display = display.slice(0, -1);
              }
              display += '\u2026';
            }
            pdf.text(display, cx + 1.5, currentY + rowHeight - 2);
            cx += col.w;
          });

          currentY += rowHeight;
        });

        currentY += familyGap;
      });

      for (let p = 1; p <= pageNum; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`P\u00e1gina ${p} de ${pageNum}`, pageW - margin, pageH - 6, { align: 'right' });
      }

      pdf.save(`familias-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.pdf`);
    } catch (err) {
      console.error('Error generando PDF de familias:', err);
    } finally {
      setExportandoPDF(false);
    }
  }, [campamentoSeleccionado, refugiados, familias]);

  const handleExportXLSX = useCallback(async () => {
    setExportandoXLSX(true);
    try {
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';
      const now = new Date();
      const fecha = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

      const aoa: (string | null)[][] = [];
      const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

      const familiasCamp = familias.filter(f => f.campamento_id === campamentoSeleccionado?.id);
      let familyIndex = 0;

      familiasCamp.forEach(familia => {
        const miembros = refugiados
          .filter(r => r.familia_id === familia.id)
          .sort((a, b) => {
            if (a.es_jefe_familia) return -1;
            if (b.es_jefe_familia) return 1;
            return (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true });
          });

        if (miembros.length === 0) return;
        familyIndex++;

        const titleRow = aoa.length;
        aoa.push([`${familyIndex}. Familia: ${familia.nombre}`, null, null, null, null, null]);
        merges.push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: 5 } });

        aoa.push(['C\u00f3digo', 'Nombres y Apellidos', 'C\u00e9dula', 'Sexo', 'Nro Cama', 'Parentesco']);

        miembros.forEach(r => {
          aoa.push([
            r.codigo || '-',
            `${r.nombres} ${r.apellidos}`,
            formatCedula(r.cedula, r.nacionalidad) ?? 'S/N',
            r.genero ? 'M' : 'F',
            r.nro_cama || '-',
            r.es_jefe_familia ? 'Jefe de Familia' : (r.parentesco || '\u2014'),
          ]);
        });

        aoa.push([null, null, null, null, null, null]);
      });

      if (aoa.length > 0 && aoa[aoa.length - 1].every(c => c === null)) {
        aoa.pop();
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = merges;
      ws['!cols'] = [
        { wch: 12 },
        { wch: 35 },
        { wch: 16 },
        { wch: 8 },
        { wch: 10 },
        { wch: 22 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Familias');
      XLSX.writeFile(wb, `familias-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.xlsx`);
    } catch (err) {
      console.error('Error generando XLSX de familias:', err);
    } finally {
      setExportandoXLSX(false);
    }
  }, [campamentoSeleccionado, refugiados, familias]);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Módulo de Familias</h2>
          <p className="text-gray-500">
            Gestionando familias del <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
          </p>
        </div>
        {campamentoSeleccionado && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exportandoPDF}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all shadow-sm ${
                exportandoPDF
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-caracas-red hover:bg-red-800 text-white shadow-caracas-red/20 transform hover:-translate-y-0.5'
              }`}
            >
              {exportandoPDF ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
              {exportandoPDF ? 'Generando...' : 'Exportar PDF'}
            </button>
            <button
              onClick={handleExportXLSX}
              disabled={exportandoXLSX}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all shadow-sm ${
                exportandoXLSX
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 transform hover:-translate-y-0.5'
              }`}
            >
              {exportandoXLSX ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
              {exportandoXLSX ? 'Generando...' : 'Exportar XLSX'}
            </button>
          </div>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar familia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm uppercase"
        />
      </div>

      {/* Grid de Cards */}
      {familiasDelCampamento.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familiasDelCampamento.map((fam) => (
            <div
              key={fam.id}
              onClick={() => openModal(fam)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-caracas-red/30 cursor-pointer transition-all duration-300 group"
            >
              <div className="bg-gradient-to-r from-caracas-blue to-blue-700 p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white break-words">{fam.nombre.replace('FAMILIA ', 'FLIA. ')}</h3>
                    </div>
                  <ChevronRight size={20} className="text-white/50 group-hover:text-white transition-colors shrink-0" />
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} className="text-caracas-blue" />
                  <span className="font-medium text-base">{fam.integrantes} miembro{fam.integrantes !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-caracas-blue font-medium group-hover:underline">Ver detalle</span>
                  {campamentoSeleccionado && tienePermisoPorCampamento('Familias', campamentoSeleccionado.id, 'Eliminar') && (
                    <button
                      onClick={(e) => handleEliminar(e, fam.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar familia"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
          <Users size={64} className="mb-4 opacity-40" />
          <p className="text-lg font-medium text-gray-500">No hay familias registradas</p>
          <p className="text-sm text-gray-400 mt-1">
            Las familias se crean automáticamente al registrar un integrante como Jefe de Familia
          </p>
        </div>
      )}

      {/* Modal de Detalle */}
      <DetalleFamiliaModal
        isOpen={isModalOpen}
        onClose={closeModal}
        familia={selectedFamilia}
      />
    </div>
  );
}