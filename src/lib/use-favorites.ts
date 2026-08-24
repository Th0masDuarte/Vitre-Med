import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Hospital } from "@/lib/hospitals.server";
import { useSession } from "./use-session";

export type Favorite = {
  id: string;
  place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
  rating: number | null;
  lat: number | null;
  lng: number | null;
};

/** Favoritos do usuário logado. */
export function useFavorites() {
  const { user, loading: sessionLoading } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select("id, place_id, name, address, phone, maps_url, rating, lat, lng")
      .order("created_at", { ascending: false });
    setFavorites((data ?? []) as Favorite[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [sessionLoading, load]);

  const isFavorite = useCallback(
    (placeId: string) => favorites.some((f) => f.place_id === placeId),
    [favorites],
  );

  const toggle = useCallback(
    async (hospital: Hospital) => {
      if (!user) throw new Error("Faça login para salvar favoritos.");
      const existing = favorites.find((f) => f.place_id === hospital.id);
      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        return false;
      }
      const { data, error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          place_id: hospital.id,
          name: hospital.name,
          address: hospital.address ?? null,
          phone: hospital.phone ?? null,
          maps_url: hospital.mapsUrl ?? null,
          rating: hospital.rating ?? null,
          lat: hospital.lat ?? null,
          lng: hospital.lon ?? null,
        })
        .select("id, place_id, name, address, phone, maps_url, rating, lat, lng")
        .single();
      if (error) throw error;
      setFavorites((prev) => [data as Favorite, ...prev]);
      return true;
    },
    [favorites, user],
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) throw error;
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    favorites,
    loading: loading || sessionLoading,
    isFavorite,
    toggle,
    remove,
    reload: load,
    enabled: Boolean(user),
  };
}
