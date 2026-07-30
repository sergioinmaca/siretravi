# Responsive mobile de modales: FichaRefugiadoModal y DetalleFamiliaModal

**Fecha**: 2026-07-30
**Proyecto**: SIRETRAVI — Gestión de Campamentos
**Archivos afectados**: `FichaRefugiadoModal.tsx`, `DetalleFamiliaModal.tsx`

---

## Contexto

RegistroModal ya tiene un patrón mobile consolidado: fullscreen sin backdrop, botón floating de cierre, título inline en el cuerpo scrollable, `pb-[72px]` para la tab bar, y botones de acción como sección inline `md:hidden` al final del contenido scrollable (mientras en desktop se usa un footer fijo `hidden md:flex`).

FichaRefugiadoModal y DetalleFamiliaModal no siguen este patrón y necesitan alinearse.

---

## Cambio 1: FichaRefugiadoModal — Footer móvil a sección inline

### Estado actual

El footer (línea 1386) es visible en todos los tamaños (`shrink-0`, sin clases responsive). Contiene:
- Izquierda: paginación (2 botones: "Información del Integrante" / "Atenciones y Registros")
- Derecha: Guardar (condicional) + Exportar PDF + Cerrar

En mobile los 5 botones se amontonan en una fila.

### Diseño

| Elemento | Mobile | Desktop |
|---|---|---|
| Footer actual | `hidden` (se oculta) | `hidden md:flex` |
| Paginación | Nueva tarjeta inline al final del cuerpo, `md:hidden` | En footer |
| Acciones | Nueva tarjeta inline debajo de paginación, `md:hidden` | En footer |

### Tarjeta de paginación (mobile)

```tsx
<div className="bg-white rounded-2xl shadow-sm md:hidden">
  <div className="p-4 flex flex-col gap-2">
    <button onClick={() => setPagina(1)} disabled={pagina === 1}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${pagina === 1 ? 'bg-gray-200 text-gray-400' : 'bg-white text-gray-700 border border-gray-200'}`}>
      <ChevronLeft size={16} />
      Información del Integrante
    </button>
    <button onClick={() => setPagina(2)} disabled={pagina === 2}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${pagina === 2 ? 'bg-gray-200 text-gray-400' : 'bg-white text-gray-700 border border-gray-200'}`}>
      Atenciones y Registros
      <ChevronRight size={16} />
    </button>
  </div>
</div>
```

Botones apilados verticalmente (`flex-col gap-2`) para que quepan en mobile angosto.

### Tarjeta de acciones (mobile)

```tsx
<div className="bg-white rounded-2xl shadow-sm md:hidden">
  <div className="p-4 flex items-center justify-end gap-3">
    {esMaster && pagina === 1 && (
      <button onClick={handleGuardar} disabled={!canSave || isSaving}
        className="flex items-center gap-2 bg-caracas-blue text-white px-4 py-2.5 rounded-xl text-sm font-medium">
        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        {isSaving ? 'Guardando...' : 'Guardar'}
      </button>
    )}
    <button onClick={handleExportPDF} disabled={isExporting}
      className="flex items-center gap-2 bg-caracas-red text-white px-4 py-2.5 rounded-xl text-sm font-medium">
      {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
      {isExporting ? 'Exportando...' : 'Exportar PDF'}
    </button>
    <button onClick={handleClose}
      className="px-4 py-2.5 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-200">
      Cerrar
    </button>
  </div>
</div>
```

Botones en fila (`flex items-center justify-end gap-3`), con iconos reducidos a `size={16}` para ahorrar espacio.

### Estructura final del cuerpo scrollable

```
<div className="px-2 py-4 pb-[72px] md:p-8 overflow-y-auto flex-1 ...">
  {/* título mobile (ya existe) */}
  
  {/* contenido de página 1 o 2 (ya existe) */}
  
  {/* Paginación mobile (NUEVA, md:hidden) */}
  {/* Acciones mobile (NUEVA, md:hidden) */}
</div>

{/* Footer desktop (EXISTENTE, ahora hidden md:flex) */}
```

### Nota editorial

El `Guardar` (esMaster) que actualmente está en el footer **solo en desktop** (no en mobile), debe replicarse también en la tarjeta de acciones mobile. Revisar si ya existe lógica mobile para editar — si no existe, se omite y se deja solo en desktop.

