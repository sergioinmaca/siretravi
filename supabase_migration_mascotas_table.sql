-- ================================================
-- SIRETRAVI - Migración: Tabla independiente de Mascotas
-- Crea la tabla mascotas con relación 1:N a refugiados
-- y migra los datos existentes desde refugiados
-- ================================================

CREATE TABLE IF NOT EXISTS mascotas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refugiado_id  UUID NOT NULL REFERENCES refugiados(id) ON DELETE CASCADE,
  tipo          TEXT,
  sexo          BOOLEAN,           -- true = Macho, false = Hembra
  raza          TEXT,
  nombre        TEXT,
  edad          INTEGER,
  foto_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mascotas_refugiado ON mascotas(refugiado_id);

ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_mascotas" ON mascotas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migrar datos existentes: cada refugiado con mascota=true crea un registro
INSERT INTO mascotas (refugiado_id, tipo, sexo, raza, nombre, edad, foto_url)
SELECT
  id,
  tipo_mascota,
  mascota_sexo,
  mascota_raza,
  mascota_nombre,
  mascota_edad,
  mascota_foto_url
FROM refugiados
WHERE mascotas = true
  AND NOT EXISTS (
    SELECT 1 FROM mascotas WHERE mascotas.refugiado_id = refugiados.id
  );
