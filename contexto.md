# Contexto del Proyecto: SIRETRAVI (Red de Campamentos Transitorios)

## 1. Descripción General
El sistema (Sistema de Registro Transitorio Ávila - SIRETRAVI) es una aplicación web escalable diseñada para registrar, gestionar y mostrar la información de las personas que se encuentran físicamente albergadas en una **red de campamentos/refugios transitorios** tras el terremoto ocurrido el 24 de junio de 2026. Inicialmente concebido para un solo refugio, ahora gestiona múltiples sedes simultáneamente. Se encuentra en producción con el frontend alojado en Firebase Hosting.

## 2. Stack Tecnológico
*   **Frontend:** React 19 con Vite 8 y TypeScript 6.
*   **Estilos:** Tailwind CSS con la paleta de colores institucional `caracas` (`red: #CE1226`, `green: #007229`, `blue: #0033A0`, `yellow: #FFD100`, `light: #F8FAFC`, `dark: #1E293B`) basada en la bandera de la Alcaldía de Caracas.
*   **Hosting:** Firebase Hosting (producción actual).
*   **Backend y Base de Datos:** Supabase (PostgreSQL) — base de datos relacional, autenticación de usuarios, Row Level Security y Realtime (suscripciones en vivo para refugiados y familias).
*   **Enrutamiento:** React Router DOM v7.
*   **Iconografía:** Lucide React.
*   **Reportes:** jsPDF + html2canvas (exportación PDF), pptxgenjs (exportación PowerPoint).
*   **Fuente:** Inter (sans-serif principal).

## 3. Modelo de Datos Principal

### 3.1. Entidad: Campamento (Refugio)
*   **ID:** Identificador único (UUID).
*   **Nombre:** Texto (Ej. "Campamento Ávila", "Campamento La Guaira").
*   **Ubicación:** Texto (Dirección física).
*   **Capacidad Máxima:** Numérico (Camas disponibles totales).
*   **Estado:** `activo` | `inactivo`.
*   **Tipo de Contabilización:** `cama` (cada cama individual cuenta) | `elemento` (cada mueble cuenta como 1, ej. una litera = 1 elemento pero 2 camas).
*   **Carpas:** Lista de carpas asociadas (relación 1:N).

### 3.2. Entidad: Carpa
*   **ID:** Identificador único (UUID).
*   **ID_Campamento:** Vinculación al campamento al que pertenece.
*   **Nombre:** Texto (Ej. "CARPA A", "CARPA B").
*   **Literas:** Cantidad de literas (cada litera = 2 camas).
*   **Camas Individuales:** Cantidad de camas individuales.
*   **Camas Dúplex:** Cantidad de camas dúplex (cada dúplex = 2 camas).
*   **Croquis Data:** JSON serializado del canvas del editor visual (contiene `drawingBase64` con las paredes dibujadas y `objects[]` con las camas, rectángulos y textos).
*   **Orden:** Número de orden para mantener la secuencia entre carpas.

### 3.3. Entidad: Refugiado (Persona)
*   **ID:** Identificador único (UUID).
*   **ID_Campamento:** Vinculación al campamento donde está alojado.
*   **ID_Familia:** Vinculación a la familia a la que pertenece (opcional).
*   **Nombres:** Texto.
*   **Apellidos:** Texto.
*   **Cédula:** Número (Opcional, dado que hay niños que aún no tienen documento de identidad).
*   **Género:** Booleano (`true` = Masculino, `false` = Femenino).
*   **Fecha de Nacimiento:** Tipo `Date`.
*   **Edad:** Campo calculado automáticamente en base a la Fecha de Nacimiento.
*   **Es Jefe de Familia:** Booleano. Si es `true`, el sistema crea automáticamente un grupo familiar nuevo cuyo nombre es el nombre completo de la persona. Si es `false`, se asigna a una familia existente mediante dropdown.
*   **Nro de Cama:** Texto de 3 dígitos (desde `001` al `999`). El sistema permite múltiples asignaciones para la misma cama sin lanzar error de ocupación.
*   **Procedencia:** Texto. Referencia breve de la dirección donde residía antes del terremoto.
*   **Fecha de Ingreso:** Fecha en que ingresó al refugio (opcional).
*   **Dirección Exacta:** Dirección detallada de su vivienda previa (opcional).
*   **Discapacidad:** Booleano. Indica si presenta alguna discapacidad.
*   **Tipo de Discapacidad:** Texto (Ej. "MOTORA", "VISUAL", "AUDITIVA") — solo si discapacidad es `true`.
*   **Embarazo:** Booleano. Solo aplica si género es Femenino.
*   **Tiempo de Embarazo:** Número en semanas (1-42) — solo si embarazo es `true`.
*   **Mascotas:** Booleano. Indica si tiene mascotas a su cargo (solo visible si es Jefe de Familia).
*   **Tipo de Mascota:** Texto (Ej. "PERRO", "GATO").
*   **Sexo de la Mascota:** Booleano (`true` = Macho, `false` = Hembra).
*   **Raza de la Mascota:** Texto.
*   **Nombre de la Mascota:** Texto.
*   **Edad de la Mascota:** Número.
*   **Teléfono:** Número (opcional).
*   **Profesión u Ocupación:** Texto (opcional).
*   **Talla de Camisa:** Texto (opcional).
*   **Talla de Pantalón:** Texto (opcional).
*   **Talla de Zapatos:** Texto (opcional).
*   **Alergias:** Booleano. Si es `true`, se muestra campo adicional "Tipo de Alergia".
*   **Tipo de Alergia:** Texto (Ej. "PENICILINA", "POLEN") — solo si alergias es `true`.
*   **Enfermedad Crónica:** Booleano. Indica si posee una enfermedad que requiera tratamiento de por vida.
*   **Medicamento:** Texto (Ej. "INSULINA", "LEVOTIROXINA") — solo si enfermedad_cronica es `true`.
*   **Tipo de Discapacidad:** Dropdown con opciones fijas: "Física o motriz", "Sensorial", "Intelectual", "Psicosocial o mental", "Visceral u Orgánica", "Múltiple".