---

## Cambio 2: DetalleFamiliaModal — Responsive mobile completo

### Estado actual

El modal no tiene ningún comportamiento responsive:
- Overlay siempre centrado con backdrop (`items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm`)
- Contenedor siempre `rounded-3xl max-w-4xl max-h-[90vh]`
- Sin botón floating de cierre mobile
- Sin `pb-[72px]`
- Sin título mobile inline
- Footer siempre visible en todos los tamaños

### Diseño

| Elemento | Mobile | Desktop |
|---|---|---|
| Overlay | `flex-col`, sin backdrop ni padding | `md:items-center md:justify-center md:p-4 md:bg-gray-900/40 md:backdrop-blur-sm` |
| Contenedor | `w-full h-full pt-4`, sin bordes redondos, `animate-slide-up relative` | `md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-3xl md:shadow-2xl` |
| Header | `hidden md:flex` | Visible |
| Título mobile | `md:hidden` inline en cuerpo | — |
| Close floating | `absolute top-10 right-4 md:hidden p-2 bg-caracas-red rounded-full text-white` | — |
| Body padding | `px-2 py-4 pb-[72px] md:p-8` | `md:p-8` |
| Footer actual | `hidden` | `hidden md:flex` |
| Acciones mobile | Nueva tarjeta inline al final del cuerpo, `md:hidden` | — |

### Layout resultante — mobile

```
┌──────────────────────────────────┐
│                             [✕]  │ floating red close (NUEVO)
│                                  │
│  Ficha Familiar                  │ título mobile inline (NUEVO)
│  FAMILIA RODRÍGUEZ — 3 integrantes│
│                                  │
│  ┌────────────────────────────┐  │
│  │ Jefe de Familia            │  │ contenido (ya existe)
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Integrantes (tabla)        │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Situación Socioeconómica   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Observaciones Generales    │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌─ Acciones (NUEVO) ─────────┐  │
│  │  [Exportar PDF] [Cerrar]   │  │ right-aligned
│  └─────────────────────────────┘  │
│                                  │
│        ← pb-[72px] →             │
└──────────────────────────────────┘
```

### Tarjeta de acciones (mobile)

```tsx
<div className="bg-white rounded-2xl shadow-sm md:hidden">
  <div className="p-4 flex items-center justify-end gap-3">
    <button onClick={handleExportPDF} disabled={isExporting}
      className="flex items-center gap-2 bg-caracas-red text-white px-4 py-2.5 rounded-xl text-sm font-medium">
      {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
      {isExporting ? 'Exportando...' : 'Exportar PDF'}
    </button>
    <button onClick={onClose}
      className="px-4 py-2.5 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-200">
      Cerrar
    </button>
  </div>
</div>
```

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/refugiados/FichaRefugiadoModal.tsx` | Footer → `hidden md:flex` + 2 tarjetas inline `md:hidden` (paginación + acciones) |
| `src/components/familias/DetalleFamiliaModal.tsx` | Overlay/contenedor responsive, floating close, título mobile, pb-[72px], footer → `hidden md:flex` + tarjeta inline `md:hidden` |

---

## Testing

### FichaRefugiadoModal

- [ ] Mobile: paginación visible como tarjeta inline con botones apilados verticalmente
- [ ] Mobile: acciones (Exportar PDF, Cerrar) como tarjeta inline separada
- [ ] Mobile: cambiar de página funciona correctamente
- [ ] Mobile: floating red close sigue funcionando
- [ ] Mobile: `pb-[72px]` respeta la tab bar
- [ ] Desktop: footer se ve exactamente como antes (sin cambios visuales)
- [ ] Desktop: tarjetas inline no aparecen (`md:hidden`)

### DetalleFamiliaModal

- [ ] Mobile: modal fullscreen sin backdrop
- [ ] Mobile: floating red close visible y funcional
- [ ] Mobile: título mobile inline visible con nombre de familia y conteo de integrantes
- [ ] Mobile: tarjeta de acciones inline (Exportar PDF, Cerrar) al final del scroll
- [ ] Mobile: `pb-[72px]` respeta la tab bar
- [ ] Mobile: `animate-slide-up` al abrir
- [ ] Desktop: modal centrado con backdrop, igual que antes
- [ ] Desktop: header visible con título y close gris
- [ ] Desktop: footer fijo con acciones
