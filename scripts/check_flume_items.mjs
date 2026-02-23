import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== VERIFICANDO ITENS DO FLUME BY THE RIVER ===\n');

// Buscar partner Flume
const { data: partner, error: partnerError } = await supabase
  .from('partners')
  .select('*')
  .eq('slug', 'flume-by-the-river')
  .maybeSingle();

if (partnerError) {
  console.error('Erro ao buscar partner:', partnerError);
  process.exit(1);
}

if (!partner) {
  console.log('Partner Flume by the River não encontrado');
  process.exit(1);
}

console.log('✅ Partner encontrado:');
console.log('   ID:', partner.id);
console.log('   Nome:', partner.restaurant_name);
console.log('   Slug:', partner.slug);
console.log('');

// Buscar TODOS os itens (incluindo deletados)
const { data: allItems, error: itemsError } = await supabase
  .from('menu_items')
  .select('*')
  .eq('partner_id', partner.id)
  .order('created_at', { ascending: false });

if (itemsError) {
  console.error('Erro ao buscar items:', itemsError);
  process.exit(1);
}

console.log(`📋 Total de itens no banco: ${allItems.length}\n`);

const activeItems = allItems.filter(i => !i.deleted_at);
const deletedItems = allItems.filter(i => i.deleted_at);

console.log(`✅ Itens ATIVOS: ${activeItems.length}`);
console.log(`🗑️  Itens DELETADOS: ${deletedItems.length}\n`);

console.log('=== ITENS ATIVOS (aparecem no profile) ===\n');
activeItems.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name}`);
  console.log(`   ID: ${item.id}`);
  console.log(`   Categoria: ${item.category}`);
  console.log(`   Vídeo: ${item.video_url ? 'SIM' : 'NÃO'}`);
  console.log(`   Foto: ${item.photo_url ? 'SIM' : 'NÃO'}`);
  if (item.video_url) {
    console.log(`   URL do vídeo: ${item.video_url.substring(0, 80)}...`);
  }
  console.log('');
});

if (deletedItems.length > 0) {
  console.log('\n=== ITENS DELETADOS (NÃO aparecem no profile) ===\n');
  deletedItems.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}`);
    console.log(`   ID: ${item.id}`);
    console.log(`   Deletado em: ${item.deleted_at}`);
    console.log('');
  });
}

// Verificar se há vídeo com tela preta (vídeo vazio ou corrompido)
console.log('\n=== VERIFICANDO VÍDEOS PROBLEMÁTICOS ===\n');
const itemsWithVideo = activeItems.filter(i => i.video_url && i.video_url !== '');
console.log(`Total de itens com vídeo: ${itemsWithVideo.length}\n`);

itemsWithVideo.forEach(item => {
  console.log(`📹 ${item.name}`);
  console.log(`   Vídeo URL: ${item.video_url}`);
  console.log('');
});
