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

-- 4. Columna prefijo en campamento_contadores (persiste el prefijo por campamento)
ALTER TABLE campamento_contadores
  ADD COLUMN IF NOT EXISTS prefijo TEXT;

-- 5. RPC atómica para generar código secuencial de refugiado
--    - El prefijo se calcula UNA SOLA VEZ a partir de las iniciales de las
--      palabras significativas del nombre del campamento y se persiste en
--      campamento_contadores. Esto garantiza que campamentos distintos que
--      comparten las mismas primeras letras (ej. todos los "CAMPAMENTO...")
--      reciban prefijos únicos y no colisionen con el UNIQUE de refugiados(codigo).
--    - Dos usuarios concurrentes nunca obtendrán el mismo código.
CREATE OR REPLACE FUNCTION obtener_siguiente_codigo(p_campamento_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefijo   TEXT;
  v_secuencia INT;
  v_nombre    TEXT;
  v_iniciales TEXT;
  v_palabras  TEXT[];
  v_palabra   TEXT;
  -- Palabras vacías a ignorar al calcular iniciales
  v_ignorar   TEXT[] := ARRAY['DE','DEL','LA','LAS','LOS','EL','Y','E','EN','A','AL','UN','UNA','POR','CON','SIN','PARA'];
  v_sufijo    INT;
  v_existe    BOOLEAN;
BEGIN
  -- ① Usar el prefijo ya persistido para este campamento (camino rápido)
  SELECT prefijo INTO v_prefijo
  FROM campamento_contadores
  WHERE campamento_id = p_campamento_id;

  -- ② Calcular y persistir prefijo la primera vez (campamento nuevo)
  IF v_prefijo IS NULL THEN
    SELECT nombre INTO v_nombre FROM campamentos WHERE id = p_campamento_id;
    v_nombre    := COALESCE(v_nombre, 'CAMPAMENTO');
    v_iniciales := '';

    -- Extraer iniciales de palabras significativas
    v_palabras := regexp_split_to_array(UPPER(v_nombre), '[\s\-]+');
    FOREACH v_palabra IN ARRAY v_palabras LOOP
      v_palabra := REGEXP_REPLACE(v_palabra, '[^A-Z0-9ÁÉÍÓÚÜÑ]', '', 'g');
      IF v_palabra <> '' AND NOT (v_palabra = ANY(v_ignorar)) THEN
        v_iniciales := v_iniciales || LEFT(v_palabra, 1);
      END IF;
    END LOOP;

    -- Fallback si el resultado es demasiado corto
    IF LENGTH(v_iniciales) < 3 THEN
      v_iniciales := UPPER(LEFT(REGEXP_REPLACE(v_nombre, '[^A-Z0-9ÁÉÍÓÚÜÑ]', '', 'gi'), 6));
    END IF;

    v_prefijo := LEFT(v_iniciales, 6);
    v_sufijo  := 2;

    -- Garantizar unicidad del prefijo entre todos los campamentos
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM campamento_contadores
        WHERE prefijo = v_prefijo
          AND campamento_id <> p_campamento_id
      ) INTO v_existe;
      EXIT WHEN NOT v_existe;
      v_prefijo := LEFT(LEFT(v_iniciales, 5), 5) || v_sufijo::TEXT;
      v_sufijo  := v_sufijo + 1;
    END LOOP;
  END IF;

  -- ③ Incremento atómico; guarda el prefijo si la fila es nueva
  INSERT INTO campamento_contadores (campamento_id, ultimo_secuencia, prefijo)
  VALUES (p_campamento_id, 1, v_prefijo)
  ON CONFLICT (campamento_id)
  DO UPDATE SET
    ultimo_secuencia = campamento_contadores.ultimo_secuencia + 1,
    prefijo = COALESCE(campamento_contadores.prefijo, EXCLUDED.prefijo)
  RETURNING ultimo_secuencia INTO v_secuencia;

  RETURN v_prefijo || '-' || LPAD(v_secuencia::TEXT, 4, '0');
END $$;
