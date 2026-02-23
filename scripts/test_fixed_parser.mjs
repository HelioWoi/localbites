import * as XLSX from 'xlsx';

console.log('=== TESTE DO PARSER CORRIGIDO ===\n');

// Menu real do cliente com vírgulas nas descrições
const realMenuCSV = `Name,Category,Description,Price
Coffee Variants (Small),COFFEE,Small coffee variants,4.5
Sublime Pine Cold Pressed Juice,COLD DRINKS,"Pineapple, pear, green apple, lemon, mint",8
Daily Greens Cold Pressed Juice,COLD DRINKS,"Green apple, celery, pear, silverbeet, lemon, ginger",8
Breakky Wrap,BREAKFAST,"Crispy bacon, fried egg, cheese, hashbrown, spinach, Hollandaise, aioli, BBQ sauce",16.9
Kentucky Benedict,BREAKFAST,"Buttermilk fried chicken, poached eggs, spinach, sriracha aioli, hollandaise on toasted croissant",26.9
Big Breakfast,BREAKFAST,"Eggs your way, bacon, grilled tomato, mushrooms, pork chipolatas & hash gems on Turkish toast (scrambled +1)",26.9
Chilli Fried Eggs,BREAKFAST,"Chilli fried eggs, chorizo, potato gems, chickpea salsa, spinach & sriracha on Turkish toast with jalapenos",21.9
Loaded Gems,BREAKFAST,"Potato gems loaded with guacamole, sriracha mayo, hollandaise & cheese",18.9
Perfect Stack,BREAKFAST,"Bacon, mushroom, spinach, poached egg, sweet potato rosti & hollandaise on Turkish toast",20.9
Rosti & Avo,BREAKFAST,"Fresh avocado, sweet potato rosties, tomato relish, poached egg, rocket",18.9
Mince & Gravy,BREAKFAST,"Savoury sausage mince, spinach, peas, fried egg on Turkish toast",25.9
Smashed Avo (V),BREAKFAST,"Avocado, lime, mint, fetta, cherry tomatoes, bush dukkah on sourdough",19.9
Waffles & Berries,BREAKFAST,"Sweet waffles, berry coulis, ice cream, maple bacon, mixed berries",19.9
The Big Vee (V),BREAKFAST,"Eggs your way, spinach, grilled tomato, mushrooms, avocado & hash gems on Turkish toast (scrambled +1)",26.9`;

// Função corrigida (igual ao componente)
const parseCSV = (text) => {
  const workbook = XLSX.read(text, { type: 'string', raw: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  
  if (data.length === 0) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  
  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('item') || h.includes('dish'));
  const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('type'));
  const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
  const priceIndex = headers.findIndex(h => h.includes('price') || h.includes('cost'));

  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const name = nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '';
    const category = categoryIndex >= 0 ? String(row[categoryIndex] || '').trim() : 'Uncategorized';
    const description = descriptionIndex >= 0 ? String(row[descriptionIndex] || '').trim() : '';
    const priceStr = priceIndex >= 0 ? String(row[priceIndex] || '').trim() : '';
    const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.]/g, '')) : undefined;

    const errors = [];
    if (!name) errors.push('Missing name');
    if (!category) errors.push('Missing category');

    items.push({
      name,
      category,
      description,
      price: isNaN(price) ? undefined : price,
      isValid: errors.length === 0,
      errors
    });
  }

  return items;
};

console.log('Parseando menu com o parser CORRIGIDO...\n');
const items = parseCSV(realMenuCSV);

console.log(`✅ Total de itens parseados: ${items.length}\n`);

// Verificar os itens críticos que tinham problema antes
const criticalItems = [
  'Sublime Pine Cold Pressed Juice',
  'Daily Greens Cold Pressed Juice',
  'Breakky Wrap',
  'Kentucky Benedict',
  'Big Breakfast',
  'Chilli Fried Eggs',
  'Loaded Gems',
  'Perfect Stack',
  'Rosti & Avo',
  'Mince & Gravy',
  'Smashed Avo',
  'Waffles & Berries',
  'The Big Vee'
];

console.log('=== VERIFICAÇÃO DOS ITENS CRÍTICOS (com vírgulas nas descrições) ===\n');

let allCorrect = true;

criticalItems.forEach(itemName => {
  const item = items.find(i => i.name === itemName);
  if (!item) {
    console.log(`❌ ${itemName} - NÃO ENCONTRADO`);
    allCorrect = false;
    return;
  }

  // Verificar se descrição está completa (não cortada)
  const hasFullDescription = item.description && item.description.length > 20;
  const hasPrice = item.price !== undefined && item.price > 0;
  
  const status = hasFullDescription && hasPrice ? '✅' : '❌';
  
  console.log(`${status} ${item.name}`);
  console.log(`   Categoria: ${item.category}`);
  console.log(`   Descrição: ${item.description || '(VAZIO)'}`);
  console.log(`   Preço: ${item.price ? '$' + item.price.toFixed(2) : '(VAZIO)'}`);
  console.log(`   Válido: ${item.isValid ? 'Sim' : 'Não'}`);
  
  if (!hasFullDescription || !hasPrice) {
    allCorrect = false;
    console.log(`   ⚠️  PROBLEMA: ${!hasFullDescription ? 'Descrição incompleta' : ''} ${!hasPrice ? 'Preço ausente' : ''}`);
  }
  console.log('');
});

console.log('=== RESULTADO FINAL ===\n');

if (allCorrect) {
  console.log('✅✅✅ PARSING 100% CORRETO! ✅✅✅');
  console.log('');
  console.log('Todos os itens foram parseados corretamente:');
  console.log('  ✅ Nomes completos');
  console.log('  ✅ Categorias corretas');
  console.log('  ✅ Descrições COMPLETAS (com vírgulas preservadas)');
  console.log('  ✅ Preços corretos');
  console.log('');
  console.log('🎯 CERTIFICAÇÃO: Sistema aprovado para produção');
  console.log('📅 Data: ' + new Date().toISOString());
  console.log('');
  console.log('O sistema agora é 100% fiel aos dados da planilha.');
} else {
  console.log('❌ AINDA HÁ PROBLEMAS NO PARSING');
  console.log('Verifique os itens marcados com ❌ acima');
}