### 3.4. Entidad: Familia
*   **ID:** Identificador único (UUID).
*   **ID_Campamento:** Vinculación al campamento.
*   **Nombre:** Texto (Ej. "FAMILIA JUAN PÉREZ").
*   **Integrantes:** Relación 1:N con Refugiados (los que tienen `familia_id` = esta familia).

### 3.5. Entidad: Usuario (Operador del Sistema)
*   **ID:** Identificador único (UUID).
*   **Nickname:** Texto único (minúsculas, usado para login).
*   **Nombres:** Texto.
*   **Apellidos:** Texto.
*   **Clave:** Texto (hash gestionado por Supabase Auth).
*   **Es Master:** Booleano. Los usuarios MASTER tienen acceso total a todos los módulos sin restricción.
*   **Activo:** Booleano. Si es `false`, no puede iniciar sesión.

### 3.6. Entidad: Permiso
*   **ID:** Identificador único (UUID).
*   **ID_Usuario:** Vinculación al usuario.
*   **ID_Módulo:** Vinculación al módulo.
*   **Acciones:** Arreglo de strings (Ej. `["Ver", "Crear", "Modificar", "Eliminar"]`).
*   **Campamentos:** Arreglo de IDs de campamentos o `null` (significa "todos los campamentos").

### 3.7. Entidades Auxiliares: Módulo y Acción
*   **Módulo:** Catálogo fijo con 6 módulos: Inicio, Refugiados, Familias, Constructor, Reportes, Usuarios.
*   **Acción:** Catálogo de acciones por módulo (Ej. Refugiados tiene: Ver, Crear, Modificar, Eliminar).

## 4. Distribución Física del Refugio (Constructor)
La unidad mínima de ocupación es la **Cama**. La distribución está supeditada al **Campamento** seleccionado en el sistema.

El **Módulo Constructor** permite mapear la realidad física de cada campamento mediante un editor visual basado en canvas:
*   Se crean carpas con nombre y cantidad de camas (literas, individuales, dúplex).
*   Cada carpa tiene un **CroquisEditor** donde se dibujan las paredes (herramientas: lápiz, rectángulo, borrador, texto) y se colocan los íconos de camas arrastrándolos sobre el plano.
*   Las camas se numeran automáticamente según el modo de contabilización (por cama o por elemento), con numeración continua entre carpas.
*   Soporta selección múltiple, agrupar/desagrupar, copiar/pegar, rotar y eliminar objetos en el canvas.

## 5. Módulos de la Aplicación (Sidebar)
La aplicación web cuenta con un **sidebar retráctil** con los siguientes módulos. El **Header (Cabecera)** incluye un Dropdown global para seleccionar el Campamento, filtrado según los permisos del usuario.

1.  **Inicio (Dashboard):**
    *   Cards con indicadores: Total Refugiados (desglosado por género), Familias, Camas Disponibles (ocupadas vs totales), Carpas Activas.
    *   Indicadores demográficos: Niños (0-12), Adolescentes (13-17), Adulto Mayor (H ≥60 / M ≥55).
    *   Ranking de Procedencias con barras horizontales y tooltips.
    *   **Croquis interactivo:** Visualización espacial de la distribución de camas por carpa usando CroquisViewer.
