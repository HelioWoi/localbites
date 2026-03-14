# 🔍 ANÁLISE TÉCNICA - VÍDEOS TRAVANDO (La Casa Brasil)

**Data:** 15 Março 2026  
**Cliente Afetado:** La Casa Brasil  
**Status dos Vídeos:** Já em baixa resolução  
**Problema:** Travamentos durante reprodução

---

## ✅ CONFIRMADO PELO USUÁRIO

- ✅ Vídeos do La Casa Brasil **já estão em baixa resolução**
- ✅ Problema **NÃO é compressão ou qualidade**
- ✅ Precisa funcionar para **TODOS os clientes**
- ✅ **NÃO mexer no código existente** sem aprovação

---

## 🔍 ANÁLISE DO CÓDIGO ATUAL

### Sistema de Reprodução de Vídeos
**Arquivo:** `screens/RestaurantMenuPage.tsx`

#### Estratégia de Carregamento (Linhas 251-297):

```typescript
// LÓGICA ATUAL:
1. Vídeo Ativo (index atual): CARREGA + PLAY
2. Vídeos Adjacentes (±1): CARREGA + PAUSE (preload)
3. Vídeos Distantes (>1): DESCARREGA (libera memória)

// RETRY AUTOMÁTICO:
- Tenta dar play a cada 500ms
- Continua até vídeo começar
- Objetivo: Fix para redes 4G lentas
```

#### Configuração de Vídeo (Linha 533):
```typescript
<video
  loop
  muted
  playsInline
  preload="auto"  // ⚠️ CARREGA VÍDEO INTEIRO
  onCanPlay={...}
  onError={...}
/>
```

---

## 🚨 POSSÍVEIS CAUSAS DO TRAVAMENTO

### 1. **Preload Agressivo**
**Problema:** `preload="auto"` tenta carregar vídeo inteiro antes de reproduzir

**Impacto em Redes Lentas:**
- Vídeo trava esperando buffer completo
- Usa muita largura de banda
- Pode causar timeout

**Solução Possível:**
- Mudar para `preload="metadata"` (só carrega info do vídeo)
- Deixa navegador decidir quando carregar conteúdo
- Melhor para redes instáveis

---

### 2. **Retry Interval Muito Frequente**
**Problema:** Retry a cada 500ms pode sobrecarregar em redes lentas

**Código Atual (Linha 286-294):**
```typescript
const retryInterval = setInterval(() => {
  const activeVideo = videoRefs.current[activeVideoIndex];
  if (activeVideo && isPlaying && activeVideo.paused && activeVideo.readyState >= 2) {
    activeVideo.play().catch(() => {});
  }
  if (activeVideo && !activeVideo.paused) {
    clearInterval(retryInterval);
  }
}, 500); // ⚠️ A cada 500ms
```

**Impacto:**
- Muitas tentativas de play simultâneas
- Pode causar race conditions
- Sobrecarga em dispositivos lentos

---

### 3. **Gestão de Memória em Dispositivos Antigos**
**Problema:** 3 vídeos carregados simultaneamente (ativo + 2 adjacentes)

**Em dispositivos com pouca RAM:**
- Browser pode matar processo
- Vídeos podem não carregar
- Performance degradada

---

### 4. **Formato de Vídeo Não Otimizado**
**Possível Problema:** Vídeos em formatos diferentes

**Formatos que podem causar problemas:**
- ❌ MOV (codec Apple, pesado)
- ❌ WebM VP9 (requer decodificação pesada)
- ⚠️ MP4 H.265/HEVC (não suportado em todos browsers)
- ✅ MP4 H.264 (melhor compatibilidade)

**Verificar:**
- Qual formato os vídeos La Casa Brasil estão?
- Codec usado?
- Bitrate mesmo em baixa resolução?

---

### 5. **Supabase Storage Performance**
**Possível Problema:** CDN do Supabase pode ter latência

**Fatores:**
- Localização do servidor
- Throttling de bandwidth
- Conexões simultâneas

**Teste Necessário:**
- Verificar tempo de resposta do Supabase
- Testar download direto dos vídeos
- Comparar com outros clientes

---

## 🎯 DIAGNÓSTICO RECOMENDADO (SEM MEXER NO CÓDIGO)

### Passo 1: Verificar Vídeos La Casa Brasil
```bash
# Informações necessárias:
1. Formato dos vídeos (MP4, WebM, MOV?)
2. Codec (H.264, H.265, VP9?)
3. Resolução exata (720p, 480p, 360p?)
4. Bitrate (kbps)
5. Tamanho dos arquivos (MB)
6. Duração média (segundos)
```

### Passo 2: Testar Performance
```
1. Abrir DevTools (F12)
2. Aba Network
3. Filtrar por "media"
4. Reproduzir vídeo La Casa Brasil
5. Verificar:
   - Tempo de carregamento
   - Tamanho transferido
   - Velocidade de download
   - Erros de rede
```

### Passo 3: Comparar com Outros Clientes
```
Testar vídeos de:
- Decisions Cafe
- Backstreet Cafe
- Brazzos

Comparar:
- Performance de carregamento
- Qualidade de reprodução
- Travamentos
```

---

## 💡 SOLUÇÕES PROPOSTAS (PARA REVISÃO)

