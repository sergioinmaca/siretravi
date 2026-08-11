# Módulo Cocina — Especificación de Diseño

## 1. Resumen

Nuevo módulo **Cocina** para organizar el menú de comidas por campamento. Permite planificar el menú semanal (Desayuno, Merienda post-desayuno, Almuerzo, Merienda post-almuerzo, Cena, Merienda post-cena) con llenado flexible: se puede cargar la semana completa de una vez o rellenar días puntuales más tarde. La interfaz principal es una grilla semanal "parecida a la del módulo Agenda".

El módulo tendrá más funcionalidades en el futuro, pero esta especificación cubre únicamente la organización del menú.

## 2. Alcance

- Vista semanal (Lun–Dom) tipo grilla: filas = comidas activas del campamento, columnas = días.
- Creación de comidas por celda (día × comida) vía modal, con hora precargada desde la config y raciones con el conteo de integrantes presentes.
- Modal "Completar semana" para cargar varias celdas de una sola vez.
- Modal "Horarios" para configurar por campamento: slots activos y hora por defecto de cada comida.
- Edición y eliminación de comidas.
- Permisos por módulo: Ver, Crear, Modificar, Eliminar.
- Persistencia en Supabase (tablas `cocina_slots` y `cocina_menu`).
- Fechas mostradas/escritas en formato **DD-MM-YYYY**; almacenadas como `date` en PostgreSQL.
- Zona horaria explícita **America/Caracas** para el cálculo del "hoy".

## 3. Stack y Dependencias

- **React + Vite + Tailwind CSS** (misma paleta institucional del proyecto).
- **dayjs** (ya en el proyecto) — se agregan los plugins `utc` y `timezone`.
- **lucide-react** — íconos (p. ej. `UtensilsCrossed` para el sidebar).
- **Supabase** — persistencia.
- Sin librerías externas nuevas.

## 4. Modelo de Datos

Nuevas tablas en Supabase (patrón de `eventos`: columnas `date`/`time` naive, RLS, índices):

```sql
-- Config de horarios/slots por campamento (se crea perezosamente la primera vez)
CREATE TABLE IF NOT EXISTS cocina_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('desayuno','merienda_1','almuerzo','merienda_2','cena','merienda_3')),
  activo        BOOLEAN NOT NULL DEFAULT false,
  hora_servicio TIME NOT NULL DEFAULT '07:00',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campamento_id, tipo)
);

-- Comidas del menú
CREATE TABLE IF NOT EXISTS cocina_menu (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('desayuno','merienda_1','almuerzo','merienda_2','cena','merienda_3')),
  menu          TEXT NOT NULL,
  raciones      INTEGER NOT NULL DEFAULT 0,
  hora_servicio TIME NOT NULL,
  responsable   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campamento_id, fecha, tipo)
);

CREATE INDEX IF NOT EXISTS idx_cocina_menu_camp_fecha ON cocina_menu(campamento_id, fecha);

ALTER TABLE cocina_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocina_menu  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total cocina_slots" ON cocina_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total cocina_menu"  ON cocina_menu  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Módulo Cocina para permisos
INSERT INTO modulos (nombre) VALUES ('Cocina') ON CONFLICT (nombre) DO NOTHING;

DO $$
DECLARE v_cocina_id UUID;
BEGIN
  SELECT id INTO v_cocina_id FROM modulos WHERE nombre = 'Cocina';
  INSERT INTO acciones (modulo_id, nombre) VALUES
    (v_cocina_id, 'Ver'), (v_cocina_id, 'Crear'), (v_cocina_id, 'Modificar'), (v_cocina_id, 'Eliminar')
  ON CONFLICT DO NOTHING;
END $$;
```

**Detalles:**

- **Tipos de comida** fijos: `desayuno`, `merienda_1`, `almuerzo`, `merienda_2`, `cena`, `merienda_3`.
- **Defaults lazy-init:** al primer acceso al módulo con un campamento sin config, se insertan los 6 slots: `desayuno 07:00` activo, `merienda_1 10:00` inactivo, `almuerzo 12:00` activo, `merienda_2 15:00` inactivo, `cena 18:00` activo, `merienda_3 20:00` inactivo.
- **Unicidad** `(campamento_id, fecha, tipo)` garantiza un solo menú por celda.
- **`menu`** obligatorio (si se crea la comida, se describe). **`responsable`** opcional. **`raciones`** ≥ 0.
- **`updated_at`:** no hay trigger; se actualiza desde el código en cada update.

