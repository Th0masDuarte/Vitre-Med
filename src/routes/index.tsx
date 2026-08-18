import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import {
  MapPin,
  Crosshair,
  AlertCircle,
  ExternalLink,
  Phone,
  Globe,
  Star,
  Hospital as HospitalIcon,
} from "lucide-react";

import { findHospitals } from "../lib/hospitals.functions";
import type { Hospital } from "../lib/hospitals.server";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hospitais Perto de Mim" },
      {
        name: "description",
        content:
          "Encontre hospitais próximos da sua localização atual, com nome, endereço, fotos, telefone e avaliações.",
      },
      { property: "og:title", content: "Hospitais Perto de Mim" },
      {
        property: "og:description",
        content:
          "Encontre hospitais próximos da sua localização atual, com nome, endereço, fotos, telefone e avaliações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function geoErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão negada. Libere o acesso à localização no navegador.";
    case error.POSITION_UNAVAILABLE:
      return "Não foi possível obter a localização no momento.";
    case error.TIMEOUT:
      return "A solicitação de localização demorou demais.";
    default:
      return "Erro desconhecido ao obter a localização.";
  }
}

const RADIUS_OPTIONS = [2000, 5000, 10000];

function Index() {
  const search = useServerFn(findHospitals);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5000);

  const run = useCallback(
    (nextRadius: number) => {
      if (!navigator.geolocation) {
        setError("Seu navegador não suporta geolocalização.");
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });
          try {
            const result = await search({
              data: { latitude: lat, longitude: lon, radius: nextRadius },
            });
            setHospitals(result);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha na busca.");
            setHospitals(null);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setError(geoErrorMessage(err));
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    },
    [search],
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HospitalIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Hospitais perto de mim
            </h1>
            <p className="text-sm text-muted-foreground">
              Busca com Google Maps a partir da sua localização
            </p>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRadius(r);
                  if (coords) run(r);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  radius === r
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {r / 1000} km
              </button>
            ))}
          </div>

          <button
            onClick={() => run(radius)}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Buscando...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                {hospitals ? "Buscar novamente" : "Buscar hospitais próximos"}
              </>
            )}
          </button>

          {coords && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Sua posição: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
            </p>
          )}
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {hospitals && hospitals.length === 0 && !loading && (
          <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            Nenhum hospital encontrado nesse raio. Tente aumentar a distância.
          </p>
        )}

        {hospitals && hospitals.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hospitals.length} hospital(is) encontrados
            </p>
            {hospitals.map((h) => (
              <article
                key={h.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {h.photoUrl ? (
                  <img
                    src={h.photoUrl}
                    alt={`Foto de ${h.name}`}
                    loading="lazy"
                    className="h-44 w-full bg-muted object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center bg-muted text-muted-foreground">
                    <HospitalIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold text-card-foreground">{h.name}</h2>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {h.distanceKm < 1
                        ? `${Math.round(h.distanceKm * 1000)} m`
                        : `${h.distanceKm.toFixed(1)} km`}
                    </span>
                  </div>

                  <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {h.address}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    {typeof h.rating === "number" && (
                      <span className="inline-flex items-center gap-1 text-card-foreground">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {h.rating.toFixed(1)}
                        {h.userRatingCount ? (
                          <span className="text-muted-foreground">({h.userRatingCount})</span>
                        ) : null}
                      </span>
                    )}
                    {typeof h.openNow === "boolean" && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          h.openNow
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {h.openNow ? "Aberto agora" : "Fechado"}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {h.phone && (
                      <a
                        href={`tel:${h.phone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        <Phone className="h-4 w-4" />
                        {h.phone}
                      </a>
                    )}
                    {h.website && (
                      <a
                        href={h.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        <Globe className="h-4 w-4" />
                        Site
                      </a>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Como chegar
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Dados: Google Maps Places API. Localização: Geolocation API do navegador.
        </p>
      </div>
    </main>
  );
}
