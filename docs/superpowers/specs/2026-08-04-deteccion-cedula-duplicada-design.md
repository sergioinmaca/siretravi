# Detección de cédula duplicada entre campamentos

**Fecha:** 2026-08-04
**Ámbito:** `src/components/refugiados/RegistroModal.tsx` + `src/hooks/useVerificarCedula.ts`

---

## 1. Contexto

Actualmente no existe ninguna validación de cédula duplicada. Una misma persona puede ser registrada en múltiples campamentos sin que el sistema lo detecte. Otros entes detectan estas duplicidades manualmente revisando cédulas, pero es ineficiente.

## 2. Comportamiento deseado

Al registrar un **nuevo** integrante, al salir del campo cédula (`onBlur`) el sistema verifica en tiempo real si esa cédula ya existe en algún campamento (excluyendo registros con estatus `RETIRADO`). Si existe, se bloquea el registro mostrando el nombre del campamento donde ya está registrado.

### 2.1 Reglas

| Regla | Descripción |
|---|---|
| Solo al crear | La verificación aplica únicamente al crear un nuevo integrante. No aplica en edición. |
| Solo cédula | La detección es exclusivamente por número de cédula (no por nombres, apellidos, ni fecha de nacimiento). |
| Cédula vacía | Si el campo está vacío, no se ejecuta verificación. |
| Excluir RETIRADO | Los registros con `hogar_solidario = 'RETIRADO'` se ignoran, permitiendo el registro de personas transferidas entre campamentos. |
| Todos los campamentos | La búsqueda abarca todos los campamentos del sistema (incluyendo el actual). |

### 2.2 Estados visuales del campo

| Estado | Ícono | Mensaje | Botón Guardar |
|---|---|---|---|
| Vacío (`idle`) | Nada | Nada | Habilitado |
| Verificando | Spinner animado | Nada | Habilitado |
| Válido | ✓ verde | Nada | Habilitado |
| Duplicado | ✗ rojo | "⚠ Esta cédula ya está registrada en {campamento}" | **Deshabilitado** |

### 2.3 Flujo de interacción

1. Usuario escribe cédula y sale del campo (`onBlur`)
2. Aparece spinner al lado del campo mientras se consulta Supabase
3. **Sin coincidencia** → spinner se reemplaza por ✓ verde
4. **Con coincidencia** → spinner se reemplaza por ✗ rojo + mensaje de error en rojo debajo del campo con fuente legible. Botón Guardar deshabilitado
5. Si el usuario borra o modifica la cédula → íconos y error se limpian, Guardar se rehabilita, y al salir del campo se vuelve a verificar

---

## 3. Implementación

### 3.1 Archivo nuevo: `src/hooks/useVerificarCedula.ts`

Custom hook que encapsula toda la lógica de verificación:

```typescript
function useVerificarCedula() {
  const { campamentos } = useCampamento();
  const [estado, setEstado] = useState<'idle' | 'verificando' | 'valido' | 'duplicado'>('idle');
  const [nombreCampamento, setNombreCampamento] = useState<string | null>(null);

  const verificar = async (cedula: string) => {
    if (!cedula.trim()) { setEstado('idle'); return; }
    setEstado('verificando');
    try {
      const { data } = await supabase
        .from('refugiados')
        .select('campamento_id')
        .eq('cedula', parseInt(cedula))
        .or('hogar_solidario.is.null,hogar_solidario.neq.RETIRADO')
        .limit(1)
        .maybeSingle();
      if (data) {
        const camp = campamentos.find(c => c.id === data.campamento_id);
        setNombreCampamento(camp?.nombre || 'otro campamento');
        setEstado('duplicado');
      } else {
        setEstado('valido');
      }
    } catch {
      setEstado('idle');
    }
  };

  const reset = () => { setEstado('idle'); setNombreCampamento(null); };

  return { estado, nombreCampamento, verificar, reset };
}
```

**Dependencias del hook:**
- `supabase`: importado directamente de `src/lib/supabase.ts`
- `useCampamento()`: para obtener el array de `campamentos` y buscar el nombre desde el `campamento_id` retornado por la query

### 3.2 Modificación: `src/components/refugiados/RegistroModal.tsx`

