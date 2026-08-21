import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  MapPin,
  Phone,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { useSession } from "@/lib/use-session";
import {
  addAppointment,
  formatDateTime,
  isPast,
  isSoon,
  removeAppointment,
  updateAppointment,
  useAppointments,
  type Appointment,
} from "../lib/appointments";

export const Route = createFileRoute("/agendamentos")({
  component: AppointmentsPage,
  head: () => ({
    meta: [
      { title: "Meus agendamentos | Vitre-Med" },
      {
        name: "description",
        content:
          "Revise, adicione e exclua os agendamentos de consultas feitos nos hospitais encontrados.",
      },
      { property: "og:title", content: "Meus agendamentos | Vitre-Med" },
      {
        property: "og:description",
        content:
          "Revise, adicione e exclua os agendamentos de consultas feitos nos hospitais encontrados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const outlineButton =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent";
const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring";
const chip = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-primary text-primary-foreground"
      : "border border-border bg-background text-muted-foreground hover:bg-accent"
  }`;

type Filter = "upcoming" | "past" | "all";

function AppointmentsPage() {
  const { items: appointments, refresh } = useAppointments();
  const { session } = useSession();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const list = useMemo(() => {
    if (filter === "all") return appointments;
    return appointments.filter((a) => (filter === "past" ? isPast(a) : !isPast(a)));
  }, [appointments, filter]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a busca
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Meus agendamentos
            </h1>
            <p className="text-sm text-muted-foreground">
              {appointments.length} agendamento(s){" "}
              {session
                ? "salvos na sua conta · lembrete 1 dia antes por e-mail"
                : "salvos neste dispositivo"}
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm((v) => !v);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CalendarPlus className="h-4 w-4" />
            Novo
          </button>
        </header>

        {(showForm || editing) && (
          <AppointmentForm
            initial={editing}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onDone={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["upcoming", "Próximos"],
              ["past", "Realizados"],
              ["all", "Todos"],
            ] as Array<[Filter, string]>
          ).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={chip(filter === key)}>
              {label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            Nenhum agendamento nesta lista. Use “Novo” ou o botão “Agendar” na busca de hospitais.
          </p>
        ) : (
          <ul className="space-y-4">
            {list.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-card-foreground">
                      {a.hospitalName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {a.specialty} · {a.patient}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isPast(a)
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {isPast(a) ? "Realizado" : "Próximo"}
                  </span>
                </div>

                <p className="mt-3 flex items-center gap-2 text-sm text-card-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {formatDateTime(a)}
                </p>
                {a.address && (
                  <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {a.address}
                  </p>
                )}
                {a.notes && (
                  <p className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {a.notes}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditing(a);
                    }}
                    className={outlineButton}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  {a.phone && (
                    <a href={`tel:${a.phone.replace(/\s/g, "")}`} className={outlineButton}>
                      <Phone className="h-4 w-4" />
                      Ligar
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir o agendamento em ${a.hospitalName} (${formatDateTime(a)})?`,
                        )
                      ) {
                        removeAppointment(a.id);
                        toast.success("Agendamento excluído.");
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
    </div>
  );

}

function AppointmentForm({
  initial,
  onCancel,
  onDone,
}: {
  initial: Appointment | null;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [hospitalName, setHospitalName] = useState(initial?.hospitalName ?? "");
  const [patient, setPatient] = useState(initial?.patient ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = {
          hospitalName: hospitalName.trim(),
          patient: patient.trim(),
          specialty: specialty.trim(),
          date,
          time,
          address: address.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
        };
        if (initial) {
          updateAppointment(initial.id, data);
          toast.success("Agendamento atualizado.");
        } else {
          addAppointment(data);
          toast.success("Agendamento criado.");
        }
        onDone();
      }}
      className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-card-foreground">
        {initial ? "Editar agendamento" : "Novo agendamento"}
      </h2>
      <input
        required
        value={hospitalName}
        onChange={(e) => setHospitalName(e.target.value)}
        placeholder="Hospital ou clínica"
        className={field}
      />
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
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Endereço (opcional)"
        className={field}
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telefone (opcional)"
        className={field}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observações (opcional)"
        rows={3}
        className={field}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={outlineButton}>
          <X className="h-4 w-4" />
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check className="h-4 w-4" />
          Salvar
        </button>
      </div>
    </form>
  );
}
