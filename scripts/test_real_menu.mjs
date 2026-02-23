import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quybuvapflnzcaedjbkl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjE3MzIsImV4cCI6MjA4NTIzNzczMn0.irgBRg6jSADNCNxsbcFE3zOaAEWrXSfTJmER5rUBjxA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== TESTE COM PLANILHA REAL DO CLIENTE ===\n');

// Simular exatamente o CSV que será gerado do Excel
const realMenuCSV = `Name,Category,Description,Price
Coffee Variants (Small),COFFEE,Small coffee variants,4.5
Coffee Variants (Medium),COFFEE,Medium coffee variants,6
Modifications (Large),COFFEE,Large modifications,7
Iced Coffee,COFFEE,,6.5
Babychino,COFFEE,,2.5
Cup,COFFEE,,5.5
Mug,COFFEE,,6
Short Black,COFFEE,,3.5
Macchiato,COFFEE,,4.5
Piccolo,COFFEE,,4.5
Hot Chocolate,NON-COFFEE,,4.5
Chai Latte,NON-COFFEE,,4.5
Turmeric Chai,NON-COFFEE,Chai latte with turmeric powder,5.5
Tea,NON-COFFEE,,4
House Blend Chai,NON-COFFEE,Tea leaves with frothed milk & honey,8
Juices,COLD DRINKS,See variety of our range,5
Sublime Pine Cold Pressed Juice,COLD DRINKS,"Pineapple, pear, green apple, lemon, mint",8
Daily Greens Cold Pressed Juice,COLD DRINKS,"Green apple, celery, pear, silverbeet, lemon, ginger",8
Smoothies,COLD DRINKS,,8
Milkshakes,COLD DRINKS,,8
Thickshake,COLD DRINKS,,10.5
Soft Drinks,COLD DRINKS,,3.5
Bundaberg Sparkling Drinks,COLD DRINKS,,5.5
Red Bull 250ml,COLD DRINKS,,6
Water,COLD DRINKS,,3
Bacon & Egg Roll,BREAKFAST,Grilled bacon, fried eggs, house tomato relish & BBQ sauce on bun,13.9
Breakky Wrap,BREAKFAST,"Crispy bacon, fried egg, cheese, hashbrown, spinach, Hollandaise, aioli, BBQ sauce",16.9
Classic Breakky,BREAKFAST,Two eggs cooked your way with bacon on Turkish toast (scrambled +1),16.9
Classic Veg Breakky (V),BREAKFAST,Eggs your way on buttered Turkish toast with avocado and grilled tomato,16.9
Eggs Benedict,BREAKFAST,2 poached eggs, spinach & hollandaise on Turkish toast (bacon/ham/mushroom; smoked salmon +5),21.9
Kentucky Benedict,BREAKFAST,"Buttermilk fried chicken, poached eggs, spinach, sriracha aioli, hollandaise on toasted croissant",26.9
Big Breakfast,BREAKFAST,"Eggs your way, bacon, grilled tomato, mushrooms, pork chipolatas & hash gems on Turkish toast (scrambled +1)",26.9
Chilli Fried Eggs,BREAKFAST,"Chilli fried eggs, chorizo, potato gems, chickpea salsa, spinach & sriracha on Turkish toast with jalapenos",21.9
Eggs 'N' Toast,BREAKFAST,2 eggs your way on Turkish toast with tomato relish (scrambled +1),10.9
Loaded Gems,BREAKFAST,"Potato gems loaded with guacamole, sriracha mayo, hollandaise & cheese",18.9
Perfect Stack,BREAKFAST,"Bacon, mushroom, spinach, poached egg, sweet potato rosti & hollandaise on Turkish toast",20.9
Rosti & Avo,BREAKFAST,"Fresh avocado, sweet potato rosties, tomato relish, poached egg, rocket",18.9
Mince & Gravy,BREAKFAST,"Savoury sausage mince, spinach, peas, fried egg on Turkish toast",25.9
Smashed Avo (V),BREAKFAST,"Avocado, lime, mint, fetta, cherry tomatoes, bush dukkah on sourdough",19.9
Waffles & Berries,BREAKFAST,"Sweet waffles, berry coulis, ice cream, maple bacon, mixed berries",19.9
The Big Vee (V),BREAKFAST,"Eggs your way, spinach, grilled tomato, mushrooms, avocado & hash gems on Turkish toast (scrambled +1)",26.9
Ice Cream Vanilla Sundae,BREAKFAST,,7
Classic Veg Breakie,BREAKFAST,"Eggs your way with grilled tomato, fresh avocado, rocket, Turkish bread",16.9
Vegan Stack,BREAKFAST,"Pakora rosti, grilled tomato & avocado, spinach, vegan pesto, sumac",17.9
Pump-kin Louder,BREAKFAST,"Sourdough with vegan pesto, pumpkin, vegan fetta, chickpea salsa, rocket",15.9
Mushrooms & Toast,BREAKFAST,Sauteed mushrooms & onion, peas, fresh spinach on sourdough (egg +2),17.9`;