## 5. Ruteo, Sidebar y Permisos

- Nueva ruta `/cocina` → `src/pages/Cocina.tsx`.
- Item nuevo en `menuItems` y `pathToModulo` de `src/layouts/MainLayout.tsx`:
  ```ts
  { path: '/cocina', icon: UtensilsCrossed, label: 'Cocina' }
  ```
- Permisos (via `tienePermisoPorCampamento('Cocina', campamentoId, accion)`):
  - `Ver` → acceso a la página (gate `ShieldOff` si no hay permiso/campamento). Con solo `Ver`, las celdas vacías no muestran "+ Agregar" y al hacer clic en una celda llena se abre el modal en modo **solo lectura**.
  - `Crear` → crear comidas y botón "Completar semana".
  - `Modificar` → editar comidas y botón "Horarios".
  - `Eliminar` → eliminar comidas (con confirmación).

## 6. Fechas y Zona Horaria

- Fechas almacenadas como `date` (YYYY-MM-DD) y horas como `time` (HH:MM), tipos naive. Nunca se convierten, evitando desfases.
- **Interfaz:** toda fecha se muestra y escribe en **DD-MM-YYYY** (consistente en todo el módulo).
- En `src/lib/dayjs.ts` se agregan los plugins `utc` + `timezone` y se fija `dayjs.tz.setDefault('America/Caracas')`.
- El "hoy" y la "semana actual" se calculan con `dayjs.tz()`.
- Regla de parseo: siempre `dayjs('YYYY-MM-DD')`; **nunca** `new Date('YYYY-MM-DD')` (JS lo interpreta como UTC y puede correr el día).

## 7. Tipos (src/types/index.ts)

```ts
export const TIPOS_COMIDA = ['desayuno', 'merienda_1', 'almuerzo', 'merienda_2', 'cena', 'merienda_3'] as const;
export type TipoComida = typeof TIPOS_COMIDA[number];

export interface CocinaSlot {
  id: string;
  campamento_id: string;
  tipo: TipoComida;
  activo: boolean;
  hora_servicio: string;
  created_at?: string;
}

export interface ComidaMenu {
  id: string;
  campamento_id: string;
  fecha: string;        // 'YYYY-MM-DD'
  tipo: TipoComida;
  menu: string;
  raciones: number;
  hora_servicio: string; // 'HH:MM'
  responsable?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

## 8. Componentes

```
src/pages/Cocina.tsx                    ← Página principal: permisos, estado, navegación de semanas, fetch
src/components/cocina/VistaSemanal.tsx  ← Grilla Lun–Dom × slots activos
src/components/cocina/EditarComidaModal.tsx   ← Crear/editar una comida
src/components/cocina/CompletarSemanaModal.tsx← Cargar varias celdas de una vez
src/components/cocina/ConfigHorariosModal.tsx ← Slots activos + horas por defecto
src/lib/cocina.ts                       ← fetch/crear/actualizar/eliminar + conteo de presentes
```

### VistaSemanal

- Columnas: Lun…Dom (lunes primero). Fila cabecera con día y número; el día actual (en Caracas) resaltado.
- Filas: solo los slots activos del campamento, en orden fijo Desayuno → Merienda 1 → Almuerzo → Merienda 2 → Cena → Merienda 3.
- **Celda vacía:** borde punteado + "+ Agregar" (solo visible con permiso `Crear` o `Modificar`). Click → `EditarComidaModal` en modo crear (hora precargada de config, raciones con conteo de presentes).
- **Celda llena:** tarjeta con hora, menú (truncado), `N rac.` y responsable. Click → `EditarComidaModal` en modo editar (con permiso `Modificar`) o en modo solo lectura (con solo `Ver`). Con permiso `Eliminar`, ícono papelera con confirmación.

### EditarComidaModal

- Fecha y tipo bloqueados según la celda (se muestran en DD-MM-YYYY y nombre de la comida).
- Campos: **Menú** (textarea, obligatorio), **Hora** (input time, precargada desde config, editable), **Raciones** (input numérico, precargado con conteo de presentes, editable), **Responsable** (texto, opcional).
- Modo crear → "Guardar"; modo editar → "Guardar cambios" + botón "Eliminar" (según permiso).

### CompletarSemanaModal

- Selección de días (checkboxes, por defecto todos los de la semana) y de comidas (checkboxes, por defecto todos los slots activos).
- Por cada comida seleccionada: campo de menú, hora (precargada de config), raciones (conteo de presentes) y responsable — se aplican a todos los días seleccionados.
- Al guardar crea las celdas en batch; las celdas ya existentes se **omiten** y se informa al final ("Se omitieron N celdas ya cargadas").

### ConfigHorariosModal

- 6 filas: nombre de la comida, toggle `activo` (Desayuno/Almuerzo/Cena siempre ON y bloqueados) y input de hora por defecto.
- Guardar = upsert de los 6 slots.
- Cambiar una hora aquí **no altera** las comidas ya cargadas (cada una guarda su propia hora).

## 9. Flujo de Datos

```
[Supabase: cocina_slots + cocina_menu]
     ↓ fetchSlots(campamentoId)   → si vacío, inserta defaults (lazy-init)
     ↓ fetchMenu(campamentoId, semana[Lun..Dom])
     ↓ fetchPresentes(campamentoId) → conteo refugiados con estatus 'PRESENTE'
