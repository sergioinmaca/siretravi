-- ================================================
-- SIRETRAVI - Migración: Contador atómico + Constraints de integridad
-- Ejecutar en el SQL Editor de Supabase
-- ================================================

-- 1. UNIQUE en campamento_contadores (necesario para el ON CONFLICT de la RPC)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_campamento_contadores_campamento_id'
  ) THEN
    ALTER TABLE campamento_contadores
      ADD CONSTRAINT uq_campamento_contadores_campamento_id UNIQUE (campamento_id);
  END IF;
END $$;

-- 2. UNIQUE en familias(campamento_id, nombre) — evita duplicados bajo concurrencia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_familias_campamento_nombre'
  ) THEN
    ALTER TABLE familias
      ADD CONSTRAINT uq_familias_campamento_nombre UNIQUE (campamento_id, nombre);
  END IF;
END $$;

-- 3. UNIQUE en refugiados(codigo) — red de seguridad contra códigos duplicados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_refugiados_codigo'
  ) THEN
    ALTER TABLE refugiados
      ADD CONSTRAINT uq_refugiados_codigo UNIQUE (codigo);
  END IF;
END $$;

-- 4. RPC atómica para generar código secuencial de refugiado
--    Usa INSERT ... ON CONFLICT ... DO UPDATE para incremento atómico a nivel de fila.
--    Dos usuarios concurrentes nunca obtendrán el mismo código.
CREATE OR REPLACE FUNCTION obtener_siguiente_codigo(p_campamento_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefijo TEXT;
  v_secuencia INT;
BEGIN
  SELECT UPPER(LEFT(REGEXP_REPLACE(nombre, '\s+', '', 'g'), 3))
  INTO v_prefijo
  FROM campamentos
  WHERE id = p_campamento_id;

  IF v_prefijo IS NULL THEN
    v_prefijo := 'CAM';
  END IF;

  INSERT INTO campamento_contadores (campamento_id, ultimo_secuencia)
  VALUES (p_campamento_id, 1)
  ON CONFLICT (campamento_id)
  DO UPDATE SET ultimo_secuencia = campamento_contadores.ultimo_secuencia + 1
  RETURNING ultimo_secuencia INTO v_secuencia;

  RETURN v_prefijo || '-' || LPAD(v_secuencia::TEXT, 4, '0');
END $$;
