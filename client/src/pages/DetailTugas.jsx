import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet-routing-machine';
import BottomNav from '../components/BottomNav';

const customIcon = new L.DivIcon({
    html: `<div style="color: var(--color-coral-pop, #ff705d);"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

const pekerjaIcon = new L.DivIcon({
    html: `<div style="color: #2ba0ff;"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

function RoutingMachine({ userLoc, clientLoc }) {
    const map = useMap();
    useEffect(() => {
        if (!userLoc || !clientLoc) return;
        const routingControl = L.Routing.control({
            waypoints: [L.latLng(userLoc[0], userLoc[1]), L.latLng(clientLoc[0], clientLoc[1])],
            routeWhileDragging: false, addWaypoints: false, showAlternatives: false, fitSelectedRoutes: true, show: false,
            lineOptions: { styles: [{ color: '#2ba0ff', weight: 5, opacity: 0.8 }] },
            createMarker: function() { return null; }
        }).addTo(map);
        return () => { if (map && routingControl) map.removeControl(routingControl); };
    }, [map, userLoc, clientLoc]);
    return null;
}

function MapResizeHandler({ isExpanded }) {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const t1 = setTimeout(() => map.invalidateSize(), 50);
        const t2 = setTimeout(() => map.invalidateSize(), 150);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isExpanded, map]);
    return null;
}

