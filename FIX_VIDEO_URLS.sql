-- Script para verificar e corrigir URLs de vídeos
-- Execute no Supabase SQL Editor

-- 1. Ver todos os menu_items do partner Helio's Bar
SELECT 
  id,
  name,
  video_url,
  LENGTH(video_url) as url_length,
  partner_id
FROM menu_items
WHERE partner_id = '39701cb9-cb5d-44e2-9d7e-a4b5a92af6af'
ORDER BY created_at DESC;

-- 2. Verificar se as URLs estão corretas
-- URLs corretas devem seguir o formato:
-- https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/menu-videos/PARTNER_ID/FILENAME

-- 3. Se as URLs estiverem quebradas, você pode tentar acessar diretamente:
-- Vá em: https://supabase.com/dashboard/project/quybuvapflnzcaedjbkl/storage/buckets/menu-videos
-- Navegue até: 39701cb9-cb5d-44e2-9d7e-a4b5a92af6af
-- Clique em cada vídeo e copie a URL pública
-- Atualize manualmente se necessário

-- 4. SOLUÇÃO ALTERNATIVA - Regenerar URLs públicas
-- Se você tiver acesso aos nomes dos arquivos, pode gerar URLs assim:
-- https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/menu-videos/39701cb9-cb5d-44e2-9d7e-a4b5a92af6af/NOME_DO_ARQUIVO

-- 5. Teste uma URL manualmente:
-- Pegue um nome de arquivo do Storage e teste:
-- https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/menu-videos/39701cb9-cb5d-44e2-9d7e-a4b5a92af6af/1770192062170-SaveClip.App_AQPUpC9185dhvZvcLboeXl3QJ_NRCg6_STUsrR08cDw_dq_Y_qEqgntQ_Tjj1JBfp__dF2bcuTf2kihUbW_3NvzFVeEyAVfcj1WL3fA.mov
