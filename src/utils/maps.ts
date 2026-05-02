/**
 * Construye una URL de Google Maps a partir de coordenadas GPS.
 * Devuelve null si no se reciben coordenadas válidas.
 */
export function buildMapsUrl(
  lat: number | null | undefined,
  lng: number | null | undefined
): string | null {
  if (lat == null || lng == null) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}
