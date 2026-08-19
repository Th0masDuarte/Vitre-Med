import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  describeLocation,
  findHospitals,
  findHospitalsByAddress,
} from "./hospitals.functions";
import type { Hospital } from "./hospitals.server";
import { getBestPosition } from "./geolocation";

export function useHospitalSearch() {
  const searchNear = useServerFn(findHospitals);
  const searchByAddress = useServerFn(findHospitalsByAddress);
  const describe = useServerFn(describeLocation);

  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [origin, setOrigin] = useState<{
    lat: number;
    lon: number;
    label: string;
    accuracy?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNearMe = useCallback(
    async (radius: number) => {
      setError(null);
      setLocating(true);
      try {
        const position = await getBestPosition();
        setLocating(false);
        setLoading(true);
        setOrigin({
          lat: position.lat,
          lon: position.lon,
          label: "Sua localização atual",
          accuracy: position.accuracy,
        });
        const [result, described] = await Promise.all([
          searchNear({
            data: { latitude: position.lat, longitude: position.lon, radius },
          }),
          describe({ data: { latitude: position.lat, longitude: position.lon } }).catch(
            () => ({ label: null }),
          ),
        ]);
        setOrigin({
          lat: position.lat,
          lon: position.lon,
          label: described.label ?? "Sua localização atual",
          accuracy: position.accuracy,
        });
        setHospitals(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha na busca.");
      } finally {
        setLocating(false);
        setLoading(false);
      }
    },
    [describe, searchNear],
  );

  const searchAddress = useCallback(
    async (radius: number, query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 3) {
        setError("Digite um endereço, bairro ou cidade com pelo menos 3 letras.");
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const result = await searchByAddress({ data: { address: trimmed, radius } });
        setOrigin({
          lat: result.place.latitude,
          lon: result.place.longitude,
          label: result.place.formattedAddress,
        });
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

  return {
    hospitals,
    origin,
    loading,
    locating,
    error,
    setError,
    searchNearMe,
    searchAddress,
  };
}
