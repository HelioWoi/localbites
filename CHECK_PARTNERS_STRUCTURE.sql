-- Ver apenas estrutura da tabela partners
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'partners'
ORDER BY ordinal_position;
