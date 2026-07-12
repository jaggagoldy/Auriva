// Named search areas for Find Care's location picker — real coordinates
// (imported by both the seed script and the UI, so they can never drift
// apart), used to compute genuine Haversine distance to each clinic. The
// platform's clinics are all in the fictional city "Springfield", so these
// are fabricated-but-consistent points scattered around one base
// coordinate, not real geocoded locations.
export interface SearchArea {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

export const SPRINGFIELD_BASE_LAT = 39.7817;
export const SPRINGFIELD_BASE_LNG = -89.6501;

export const SEARCH_AREAS: SearchArea[] = [
  { id: "downtown-springfield", label: "Downtown Springfield", latitude: 39.7817, longitude: -89.6501 },
  { id: "evergreen-terrace", label: "Evergreen Terrace", latitude: 39.7901, longitude: -89.6438 },
  { id: "north-springfield", label: "North Springfield", latitude: 39.8102, longitude: -89.6612 },
  { id: "elm-district", label: "Elm District", latitude: 39.7723, longitude: -89.6219 },
];
