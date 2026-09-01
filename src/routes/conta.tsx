import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { outlineButton } from "@/components/HospitalCard";
import { useFavorites } from "@/lib/use-favorites";
import { formatCep, formatPhone, useProfile } from "@/lib/use-profile";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/conta")({
  component: ContaPage,
  head: () => ({
    meta: [
      { title: "Minha conta e favoritos | Vitre-Med" },
      {
        name: "description",
        content:
          "Atualize seus dados pessoais e gerencie os hospitais e clínicas favoritos da sua conta Vitre-Med.",
      },
      { property: "og:title", content: "Minha conta e favoritos | Vitre-Med" },
      {
        property: "og:description",
        content: "Edite suas informações pessoais e veja suas unidades de saúde favoritas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const field =
  "w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";

const tabs = [
  { key: "perfil", label: "Informações pessoais" },
  { key: "favoritos", label: "Favoritos" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function ContaPage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const [tab, setTab] = useState<TabKey>("perfil");

  useEffect(() => {
    if (!sessionLoading && !user) void navigate({ to: "/entrar", replace: true });
  }, [sessionLoading, user, navigate]);

  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <AppNav />
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "perfil" && <PerfilTab email={user.email ?? ""} />}
          {tab === "favoritos" && <FavoritosTab />}
        </div>
      </main>
    </div>
  );
}

function PerfilTab({ email }: { email: string }) {
  const { profile, loading, save } = useProfile();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNome(profile.nome);
    setTelefone(formatPhone(profile.telefone));
    setCep(formatCep(profile.cep));
  }, [profile]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 3) {
      toast.error("Informe seu nome completo.");
      return;
    }
    setSaving(true);
    try {
      await save({ nome: nome.trim(), telefone, cep });
      toast.success("Informações atualizadas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl border border-border bg-card" />;
  }

  return (
    <form
      onSubmit={handleSave}
      className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-card-foreground">E-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={email} disabled className={`${field} opacity-70`} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          O e-mail de acesso não pode ser alterado aqui.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-card-foreground">
          Nome completo
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-card-foreground">Telefone</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
              placeholder="(11) 90000-0000"
              inputMode="tel"
              className={field}
            />
          </div>
        </div>
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
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar alterações
      </button>
    </form>
  );
}

function FavoritosTab() {
  const { favorites, loading, remove } = useFavorites();

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl border border-border bg-card" />;
  }

  if (favorites.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Você ainda não salvou nenhuma unidade de saúde.
        </p>
        <Link
          to="/buscar"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Buscar unidades
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {favorites.map((f) => (
        <li
          key={f.id}
          className="rounded-3xl border border-border bg-card p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-card-foreground">{f.name}</h2>
              {f.address && (
                <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {f.address}
                </p>
              )}
              {typeof f.rating === "number" && (
                <span className="mt-2 inline-flex items-center gap-1 text-sm text-card-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {f.rating.toFixed(1)}
                </span>
              )}
            </div>
            <button
              type="button"
              title="Remover dos favoritos"
              onClick={() => {
                void remove(f.id)
                  .then(() => toast.success("Removido dos favoritos."))
                  .catch(() => toast.error("Não foi possível remover."));
              }}
              className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const destination =
                  f.lat != null && f.lng != null
                    ? `${f.lat},${f.lng}`
                    : encodeURIComponent(`${f.name} ${f.address ?? ""}`.trim());
                const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                const win = window.open(url, "_blank", "noopener,noreferrer");
                if (!win) window.location.href = url;
              }}
              className={outlineButton}
            >
              <ExternalLink className="h-4 w-4" />
              Rota
            </button>
            {f.phone && (
              <a href={`tel:${f.phone.replace(/\s/g, "")}`} className={outlineButton}>
                <Phone className="h-4 w-4" />
                Ligar
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
