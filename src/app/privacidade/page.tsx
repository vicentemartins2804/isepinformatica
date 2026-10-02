import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade · Votação da Sweat",
  description: "Que dados a votação da sweat de Engenharia Informática guarda, para quê e durante quanto tempo.",
};

const section = "flex flex-col gap-2";
const h2 = "text-base font-semibold text-heading";

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
      <article className="flex w-full max-w-2xl animate-rise flex-col gap-6 rounded-2xl border border-line bg-surface/90 p-6 text-sm leading-relaxed sm:p-8 text-muted shadow-sm backdrop-blur">
        <header>
          <Link href="/" className="text-xs font-medium text-accent hover:underline">
            ← Voltar à votação
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-heading">Privacidade</h1>
          <p className="mt-1">
            Esta votação é organizada pelos estudantes de Engenharia Informática do ISEP para escolher a sweat do curso.
            Guardamos o mínimo possível e só para que cada pessoa vote uma vez.
          </p>
        </header>

        <section className={section}>
          <h2 className={h2}>O que guardamos quando votas</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">O teu voto:</strong> a cor, o design e a data e hora.
            </li>
            <li>
              <strong className="text-foreground">Uma identificação anónima do dispositivo:</strong> um código (hash)
              calculado no teu browser a partir de características técnicas, como o tipo de browser e o ecrã. Não
              inclui o teu nome, email nem número de estudante. Serve só para impedir que o mesmo dispositivo vote mais
              do que uma vez.
            </li>
            <li>
              <strong className="text-foreground">No teu browser (localStorage):</strong> esse código e uma marca a
              dizer que já votaste. Ficam apenas no teu dispositivo e podes apagá-los limpando os dados deste site.
            </li>
          </ul>
          <p>Não usamos cookies de publicidade nem de estatísticas, e não pedimos conta nem login para votar.</p>
        </section>

        <section className={section}>
          <h2 className={h2}>Proteção contra bots</h2>
          <p>
            Para que os resultados não sejam manipulados por programas automáticos, o site usa o BotID da Vercel, uma
            verificação invisível que corre no teu browser e analisa sinais técnicos do pedido. Esses dados são tratados
            pela Vercel apenas para esse fim.
          </p>
        </section>

        <section className={section}>
          <h2 className={h2}>Durante quanto tempo</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              A identificação do dispositivo só é precisa enquanto a votação está aberta. Até 30 dias depois do fecho é
              substituída por um valor sem qualquer ligação ao dispositivo, e o voto fica completamente anónimo.
            </li>
            <li>Os votos anónimos (cor, design, data e hora) são guardados como registo do resultado.</li>
          </ul>
        </section>

        <section className={section}>
          <h2 className={h2}>Mensagens de contacto</h2>
          <p>
            Se nos escreveres pela página de contacto, guardamos o nome (se o indicares), o email, o assunto, a mensagem
            e a data. Servem só para te responder e são apagados automaticamente ao fim de 90 dias, ou antes, quando o
            assunto fica resolvido.
          </p>
        </section>

        <section className={section}>
          <h2 className={h2}>Área de administração</h2>
          <p>
            Na área reservada à organização, registamos o endereço IP e o browser de cada tentativa de login, para
            proteger o acesso (por exemplo, bloquear um IP depois de várias tentativas erradas). Estes registos são
            apagados automaticamente ao fim de 90 dias.
          </p>
        </section>

        <section className={section}>
          <h2 className={h2}>Quem tem acesso</h2>
          <p>
            Só a organização da votação vê os votos, e os resultados são divulgados apenas em totais. Os dados ficam
            alojados na Vercel (o site) e na Neon (a base de dados, num servidor na União Europeia, em Frankfurt).
          </p>
        </section>

        <section className={section}>
          <h2 className={h2}>Os teus direitos</h2>
          <p>
            Ao abrigo do RGPD, podes pedir acesso, correção ou eliminação dos teus dados, ou opor-te ao seu tratamento,
            enviando uma mensagem à organização da votação pela{" "}
            <Link href="/contacto" className="text-accent underline underline-offset-2 hover:text-accent-hover">
              página de contacto
            </Link>{" "}
            (assunto &quot;Pedido sobre os meus dados&quot;). Também podes apresentar reclamação à Comissão Nacional de
            Proteção de Dados (CNPD).
          </p>
        </section>
      </article>
    </main>
  );
}
