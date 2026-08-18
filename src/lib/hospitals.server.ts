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

const FIELD_MASK = [
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
].join(",");

const TEXT_QUERIES = [
  "hospital",
  "pronto-socorro",
  "UPA unidade de pronto atendimento",
  "hospital infantil",
  "maternidade",
];

async function placesRequest(
  path: string,
  body: unknown,
  extraFieldMask = "",
): Promise<PlacesPlace[]> {
  const res = await fetch(`${GATEWAY_URL}/places/v1/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      "X-Goog-FieldMask": FIELD_MASK + extraFieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Places ${path} failed [${res.status}]: ${text}`);
    handleForbidden(res.status, text);
    throw new Error(`Falha ao buscar hospitais (${res.status}).`);
  }

  return ((await res.json()) as { places?: PlacesPlace[] }).places ?? [];
}

async function nearbyPass(
  latitude: number,
  longitude: number,
  radius: number,
  includedTypes: string[],
): Promise<PlacesPlace[]> {
  return placesRequest("places:searchNearby", {
    includedTypes,
    maxResultCount: 20,
    rankPreference: "DISTANCE",
    languageCode: "pt-BR",
    locationRestriction: {
      circle: { center: { latitude, longitude }, radius },
    },
  });
}

async function textPass(
  textQuery: string,
  latitude: number,
  longitude: number,
  radius: number,
): Promise<PlacesPlace[]> {
  const collected: PlacesPlace[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask": `${FIELD_MASK},nextPageToken`,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "pt-BR",
        pageSize: 20,
        ...(pageToken ? { pageToken } : {}),
        locationBias: {
          circle: { center: { latitude, longitude }, radius },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Places searchText failed [${res.status}]: ${text}`);
      handleForbidden(res.status, text);
      break;
    }

    const json = (await res.json()) as {
      places?: PlacesPlace[];
      nextPageToken?: string;
    };
    collected.push(...(json.places ?? []));
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }

  return collected;
}

const ALLOWED_NAME_WORDS = ["clinica", "hospital", "maternidade", "upa"];

function hasAllowedName(name: string | undefined): boolean {
  if (!name) return false;
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ALLOWED_NAME_WORDS.some((w) => normalized.includes(w));
}

export async function searchHospitals(
  latitude: number,
  longitude: number,
  radius: number,
): Promise<Hospital[]> {
  const passes = await Promise.all([
    nearbyPass(latitude, longitude, radius, ["hospital"]),
    ...TEXT_QUERIES.map((q) =>
      textPass(q, latitude, longitude, radius).catch(() => [] as PlacesPlace[]),
    ),
  ]);

  const byId = new Map<string, PlacesPlace>();
  for (const place of passes.flat()) {
    if (place.id && !byId.has(place.id)) byId.set(place.id, place);
  }

  const places = [...byId.values()]
    .filter((p) => {
      const loc = p.location;
      if (!loc) return false;
      if (!hasAllowedName(p.displayName?.text)) return false;
      return (
        haversine(latitude, longitude, loc.latitude, loc.longitude) <=
        radius / 1000 + 0.5
      );
    })
    .sort((a, b) => {
      const da = haversine(latitude, longitude, a.location!.latitude, a.location!.longitude);
      const db = haversine(latitude, longitude, b.location!.latitude, b.location!.longitude);
      return da - db;
    });

  const hospitals = await Promise.all(
    places.map(async (p, index): Promise<Hospital | null> => {
      const loc = p.location;
      if (!loc) return null;
      const photoName = index < 30 ? p.photos?.[0]?.name : undefined;
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

export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodedPlace> {
  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?language=pt-BR&address=${encodeURIComponent(address)}`,
    { headers: authHeaders() },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`Geocode failed [${res.status}]: ${body}`);
    handleForbidden(res.status, body);
    throw new Error(`Falha ao localizar o endereço (${res.status}).`);
  }

  const json = (await res.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };

  const first = json.results?.[0];
  const loc = first?.geometry?.location;
  if (!loc) {
    throw new Error("Endereço não encontrado. Tente ser mais específico.");
  }

  return {
    latitude: loc.lat,
    longitude: loc.lng,
    formattedAddress: first?.formatted_address ?? address,
  };
}
