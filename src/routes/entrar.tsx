import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import logoAsset from "@/assets/vitre-med-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/entrar")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar | Vitre-Med" },
      {
        name: "description",
        content:
          "Acesse sua conta Vitre-Med para salvar hospitais favoritos e acompanhar seus agendamentos de consultas.",
      },
      { property: "og:title", content: "Entrar | Vitre-Med" },
      {
        property: "og:description",
        content: "Entre com e-mail e senha ou com sua conta Google para usar o Vitre-Med.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres").max(72),
});

const signupSchema = schema.extend({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  telefone: z
    .string()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um telefone com DDD"),
  cep: z.string().refine((v) => v.replace(/\D/g, "").length === 8, "Informe um CEP válido"),
});

const field =
  "w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [cepInfo, setCepInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  async function lookupCep(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepInfo(null);
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        setCepInfo(null);
        return;
      }
      setCepInfo(
        [data.logradouro, data.bairro, data.localidade && `${data.localidade} - ${data.uf}`]
          .filter(Boolean)
          .join(", "),
      );
    } catch {
      setCepInfo(null);
    }
  }


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed =
      mode === "signup"
        ? signupSchema.safeParse({ email, password, nome, telefone, cep })
        : schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: nome.trim(),
              telefone: formatPhone(telefone),
              cep: formatCep(cep),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Confirme seu e-mail para ativar a conta.");
          return;
        }
        toast.success("Conta criada!");
      } else {

        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível continuar";
      toast.error(
        message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : message.includes("already registered")
            ? "Este e-mail já possui conta. Faça login."
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/", replace: true });
  }

  async function handleReset() {
    const parsed = schema.shape.email.safeParse(email);
    if (!parsed.success) {
      toast.error("Informe seu e-mail para redefinir a senha.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link de redefinição para seu e-mail.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-gradient-primary px-4 pb-24 pt-8 text-primary-foreground">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Vitre-Med"
              className="h-11 w-11 rounded-xl bg-background/20 object-contain p-1"
            />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "signin" ? "Entrar na sua conta" : "Criar sua conta"}
              </h1>
              <p className="text-sm text-primary-foreground/85">
                Seus agendamentos e unidades favoritas em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-16 w-full max-w-md px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          {sent ? (
            <div className="space-y-3 text-center">
              <h2 className="text-lg font-semibold text-foreground">Confirme seu e-mail</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para <strong>{email}</strong>. Depois de
                confirmar, volte aqui para entrar.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setMode("signin");
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  ou
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm text-foreground">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className={field}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm text-foreground">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={field}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {mode === "signin" ? "Entrar" : "Criar conta"}
                </button>
              </form>

              <div className="mt-5 flex flex-col gap-2 text-center text-sm">
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Esqueci minha senha
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary hover:underline"
                >
                  {mode === "signin"
                    ? "Não tem conta? Criar agora"
                    : "Já tenho conta. Entrar"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.2-3.2-.5-4.7H24v9.1h12.6c-.5 2.9-2.2 5.3-4.6 7l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.3z"
      />
      <path
        fill="#FBBC05"
        d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.2 0 11.5-2 15.5-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.4 0-11.8-3.8-13.7-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
