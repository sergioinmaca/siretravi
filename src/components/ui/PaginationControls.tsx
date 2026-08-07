import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onChange: (page: number) => void;
  isMobile: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  loading,
  onChange,
  isMobile,
}: PaginationControlsProps) {
  return (
    <div className={`border-t border-gray-100 bg-gray-50/50 flex items-center justify-between ${isMobile ? 'px-3 py-2' : 'p-4'}`}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(1)}
          disabled={currentPage === 1 || loading}
          className={`text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'p-1.5' : 'px-3 py-2'}`}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || loading}
          className={`text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${isMobile ? 'p-1.5' : 'px-4 py-2'}`}
        >
          {isMobile ? <ChevronLeft size={16} /> : 'Anterior'}
        </button>
      </div>
      <span className="text-sm text-gray-500">
        Página {currentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || loading}
          className={`text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${isMobile ? 'p-1.5' : 'px-4 py-2'}`}
        >
          {isMobile ? <ChevronRight size={16} /> : 'Siguiente'}
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={currentPage === totalPages || loading}
          className={`text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'p-1.5' : 'px-3 py-2'}`}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
