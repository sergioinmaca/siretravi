# Spec: Visualización de Retirados y Filtrado de Camas

**Fecha:** 2026-08-06
**Módulos:** Inicio, Refugiados, Actas, Reportes

## 1. Propósito

Establecer una lógica uniforme para el tratamiento de integrantes con estatus "RETIRADO" que tienen una cama asignada. La regla del sistema es: **si un integrante retirado tiene una cama asignada, esa información de cama no es válida** para los indicadores y visualizaciones del sistema. Adicionalmente, se comunica al usuario mediante un banner permanente en el Dashboard que los indicadores demográficos no contemplan integrantes retirados.

## 2. Regla de negocio

```
SI hogar_solidario === "RETIRADO" Y nro_cama no está vacío
  → La cama se considera NO ocupada para todos los cálculos
  → Visualmente la cama se muestra en gris y tachada solo en el módulo de Refugiados
```

## 3. Función utilitaria compartida

**Archivo nuevo:** `src/lib/retiredFilter.ts`

```ts
export function esRetirado(r: { hogar_solidario?: string | null }): boolean {
  return ((r.hogar_solidario || '').trim().toUpperCase()) === 'RETIRADO';
}

export function filtrarActivos<T extends { hogar_solidario?: string | null }>(refugiados: T[]): T[] {
  return refugiados.filter(r => !esRetirado(r));
}

export function camasDeActivos(refugiados: { hogar_solidario?: string | null; nro_cama?: string }[]): string[] {
  return refugiados
    .filter(r => !esRetirado(r))
    .map(r => r.nro_cama)
    .filter((cama): cama is string => !!cama);
}
```

## 4. Dashboard (Inicio.tsx)

### 4.1 Banner de advertencia

- **Ubicación:** Fila que abarca el ancho completo (`col-span-2`), insertada antes del primer grid de cards ("Modulos Activos" y "Camas Disponibles").
- **Estilo:** Fondo `bg-amber-50`, borde `border-amber-200`, ícono `AlertTriangle` de lucide-react color `text-amber-500`.
- **Visibilidad:** Siempre visible, incondicional.
- **Texto:** "**Nota:** La información suministrada no contempla los integrantes que están retirados del campamento. Solamente en **Situación de Estatus** se ven reflejados."

### 4.2 Filtrado de camas ocupadas

Modificar los siguientes `useMemo`:

| Variable | Línea actual | Cambio |
|---|---|---|
| `occupiedBeds` | 43-47 | Usar `filtrarActivos(refugiadosDelCampamento)` en vez de `refugiadosDelCampamento` |
| `bedOccupants` | 49-58 | Mismo filtro |

`uniqueOccupiedBedsSet`, `disponiblesCroquis`, `ocupadasModulo` y `handleExportCroquisPDF` heredan el cambio automáticamente por dependencia.

**Import:** Agregar `import { esRetirado, filtrarActivos } from '../lib/retiredFilter';`

## 5. CroquisViewer2.tsx (Actas y Reportes)

**Archivo:** `src/components/constructor/CroquisViewer2.tsx`

En el `useMemo` interno que construye `occupiedBeds` y `bedOccupants` (~líneas 340-364), aplicar `filtrarActivos()` sobre los refugiados antes de mapear `nro_cama`.

## 6. Refugiados (Refugiados.tsx)

### 6.1 Tabla

- **Línea 523-528:** Celda de cama. Si el refugiado es retirado Y tiene cama, aplicar clases `text-gray-400 line-through` en vez de `text-caracas-red`. Remover el ícono `FileText` o mantenerlo también en gris.
- **Condición:** `const retiradoConCama = esRetirado(refugiado.refugiado) && refugiado.cama;`

### 6.2 Vista móvil (cards)

- **Línea 680-683:** Misma lógica: gris + tachado si retirado con cama.

### 6.3 Imports

Agregar `import { esRetirado } from '../lib/retiredFilter';`

## 7. Edge cases

| Caso | Comportamiento |
|---|---|
| Retirado sin cama (`nro_cama` vacío) | No aplica gris ni tachado. Muestra "—" normal. |
| Retirado sin `hogar_solidario` definido | `esRetirado()` retorna `false`. Se trata como activo. |
| Cama con múltiples ocupantes, uno se retira | La cama se libera (el retirado no cuenta en `occupiedBeds`). Si ambos se retiran, queda libre. |
| Exportaciones PDF/Excel | Heredan el filtro de `occupiedBeds`/`bedOccupants`. Sin cambios adicionales. |

## 8. Componentes que NO cambian

- **CroquisViewer.tsx:** Recibe `occupiedBeds` y `bedOccupants` ya filtrados como props. Sin cambios.
- **RegistroModal.tsx:** El formulario de edición/creación sigue mostrando el campo `nroCama` normalmente (el usuario puede editar el valor de cama de un retirado).
- **FichaRefugiadoModal.tsx:** Muestra `nro_cama` normalmente, sin gris ni tachado.
- **Familias.tsx:** Muestra `nro_cama` normalmente, sin gris ni tachado.
- **DetalleFamiliaModal.tsx:** Muestra `nro_cama` normalmente, sin gris ni tachado.
- **Módulos de Salud y Agenda:** Muestran `nro_cama` informativamente. No se alteran.