### Opção 1: Ajuste Mínimo no Preload
**Mudança:** `preload="auto"` → `preload="metadata"`

**Impacto:**
- ✅ Menos agressivo no carregamento
- ✅ Melhor para redes lentas
- ✅ Navegador decide quando carregar
- ⚠️ Pode ter delay inicial de 0.5-1s

**Risco:** BAIXO
**Benefício:** MÉDIO-ALTO

---

### Opção 2: Otimizar Retry Logic
**Mudança:** Retry interval de 500ms → 1000ms

**Impacto:**
- ✅ Menos sobrecarga
- ✅ Melhor para dispositivos lentos
- ⚠️ Pode demorar mais para iniciar

**Risco:** BAIXO
**Benefício:** MÉDIO

---

### Opção 3: Adicionar Timeout no Retry
**Mudança:** Limitar retries a 10 tentativas (5 segundos)

**Impacto:**
- ✅ Evita loop infinito
- ✅ Melhor UX (mostra erro ao invés de travar)
- ✅ Libera recursos

**Risco:** BAIXO
**Benefício:** ALTO

---

### Opção 4: Reduzir Vídeos Adjacentes
**Mudança:** Carregar apenas vídeo ativo (sem adjacentes)

**Impacto:**
- ✅ Menos uso de memória
- ✅ Melhor para dispositivos antigos
- ⚠️ Delay ao trocar de vídeo

**Risco:** MÉDIO
**Benefício:** MÉDIO

---

### Opção 5: Verificar e Padronizar Formato
**Ação:** Re-encodar vídeos La Casa Brasil para MP4 H.264

**Impacto:**
- ✅ Melhor compatibilidade
- ✅ Decodificação mais rápida
- ✅ Funciona em todos dispositivos

**Risco:** ZERO (não mexe no código)
**Benefício:** ALTO

---

## 🔬 TESTES NECESSÁRIOS

### Antes de Qualquer Mudança:

1. **Verificar Console do Browser**
   ```
   - Abrir F12 no La Casa Brasil
   - Aba Console
   - Procurar erros de vídeo
   - Verificar warnings
   ```

2. **Testar em Diferentes Redes**
   ```
   - WiFi rápido
   - WiFi lento
   - 4G
   - 3G (simulado no DevTools)
   ```

3. **Testar em Diferentes Dispositivos**
   ```
   - iPhone (Safari)
   - Android (Chrome)
   - Desktop (Chrome/Firefox)
   ```

4. **Verificar Métricas de Vídeo**
   ```javascript
   // No console do browser:
   const video = document.querySelector('video');
   console.log({
     readyState: video.readyState,
     networkState: video.networkState,
     buffered: video.buffered.length,
     currentTime: video.currentTime,
     duration: video.duration
   });
   ```

---

## 📊 COMPARAÇÃO DE SOLUÇÕES

| Solução | Risco | Esforço | Benefício | Recomendação |
|---------|-------|---------|-----------|--------------|
| Preload metadata | Baixo | 1 min | Alto | ⭐⭐⭐⭐⭐ |
| Retry 1000ms | Baixo | 1 min | Médio | ⭐⭐⭐⭐ |
| Timeout retry | Baixo | 5 min | Alto | ⭐⭐⭐⭐⭐ |
| Sem adjacentes | Médio | 2 min | Médio | ⭐⭐⭐ |
| Re-encode vídeos | Zero | 30 min | Alto | ⭐⭐⭐⭐⭐ |

---

## 🎯 RECOMENDAÇÃO FINAL

### Abordagem em 2 Fases:

#### FASE 1: Diagnóstico (Sem Código)
1. Verificar formato/codec dos vídeos La Casa Brasil
2. Testar performance em diferentes redes
3. Comparar com outros clientes
4. Identificar padrão do problema

#### FASE 2: Correção Mínima (Se Necessário)
**Apenas se diagnóstico confirmar problema no código:**

1. **Mudança Mínima #1:** `preload="metadata"`
   - 1 linha de código
   - Zero risco
   - Melhoria imediata

2. **Mudança Mínima #2:** Timeout no retry
   - 5 linhas de código
   - Evita travamentos
   - Melhor UX

**OU**

**Solução Sem Código:** Re-encodar vídeos La Casa Brasil
- Converter para MP4 H.264
- Bitrate otimizado (1-2 Mbps)
- Resolução 480p ou 720p
- Zero mudança no código

---

## ❓ PERGUNTAS PARA O USUÁRIO

1. **Os vídeos La Casa Brasil travam em:**
   - [ ] Todos os dispositivos?
   - [ ] Apenas mobile?
   - [ ] Apenas em redes lentas?

2. **Outros clientes têm o mesmo problema?**
   - [ ] Sim, todos
   - [ ] Apenas La Casa Brasil
   - [ ] Alguns clientes

3. **Quando o travamento acontece?**
   - [ ] No início do vídeo
   - [ ] No meio da reprodução
   - [ ] Ao trocar de vídeo
   - [ ] Aleatoriamente

4. **Prefere:**
   - [ ] Solução sem mexer no código (re-encode vídeos)
   - [ ] Mudança mínima no código (1-2 linhas)
   - [ ] Investigar mais antes de decidir

---

**Próximo Passo:** Aguardando decisão do usuário sobre qual abordagem seguir.
