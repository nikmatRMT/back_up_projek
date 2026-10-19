import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { DEFAULT_ORIGIN, QUESTS } from './data/quests';
import { getRouteGeometry, getRouteMatrix } from './services/osrm';
import {
  formatDistance,
  formatDuration,
  formatRupiah,
  haversineKm,
  estimateTravelSeconds,
} from './utils/distance';

const radiusOptions = [500, 1000, 1500, 3000];

const userIcon = L.divIcon({
  className: 'map-marker-shell',
  html: '<div class="map-marker map-marker-user"><span></span></div>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

const questIcon = L.divIcon({
  className: 'map-marker-shell',
  html: '<div class="map-marker map-marker-quest"><span>Q</span></div>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

const selectedQuestIcon = L.divIcon({
  className: 'map-marker-shell',
  html: '<div class="map-marker map-marker-selected"><span>Q</span></div>',
  iconSize: [40, 48],
  iconAnchor: [20, 46],
});

function MapViewport({ origin, candidates, routePositions }) {
  const map = useMap();

  useEffect(() => {
    const points = [
      [origin.lat, origin.lng],
      ...candidates.map((candidate) => [candidate.lat, candidate.lng]),
      ...(routePositions || []),
    ];

    window.setTimeout(() => {
      map.invalidateSize();
      if (points.length > 1) {
        map.fitBounds(points, { padding: [34, 34], maxZoom: 16 });
      } else {
        map.setView(points[0], 16);
      }
    }, 80);
  }, [map, origin, candidates, routePositions]);

  return null;
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function App() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [radius, setRadius] = useState(1000);
  const [routeResults, setRouteResults] = useState([]);
  const [routePositions, setRoutePositions] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [transportMode, setTransportMode] = useState('motorcycle');
  const [routingState, setRoutingState] = useState('idle');
  const [routeState, setRouteState] = useState('idle');
  const [locationState, setLocationState] = useState('default');
  const [errorMessage, setErrorMessage] = useState('');

  const haversineCandidates = useMemo(
    () => QUESTS
      .map((quest) => ({
        ...quest,
        haversineMeters: haversineKm(origin, quest) * 1000,
      }))
      .filter((quest) => quest.haversineMeters <= radius)
      .sort((a, b) => a.haversineMeters - b.haversineMeters),
    [origin, radius],
  );

  const visibleCandidates = routeResults.length
    ? [...routeResults].sort((a, b) => {
        const durationA = estimateTravelSeconds(
          a.routeDistanceMeters,
          transportMode,
          a.routeDurationSeconds,
        ) ?? Number.POSITIVE_INFINITY;
        const durationB = estimateTravelSeconds(
          b.routeDistanceMeters,
          transportMode,
          b.routeDurationSeconds,
        ) ?? Number.POSITIVE_INFINITY;
        return durationA - durationB;
      })
    : haversineCandidates;

  const selectedQuest = visibleCandidates.find((quest) => quest.id === selectedQuestId) || null;

  const resetRouting = () => {
    setRouteResults([]);
    setRoutePositions([]);
    setSelectedRoute(null);
    setSelectedQuestId(null);
    setRoutingState('idle');
    setRouteState('idle');
    setErrorMessage('');
  };

  const selectRadius = (nextRadius) => {
    setRadius(nextRadius);
    resetRouting();
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('error');
      setErrorMessage('Browser ini tidak mendukung akses lokasi. Lokasi dummy tetap digunakan.');
      return;
    }

    setLocationState('loading');
    setErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({
          lat: coords.latitude,
          lng: coords.longitude,
          label: 'Lokasi perangkat saat ini',
        });
        setLocationState('live');
        resetRouting();
      },
      () => {
        setLocationState('error');
        setErrorMessage('Akses GPS tidak tersedia. Prototipe tetap memakai lokasi dummy Guntung Paikat.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const showRouteForQuest = async (quest) => {
    if (!quest) return;

    setSelectedQuestId(quest.id);
    setSelectedRoute(null);
    setRoutePositions([]);
    setRouteState('loading');
    setErrorMessage('');
    try {
      const route = await getRouteGeometry(origin, quest);
      setRoutePositions(route.positions);
      setSelectedRoute({ ...route, questId: quest.id });
      setRouteState('success');
    } catch (error) {
      setRoutePositions([]);
      setSelectedRoute(null);
      setRouteState('error');
      setErrorMessage(`Detail garis rute belum dapat dimuat: ${error.message}`);
    }
  };

  const calculateRoadRoutes = async () => {
    if (!haversineCandidates.length) return;

    setRoutingState('loading');
    setRouteState('idle');
    setRoutePositions([]);
    setErrorMessage('');

    try {
      const results = await getRouteMatrix(origin, haversineCandidates);
      const sortedResults = [...results].sort((a, b) => {
        const durationA = a.routeDurationSeconds ?? Number.POSITIVE_INFINITY;
        const durationB = b.routeDurationSeconds ?? Number.POSITIVE_INFINITY;
        return durationA - durationB;
      });
      setRouteResults(sortedResults);
      setRoutingState('success');
      setSelectedQuestId(null);
      setSelectedRoute(null);
      setRoutePositions([]);
    } catch (error) {
      setRouteResults([]);
      setRoutingState('error');
      setErrorMessage(`OSRM belum dapat dihubungi: ${error.message}. Hasil Haversine tetap tersedia.`);
    }
  };

  const nearestByRoad = routeResults
    .filter((quest) => Number.isFinite(quest.routeDurationSeconds))
    .sort((a, b) => (
      estimateTravelSeconds(a.routeDistanceMeters, transportMode, a.routeDurationSeconds)
      - estimateTravelSeconds(b.routeDistanceMeters, transportMode, b.routeDurationSeconds)
    ))[0];

  const selectedEtaSeconds = selectedRoute
    ? estimateTravelSeconds(
        selectedRoute.distanceMeters,
        transportMode,
        selectedRoute.durationSeconds,
      )
    : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">PROTOTIPE FITUR 01</span>
          <h1>Rute Quest Terdekat</h1>
          <p>Haversine sebagai filter awal, OSRM sebagai pengukur rute jalan.</p>
        </div>
        <img className="app-logo" src="/logo.jpg" alt="Logo Jawarga" />
      </header>

      <main>
        <section className="intro-card fade-up">
          <div className="intro-icon"><RouteIcon /></div>
          <div>
            <span className="status-pill">DATA DUMMY</span>
            <h2>Bandingkan jarak lurus dan jalan nyata</h2>
            <p>Lokasi disaring cepat berdasarkan radius, lalu kandidat dihitung ulang melalui jaringan jalan OpenStreetMap.</p>
          </div>
        </section>

        <section className="control-card fade-up delay-1" id="filter-section">
          <div className="section-heading">
            <div>
              <span className="section-label">01 · TITIK AWAL</span>
              <h2>Lokasi pencarian</h2>
            </div>
            <span className={`source-badge source-${locationState}`}>
              {locationState === 'live' ? 'GPS AKTIF' : 'SIMULASI'}
            </span>
          </div>

          <div className="location-box">
            <div className="location-pin"><LocationIcon /></div>
            <div>
              <strong>{origin.label}</strong>
              <span>{origin.lat.toFixed(6)}, {origin.lng.toFixed(6)}</span>
            </div>
          </div>

          <button className="button button-outline" type="button" onClick={useCurrentLocation} disabled={locationState === 'loading'}>
            <LocationIcon />
            {locationState === 'loading' ? 'MENCARI LOKASI…' : 'GUNAKAN LOKASI SAYA'}
          </button>

          <div className="field-group">
            <span className="section-label">02 · FILTER HAVERSINE</span>
            <div className="radius-grid" aria-label="Pilih radius pencarian">
              {radiusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={radius === option ? 'radius-button active' : 'radius-button'}
                  onClick={() => selectRadius(option)}
                >
                  {option < 1000 ? `${option} m` : `${option / 1000} km`}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="section-label">03 · MODE PERJALANAN</span>
            <div className="transport-switch" aria-label="Pilih mode perjalanan">
              <button
                type="button"
                className={transportMode === 'motorcycle' ? 'transport-button active motor' : 'transport-button'}
                onClick={() => setTransportMode('motorcycle')}
              >
                <span aria-hidden="true">🏍️</span>
                Motor
              </button>
              <button
                type="button"
                className={transportMode === 'walk' ? 'transport-button active walk' : 'transport-button'}
                onClick={() => setTransportMode('walk')}
              >
                <span aria-hidden="true">🚶</span>
                Jalan kaki
              </button>
            </div>
          </div>

          <div className="filter-result">
            <span className="filter-number">{haversineCandidates.length}</span>
            <div>
              <strong>quest lolos filter radius</strong>
              <p>dari {QUESTS.length} lokasi dummy yang tersedia</p>
            </div>
          </div>

          <button
            className="button button-primary"
            type="button"
            onClick={calculateRoadRoutes}
            disabled={!haversineCandidates.length || routingState === 'loading'}
          >
            <RouteIcon />
            {routingState === 'loading' ? 'MENGHITUNG RUTE…' : 'HITUNG RUTE JALAN DENGAN OSRM'}
          </button>

          {errorMessage && <div className="error-box" role="alert">{errorMessage}</div>}
        </section>

        <section className="map-section fade-up delay-2" id="map-section">
          <div className="section-heading map-title">
            <div>
              <span className="section-label">04 · VISUALISASI</span>
              <h2>Peta jaringan jalan</h2>
            </div>
            {routeState === 'loading' && <span className="loading-dot">Memuat</span>}
          </div>

          <div className="map-frame">
            <MapContainer center={[origin.lat, origin.lng]} zoom={15} zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Circle
                center={[origin.lat, origin.lng]}
                radius={radius}
                pathOptions={{ color: '#2c2e2a', fillColor: '#8ed462', fillOpacity: 0.1, dashArray: '7 7', weight: 2 }}
              />
              <Marker position={[origin.lat, origin.lng]} icon={userIcon}>
                <Popup>Titik awal: {origin.label}</Popup>
              </Marker>
              {visibleCandidates.map((quest) => (
                <Marker
                  key={quest.id}
                  position={[quest.lat, quest.lng]}
                  icon={quest.id === selectedQuest?.id ? selectedQuestIcon : questIcon}
                  eventHandlers={{ click: () => showRouteForQuest(quest) }}
                >
                  <Popup>
                    <strong>{quest.title}</strong><br />
                    {quest.area}
                  </Popup>
                </Marker>
              ))}
              {routePositions.length > 0 && (
                <Polyline positions={routePositions} pathOptions={{ color: '#2ba0ff', weight: 6, opacity: 0.92 }} />
              )}
              <MapViewport origin={origin} candidates={visibleCandidates} routePositions={routePositions} />
            </MapContainer>
            <div className="map-legend">
              <span><i className="legend-user" /> Posisi Anda</span>
              <span><i className="legend-quest" /> Quest</span>
              <span><i className="legend-selected" /> Dipilih</span>
              <span><i className="legend-route" /> Jalur OSRM</span>
            </div>
          </div>


          <div className={selectedQuest ? 'selected-route-panel active' : 'selected-route-panel'}>
            {selectedQuest ? (
              <>
                <div className="selected-route-heading">
                  <div>
                    <span className="section-label">QUEST TERPILIH</span>
                    <strong>{selectedQuest.title}</strong>
                  </div>
                  <span className="selected-route-mode">
                    {transportMode === 'motorcycle' ? '🏍️ Motor' : '🚶 Jalan kaki'}
                  </span>
                </div>
                <div className="selected-route-metrics">
                  <div>
                    <span>Jarak jalan</span>
                    <strong>{routeState === 'loading' ? 'Menghitung…' : formatDistance(selectedRoute?.distanceMeters)}</strong>
                  </div>
                  <div>
                    <span>Estimasi waktu</span>
                    <strong>{routeState === 'loading' ? 'Menghitung…' : formatDuration(selectedEtaSeconds)}</strong>
                  </div>
                </div>
                <div className="route-method-badge">
                  <span aria-hidden="true">⚡</span>
                  Rute tercepat berdasarkan jaringan jalan OSRM
                </div>
              </>
            ) : (
              <div className="route-instruction">
                <span className="instruction-dot">1</span>
                <div>
                  <strong>Ketuk salah satu marker quest</strong>
                  <p>Marker akan berubah merah dan jalur OSRM berwarna biru akan ditampilkan.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="results-section fade-up delay-3" id="result-section">
          <div className="section-heading">
            <div>
              <span className="section-label">05 · HASIL PERBANDINGAN</span>
              <h2>
                {routingState === 'success'
                  ? `Diurutkan berdasarkan ETA ${transportMode === 'motorcycle' ? 'motor' : 'jalan kaki'}`
                  : 'Diurutkan berdasarkan Haversine'}
              </h2>
            </div>
            <span className={routingState === 'success' ? 'status-pill status-success' : 'status-pill'}>
              {routingState === 'success' ? 'OSRM AKTIF' : 'FILTER AWAL'}
            </span>
          </div>

          {nearestByRoad && (
            <div className="summary-card">
              <span className="summary-kicker">REKOMENDASI TERCEPAT</span>
              <strong>{nearestByRoad.title}</strong>
              <div className="summary-metrics">
                <span><RouteIcon /> {formatDistance(nearestByRoad.routeDistanceMeters)}</span>
                <span>
                  <ClockIcon />
                  {formatDuration(estimateTravelSeconds(
                    nearestByRoad.routeDistanceMeters,
                    transportMode,
                    nearestByRoad.routeDurationSeconds,
                  ))}
                </span>
              </div>
            </div>
          )}

          <div className="quest-list">
            {visibleCandidates.length ? visibleCandidates.map((quest, index) => (
              <article
                key={quest.id}
                className={quest.id === selectedQuest?.id ? 'quest-card selected' : 'quest-card'}
              >
                <div className="quest-rank">{String(index + 1).padStart(2, '0')}</div>
                <div className="quest-content">
                  <div className="quest-topline">
                    <span className={`category category-${quest.category.toLowerCase()}`}>{quest.category}</span>
                    <strong>{formatRupiah(quest.reward)}</strong>
                  </div>
                  <h3>{quest.title}</h3>
                  <p>{quest.area}</p>

                  <div className="distance-comparison">
                    <div>
                      <span>HAVERSINE</span>
                      <strong>{formatDistance(quest.haversineMeters)}</strong>
                      <small>garis lurus</small>
                    </div>
                    <div className="comparison-arrow">→</div>
                    <div>
                      <span>RUTE JALAN</span>
                      <strong>{formatDistance(quest.routeDistanceMeters)}</strong>
                      <small>
                        {formatDuration(estimateTravelSeconds(
                          quest.routeDistanceMeters,
                          transportMode,
                          quest.routeDurationSeconds,
                        ))}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="route-link"
                    disabled={routeState === 'loading'}
                    onClick={() => showRouteForQuest(quest)}
                  >
                    {quest.id === selectedQuest?.id && routePositions.length ? 'Rute sedang ditampilkan' : 'Tampilkan garis rute'}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </article>
            )) : (
              <div className="empty-state">
                <div>0</div>
                <h3>Tidak ada quest dalam radius ini</h3>
                <p>Pilih radius yang lebih besar atau gunakan titik lokasi lain.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="method-note">
          <strong>Catatan prototipe</strong>
          <p>OSRM memilih rute tercepat yang dapat dilalui berdasarkan jaringan dan aturan jalan OpenStreetMap. ETA motor memakai profil driving, sedangkan ETA jalan kaki disimulasikan dari jarak rute dengan kecepatan rata-rata 4,5 km/jam. Keduanya tidak memakai kemacetan waktu nyata.</p>
        </aside>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi prototipe">
        <button type="button" onClick={() => document.getElementById('filter-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <LocationIcon /><span>Filter</span>
        </button>
        <button type="button" onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <RouteIcon /><span>Peta</span>
        </button>
        <button type="button" onClick={() => document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <ClockIcon /><span>Hasil</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
