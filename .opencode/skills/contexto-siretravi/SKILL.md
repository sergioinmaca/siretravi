---
name: contexto-siretravi
description: Carga el contexto completo del proyecto SIRETRAVI leyendo contexto.md y analizando toda la estructura del proyecto
---

## Instrucciones

Cuando ejecutes esta skill, seguí estos pasos obligatoriamente:

### 1. Leer e interpretar contexto.md
Leé `contexto.md` de la raíz del proyecto. Retené:
- Propósito del sistema (SIRETRAVI)
- Stack: React, Vite, Tailwind, Supabase, Firebase
- Modelo de datos: Campamento, Refugiado, Familia
- Módulos: Inicio (Dashboard), Refugiados, Constructor, Reportes, Usuarios
- Pautas de diseño UI/UX

### 2. Explorar src/ exhaustivamente
- `src/types/index.ts` — tipos compartidos
- `src/lib/supabase.ts` — cliente Supabase
- `src/context/AuthContext.tsx` y `CampamentoContext.tsx` — contextos globales
- `src/layouts/MainLayout.tsx` — layout principal
- `src/pages/*.tsx` — todas las páginas (Inicio, Refugiados, Familias, Constructor, Reportes, Usuarios, Login)
- `src/components/**/*.tsx` — componentes (constructor/, familias/, refugiados/, usuarios/)
- `src/App.tsx` — entrada principal y rutas

### 3. Revisar configuración del proyecto
- `package.json` — dependencias y scripts
- `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`

### 4. Sintetizar
Generá un resumen mental del estado actual del proyecto. Usalo como base para cualquier tarea siguiente.