export default function DetailTugas() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [quest, setQuest] = useState(location.state?.quest || null);
    const [isLoading, setIsLoading] = useState(!quest);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [liveDistance, setLiveDistance] = useState(null);
    const [showSuccessUI, setShowSuccessUI] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    const MY_USER_ID = localStorage.getItem('myUserId');
    const pembuatIdString = quest ? (typeof quest.pembuat_id === 'object' ? quest.pembuat_id?._id : quest.pembuat_id) : null;
    const isKlien = pembuatIdString === MY_USER_ID;

    useEffect(() => {
        let watchId;
        if (quest && !isKlien) {
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const newLoc = [pos.coords.latitude, pos.coords.longitude];
                        setUserLocation(newLoc);
                        if (quest.lokasi && quest.lokasi.coordinates) {
                            const clientLatLng = L.latLng(quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]);
                            const workerLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                            setLiveDistance(workerLatLng.distanceTo(clientLatLng));
                        }
                        axios.put(`/api/quests/${quest._id}/location`, { latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => {});
                    },
                    () => console.log("Gagal ambil lokasi user"),
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            }
        } else if (quest && isKlien && (quest.status === 'TAKEN' || quest.status === 'IN_PROGRESS')) {
            const interval = setInterval(async () => {
                try {
                    const res = await axios.get(`/api/quests/my-active?user_id=${MY_USER_ID}`);
                    if (res.data.success && res.data.data) {
                        const fetched = res.data.data;
                        if (fetched.pekerja_lokasi && fetched.pekerja_lokasi.latitude) {
                            setUserLocation([fetched.pekerja_lokasi.latitude, fetched.pekerja_lokasi.longitude]);
                            if (quest.lokasi && quest.lokasi.coordinates) {
                                const clientLatLng = L.latLng(quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]);
                                const workerLatLng = L.latLng(fetched.pekerja_lokasi.latitude, fetched.pekerja_lokasi.longitude);
                                setLiveDistance(workerLatLng.distanceTo(clientLatLng));
                            }
                        }
                    }
                } catch (e) {}
            }, 5000);
            return () => clearInterval(interval);
        }
        return () => { if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId); };
    }, [quest, isKlien, MY_USER_ID]);

    useEffect(() => {
        if (quest && quest.status === 'TAKEN' && quest.taken_at) {
            const interval = setInterval(() => {
                const now = new Date();
                const takenAt = new Date(quest.taken_at);
                const deadline = new Date(takenAt.getTime() + 2 * 60 * 60 * 1000); // 2 jam
                const diff = deadline - now;
                
                if (diff <= 0) {
                    setTimeLeft("Waktu Habis!");
                    clearInterval(interval);
                } else {
                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    const mins = Math.floor((diff / 1000 / 60) % 60);
                    const secs = Math.floor((diff / 1000) % 60);
                    setTimeLeft(`${hours > 0 ? hours + 'j ' : ''}${mins}m ${secs}d`);
                }
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeLeft('');
        }
    }, [quest]);

    useEffect(() => {
        if (quest && quest.lokasi && quest.lokasi.coordinates && userLocation) {
            const clientLatLng = L.latLng(quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]);
            const workerLatLng = L.latLng(userLocation[0], userLocation[1]);
            setLiveDistance(workerLatLng.distanceTo(clientLatLng));
        }
    }, [quest, userLocation]);

    useEffect(() => {
        if (!quest) {
            const fetchMyActiveQuest = async () => {
                try {
                    const res = await axios.get(`/api/quests/my-active?user_id=${MY_USER_ID}`);
                    if (res.data.success) setQuest(res.data.data);
                } catch (err) { console.log("Tidak ada tugas aktif"); }
                finally { setIsLoading(false); }
            };
            fetchMyActiveQuest();
        } else { setIsLoading(false); }
    }, [quest, MY_USER_ID]);

    const handleDeleteQuest = async () => {
        if (!window.confirm("Yakin ingin membatalkan tugas ini? Jika pekerja sedang di jalan, harap beri tahu mereka lewat chat!")) return;
        setIsSubmitting(true);
        try {
            const res = await axios.delete(`/api/quests/${quest._id}`, { data: { pembuat_id: MY_USER_ID } });
            if (res.data.success) { toast.success(res.data.message); setQuest(null); window.location.reload(); }
        } catch (err) { toast.error(err.response?.data?.message || 'Terjadi kesalahan sistem saat mencoba menghapus.'); }
        finally { setIsSubmitting(false); }
    };

    const handleMulaiKerja = async () => {
        setIsSubmitting(true);
        try {
            const res = await axios.put(`/api/quests/${quest._id}/start`, { pekerja_id: MY_USER_ID });
            if (res.data.success) {
                setQuest(res.data.data);
                toast.success("Berhasil! Status diubah menjadi Sedang Dikerjakan. Pembatalan otomatis dari sistem sekarang dinonaktifkan.");
            }
        } catch (err) { toast.error(err.response?.data?.message || 'Gagal memulai kerja'); }
        finally { setIsSubmitting(false); }
    };

    const handleSelesaikanTugas = async () => {
        if (!pinInput || pinInput.length !== 4) { toast.error('Masukkan 4-digit PIN dengan benar!'); return; }
        setIsSubmitting(true);
        try {
            const res = await axios.put(`/api/quests/${quest._id}/complete`, { pin: pinInput });
            if (res.data.success) { setShowSuccessUI(true); setTimeout(() => navigate('/beranda'), 2500); }
        } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyelesaikan tugas'); setIsSubmitting(false); }
    };

    const toggleMapSize = (e) => {
        e.preventDefault();
        setIsMapExpanded(!isMapExpanded);
    };

    if (isLoading) {
        return (
            <div className="fade-up" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Memuat data...</p>
            </div>
        );
    }

    if (!quest) {
        return (
            <div className="fade-up" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '100px' }}>
                <header style={{ padding: '20px', backgroundColor: 'var(--surface)', borderBottom: '2px solid var(--border-ink)' }}>
                    <h2>Tugas Aktif</h2>
                </header>
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-sandstone)', borderRadius: '50px', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-black)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <path d="M10 14h4"></path>
                            <path d="M12 10v4"></path>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </div>
                    <h3 style={{ marginBottom: '8px' }}>Belum Ada Tugas Aktif</h3>
                    <p style={{ fontSize: '14px' }}>Anda tidak sedang membuat atau mengerjakan tugas apapun saat ini.</p>
                </div>
                <BottomNav activePage="tugas" />
            </div>
        );
    }

    let otherPartyName = "Belum Diambil";
    if (isKlien) {
        if (quest.status === 'TAKEN' && typeof quest.pekerja_id === 'object' && quest.pekerja_id) {
            otherPartyName = quest.pekerja_id.nama_lengkap;
        } else { otherPartyName = "Menunggu Pekerja (Belum Diambil)"; }
    } else {
        if (typeof quest.pembuat_id === 'object' && quest.pembuat_id) {
            otherPartyName = quest.pembuat_id.nama_lengkap;
        } else { otherPartyName = "Klien (Pembuat Tugas)"; }
    }

    return (
        <div className="fade-up" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '100px' }}>
            
            {/* Success Overlay */}
            {showSuccessUI && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--accent-green)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px', animation: 'bounce 1s infinite' }}>🎉</div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px', textAlign: 'center' }}>TUGAS SELESAI!</h1>
                    <p style={{ fontSize: '1rem', color: 'var(--text-main)', opacity: 0.8 }}>Saldo Anda berhasil ditambahkan.</p>
                </div>
            )}

            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px', backgroundColor: 'var(--surface)', borderBottom: '2px solid var(--border-ink)' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h2>Tugas Aktif</h2>
            </header>

            {/* Status Banner */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 20px', borderBottom: '2px solid var(--border-ink)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${quest.status === 'IN_PROGRESS' ? 'badge-green' : 'badge-coral'}`}>
                        STATUS: {quest.status === 'IN_PROGRESS' ? 'SEDANG DIKERJAKAN' : quest.status === 'TAKEN' ? 'SEDANG DI JALAN' : quest.status}
                    </span>
                    {quest.status === 'TAKEN' && timeLeft && (
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Sisa Waktu: {timeLeft}
                        </span>
                    )}
                </div>
            </div>

            {/* Profil Pihak */}
            <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface)', borderBottom: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', backgroundColor: 'var(--bg-main)', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', borderRadius: '50px', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>
                        {isKlien ? `Pekerja: ${otherPartyName}` : `Klien: ${otherPartyName}`}
                    </h3>
                    <p style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isKlien 
                            ? (quest.status === 'TAKEN' 
                                ? (liveDistance !== null ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> Sedang menuju lokasi ({Math.round(liveDistance)} m)</> : 'Sedang menuju lokasi') 
                                : 'Menunggu...') 
                            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> {liveDistance !== null ? Math.round(liveDistance) : Math.round(quest.jarak_meter || 0)} meter dari Anda</>}
                    </p>
                </div>
            </div>

            <div style={{ padding: '20px' }}>
                {/* Detail Card */}
                <div className="clean-card" style={{ padding: '20px 21px', marginBottom: '20px' }}>
                    <span className="section-label" style={{ marginBottom: '16px' }}>DETAIL TUGAS</span>
                    
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px', marginBottom: '4px' }}>Kategori</p>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', fontWeight: '800', textTransform: 'uppercase' }}>{quest.kategori}</h3>
                    
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Catatan dari Klien</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.55' }}>{quest.deskripsi}</p>

                    <hr className="divider-dashed" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Upah Jasa</span>
                        <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>Rp {quest.upah_jasa.toLocaleString('id-ID')}</span>
                    </div>
                    {quest.nominal_talangan > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Talangan</span>
                            <span style={{ color: 'var(--accent-coral)', fontWeight: '600' }}>Rp {quest.nominal_talangan.toLocaleString('id-ID')}</span>
                        </div>
                    )}

                    <hr className="divider-ink" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                        <span style={{ fontWeight: '800' }}>Total Tagihan</span>
                        <span style={{ fontWeight: '800' }}>Rp {(quest.upah_jasa + quest.nominal_talangan).toLocaleString('id-ID')}</span>
                    </div>
                </div>

                {/* Map */}
                <div style={{
                    backgroundColor: 'var(--surface)',
                    ...(isMapExpanded ? {
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999
                    } : {
                        height: '220px', borderRadius: 'var(--radius-medium)', overflow: 'hidden', border: '2px solid var(--border-ink)', marginBottom: '20px', position: 'relative', zIndex: 1
                    })
                }}>
                    <MapContainer center={[quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                        <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none', padding: '10px' }}>
                            <div className="leaflet-control" style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', clear: 'both' }}
                                ref={(ref) => { if (ref) { L.DomEvent.disableClickPropagation(ref); L.DomEvent.disableScrollPropagation(ref); } }}>
                                <button type="button" onClick={toggleMapSize} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'var(--surface)', color: 'var(--text-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', fontFamily: 'var(--font-inter)' }}>
                                    {isMapExpanded ? (
                                        <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg> Perkecil</>
                                    ) : (
                                        <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg> Perbesar</>
                                    )}
                                </button>
                            </div>
                        </div>
                        <MapResizeHandler isExpanded={isMapExpanded} />
                        <TileLayer keepBuffer={50} updateWhenZooming={false} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]]} icon={customIcon}><Popup>Titik Lokasi Klien</Popup></Marker>
                        {(!isKlien && userLocation) && (
                            <RoutingMachine userLoc={userLocation} clientLoc={[quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]]} />
                        )}
                        {userLocation && (
                            <Marker position={userLocation} icon={pekerjaIcon}><Popup>Lokasi Pekerja</Popup></Marker>
                        )}
                    </MapContainer>
                </div>


                {/* PIN Section */}
                {isKlien ? (
                    <div className="clean-card" style={{ padding: '20px 21px', border: '2px dashed var(--accent-green)', textAlign: 'center', marginBottom: '20px' }}>
                        <p style={{ color: 'var(--accent-green)', fontWeight: '700', marginBottom: '8px', fontSize: '13px' }}>PIN RAHASIA TUGAS INI:</p>
                        <h1 style={{ fontSize: '2.5rem', letterSpacing: '8px', marginBottom: '8px' }}>{quest.pin_rahasia}</h1>
                        <p style={{ fontSize: '13px' }}>Berikan PIN ini kepada Pekerja HANYA jika tugas telah diselesaikan dengan baik.</p>
                    </div>
                ) : (
                    <div className="clean-card" style={{ padding: '20px 21px', marginBottom: '20px' }}>
                        {quest.status === 'TAKEN' ? (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Konfirmasi jika Anda sudah sampai di lokasi tujuan agar Klien tahu dan timer pembatalan otomatis dihentikan.</p>
                                
                                {liveDistance !== null && liveDistance > 50 ? (
                                    <div style={{ backgroundColor: '#fef2f0', border: '2px dashed var(--accent-coral)', padding: '16px', borderRadius: 'var(--radius-small)', textAlign: 'center', marginBottom: '14px' }}>
                                        <p style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '6px', color: 'var(--accent-coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> Anda Masih Jauh
                                        </p>
                                        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                                            Jarak Anda: <strong>{Math.round(liveDistance)} meter</strong>. Mendekatlah ke radius <strong>50 meter</strong> untuk konfirmasi.
                                        </p>
                                    </div>
                                ) : (
                                    <button onClick={handleMulaiKerja} disabled={isSubmitting || liveDistance === null} className="btn btn-primary" style={{ width: '100%', marginBottom: '0' }}>
                                        {isSubmitting ? 'Memproses...' : (liveDistance === null ? 'Mendeteksi GPS...' : '📍 SAYA SUDAH SAMPAI')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <p style={{ color: 'var(--text-main)', fontWeight: '700', marginBottom: '14px', textAlign: 'center', fontSize: '13px' }}>INPUT PIN PENYELESAIAN</p>
                                <input 
                                    type="text" maxLength="4" value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    placeholder="Minta PIN dari Klien"
                                    className="form-input"
                                    style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '1.2rem', marginBottom: '14px', backgroundColor: 'var(--surface)' }}
                                    id="detail-pin"
                                />
                                <button onClick={handleSelesaikanTugas} disabled={isSubmitting} className="btn btn-primary" id="detail-selesaikan">
                                    {isSubmitting ? 'Memproses...' : 'SELESAIKAN TUGAS'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Chat WA */}
                <button className="btn btn-outline" style={{ marginBottom: '16px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                    CHAT WHATSAPP {isKlien ? 'PEKERJA' : 'KLIEN'}
                </button>

                {/* Cancel (Klien only) */}
                {isKlien && (
                    <div style={{ textAlign: 'center' }}>
                        {quest.status === 'OPEN' ? (
                            <button onClick={handleDeleteQuest} disabled={isSubmitting}
                                style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'var(--accent-coral)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>
                                Batalkan Tugas (Hapus)
                            </button>
                        ) : quest.status === 'TAKEN' ? (
                            <button onClick={handleDeleteQuest} disabled={isSubmitting}
                                style={{ background: 'none', border: 'none', textDecoration: 'underline', color: 'var(--accent-coral)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>
                                Pekerja Terlalu Lama? (Batalkan)
                            </button>
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tugas sedang dikerjakan (Tidak bisa batal sepihak)</span>
                        )}
                    </div>
                )}
            </div>
            <BottomNav activePage="tugas" />
        </div>
    );
}
