-- Migración: campo bebida en cocina_menu (Módulo Cocina)
-- Ejecutar en el SQL Editor de Supabase
-- NOT NULL DEFAULT '' permite conservar las comidas existentes;
-- la obligatoriedad se valida en la aplicación.

ALTER TABLE cocina_menu ADD COLUMN IF NOT EXISTS bebida TEXT NOT NULL DEFAULT '';
