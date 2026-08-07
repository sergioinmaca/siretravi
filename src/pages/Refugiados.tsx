import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UserPlus, FileText, Pencil, Trash2, ShieldOff, Eye, FileDown, Loader2 } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import { ESTATUS_OPTIONS, type Refugiado } from '../types';
import RegistroModal from '../components/refugiados/RegistroModal';
import FichaRefugiadoModal from '../components/refugiados/FichaRefugiadoModal';
import { formatAge } from '../lib/formatAge';
import { formatCedula } from '../lib/formatCedula';
import { useIsMobile } from '../hooks/useIsMobile';
import { PaginationControls } from '../components/ui/PaginationControls';
import { esRetirado, filtrarActivos } from '../lib/retiredFilter';
import { exportarRefugiadosXLSX } from '../lib/exportRefugiadosXLSX';
import jsPDF from 'jspdf';

export default function Refugiados() {
  const { campamentoSeleccionado, refugiados = [], familias = [], eliminarRefugiado, obtenerRefugiadosPaginados, actualizarRefugiado } = useCampamento();
  const { tienePermisoPorCampamento } = useAuth();

  const tieneAcceso = campamentoSeleccionado
    ? tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Ver')
    : true;

  if (!tieneAcceso) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <ShieldOff size={64} className="mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">Sin acceso a este campamento</p>
        <p className="text-sm text-gray-400 mt-1">No tienes permisos para ver los integrantes de {campamentoSeleccionado?.nombre}</p>
      </div>
    );
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editandoRefugiado, setEditandoRefugiado] = useState<Refugiado | null>(null);
  const [fichaRefugiado, setFichaRefugiado] = useState<Refugiado | null>(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [paginados, setPaginados] = useState<Refugiado[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingPaginados, setLoadingPaginados] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [exportandoXLSX, setExportandoXLSX] = useState(false);
  const [editingEstatusId, setEditingEstatusId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const REGISTROS_POR_PAGINA = 20;
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fichaPorId, setFichaPorId] = useState<string | null>(null);

  const getEstatusLabel = (estatus: string) => estatus === 'HOGAR SOLIDARIO' ? 'H.S' : estatus;

  // Debounce búsqueda 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch paginado
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const refetch = useCallback(async () => {
    if (!campamentoSeleccionado) return;
    setLoadingPaginados(true);
    try {
      const page = currentPageRef.current;
      const { data, count } = await obtenerRefugiadosPaginados(
        campamentoSeleccionado.id,
        page,
        REGISTROS_POR_PAGINA,
        debouncedSearch,
        sortColumn ?? undefined,
        sortColumn ? sortDirection : undefined
      );
      setPaginados(data);
      setTotalCount(count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPaginados(false);
    }
  }, [campamentoSeleccionado, debouncedSearch, sortColumn, sortDirection, obtenerRefugiadosPaginados]);

  useEffect(() => {
    refetch();
  }, [currentPage, refetch]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    setSortColumn(null);
    setSortDirection('asc');
  }, [campamentoSeleccionado?.id]);

  // Leer URL params al montar
  useEffect(() => {
    const buscar = searchParams.get('buscar');
    const verFicha = searchParams.get('verFicha');
    if (buscar || verFicha) {
      if (buscar) {
        setSearchInput(buscar);
        setDebouncedSearch(buscar);
      }
      if (verFicha) {
        setFichaPorId(verFicha);
      }
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abrir ficha por ID cuando los datos estén disponibles
  useEffect(() => {
    if (fichaPorId && paginados.length > 0) {
      const ref = paginados.find(r => r.id === fichaPorId);
      if (ref) {
        setFichaRefugiado(ref);
        setIsFichaOpen(true);
        setFichaPorId(null);
      }
    }
  }, [paginados, fichaPorId]);

  // Filas a mostrar con jerarquía resuelta
  const displayedRows = useMemo(() => {
    return paginados.map(r => {
      let jerarquiaStr = 'Jefe de Familia';
      if (!r.es_jefe_familia && r.familia_id) {
        const familia = familias.find(f => f.id === r.familia_id);
        jerarquiaStr = `Miembro (${familia?.nombre || 'Familia Desconocida'})`;
      }
      return {
        id: r.id,
        codigo: r.codigo || '-',
        cedula: formatCedula(r.cedula, r.nacionalidad) ?? 'S/N',
        genero: r.genero,
        nombres: r.nombres,
        apellidos: r.apellidos,
        edad: formatAge(r.fecha_nacimiento),
        jerarquia: jerarquiaStr,
        cama: r.nro_cama,
        estatus: r.hogar_solidario || 'PRESENTE',
        refugiado: r,
      };
    });
  }, [paginados, familias]);

  const totalPages = Math.ceil(totalCount / REGISTROS_POR_PAGINA);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleEliminar = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este integrante? Esta acción no se puede deshacer.')) {
      await eliminarRefugiado(id);
      refetch();
    }
  };

  const handleModificar = (refugiado: Refugiado) => {
    setEditandoRefugiado(refugiado);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditandoRefugiado(null);
    refetch();
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

      const data = refugiados
        .filter(r => r.campamento_id === campamentoSeleccionado?.id && !esRetirado(r))
        .map(r => {
          let jerarquiaStr = 'Jefe de Familia';
          if (!r.es_jefe_familia && r.familia_id) {
            const familia = familias.find(f => f.id === r.familia_id);
            jerarquiaStr = `Miembro (${familia?.nombre || 'Desconocida'})`;
          }
          return {
            codigo: r.codigo || '-',
            cedula: formatCedula(r.cedula, r.nacionalidad) ?? 'S/N',
            nombre: `${r.apellidos} ${r.nombres}`,
            edad: formatAge(r.fecha_nacimiento),
            jerarquia: jerarquiaStr,
            cama: r.nro_cama || '-',
            estatus: ((r.hogar_solidario || '').trim() || 'PRESENTE').toUpperCase(),
          };
        });

      const cols = [
        { key: 'codigo', header: 'C\u00f3digo', w: 17 },
        { key: 'cedula', header: 'C\u00e9dula', w: 16 },
        { key: 'nombre', header: 'Apellidos y Nombres', w: 56 },
        { key: 'edad', header: 'Edad', w: 12 },
        { key: 'jerarquia', header: 'Jerarqu\u00eda', w: 50 },
        { key: 'cama', header: 'Cama', w: 12 },
        { key: 'estatus', header: 'Estatus', w: 20 },
      ];

      const headerHeight = 9;
      const rowHeight = 6.5;
      const topArea = margin + 26;
      const rowsPerPage = Math.floor((pageH - topArea - margin) / rowHeight);

      const drawHeader = () => {
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`Listado de Integrantes \u2014 ${nombreCamp}`, margin, margin + 6);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Emitido: ${fecha}`, pageW - margin, margin + 6, { align: 'right' });
        pdf.setDrawColor(229, 231, 235);
        pdf.line(margin, margin + 9, pageW - margin, margin + 9);

        let hx = margin;
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, topArea - headerHeight + 1, cols.reduce((s, c) => s + c.w, 0), headerHeight, 'F');
        cols.forEach(col => {
          pdf.setFontSize(6.5);
          pdf.setTextColor(107, 114, 128);
          pdf.text(col.header, hx + 1.5, topArea - 2.5);
          hx += col.w;
        });
      };

      let pageNum = 1;
      drawHeader();
      let rowY = topArea + 1;
      let rowCount = 0;

      data.forEach((row, i) => {
        if (rowCount >= rowsPerPage) {
          pdf.addPage();
          pageNum++;
          drawHeader();
          rowY = topArea + 1;
          rowCount = 0;
        }

        if (i % 2 === 0) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, rowY, cols.reduce((s, c) => s + c.w, 0), rowHeight, 'F');
        }

        let cx = margin;
        cols.forEach(col => {
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.2);
          pdf.rect(cx, rowY, col.w, rowHeight, 'S');

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
          pdf.text(display, cx + 1.5, rowY + rowHeight - 2);

          cx += col.w;
        });

        rowY += rowHeight;
        rowCount++;
      });

      // Page numbers
      for (let p = 1; p <= pageNum; p++) {
        pdf.setPage(p);
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`P\u00e1gina ${p} de ${pageNum}`, pageW - margin, pageH - 6, { align: 'right' });
      }

      pdf.save(`integrantes-${nombreCamp.replace(/\s+/g, '-')}-${fecha}.pdf`);
    } catch (err) {
      console.error('Error generando PDF de integrantes:', err);
    } finally {
      setExportandoPDF(false);
    }
  }, [campamentoSeleccionado, refugiados, familias]);

  const handleExportXLSX = useCallback(async () => {
    setExportandoXLSX(true);
    try {
      const nombreCamp = campamentoSeleccionado?.nombre || 'Campamento';
      const activos = filtrarActivos(
        refugiados.filter(r => r.campamento_id === campamentoSeleccionado?.id)
      );
      await exportarRefugiadosXLSX(activos, familias, campamentoSeleccionado!.id, nombreCamp, 'integrantes');
    } catch (err) {
      console.error('Error generando XLSX de integrantes:', err);
    } finally {
      setExportandoXLSX(false);
    }
  }, [campamentoSeleccionado, refugiados, familias]);

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Integrantes</h2>
          <p className="text-gray-500">
            Gestionando registros del <span className="font-semibold text-caracas-red">{campamentoSeleccionado?.nombre || 'Ninguno'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {campamentoSeleccionado && (
            <>
              <button
                onClick={handleExportPDF}
                disabled={exportandoPDF}
                className={`flex items-center justify-center gap-2 rounded-xl font-medium transition-all shadow-sm ${exportandoPDF
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-caracas-red hover:bg-red-800 text-white shadow-caracas-red/20 transform hover:-translate-y-0.5'
                  } ${isMobile ? 'p-2.5' : 'px-4 py-3'}`}
                title="Exportar PDF"
              >
                {exportandoPDF ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                {!isMobile && (exportandoPDF ? 'Generando...' : 'Exportar PDF')}
              </button>
              <button
                onClick={handleExportXLSX}
                disabled={exportandoXLSX}
                className={`flex items-center justify-center gap-2 rounded-xl font-medium transition-all shadow-sm ${exportandoXLSX
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 transform hover:-translate-y-0.5'
                  } ${isMobile ? 'p-2.5' : 'px-4 py-3'}`}
                title="Exportar XLSX"
              >
                {exportandoXLSX ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                {!isMobile && (exportandoXLSX ? 'Generando...' : 'Exportar XLSX')}
              </button>
            </>
          )}
          {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Crear') && (
            <button
              onClick={() => {
                setEditandoRefugiado(null);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-caracas-red hover:bg-red-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-caracas-red/20 transform hover:-translate-y-0.5 px-4 py-3"
            >
              <UserPlus size={20} />
              {isMobile ? 'Crear' : 'Registrar Nuevo Integrante'}
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[500px]">

        {/* Barra de Herramientas (Búsqueda) */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
          <div className={`relative ${isMobile ? 'flex-1' : 'w-full max-w-md'}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por código, cédula, nombre o apellido..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm uppercase"
            />
          </div>
          {!isMobile && (
            <div className="text-sm text-gray-500 font-medium">
              {loadingPaginados ? 'Buscando...' : `Mostrando ${totalCount} registros`}
            </div>
          )}
        </div>

        {/* Paginación Superior (Móvil) */}
        {isMobile && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            loading={loadingPaginados}
            onChange={setCurrentPage}
            isMobile
          />
        )}

        {/* Vista Desktop: Tabla */}
        {!isMobile && (
          <div
            className="overflow-x-auto w-full min-w-0"
            style={{
              background: `
                linear-gradient(to right, white 30%, transparent) left / 40px 100% no-repeat,
                linear-gradient(to left, white 30%, transparent) right / 40px 100% no-repeat,
                linear-gradient(to right, white, white) center / 100% 100% no-repeat
              `,
              backgroundAttachment: 'scroll, scroll, scroll',
            }}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <SortableHeader column="codigo" label="Código" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <SortableHeader column="cedula" label="Cédula" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <SortableHeader column="genero" label="Género" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} className="px-2 text-center" />
                  <SortableHeader column="apellidos" label="Apellidos y Nombres" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <SortableHeader column="edad" label="Edad" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <SortableHeader column="jerarquia" label="Jerarquía" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <SortableHeader column="cama" label="Cama" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <SortableHeader column="estatus" label="Estatus" sortColumn={sortColumn} sortDirection={sortDirection} onClick={handleSort} />
                  <th className="py-4 px-6 font-semibold text-sm text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingPaginados ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-lg font-medium text-gray-600">Cargando...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayedRows.length > 0 ? (
                  displayedRows.map((refugiado) => (
                    <tr key={refugiado.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                      <td className="py-3 px-6 text-sm font-medium text-caracas-blue">{refugiado.codigo || '-'}</td>
                      <td className="py-3 px-6 text-sm font-medium text-gray-700">{refugiado.cedula}</td>
                      <td className="py-3 px-2 text-sm text-gray-600 text-center">{refugiado.genero ? 'M' : 'F'}</td>
                      <td className="py-3 px-6">
                        <div className="text-sm font-bold text-gray-800">{refugiado.apellidos}</div>
                        <div className="text-xs text-gray-500">{refugiado.nombres}</div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">{refugiado.edad}</td>
                      <td className="py-3 px-3 max-w-[180px]">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-normal break-words ${refugiado.jerarquia === 'Jefe de Familia'
                            ? 'bg-caracas-blue/10 text-caracas-blue'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                          {refugiado.jerarquia}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <div className={`flex items-center gap-1.5 text-sm font-semibold ${esRetirado(refugiado.refugiado) && refugiado.cama ? 'text-gray-400 line-through' : 'text-caracas-red'}`}>
                          <FileText size={14} />
                          {refugiado.cama}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        {editingEstatusId === refugiado.id ? (
                          <select
                            value={refugiado.estatus}
                            onChange={async (e) => {
                              const nuevo = e.target.value;
                              const ok = await actualizarRefugiado(refugiado.refugiado.id, { ...refugiado.refugiado, hogar_solidario: nuevo });
                              setEditingEstatusId(null);
                              if (ok) refetch();
                            }}
                            onBlur={() => setEditingEstatusId(null)}
                            autoFocus
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none uppercase"
                          >
                            {ESTATUS_OPTIONS.map(op => <option key={op} value={op}>{op}</option>)}
                          </select>
                        ) : campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Modificar') ? (
                          <button
                            onClick={() => setEditingEstatusId(refugiado.id)}
                            className="cursor-pointer"
                            title="Click para cambiar estatus"
                          >
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${refugiado.estatus === 'PRESENTE'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : refugiado.estatus === 'HOGAR SOLIDARIO'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                              {refugiado.estatus}
                            </span>
                          </button>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${refugiado.estatus === 'PRESENTE'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : refugiado.estatus === 'HOGAR SOLIDARIO'
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {refugiado.estatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setFichaRefugiado(refugiado.refugiado);
                              setIsFichaOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver Ficha"
                          >
                            <Eye size={18} />
                          </button>
                          {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Modificar') && (
                            <button
                              onClick={() => handleModificar(refugiado.refugiado)}
                              className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modificar"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Eliminar') && (
                            <button
                              onClick={() => handleEliminar(refugiado.id)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search size={48} className="text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-600">No se encontraron resultados</p>
                        <p className="text-sm text-gray-400">Intenta con otro término de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Vista Móvil: Cards */}
        {isMobile && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loadingPaginados ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-lg font-medium text-gray-600">Cargando...</p>
              </div>
            ) : displayedRows.length > 0 ? (
              displayedRows.map((refugiado) => (
                <div key={refugiado.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Título + Subtítulo */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="text-base font-bold text-gray-800 leading-tight">{refugiado.apellidos}</div>
                    <div className="text-sm text-gray-500">{refugiado.nombres}</div>
                  </div>

                  {/* 2 Columnas de info */}
                  <div className="px-4 pb-2 flex">
                    <div className="flex-1 space-y-1 text-sm text-gray-600">
                      <div className="text-xs text-gray-400">C.I.</div>
                      <div className="font-medium text-gray-700">{refugiado.cedula}</div>
                    </div>
                    <div className="flex-1 space-y-1 text-sm text-gray-600">
                      <div className="text-xs text-gray-400">Edad</div>
                      <div className="font-medium text-gray-700">{refugiado.edad}</div>
                    </div>
                  </div>

                  <div className="px-4 pb-2 flex">
                    <div className="flex-1 space-y-1 text-sm text-gray-600">
                      <div className="text-xs text-gray-400">Estatus</div>
                      {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Modificar') ? (
                        <button
                          onClick={() => setEditingEstatusId(refugiado.id === editingEstatusId ? null : refugiado.id)}
                          className="cursor-pointer"
                          title="Click para cambiar estatus"
                        >
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border truncate max-w-full ${refugiado.estatus === 'PRESENTE'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : refugiado.estatus === 'HOGAR SOLIDARIO'
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {getEstatusLabel(refugiado.estatus)}
                          </span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border truncate max-w-full ${refugiado.estatus === 'PRESENTE'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : refugiado.estatus === 'HOGAR SOLIDARIO'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {getEstatusLabel(refugiado.estatus)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1 text-sm text-gray-600">
                      <div className="text-xs text-gray-400">Cama</div>
                      <div className={`flex items-center gap-1 font-semibold ${esRetirado(refugiado.refugiado) && refugiado.cama ? 'text-gray-400 line-through' : 'text-caracas-red'}`}>
                        <FileText size={12} />
                        <span className="text-sm">{refugiado.cama}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estatus inline-editable en móvil */}
                  {editingEstatusId === refugiado.id && (
                    <div className="px-4 pb-2">
                      <select
                        value={refugiado.estatus}
                        onChange={async (e) => {
                          const nuevo = e.target.value;
                          const ok = await actualizarRefugiado(refugiado.refugiado.id, { ...refugiado.refugiado, hogar_solidario: nuevo });
                          setEditingEstatusId(null);
                          if (ok) refetch();
                        }}
                        onBlur={() => setEditingEstatusId(null)}
                        autoFocus
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none uppercase"
                      >
                        {ESTATUS_OPTIONS.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Jefe de Familia badge (full-width) */}
                  {refugiado.jerarquia === 'Jefe de Familia' && (
                    <div className="px-4 pb-2">
                      <div className="flex items-center justify-center gap-1.5 bg-caracas-blue/10 text-caracas-blue text-xs font-medium px-3 py-1.5 rounded-lg">
                        <span>👑</span> Jefe de Familia
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-around">
                    <button
                      onClick={() => {
                        setFichaRefugiado(refugiado.refugiado);
                        setIsFichaOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver Ficha"
                    >
                      <Eye size={18} />
                    </button>
                    {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Modificar') && (
                      <button
                        onClick={() => handleModificar(refugiado.refugiado)}
                        className="p-2 text-gray-400 hover:text-caracas-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modificar"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    {campamentoSeleccionado && tienePermisoPorCampamento('Integrantes', campamentoSeleccionado.id, 'Eliminar') && (
                      <button
                        onClick={() => handleEliminar(refugiado.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Search size={48} className="text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No se encontraron resultados</p>
                <p className="text-sm text-gray-400">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>
        )}

        {/* Paginación Inferior */}
        {totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            loading={loadingPaginados}
            onChange={setCurrentPage}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Modal de Registro / Edición */}
      <RegistroModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        refugiadoToEdit={editandoRefugiado}
      />

      {/* Modal de Ficha del Integrante */}
      <FichaRefugiadoModal
        isOpen={isFichaOpen}
        onClose={() => {
          setIsFichaOpen(false);
          setFichaRefugiado(null);
          refetch();
        }}
        refugiado={fichaRefugiado}
        onActualizarFoto={(foto_url) => {
          setFichaRefugiado(prev => prev ? { ...prev, foto_url: foto_url ?? undefined } : null);
        }}
        onActualizarMascotaFoto={(mascota_foto_url) => {
          setFichaRefugiado(prev => prev ? { ...prev, mascota_foto_url: mascota_foto_url ?? undefined } : null);
        }}
      />

    </div>
  );
}

function SortableHeader({
  column,
  label,
  sortColumn,
  sortDirection,
  onClick,
  className = '',
}: {
  column: string;
  label: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onClick: (column: string) => void;
  className?: string;
}) {
  const isActive = sortColumn === column;

  return (
    <th
      className={`py-4 px-6 font-semibold text-sm text-gray-500 cursor-pointer select-none hover:bg-gray-50 transition-colors ${className}`}
      onClick={() => onClick(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          <span className="text-caracas-red text-xs ml-0.5">
            {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
          </span>
        ) : (
          <span className="text-gray-300 text-xs ml-0.5">{'\u25B2'}</span>
        )}
      </span>
    </th>
  );
}

