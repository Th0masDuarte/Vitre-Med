import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  Phone,
  Star,
  Accessibility,
} from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { outlineButton } from "@/components/HospitalCard";
import { ScheduleDialog } from "@/components/ScheduleDialog";
import { fetchPlaceDetails } from "@/lib/hospitals.functions";
import type { PlaceDetails } from "@/lib/hospitals.server";
import type { Hospital } from "@/lib/hospitals.server";
import { categoryOf, isUpa } from "@/lib/hospital-utils";
import { useFavorites } from "@/lib/use-favorites";

export const Route = createFileRoute("/clinica/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da unidade — Vitre-Med" },
      {
        name: "description",
        content:
          "Veja horários de funcionamento, endereço, telefone, avaliações e localização no mapa da unidade de saúde.",
      },
      { property: "og:title", content: "Detalhes da unidade — Vitre-Med" },
      {
        property: "og:description",
        content: "Horários, endereço, contato e mapa da unidade de saúde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetailsPage,
});

function toHospital(d: PlaceDetails): Hospital {
  return {
    id: d.id,
    name: d.name,
    address: d.address,
    phone: d.phone,
    website: d.website,
    rating: d.rating,
    userRatingCount: d.userRatingCount,
    openNow: d.openNow,
    lat: d.lat,
    lon: d.lon,
    distanceKm: 0,
    photoUrl: d.photoUrls[0],
    mapsUrl: d.mapsUrl,
  };
}

function DetailsPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const getDetails = useServerFn(fetchPlaceDetails);
  const [scheduling, setScheduling] = useState<Hospital | null>(null);
  const { isFavorite, toggle, enabled: canFavorite } = useFavorites();

  const { data, isLoading, error } = useQuery({
    queryKey: ["place-details", id],
    queryFn: () => getDetails({ data: { placeId: id } }),
    staleTime: 5 * 60 * 1000,
  });

  const upa = data ? isUpa(data) : false;
  const favorited = data ? isFavorite(data.id) : false;
  const mapKey = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;

  function handleFavorite() {
    if (!data) return;
    if (!canFavorite) {
      toast.info("Entre na sua conta para salvar favoritos.");
      return;
    }
    void toggle(toHospital(data))
      .then((added) =>
        toast.success(added ? "Salvo nos favoritos." : "Removido dos favoritos."),
      )
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
      );
  }

  function openRoute() {
    if (!data) return;
    const hasCoords = Number.isFinite(data.lat) && (data.lat !== 0 || data.lon !== 0);
    const destination = hasCoords
      ? `${data.lat},${data.lon}`
      : encodeURIComponent(`${data.name} ${data.address}`.trim());
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {isLoading && (
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Não foi possível carregar os detalhes."}
          </div>
        )}

        {data && (
          <>
            {data.photoUrls.length > 0 && (
              <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
                {data.photoUrls.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Foto ${i + 1} de ${data.name}`}
                    loading="lazy"
                    className="h-44 w-72 shrink-0 rounded-2xl bg-muted object-cover"
                  />
                ))}
              </div>
            )}

            <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {categoryOf(data)}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-card-foreground">{data.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {typeof data.rating === "number" && (
                  <span className="inline-flex items-center gap-1 text-card-foreground">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {data.rating.toFixed(1)}
                    {data.userRatingCount ? (
                      <span className="text-muted-foreground">
                        ({data.userRatingCount} avaliações)
                      </span>
                    ) : null}
                  </span>
                )}
                {typeof data.openNow === "boolean" && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      data.openNow
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {data.openNow ? "Aberto agora" : "Fechado"}
                  </span>
                )}
                {data.businessStatus === "CLOSED_TEMPORARILY" && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    Fechado temporariamente
                  </span>
                )}
                {data.accessibleEntrance && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    <Accessibility className="h-3.5 w-3.5" />
                    Entrada acessível
                  </span>
                )}
              </div>

              {data.summary && (
                <p className="mt-4 text-sm text-muted-foreground">{data.summary}</p>
              )}

              <p className="mt-4 flex items-start gap-2 text-sm text-card-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {data.address}
              </p>
              {data.phone && (
                <p className="mt-2 flex items-center gap-2 text-sm text-card-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {data.phone}
                  {data.internationalPhone && data.internationalPhone !== data.phone && (
                    <span className="text-muted-foreground">({data.internationalPhone})</span>
                  )}
                </p>
              )}
              {data.website && (
                <p className="mt-2 flex items-center gap-2 truncate text-sm">
                  <Globe className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-primary hover:underline"
                  >
                    {data.website}
                  </a>
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {!upa && (
                  <button
                    onClick={() => setScheduling(toHospital(data))}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Agendar
                  </button>
                )}
                {!upa && data.phone && (
                  <a href={`tel:${data.phone.replace(/\s/g, "")}`} className={outlineButton}>
                    <Phone className="h-4 w-4" />
                    Ligar
                  </a>
                )}
                {!upa && data.website && (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={outlineButton}
                  >
                    <Globe className="h-4 w-4" />
                    Site
                  </a>
                )}
                <button type="button" onClick={openRoute} className={outlineButton}>
                  <ExternalLink className="h-4 w-4" />
                  Rota
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(`${data.name} — ${data.address}`)
                      .then(() => toast.success("Endereço copiado."))
                      .catch(() => toast.error("Não foi possível copiar."));
                  }}
                  className={outlineButton}
                >
                  <Copy className="h-4 w-4" />
                  Copiar endereço
                </button>
                <button
                  type="button"
                  onClick={handleFavorite}
                  aria-pressed={favorited}
                  className={`${outlineButton} ${favorited ? "border-primary/40 text-primary" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${favorited ? "fill-primary text-primary" : ""}`} />
                  {favorited ? "Favorito" : "Favoritar"}
                </button>
                <a
                  href={data.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={outlineButton}
                >
                  <MapPin className="h-4 w-4" />
                  Ver no Google Maps
                </a>
              </div>
            </header>

            <section className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Horários de funcionamento
                </h2>
                {data.weekdayDescriptions.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {data.weekdayDescriptions.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Horários não informados. {upa ? "UPAs geralmente atendem 24h." : ""}
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
                <h2 className="p-6 pb-3 text-base font-semibold text-card-foreground">
                  Localização no mapa
                </h2>
                {mapKey && (data.lat !== 0 || data.lon !== 0) ? (
                  <iframe
                    title={`Mapa de ${data.name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-64 w-full border-0"
                    src={`https://www.google.com/maps/embed/v1/view?key=${mapKey}&center=${data.lat},${data.lon}&zoom=16`}
                  />
                ) : (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">
                    Mapa indisponível para esta unidade.
                  </p>
                )}
              </div>
            </section>

            {data.reviews.length > 0 && (
              <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-base font-semibold text-card-foreground">Avaliações</h2>
                <ul className="mt-4 space-y-4">
                  {data.reviews.map((r, i) => (
                    <li key={`${r.author ?? "anon"}-${i}`} className="border-t border-border pt-4 first:border-0 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-card-foreground">
                          {r.author ?? "Usuário"}
                        </span>
                        {typeof r.rating === "number" && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {r.rating}
                          </span>
                        )}
                        {r.relative && (
                          <span className="text-xs text-muted-foreground">{r.relative}</span>
                        )}
                      </div>
                      {r.text && <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.types.length > 0 && (
              <section className="mt-5 rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-base font-semibold text-card-foreground">Categorias</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.types.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-8 text-center">
              <Link to="/buscar" className="text-sm font-semibold text-primary">
                Voltar para a busca com filtros
              </Link>
            </div>
          </>
        )}
      </main>

      {scheduling && (
        <ScheduleDialog hospital={scheduling} onClose={() => setScheduling(null)} />
      )}
    </div>
  );
}
