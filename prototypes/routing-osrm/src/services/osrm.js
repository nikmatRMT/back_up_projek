const OSRM_BASE_URL = import.meta.env.VITE_OSRM_BASE_URL || 'https://router.project-osrm.org';
const REQUEST_TIMEOUT_MS = 15000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`OSRM mengembalikan HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok') {
      throw new Error(data.message || data.code || 'Rute tidak tersedia');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Permintaan OSRM melewati batas waktu');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getRouteMatrix(origin, destinations) {
  if (!destinations.length) return [];

  const coordinates = [origin, ...destinations]
    .map(({ lng, lat }) => `${lng},${lat}`)
    .join(';');
  const destinationIndexes = destinations.map((_, index) => index + 1).join(';');
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coordinates}?sources=0&destinations=${destinationIndexes}&annotations=duration,distance`;
  const data = await fetchJson(url);

  return destinations.map((destination, index) => ({
    ...destination,
    routeDistanceMeters: data.distances?.[0]?.[index] ?? null,
    routeDurationSeconds: data.durations?.[0]?.[index] ?? null,
  }));
}

export async function getRouteGeometry(origin, destination) {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
  const data = await fetchJson(url);
  const route = data.routes?.[0];

  if (!route?.geometry?.coordinates) {
    throw new Error('Geometri rute tidak tersedia');
  }

  return {
    positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