#### 3.2.1 Integración del hook

```tsx
const { estado, nombreCampamento, verificar, reset } = useVerificarCedula();
```

#### 3.2.2 Campo cédula

- `onBlur`: llama a `verificar(cedulaValue)`
- `onChange`: llama a `reset()` para limpiar el estado al modificar el valor

#### 3.2.3 Íconos de estado

```tsx
<div className="relative">
  <input ... onBlur={...} onChange={...} />
  {estado === 'verificando' && <SpinnerIcon />}
  {estado === 'valido' && <CheckIcon />}
  {estado === 'duplicado' && <XIcon />}
</div>
{estado === 'duplicado' && (
  <p className="text-red-600 text-sm mt-1">
    ⚠ Esta cédula ya está registrada en "{nombreCampamento}"
  </p>
)}
```

#### 3.2.4 Botón Guardar

Agregar condición al `disabled`:

```tsx
disabled={... || estado === 'verificando' || estado === 'duplicado'}
```

### 3.3 Query a Supabase

```sql
SELECT campamento_id FROM refugiados
WHERE cedula = <valor>
AND (hogar_solidario IS NULL OR hogar_solidario != 'RETIRADO')
LIMIT 1
```

Equivalente en Supabase JS:
```typescript
supabase
  .from('refugiados')
  .select('campamento_id')
  .eq('cedula', cedulaNumero)
  .or('hogar_solidario.is.null,hogar_solidario.neq.RETIRADO')
  .limit(1)
  .maybeSingle()
```

### 3.4 Manejo de errores

| Escenario | Comportamiento |
|---|---|
| Error de red / Supabase caído | `catch` silencioso, estado vuelve a `idle`. No bloquea al usuario. |
| Cédula vacía o solo espacios | No se ejecuta query, estado queda `idle` |
| Múltiples matches (misma cédula, distintos campamentos) | Se muestra el nombre del primer campamento encontrado. Este caso no debería ocurrir si los datos están limpios; el script de diagnóstico en la sección 4 permite verificarlo. |
| Cédula no numérica | `parseInt` la convierte; si es NaN el `eq` no matchea nada, resultado válido. |

---

## 4. Script de diagnóstico

Para verificar que no existan cédulas duplicadas activas en producción:

```sql
SELECT 
  r.cedula,
  r.nombres,
  r.apellidos,
  r.hogar_solidario,
  c.nombre AS campamento
FROM refugiados r
JOIN campamentos c ON c.id = r.campamento_id
WHERE r.cedula IN (
  SELECT cedula
  FROM refugiados
  WHERE cedula IS NOT NULL
    AND (hogar_solidario IS NULL OR hogar_solidario != 'RETIRADO')
  GROUP BY cedula
  HAVING COUNT(*) > 1
)
ORDER BY r.cedula, c.nombre;
```

---

## 5. Casos de prueba

| # | Caso | Esperado |
|---|---|---|
| 1 | Cédula nueva, sin duplicado activo | ✓ verde, Guardar habilitado |
| 2 | Cédula ya registrada (PRESENTE) | ✗ rojo + mensaje con nombre del campamento, Guardar deshabilitado |
| 3 | Cédula ya registrada (HOGAR SOLIDARIO) | ✗ rojo + mensaje, Guardar deshabilitado |
| 4 | Cédula ya registrada pero RETIRADO | ✓ verde, Guardar habilitado |
| 5 | Cédula vacía | Sin ícono, sin mensaje, Guardar habilitado |
| 6 | Error de red | Vuelve a idle, sin bloquear |
| 7 | Borrar cédula después de duplicado | Ícono y error desaparecen, Guardar rehabilitado |
| 8 | Cambiar cédula después de válido | Reset y nueva verificación en el siguiente blur |

---

## 6. Archivos afectados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/hooks/useVerificarCedula.ts` | Nuevo | Custom hook con lógica de verificación |
| `src/components/refugiados/RegistroModal.tsx` | Modificado | Integrar hook, estados visuales, deshabilitar Guardar |

**No se modifican:**
- `CampamentoContext.tsx`
- `src/types/index.ts`
- Base de datos (sin migraciones)
