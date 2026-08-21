import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

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

function notify() {
  listeners.forEach((l) => l());
}

/* ------------------------------- local ---------------------------------- */

function readLocal(): Appointment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Appointment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: Appointment[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify();
}

/* ------------------------------- helpers -------------------------------- */

function toTimestamp(date: string, time: string) {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

function fromTimestamp(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

type Row = {
  id: string;
  hospital_name: string;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
  patient: string;
  specialty: string;
  scheduled_at: string;
  notes: string;
  created_at: string;
};

function fromRow(row: Row): Appointment {
  const { date, time } = fromTimestamp(row.scheduled_at);
  return {
    id: row.id,
    hospitalName: row.hospital_name,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    mapsUrl: row.maps_url ?? undefined,
    patient: row.patient,
    specialty: row.specialty,
    date,
    time,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function toRow(data: Partial<NewAppointment>) {
  const row: Record<string, unknown> = {};
  if (data.hospitalName !== undefined) row['hospital_name'] = data.hospitalName;
  if (data.address !== undefined) row['address'] = data.address || null;
  if (data.phone !== undefined) row['phone'] = data.phone || null;
  if (data.mapsUrl !== undefined) row['maps_url'] = data.mapsUrl || null;
  if (data.patient !== undefined) row['patient'] = data.patient;
  if (data.specialty !== undefined) row['specialty'] = data.specialty;
  if (data.notes !== undefined) row['notes'] = data.notes ?? "";
  if (data.date !== undefined || data.time !== undefined) {
    row['scheduled_at'] = toTimestamp(data.date ?? "", data.time ?? "");
  }
  return row;
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function sorted(items: Appointment[]) {
  return [...items].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
  );
}

/* ------------------------------- CRUD ----------------------------------- */

export async function listAppointments(): Promise<Appointment[]> {
  const userId = await currentUserId();
  if (!userId) return sorted(readLocal());
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, hospital_name, address, phone, maps_url, patient, specialty, scheduled_at, notes, created_at",
    )
    .order("scheduled_at", { ascending: true });
  if (error) return sorted(readLocal());
  return (data as Row[]).map(fromRow);
}

export async function addAppointment(data: NewAppointment) {
  const userId = await currentUserId();
  if (!userId) {
    const appointment: Appointment = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    writeLocal([...readLocal(), appointment]);
    return;
  }
  const { error } = await supabase
    .from("appointments")
    .insert({ ...toRow(data), user_id: userId } as never);
  if (error) throw error;
  notify();
}

export async function updateAppointment(id: string, data: Partial<NewAppointment>) {
  const userId = await currentUserId();
  if (!userId) {
    writeLocal(readLocal().map((a) => (a.id === id ? { ...a, ...data } : a)));
    return;
  }
  const { error } = await supabase
    .from("appointments")
    .update({ ...toRow(data), reminder_email_sent_at: null } as never)
    .eq("id", id);
  if (error) throw error;
  notify();
}

export async function removeAppointment(id: string) {
  const userId = await currentUserId();
  if (!userId) {
    writeLocal(readLocal().filter((a) => a.id !== id));
    return;
  }
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
  notify();
}

/** Envia os agendamentos salvos no navegador para a conta ao entrar. */
async function migrateLocalToCloud(userId: string) {
  const local = readLocal();
  if (local.length === 0) return;
  const rows = local.map((a) => ({ ...toRow(a), user_id: userId }));
  const { error } = await supabase.from("appointments").insert(rows as never);
  if (!error && typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/* ------------------------------ formatting ------------------------------ */

export function isPast(a: Appointment) {
  return new Date(`${a.date}T${a.time || "00:00"}`).getTime() < Date.now();
}

/** Verdadeiro quando o agendamento acontece nas próximas 24 horas. */
export function isSoon(a: Appointment) {
  const diff = new Date(`${a.date}T${a.time || "00:00"}`).getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
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

/** Lista reativa de agendamentos (conta do usuário, ou navegador se deslogado). */
export function useAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(() => {
    void listAppointments().then((next) => {
      setItems(next);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        void migrateLocalToCloud(session.user.id).then(sync);
        return;
      }
      if (event === "SIGNED_OUT") sync();
    });
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
      sub.subscription.unsubscribe();
    };
  }, [sync]);

  return { items, loading, refresh: sync };
}
