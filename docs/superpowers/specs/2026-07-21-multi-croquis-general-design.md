# Multiples Croquis Generales por Campamento

**Fecha:** 2026-07-21
**Estado:** Diseño aprobado

---

## 1. Resumen

Permitir múltiples croquis generales por campamento (ej: edificio con varios pisos, cada uno con su plano). Se sigue el mismo patrón de los módulos (input numérico, acordeones, nombre editable).

---

## 2. Modelo de datos

### 2.1 Columna existente — cambio de formato

La columna `campamentos.croquis_general` (TEXT) cambia su contenido:

**Formato viejo:** `{ drawingBase64: "...", objects: [...] }`

**Formato nuevo (array):**
```json
[
  { "nombre": "Planta Baja", "croquis_data": "{ drawingBase64, objects }" },
  { "nombre": "Piso 1",     "croquis_data": "{ drawingBase64, objects }" }
]
```

### 2.2 Tipos TypeScript

```typescript
export interface CroquisGeneral {
  nombre: string;
  croquis_data: string;
}
```

`Campamento.croquis_general` cambia de `string | null` a `CroquisGeneral[] | null`.

---

## 3. Contexto (CampamentoContext)

### 3.1 `mapCampamento()` — detección y migración

Al leer `croquis_general` de la BD, detectar formato:
- Si es array → usar tal cual.
- Si es objeto con `drawingBase64` (formato viejo) → convertir a `[{ nombre: 'Plano 1', croquis_data: raw }]`.
- Si es null/inválido → null.

### 3.2 `agregarCampamento()` y `actualizarCampamento()`

Serializar `CroquisGeneral[]` con `JSON.stringify()` al guardar. Si el array está vacío, guardar `null`.

---

## 4. CrearRefugioModal

### 4.1 Estados nuevos

```typescript
interface PlanoDraft {
  nombre: string;
  croquis_data: string;
  expanded: boolean;
}

const [cantidadPlanos, setCantidadPlanos] = useState(0);
const [planos, setPlanos] = useState<PlanoDraft[]>([]);
```

### 4.2 Handlers

- `handleCantidadPlanosChange(n)`: genera N drafts con nombres "Plano 1", "Plano 2"... (máx 20).
- `updatePlano(index, field, value)`: actualiza un campo del draft.
- `togglePlano(index)`: expande/colapsa el acordeón.

### 4.3 Carga al editar

Parsear `campamentoToEdit.croquis_general` y poblar `planos`.

### 4.4 UI

Sección "PLANOS GENERALES" entre Datos Generales y Módulos:
- Input numérico "Cantidad de Planos".
- Acordeones por plano: header con nombre, contenido con input de nombre + CroquisEditor modo="general".
- Placeholder cuando `cantidadPlanos === 0`.

### 4.5 Submit

Serializar `planos` a `CroquisGeneral[]` e incluirlo en `croquis_general`.

### 4.6 Eliminación de estado viejo

Se eliminan `croquisGeneralData` y `croquisGeneralExpandido`.

---

## 5. Scope

**Incluido:** múltiples planos (máx 20), nombres editables, migración automática de formato viejo.

**Excluido:** visualización en Inicio/PDFs, reordenar planos, eliminar plano individual (solo recortando cantidad).
