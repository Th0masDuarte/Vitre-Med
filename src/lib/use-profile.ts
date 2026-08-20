import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";

export type Profile = {
  id: string;
  nome: string;
  telefone: string;
  cep: string;
};

/** Formata um CEP em 00000-000 (quando possível). */
export function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** Formata telefone brasileiro em (00) 00000-0000. */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Perfil do usuário logado (nome, telefone, CEP). */
export function useProfile() {
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, telefone, cep")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data ?? { id: user.id, nome: "", telefone: "", cep: "" });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [sessionLoading, load]);

  const save = useCallback(
    async (patch: Partial<Omit<Profile, "id">>) => {
      if (!user) throw new Error("Faça login para salvar seu perfil.");
      const next = {
        id: user.id,
        nome: patch.nome ?? profile?.nome ?? "",
        telefone: patch.telefone ?? profile?.telefone ?? "",
        cep: patch.cep ?? profile?.cep ?? "",
      };
      const { error } = await supabase.from("profiles").upsert(next);
      if (error) throw error;
      setProfile(next);
      return next;
    },
    [profile, user],
  );

  return { profile, loading: loading || sessionLoading, reload: load, save };
}
