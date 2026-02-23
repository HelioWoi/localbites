import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== DEBUGGING PARTNER AUTHENTICATION ===\n');

// 1. Buscar partner com email flumedining@gmail.com
console.log('1. Buscando partner com email flumedining@gmail.com...');
const { data: flumePartner, error: flumeError } = await supabase
  .from('partners')
  .select('*')
  .eq('email', 'flumedining@gmail.com')
  .maybeSingle();

if (flumeError) {
  console.error('❌ Erro ao buscar Flume:', flumeError);
} else if (!flumePartner) {
  console.log('⚠️  Nenhum partner encontrado com email flumedining@gmail.com');
} else {
  console.log('✅ Partner encontrado:');
  console.log('   ID:', flumePartner.id);
  console.log('   Email:', flumePartner.email);
  console.log('   Restaurant:', flumePartner.restaurant_name);
  console.log('   Slug:', flumePartner.slug);
}

console.log('\n2. Buscando partner BackstreetCafe...');
const { data: backstreetPartner, error: backstreetError } = await supabase
  .from('partners')
  .select('*')
  .ilike('restaurant_name', '%backstreet%')
  .maybeSingle();

if (backstreetError) {
  console.error('❌ Erro ao buscar Backstreet:', backstreetError);
} else if (!backstreetPartner) {
  console.log('⚠️  Nenhum partner encontrado com nome Backstreet');
} else {
  console.log('✅ Partner encontrado:');
  console.log('   ID:', backstreetPartner.id);
  console.log('   Email:', backstreetPartner.email);
  console.log('   Restaurant:', backstreetPartner.restaurant_name);
  console.log('   Slug:', backstreetPartner.slug);
}

console.log('\n3. Verificando se os IDs são iguais...');
if (flumePartner && backstreetPartner) {
  if (flumePartner.id === backstreetPartner.id) {
    console.log('🔴 PROBLEMA ENCONTRADO: Ambos têm o MESMO ID!');
    console.log('   Isso significa que o mesmo user ID está associado a dois restaurantes diferentes.');
    console.log('   ID compartilhado:', flumePartner.id);
  } else {
    console.log('✅ IDs diferentes (correto)');
    console.log('   Flume ID:', flumePartner.id);
    console.log('   Backstreet ID:', backstreetPartner.id);
  }
}

console.log('\n4. Listando TODOS os partners cadastrados...');
const { data: allPartners, error: allError } = await supabase
  .from('partners')
  .select('id, email, restaurant_name, slug')
  .order('created_at', { ascending: false });

if (allError) {
  console.error('❌ Erro ao listar partners:', allError);
} else {
  console.log(`\n📋 Total de ${allPartners.length} partners cadastrados:\n`);
  allPartners.forEach((p, i) => {
    console.log(`${i + 1}. ${p.restaurant_name || '(sem nome)'}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Email: ${p.email}`);
    console.log(`   Slug: ${p.slug || '(sem slug)'}`);
    console.log('');
  });
}

console.log('\n5. Verificando usuários no Auth...');
// Note: Não podemos listar users do Auth com anon key, mas podemos verificar se há duplicatas na tabela partners
const { data: duplicateEmails } = await supabase
  .from('partners')
  .select('email')
  .eq('email', 'flumedining@gmail.com');

if (duplicateEmails && duplicateEmails.length > 1) {
  console.log('🔴 PROBLEMA: Email flumedining@gmail.com aparece', duplicateEmails.length, 'vezes na tabela partners!');
} else if (duplicateEmails && duplicateEmails.length === 1) {
  console.log('✅ Email flumedining@gmail.com aparece apenas 1 vez (correto)');
} else {
  console.log('⚠️  Email flumedining@gmail.com não encontrado na tabela partners');
}

console.log('\n=== FIM DO DEBUG ===');