2.  **Refugiados:** Tabla paginada (20 registros por página) con búsqueda por cédula, nombre o apellido. Modal de registro/edición con 4 secciones (Datos Personales, Jerarquía Familiar, Ubicación y Procedencia, Información Adicional). Acciones contextuales por fila (Modificar, Eliminar) sujetas a permisos.
3.  **Familias:** Grid de cards con búsqueda. Modal de detalle que muestra la tabla de integrantes de la familia con cédula, edad, género, cama, procedencia y rol (Jefe de Familia).
4.  **Constructor:** Grid de cards de campamentos con resumen de carpas y camas. Modal de creación/edición con acordeones por carpa y CroquisEditor integrado. Validación que impide eliminar campamentos con refugiados o familias asignadas.
5.  **Reportes:** Dos tipos de reporte exportables a PDF y PowerPoint:
    *   *Reporte General Demográfico* (2 páginas): distribución de familias por procedencia (La Guaira vs Caracas), género (con gráfico circular), grupos etarios (con gráfico de barras).
    *   *Reporte de Niños, Niñas y Adolescentes* (1 página): clasificación por rangos (0-3, 4-6, 7-12, adolescentes) con alertas de discapacidad y embarazo adolescente.
6.  **Usuarios:** Acceso exclusivo para usuarios MASTER. Tabla con CRUD completo. Modal de creación/edición con asignación de permisos granulares por módulo, acción y campamento específico.

### Autenticación y Login
El sistema de login está implementado y operativo usando Supabase Auth:
*   Login mediante nickname + clave (el sistema genera automáticamente un email `<nickname>@siretravi.local` para la autenticación en Supabase).
*   Al primer inicio de sesión con el nickname `master`, el sistema crea automáticamente el usuario MASTER.
*   Los usuarios pueden tener permisos específicos por módulo (Ver, Crear, Modificar, Eliminar) y opcionalmente restringidos a campamentos específicos.
*   Las rutas protegidas redirigen a `/login` si no hay sesión activa.

## 6. Diseño UI/UX
*   Interfaces modernas con diseño "Premium": bordes redondeados (xl, 2xl, 3xl), sombras suaves, hover states con transiciones.
*   Sidebar retráctil (64px cerrado / 256px abierto) con animación fluida, filtrado dinámico según permisos del usuario.
*   Dropdown de Campamentos en el header con indicación visual del seleccionado, filtrado por permisos.
*   Modales con backdrop blur, cabecera con gradiente, cuerpo scrollable y footer con acciones.
*   Acordeones en formularios (carpas en Constructor, permisos en UsuarioModal).
*   Tablas con hover en filas, acciones contextuales visibles solo al hover, paginación, búsqueda en vivo.
*   Cards con gradientes en la cabecera (rojo para constructor, azul para familias) y efectos hover.
*   Diseño responsive (grid adaptativo md/lg).
*   Paleta `caracas` aplicada consistentemente: rojo corporativo (#CE1226) como color principal de acción, azul (#0033A0) para módulo de familias, verde (#007229) para indicadores positivos.
*   Tipografía: Inter (sans-serif).

## 7. Arquitectura de Componentes

```
App (AuthProvider + BrowserRouter)
└── AppRoutes
    ├── /login → Login.tsx
    └── / (ProtectedRoute + CampamentoProvider + MainLayout)
        ├── Sidebar retráctil (filtrado por permisos del usuario)
        ├── Header (dropdown de campamentos filtrado por permisos)
        └── <Outlet>
            ├── / → Inicio.tsx
            │     └── CroquisViewer (por carpa, numeración offset)
            ├── /refugiados → Refugiados.tsx
            │     └── RegistroModal (refugiados/)
            ├── /familias → Familias.tsx
            │     └── DetalleFamiliaModal (familias/)
            ├── /constructor → Constructor.tsx
            │     └── CrearRefugioModal (constructor/)
            │           ├── CroquisEditor (canvas interactivo)
            │           └── CroquisViewer (lectura)
            ├── /reportes → Reportes.tsx
            └── /usuarios → Usuarios.tsx
                  └── UsuarioModal (usuarios/)

Contextos globales:
├── AuthContext (CampamentoContext)
│   └── Estado: usuarioActual, permisos, cargando
│   └── Métodos: login(), logout(), tienePermiso(),
│                 tienePermisoPorCampamento(), obtenerCampamentosPermitidos()
└── CampamentoContext
    └── Estado: campamentos[], familias[], refugiados[],
                campamentoSeleccionado, loading
    └── Métodos: seleccionarCampamento(), agregar/actualizar/eliminarCampamento(),
                 agregarFamilia(), agregar/eliminar/actualizarRefugiado()
    └── Realtime: suscripciones a cambios en refugiados y familias vía Supabase

Tipos compartidos (types/index.ts):
├── Campamento, Carpa, Refugiado, Familia
├── Usuario, Permiso, Modulo, Accion

Utilidades (lib/):
└── supabase.ts → Cliente Supabase inicializado con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```
