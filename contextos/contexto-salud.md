# Contexto — Módulo Salud

## Estado
**Branch `modulosalud`** — código implementado pero **NO mergeado** a `dev`. Commit: `c0d7565` ("primeraparte").
1648 líneas insertadas, 96 eliminadas en 11 archivos.

## Objetivo
Módulo Salud completo con sub-módulos de Historias Clínicas y Régimen Diario, siguiendo el patrón de permisos existente (Ver/Crear/Modificar/Eliminar por módulo, restricción por campamento).

## Cambios estructurales en Refugiados
- **Información Adicional**: las preguntas pasan a ser solo checkboxes (sin desglose tipo_discapacidad, tipo_alergia, etc.). El desglose lo hace el personal médico desde la Historia Clínica.
- **3 nuevos checkboxes**: `lesion_sismo`, `adulto_mayor_dependencia`, `lactante` (solo visible si género = FEMENINO).
- **Campos eliminados**: `tipo_discapacidad`, `tipo_alergia`, `medicamento_enfermedad` → migrados a `historias_clinicas`.
- **Campo migrado**: `enfermedad_cronica` existente, ahora usado en Régimen Diario.

## Stack
- React + TypeScript, Tailwind CSS, lucide-react (Stethoscope, Pill, ArrowLeft, HeartPulse), dayjs
- Supabase: RLS, Realtime subscriptions
- Sin librerías de formularios — inputs controlados manualmente

## Tablas nuevas en Supabase

| Tabla | Relación | Columnas clave (TS) |
|---|---|---|
| `historias_clinicas` | 1:1 con `refugiados` (FK `refugiado_id`) | `tipo_discapacidad`, `tipo_alergia`, `medicamento_enfermedad`, `lesion_sismo_detalle`, `adulto_mayor_detalle`, `lactante_detalle`, `enfermedades_previas`, `cirugias`, `examen_subjetivo`, `examen_objetivo`, `examen_diagnostico`, `fecha_apertura` |
| `atenciones_medicas` | 1:N con `historias_clinicas` (FK `historia_clinica_id`) | `fecha_atencion`, `presion_arterial` (string, ej: "120/80"), `temperatura`, `frecuencia_cardiaca`, `peso`, `talla`, `saturacion_oxigeno`, `observaciones` |
| `tratamientos` | 1:N con `historias_clinicas` (FK `historia_clinica_id`) | `medicamento`, `hora` (string HH:MM), `dosis` (string) |

## Interfaces TypeScript (`src/types/index.ts`)

### `HistoriaClinica`
```
id, refugiado_id, tipo_discapacidad?, tipo_alergia?, medicamento_enfermedad?,
lesion_sismo_detalle?, adulto_mayor_detalle?, lactante_detalle?,
enfermedades_previas?, cirugias?, examen_subjetivo?, examen_objetivo?,
examen_diagnostico?, fecha_apertura: Date, created_at: Date
```

### `AtencionMedica`
```
id, historia_clinica_id, fecha_atencion: Date, presion_arterial?: string,
temperatura?: number, frecuencia_cardiaca?: number, peso?: number,
talla?: number, saturacion_oxigeno?: number, observaciones?: string,
created_at: Date
```

### `Tratamiento`
```
id, historia_clinica_id, medicamento: string, hora: string,
dosis?: string, created_at: Date
```

### `Refugiado` (campos nuevos)
```
lesion_sismo: boolean, adulto_mayor_dependencia: boolean,
lactante?: boolean
```

## Permisos
- Módulo `Salud` → acciones: `ver`, `crear`, `modificar`, `eliminar`
- Mismo patrón que el resto: tabla `permisos_modulo` con FK a `modulos` y `usuarios`, check de campamento.
- Validación en cada vista vía `tienePermisoPorCampamento('Salud', campId, 'Ver')`.

## Vistas y navegación
- **Vista fullscreen**: páginas completas con botón ← (`ArrowLeft`) para volver a la landing.
- Landing en `/salud` con 2 cards clickeables.
- Sub-rutas: `/salud/historias-clinicas`, `/salud/regimen-diario`.
- Sidebar ítem `Salud` con icono `HeartPulse`, `pathToModulo` mapea `/salud` y sus sub-rutas.

