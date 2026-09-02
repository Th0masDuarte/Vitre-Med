import type { Appointment, NewAppointment } from "@/lib/appointments";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toUtcStamp(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

/** Link that opens Google Agenda with the appointment pre-filled. */
export function googleCalendarUrl(
  appointment: Appointment | NewAppointment,
  durationMinutes = 60,
) {
  const start = new Date(`${appointment.date}T${appointment.time || "09:00"}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const details = [
    appointment.specialty ? `Especialidade/motivo: ${appointment.specialty}` : "",
    appointment.patient ? `Paciente: ${appointment.patient}` : "",
    appointment.phone ? `Telefone: ${appointment.phone}` : "",
    appointment.notes ? `Observações: ${appointment.notes}` : "",
    appointment.mapsUrl ? `Mapa: ${appointment.mapsUrl}` : "",
    "Criado no Vitre-Med",
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${appointment.specialty || "Consulta"} — ${appointment.hospitalName}`,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
    details,
    location: appointment.address || appointment.hospitalName,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openGoogleCalendar(appointment: Appointment | NewAppointment) {
  const url = googleCalendarUrl(appointment);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
}
