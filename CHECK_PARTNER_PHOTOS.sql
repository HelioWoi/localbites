-- Ver quais campos de foto existem para La Casa Beach Bar
SELECT 
    restaurant_name,
    slug,
    logo_url,
    cover_photo_url,
    photo_url,
    banner_images
FROM partners 
WHERE slug = 'la-casa-beach-bar';
