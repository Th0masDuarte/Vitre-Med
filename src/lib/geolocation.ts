export interface Position {
  lat: number;
  lon: number;
  accuracy: number;
}

const CACHE_KEY = "ultima-localizacao:v1";

export function readCachedPosition(): Position | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position & { at?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lon !== "number") return null;
    return { lat: parsed.lat, lon: parsed.lon, accuracy: parsed.accuracy ?? 0 };
  } catch {
    return null;
  }
}

function cache(position: Position) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...position, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function geoErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permissão de localização negada. Libere o acesso no ícone de cadeado do navegador e tente de novo.";
    case error.POSITION_UNAVAILABLE:
      return "Não conseguimos captar o sinal de GPS. Verifique se a localização do aparelho está ligada.";
    case error.TIMEOUT:
      return "A localização demorou demais para responder. Tente novamente em um lugar com sinal melhor.";
    default:
      return "Erro ao obter a localização.";
  }
}

export async function permissionState(): Promise<PermissionState | "unknown"> {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

/**
 * Obtém a melhor posição possível: acompanha o GPS por alguns segundos e
 * devolve a leitura mais precisa; se falhar, tenta modo econômico e, por fim,
 * a última posição conhecida.
 */
export function getBestPosition(options?: {
  timeoutMs?: number;
  desiredAccuracy?: number;
}): Promise<Position> {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const desiredAccuracy = options?.desiredAccuracy ?? 60;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Seu navegador não suporta geolocalização."));
      return;
    }

    let best: Position | null = null;
    let settled = false;
    let watchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer) clearTimeout(timer);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const fallback = best ?? readCachedPosition();
      if (fallback) {
        cache(fallback);
        resolve(fallback);
      } else {
        reject(new Error("Não foi possível determinar sua localização."));
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const next: Position = {
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy ?? 9999,
        };
        if (!best || next.accuracy < best.accuracy) best = next;
        if (next.accuracy <= desiredAccuracy) finish();
      },
      (err) => {
        if (settled) return;
        // Fallback: leitura única em modo econômico (rede/Wi-Fi).
        navigator.geolocation.getCurrentPosition(
          (p) => {
            best = {
              lat: p.coords.latitude,
              lon: p.coords.longitude,
              accuracy: p.coords.accuracy ?? 9999,
            };
            finish();
          },
          () => {
            const cached = readCachedPosition();
            if (cached) {
              best = cached;
              finish();
              return;
            }
            settled = true;
            cleanup();
            reject(new Error(geoErrorMessage(err)));
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
        );
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );

    timer = setTimeout(finish, timeoutMs);
  });
}
