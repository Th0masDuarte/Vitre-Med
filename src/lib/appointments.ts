import { useCallback, useEffect, useState } from "react";

export interface Appointment {
  id: string;
  hospitalName: string;
  address?: string | undefined;
  phone?: string | undefined;
  mapsUrl?: string | undefined;
  patient: string;
  specialty: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm
  notes?: string | undefined;
  createdAt: string;
}

export type NewAppointment = Omit<Appointment, "id" | "createdAt">;

const STORAGE_KEY = "agendamentos:v1";
const listeners = new Set<() => void>();

function read(): Appointment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Appointment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: Appointment[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

function sorted(items: Appointment[]) {
  return [...items].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
}

export function addAppointment(data: NewAppointment): Appointment {
  const appointment: Appointment = {
    ...data,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  write([...read(), appointment]);
  return appointment;
}

export function updateAppointment(id: string, data: Partial<NewAppointment>) {
  write(read().map((a) => (a.id === id ? { ...a, ...data } : a)));
}

export function removeAppointment(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function isPast(a: Appointment) {
  return new Date(`${a.date}T${a.time || "00:00"}`).getTime() < Date.now();
}

export function formatDateTime(a: Appointment) {
  const d = new Date(`${a.date}T${a.time || "00:00"}`);
  if (Number.isNaN(d.getTime())) return `${a.date} ${a.time}`;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Reactive list of appointments (client-side only, persisted no navegador). */
export function useAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);

  const sync = useCallback(() => setItems(sorted(read())), []);

  useEffect(() => {
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  return items;
}
