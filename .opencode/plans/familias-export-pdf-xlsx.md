# Plan: Exportar PDF y XLSX en Módulo Familias

## Archivo: `src/pages/Familias.tsx`

### 1. Nuevos imports (reemplazar línea 1-6)
```ts
import { useState, useMemo, useCallback } from 'react';
import { Users, Search, ChevronRight, ShieldOff, Trash2, FileDown, Loader2 } from 'lucide-react';
import { useCampamento } from '../context/CampamentoContext';
import { useAuth } from '../context/AuthContext';
import DetalleFamiliaModal from '../components/familias/DetalleFamiliaModal';
import type { Familia } from '../types';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { formatCedula } from '../lib/formatCedula';
```

### 2. Nuevos estados (después de línea 27)
```ts
const [exportandoPDF, setExportandoPDF] = useState(false);
const [exportandoXLSX, setExportandoXLSX] = useState(false);
```

### 3. Función `handleExportPDF`
Por cada familia del campamento:
- Obtener miembros: `refugiados.filter(r => r.familia_id === familia.id)`
- Ordenar: jefe primero, resto por `codigo`
- Dibujar título: `"Familia: {nombre}"` en bold 12pt
- Dibujar tabla con columnas: Código(22mm) | Nombres y Apellidos(42mm) | Cédula(22mm) | Sexo(14mm) | Nro Cama(22mm) | Parentesco(28mm)
- Gap de 6mm entre familias
- Paginación automática
- Numeración de páginas

### 4. Función `handleExportXLSX`
Usando `XLSX.utils.aoa_to_sheet()`:
- Por cada familia:
  - Fila título: `["Familia: {nombre}"]`
  - Fila encabezados: `["Código", "Nombres y Apellidos", "Cédula", "Sexo", "Nro Cama", "Parentesco"]`
  - Filas de datos por miembro (jefe primero)
  - Fila vacía separadora
- Merge de celdas en filas título (`!merges`)
- Anchos de columna (`!cols`)

### 5. Botones en cabecera
Dos botones en la parte superior derecha (dentro del div header existente, después del texto de título):
- **Exportar PDF**: rojo `bg-caracas-red`, ícono `FileDown`
- **Exportar XLSX**: verde `bg-green-600`, ícono `FileDown`
- Solo visibles cuando `campamentoSeleccionado` existe
- Mismo estilo que los botones en `Refugiados.tsx`