[Estado local en Cocina.tsx]
     ↓ mapa: Map<fecha, Map<tipo, ComidaMenu>>
[VistaSemanal]
```

- **Conteo de presentes:** `refugiados` donde `campamento_id = X` y `hogar_solidario` vacío o `'PRESENTE'` (misma lógica que Inicio.tsx).
- **Refetch:** al cambiar de campamento, navegar de semana, o tras crear/editar/eliminar.
- **Crear:** insert en `cocina_menu`. Si ya existe (race condition) → error claro "Esta comida ya está cargada" (protegido por `UNIQUE`).
- **Eliminar:** `delete` por id tras confirmación.

## 10. Diseño Visual

- Paleta institucional (fondos blancos, texto gris oscuro, acentos `caracas-red`/azul institucional) — coherente con el resto de módulos.
- Cabecera: título "Cocina" + botón "Completar Semana" (primary, permiso Crear) + botón "Horarios" (permiso Modificar).
- Barra de navegación: `←` `Semana del X al Y de MMMM` `→` + botón "Hoy" (patrón Agenda).
- Celdas de comida con bordes redondeados y colores suaves; la celda vacía punteada invita a agregar.
- Modales con overlay oscuro + tarjeta blanca centrada (patrón existente del proyecto).

## 11. Manejo de Estados

- **Carga:** spinner mientras se fetchea.
- **Semana sin menús:** estado amable "Sin menú esta semana" + CTA "Completar semana".
- **Sin campamento / sin permiso:** pantalla `ShieldOff` (mismo patrón que los demás módulos).
- **Errores de Supabase:** mensaje visible (toast/alerta), sin dejar la interfaz rota.

## 12. Edge Cases

| Caso | Comportamiento |
|---|---|
| Campamento sin config de horarios | Lazy-init con defaults al primer acceso |
| Cambio de campamento | Refetch completo; slots y horas propios del campamento |
| Navegar a otra semana | Se cargan solo los menús de ese rango |
| Celda ya llena en "Completar semana" | Se omite y se informa la cantidad omitida |
| Crear comida que ya existe | Error claro, sin duplicados (constraint UNIQUE) |
| Cambio de hora en config | Solo afecta comidas nuevas; las existentes conservan su hora |
| Fecha en interfaz | Siempre DD-MM-YYYY; almacenada como `date` |
| Día actual | Calculado en America/Caracas |
| Conteo de presentes | Se calcula al abrir el modal de crear; ajustable a mano |

## 13. Verificación

El proyecto no tiene framework de tests. Se verifica con:

- `npm run lint` (oxlint)
- `npm run build` (tsc + vite)
- Verificación manual: llenado parcial, completar semana, config de horarios, permisos (Ver/Crear/Modificar/Eliminar), cambio de campamento, navegación semanal, formato DD-MM-YYYY.

## 14. Fuera de Alcance (futuro)

- Exportar PDF del menú semanal
- Copiar menú de la semana anterior
- Registro de raciones servidas vs. planificadas
- Inventario de ingredientes y costos
- Integración con el dashboard (menú del día)
- Vista mensual
