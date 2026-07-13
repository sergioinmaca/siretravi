# Plan: Botón "Ver Ficha" en tabla Refugiados

## Archivos a modificar/crear:

### 1. Nuevo componente: `src/components/refugiados/FichaRefugiadoModal.tsx`

Modal de solo-lectura inspirado en `DetalleFamiliaModal.tsx`, con las siguientes tarjetas/secciones:

| Tarjeta | Campos a mostrar |
|---|---|
| **Datos Personales** | Código, Cédula, Nombres, Apellidos, Género, Fecha Nacimiento, Edad, Teléfono, Profesión, Nivel Educativo |
| **Información Familiar** | Jerarquía (Jefe/Miembro), Nombre de Familia, Parentesco |
| **Ubicación y Procedencia** | Nro Cama, Procedencia, Dirección Exacta, Fecha Ingreso |
| **Situación Socioeconómica** (solo si es jefe) | Condición vivienda, Tenencia, Ingreso familiar |
| **Información Adicional** | Badges visuales: Discapacidad, Alergias, Enf. Crónica, Lesión Sismo, Adulto Mayor, Lactante, Embarazo (+semanas), Mascotas (+tipo, raza, nombre, edad, sexo) |
| **Vestimenta** | Talla Camisa, Talla Pantalón, Talla Zapatos |

### 2. Modificar: `src/pages/Refugiados.tsx`

- Importar `FichaRefugiadoModal`
- Añadir estado `fichaRefugiado` y handlers `openFicha`/`closeFicha`
- Añadir botón **"Ver Ficha"** (con icono `Eye`) al menú desplegable de Acciones (entre Modificar y Eliminar)
- Renderizar el modal al final del JSX

## Estilo y comportamiento:

- Misma estructura visual del modal Ficha Familiar (overlay con blur, header con título, body scrollable, footer con Cerrar)
- Datos mostrados en modo visual/display (no inputs)
- Labels con iconos siguiendo la paleta institucional