// Função de parsing EXATA do componente
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Get headers (first line)
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Find column indices
  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('item') || h.includes('dish'));
  const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('type'));
  const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
  const priceIndex = headers.findIndex(h => h.includes('price') || h.includes('cost'));

  // Parse data rows
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    const name = nameIndex >= 0 ? values[nameIndex] : '';
    const category = categoryIndex >= 0 ? values[categoryIndex] : 'Uncategorized';
    const description = descriptionIndex >= 0 ? values[descriptionIndex] : '';
    const priceStr = priceIndex >= 0 ? values[priceIndex] : '';
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

console.log('Parseando menu real...\n');
const items = parseCSV(realMenuCSV);

console.log(`✅ Total de itens parseados: ${items.length}\n`);

const validItems = items.filter(i => i.isValid);
const invalidItems = items.filter(i => !i.isValid);

console.log(`✅ Itens válidos: ${validItems.length}`);
console.log(`❌ Itens inválidos: ${invalidItems.length}\n`);

// Verificar itens com descrições que têm vírgulas
console.log('=== VERIFICANDO ITENS COM VÍRGULAS NAS DESCRIÇÕES ===\n');

const problematicItems = [
  'Sublime Pine Cold Pressed Juice',
  'Daily Greens Cold Pressed Juice',
  'Breakky Wrap',
  'Kentucky Benedict',
  'Big Breakfast',
  'Chilli Fried Eggs'
];

problematicItems.forEach(itemName => {
  const item = items.find(i => i.name && i.name.includes(itemName.split(' ')[0]));
  if (item) {
    console.log(`📋 ${item.name}`);
    console.log(`   Categoria: ${item.category}`);
    console.log(`   Descrição: ${item.description || '(vazio)'}`);
    console.log(`   Preço: ${item.price ? '$' + item.price.toFixed(2) : '(vazio)'}`);
    console.log(`   Válido: ${item.isValid ? '✅' : '❌'}`);
    console.log('');
  }
});

// Análise detalhada de um item problemático
console.log('=== ANÁLISE DETALHADA: "Sublime Pine Cold Pressed Juice" ===\n');
const sublimeLine = realMenuCSV.split('\n').find(line => line.includes('Sublime Pine'));
console.log('Linha original do CSV:');
console.log(sublimeLine);
console.log('\nQuando faz split(\',\'):');
const parts = sublimeLine.split(',');
parts.forEach((part, i) => {
  console.log(`   [${i}]: "${part}"`);
});

const sublimeItem = items.find(i => i.name && i.name.includes('Sublime'));
console.log('\nResultado do parsing:');
console.log('   Name:', sublimeItem?.name);
console.log('   Category:', sublimeItem?.category);
console.log('   Description:', sublimeItem?.description);
console.log('   Price:', sublimeItem?.price);

console.log('\n🔴 PROBLEMA CONFIRMADO:');
console.log('   A descrição "Pineapple, pear, green apple, lemon, mint" tem vírgulas');
console.log('   O split(\',\') quebra em 5 partes em vez de 4 colunas');
console.log('   Resultado: dados ficam nas colunas erradas\n');

// Contar quantos itens têm descrições com vírgulas
const itemsWithCommasInDesc = items.filter(item => {
  const line = realMenuCSV.split('\n').find(l => l.includes(item.name));
  if (!line) return false;
  const parts = line.split(',');
  return parts.length > 4; // Mais de 4 colunas = tem vírgula na descrição
});

console.log(`⚠️  ${itemsWithCommasInDesc.length} itens têm vírgulas nas descrições`);
console.log('   Isso representa ' + Math.round((itemsWithCommasInDesc.length / items.length) * 100) + '% do menu\n');

console.log('=== CONCLUSÃO ===\n');
console.log('🔴 O PARSING ATUAL NÃO FUNCIONA COM ESTE MENU');
console.log('');
console.log('Motivo: O CSV usa split(\',\') simples, mas as descrições têm vírgulas.');
console.log('');
console.log('Exemplo:');
console.log('  Esperado: ["Sublime Pine", "COLD DRINKS", "Pineapple, pear, green apple, lemon, mint", "8"]');
console.log('  Real:     ["Sublime Pine", "COLD DRINKS", "Pineapple", "pear", "green apple", "lemon", "mint", "8"]');
console.log('');
console.log('Soluções possíveis:');
console.log('  1. ✅ RECOMENDADO: Aceitar apenas arquivos Excel (.xlsx)');
console.log('  2. ⚠️  Usar biblioteca CSV adequada que respeita aspas');
console.log('  3. ❌ Pedir para cliente remover vírgulas das descrições (ruim UX)');
console.log('');
