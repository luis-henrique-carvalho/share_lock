# Fluxo de Verificação de Email e Recompensas

## Visão Geral

Sistema completo para verificação de email de leads e visualização de recompensas baseadas em indicações.

## Estrutura do Banco de Dados

### Tabela `lead`

Novos campos adicionados:

- `email_verified` (boolean): Indica se o email foi confirmado (padrão: false)
- `verification_token` (text): Token único para verificação de email
- `verification_token_expires_at` (timestamp): Data de expiração do token (24 horas)

## Fluxo Completo

### 1. Criação do Lead

**Endpoint:** `POST /public/:campaign_slug/leads?ref=CODIGO_REFERENCIA`

**Body:**

```json
{
  "name": "João Silva",
  "email": "joao@example.com"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Lead created successfully, verify your email for more details.",
  "lead": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "emailVerified": false,
    "verificationToken": "token-gerado-automaticamente",
    "referralCode": "codigo-unico-do-lead"
  },
  "referralCode": "codigo-unico-do-lead"
}
```

**O que acontece:**

- Lead é criado com `emailVerified = false`
- Token de verificação é gerado automaticamente (válido por 24h)
- Se houver `ref` query param, cria indicação para o referenciador
- **TODO:** Enviar email com link de verificação

### 2. Email de Boas-vindas (A implementar)

O email deve conter:

- Boas-vindas à campanha
- Link de verificação: `https://seu-app.com/verify-email?token={verificationToken}`
- Código de referência do lead para compartilhar
- Preview das recompensas disponíveis

**Template sugerido:**

```html
Olá {name}, Bem-vindo à campanha "{campaign.title}"! Para confirmar seu email e
acessar suas recompensas, clique no link abaixo: 🔗 Verificar Email:
https://seu-app.com/verify-email?token={verificationToken} Seu código de
indicação: {referralCode} Compartilhe com seus amigos e ganhe recompensas! 📊
Veja suas recompensas:
https://seu-app.com/campaigns/{campaign_slug}/rewards/{referralCode}
```

### 3. Verificação de Email

**Endpoint:** `POST /public/:campaign_slug/leads/verify-email`

**Body:**

```json
{
  "token": "token-recebido-por-email"
}
```

**Resposta (Sucesso):**

```json
{
  "success": true,
  "message": "Email verified successfully.",
  "lead": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "emailVerified": true,
    "verificationToken": null
  }
}
```

**Erros possíveis:**

- `404`: Token inválido
- `400`: Email já verificado
- `400`: Token expirado (> 24h)

### 4. Visualização de Recompensas

**Endpoint:** `GET /public/:campaign_slug/leads/rewards/:referral_code`

**Exemplo:** `GET /public/minha-campanha/leads/rewards/abc123def456`

**Resposta:**

```json
{
  "lead": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "referralCode": "abc123def456"
  },
  "campaign": {
    "id": "uuid",
    "title": "Campanha XYZ",
    "description": "Descrição da campanha"
  },
  "totalIndications": 5,
  "earnedRewards": [
    {
      "id": 1,
      "title": "Recompensa Bronze",
      "description": "Ganhe ao indicar 3 pessoas",
      "type": "coupon_code",
      "content": "BRONZE2024",
      "goalAmount": 3
    },
    {
      "id": 2,
      "title": "Recompensa Prata",
      "description": "Ganhe ao indicar 5 pessoas",
      "type": "link",
      "content": "https://download.com/reward-silver",
      "goalAmount": 5
    }
  ],
  "allRewards": [
    {
      "id": 1,
      "title": "Recompensa Bronze",
      "description": "Ganhe ao indicar 3 pessoas",
      "type": "coupon_code",
      "goalAmount": 3,
      "isEarned": true
    },
    {
      "id": 2,
      "title": "Recompensa Prata",
      "description": "Ganhe ao indicar 5 pessoas",
      "type": "link",
      "goalAmount": 5,
      "isEarned": true
    },
    {
      "id": 3,
      "title": "Recompensa Ouro",
      "description": "Ganhe ao indicar 10 pessoas",
      "type": "file",
      "goalAmount": 10,
      "isEarned": false
    }
  ]
}
```

**Notas importantes:**

- `earnedRewards`: Contém apenas recompensas conquistadas (com `content` visível)
- `allRewards`: Lista todas as recompensas com status `isEarned`
- Requer email verificado (`emailVerified = true`)

**Erros possíveis:**

- `404`: Lead não encontrado
- `400`: Email não verificado

## Lógica de Recompensas

As recompensas são baseadas no número de **indicações confirmadas** (`indication.status = 'confirmed'`):

1. Sistema conta quantas indicações o lead fez
2. Compara com `reward.goalAmount` de cada recompensa
3. Lead recebe todas as recompensas onde `totalIndications >= goalAmount`

## Status das Indicações

As indicações podem ter os seguintes status:

- `pending`: Aguardando confirmação
- `confirmed`: Confirmada (conta para recompensas)
- `invalid`: Inválida (não conta)

## Implementação do Frontend

### Página de Verificação de Email

```typescript
// /verify-email (query: token)
async function verifyEmail(token: string) {
  const response = await fetch('/api/public/campaign-slug/leads/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (response.ok) {
    // Redirecionar para página de recompensas
    const { lead } = await response.json();
    window.location.href = `/campaigns/${campaignSlug}/rewards/${lead.referralCode}`;
  }
}
```

### Página de Recompensas

```typescript
// /campaigns/:slug/rewards/:code
async function loadRewards(campaignSlug: string, referralCode: string) {
  const response = await fetch(
    `/api/public/${campaignSlug}/leads/rewards/${referralCode}`,
  );

  const data = await response.json();

  // Renderizar:
  // - Informações do lead
  // - Progresso (totalIndications / próxima meta)
  // - Recompensas conquistadas (com content revelado)
  // - Recompensas bloqueadas (com meta a atingir)
  // - Link de compartilhamento com o referralCode
}
```

## Próximos Passos

1. **Integrar serviço de email** (Nodemailer, SendGrid, etc.)
   - Implementar no `LeadsService.create()` após criar o lead
   - Enviar email com template de boas-vindas e link de verificação

2. **Criar páginas frontend:**
   - Página de verificação de email (`/verify-email`)
   - Página de recompensas (`/campaigns/:slug/rewards/:code`)
   - Componente de compartilhamento social

3. **Confirmação de indicações:**
   - Implementar lógica para mudar `indication.status` de `pending` para `confirmed`
   - Pode ser automático (após verificação de email) ou manual (admin)

4. **Cache:**
   - Adicionar cache para a página de recompensas (atualmente sem cache)

5. **Notificações:**
   - Enviar email quando lead atingir nova recompensa
   - Notificar referenciador quando alguém usar seu código

## Segurança

- Token de verificação tem 64 caracteres (256 bits de entropia)
- Token expira em 24 horas
- Após verificação, token é removido do banco
- Endpoint de recompensas requer email verificado
- Não expõe `content` de recompensas não conquistadas
