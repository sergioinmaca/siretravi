-- Migración: Módulo General — campamentos incluidos en el totalizador
-- Ejecutar en el SQL Editor de Supabase

-- 1. Columna para marcar qué campamentos cuentan en el módulo GENERAL
ALTER TABLE campamentos
  ADD COLUMN IF NOT EXISTS incluir_en_general BOOLEAN NOT NULL DEFAULT true;

-- 2. Módulo General y su acción Ver
INSERT INTO modulos (nombre) VALUES ('General') ON CONFLICT (nombre) DO NOTHING;

DO $$
DECLARE
  v_general_id UUID;
BEGIN
  SELECT id INTO v_general_id FROM modulos WHERE nombre = 'General';
  INSERT INTO acciones (modulo_id, nombre) VALUES (v_general_id, 'Ver')
  ON CONFLICT DO NOTHING;
END $$;
