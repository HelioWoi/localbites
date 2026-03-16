-- SQL para verificar estrutura da tabela restaurants e dados existentes
-- Execute no Supabase SQL Editor e cole o resultado aqui

-- 1. Verificar se tabela restaurants existe e sua estrutura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;

-- 2. Contar quantos restaurantes existem
SELECT COUNT(*) as total_restaurants FROM restaurants;

-- 3. Listar primeiros 5 restaurantes com todas as colunas
SELECT * FROM restaurants LIMIT 5;

-- 4. Se a coluna 'slug' não existir, verificar qual coluna tem o identificador
-- (pode ser 'name', 'google_place_id', ou outro campo)
SELECT 
    id,
    name,
    google_place_id,
    profile_image_url,
    created_at
FROM restaurants 
LIMIT 5;

-- 5. Verificar se existe alguma coluna que contenha 'backstreet-cafe'
-- (execute este SELECT para cada coluna de texto da tabela)
SELECT * FROM restaurants 
WHERE 
    name ILIKE '%backstreet%' OR
    google_place_id ILIKE '%backstreet%'
LIMIT 5;
