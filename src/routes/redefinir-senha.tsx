import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Redefinir senha | Vitre-Med" },
      {
        name: "description",
        content: "Defina uma nova senha para acessar sua conta Vitre-Med.",
      },
      { property: "og:title", content: "Redefinir senha | Vitre-Med" },
      {
        property: "og:description",
        content: "Defina uma nova senha para acessar sua conta Vitre-Med.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada!");
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Definir nova senha
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma nova senha para sua conta Vitre-Med.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {[
            { id: "password", label: "Nova senha", value: password, set: setPassword },
            { id: "confirm", label: "Confirmar senha", value: confirm, set: setConfirm },
          ].map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="mb-1.5 block text-sm text-foreground">
                {f.label}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id={f.id}
                  type="password"
                  autoComplete="new-password"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar nova senha
          </button>
        </form>

        <Link
          to="/entrar"
          className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
