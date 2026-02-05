# Super Admin Dashboard - Guia de Funcionalidades

## 📋 **BOTÕES E SUAS FUNÇÕES**

### **1. Botão "Action" (Recent Partners)**

**O que é:**
- Botão de ação rápida para gerenciar parceiros

**O que faz atualmente:**
- É um placeholder (botão visual sem função implementada)

**O que DEVERIA fazer:**
- Abrir um menu dropdown com opções:
  - ✅ **Aprovar Trial** - Converter trial em assinatura paga
  - 📧 **Enviar Email** - Contatar o parceiro
  - 🔒 **Suspender Conta** - Desativar temporariamente
  - 🗑️ **Deletar Parceiro** - Remover permanentemente
  - 📊 **Ver Detalhes** - Abrir perfil completo do parceiro

**Status:** ⚠️ Não implementado - apenas visual

---

### **2. Botão "Campaigns" (Atividade Recente)**

**O que é:**
- Link para gerenciar campanhas de marketing/email

**O que faz atualmente:**
- É um placeholder (link visual sem função implementada)

**O que DEVERIA fazer:**
- Redirecionar para uma página de campanhas onde você pode:
  - 📧 **Email Marketing** - Enviar newsletters para parceiros
  - 🎯 **Promoções** - Criar ofertas especiais
  - 📊 **Analytics de Campanhas** - Ver taxa de abertura, cliques, conversões
  - 🎨 **Templates** - Criar templates de email personalizados

**Status:** ⚠️ Não implementado - apenas visual

---

### **3. Botão "..." (Menu de 3 pontos)**

**O que é:**
- Menu de opções adicionais para cada parceiro

**O que faz atualmente:**
- É um placeholder (botão visual sem função implementada)

**O que DEVERIA fazer:**
- Abrir um dropdown com:
  - 👁️ **Ver Perfil** - Abrir página do restaurante
  - ✏️ **Editar Informações** - Modificar dados do parceiro
  - 📊 **Ver Analytics** - Estatísticas detalhadas
  - 💳 **Gerenciar Assinatura** - Stripe billing
  - 🗑️ **Deletar** - Remover parceiro

**Status:** ⚠️ Não implementado - apenas visual

---

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS (QUE FUNCIONAM)**

### ✅ **Navegação**
- Sidebar com menu de navegação
- Tabs superiores (Overview, Partners, Revenue, etc)
- Responsivo para mobile com sidebar colapsável

### ✅ **Métricas em Tempo Real**
- Total Partners
- Active Subscriptions
- Monthly Revenue
- Total Videos
- Conversion Rate
- Churn Rate

### ✅ **Listas**
- Videos Populares (top 3 restaurantes por número de vídeos)
- Recent Partners (últimos 3 parceiros cadastrados)
- Atividade Recente (placeholder para logs)

### ✅ **Autenticação**
- Login obrigatório
- Verificação de super admin
- Logout

### ✅ **Busca**
- Campo de busca no top bar (visual, sem função ainda)

---

## 🚧 **FUNCIONALIDADES A IMPLEMENTAR**

### **1. Ações de Parceiros**
```typescript
// Exemplo de implementação futura
const handlePartnerAction = (partnerId: string, action: string) => {
  switch(action) {
    case 'approve':
      // Converter trial em assinatura paga
      break;
    case 'suspend':
      // Suspender conta temporariamente
      break;
    case 'delete':
      // Deletar parceiro
      break;
    case 'email':
      // Abrir modal de email
      break;
  }
};
```

### **2. Sistema de Campanhas**
- Criar campanhas de email marketing
- Segmentar parceiros (trial, active, cancelled)
- Templates de email
- Analytics de campanhas

### **3. Busca Funcional**
- Buscar por nome de restaurante
- Buscar por email
- Filtrar por status (trial, active, cancelled)

### **4. Analytics Avançado**
- Gráficos de crescimento
- Métricas por período (dia, semana, mês)
- Exportar relatórios em PDF/CSV

### **5. Notificações**
- Novos cadastros
- Cancelamentos
- Trials expirando
- Problemas de pagamento

---

## 📱 **RESPONSIVIDADE**

### **Desktop (> 1024px)**
- Sidebar sempre visível
- Busca completa
- Email do usuário visível

### **Tablet (768px - 1024px)**
- Sidebar colapsável
- Busca visível
- Layout adaptado

### **Mobile (< 768px)**
- Sidebar escondida por padrão
- Botão de menu (hamburger)
- Busca escondida
- Email do usuário escondido
- Tabs com scroll horizontal

---

## 🎨 **DESIGN SYSTEM**

### **Cores Padrão SaaS**
- Ícones: `text-zinc-600` (cinza neutro)
- Background: `bg-zinc-100` (cinza claro)
- Texto: `text-zinc-900` (quase preto)
- Bordas: `border-zinc-200` (cinza suave)
- Accent: `text-orange-500` (laranja LocalBites)

### **Badges de Status**
- **Active**: Verde (`bg-green-100 text-green-700`)
- **Trial**: Azul (`bg-blue-100 text-blue-700`)
- **Cancelled**: Vermelho (`bg-red-100 text-red-700`)
- **Expired**: Cinza (`bg-gray-100 text-gray-700`)

---

## 🔐 **SEGURANÇA**

- ✅ Autenticação obrigatória via Supabase
- ✅ Verificação de super admin na tabela `super_admins`
- ✅ RLS desabilitado na tabela `super_admins` (apenas emails)
- ✅ Logout seguro

---

## 📝 **PRÓXIMOS PASSOS RECOMENDADOS**

1. **Implementar ações de parceiros** (Action button)
2. **Criar sistema de campanhas** (Campaigns link)
3. **Adicionar busca funcional**
4. **Implementar notificações em tempo real**
5. **Adicionar gráficos interativos** (Chart.js ou Recharts)
6. **Criar página de detalhes do parceiro**
7. **Integração com Stripe para gerenciar assinaturas**

---

## ❓ **DÚVIDAS FREQUENTES**

**P: Por que os botões "Action" e "Campaigns" não funcionam?**
R: São placeholders visuais. Precisam ser implementados com funcionalidades reais.

**P: Como adicionar mais super admins?**
R: Execute SQL no Supabase: `INSERT INTO super_admins (email) VALUES ('novo@email.com');`

**P: Como personalizar as métricas?**
R: Edite o arquivo `SuperAdminDashboardNew.tsx` e adicione novos cards na seção de métricas.

**P: O dashboard funciona offline?**
R: Não, precisa de conexão com o Supabase para carregar dados.

---

**Última atualização:** Fevereiro 2026
