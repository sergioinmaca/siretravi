# Menú de Hoy en el Dashboard — Especificación de Diseño

## 1. Resumen

Agregar al módulo **Inicio** (Dashboard) un visualizador del **menú del día actual** del campamento seleccionado. Es una fila de ancho completo que se ubica debajo de las cards demográficas de Adolescentes, Adultos y Adulto Mayor. Solo se muestra si existe data de comidas para el día de hoy en el módulo Cocina; de lo contrario no se renderiza.

## 2. Alcance

- Fila completa (tarjeta blanca) con encabezado "Menú de Hoy" + fecha en formato DD-MM-YYYY.
- Grilla responsiva de tarjetas, una por comida del día (hasta 6: desayuno, meriendas, almuerzo, cena).
- Cada tarjeta muestra: nombre de la comida + hora, menú, bebida (con emoji 🥤), raciones y responsable.
- Tarjetas clickeables → navegan al módulo Cocina (`/cocina`).
- Oculto automáticamente si no hay comidas registradas para hoy.
- Consulta de datos en `cocina_menu` vía `src/lib/cocina.ts` (función `fetchMenu` existente).

## 3. Stack y Dependencias

- **React + Tailwind CSS** — componente y estilos (misma paleta del dashboard).
- **dayjs** — cálculo de "hoy" en `America/Caracas` (consistente con el módulo Cocina).
- **react-router-dom** — `useNavigate` para navegar a `/cocina`.
- **Supabase** — datos ya cubiertos por `lib/cocina.ts`. Sin dependencias nuevas.

## 4. Componentes

Nuevo componente autocontenido (patrón `components/inicio/DistribucionGeografica`):

```
src/components/inicio/MenuDelDia.tsx   ← visualizador del menú de hoy
```

### Propiedades

```ts
interface MenuDelDiaProps {
  campamentoId?: string;  // undefined → devuelve null
}
```

### Inserción en Inicio

En `src/pages/Inicio.tsx`, después de la grilla de Adolescentes/Adultos/Adulto Mayor (línea ~868) y antes de `DistribucionGeografica`:

```tsx
<MenuDelDia campamentoId={campamentoSeleccionado?.id} />
```

La fila queda dentro del mismo contenedor de la página → abarca el ancho completo.

## 5. Flujo de Datos

```
[Inicio.tsx] → <MenuDelDia campamentoId={campamentoSeleccionado?.id} />
     ↓
[MenuDelDia] useEffect([campamentoId])
     ↓ fetchMenu(campamentoId, hoy, hoy)   ← src/lib/cocina.ts
[ComidaMenu[]] → ordenar por TIPOS_COMIDA
     ↓
Si length === 0 → return null   (no se muestra nada)
Si length > 0   → render de la fila completa
```

- `hoy = dayjs().tz('America/Caracas').format('YYYY-MM-DD')`.
- Orden canónico: `TIPOS_COMIDA` (Desayuno → Merienda 1 → Almuerzo → Merienda 2 → Cena → Merienda 3).
- **Refetch:** al montar o al cambiar `campamentoId`.
- **Permisos:** el gate `Ver` del módulo Inicio ya protege la página; la lectura de `cocina_menu` usa la RLS de autenticado del proyecto (sin cambios).
- **Click en tarjeta:** `navigate('/cocina')`.

## 6. Diseño Visual

**Contenedor (fila completa):**
- Tarjeta blanca `rounded-2xl border border-gray-100 shadow-sm`.
- Encabezado con barra roja vertical (`w-1 h-6 bg-caracas-red rounded-full`) + título "**Menú de Hoy**" (estilo "Tenencia de Vivienda") + fecha en **DD-MM-YYYY** a la derecha.
- Mobile: patrón de las demás secciones del dashboard (`max-md:bg-transparent max-md:rounded-none max-md:shadow-none max-md:border-0 max-md:px-4 max-md:py-3 max-md:-mx-4`).

**Grilla de comidas:**
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` → hasta 3 tarjetas por fila; 6 comidas = 2 filas; 1 comida = 1 tarjeta.

**Tarjeta de comida (clickeable → `/cocina`):**
```
┌────────────────────────────┐
│ Desayuno          07:00 AM │   ← nombre (2 líneas si es merienda) + hora en rojo
│ AREPAS, CAFÉ Y QUESO       │   ← menú (MAYÚSCULAS, semibold, hyphens-auto break-words)
│ 🥤 JUGO DE NARANJA         │   ← bebida, mismo estilo de línea
│ 220 raciones               │
│ Juan Pérez                 │   ← responsable gris truncado
└────────────────────────────┘
```
- Hover: borde/sombra sutil + `cursor-pointer`.
- Nombre de merienda con división en dos líneas ("Merienda" / "(Post desayuno)"), reutilizando el helper de `VistaSemanal`.
- Estilos de texto de menú/bebida reutilizan los de la card del módulo Cocina.

## 7. Manejo de Estados

- **Cargando:** renderiza `null` (evita parpadeo de sección vacía; la consulta es rápida).
- **Sin data hoy:** `null` (la fila no se muestra).
- **Con data:** se muestra la fila con su encabezado y tarjetas.

## 8. Edge Cases

| Caso | Comportamiento |
|---|---|
| Sin `campamentoId` | `null` |
| Cambio de campamento | Refetch; cada sede muestra su menú |
| Solo 1 comida hoy | Grilla con 1 tarjeta, sin espacios extraños |
| 6 comidas (con meriendas) | 2 filas de 3 en pantallas grandes |
| Menú de ayer/mañana | Nunca aparece: siempre se consulta "hoy" en Caracas |
| Comida sin responsable | Se omite esa línea |
| Bebida vacía (comidas viejas) | Se omite la línea 🥤 |
| Usuario con Ver en Inicio sin permiso en Cocina | La fila igual se muestra (lectura de `cocina_menu` con RLS autenticado) |

## 9. Verificación

El proyecto no tiene framework de tests. Se verifica con:

- `npx tsc -b`
- `npx oxlint src/components/inicio/MenuDelDia.tsx src/pages/Inicio.tsx`
- Manual: menú del día cargado en Cocina se refleja en el dashboard; oculto si el día no tiene comidas; click navega a `/cocina`; cambio de campamento refresca.

## 10. Fuera de Alcance (futuro)

- Edición del menú desde el dashboard (se navega a Cocina).
- Vista de los próximos días / semana.
- Indicador visual de comidas no cargadas en el día.
- Cache/actualización en tiempo real del menú.
