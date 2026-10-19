const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function haversineKm(origin, destination) {
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude)
      * Math.cos(destinationLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} j ${remainder} m` : `${hours} jam`;
}

export function estimateTravelSeconds(distanceMeters, mode, osrmDrivingSeconds = null) {
  if (!Number.isFinite(distanceMeters)) return null;

  if (mode === 'walk') {
    const walkingSpeedMetersPerSecond = 4.5 / 3.6;
    return distanceMeters / walkingSpeedMetersPerSecond;
  }

  if (Number.isFinite(osrmDrivingSeconds)) {
    return osrmDrivingSeconds;
  }

  const motorcycleFallbackMetersPerSecond = 25 / 3.6;
  return distanceMeters / motorcycleFallbackMetersPerSecond;
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
