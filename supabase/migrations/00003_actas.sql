-- ============================================================
-- MIGRACIÓN: Módulo Actas
-- ============================================================

-- ============================================================
-- FUNCIÓN HELPER: Verificación de permisos para RLS
-- ============================================================
-- Busca al usuario por auth_id (vinculado a auth.uid() de Supabase Auth),
-- si es master retorna TRUE, si no consulta la tabla permisos.
-- Usa SECURITY DEFINER para evitar recursión de RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION tiene_permiso_modulo(
  p_modulo TEXT,
  p_accion TEXT,
  p_campamento_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  SELECT id INTO v_usuario_id FROM usuarios WHERE auth_id = auth.uid()::TEXT;
  IF v_usuario_id IS NULL THEN RETURN FALSE; END IF;

  IF EXISTS (SELECT 1 FROM usuarios WHERE id = v_usuario_id AND es_master = TRUE) THEN
    RETURN TRUE;
  END IF;

  IF p_campamento_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM permisos p
      JOIN modulos m ON m.id = p.modulo_id
      WHERE p.usuario_id = v_usuario_id
        AND m.nombre = p_modulo
        AND p.acciones @> ARRAY[p_accion]
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM permisos p
      JOIN modulos m ON m.id = p.modulo_id
      WHERE p.usuario_id = v_usuario_id
        AND m.nombre = p_modulo
        AND p.acciones @> ARRAY[p_accion]
        AND (p.campamentos IS NULL OR p.campamentos @> ARRAY[p_campamento_id::TEXT])
    );
  END IF;
END;
$$;

-- ============================================================

-- 1. Tabla: tipo_acta
CREATE TABLE IF NOT EXISTS tipo_acta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  plantilla JSONB NOT NULL DEFAULT '{"nombre_documento":"","campos":[],"contenido":""}',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: tipo_acta
ALTER TABLE tipo_acta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tipo_acta_select" ON tipo_acta FOR SELECT TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Ver'));

CREATE POLICY "tipo_acta_insert" ON tipo_acta FOR INSERT TO authenticated
  WITH CHECK (tiene_permiso_modulo('Actas', 'Crear'));

CREATE POLICY "tipo_acta_update" ON tipo_acta FOR UPDATE TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Modificar'))
  WITH CHECK (tiene_permiso_modulo('Actas', 'Modificar'));

CREATE POLICY "tipo_acta_delete" ON tipo_acta FOR DELETE TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Eliminar'));

-- 2. Tabla: actas
CREATE TABLE IF NOT EXISTS actas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  tipo_acta_id UUID NOT NULL REFERENCES tipo_acta(id),
  refugiado_id UUID NOT NULL REFERENCES refugiados(id),
  campamento_id UUID NOT NULL REFERENCES campamentos(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  contenido JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: actas
ALTER TABLE actas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actas_select" ON actas FOR SELECT TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Ver', campamento_id));

CREATE POLICY "actas_insert" ON actas FOR INSERT TO authenticated
  WITH CHECK (tiene_permiso_modulo('Actas', 'Crear', campamento_id));

CREATE POLICY "actas_update" ON actas FOR UPDATE TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Modificar', campamento_id))
  WITH CHECK (tiene_permiso_modulo('Actas', 'Modificar', campamento_id));

CREATE POLICY "actas_delete" ON actas FOR DELETE TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Eliminar', campamento_id));

-- 3. Tabla: contadores_actas
CREATE TABLE IF NOT EXISTS contadores_actas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id UUID NOT NULL UNIQUE REFERENCES campamentos(id),
  ultimo_secuencia INT NOT NULL DEFAULT 0
);

-- RLS: contadores_actas
ALTER TABLE contadores_actas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contadores_select" ON contadores_actas FOR SELECT TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Ver', campamento_id)
      OR tiene_permiso_modulo('Actas', 'Crear', campamento_id));

CREATE POLICY "contadores_insert" ON contadores_actas FOR INSERT TO authenticated
  WITH CHECK (tiene_permiso_modulo('Actas', 'Crear', campamento_id));

CREATE POLICY "contadores_update" ON contadores_actas FOR UPDATE TO authenticated
  USING (tiene_permiso_modulo('Actas', 'Crear', campamento_id))
  WITH CHECK (tiene_permiso_modulo('Actas', 'Crear', campamento_id));

-- 4. Insertar módulo "Actas" en modulos
INSERT INTO modulos (nombre)
SELECT 'Actas'
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Actas');

-- 5. Insertar acciones para el módulo Actas
DO $$
DECLARE
  v_modulo_id UUID;
BEGIN
  SELECT id INTO v_modulo_id FROM modulos WHERE nombre = 'Actas';

  INSERT INTO acciones (modulo_id, nombre)
  SELECT v_modulo_id, a
  FROM (VALUES ('Ver'), ('Crear'), ('Modificar'), ('Eliminar')) AS t(a)
  WHERE NOT EXISTS (
    SELECT 1 FROM acciones WHERE modulo_id = v_modulo_id AND nombre = t.a
  );
END $$;

-- 6. Seed: Tipo de Acta inicial
INSERT INTO tipo_acta (nombre, descripcion, plantilla)
SELECT
  'Acta de Notificación por Indisciplina',
  'Documento formal para notificar faltas graves contra las normas de convivencia del centro.',
  '{
    "nombre_documento": "ACTA DE NOTIFICACIÓN POR INDISCIPLINA",
    "campos": [
      {
        "clave": "descripcion_hecho",
        "etiqueta": "Descripción del hecho",
        "tipo": "textarea",
        "requerido": true,
        "placeholder": "Describa detalladamente el hecho ocurrido..."
      },
      {
        "clave": "nombre_testigo",
        "etiqueta": "Nombre y apellido del testigo",
        "tipo": "text",
        "requerido": false,
        "placeholder": "Nombre del testigo"
      },
      {
        "clave": "ci_testigo",
        "etiqueta": "Cédula de identidad del testigo",
        "tipo": "text",
        "requerido": false,
        "placeholder": "V-12345678"
      }
    ],
    "contenido": "ACTA DE NOTIFICACIÓN POR INDISCIPLINA.\n\nEn la ciudad de Caracas, a los {{fecha_actual}}, estando presentes los responsables en las instalaciones del {{nombre_campamento}} (ubicado en {{direccion_campamento}}), se procede a levantar la presente acta con el fin de dejar constancia formal del siguiente hecho: \"{{nombre_completo_integrante}}\", titular de la Cédula de Identidad: {{cedula_integrante}}, Condición: Integrante perteneciente al grupo familiar del/la ciudadano/a \"{{jefe_familia}}\", titular de la Cédula de Identidad {{cedula_jefe_familia}}.\n\nEl ciudadano antes mencionado incurrió en una falta grave contra las normas de convivencia del centro al protagonizar un acto de \"{{descripcion_hecho}}\" dentro de las áreas del establecimiento.\n\nPor medio del presente documento, se le notifica formalmente al ciudadano que la permanencia en este campamento está sujeto al cumplimiento estricto de las normas de respeto y sana convivencia.\n\nADVERTENCIA: De reincidir en conductas descritas, perderá de manera inmediata el beneficio de estadía en este centro y deberá desalojar las instalaciones.\n\nSe firma la presente acta en señal de conformidad, notificación y aceptación de los términos expuestos, a la fecha de su emisión.\n\n{{firma_notificado}}\n{{firma_jefe_familia}}\n{{firma_autoridad}}\n{{firma_testigo}}"
  }'
WHERE NOT EXISTS (
  SELECT 1 FROM tipo_acta WHERE nombre = 'Acta de Notificación por Indisciplina'
);
