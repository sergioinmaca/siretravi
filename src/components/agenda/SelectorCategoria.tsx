import { useState } from 'react';
import { Plus, X, Pencil } from 'lucide-react';
import type { CategoriaEvento } from '../../types';

const COLORES = [
  { color: '#EF4444', nombre: 'Rojo' },
  { color: '#F97316', nombre: 'Naranja' },
  { color: '#EAB308', nombre: 'Amarillo' },
  { color: '#3B82F6', nombre: 'Azul' },
  { color: '#22C55E', nombre: 'Verde' },
  { color: '#A855F7', nombre: 'Violeta' },
] as const;

interface SelectorCategoriaProps {
  categorias: CategoriaEvento[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreateCategoria: (nombre: string, color: string) => Promise<void>;
  onUpdateCategoria: (id: string, nombre: string, color: string) => Promise<void>;
  puedeCrear: boolean;
}

export default function SelectorCategoria({
  categorias,
  selectedId,
  onSelect,
  onCreateCategoria,
  onUpdateCategoria,
  puedeCrear,
}: SelectorCategoriaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState<'new' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formColor, setFormColor] = useState<string>(COLORES[0].color);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categoriaSeleccionada = categorias.find(c => c.id === selectedId);
  const isEditing = showForm === 'edit';

  const abrirNueva = () => {
    setFormNombre('');
    setFormColor(COLORES[0].color);
    setEditingId(null);
    setShowForm('new');
    setError('');
  };

  const abrirEditar = (cat: CategoriaEvento) => {
    setFormNombre(cat.nombre);
    setFormColor(cat.color);
    setEditingId(cat.id);
    setShowForm('edit');
    setError('');
  };

  const cerrarForm = () => {
    setShowForm(null);
    setEditingId(null);
    setFormNombre('');
    setError('');
  };

  const handleGuardar = async () => {
    setError('');
    if (!formNombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const nombreUpper = formNombre.trim().toUpperCase();
    const duplicada = categorias.some(
      c => c.nombre.toUpperCase() === nombreUpper && c.id !== editingId
    );
    if (duplicada) {
      setError('Ya existe una categoría con ese nombre');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingId) {
        await onUpdateCategoria(editingId, nombreUpper, formColor);
      } else {
        await onCreateCategoria(nombreUpper, formColor);
      }
      cerrarForm();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors text-left"
        >
          {categoriaSeleccionada ? (
            <>
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: categoriaSeleccionada.color }}
              />
              <span className="text-sm font-medium text-gray-700">{categoriaSeleccionada.nombre}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Sin categoría</span>
          )}
        </button>

        {puedeCrear && (
          <button
            type="button"
            onClick={() => showForm === 'new' ? cerrarForm() : abrirNueva()}
            className="px-3 py-2.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1 text-sm"
          >
            <Plus size={16} />
            Nueva
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {categorias.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 px-4">No hay categorías creadas</p>
          ) : (
            categorias.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center hover:bg-gray-50 transition-colors ${
                  selectedId === cat.id ? 'bg-blue-50' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(cat.id);
                    setIsOpen(false);
                  }}
                  className="flex-1 flex items-center gap-2 px-4 py-2.5 text-left"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">{cat.nombre}</span>
                </button>
                {puedeCrear && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      abrirEditar(cat);
                    }}
                    className="px-2 py-2.5 text-gray-400 hover:text-gray-600 shrink-0"
                    title="Renombrar categoría"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="mt-3 p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
            </span>
            <button
              type="button"
              onClick={cerrarForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>
          )}

          <input
            type="text"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value.toUpperCase())}
            placeholder="Nombre de la categoría"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none uppercase"
            autoFocus
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORES.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setFormColor(c.color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    formColor === c.color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.nombre}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={cerrarForm}
              className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-caracas-red text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar Categoría'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
