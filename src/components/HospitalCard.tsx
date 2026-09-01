import {
  MapPin,
  ExternalLink,
  Phone,
  Globe,
  Star,
  CalendarPlus,
  Copy,
  Heart,
  Hospital as HospitalIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { Hospital } from "@/lib/hospitals.server";
import { categoryOf, formatDistance, isUpa } from "@/lib/hospital-utils";
import { useFavorites } from "@/lib/use-favorites";

export const outlineButton =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent";

export function HospitalCard({
  hospital: h,
  onSchedule,
}: {
  hospital: Hospital;
  onSchedule: (hospital: Hospital) => void;
}) {
  const upa = isUpa(h);
  const { isFavorite, toggle, enabled: canFavorite } = useFavorites();
  const favorited = isFavorite(h.id);

  function handleFavorite() {
    if (!canFavorite) {
      toast.info("Entre na sua conta para salvar favoritos.");
      return;
    }
    void toggle(h)
      .then((added) =>
        toast.success(added ? "Salvo nos favoritos." : "Removido dos favoritos."),
      )
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
      );
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-shadow hover:shadow-elegant">
      {h.photoUrl ? (
        <img
          src={h.photoUrl}
          alt={`Foto de ${h.name}`}
          loading="lazy"
          className="h-40 w-full bg-muted object-cover"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground">
          <HospitalIcon className="h-8 w-8" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold leading-snug text-card-foreground">{h.name}</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {categoryOf(h)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {formatDistance(h.distanceKm)}
          </span>
        </div>

        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {h.address}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
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
                h.openNow ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
              }`}
            >
              {h.openNow ? "Aberto agora" : "Fechado"}
            </span>
          )}
          {upa && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Atendimento por ordem de chegada
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {!upa && (
            <button
              onClick={() => onSchedule(h)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CalendarPlus className="h-4 w-4" />
              Agendar
            </button>
          )}
          {!upa && h.phone && (
            <a href={`tel:${h.phone.replace(/\s/g, "")}`} className={outlineButton}>
              <Phone className="h-4 w-4" />
              Ligar
            </a>
          )}
          {!upa && h.website && (
            <a href={h.website} target="_blank" rel="noopener noreferrer" className={outlineButton}>
              <Globe className="h-4 w-4" />
              Site
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              const hasCoords =
                Number.isFinite(h.lat) && Number.isFinite(h.lon) && (h.lat !== 0 || h.lon !== 0);
              const destination = hasCoords
                ? `${h.lat},${h.lon}`
                : encodeURIComponent(`${h.name} ${h.address ?? ""}`.trim());
              const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${
                ""
              }`;
              const win = window.open(url, "_blank", "noopener,noreferrer");
              if (!win) window.location.href = url;
            }}
            className={outlineButton}
          >
            <ExternalLink className="h-4 w-4" />
            Rota
          </button>

          <button
            onClick={() => {
              void navigator.clipboard
                .writeText(`${h.name} — ${h.address}`)
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
            title={favorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
            className={`${outlineButton} ${favorited ? "border-primary/40 text-primary" : ""}`}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-primary text-primary" : ""}`} />
            {favorited ? "Favorito" : "Favoritar"}
          </button>
        </div>
      </div>
    </article>
  );
}
