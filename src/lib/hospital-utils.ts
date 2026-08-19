import type { Hospital } from "./hospitals.server";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** UPAs / prontos-socorros públicos não aceitam agendamento nem ligação direta. */
export function isUpa(hospital: Pick<Hospital, "name">): boolean {
  const name = normalize(hospital.name);
  return (
    /\bupa\b/.test(name) ||
    name.includes("unidade de pronto atendimento") ||
    name.includes("pronto atendimento") ||
    name.includes("pronto socorro") ||
    name.includes("pronto-socorro")
  );
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function categoryOf(hospital: Pick<Hospital, "name">): string {
  const name = normalize(hospital.name);
  if (isUpa(hospital)) return "UPA / Pronto atendimento";
  if (name.includes("maternidade")) return "Maternidade";
  if (name.includes("clinica")) return "Clínica";
  return "Hospital";
}
