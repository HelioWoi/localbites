-- SQL para verificar estrutura da tabela partners (onde estão os restaurantes reais)
-- Execute no Supabase SQL Editor

-- 1. Ver estrutura da tabela partners
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'partners'
ORDER BY ordinal_position;

-- 2. Ver primeiros 5 partners
SELECT * FROM partners LIMIT 5;

-- 3. Buscar partner específico
SELECT * FROM partners 
WHERE name ILIKE '%backstreet%'
LIMIT 5;
