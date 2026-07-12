# Contexto del Proyecto: SIRETRAVI (Red de Campamentos Transitorios)

## 1. Descripción General
El sistema (Sistema de Registro Transitorio Ávila - SIRETRAVI) es una aplicación web escalable diseñada para registrar, gestionar y mostrar la información de las personas que se encuentran físicamente albergadas en una **red de campamentos/refugios transitorios** tras el terremoto ocurrido el 24 de junio de 2026. Inicialmente concebido para un solo refugio, ahora gestiona múltiples sedes simultáneamente.

## 2. Stack Tecnológico
*   **Frontend:** React con Vite.
*   **Estilos:** CSS / Tailwind CSS. Se debe adaptar estrictamente a la paleta de colores institucional de la Alcaldía de Caracas (tomando como base la bandera oficial que se encuentra en la carpeta del proyecto).
*   **Hosting y Autenticación:** Firebase (para despliegue del frontend).
*   **Backend y Base de Datos:** Base de datos relacional almacenada y gestionada a través de Supabase (PostgreSQL), similar al stack utilizado en la "app zentra".

## 3. Modelo de Datos Principal

### 3.1. Entidad: Campamento (Refugio)
*   **ID:** Identificador único.
*   **Nombre:** Texto (Ej. "Campamento Ávila", "Campamento La Guaira").
*   **Ubicación:** Texto (Dirección física).
*   **Capacidad Máxima:** Numérico (Camas disponibles totales).
*   **Estado:** Activo / Inactivo.

### 3.2. Entidad: Refugiado (Persona)
*   **ID_Campamento:** Vinculación al campamento donde está alojado.
*   **Nombres:** Texto.
*   **Apellidos:** Texto.
*   **Cédula:** Número (Opcional, dado que hay niños que aún no tienen documento de identidad).
*   **Género:** Booleano (Masculino / Femenino).
*   **Fecha de Nacimiento:** Tipo `Date`.
*   **Edad:** Campo numérico modificable. Su *placeholder* mostrará el resultado del cálculo automático en base a la Fecha de Nacimiento.
*   **Jerarquía Familiar:** Selección simple (Casillas con checkmarks).
    *   *Opción 1: Jefe de Familia.* Al seleccionarse, el sistema creará automáticamente un grupo familiar nuevo, cuyo nombre será el nombre completo de la persona registrada.
    *   *Opción 2: Pertenece a una familia.* Al seleccionarse, se mostrará un campo adicional tipo lista desplegable (dropdown) que permitirá seleccionar a cuál de las familias existentes pertenece.
*   **Nro de Cama:** Campo numérico de 3 dígitos (desde el `001` al `999`). **Importante:** El sistema permitirá múltiples asignaciones para la misma cama (ej. dos hermanos en una sola cama), sin lanzar error de ocupación.
*   **Procedencia:** Texto. Referencia breve de la dirección donde residía antes del terremoto.

### 3.3. Entidad: Familia
*   **ID_Campamento:** Vinculación al campamento.
*   **Nombre de la Familia:** Texto (Ej. "Juan Pérez").
*   **Integrantes:** Relación de los refugiados vinculados a esta familia.

## 4. Distribución Física del Refugio (Constructor)
La unidad mínima de ocupación es la **Cama**. La distribución está supeditada al **Campamento** seleccionado en el sistema:
*   Por ejemplo, el Campamento Ávila tiene **1 Carpa grande** instalada, con proyección a armar dos (2) carpas más. La carpa inicial contiene **110 literas**, lo que equivale a **220 camas**.
*   **Módulo Constructor:** Permitirá mapear esta realidad física al sistema por cada campamento. Se podrán crear carpas, asignar números de camas y moverlas espacialmente de acuerdo a la distribución real de cada sede.

## 5. Módulos de la Aplicación (Sidebar)
La aplicación web contará con un **sidebar retráctil** que incluirá los siguientes módulos. Además, el **Header (Cabecera)** incluirá un Dropdown global para seleccionar el Campamento en el que se desea operar.

1.  **Inicio (Dashboard):** 
    *   Gráficas, indicadores y estadísticas filtradas por el campamento actual.
    *   **Croquis interactivo:** Visualización espacial de la distribución de personas en el campamento seleccionado.
2.  **Refugiados:** Interfaz principal (Tabla y Modal) para la visualización y registro de los damnificados (se asignarán al campamento seleccionado en el Header).
3.  **Constructor:** Herramienta administrativa para gestionar las carpas/camas del campamento seleccionado.
4.  **Reportes:** Módulo para la extracción y consulta de métricas.
5.  **Usuarios:** Gestión de cuentas, permisos y roles de los operadores del sistema. *(Pendiente: Implementar sistema de Autenticación/Login una vez que se completen los módulos y bocetos principales).*

## 6. Diseño UI/UX
*   Interfaces modernas, estéticas y altamente interactivas, transmitiendo un nivel "Premium".
*   Inclusión de micro-animaciones, manejo de estados (hover, focus), y adaptabilidad.
*   Panel lateral (Sidebar) retráctil y fluido.
*   Selector de Campamentos (Dropdown) prominente y claro en la barra de navegación superior.
*   *Nota sobre colores:* El diseño utiliza la paleta de colores oficial de la Alcaldía de Caracas.
