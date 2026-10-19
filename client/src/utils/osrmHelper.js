const BASE_URL = import.meta.env.VITE_OSRM_BASE_URL || 'https://router.project-osrm.org';

export async function getOsrmRoute(origin, destination) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
        const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
        const response = await fetch(`${BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const route = data.routes?.[0];
        if (data.code !== 'Ok' || !route) throw new Error(data.message || 'Rute tidak tersedia');
        return {
            distanceMeters: route.distance,
            drivingSeconds: route.duration,
            positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        };
    } finally {
        window.clearTimeout(timeout);
    }
}

export function estimateRouteSeconds(route, mode) {
    if (!route) return null;
    return mode === 'walk' ? route.distanceMeters / (4.5 / 3.6) : route.drivingSeconds;
}

export function formatRouteDistance(meters) {
    if (!Number.isFinite(meters)) return '—';
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes < 60 ? `${minutes} menit` : `${Math.floor(minutes / 60)} j ${minutes % 60} m`;
}
