import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Crosshair, Search, Hospital as HospitalIcon } from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { HospitalCard } from "@/components/HospitalCard";
import type { Hospital } from "@/lib/hospitals.server";
import { useHospitalSearch } from "@/lib/use-hospital-search";
import { readCachedPosition } from "@/lib/geolocation";
import { useAppointments } from "@/lib/appointments";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Vitre-Med | Hospitais, clínicas e UPAs perto de você" },
      {
        name: "description",
        content:
          "Encontre hospitais, clínicas, maternidades e UPAs próximas usando sua localização, veja rota, telefone e agende consultas.",
      },
      { property: "og:title", content: "Vitre-Med | Hospitais e UPAs perto de você" },
      {
        property: "og:description",
        content:
          "Unidades de saúde próximas com rota, telefone, avaliação e agendamento em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  const { hospitals, origin, loading, locating, error, searchNearMe } = useHospitalSearch();
  const [hasCached, setHasCached] = useState(false);
  const { items: appointments } = useAppointments();

  useEffect(() => {
    setHasCached(readCachedPosition() !== null);
  }, []);

  useEffect(() => {
    if (hasCached) void searchNearMe(5000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCached]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />

      <div className="bg-gradient-primary px-4 pb-20 pt-10 text-primary-foreground">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Unidades de saúde perto de você
          </h1>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/85">
            Hospitais, clínicas, maternidades e UPAs com rota, contato e agendamento.
            {appointments.length > 0 && ` Você tem ${appointments.length} agendamento(s).`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => void searchNearMe(5000)}
              disabled={loading || locating}
              className="inline-flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Crosshair className="h-4 w-4" />
              {locating ? "Localizando..." : loading ? "Buscando..." : "Usar minha localização"}
            </button>
            <Link
              to="/buscar"
              className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-primary-foreground/25"
            >
              <Search className="h-4 w-4" />
              Busca com filtros
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-12 w-full max-w-5xl px-4 pb-16">
        {origin && (
          <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground shadow-card">
            A partir de: {origin.label}
            {origin.accuracy ? ` · precisão ~${Math.round(origin.accuracy)} m` : ""}
          </p>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
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

        {!loading && !locating && hospitals && (
          <>
            <p className="mt-8 mb-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{hospitals.length}</span> unidade(s)
              num raio de 5 km
            </p>
            {hospitals.length === 0 ? (
              <p className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                Nada encontrado por aqui. Use a busca com filtros para ampliar o raio.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {hospitals.slice(0, 12).map((h) => (
                  <HospitalCard key={h.id} hospital={h} />
                ))}
              </div>
            )}
            {hospitals.length > 12 && (
              <div className="mt-6 text-center">
                <Link to="/buscar" className="text-sm font-semibold text-primary">
                  Ver todas as {hospitals.length} unidades na busca com filtros
                </Link>
              </div>
            )}
          </>
        )}

        {!hospitals && !loading && !locating && !error && (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-10 text-center shadow-card">
            <HospitalIcon className="h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">
              Encontre atendimento agora
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Toque em "Usar minha localização" para ver as unidades mais próximas, ou faça uma
              busca por cidade e bairro.
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Dados: Google Maps Places API. Localização: Geolocation API do navegador.
        </p>
      </main>

    </div>
  );
}
