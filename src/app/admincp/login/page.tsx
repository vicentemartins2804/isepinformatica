import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login · Admin",
  robots: { index: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/admincp/login">) {
  // Quem já tem sessão válida não precisa de voltar a fazer login.
  if (await getSession()) redirect("/admincp");
  const { from } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-rise rounded-2xl border border-line bg-surface/90 p-8 shadow-sm backdrop-blur">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-heading">Área reservada</h1>
          <p className="mt-1 text-sm text-muted">Acesso exclusivo à organização da votação.</p>
        </header>
        <LoginForm from={typeof from === "string" ? from : undefined} />
      </div>
    </main>
  );
}
