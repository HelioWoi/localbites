-- SQL SIMPLIFICADO - Execute no Supabase SQL Editor

-- 1. Ver estrutura da tabela (quais colunas existem)
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;

-- 2. Ver primeiros 5 restaurantes (todas as colunas que existirem)
SELECT * FROM restaurants LIMIT 5;

-- 3. Buscar restaurante específico por nome
SELECT * FROM restaurants 
WHERE name ILIKE '%backstreet%'
LIMIT 5;
