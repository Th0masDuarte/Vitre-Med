const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone?: string | undefined;
  website?: string | undefined;
  rating?: number | undefined;
  userRatingCount?: number | undefined;
  openNow?: boolean | undefined;
  lat: number;
  lon: number;
  distanceKm: number;
  photoUrl?: string | undefined;
  mapsUrl: string;
}

interface PlacesPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  currentOpeningHours?: { openNow?: boolean };
  photos?: Array<{ name: string }>;
}

function authHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Credenciais do Google Maps não configuradas.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };
}

function handleForbidden(status: number, body: string) {
  if (status !== 403) return;
  let reason: string | undefined;
  try {
    const details = JSON.parse(body)?.error?.details ?? [];
    reason = details.find((d: { reason?: string }) => d.reason)?.reason;
  } catch {
    /* ignore */
  }
  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
    throw new Error(
      'A chave do Google Maps está restrita por referrer. No Google Cloud Console, defina as restrições de aplicativo da chave de servidor como "Nenhuma" ou "Endereços IP".',
    );
  }
  if (reason === "API_KEY_SERVICE_BLOCKED") {
    throw new Error(
      "A chave do Google Maps não permite a Places API. Adicione a Places API (New) à lista de APIs permitidas da chave.",
    );
  }
  throw new Error("O Google Maps recusou a requisição (403).");
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function resolvePhoto(photoName: string): Promise<string | undefined> {
  const res = await fetch(
    `${GATEWAY_URL}/places/v1/${photoName}/media?maxHeightPx=400&skipHttpRedirect=true`,
    { headers: authHeaders() },
  );
  if (!res.ok) return undefined;
  const json = (await res.json()) as { photoUri?: string };
  return json.photoUri;
}

export async function searchHospitals(
  latitude: number,
  longitude: number,
  radius: number,
): Promise<Hospital[]> {
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.currentOpeningHours.openNow",
        "places.photos",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes: ["hospital"],
      maxResultCount: 15,
      rankPreference: "DISTANCE",
      languageCode: "pt-BR",
      locationRestriction: {
        circle: { center: { latitude, longitude }, radius },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Places searchNearby failed [${res.status}]: ${body}`);
    handleForbidden(res.status, body);
    throw new Error(`Falha ao buscar hospitais (${res.status}).`);
  }

  const json = (await res.json()) as { places?: PlacesPlace[] };
  const places = json.places ?? [];

  const hospitals = await Promise.all(
    places.map(async (p): Promise<Hospital | null> => {
      const loc = p.location;
      if (!loc) return null;
      const photoName = p.photos?.[0]?.name;
      const photoUrl = photoName ? await resolvePhoto(photoName) : undefined;
      return {
        id: p.id,
        name: p.displayName?.text ?? "Hospital",
        address: p.formattedAddress ?? "Endereço não informado",
        phone: p.nationalPhoneNumber,
        website: p.websiteUri,
        rating: p.rating,
        userRatingCount: p.userRatingCount,
        openNow: p.currentOpeningHours?.openNow,
        lat: loc.latitude,
        lon: loc.longitude,
        distanceKm: haversine(latitude, longitude, loc.latitude, loc.longitude),
        photoUrl,
        mapsUrl:
          p.googleMapsUri ??
          `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`,
      };
    }),
  );

  return hospitals
    .filter((h): h is Hospital => h !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
