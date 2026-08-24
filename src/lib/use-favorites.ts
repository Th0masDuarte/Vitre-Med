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

const COLUMNS = "id, place_id, name, address, phone, maps_url, rating, lat, lng";

/** Store compartilhado para evitar uma consulta por card. */
let cache: Favorite[] = [];
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(items: Favorite[]) => void>();

function publish(items: Favorite[]) {
  cache = items;
  listeners.forEach((fn) => fn(items));
}

async function fetchAll(force = false) {
  if (loaded && !force) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data } = await supabase.from("favorites").select(COLUMNS).order("created_at", {
      ascending: false,
    });
    loaded = true;
    publish((data ?? []) as Favorite[]);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Favoritos do usuário logado. */
export function useFavorites() {
  const { user, loading: sessionLoading } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>(cache);
  const [loading, setLoading] = useState(!loaded);

  useEffect(() => {
    listeners.add(setFavorites);
    return () => {
      listeners.delete(setFavorites);
    };
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      loaded = true;
      publish([]);
      setLoading(false);
      return;
    }
    let active = true;
    void fetchAll().then(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [sessionLoading, user]);

  const isFavorite = useCallback(
    (placeId: string) => favorites.some((f) => f.place_id === placeId),
    [favorites],
  );

  const toggle = useCallback(
    async (hospital: Hospital) => {
      if (!user) throw new Error("Faça login para salvar favoritos.");
      const existing = cache.find((f) => f.place_id === hospital.id);
      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        publish(cache.filter((f) => f.id !== existing.id));
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
        .select(COLUMNS)
        .single();
      if (error) throw error;
      publish([data as Favorite, ...cache]);
      return true;
    },
    [user],
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", id);
    if (error) throw error;
    publish(cache.filter((f) => f.id !== id));
  }, []);

  return {
    favorites,
    loading: loading && Boolean(user),
    isFavorite,
    toggle,
    remove,
    reload: () => fetchAll(true),
    enabled: Boolean(user),
  };
}
