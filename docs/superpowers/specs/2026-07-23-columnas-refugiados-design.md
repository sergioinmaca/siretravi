# Especificación: Nuevas Columnas en Tabla Refugiados

**Fecha:** 2026-07-23
**Estado:** Aprobado

---

## 1. Propósito

Agregar tres nuevos campos a la tabla `refugiados`:
1. **Abrigo Solidario** — checkbox booleano que complementa el campo `nro_cama`
2. **Registro Captahuella** — indicador booleano (SI/NO)
3. **Registro Único de Vivienda** — indicador booleano (SI/NO)

---

## 2. Modelo de Datos

Se agregan 3 columnas a la tabla `refugiados` en Supabase:

| Columna | Tipo SQL | Default | Descripción |
|---|---|---|---|
| `abrigo_solidario` | `boolean` | `false` | Indica si la persona está en modalidad Abrigo Solidario |
| `registro_captahuella` | `boolean` | `false` | ¿Se realizó registro de captahuella? |
| `registro_unico_vivienda` | `boolean` | `false` | ¿Se realizó registro único de vivienda? |

Se agregan los campos correspondientes a la interfaz TypeScript `Refugiado` en `src/types/index.ts`:

```typescript
abrigo_solidario: boolean;
registro_captahuella: boolean;
registro_unico_vivienda: boolean;
```

---

## 3. Cambios en la UI

### 3.1 Tarjeta 3 — Ubicación y Procedencia (modificación)

**Label:** cambia de `Nro de Cama` a `Nro de cama / Abrigo Solidario`

**Layout (Opción A):** input reducido + checkbox en la misma fila.

```
┌─────────────────────────────────────────────────────┐
│ Nro de cama / Abrigo Solidario                      │
│ [▢042]  [✓] 👥 Abrigo Solidario                    │
│ ⚠ Esta cama ya tiene ocupantes                      │
└─────────────────────────────────────────────────────┘
```

**Detalles de implementación:**
- Input `nro_cama`: ancho `w-28` (reducido), mantiene `maxLength={3}`, `pattern="[0-9]{0,3}"` y placeholder `EJ. 042`
- Checkbox `abrigo_solidario`:
  - Color ámbar/naranja (`accent-amber-500`) para contraste visual
  - Ícono `Users` de lucide-react (3 siluetas, tamaño 16) junto al texto "Abrigo Solidario"
  - Texto del label en `text-amber-700 font-medium`
- Input y checkbox en `flex items-center gap-3`
- Aviso de cama duplicada se mantiene debajo del conjunto
- El div padre ocupa media columna del grid `md:grid-cols-2`

**Independencia de campos:** Abrigo Solidario y Nro de Cama son independientes. Se puede tener uno, otro, ambos o ninguno.

### 3.2 Nueva Tarjeta 8 — Registros Institucionales

Nueva sección después de Tarjeta 7 "Observaciones Generales".

```
┌──────────────────────────────────────────────────┐
│ 📋  8. Registros Institucionales                 │
├──────────────────────────────────────────────────┤
│ ¿Registro Captahuella?            [  SI  ▾  ]    │
│ ¿Registro Único de Vivienda?      [  SI  ▾  ]    │
└──────────────────────────────────────────────────┘
```

**Detalles de implementación:**
- **Encabezado:** ícono `FileText` (ya importado) sobre fondo `bg-blue-100`, color `text-blue-600`, título "8. Registros Institucionales"
- **Dos dropdowns `<select>`** con opciones `SI` / `NO`, valor por defecto `NO` (almacenado como `false`)
- Mismo estilo que los `<select>` existentes: `rounded-xl`, `focus:ring-caracas-red/20`, `focus:border-caracas-red`, padding `py-2.5`
- Grid `md:grid-cols-2 gap-6` para alinear horizontalmente en pantallas medianas+

**Mapeo de valores:**
- UI → Estado: `"SI"` → `true`, `"NO"` → `false`
- Estado → UI: `true` → `"SI"`, `false` → `"NO"`

---

## 4. Cambios en Backend (CampamentoContext)

### 4.1 `agregarRefugiado`
Incluir los 3 nuevos campos en el objeto `insert()`:
```typescript
abrigo_solidario: nuevo.abrigo_solidario || false,
registro_captahuella: nuevo.registro_captahuella || false,
registro_unico_vivienda: nuevo.registro_unico_vivienda || false,
```

### 4.2 `actualizarRefugiado`
Incluir los 3 nuevos campos en el objeto `update()`:
```typescript
abrigo_solidario: actualizado.abrigo_solidario || false,
registro_captahuella: actualizado.registro_captahuella || false,
registro_unico_vivienda: actualizado.registro_unico_vivienda || false,
```

### 4.3 Lectura de refugiados
Los campos se obtienen automáticamente con `SELECT *` en todas las queries existentes. No se requieren cambios en:
- `obtenerRefugiadosPaginados`
- Sincronización Realtime
- Carga inicial de refugiados

---

## 5. Cambios en FichaRefugiadoModal y PDF

### 5.1 Vista de solo lectura (FichaRefugiadoModal)
Mostrar `abrigo_solidario` dentro de la sección de Ubicación, como un campo adicional:
- Label: "Abrigo Solidario"
- Valor: `Sí` / `No` según el booleano

Mostrar la nueva sección "8. Registros Institucionales":
- "Registro Captahuella": `Sí` / `No`
- "Registro Único de Vivienda": `Sí` / `No`

### 5.2 Exportación PDF
Incluir los 3 campos en las mismas posiciones que en la ficha de solo lectura.

---

## 6. Validación y Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Refugiado existente sin los nuevos campos | Al abrir el modal de edición, los 3 campos deben mostrar su valor real desde DB (pueden ser `null` en registros antiguos; tratarlos como `false`) |
| Abrigo Solidario activado + cama vacía | Válido: puede estar en abrigo sin número de cama |
| Abrigo Solidario + número de cama | Válido: ambos pueden coexistir |
| Dropdowns SI/NO sin seleccionar | El default al crear es `NO` (`false`) |
| Ficha de refugiado antiguo | Mostrar "No" o "—" para los 3 campos si son `null`/`false` |

---

## 7. Archivos Afectados

| Archivo | Tipo de cambio |
|---|---|
| `src/types/index.ts` | Agregar 3 campos a la interfaz `Refugiado` |
| `src/components/refugiados/RegistroModal.tsx` | Modificar Tarjeta 3 + Agregar Tarjeta 8 |
| `src/components/refugiados/FichaRefugiadoModal.tsx` | Mostrar nuevos campos + incluirlos en PDF |
| `src/context/CampamentoContext.tsx` | Incluir campos en insert/update |
| **Supabase (tabla `refugiados`)** | Agregar 3 columnas `boolean DEFAULT false` |

---

## 8. Migración SQL (Supabase)

Ejecutar en el SQL Editor de Supabase:

```sql
ALTER TABLE refugiados 
  ADD COLUMN abrigo_solidario BOOLEAN DEFAULT false,
  ADD COLUMN registro_captahuella BOOLEAN DEFAULT false,
  ADD COLUMN registro_unico_vivienda BOOLEAN DEFAULT false;
```
