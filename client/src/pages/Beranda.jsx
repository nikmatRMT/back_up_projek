import toast from 'react-hot-toast';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import BottomNav from '../components/BottomNav';
import Logo from '../components/Logo';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Motion } from '@capacitor/motion';
import { getCurrentLocation } from '../utils/geolocationHelper';
import { requestNotificationPermission, showNotification, startNativePollingService, updateNativeServiceLocation, checkBatteryOptimizations, requestIgnoreBatteryOptimizations } from '../utils/notificationHelper';

const customIcon = new L.DivIcon({
    html: `<div style="position: relative; width: 38px; height: 46px; display: flex; flex-direction: column; align-items: center;">
        <div style="
            background: #ff705d;
            color: white;
            border-radius: 50%;
            border: 2.5px solid #000;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 2;
        ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="8" y1="13" x2="16" y2="13"></line>
                <line x1="8" y1="17" x2="14" y2="17"></line>
            </svg>
        </div>
        <div style="
            width: 0; 
            height: 0; 
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 10px solid #000;
            margin-top: -3px;
            z-index: 1;
        "></div>
    </div>`,
    className: 'custom-marker',
    iconSize: [38, 46],
    iconAnchor: [19, 46]
});

function MapResizeHandler({ center }) {
    const map = useMap();
    useEffect(() => {
        if (!center) return;
        map.invalidateSize();
        map.setView(center, 16);
        const timer = setTimeout(() => {
            map.invalidateSize();
            map.setView(center, 16);
        }, 100);
        return () => clearTimeout(timer);
    }, [map, center]);
    return null;
}

