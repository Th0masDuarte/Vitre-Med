import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, Heart, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import logoAsset from "@/assets/vitre-med-logo.png.asset.json";
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
          "Acesse o Vitre-Med com sua conta Google para salvar hospitais favoritos e acompanhar seus agendamentos.",
      },
      { property: "og:title", content: "Entrar | Vitre-Med" },
      {
        property: "og:description",
        content: "Entre em um toque com sua conta Google e use o Vitre-Med.",
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

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [busy, setBusy] = useState(false);

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
              <h1 className="text-2xl font-semibold tracking-tight">Entrar na sua conta</h1>
              <p className="text-sm text-primary-foreground/85">
                Seus agendamentos e unidades favoritas em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-16 w-full max-w-md px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continuar com Google
          </button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            O acesso é feito apenas com sua conta Google — sem senhas nem códigos por e-mail.
          </p>

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
