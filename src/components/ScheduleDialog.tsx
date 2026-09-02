import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { addAppointment } from "@/lib/appointments";
import { openGoogleCalendar } from "@/lib/google-calendar";
import type { Hospital } from "@/lib/hospitals.server";
import { outlineButton } from "@/components/HospitalCard";

export const field =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/40";

export function ScheduleDialog({
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
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await addAppointment({
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
          } catch {
            toast.error("Não foi possível salvar o agendamento.");
          }
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
