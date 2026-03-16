-- SQL para adicionar coluna slug e popular com slugs gerados
-- Execute no Supabase SQL Editor

-- 1. Adicionar coluna slug
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Remover função antiga se existir e criar nova
DROP FUNCTION IF EXISTS generate_slug(TEXT);

CREATE FUNCTION generate_slug(input_name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(input_name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Popular slugs para restaurantes existentes
UPDATE restaurants 
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- 4. Criar índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

-- 5. Verificar resultado
SELECT id, name, slug, main_photo_url 
FROM restaurants 
LIMIT 10;

-- 6. Buscar restaurante específico por slug
SELECT * FROM restaurants 
WHERE slug = 'backstreet-cafe';
