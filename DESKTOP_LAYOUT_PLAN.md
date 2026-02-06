# Desktop Layout Implementation Plan

## 🎯 Objetivo
Adicionar layouts desktop responsivos para todas as páginas principais mantendo o layout mobile intacto.

## 📱➡️💻 Estratégia
- Mobile: layout atual (sem mudanças)
- Desktop (lg: 1024px+): layouts otimizados com mais espaço

## 📄 Páginas a Modificar

### ✅ 1. FilterSelectionScreen.tsx
**Status:** Completo
- Max-width aumentado para lg:max-w-4xl
- Grid de categorias: 2 cols mobile → 4 cols desktop
- Footer com max-width maior

### 2. RestaurantProfile.tsx
**Mobile:** Fullscreen vertical com header overlay
**Desktop:** 
- Container centralizado max-w-6xl
- Grid de vídeos: 2 cols → 3-4 cols
- Sidebar com info do restaurante (opcional)

### 3. RestaurantMenuPage.tsx (CORE - CUIDADO!)
**Mobile:** Fullscreen TikTok-style (manter intacto)
**Desktop:**
- Vídeo centralizado max-w-2xl
- Sidebar direita com info do prato, comentários
- Categories tabs no topo

### 4. Partner Dashboard
**Mobile:** Hamburger menu + fullwidth content
**Desktop:**
- Sidebar fixa à esquerda (256px)
- Content area com padding maior
- Grid de métricas: 1 col → 3 cols

### 5. Admin Dashboard (SuperAdminDashboardNew.tsx)
**Mobile:** Sidebar overlay
**Desktop:**
- Sidebar fixa (já implementado)
- Melhorar grid de cards
- Tabela responsiva

## 🎨 Breakpoints Tailwind
- `sm:` 640px+ (mobile grande)
- `md:` 768px+ (tablet)
- `lg:` 1024px+ (desktop) ← PRINCIPAL
- `xl:` 1280px+ (desktop grande)
- `2xl:` 1536px+

## ⚠️ Regras Importantes
1. NÃO quebrar layout mobile existente
2. NÃO modificar RestaurantMenuPage sem cuidado extremo
3. Usar apenas prefixos `lg:` e `xl:` para desktop
4. Testar em diferentes tamanhos
5. Manter performance (sem JavaScript extra)

## 📋 Checklist
- [x] FilterSelectionScreen
- [ ] RestaurantProfile
- [ ] RestaurantMenuPage (com cuidado!)
- [ ] PartnerDashboard
- [ ] SuperAdminDashboardNew
- [ ] Testar responsividade
- [ ] Commit e push
