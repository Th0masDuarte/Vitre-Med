import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  Heart,
  Loader2,
  Lock,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import logoAsset from "@/assets/vitre-med-logo.png.asset.json";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { formatCep } from "@/lib/use-profile";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/entrar")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | Vitre-Med" },
      {
        name: "description",
        content:
          "Acesse o Vitre-Med com Google ou e-mail e senha para salvar hospitais favoritos e acompanhar seus agendamentos.",
      },
      { property: "og:title", content: "Entrar ou criar conta | Vitre-Med" },
      {
        property: "og:description",
        content: "Entre com Google ou e-mail e senha e use o Vitre-Med.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const benefits = [
  { icon: Heart, text: "Salve hospitais e clínicas favoritos" },
  { icon: CalendarCheck, text: "Acompanhe seus agendamentos" },
  { icon: MapPin, text: "Use seu CEP como endereço padrão na busca" },
];

const field =
  "w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [busy, setBusy] = useState(false);

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (senha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (mode === "criar") {
      if (nome.trim().length < 2 || sobrenome.trim().length < 2) {
        toast.error("Informe nome e sobrenome.");
        return;
      }
      if (cep.replace(/\D/g, "").length !== 8) {
        toast.error("Informe um CEP válido (8 dígitos).");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome: nome.trim(), sobrenome: sobrenome.trim(), cep: formatCep(cep) },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme seu e-mail para entrar.");
          setMode("entrar");
          return;
        }
        toast.success("Conta criada com sucesso.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: mail,
          password: senha,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
      void navigate({ to: "/", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      toast.error(
        /invalid login credentials/i.test(message)
          ? "E-mail ou senha incorretos."
          : /already registered|already been registered/i.test(message)
            ? "Este e-mail já tem conta. Faça login."
            : message,
      );
    } finally {
      setBusy(false);
    }
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
                {mode === "entrar" ? "Entrar na sua conta" : "Criar sua conta"}
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
          <div className="mb-5 flex rounded-full border border-border p-1">
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou com e-mail
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "criar" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                    Nome
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Maria"
                      autoComplete="given-name"
                      className={field}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                    Sobrenome
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      placeholder="Silva"
                      autoComplete="family-name"
                      className={field}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@gmail.com"
                  type="email"
                  autoComplete="email"
                  className={field}
                />
              </div>
            </div>

            {mode === "criar" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">
                  CEP (endereço padrão)
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={cep}
                    onChange={(e) => setCep(formatCep(e.target.value))}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className={field}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Senha</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  autoComplete={mode === "criar" ? "new-password" : "current-password"}
                  className={field}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <ul className="mt-6 space-y-3 border-t border-border pt-6">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Você pode continuar usando a busca de unidades sem entrar.
        </p>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.44-1.7 4.22-5.5 4.22A6.32 6.32 0 0 1 12 5.68c1.77 0 2.96.76 3.64 1.4l2.48-2.39A9.7 9.7 0 0 0 12 2a10 10 0 1 0 0 20c5.77 0 9.58-4.06 9.58-9.77 0-.66-.07-1.16-.16-1.66H12Z"
      />
    </svg>
  );
}
