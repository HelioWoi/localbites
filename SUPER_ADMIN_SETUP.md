# Super Admin Dashboard - Setup Guide

## 🎯 O que foi criado

Um **Super Admin Dashboard completo** para você gerenciar todos os parceiros do LocalBites.

---

## 📁 Arquivos Criados

1. **`/screens/admin/SuperAdminDashboard.tsx`** - Dashboard principal com todas as features
2. **`/screens/admin/SuperAdminPortal.tsx`** - Portal com autenticação e proteção
3. **`/supabase/migrations/create_super_admins_table.sql`** - SQL para criar tabela no Supabase
4. **`App.tsx`** - Atualizado para incluir rota `/admin`

---

## 🚀 Como Ativar

### **1. Criar Tabela no Supabase**

Acesse o **Supabase Dashboard** → **SQL Editor** e execute:

```sql
-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Create policy: Only super admins can read
CREATE POLICY "Super admins can read super_admins table"
  ON super_admins
  FOR SELECT
  USING (
    email IN (SELECT email FROM super_admins)
  );

-- Insert your email as the first super admin
-- IMPORTANTE: Substitua pelo seu email real
INSERT INTO super_admins (email)
VALUES ('seu-email@exemplo.com')
ON CONFLICT (email) DO NOTHING;
```

**⚠️ IMPORTANTE:** Substitua `'seu-email@exemplo.com'` pelo seu email real que você usa no Supabase Auth!

---

### **2. Acessar o Dashboard**

1. Faça login no app como Partner (com o email que você adicionou na tabela)
2. Acesse: **`http://localhost:3000/admin`**
3. O sistema vai verificar se você é super admin
4. Se autorizado, você verá o dashboard completo!

---

## 🎨 Features Implementadas

### **📊 Overview Tab**
- Total de parceiros
- Assinaturas ativas
- Receita mensal
- Total de vídeos
- Trial users
- Taxa de conversão
- Churn rate
- Lista dos últimos parceiros cadastrados

### **👥 Partners Tab**
- Lista completa de todos os parceiros
- Busca por nome ou email
- Filtro por status (Trial, Active, Cancelled, Expired)
- Informações detalhadas de cada parceiro
- Exportar dados em CSV
- Link para visualizar restaurante

### **💰 Revenue Tab**
- Receita total
- Receita mensal recorrente (MRR)
- Annual Run Rate (ARR)
- Breakdown de receita por status
- Gráficos visuais

### **🎬 Content Tab**
- Estatísticas de vídeos
- Total de vídeos no app
- Média de vídeos por parceiro
- Top 5 parceiros com mais vídeos
- Total de views (quando implementado)

### **📈 Analytics Tab**
- Total de views
- Total de likes
- Usuários ativos
- Taxa de conversão
- Métricas de crescimento

---

## 🔐 Segurança

- ✅ Autenticação obrigatória via Supabase Auth
- ✅ Verificação de super admin na tabela `super_admins`
- ✅ Row Level Security (RLS) ativado
- ✅ Apenas super admins podem acessar
- ✅ Rota protegida no frontend

---

## 📱 Como Usar

### **Adicionar Novo Super Admin**

```sql
INSERT INTO super_admins (email)
VALUES ('novo-admin@exemplo.com');
```

### **Remover Super Admin**

```sql
DELETE FROM super_admins
WHERE email = 'admin@exemplo.com';
```

### **Ver Todos os Super Admins**

```sql
SELECT * FROM super_admins;
```

---

## 🎯 Próximos Passos (Opcional)

Quando você quiser expandir o dashboard, pode adicionar:

1. **Moderar Conteúdo**
   - Aprovar/rejeitar vídeos
   - Remover conteúdo inapropriado

2. **Gerenciar Assinaturas**
   - Ativar/desativar manualmente
   - Estender trials
   - Aplicar descontos

3. **Analytics Avançado**
   - Gráficos de crescimento
   - Métricas por período
   - Relatórios personalizados

4. **Notificações**
   - Alertas de novos cadastros
   - Avisos de cancelamentos
   - Métricas importantes

---

## 🐛 Troubleshooting

**Erro: "Unauthorized access"**
- Verifique se seu email está na tabela `super_admins`
- Confirme que você está logado com o email correto
- Execute o SQL novamente no Supabase

**Erro: "Table does not exist"**
- Execute o SQL de criação da tabela no Supabase SQL Editor
- Verifique se a migração foi aplicada corretamente

**Dashboard não carrega**
- Verifique o console do navegador para erros
- Confirme que o servidor está rodando
- Limpe o cache do navegador

---

## 📞 Suporte

Se tiver qualquer problema, me avise que eu ajudo a resolver! 🚀
