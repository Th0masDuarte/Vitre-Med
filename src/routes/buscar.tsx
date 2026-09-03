import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, Crosshair, Home, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { HospitalCard, outlineButton } from "@/components/HospitalCard";
import { field } from "@/components/ScheduleDialog";
import type { Hospital } from "@/lib/hospitals.server";
import { categoryOf } from "@/lib/hospital-utils";
import { useHospitalSearch } from "@/lib/use-hospital-search";
import { formatCep, useProfile } from "@/lib/use-profile";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/buscar")({
  component: BuscarPage,
  head: () => ({
    meta: [
      { title: "Buscar hospitais com filtros | Vitre-Med" },
      {
        name: "description",
        content:
          "Busca avançada de hospitais, clínicas, maternidades e UPAs: filtre por tipo, raio, avaliação, horário de funcionamento e ordene por distância.",
      },
      { property: "og:title", content: "Buscar hospitais com filtros | Vitre-Med" },
      {
        property: "og:description",
        content:
          "Filtre unidades de saúde por tipo, raio, nota e horário e encontre a mais próxima de você.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const RADIUS_OPTIONS = [2000, 5000, 10000, 25000];
const CATEGORIES = ["Hospital", "Clínica", "Maternidade", "UPA / Pronto atendimento"];
type SortKey = "distance" | "rating" | "name";

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
    active
      ? "bg-primary text-primary-foreground shadow-elegant"
      : "border border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
  }`;

function BuscarPage() {
  const { hospitals, origin, loading, locating, error, searchNearMe, searchAddress } =
    useHospitalSearch();

  const [radius, setRadius] = useState(5000);
  const [address, setAddress] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [withPhone, setWithPhone] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxKm, setMaxKm] = useState(0);
  const [cats, setCats] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("distance");
  const { user } = useSession();
  const { profile, save } = useProfile();
  const [cepOpen, setCepOpen] = useState(false);
  const [newCep, setNewCep] = useState("");

  const toggleCat = (cat: string) =>
    setCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  const visible = useMemo(() => {
    if (!hospitals) return null;
    const term = nameFilter.trim().toLowerCase();
    const filtered = hospitals.filter((h) => {
      if (term && !`${h.name} ${h.address}`.toLowerCase().includes(term)) return false;
      if (openOnly && h.openNow !== true) return false;
      if (withPhone && !h.phone) return false;
      if (minRating > 0 && (h.rating ?? 0) < minRating) return false;
      if (maxKm > 0 && h.distanceKm > maxKm) return false;
      if (cats.length > 0 && !cats.includes(categoryOf(h))) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0) || a.distanceKm - b.distanceKm;
      if (sortBy === "name") return a.name.localeCompare(b.name, "pt-BR");
      return a.distanceKm - b.distanceKm;
    });
  }, [hospitals, nameFilter, openOnly, withPhone, minRating, maxKm, cats, sortBy]);

  const resetFilters = () => {
    setNameFilter("");
    setOpenOnly(false);
    setWithPhone(false);
    setMinRating(0);
    setMaxKm(0);
    setCats([]);
    setSortBy("distance");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Busca avançada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesquise por endereço ou pela sua localização e refine com os filtros.
        </p>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row">
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void searchAddress(radius, address);
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Endereço, bairro ou cidade"
                  className={`${field} pl-9`}
                />
              </div>
              <button type="submit" disabled={loading} className={outlineButton}>
                Buscar
              </button>
            </form>
            <button
              onClick={() => void searchNearMe(radius)}
              disabled={loading || locating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Crosshair className="h-4 w-4" />
              {locating ? "Localizando..." : "Perto de mim"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {user ? (
              profile?.cep ? (
                <button
                  type="button"
                  onClick={() => {
                    setAddress(profile.cep);
                    void searchAddress(radius, profile.cep);
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                >
                  <Home className="h-4 w-4" />
                  Endereço padrão ({profile.cep})
                </button>
              ) : cepOpen ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (newCep.replace(/\D/g, "").length !== 8) {
                      toast.error("Informe um CEP válido.");
                      return;
                    }
                    try {
                      await save({ cep: newCep });
                      setCepOpen(false);
                      setAddress(newCep);
                      void searchAddress(radius, newCep);
                      toast.success("Endereço padrão salvo!");
                    } catch {
                      toast.error("Não foi possível salvar seu CEP.");
                    }
                  }}
                >
                  <input
                    value={newCep}
                    onChange={(e) => setNewCep(formatCep(e.target.value))}
                    placeholder="Seu CEP"
                    inputMode="numeric"
                    className={`${field} max-w-[10rem]`}
                  />
                  <button type="submit" className={outlineButton}>
                    Salvar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCepOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Home className="h-4 w-4" />
                  Definir endereço padrão
                </button>
              )
            ) : (
              <Link
                to="/entrar"
                className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                Entre para usar seu endereço padrão
              </Link>
            )}
          </div>



          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Raio
            </span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRadius(r);
                  if (origin) {
                    if (address.trim().length >= 3) void searchAddress(r, address);
                    else void searchNearMe(r);
                  }
                }}
                className={chip(radius === r)}
              >
                {r / 1000} km
              </button>
            ))}
          </div>

          {origin && (
            <p className="mt-3 text-xs text-muted-foreground">
              A partir de: {origin.label}
              {origin.accuracy ? ` · precisão ~${Math.round(origin.accuracy)} m` : ""}
            </p>
          )}
        </section>

        <section className="mt-4 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
            </h2>
            <button onClick={resetFilters} className="text-xs font-medium text-primary">
              Limpar filtros
            </button>
          </div>

          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Filtrar pelo nome ou endereço"
            className={field}
          />

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => toggleCat(c)} className={chip(cats.includes(c))}>
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setOpenOnly((v) => !v)} className={chip(openOnly)}>
              Abertos agora
            </button>
            <button onClick={() => setWithPhone((v) => !v)} className={chip(withPhone)}>
              Com telefone
            </button>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            {[0, 3, 4, 4.5].map((r) => (
              <button key={r} onClick={() => setMinRating(r)} className={chip(minRating === r)}>
                {r === 0 ? "Qualquer nota" : `${r}+`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Até
            </span>
            {[0, 1, 3, 5, 10].map((km) => (
              <button key={km} onClick={() => setMaxKm(km)} className={chip(maxKm === km)}>
                {km === 0 ? "Sem limite" : `${km} km`}
              </button>
            ))}
          </div>

        </section>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {(loading || locating) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-3xl border border-border bg-muted/50" />
            ))}
          </div>
        )}

        {!loading && hospitals && visible && (
          <>
            <p className="mt-8 mb-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{visible.length}</span> de{" "}
              {hospitals.length} unidade(s)
            </p>
            {visible.length === 0 ? (
              <p className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                Nenhum resultado com esses filtros.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {visible.map((h) => (
                  <HospitalCard key={h.id} hospital={h} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

    </div>
  );
}
