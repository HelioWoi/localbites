-- Script para corrigir URLs de vídeos manualmente
-- Os arquivos existem no Storage mas com nomes diferentes do banco

-- PASSO 1: Ver as URLs atuais no banco
SELECT 
  id,
  name,
  video_url,
  SUBSTRING(video_url FROM 'menu-videos/[^/]+/(.+)$') as filename
FROM menu_items
WHERE partner_id = '39701cb9-cb5d-44e2-9d7e-a4b5a92af6af'
ORDER BY created_at DESC;

-- PASSO 2: Atualizar URLs manualmente
-- Você precisa pegar o nome EXATO do arquivo no Storage e atualizar aqui

-- EXEMPLO de como atualizar (substitua pelos nomes reais):
-- UPDATE menu_items 
-- SET video_url = 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/menu-videos/39701cb9-cb5d-44e2-9d7e-a4b5a92af6af/1770175249672-Taco__bou...'
-- WHERE id = 'ID_DO_ITEM';

-- PASSO 3: Verificar se funcionou
SELECT name, video_url 
FROM menu_items 
WHERE partner_id = '39701cb9-cb5d-44e2-9d7e-a4b5a92af6af'
LIMIT 5;
