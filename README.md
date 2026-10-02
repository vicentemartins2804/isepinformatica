# Votação da sweat de curso: Engenharia Informática ISEP

Site onde os estudantes de Engenharia Informática do ISEP votam na cor e no design da sweat de curso, sem conta nem login, com um painel reservado (`/admincp`) para a organização acompanhar e gerir a votação.

## Funcionalidades

**Votação (`/`)**
- Escolha da cor e do design, com o mockup da combinação: frente e costas lado a lado, só a frente, só as costas, versão finalista e zoom.
- Popups conforme o estado: votação por abrir (com contagem decrescente), aberta ou fechada.
- Um voto por dispositivo, garantido em três camadas: identificação do dispositivo (FingerprintJS), marca no browser e restrição `UNIQUE` na base de dados.
- Captcha invisível (Vercel BotID) no voto, no contacto e no login.
- Página de contacto (`/contacto`), página de privacidade (`/privacidade`), páginas de erro próprias e imagem de pré-visualização para partilhar o link.

**Painel de administração (`/admincp`)**
- Resultados por cor, por design e por combinação, e gráfico de votos por hora com o pico por minuto.
- Horário de abertura e fecho, em hora de Lisboa.
- Exportação em CSV e QR code para cartazes (PNG ou SVG).
- Anulação de votos, reposição da votação a zeros (nova ronda) e anonimização dos dados depois do fecho.
- Mensagens recebidas pelo formulário de contacto.
- Registo de logins e ações, com bloqueio de IP ao fim de 5 tentativas falhadas.

## Tecnologias

- **Next.js 16** (App Router, Server Actions), **React 19**, **TypeScript** e **Tailwind CSS 4**
- **PostgreSQL** na [Neon](https://neon.tech), com o driver serverless por HTTP
- **jose** (JWT) e **bcryptjs** para a sessão do painel
- **FingerprintJS**, **Vercel BotID**, **sharp** (medição dos mockups) e **qrcode**
- **Vitest** + **PGlite** (Postgres em memória) e **Playwright** para os testes
- Alojado na **Vercel**

## Segurança e privacidade

As regras importantes estão na base de dados, para continuarem a valer mesmo que alguém contorne o site:

- **Dois utilizadores na base de dados.** O site grava votos e mensagens com a role `voto_anonimo`, que só pode inserir. Não lê, não altera nem apaga nada. A role dona só é usada pelo painel.
- **Row Level Security.** Os votos fora do horário são recusados por uma política de RLS, e os duplicados pela restrição `UNIQUE`. As mensagens de contacto têm um limite por email e por hora, também em RLS.
- **Sessão do painel.** JWT num cookie `httpOnly` e `SameSite=Lax`, password com bcrypt, tempo de resposta igual para utilizadores existentes e inexistentes, e invalidação de todas as sessões por versão.
- **Cabeçalhos HTTP.** `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **RGPD.** A identificação do dispositivo é anonimizada depois do fecho, e os registos e as mensagens com mais de 90 dias são apagados.

## Estrutura

```
db/schema.sql         Tabelas, funções, vistas, roles e políticas de RLS (idempotente)
scripts/              Aplicar o esquema e definir a conta de administração
src/app/              Páginas, componentes e Server Actions
src/app/admincp/      Painel de administração
src/app/api/admin/    Exportação CSV e QR code (só com sessão)
src/lib/              Base de dados, sessão, validação e lógica partilhada
src/proxy.ts          Redireciona para o login quem não tem sessão
public/mockups/       Imagens das sweats
tests/unit/           Testes unitários e das regras SQL
tests/e2e/            Testes de fumo no browser
```

## Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000. É preciso uma base de dados configurada (ver abaixo).

## Base de dados (Neon)

1. **Criar as tabelas.** Põe o `DATABASE_URL` (role dona) no `.env.local` e corre `npm run db:setup`. O comando aplica o [`db/schema.sql`](db/schema.sql) e pode ser corrido várias vezes.
2. **Dar uma password à role votante:**
   ```sql
   ALTER ROLE voto_anonimo WITH LOGIN PASSWORD '<password>';
   ```
3. **Variáveis de ambiente**, no `.env.local` e na Vercel:

   | Variável | Para quê |
   |---|---|
   | `DATABASE_URL` | Ligação com a role dona. Usada só pelo painel. |
   | `DATABASE_URL_VOTANTE` | A mesma ligação, com o utilizador `voto_anonimo` e a password do passo 2. Usada para gravar votos e mensagens. |
   | `SITE_URL` | Opcional. Domínio público, por exemplo `https://www.isepinformatica.pt`, usado no QR code e nos links de partilha. Sem ela, usa-se o domínio de produção que a Vercel escolhe. |
   | `SESSION_SECRET` | Segredo dos JWT do painel, com pelo menos 32 caracteres: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

4. **Criar a conta de administração:** `npm run admin:set -- <username>`. O script pede a password. Voltar a correr o comando substitui a conta e termina todas as sessões.

Para consultas diretas no SQL Editor do Neon, há as vistas `votos_por_cor`, `votos_por_design` e `votos_por_combinacao`.

## Mockups

Uma imagem para a frente e outra para as costas de cada combinação, em [`public/mockups/`](public/mockups/), com os ids de [`src/lib/options.ts`](src/lib/options.ts):

```
design-1-verde-frente.png
design-1-verde-costas.png
design-1-verde-finalista-costas.png   (opcional: a versão finalista só muda as costas)
```

Aceita PNG, JPG ou WebP. O site recorta a margem de cada imagem e alinha todas automaticamente, por isso basta deixar algum espaço (de preferência transparente) à volta da sweat. Os ficheiros em falta aparecem listados na página de voto.

## Testes

```bash
npm test            # unitários e regras SQL (Vitest + PGlite, sem base de dados real)
npm run test:e2e    # testes de fumo no browser (Playwright): faz o build e arranca o site
```

- Os testes de SQL correm o `db/schema.sql` num Postgres em memória e verificam a unicidade, o horário, os privilégios da role votante, os limites do contacto, os KPIs, as rondas e a anonimização.
- Os testes de fumo só fazem leituras (não votam nem fazem login). Na primeira vez, instala o browser com `npx playwright install chromium`.
