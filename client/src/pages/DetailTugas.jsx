import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet-routing-machine';
import BottomNav from '../components/BottomNav';
import { watchLocation, stopWatchLocation, getCurrentLocation } from '../utils/geolocationHelper';
import { showNotification } from '../utils/notificationHelper';
import { Banknote, QrCode, Receipt, Coins, History, MessageSquare, PartyPopper, Award, Handshake, MapPin, Clock, Check } from 'lucide-react';

const formatRupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

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
            routeWhileDragging: false, addWaypoints: false, showAlternatives: false, fitSelectedRoutes: false, show: false,
            lineOptions: { styles: [{ color: '#2ba0ff', weight: 5, opacity: 0.8 }] },
            createMarker: function() { return null; }
        }).addTo(map);
        return () => { 
            try {
                if (map && routingControl) map.removeControl(routingControl); 
            } catch (err) {
                // Abaikan error cleanup internal Leaflet Routing Machine saat unmount
            }
        };
    }, [map, userLoc, clientLoc]);
    return null;
}

function MapResizeHandler({ isExpanded, clientLoc }) {
    const map = useMap();
    
    useEffect(() => {
        map.invalidateSize();
        const t1 = setTimeout(() => map.invalidateSize(), 50);
        const t2 = setTimeout(() => map.invalidateSize(), 150);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isExpanded, map]);

    useEffect(() => {
        if (!clientLoc) return;

        const zoomControl = document.querySelector('.leaflet-control-zoom');

        if (!isExpanded) {
            // Matikan semua interaksi peta agar tidak bisa digeser-geser saat kecil
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            if (map.tap) map.tap.disable();

            // Sembunyikan tombol zoom bawaan Leaflet
            if (zoomControl) zoomControl.style.display = 'none';

            // Kembalikan ke koordinat utama
            map.setView(clientLoc, 16);
        } else {
            // Nyalakan kembali interaksi saat peta diperbesar
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            if (map.tap) map.tap.enable();

            // Tampilkan tombol zoom bawaan Leaflet
            if (zoomControl) zoomControl.style.display = 'block';
        }
    }, [isExpanded, map, clientLoc]);

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
    const [ratingInput, setRatingInput] = useState(5);
    const [ulasanInput, setUlasanInput] = useState('');
    const [negotiations, setNegotiations] = useState([]);
    const [recentCompletedQuest, setRecentCompletedQuest] = useState(null);

    const MY_USER_ID = localStorage.getItem('myUserId');
    const pembuatIdString = quest ? (typeof quest.pembuat_id === 'object' ? quest.pembuat_id?._id : quest.pembuat_id) : null;
    const isKlien = pembuatIdString === MY_USER_ID;
    const canStartWork = quest?.negotiation_status === 'AGREED';

    const handleKirimRating = async () => {
        setIsSubmitting(true);
        try {
            const res = await axios.put(`/api/quests/${quest._id}/rate`, {
                rating: ratingInput,
                ulasan: ulasanInput
            });
            if (res.data.success) {
                toast.success("Ulasan berhasil dikirim!");
                setQuest(res.data.data);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal mengirim rating");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        let watchIdPromise;
        if (quest && !isKlien && ['TAKEN', 'IN_PROGRESS'].includes(quest.status)) {
            watchIdPromise = watchLocation(
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
                (err) => console.log("Gagal ambil lokasi user:", err),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        } else if (quest && isKlien && ['OPEN', 'TAKEN', 'IN_PROGRESS'].includes(quest.status)) {
            const interval = setInterval(async () => {
                try {
                    const res = await axios.get(`/api/quests/my-active?user_id=${MY_USER_ID}`);
                    if (res.data.success && res.data.data) {
                        const fetched = res.data.data;
                        
                        // Notifikasi saat status berpindah dari OPEN ke TAKEN
                        if (quest.status === 'OPEN' && fetched.status === 'TAKEN') {
                            showNotification(
                                "Tugas Anda Diambil!",
                                `${fetched.pekerja_id?.nama_lengkap || 'Pekerja'} telah mengambil tugas Anda dan sedang menuju ke lokasi.`
                            );
                            toast.success("Tugas Anda telah diambil oleh Pekerja!");
                        }
                        
                        setQuest(fetched);

                        if (fetched.pekerja_lokasi && fetched.pekerja_lokasi.latitude) {
                            setUserLocation([fetched.pekerja_lokasi.latitude, fetched.pekerja_lokasi.longitude]);
                            if (quest.lokasi && quest.lokasi.coordinates) {
                                const clientLatLng = L.latLng(quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]);
                                const workerLatLng = L.latLng(fetched.pekerja_lokasi.latitude, fetched.pekerja_lokasi.longitude);
                                setLiveDistance(workerLatLng.distanceTo(clientLatLng));
                            }
                        }
                    }
                } catch (e) {
                    if (e.response?.status === 404 && quest.status !== 'COMPLETED') {
                        toast.error("Tugas ini tidak aktif lagi (dibatalkan/selesai).");
                        navigate('/beranda');
                    }
                }
            }, 5000);
            return () => clearInterval(interval);
        }
        return () => {
            if (watchIdPromise) {
                watchIdPromise.then(id => {
                    if (id) stopWatchLocation(id);
                });
            }
        };
    }, [quest, isKlien, MY_USER_ID, navigate]);

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

    // Pastikan quest yang dilepas atau dibatalkan tidak tertahan di state browser.
    useEffect(() => {
        if (!MY_USER_ID) return undefined;
        if (quest?.status === 'COMPLETED') return undefined;
        let cancelled = false;
        const syncActiveQuest = async () => {
            try {
                const response = await axios.get(`/api/quests/my-active?user_id=${MY_USER_ID}`);
                if (!cancelled && response.data.success) {
                    setQuest(response.data.data);
                    setNegotiations([]);
                }
            } catch (error) {
                if (!cancelled && error.response?.status === 404) {
                    if (quest?._id && quest.status === 'AWAITING_PAYMENT') {
                        try {
                            const paymentResponse = await axios.get(`/api/payments/${quest._id}`);
                            if (!cancelled && paymentResponse.data.data?.status === 'COMPLETED') {
                                setQuest(paymentResponse.data.data);
                                toast.success('Pembayaran terverifikasi dan upah telah masuk ke saldo.');
                                showNotification('Pembayaran Berhasil ✓', `Upah ${formatRupiah(paymentResponse.data.data.agreed_upah || paymentResponse.data.data.upah_jasa)} telah masuk ke saldo Anda.`);
                                return;
                            }
                        } catch {
                            // Lanjutkan ke kondisi tanpa tugas aktif bila transaksi tidak dapat ditemukan.
                        }
                    }
                    setQuest(null);
                    try {
                        const negotiationResponse = await axios.get('/api/chat/my-negotiations');
                        if (!cancelled) setNegotiations(negotiationResponse.data.data || []);
                    } catch {
                        if (!cancelled) setNegotiations([]);
                    }
                    try {
                        const historyRes = await axios.get(`/api/quests/history?user_id=${MY_USER_ID}`);
                        if (!cancelled && historyRes.data.success) {
                            const latest = historyRes.data.data?.find(q => q.status === 'COMPLETED');
                            if (latest) {
                                const compTime = new Date(latest.completed_at || latest.paid_at || latest.created_at).getTime();
                                if (Date.now() - compTime < 24 * 60 * 60 * 1000) {
                                    setRecentCompletedQuest(latest);
                                }
                            }
                        }
                    } catch {
                        // ignore history fetch error
                    }
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        syncActiveQuest();
        const timer = window.setInterval(syncActiveQuest, 5000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [MY_USER_ID, quest?._id, quest?.status]);

    useEffect(() => {
        if (!quest) {
            const fetchMyActiveQuest = async () => {
                try {
                    const res = await axios.get(`/api/quests/my-active?user_id=${MY_USER_ID}`);
                    if (res.data.success) {
                        setQuest(res.data.data);
                    }
                } catch (err) {
                    console.log("Tidak ada tugas aktif");
                    try {
                        const historyRes = await axios.get(`/api/quests/history?user_id=${MY_USER_ID}`);
                        if (historyRes.data.success) {
                            const latest = historyRes.data.data?.find(q => q.status === 'COMPLETED');
                            if (latest) {
                                const compTime = new Date(latest.completed_at || latest.paid_at || latest.created_at).getTime();
                                if (Date.now() - compTime < 24 * 60 * 60 * 1000) {
                                    setRecentCompletedQuest(latest);
                                }
                            }
                        }
                    } catch {
                        // ignore history fetch error
                    }
                }
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
        
        let currentLat = null;
        let currentLng = null;
        try {
            const pos = await getCurrentLocation();
            currentLat = pos.latitude;
            currentLng = pos.longitude;
        } catch (locErr) {
            console.warn("Gagal mendapatkan lokasi untuk geofencing:", locErr);
        }

        try {
            const res = await axios.put(`/api/quests/${quest._id}/complete`, { 
                pin: pinInput,
                latitude: currentLat,
                longitude: currentLng
            });
            if (res.data.success) {
                if (res.data.data.status === 'AWAITING_PAYMENT') {
                    setQuest(res.data.data);
                    setPinInput('');
                    setIsSubmitting(false);
                    toast.success('PIN benar. Menunggu pembayaran dari Klien.');
                } else {
                    setShowSuccessUI(true);
                    setTimeout(() => navigate('/beranda'), 2500);
                }
            }
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
        const isWorkerForRecent = recentCompletedQuest ? (
            String(typeof recentCompletedQuest.pekerja_id === 'object' ? recentCompletedQuest.pekerja_id?._id : recentCompletedQuest.pekerja_id) === String(MY_USER_ID)
        ) : false;
        const totalRecentAmount = recentCompletedQuest ? (
            (recentCompletedQuest.agreed_upah || recentCompletedQuest.upah_jasa || 0) + (recentCompletedQuest.nominal_talangan || 0)
        ) : 0;

        return (
            <>
                <div className="fade-up" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '100px' }}>
                <header style={{ padding: '20px', backgroundColor: 'var(--surface)', borderBottom: '2px solid var(--border-ink)' }}>
                    <h2>Tugas & Penawaran</h2>
                </header>

                {/* KARTU INFORMASI TUGAS TERAKHIR YANG SELESAI & LUNAS */}
                {recentCompletedQuest && (
                    <div style={{ padding: '20px 20px 0' }}>
                        <div className="clean-card" style={{
                            padding: '20px 18px',
                            backgroundColor: '#f0fdf4',
                            border: '3px solid var(--accent-green)',
                            borderRadius: '16px',
                            boxShadow: '4px 4px 0 var(--border-ink)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{
                                    backgroundColor: 'var(--accent-green)',
                                    color: 'var(--color-ink-black)',
                                    padding: '4px 12px',
                                    borderRadius: '50px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    border: '1.5px solid var(--border-ink)'
                                }}>
                                    ✓ TUGAS TERAKHIR SELESAI & LUNAS
                                </span>
                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                    {new Date(recentCompletedQuest.completed_at || recentCompletedQuest.paid_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '8px', lineHeight: '1.3', color: 'var(--color-ink-black)' }}>
                                {recentCompletedQuest.deskripsi}
                            </h3>

                            <div style={{
                                backgroundColor: '#ffffff',
                                border: '1.5px solid var(--border-ink)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                marginBottom: '14px',
                                fontSize: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{isWorkerForRecent ? 'Klien (Pembuat Tugas)' : 'Pekerja'}</span>
                                    <strong>{isWorkerForRecent ? (recentCompletedQuest.pembuat_id?.nama_lengkap || 'Klien') : (recentCompletedQuest.pekerja_id?.nama_lengkap || 'Pekerja')}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Metode Pembayaran</span>
                                    <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        {recentCompletedQuest.payment_method === 'COD' ? (
                                            <><Banknote size={15} strokeWidth={2.2} /> Tunai (COD P2P)</>
                                        ) : recentCompletedQuest.payment_method === 'QRIS' ? (
                                            <><QrCode size={15} strokeWidth={2.2} /> QRIS Dinamis P2P</>
                                        ) : (
                                            recentCompletedQuest.payment_method || 'P2P'
                                        )}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>No. Referensi</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{recentCompletedQuest.payment_reference || '-'}</span>
                                </div>
                                <div style={{ borderTop: '1px dashed var(--border-ink)', margin: '8px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '800' }}>{isWorkerForRecent ? 'Total Diterima (Masuk Saldo)' : 'Total Telah Dibayar'}</span>
                                    <strong style={{ fontSize: '1.15rem', color: 'var(--color-ink-black)' }}>
                                        {formatRupiah(totalRecentAmount)}
                                    </strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={() => navigate('/pembayaran', { state: { questId: recentCompletedQuest._id } })}
                                    className="btn btn-primary"
                                    style={{ width: '100%', margin: 0, backgroundColor: 'var(--accent-green)', color: 'var(--color-ink-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Receipt size={17} strokeWidth={2.2} /> BUKA STRUK DIGITAL RESMI
                                </button>
                                {isWorkerForRecent ? (
                                    <button
                                        onClick={() => navigate('/profil')}
                                        className="btn btn-outline"
                                        style={{ width: '100%', margin: 0, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Coins size={17} strokeWidth={2.2} /> LIHAT TOTAL SALDO DI PROFIL
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/riwayat')}
                                        className="btn btn-outline"
                                        style={{ width: '100%', margin: 0, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <History size={17} strokeWidth={2.2} /> BUKA RIWAYAT TRANSAKSI
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {negotiations.length > 0 ? (
                    <div style={{ padding: '24px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px' }}>PENAWARAN SAYA · MENUNGGU KEPUTUSAN KLIEN</p>
                        {negotiations.map((item) => (
                            <article key={item._id} className="clean-card" style={{ padding: '18px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '9px' }}>
                                    <strong style={{ fontSize: '14px' }}>{item.quest_id?.deskripsi || 'Quest'}</strong>
                                    <span className="badge badge-dark">{item.status}</span>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Klien: {item.client_id?.nama_lengkap || 'Pengguna'} · Upah awal Rp {Number(item.quest_id?.upah_jasa || 0).toLocaleString('id-ID')}</p>
                                <button className="btn btn-green" style={{ width: '100%', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => navigate('/chat', { state: { questId: item.quest_id?._id, conversationId: item._id } })}>
                                    <MessageSquare size={16} strokeWidth={2.2} /> LANJUTKAN CHAT NEGOSIASI
                                </button>
                            </article>
                        ))}
                    </div>
                ) : !recentCompletedQuest ? (
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
                ) : null}
                </div>
                <BottomNav activePage="tugas" />
            </>
        );
    }

    let otherPartyName = "Belum Diambil";
    if (isKlien) {
        if (quest.pekerja_id && typeof quest.pekerja_id === 'object') {
            otherPartyName = quest.pekerja_id.nama_lengkap;
        } else if (quest.pekerja_id) {
            otherPartyName = "Pekerja Terdaftar";
        } else {
            otherPartyName = "Menunggu Pekerja...";
        }
    } else {
        if (quest.pembuat_id && typeof quest.pembuat_id === 'object') {
            otherPartyName = quest.pembuat_id.nama_lengkap;
        } else {
            otherPartyName = "Klien (Pembuat Tugas)";
        }
    }

    return (
        <>
            <div className="fade-up" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '100px' }}>
            
            {/* Success Overlay */}
            {showSuccessUI && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--accent-green)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        backgroundColor: '#ffffff',
                        border: '3px solid var(--border-ink)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        boxShadow: '4px 4px 0 var(--border-ink)'
                    }}>
                        <PartyPopper size={38} strokeWidth={2.2} />
                    </div>
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
                            ? (quest.status === 'IN_PROGRESS'
                                ? 'Pekerja sedang mengerjakan tugas di lokasi Anda'
                                : quest.status === 'TAKEN' 
                                    ? (liveDistance !== null ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> Sedang menuju lokasi ({Math.round(liveDistance)} m)</> : 'Sedang menuju lokasi') 
                                    : 'Menunggu...') 
                            : (quest.status === 'IN_PROGRESS'
                                ? 'Anda sedang mengerjakan tugas ini di lokasi'
                                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> {liveDistance !== null ? Math.round(liveDistance) : Math.round(quest.jarak_meter || 0)} meter dari Anda</>)
                        }
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
                        <MapResizeHandler isExpanded={isMapExpanded} clientLoc={[quest.lokasi.coordinates[1], quest.lokasi.coordinates[0]]} />
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
                    quest.status === 'COMPLETED' ? (
                        quest.rating_pekerja !== null ? (
                            <div className="clean-card" style={{ padding: '20px 21px', border: '2px solid var(--border-ink)', textAlign: 'center', marginBottom: '20px', backgroundColor: 'var(--surface)' }}>
                                <p style={{ color: 'var(--accent-coral)', fontWeight: '800', marginBottom: '8px', fontSize: '13px', textTransform: 'uppercase' }}>Ulasan yang Anda Berikan:</p>
                                <div style={{ fontSize: '1.5rem', color: '#ffb000', marginBottom: '10px' }}>
                                    {'★'.repeat(quest.rating_pekerja)}{'☆'.repeat(5 - quest.rating_pekerja)}
                                </div>
                                <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text-main)' }}>"{quest.ulasan_pekerja || 'Tidak ada ulasan tertulis.'}"</p>
                            </div>
                        ) : (
                            <div className="clean-card" style={{ padding: '20px 21px', border: '2px solid var(--border-ink)', marginBottom: '20px', backgroundColor: 'var(--surface)' }}>
                                <p style={{ color: 'var(--accent-coral)', fontWeight: '800', marginBottom: '12px', fontSize: '13.5px', textAlign: 'center', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <span>Beri Rating Pekerja</span> <Award size={18} strokeWidth={2.2} />
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '2rem', cursor: 'pointer', marginBottom: '14px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span 
                                            key={star} 
                                            onClick={() => setRatingInput(star)}
                                            style={{ color: star <= ratingInput ? '#ffb000' : '#CBD5E1' }}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Tulis ulasan/feedback untuk pekerja..."
                                    value={ulasanInput}
                                    onChange={(e) => setUlasanInput(e.target.value)}
                                    style={{ fontSize: '13px', marginBottom: '14px', resize: 'none' }}
                                />
                                <button onClick={handleKirimRating} disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', marginBottom: 0 }}>
                                    {isSubmitting ? 'Mengirim...' : 'KIRIM RATING & ULASAN'}
                                </button>
                            </div>
                        )
                    ) : quest.status === 'AWAITING_PAYMENT' ? (
                        <div className="clean-card" style={{ padding: '20px 21px', border: '3px solid var(--border-ink)', backgroundColor: '#fff8e6', textAlign: 'center', marginBottom: '20px', boxShadow: '4px 4px 0 var(--border-ink)' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                backgroundColor: '#ffffff',
                                border: '2px solid var(--border-ink)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 10px',
                                boxShadow: '2px 2px 0 var(--border-ink)'
                            }}>
                                <Handshake size={32} strokeWidth={2.2} />
                            </div>
                            <p style={{ color: 'var(--border-ink)', fontWeight: '900', marginBottom: '6px', fontSize: '15px' }}>PEKERJAAN TELAH DILAPORKAN SELESAI</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                                Pekerja telah memasukkan PIN di hadapan Anda. Silakan periksa hasil kerja fisik dan selesaikan pembayaran P2P (Tunai COD atau QRIS).
                            </p>
                            <button onClick={() => navigate('/pembayaran', { state: { questId: quest._id } })} className="btn btn-primary" style={{ width: '100%', margin: 0, backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Banknote size={18} strokeWidth={2.2} /> PERIKSA HASIL & BAYAR P2P (COD / QRIS)
                            </button>
                        </div>
                    ) : (
                        <div className="clean-card" style={{ padding: '20px 21px', border: '2px dashed var(--accent-green)', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: 'var(--accent-green)', fontWeight: '700', marginBottom: '8px', fontSize: '13px' }}>PIN RAHASIA TUGAS INI:</p>
                            <h1 style={{ fontSize: '2.5rem', letterSpacing: '8px', marginBottom: '8px' }}>{quest.pin_rahasia}</h1>
                            <p style={{ fontSize: '13px' }}>Berikan PIN ini kepada Pekerja HANYA jika tugas telah diselesaikan dengan baik.</p>
                        </div>
                    )
                ) : (
                    quest.status === 'COMPLETED' ? (
                        <div className="clean-card" style={{ padding: '20px 21px', border: '2px solid var(--accent-green)', backgroundColor: '#f0fdf4', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: 'var(--accent-green)', fontWeight: '800', marginBottom: '8px', fontSize: '14px' }}>✓ PEMBAYARAN P2P TERVERIFIKASI</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>Quest selesai. Total upah dan talangan <strong>{formatRupiah((quest.agreed_upah || quest.upah_jasa) + (quest.nominal_talangan || 0))}</strong> telah masuk ke catatan Total Pendapatan Anda.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px', marginBottom: '14px', padding: '12px', background: 'var(--surface)', borderRadius: '12px', textAlign: 'left', fontSize: '11px', border: '1px solid var(--border-ink)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Referensi</span><strong style={{ textAlign: 'right' }}>{quest.payment_reference || '-'}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Metode</span><strong style={{ textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>{quest.payment_method === 'COD' ? <><Banknote size={14} strokeWidth={2.2} /> Tunai (COD P2P)</> : quest.payment_method === 'QRIS' ? <><QrCode size={14} strokeWidth={2.2} /> QRIS Dinamis</> : quest.payment_method || '-'}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Status</span><strong style={{ textAlign: 'right', color: 'var(--accent-green)' }}>PAID (LUNAS)</strong>
                            </div>
                            <button onClick={() => navigate('/pembayaran', { state: { questId: quest._id } })} className="btn btn-outline" style={{ width: '100%', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Receipt size={17} strokeWidth={2.2} /> BUKA STRUK DIGITAL RESMI
                            </button>
                        </div>
                    ) : (
                        <div className="clean-card" style={{ padding: '20px 21px', marginBottom: '20px' }}>
                            {quest.status === 'TAKEN' ? (
                                <div style={{ textAlign: 'center' }}>
                                    {!canStartWork && (
                                        <div style={{ width: '100%', backgroundColor: '#fff8c9', border: '2px dashed var(--border-ink)', padding: '13px', borderRadius: 'var(--radius-small)', marginBottom: '14px', color: 'var(--text-main)' }}>
                                            <strong style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                                                SELESAIKAN NEGOSIASI
                                            </strong>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                                Ajukan dan sepakati upah melalui chat sebelum berangkat.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/chat', { state: { questId: quest._id } })}
                                                style={{ width: '100%', minHeight: '46px', marginTop: '12px', padding: '10px 14px', border: '2px solid var(--border-ink)', borderRadius: '999px', backgroundColor: 'var(--accent-green)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '2px 2px 0 var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <MessageSquare size={16} strokeWidth={2.2} /> BUKA CHAT & AJUKAN PENAWARAN
                                            </button>
                                        </div>
                                    )}
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Setelah kesepakatan berhasil, konfirmasi saat Anda tiba di lokasi.</p>
                                    
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
                                        <button onClick={handleMulaiKerja} disabled={!canStartWork || isSubmitting || liveDistance === null} className="btn btn-primary" style={{ width: '100%', marginBottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {!canStartWork ? 'SELESAIKAN NEGOSIASI' : isSubmitting ? 'Memproses...' : (liveDistance === null ? 'Mendeteksi GPS...' : <><MapPin size={18} strokeWidth={2.2} /> SAYA SUDAH SAMPAI</>)}
                                        </button>
                                    )}
                                </div>
                            ) : quest.status === 'AWAITING_PAYMENT' ? (
                                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        backgroundColor: '#ffffff',
                                        border: '2px solid var(--border-ink)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 10px',
                                        boxShadow: '2px 2px 0 var(--border-ink)'
                                    }}>
                                        <Clock size={30} strokeWidth={2.2} />
                                    </div>
                                    <p style={{ color: 'var(--accent-green)', fontWeight: '900', marginBottom: '6px', fontSize: '15px' }}>PIN BERHASIL DIVERIFIKASI ✓</p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                                        Pekerjaan telah diserahkan. Menunggu Klien memeriksa hasil dan menyelesaikan pembayaran P2P (Tunai COD / QRIS).
                                    </p>
                                    <button onClick={() => navigate('/pembayaran', { state: { questId: quest._id } })} className="btn btn-primary" style={{ width: '100%', margin: 0, backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Handshake size={18} strokeWidth={2.2} /> LIHAT STATUS / STRUK PEMBAYARAN P2P
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p style={{ color: 'var(--text-main)', fontWeight: '700', marginBottom: '14px', textAlign: 'center', fontSize: '13px' }}>INPUT PIN PENYELESAIAN</p>
                                    
                                    {quest.kategori === 'jastip' && (
                                        <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>UNGGAH FOTO NOTA / STRUK BELANJA (MOCKUP)</label>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="form-input" 
                                                style={{ fontSize: '12px', padding: '8px 10px', backgroundColor: 'var(--surface)' }} 
                                            />
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>*Wajib melampirkan bukti nota belanja fisik untuk verifikasi talangan.</p>
                                        </div>
                                    )}

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
                    )
                )}

                {/* Daftar penawaran sebelum Pekerja dipilih */}
                {isKlien && quest.status === 'OPEN' && (
                    <button onClick={() => navigate('/chat', { state: { questId: quest._id } })} className="btn" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--accent-yellow)', border: '2px solid var(--border-ink)', boxShadow: '2px 2px 0 var(--border-ink)' }}>
                        <MessageSquare size={17} strokeWidth={2.2} /> LIHAT PENAWARAN & NEGOSIASI
                    </button>
                )}

                {/* Chat pribadi setelah quest diberikan kepada Pekerja */}
                {quest.pekerja_id && (isKlien || quest.status !== 'TAKEN' || canStartWork) && <button onClick={() => navigate('/chat', { state: { questId: quest._id } })} className="btn btn-outline" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                    CHAT DI APLIKASI DENGAN {isKlien ? 'PEKERJA' : 'KLIEN'}
                </button>}

                {quest.pekerja_id && ['AWAITING_PAYMENT', 'COMPLETED'].includes(quest.status) && (
                    <button onClick={() => navigate('/pembayaran', { state: { questId: quest._id } })} className="btn" style={{ marginBottom: '16px', background: quest.payment_status === 'PAID' ? 'var(--accent-green)' : 'var(--accent-yellow)', border: '2px solid var(--border-ink)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {quest.payment_status === 'PAID' ? <><Check size={18} strokeWidth={2.5} /> LIHAT STRUK PEMBAYARAN P2P</> : isKlien ? <><Banknote size={18} strokeWidth={2.2} /> PERIKSA & BAYAR P2P (COD / QRIS)</> : `STATUS BAYAR: ${quest.payment_status || 'UNPAID'}`}
                    </button>
                )}

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
            </div>
            <BottomNav activePage="tugas" />
        </>
    );
}
