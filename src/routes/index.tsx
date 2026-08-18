import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import {
  MapPin,
  Crosshair,
  AlertCircle,
  ExternalLink,
  Phone,
  Globe,
  Star,
  Search,
  CalendarPlus,
  CalendarCheck,
  Copy,
  Hospital as HospitalIcon,
} from "lucide-react";
import { toast } from "sonner";

import { findHospitals, findHospitalsByAddress } from "../lib/hospitals.functions";
import type { Hospital } from "../lib/hospitals.server";
import { addAppointment, useAppointments } from "../lib/appointments";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Hospitais Perto de Mim | Buscar e agendar" },
      {
        name: "description",
        content:
          "Encontre hospitais, clínicas, maternidades e UPAs próximas por localização ou endereço, filtre por avaliação e horário e agende consultas.",
      },
      { property: "og:title", content: "Hospitais Perto de Mim | Buscar e agendar" },
      {
        property: "og:description",
        content:
          "Encontre hospitais, clínicas, maternidades e UPAs próximas por localização ou endereço, filtre por avaliação e horário e agende consultas.",
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

const RADIUS_OPTIONS = [2000, 5000, 10000, 25000];
type SortKey = "distance" | "rating";

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
    active
      ? "bg-primary text-primary-foreground shadow-elegant"
      : "border border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
  }`;

const outlineButton =
  "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent";

const field =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/40";

function Index() {
  const searchNear = useServerFn(findHospitals);
  const searchByAddress = useServerFn(findHospitalsByAddress);

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5000);
  const [address, setAddress] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("distance");
  const [scheduling, setScheduling] = useState<Hospital | null>(null);

  const appointments = useAppointments();

  const runNear = useCallback(
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
          setOriginLabel("Sua localização atual");
          try {
            const result = await searchNear({
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
    [searchNear],
  );

  const runAddress = useCallback(
    async (nextRadius: number, query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 3) {
        setError("Digite um endereço, bairro ou cidade com pelo menos 3 letras.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await searchByAddress({
          data: { address: trimmed, radius: nextRadius },
        });
        setCoords({ lat: result.place.latitude, lon: result.place.longitude });
        setOriginLabel(result.place.formattedAddress);
        setHospitals(result.hospitals);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha na busca por endereço.");
        setHospitals(null);
      } finally {
        setLoading(false);
      }
    },
    [searchByAddress],
  );

  const rerun = useCallback(
    (nextRadius: number) => {
      if (address.trim().length >= 3) void runAddress(nextRadius, address);
      else runNear(nextRadius);
    },
    [address, runAddress, runNear],
  );

  const visible = useMemo(() => {
    if (!hospitals) return null;
    const term = nameFilter.trim().toLowerCase();
    const filtered = hospitals.filter((h) => {
      if (term && !`${h.name} ${h.address}`.toLowerCase().includes(term)) return false;
      if (openOnly && h.openNow !== true) return false;
      if (minRating > 0 && (h.rating ?? 0) < minRating) return false;
      return true;
    });
    return [...filtered].sort((a, b) =>
      sortBy === "rating"
        ? (b.rating ?? 0) - (a.rating ?? 0) || a.distanceKm - b.distanceKm
        : a.distanceKm - b.distanceKm,
    );
  }, [hospitals, nameFilter, openOnly, minRating, sortBy]);

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="bg-gradient-primary px-4 pb-24 pt-8 text-primary-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
              <HospitalIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Hospitais perto de mim
              </h1>
              <p className="text-sm text-primary-foreground/80">
                Hospitais, clínicas, maternidades e UPAs — busque, filtre e agende
              </p>
            </div>
          </div>
          <Link
            to="/agendamentos"
            className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-medium text-primary-foreground backdrop-blur transition-colors hover:bg-primary-foreground/25"
          >
            <CalendarCheck className="h-4 w-4" />
            Agendamentos
            {appointments.length > 0 && (
              <span className="rounded-full bg-primary-foreground/25 px-2 py-0.5 text-xs font-semibold">
                {appointments.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="mx-auto -mt-16 w-full max-w-5xl px-4">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row">
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void runAddress(radius, address);
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
              onClick={() => runNear(radius)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Buscando...
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4" />
                  {hospitals ? "Buscar novamente" : "Usar minha localização"}
                </>
              )}
            </button>
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
                  if (coords) rerun(r);
                }}
                className={chip(radius === r)}
              >
                {r / 1000} km
              </button>
            ))}
          </div>

          {originLabel && (
            <p className="mt-3 text-xs text-muted-foreground">
              A partir de: {originLabel}
              {coords ? ` (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})` : ""}
            </p>
          )}
        </section>

        {hospitals && hospitals.length > 0 && (
          <section className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-5 shadow-card">
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filtrar pelo nome ou endereço"
              className={field}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setOpenOnly((v) => !v)} className={chip(openOnly)}>
                Abertos agora
              </button>
              <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
              {[0, 3, 4, 4.5].map((r) => (
                <button key={r} onClick={() => setMinRating(r)} className={chip(minRating === r)}>
                  {r === 0 ? "Qualquer nota" : `${r}+`}
                </button>
              ))}
              <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
              <button onClick={() => setSortBy("distance")} className={chip(sortBy === "distance")}>
                Mais perto
              </button>
              <button onClick={() => setSortBy("rating")} className={chip(sortBy === "rating")}>
                Melhor avaliado
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-3xl border border-border bg-muted/50"
              />
            ))}
          </div>
        )}

        {hospitals && hospitals.length === 0 && !loading && (
          <p className="mt-6 rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            Nenhum hospital encontrado nesse raio. Tente aumentar a distância.
          </p>
        )}

        {visible && visible.length === 0 && hospitals && hospitals.length > 0 && (
          <p className="mt-6 rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            Nenhum resultado corresponde aos filtros selecionados.
          </p>
        )}

        {visible && visible.length > 0 && (
          <>
            <p className="mt-8 mb-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{visible.length}</span> de{" "}
              {hospitals?.length} unidade(s) exibida(s)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((h) => (
                <article
                  key={h.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-shadow hover:shadow-elegant"
                >
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
                      <h2 className="text-base font-semibold leading-snug text-card-foreground">
                        {h.name}
                      </h2>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {h.distanceKm < 1
                          ? `${Math.round(h.distanceKm * 1000)} m`
                          : `${h.distanceKm.toFixed(1)} km`}
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
                            h.openNow
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {h.openNow ? "Aberto agora" : "Fechado"}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <button
                        onClick={() => setScheduling(h)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Agendar
                      </button>
                      {h.phone && (
                        <a href={`tel:${h.phone.replace(/\s/g, "")}`} className={outlineButton}>
                          <Phone className="h-4 w-4" />
                          Ligar
                        </a>
                      )}
                      {h.website && (
                        <a
                          href={h.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={outlineButton}
                        >
                          <Globe className="h-4 w-4" />
                          Site
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={outlineButton}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Rota
                      </a>
                      <button
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(`${h.name} — ${h.address}`)
                            .then(() => toast.success("Endereço copiado."))
                            .catch(() => toast.error("Não foi possível copiar."));
                        }}
                        className={outlineButton}
                        aria-label="Copiar endereço"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Dados: Google Maps Places API. Localização: Geolocation API do navegador.
        </p>
      </div>

      {scheduling && (
        <ScheduleDialog hospital={scheduling} onClose={() => setScheduling(null)} />
      )}
    </main>
  );
}

function ScheduleDialog({
  hospital,
  onClose,
}: {
  hospital: Hospital;
  onClose: () => void;
}) {
  const [patient, setPatient] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          addAppointment({
            hospitalName: hospital.name,
            address: hospital.address,
            phone: hospital.phone,
            mapsUrl: hospital.mapsUrl,
            patient: patient.trim(),
            specialty: specialty.trim(),
            date,
            time,
            notes: notes.trim(),
          });
          toast.success("Agendamento criado.");
          onClose();
        }}
        className="w-full max-w-md space-y-3 rounded-3xl border border-border bg-card p-6 shadow-elegant"
      >
        <h2 className="text-lg font-semibold text-card-foreground">Novo agendamento</h2>
        <p className="text-sm text-muted-foreground">{hospital.name}</p>

        <input
          required
          value={patient}
          onChange={(e) => setPatient(e.target.value)}
          placeholder="Nome do paciente"
          className={field}
        />
        <input
          required
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="Especialidade ou motivo"
          className={field}
        />
        <div className="flex gap-2">
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
          <input
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={field}
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações (opcional)"
          rows={3}
          className={field}
        />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={outlineButton}>
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CalendarPlus className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