export default function Beranda() {
    const navigate = useNavigate();
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const MY_USER_ID = localStorage.getItem('myUserId');
    const isNativePlatform = Capacitor.isNativePlatform();

    const [quests, setQuests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedQuest, setSelectedQuest] = useState(null);
    const [stats, setStats] = useState({
        incomeToday: 0,
        incomeMonth: 0,
        questsMonth: 0,
        distanceTodayKm: 0,
        langkahToday: 0,
        kaloriToday: 0
    });
    const [locationError, setLocationError] = useState(false);
    const [transportMode, setTransportMode] = useState('walk');
    const [isBatteryOptimized, setIsBatteryOptimized] = useState(false);

    // State sensor langkah lokal
    const [sensorSteps, setSensorSteps] = useState(0);
    const [sensorCalories, setSensorCalories] = useState(0);
    const [searchRadius, setSearchRadius] = useState(1000); // default 1 km
    const [showFilter, setShowFilter] = useState(false);
    const prevQuestsRef = useRef(null);
    const [lastLoc, setLastLoc] = useState(null);

    // Swipe-down to dismiss modal (Bottom Sheet gesture)
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const touchStartY = useRef(0);
    const modalRef = useRef(null);

    useEffect(() => {
        if (!selectedQuest) {
            setTranslateY(0);
            setIsDragging(false);
        }
    }, [selectedQuest]);

    const handleTouchStart = (e) => {
        if (e.target.closest('.leaflet-container') || e.target.closest('button')) {
            return;
        }
        const modal = modalRef.current;
        if (!modal) return;
        
        if (modal.scrollTop <= 0) {
            touchStartY.current = e.touches[0].clientY;
            setIsDragging(true);
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const diffY = currentY - touchStartY.current;
        
        if (diffY > 0) {
            if (e.cancelable) e.preventDefault();
            setTranslateY(diffY);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (translateY > 120) {
            setSelectedQuest(null);
            setTransportMode('walk');
        } else {
            setTranslateY(0);
        }
    };

    const getTodayKey = () => {
        const now = new Date();
        return now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    };

    const handleBypassBattery = async () => {
        await requestIgnoreBatteryOptimizations();
        setTimeout(async () => {
            const isIgnoring = await checkBatteryOptimizations();
            setIsBatteryOptimized(!isIgnoring);
        }, 3000);
    };

    useEffect(() => {
        if (!isGuest) {
            axios.get(`/api/quests/my-stats?user_id=${MY_USER_ID}`)
                .then(res => {
                    if (res.data.success) {
                        setStats(res.data.data);
                    }
                })
                .catch(err => console.error("Gagal load stats:", err));
        }

        // Cek apakah aplikasi dibatasi optimasi baterainya (untuk Android native)
        if (isNativePlatform) {
            checkBatteryOptimizations().then(isIgnoring => {
                setIsBatteryOptimized(!isIgnoring);
            });
        }

        // Muat data sensor lokal hari ini
        const todayStr = getTodayKey();
        const storedSteps = parseInt(localStorage.getItem(`steps_${todayStr}`)) || 0;
        const storedCalories = parseFloat(localStorage.getItem(`calories_${todayStr}`)) || 0;
        setSensorSteps(storedSteps);
        setSensorCalories(storedCalories);
    }, [isGuest, MY_USER_ID, isNativePlatform]);

    const fetchQuests = useCallback(async (lat, lng, radius) => {
        try {
            const rad = radius || searchRadius;
            const res = await axios.get(`/api/quests/nearby?latitude=${lat}&longitude=${lng}&radius=${rad}`);
            if (res.data.success) {
                const newQuests = res.data.data;

                // Pemicu notifikasi hanya untuk web.
                // Di Android native, notifikasi background ditangani oleh QuestPollingService
                if (!isNativePlatform && prevQuestsRef.current !== null) {
                    const oldIds = new Set(prevQuestsRef.current.map(q => q._id));
                    newQuests.forEach(q => {
                        const makerId = typeof q.pembuat_id === 'object' ? q.pembuat_id?._id : q.pembuat_id;
                        if (!oldIds.has(q._id) && q.status === 'OPEN' && makerId !== MY_USER_ID) {
                            showNotification(
                                "Ada Tugas Baru di Sekitar! 📍",
                                `${q.deskripsi.substring(0, 50)}... (Upah: Rp ${q.upah_jasa.toLocaleString('id-ID')})`
                            );
                        }
                    });
                }
                prevQuestsRef.current = newQuests;
                setQuests(newQuests);
            }
        } catch (err) {
            console.error("Gagal mengambil data tugas:", err);
        } finally {
            setIsLoading(false);
        }
    }, [searchRadius, MY_USER_ID, isNativePlatform]);

    // Izin Notifikasi Browser / Native App
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Jalankan pencarian tugas awal + mulai native polling service
    useEffect(() => {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://housting-for-skripsi.vercel.app';

        getCurrentLocation(
            (pos) => {
                setLocationError(false);
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLastLoc({ lat, lng });
                fetchQuests(lat, lng, searchRadius);

                // Mulai native Android service untuk polling di belakang layar
                startNativePollingService(apiBaseUrl, MY_USER_ID, lat, lng, searchRadius);
            },
            (err) => {
                console.warn("GPS Ditolak/Gagal, menggunakan lokasi default.");
                const errMsg = err.message ? err.message.toLowerCase() : '';
                if (errMsg.includes('location disabled') || errMsg.includes('disabled') || err.code === 2) {
                    toast.error("Sensor GPS HP Anda belum aktif! Harap aktifkan sakelar 'Lokasi' (GPS) pada HP Anda.");
                }
                setLocationError(true);
                setLastLoc({ lat: -3.440, lng: 114.836 });
                fetchQuests(-3.440, 114.836, searchRadius);

                // Mulai native service walaupun GPS gagal (pakai lokasi default)
                startNativePollingService(apiBaseUrl, MY_USER_ID, -3.440, 114.836, searchRadius);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [fetchQuests, searchRadius]);

    // Polling periodik 10 detik untuk update data tugas & memicu notifikasi
    useEffect(() => {
        if (!lastLoc) return;
        const pollInterval = setInterval(() => {
            fetchQuests(lastLoc.lat, lastLoc.lng, searchRadius);
        }, 10000);
        return () => clearInterval(pollInterval);
    }, [lastLoc, searchRadius, fetchQuests]);

    // Resume Check: Saat kembali dari minimize, langsung cek tugas baru
    useEffect(() => {
        const handleResume = () => {
            if (document.visibilityState === 'visible' && lastLoc) {
                console.log("App resumed! Checking for new quests...");
                fetchQuests(lastLoc.lat, lastLoc.lng, searchRadius);
            }
        };
        document.addEventListener('visibilitychange', handleResume);

        // Capacitor App state change (native)
        let appListenerPromise = null;
        if (isNativePlatform) {
            appListenerPromise = CapApp.addListener('appStateChange', (state) => {
                if (state.isActive && lastLoc) {
                    console.log("Native app resumed! Checking for new quests...");
                    fetchQuests(lastLoc.lat, lastLoc.lng, searchRadius);
                }
            });
        }

        return () => {
            document.removeEventListener('visibilitychange', handleResume);
            if (appListenerPromise) {
                appListenerPromise.then(l => l.remove());
            }
        };
    }, [lastLoc, searchRadius, fetchQuests]);

    // Sinkronisasi lokasi & radius ke native background service
    useEffect(() => {
        if (lastLoc) {
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            updateNativeServiceLocation(apiBaseUrl, MY_USER_ID, lastLoc.lat, lastLoc.lng, searchRadius);
        }
    }, [lastLoc, searchRadius, MY_USER_ID]);

    // Deteksi perubahan status GPS (aktif/nonaktif) secara berkala di latar belakang setiap 5 detik
    useEffect(() => {
        const intervalId = setInterval(() => {
            getCurrentLocation(
                (pos) => {
                    if (locationError) {
                        setLocationError(false);
                        setLastLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        fetchQuests(pos.coords.latitude, pos.coords.longitude, searchRadius);
                    }
                },
                (err) => {
                    const isTimeout = err.code === 3 || (err.message && err.message.toLowerCase().includes('timeout'));
                    if (!isTimeout && !locationError) {
                        setLocationError(true);
                        setLastLoc({ lat: -3.440, lng: 114.836 });
                        fetchQuests(-3.440, 114.836, searchRadius);
                    }
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        }, 5000);

        return () => clearInterval(intervalId);
    }, [locationError, fetchQuests, searchRadius]);

    // Registrasi sensor gerak HP akselerometer untuk real-time Pedometer
    useEffect(() => {
        let lastStepTime = 0;
        let isPeak = false;
        let watchHandle = null;

        const processAcceleration = (acc) => {
            if (!acc) return;
            const x = acc.x || 0;
            const y = acc.y || 0;
            const z = acc.z || 0;

            const magnitude = Math.sqrt(x * x + y * y + z * z);
            const now = Date.now();

            // Debounce 350ms agar langkah tidak terhitung ganda terlalu cepat
            if (now - lastStepTime < 350) return;

            // Hentakan ayunan langkah (gaya gravitasi normal bumi ~9.8 m/s^2)
            if (magnitude > 12.0 && !isPeak) {
                isPeak = true;
            }

            // Kembali ke gaya normal (valley) menyelesaikan satu langkah
            if (magnitude < 8.5 && isPeak) {
                isPeak = false;
                lastStepTime = now;

                setSensorSteps((prevSteps) => {
                    const newSteps = prevSteps + 1;
                    const todayStr = getTodayKey();
                    localStorage.setItem(`steps_${todayStr}`, newSteps);
                    return newSteps;
                });

                setSensorCalories((prevCalories) => {
                    const newCalories = prevCalories + 0.04;
                    const todayStr = getTodayKey();
                    localStorage.setItem(`calories_${todayStr}`, newCalories.toFixed(2));
                    return newCalories;
                });
            }
        };

        const startMotionListener = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    // Gunakan native plugin Capacitor Motion untuk bypass secure context restriction
                    watchHandle = await Motion.addListener('accel', (event) => {
                        processAcceleration(event.accelerationIncludingGravity);
                    });
                } catch (err) {
                    console.error("Gagal memulai sensor motion native:", err);
                }
            } else {
                // Fallback untuk browser web biasa
                const handleWebMotion = (event) => {
                    processAcceleration(event.accelerationIncludingGravity);
                };
                window.addEventListener('devicemotion', handleWebMotion);
                watchHandle = {
                    remove: () => window.removeEventListener('devicemotion', handleWebMotion)
                };
            }
        };

        startMotionListener();

        return () => {
            if (watchHandle && typeof watchHandle.remove === 'function') {
                watchHandle.remove();
            }
        };
    }, []);

    const handleActivateGPS = () => {
        getCurrentLocation(
            (pos) => {
                setLocationError(false);
                fetchQuests(pos.coords.latitude, pos.coords.longitude);
                toast.success("Akses GPS berhasil diaktifkan!");
            },
            (err) => {
                console.error(err);
                const errMsg = err.message ? err.message.toLowerCase() : '';
                if (errMsg.includes('location disabled') || errMsg.includes('disabled') || errMsg.includes('enabled') || errMsg.includes('enable') || err.code === 2) {
                    toast.error("Sensor GPS HP Anda belum aktif! Harap tarik menu atas HP Anda dan nyalakan sakelar 'Lokasi' (GPS).");
                } else {
                    toast.error(`Gagal mengaktifkan GPS: ${err.message || err}. Harap periksa perizinan aplikasi di setelan HP Anda.`);
                }
            },
            { enableHighAccuracy: true }
        );
    };

    const handleDeleteQuest = async (questId) => {
        if (!window.confirm("Yakin ingin membatalkan dan menghapus tugas ini secara permanen?")) return;

        try {
            const res = await axios.delete(`/api/quests/${questId}`, {
                data: { pembuat_id: MY_USER_ID }
            });

            if (res.data.success) {
                toast.success(res.data.message);
                setQuests(quests.filter(q => q._id !== questId));
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.message) {
                toast.error('GAGAL: ' + err.response.data.message);
            } else {
                toast.error('Terjadi kesalahan sistem saat mencoba menghapus.');
            }
        }
    };

    const handleTakeQuest = async (questId) => {
        try {
            const res = await axios.put(`/api/quests/${questId}/take`, {
                pekerja_id: MY_USER_ID,
                jarak_meter: selectedQuest?.jarak_meter || 0,
                transport_mode: transportMode
            });
            if (res.data.success) {
                toast.success('Berhasil! Segera laksanakan tugas ini.');
                navigate('/detail-tugas');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengambil tugas. Mungkin sudah diambil orang lain.');
            setQuests(quests.filter(q => q._id !== questId));
            setSelectedQuest(null);
        }
    };

    // --- Perhitungan Gamifikasi ---
    const targetHarian = 50000;
    const progressPersen = Math.min(100, Math.round((stats.incomeToday / targetHarian) * 100));
    const langkah = (stats.langkahToday || 0) + sensorSteps;
    const kalori = Math.round((stats.kaloriToday || 0) + sensorCalories);
    const distanceTodayKm = (stats.distanceTodayKm + (sensorSteps * 0.00075)).toFixed(2);


    return (
        <>
            <div className="fade-up" style={{ paddingBottom: '100px' }}>

                {/* ── Header ────────────────────────────────── */}
                <header style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 20px 16px',
                    backgroundColor: 'var(--surface)',
                    borderBottom: '2px solid var(--border-ink)'
                }}>
                    <div>
                        <h2 style={{ marginBottom: '2px' }}>Tugas di Sekitar Anda</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filter Radius: Maks {searchRadius >= 1000 ? `${searchRadius / 1000} km` : `${searchRadius} m`}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Logo size={44} hasShadow={false} rounded={true} />
                    </div>
                </header>

                <div style={{ padding: '16px 20px' }}>

                    {/* Banner Peringatan GPS Ditolak */}
                    {locationError && (
                        <div className="error-box" style={{
                            marginBottom: '16px',
                            padding: '16px',
                            backgroundColor: 'rgba(248, 113, 113, 0.15)',
                            border: '2px solid var(--accent-coral)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.5'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold', color: 'var(--accent-coral)' }}>
                                <span>⚠️ Akses Lokasi (GPS) Ditolak</span>
                            </div>
                            <p style={{ marginBottom: '8px' }}>
                                Aplikasi tidak dapat mendeteksi lokasi asli Anda. Saat ini tugas ditampilkan menggunakan lokasi default Kelurahan Guntung Paikat.
                            </p>
                            <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
                                Cara Mengaktifkan Kembali:
                            </p>
                            {Capacitor.isNativePlatform() ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <li>Ketuk tombol di bawah untuk mengaktifkan izin GPS bawaan HP secara langsung.</li>
                                        <li>Jika gagal, silakan buka <strong>Setelan HP &gt; Aplikasi &gt; Jasa Warga &gt; Izin</strong> lalu aktifkan izin <strong>Lokasi</strong>.</li>
                                    </ol>
                                    <button
                                        onClick={handleActivateGPS}
                                        className="btn btn-primary"
                                        style={{
                                            marginTop: '8px',
                                            width: '100%',
                                            backgroundColor: 'var(--accent-green)',
                                            borderColor: 'var(--border-ink)'
                                        }}
                                    >
                                        📍 AKTIFKAN GPS SEKARANG
                                    </button>
                                </div>
                            ) : (
                                <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <li>Klik ikon <strong>kunci/gembok (🔒)</strong> atau setelan di sebelah kiri alamat URL web browser Anda.</li>
                                    <li>Ubah izin <strong>Lokasi (Location)</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
                                    <li>Segarkan (refresh) halaman ini untuk memuat ulang lokasi Anda.</li>
                                </ol>
                            )}
                        </div>
                    )}

                    {/* Banner Peringatan Optimasi Baterai (DuraSpeed/Freezing) */}
                    {isBatteryOptimized && (
                        <div className="warning-box" style={{
                            marginBottom: '16px',
                            padding: '16px',
                            backgroundColor: 'rgba(251, 191, 36, 0.15)',
                            border: '2px solid var(--accent-yellow, #f59e0b)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.5'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold', color: 'var(--accent-yellow, #d97706)' }}>
                                <span>⚡ Pembekuan Aplikasi Latar Belakang Terdeteksi</span>
                            </div>
                            <p style={{ marginBottom: '8px' }}>
                                Sistem HP Anda membatasi aplikasi di latar belakang. Notifikasi tugas baru tidak akan muncul jika aplikasi di-minimize kecuali optimasi baterai dinonaktifkan.
                            </p>
                            <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
                                Langkah Mengatasi (Sangat Direkomendasikan):
                            </p>
                            <ol style={{ paddingLeft: '20px', margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <li>Ketuk tombol <strong>Bypass Optimasi</strong> di bawah, cari <strong>Jasa Warga</strong>, lalu ubah ke <strong>"Jangan Dioptimalkan" (Don't Optimize)</strong>.</li>
                                <li>Untuk HP Infinix: Buka <strong>Pengaturan HP &gt; DuraSpeed</strong>, dan aktifkan toggle untuk <strong>Jasa Warga</strong> agar tidak dibekukan.</li>
                            </ol>
                            <button
                                onClick={handleBypassBattery}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    fontWeight: 'bold',
                                    border: '2px solid var(--border-ink)',
                                    background: 'var(--accent-yellow, #fbbf24)',
                                    color: 'var(--border-ink)',
                                    boxShadow: '3px 3px 0 var(--border-ink)',
                                    cursor: 'pointer',
                                    borderRadius: '4px'
                                }}
                            >
                                🔋 Bypass Optimasi Baterai
                            </button>
                        </div>
                    )}

                    {/* ── Tombol Buat Tugas ──────────────────── */}
                    {!isGuest && (
                        <button
                            onClick={() => navigate('/buat-tugas')}
                            className="btn btn-primary"
                            style={{ marginBottom: '16px' }}
                            id="beranda-buat-tugas"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Buat Permintaan Bantuan Baru
                        </button>
                    )}

                    {/* ── Kartu Penghasilan ──────────────────── */}
                    <div className="clean-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ padding: '20px 21px' }}>
                            <span className="section-label" style={{ marginBottom: '8px' }}>REKAP UANG TUNAI (HARI INI)</span>
                            <h1 style={{ fontSize: 'clamp(1.8rem, 7vw, 2.2rem)', marginTop: '8px', marginBottom: '4px' }}>
                                Rp {stats.incomeToday.toLocaleString('id-ID')}
                            </h1>
                            <p style={{ fontSize: '13px', lineHeight: '1.45' }}>
                                Hanya visualisasi uang tunai yang diterima berdasarkan tarif aplikasi. Dapat menjadi patokan <strong style={{ color: 'var(--text-main)' }}>Peringkat Kontribusi</strong> ke depannya.
                            </p>
                        </div>
                        <div style={{
                            backgroundColor: 'var(--bg-main)', borderTop: '2px solid var(--border-ink)',
                            padding: '12px 21px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <span className="section-label">TOTAL BULAN INI</span>
                                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                                    Rp {stats.incomeMonth.toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className="section-label" style={{ justifyContent: 'flex-end' }}>Tugas Selesai</span>
                                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>{stats.questsMonth}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Kartu Target Sampingan ─────────────── */}
                    <div className="clean-card" style={{ padding: '18px 21px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span className="section-label">TARGET SAMPINGAN HARI INI</span>
                            <span className="badge badge-outline" style={{ fontSize: '11px' }}>{progressPersen}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ height: '14px', backgroundColor: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', marginBottom: '12px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPersen}%`, height: '100%', backgroundColor: 'var(--accent-green)', borderRadius: '50px', transition: 'width 1s ease-out' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '14px' }}>
                            <span style={{ color: 'var(--text-main)' }}><strong>Rp {stats.incomeToday.toLocaleString('id-ID')}</strong> terkumpul</span>
                            <span style={{ color: 'var(--text-muted)' }}>target <strong>Rp {targetHarian.toLocaleString('id-ID')}</strong></span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                            {progressPersen >= 100 ? "Luar biasa! Targetmu hari ini sudah tercapai. 🎉" : "Terus semangat mengejar target harianmu!"}
                        </p>
                    </div>

                    {/* ── Kartu Aktivitas Fisik ──────────────── */}
                    <div className="clean-card" style={{ padding: '18px 21px', marginBottom: '24px' }}>
                        <span className="section-label" style={{ marginBottom: '8px' }}>AKTIVITAS FISIKMU HARI INI</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', margin: '12px -21px 0', borderTop: '2px solid var(--border-ink)' }}>
                            <div style={{ flex: 1, borderRight: '2px solid var(--border-ink)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.20, zIndex: 0 }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6" /><path d="M18.65 21.35a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83l.06-.06a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83Z" /><path d="m21.5 21.5-1.4-1.4" /><path d="M3.9 3.9 2.5 2.5" /><path d="M6.4 2.9a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.06.06a2 2 0 0 1-2.83 0L6.34 5.73a2 2 0 0 1 0-2.83Z" /></svg>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{langkah.toLocaleString('id-ID')}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Langkah</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, borderRight: '2px solid var(--border-ink)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.20, zIndex: 0 }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{kalori}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Kalori</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.20, zIndex: 0 }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{distanceTodayKm}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Km</p>
                                </div>
                            </div>
                        </div>
                        <div className="info-box" style={{ borderRadius: '50px', textAlign: 'center', padding: '10px 16px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Setara jogging santai 15 menit — sambil dapat uang!</p>
                        </div>
                    </div>

                    {/* ── Daftar Tugas Tersedia ──────────────── */}

                    <div className="clean-card" style={{ padding: '16px 20px', marginBottom: '16px', backgroundColor: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16.2 7.8-2 2-2 2-2 2" /><circle cx="12" cy="12" r="1" /></svg>
                                RADIUS PENCARIAN
                            </span>
                            <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--accent-coral)' }}>{searchRadius >= 1000 ? `${(searchRadius / 1000).toFixed(1)} KM` : `${searchRadius} meter`}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="5000"
                            step="1"
                            value={searchRadius}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setSearchRadius(val);
                                if (lastLoc) fetchQuests(lastLoc.lat, lastLoc.lng, val);
                            }}
                            style={{
                                width: '100%',
                                cursor: 'pointer',
                                accentColor: 'var(--accent-coral)'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>
                            <span>1m</span>
                            <span>1 KM</span>
                            <span>2.5 KM</span>
                            <span>5 KM</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                <p style={{ color: 'var(--text-muted)' }}>Mencari satelit dan tugas di sekitar...</p>
                            </div>
                        ) : quests.length === 0 ? (
                            <div className="clean-card" style={{ padding: '24px', textAlign: 'center', border: '2px dashed var(--border-ink)' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                        <path d="M12 20h.01" />
                                    </svg>
                                </div>
                                <p style={{ color: 'var(--text-muted)' }}>Belum ada permintaan bantuan dalam radius {searchRadius >= 1000 ? `${(searchRadius / 1000).toFixed(1)} KM` : `${searchRadius} meter`} dari lokasi Anda saat ini.</p>
                            </div>
                        ) : (
                            quests.map((quest) => (
                                <div key={quest._id} className="clean-card" style={{ padding: '18px 21px', marginBottom: '14px' }}>
                                    {/* Badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        <span className="badge badge-dark">
                                            JARAK: {Math.round(quest.jarak_meter)} M
                                        </span>
                                        {quest.pembuat_id === MY_USER_ID && (
                                            <span className="badge badge-outline">TUGAS MILIK ANDA</span>
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>{quest.kategori}</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '14px', lineHeight: '1.5' }}>{quest.deskripsi}</p>

                                    {/* Upah */}
                                    <div style={{ border: '2px solid var(--border-ink)', borderRadius: '50px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Upah Lelah:</span>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Rp {quest.upah_jasa.toLocaleString('id-ID')}</span>
                                    </div>

                                    {quest.nominal_talangan > 0 && (
                                        <div className="info-box" style={{ textAlign: 'center', marginBottom: '14px', borderRadius: 'var(--radius-medium)' }}>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Minta Ditalangi Dulu</p>
                                            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-coral)', marginTop: '2px' }}>Rp {quest.nominal_talangan.toLocaleString('id-ID')}</p>
                                        </div>
                                    )}

                                    {quest.pembuat_id === MY_USER_ID ? (
                                        <button onClick={() => handleDeleteQuest(quest._id)} className="btn" style={{ backgroundColor: '#fef2f0', color: 'var(--accent-coral)', fontWeight: 'bold' }}>
                                            BATALKAN TUGAS (Hapus)
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedQuest(quest)}
                                            className="btn btn-primary"
                                        >
                                            LIHAT DETAIL
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* ── Footer Keterangan ──────────────────── */}
                    <div style={{ border: '2px dashed var(--border-ink)', padding: '16px', borderRadius: 'var(--radius-medium)', textAlign: 'center', marginTop: '8px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Urutan ditentukan oleh Algoritma Haversine ($geoNear) — tugas paling dekat & sepadan tampil lebih dulu.
                        </p>
                    </div>

                </div>

            </div>

            {/* ── MODAL DETAIL TUGAS ────────────────────── */}
            {selectedQuest && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(44,46,42,0.6)', zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '20px' }}>
                    <div 
                        ref={modalRef}
                        className="clean-card fade-up" 
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ 
                            padding: '12px 24px 24px', 
                            width: '100%', 
                            maxWidth: '400px', 
                            maxHeight: '80vh', 
                            overflowY: 'auto',
                            transform: `translateY(${translateY}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        {/* Drag Handle */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-ink, #2c2e2a)', borderRadius: '2px', opacity: 0.25 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', textTransform: 'uppercase' }}>{selectedQuest.kategori}</h3>
                            <button onClick={() => setSelectedQuest(null)} style={{ background: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>&times;</button>
                        </div>

                        {/* Map */}
                        <div style={{ height: '170px', backgroundColor: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: 'var(--radius-medium)', marginBottom: '16px', overflow: 'hidden' }}>
                            <MapContainer
                                center={[selectedQuest.lokasi.coordinates[1], selectedQuest.lokasi.coordinates[0]]}
                                zoom={16}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                                dragging={true}
                                touchZoom={true}
                                doubleClickZoom={true}
                                scrollWheelZoom={true}
                                boxZoom={true}
                                keyboard={true}
                            >
                                <MapResizeHandler center={[selectedQuest.lokasi.coordinates[1], selectedQuest.lokasi.coordinates[0]]} />
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={[selectedQuest.lokasi.coordinates[1], selectedQuest.lokasi.coordinates[0]]} icon={customIcon} />
                            </MapContainer>
                        </div>

                        <p style={{ color: 'var(--text-main)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.55' }}>{selectedQuest.deskripsi}</p>

                        {/* Pricing */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '2px dashed var(--border-ink)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Upah Lelah</span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>Rp {selectedQuest.upah_jasa.toLocaleString('id-ID')}</span>
                        </div>
                        {selectedQuest.nominal_talangan > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '2px dashed var(--border-ink)', paddingBottom: '8px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Dana Talangan</span>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-coral)' }}>Rp {selectedQuest.nominal_talangan.toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        {/* Info Pembayaran */}
                        <div className="info-box" style={{ marginBottom: '20px', borderRadius: 'var(--radius-medium)' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>⚠️</span> INFORMASI PEMBAYARAN
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                Pembayaran bersifat <strong>TUNAI / C.O.D</strong> saat bertatap muka. Pembayaran menggunakan QRIS, E-Wallet, atau kesepakatan bonus tambahan adalah murni <strong>urusan privat</strong> di luar tanggung jawab aplikasi. <br /><br /><strong>Catatan:</strong> Jika uang yang diberikan lebih besar, sistem hanya akan mencatat riwayat upah sesuai nominal yang tercantum di aplikasi ini.
                            </p>
                        </div>

                        {/* Pilihan Transportasi */}
                        {!isGuest && (
                            <div style={{ marginBottom: '20px' }}>
                                <span className="section-label" style={{ marginBottom: '8px' }}>MODE TRANSPORTASI KE LOKASI</span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTransportMode('walk')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '2px solid var(--border-ink)',
                                            backgroundColor: transportMode === 'walk' ? 'var(--accent-green)' : 'var(--surface)',
                                            color: 'var(--text-main)',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: transportMode === 'walk' ? '2px 2px 0px var(--border-ink)' : 'none'
                                        }}
                                    >
                                        🚶 Jalan Kaki
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTransportMode('motorcycle')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '2px solid var(--border-ink)',
                                            backgroundColor: transportMode === 'motorcycle' ? 'var(--accent-coral)' : 'var(--surface)',
                                            color: 'var(--text-main)',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: transportMode === 'motorcycle' ? '2px 2px 0px var(--border-ink)' : 'none'
                                        }}
                                    >
                                        🏍️ Sepeda Motor
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => { setSelectedQuest(null); setTransportMode('walk'); }} className="btn btn-outline" style={{ flex: 1 }}>BATAL</button>
                            {isGuest ? (
                                <button onClick={() => { toast.error('Anda harus Login/Daftar akun sungguhan untuk bisa mengambil tugas dan mendapatkan uang!'); navigate('/login'); }} className="btn btn-green" style={{ flex: 1 }}>LOGIN UNTUK AMBIL</button>
                            ) : (
                                <button onClick={() => handleTakeQuest(selectedQuest._id)} className="btn btn-primary" style={{ flex: 1 }}>AMBIL TUGAS</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bottom Navigation ─────────────────────── */}
            <BottomNav activePage="beranda" />
        </>
    );
}