## Archivos creados/modificados

| Archivo | Rol | Cambios |
|---|---|---|
| `src/types/index.ts` | Interfaces `HistoriaClinica`, `AtencionMedica`, `Tratamiento` + `Refugiado` actualizado | +45 líneas |
| `src/context/CampamentoContext.tsx` | Carga de 3 nuevas tablas, Realtime subscriptions, métodos CRUD | +337 líneas |
| `src/components/refugiados/RegistroModal.tsx` | Sección 4 refactorizada: solo checkboxes (3 nuevos), sin desgloses | refactorizado (138 chg) |
| `src/components/salud/HistoriaClinicaModal.tsx` | Formulario completo: búsqueda por cédula con auto-importación de datos del refugiado, desglose de checkboxes (discapacidad, alergia, medicamento, lesión sismo, adulto mayor, lactante), Examen Físico (Subjetivo, Objetivo, Diagnóstico), Enfermedades Previas, Cirugías | +428 líneas |
| `src/components/salud/AtencionMedicaModal.tsx` | Signos vitales: PA (string único), temperatura (°C), FC, peso (kg), talla (cm), satO2 (%), observaciones | +194 líneas |
| `src/components/salud/TratamientoModal.tsx` | Formulario: medicamento, dosis, hora (time input) | +136 líneas |
| `src/pages/Salud/Index.tsx` | Landing con 2 cards (Stethoscope + Pill), barra de color izquierda (`caracas-red`/`caracas-blue`), hover con elevación | +81 líneas |
| `src/pages/Salud/HistoriasClinicas.tsx` | Tabla con paginación (15 por página), menú contextual por fila (3 dots → Ver Atenciones Médicas, Ver Tratamientos), búsqueda por cédula/nombre, botón Abrir Historia Clínica, filtro por campamento | +228 líneas |
| `src/pages/Salud/RegimenDiario.tsx` | Card grid con pacientes `enfermedad_cronica = true`. Cards con header (nombre, cédula) y body con lista de tratamientos ordenados por hora. Botón `+` para agregar tratamiento, `Trash2` para eliminar | +141 líneas |
| `src/App.tsx` | 3 rutas nuevas: `/salud`, `/salud/historias-clinicas`, `/salud/regimen-diario` | +6 líneas |
| `src/layouts/MainLayout.tsx` | Sidebar ítem `Salud` con icono `HeartPulse`, `pathToModulo` actualizado | +10 líneas |

## Diseño visual
- **Landing cards**: `bg-white rounded-2xl shadow-sm border-gray-200`, barra de color izquierda (`w-2 h-full rounded-l-full`), `hover:shadow-xl hover:-translate-y-1`, iconos en contenedor `p-4 rounded-2xl` con bg semitransparente.
- **Colores**: `caracas-red` (Historias Clínicas), `caracas-blue` (Régimen Diario), siguiendo paleta del proyecto.
- **Tabla HC**: `text-sm`, paginación `perPage = 15`, menú contextual con `useState<string | null>` + `absolute right-0 mt-1 z-30`.
- **Cards Régimen Diario**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, cada card con lista de tratamientos ordenados por `hora` ASC, botones `Plus`/`Trash2` en cada card.

## Métodos en CampamentoContext
```typescript
fetchHistoriasClinicas()     // carga inicial
fetchAtencionesMedicas()     // carga inicial
fetchTratamientos()          // carga inicial
upsertHistoriaClinica(hc)    // insert o update (onConflict: refugiado_id)
createAtencionMedica(am)     // insert
createTratamiento(t)         // insert
eliminarTratamiento(id)      // delete
```

## Pendiente
- Mergear `modulosalud` → `dev`.
- Probar flujos completos: abrir HC por cédula, registrar atención médica, agregar/eliminar tratamientos en Régimen Diario.
- Verificar permisos: usuario master debe asignar permisos del módulo Salud desde el panel Usuarios.
- Confirmar checkboxes en registro de refugiados (`lactante` condicionado a género FEMENINO).
- Ejecutar SQL de creación de tablas/índices/RLS en Supabase (si no se ha hecho aún).
