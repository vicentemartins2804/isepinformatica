# Votação da Sweat — Engenharia Informática ISEP

Site para os estudantes votarem na cor e no design da sweat do curso, com uma área reservada (`/admincp`) para a organização.

## Desenvolvimento

```bash
npm install
npm run dev        # no PowerShell: npm.cmd run dev
```

Abre http://localhost:3000.

## Configuração da base de dados (Neon)

1. **Criar as tabelas.** Põe o `DATABASE_URL` (role dona) no `.env.local` e corre `npm run db:setup`. O comando aplica o [`db/schema.sql`](db/schema.sql), que cria as tabelas `votos`, `admin`, `admin_logs` e `mensagens` (formulário de contacto), a role `voto_anonimo` e as políticas de RLS. Pode ser corrido várias vezes sem problema.
   > Se preferires colar o SQL num editor e aparecer *"cannot insert multiple commands into a prepared statement"*, é porque o editor envia o script inteiro como um só comando. Usa o `npm run db:setup` ou corre os comandos um a um.
2. **Dar uma password à role votante.** Gera uma password forte e corre:
   ```sql
   ALTER ROLE voto_anonimo WITH LOGIN PASSWORD '<password>';
   ```
3. **Variáveis de ambiente.** Define-as no `.env.local` e na Vercel:

   | Variável | Para quê |
   |---|---|
   | `DATABASE_URL` | Connection string da role dona. Usada só pelo painel de admin (login e leitura dos resultados). |
   | `DATABASE_URL_VOTANTE` | A mesma connection string, mas com o utilizador `voto_anonimo` e a password do passo 2. Usada para gravar os votos. |
   | `SESSION_SECRET` | Segredo para assinar os JWT das sessões de admin, com pelo menos 32 caracteres. Para gerar um: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

4. **Definir a conta de administração:** `npm run admin:set -- <username>`. O script pede a password no terminal. Só existe uma conta. Voltar a correr o comando substitui o username e a password e termina todas as sessões abertas, o que serve para recuperar o acesso se perderes a password.

## Painel de administração (`/admincp`)

- **Resultados:** total de votos, votos e percentagem por cor e por design, a combinação mais votada e a tabela com todas as combinações.
- **Votos ao longo do tempo:** gráfico de votos por hora e o minuto com mais votos. Um pico de 20 ou mais votos num minuto é assinalado como invulgar.
- **Exportar Dados:** descarrega um CSV com todos os votos. Usa o separador `;` e codificação UTF-8 com BOM, para abrir bem no Excel em português.
- **Horário da votação:** define a abertura (opcional) e o fecho, em hora de Lisboa. Sem fecho definido, não há votação aberta. Fora do horário, a página mostra a popup correspondente e a base de dados recusa novos votos (política de RLS).
- **QR code para cartazes:** QR do link da votação, com download em PNG (1200 px, para imprimir) ou SVG.
- **Gerir votos:** anula os votos selecionados, ou repõe a votação a zeros (escrevendo `REPOR`), o que começa uma nova ronda em que quem já votou pode voltar a votar. Ambas as ações ficam no registo.
- **Dados pessoais (RGPD):** depois do fecho, "Anonimizar agora" substitui a identificação do dispositivo de cada voto. A página de privacidade promete fazê-lo até 30 dias depois do fecho.
- **Conta:** login com o username e a password da conta única. Ao fim de 5 tentativas falhadas, o IP fica bloqueado durante 15 minutos. Há também "Terminar sessão em todos os dispositivos". A password muda-se com `npm run admin:set`.
- **Registo do painel:** logins (bem-sucedidos, falhados e bloqueados), logouts, votos anulados, reposições e anonimizações, com data, IP e browser. Cada entrada é apagada ao fim de 90 dias.

## Proteção contra bots (Vercel BotID)

O voto e o login no painel são protegidos pelo [BotID](https://vercel.com/docs/botid), um captcha invisível. O cliente está configurado em [`src/instrumentation-client.ts`](src/instrumentation-client.ts), e o servidor verifica cada pedido em [`src/lib/bot.ts`](src/lib/bot.ts).
- **Só funciona na Vercel.** Em desenvolvimento (`npm run dev`) deixa passar todos os pedidos.
- **Recomendado:** ativar o *Deep Analysis* em Vercel → projeto → **Firewall** → **Configure** → **Vercel BotID Deep Analysis**.

## Privacidade

A página [`/privacidade`](src/app/privacidade/page.tsx) explica o que é guardado, para quê e durante quanto tempo, e está ligada no rodapé e junto ao botão de voto.

### Consultas diretas à base de dados

No SQL Editor do Neon, com a role dona:

```sql
SELECT * FROM votos_por_cor;
SELECT * FROM votos_por_design;
SELECT * FROM votos_por_combinacao;   -- a primeira linha é a mais votada
SELECT votacao_inicio(), votacao_prazo(), votacao_aberta();
```

## Mockups

As imagens ficam em [`public/mockups/`](public/mockups/), com o nome `<design>-<cor>.png`. Os ids estão em [`src/lib/options.ts`](src/lib/options.ts).

Cada imagem deve ter a **frente na metade esquerda e as costas na metade direita**. Os botões "Ambos / Frente / Costas" da página de voto recortam cada metade.

## Testes

```bash
npm test             # unitários e regras SQL (Vitest + PGlite, sem base de dados real)
npm run test:e2e     # testes de fumo no browser (Playwright); faz o build e arranca o site
```

- **Testes de SQL:** correm o [`db/schema.sql`](db/schema.sql) num Postgres em memória e verificam a unicidade, o horário (RLS), os privilégios da role votante, os KPIs, a anonimização e as rondas.
- **Testes de fumo:** só fazem leituras (não votam nem fazem login). Ainda assim, a página principal lê o horário da base de dados do `.env.local`.
- **Primeira vez:** instalar o browser dos testes com `npx playwright install chromium`.
