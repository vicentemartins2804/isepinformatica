# Votação da Sweat — Engenharia Informática ISEP

Site para os estudantes votarem na cor e no design da sweat do curso, com uma área reservada (`/admincp`) para a organização.

## Desenvolvimento

```bash
npm install
npm run dev        # no PowerShell: npm.cmd run dev
```

Abre http://localhost:3000.

## Configuração da base de dados (Neon)

1. **Criar as tabelas.** Põe o `DATABASE_URL` (role dona) no `.env.local` e corre `npm run db:setup`. O comando aplica o [`db/schema.sql`](db/schema.sql), que cria as tabelas `votos`, `admin` e `admin_logs`, a role `voto_anonimo` e as políticas de RLS. Pode ser corrido várias vezes sem problema.
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
- **Exportar Dados:** descarrega um CSV com todos os votos. Usa o separador `;` e codificação UTF-8 com BOM, para abrir bem no Excel em português.
- **Horário da votação:** define a abertura (opcional) e o fecho, em hora de Lisboa. Sem fecho definido, não há votação aberta. Antes da abertura, a página mostra "A votação ainda não abriu"; a partir do fecho, mostra "A votação já terminou". Fora do horário, a base de dados recusa novos votos (política de RLS).
- Login com o username e a password da conta única.
- Mudar a password: termina as sessões noutros dispositivos.
- Terminar sessão em todos os dispositivos.
- Registo de autenticação: logins bem-sucedidos e falhados, logouts e mudanças de password, com data, IP e browser.

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
