# Especificación: Ordenamiento por Columnas en Tabla de Integrantes

**Fecha:** 2026-07-25
**Estado:** Aprobado

---

## 1. Propósito

Agregar ordenamiento ascendente/descendente por columna en la tabla de Integrantes (`src/pages/Refugiados.tsx`). El ordenamiento debe ser server-side para que aplique a todos los registros del campamento (no solo la página actual), sincronizado con la paginación existente.

---

## 2. Columnas Ordenables

| Columna UI | Campo(s) DB | Tipo DB | Lógica de orden |
|---|---|---|---|
| Código | `codigo` | TEXT | `.order('codigo', { ascending })` |
| Cédula | `cedula` | BIGINT (nullable) | `.order('cedula', { ascending, nullsFirst: !ascending })` — nulos van últimos en ASC |
| Género | `genero` | BOOLEAN | `.order('genero', { ascending })` — false (F) antes que true (M) en ASC |
| Apellidos y Nombres | `apellidos`, `nombres` | TEXT, TEXT | `.order('apellidos').order('nombres')` — mismo apellido se subordena por nombre |
| Edad | `fecha_nacimiento` | DATE | `.order('fecha_nacimiento', { ascending: !ascending })` — ASC edad = DESC fecha (más joven primero) |
| Jerarquía | `es_jefe_familia` | BOOLEAN | `.order('es_jefe_familia', { ascending })` — false (miembro) antes que true (jefe) en ASC |
| Cama | `nro_cama` | TEXT (nullable) | `.order('nro_cama', { ascending })` — orden lexicográfico |
| Estatus | `hogar_solidario` | TEXT | `.order('hogar_solidario', { ascending })` — alfabético: H→P→R en ASC |

La columna **Acciones** no es ordenable.

---

## 3. Cambios en `CampamentoContext.tsx`

### 3.1 Nuevos parámetros en `obtenerRefugiadosPaginados`

```ts
const obtenerRefugiadosPaginados = useCallback(async (
    campamentoId: string,
    page: number,
    pageSize: number,
    searchTerm?: string,
    sortColumn?: string,        // NUEVO
    sortDirection?: 'asc' | 'desc'  // NUEVO
): Promise<{ data: Refugiado[]; count: number }> => {
```

### 3.2 Lógica de ordenamiento

Reemplaza el `.order('created_at', { ascending: true })` fijo actual (línea 741) por:

```ts
if (sortColumn && sortDirection) {
  const ascending = sortDirection === 'asc';

  switch (sortColumn) {
    case 'codigo':
      query = query.order('codigo', { ascending });
      break;
    case 'cedula':
      query = query.order('cedula', { ascending, nullsFirst: !ascending });
      break;
    case 'genero':
      query = query.order('genero', { ascending });
      break;
    case 'apellidos':
      query = query.order('apellidos', { ascending }).order('nombres', { ascending });
      break;
    case 'edad':
      query = query.order('fecha_nacimiento', { ascending: !ascending });
      break;
    case 'jerarquia':
      query = query.order('es_jefe_familia', { ascending });
      break;
    case 'cama':
      query = query.order('nro_cama', { ascending });
      break;
    case 'estatus':
      query = query.order('hogar_solidario', { ascending });
      break;
  }
} else {
  query = query.order('created_at', { ascending: true });
}
```

El `.order()` se aplica antes del `.range(from, to)` para que el orden aplique a todos los registros antes de paginar.

### 3.3 Performance

No se requieren índices nuevos. El volumen actual de registros por campamento no justifica agregar índices adicionales. Si en el futuro alguna columna se usa frecuentemente y el volumen crece (>1000 registros), se puede agregar un índice en Supabase.

---

## 4. Cambios en `Refugiados.tsx`

### 4.1 Nuevo estado

```ts
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
```

### 4.2 Handler de ordenamiento

```ts
const handleSort = (column: string) => {
  if (sortColumn === column) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};
```

### 4.3 Disparo de refetch

Al cambiar `sortColumn` o `sortDirection`, se dispara `refetch()` (mismo patrón que `debouncedSearch`). Se resetea la página a 1.

### 4.4 Headers clickeables

Cada `<th>` ordenable se reemplaza por un componente `<SortableHeader>` con:

- **Propiedades**: `column`, `label`, `sortColumn`, `sortDirection`, `onClick`
- **Flecha indicadora**:
  - Sin selección: sin flecha o flecha gris tenue
  - ASC activo: ▲ (color primario del sistema)
  - DESC activo: ▼ (color primario del sistema)
- **Cursor**: `pointer`
- **Hover**: cambio de color de fondo sutil

Las columnas a modificar (líneas 434-443 actuales): Código, Cédula, Género, Apellidos y Nombres, Edad, Jerarquía, Cama, Estatus. La columna Acciones permanece sin cambios.

### 4.5 Pase de parámetros al refetch

La llamada a `obtenerRefugiadosPaginados` en el `refetch` debe incluir `sortColumn` y `sortDirection` como parámetros adicionales.

---

## 5. Edge Cases

| Escenario | Comportamiento |
|---|---|
| Columna sin valor (null) | Cédula y Cama pueden ser null. Cédula: nulls van últimos en ASC, primeros en DESC. Cama: comportamiento por defecto de PostgREST con nulls. |
| Cambio de campamento | Al seleccionar otro campamento, se resetea `sortColumn` a null y se vuelve al orden por defecto (`created_at ASC`). |
| Búsqueda + ordenamiento | El search term y el sort funcionan simultáneamente. El `.order()` se aplica después de los filtros `.ilike()`. |
| Doble click en misma columna | Togglea entre ASC y DESC (sin pasar por estado nulo — no se puede "desordenar" una columna activa). |
| Cambio de orden mientras se busca | Al hacer click en un header, se mantiene el término de búsqueda actual y se reordena el resultado filtrado. |
| Apellidos iguales | El segundo `.order('nombres')` asegura subordenamiento consistente dentro del mismo apellido. |

---

## 6. Pruebas

- Verificar que cada columna ordena correctamente en ASC y DESC.
- Verificar que el orden se mantiene al navegar entre páginas.
- Verificar que ordenamiento + búsqueda de texto funcionan juntos.
- Verificar que al cambiar de campamento se resetea el orden.
- Verificar que cédulas S/N (null) aparecen al final en ASC y al principio en DESC.
- Verificar que estatus se ordena alfabéticamente (H→P→R en ASC, R→P→H en DESC).
- Verificar que edad ASC muestra los más jóvenes primero.

---

## 7. Archivos Modificados

| Archivo | Tipo de cambio |
|---|---|
| `src/pages/Refugiados.tsx` | Estado, handler, headers clickeables, pase de params al refetch |
| `src/context/CampamentoContext.tsx` | Nuevos parámetros en firma, lógica de `.order()` condicional |
