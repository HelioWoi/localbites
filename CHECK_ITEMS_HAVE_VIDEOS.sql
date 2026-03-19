-- Verificar se os top items TÊM video_url
-- Rode isso para ver quais items aparecem no analytics

SELECT 
  m.id,
  m.name,
  m.video_url,
  m.photo_url,
  CASE 
    WHEN m.video_url IS NOT NULL THEN 'Has video'
    WHEN m.photo_url IS NOT NULL THEN 'Has photo only'
    ELSE 'No media'
  END as media_status
FROM menu_items m
WHERE m.partner_id = 'e99bcb00-1a8d-42c7-b948-77842cd50e97' -- La Casa Beach Bar
  AND m.deleted_at IS NULL
ORDER BY m.created_at DESC
LIMIT 10;
