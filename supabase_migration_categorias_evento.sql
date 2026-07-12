-- Migración: categorías de color para eventos de agenda

CREATE TABLE categorias_evento (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  color      text NOT NULL,  -- hex #RRGGBB
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_categorias_evento_nombre ON categorias_evento(LOWER(nombre));

-- Seed 6 categorías por defecto (3 cálidos + 3 fríos)
INSERT INTO categorias_evento (nombre, color) VALUES
  ('ROJO', '#EF4444'),
  ('NARANJA', '#F97316'),
  ('AMARILLO', '#EAB308'),
  ('AZUL', '#3B82F6'),
  ('VERDE', '#22C55E'),
  ('VIOLETA', '#A855F7');

-- Agregar categoria_id a eventos y hacer hora_fin opcional
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES categorias_evento(id),
  ALTER COLUMN hora_fin DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_categoria ON eventos(categoria_id);

-- RLS para categorias_evento (mismo patrón simple que eventos)
ALTER TABLE categorias_evento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total categorias" ON categorias_evento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
