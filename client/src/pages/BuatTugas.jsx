import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { getCurrentLocation } from '../utils/geolocationHelper';

// Ikon kustom Kertas Quest (Scroll / Document) dengan tema Neobrutalism
const questPaperIcon = new L.DivIcon({
    html: `<div style="
        background: #ff705d;
        color: white;
        padding: 6px;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2.5px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
    ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="8" y1="13" x2="16" y2="13"></line>
            <line x1="8" y1="17" x2="14" y2="17"></line>
        </svg>
    </div>`,
    className: 'custom-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
});

function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom(), { duration: 0.5 });
        }
    }, [center, map]);
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

function MapClickHandler({ setLokasi, setIsLokasiTerkunci, lokasiAsli }) {
    useMapEvents({
        click(e) {
            if (!lokasiAsli) {
                toast.error("Wajib menyalakan fitur 'Deteksi Otomatis' terlebih dahulu sebelum menentukan lokasi pin.");
                return;
            }
            const distance = L.latLng(lokasiAsli[0], lokasiAsli[1]).distanceTo(e.latlng);
            if (distance > 100) {
                toast.error(`Pin ditolak! Jarak maksimum 100 meter dari lokasi GPS asli Anda (Jarak klik: ${Math.round(distance)} meter).`);
                return;
            }
            setLokasi([e.latlng.lat, e.latlng.lng]);
            setIsLokasiTerkunci(true);
        }
    });
    return null;
}

export default function BuatTugas() {
    const navigate = useNavigate();

    const [kategori, setKategori] = useState('jastip');
    const [isKategoriOpen, setIsKategoriOpen] = useState(false);
    const [deskripsi, setDeskripsi] = useState('');
    const [upahJasa, setUpahJasa] = useState('');
    const [talangan, setTalangan] = useState('');
    const [batasTalangan, setBatasTalangan] = useState(20000);

    const [lokasi, setLokasi] = useState([-3.440, 114.836]);
    const [lokasiAsli, setLokasiAsli] = useState(null);
    const [isLokasiTerkunci, setIsLokasiTerkunci] = useState(false);
    const [isMemuatLokasi, setIsMemuatLokasi] = useState(false);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            const myUserId = localStorage.getItem('myUserId');
            if (myUserId) {
                try {
                    const res = await axios.get(`/api/users/profile?user_id=${myUserId}`);
                    if (res.data.success && res.data.data) {
                        setBatasTalangan(res.data.data.batas_talangan ?? 20000);
                    }
                } catch (e) {
                    console.error("Gagal memuat profil pengguna:", e);
                }
            }
        };
        fetchUserProfile();
    }, []);

    const getDistance = (coords1, coords2) => {
        if (!coords1 || !coords2) return 0;
        const lat1 = coords1[0];
        const lon1 = coords1[1];
        const lat2 = coords2[0];
        const lon2 = coords2[1];

        const R = 6371e3; // metres
        const phi1 = lat1 * Math.PI/180;
        const phi2 = lat2 * Math.PI/180;
        const deltaPhi = (lat2-lat1) * Math.PI/180;
        const deltaLambda = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in metres
    };

    const handleDeteksiLokasi = () => {
        setIsMemuatLokasi(true);
        getCurrentLocation(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLokasi([lat, lng]);
                setLokasiAsli([lat, lng]);
                setIsLokasiTerkunci(true);
                setIsMemuatLokasi(false);
                toast.success("Lokasi GPS presisi Anda berhasil dideteksi!");
            },
            (err) => {
                setIsMemuatLokasi(false);
                const errMsg = err.message ? err.message.toLowerCase() : '';
                if (errMsg.includes('location disabled') || errMsg.includes('disabled') || err.code === 2) {
                    toast.error("Sensor GPS HP Anda belum aktif! Harap aktifkan sakelar 'Lokasi' (GPS) pada HP Anda.");
                } else {
                    toast.error("Gagal mendeteksi lokasi GPS. Pastikan izin lokasi aktif.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isLokasiTerkunci) {
            toast.error("Harap tekan tombol 'Deteksi Otomatis' untuk menentukan lokasi tugas!");
            return;
        }

        const myUserId = localStorage.getItem('myUserId');
        if (!myUserId) {
            toast.error("Sesi Anda berakhir. Harap login kembali.");
            navigate('/');
            return;
        }

        if (!deskripsi.trim()) {
            toast.error("Deskripsi tugas tidak boleh kosong.");
            return;
        }

        const numUpah = Number(upahJasa);
        if (!numUpah || numUpah < 1000) {
            toast.error("Upah jasa minimal Rp 1.000.");
            return;
        }

        const numTalangan = Number(talangan) || 0;

        if (kategori === 'jastip' && numTalangan > batasTalangan) {
            toast.error(`Nominal talangan (Rp ${numTalangan.toLocaleString('id-ID')}) melebihi batas akun Anda (Rp ${batasTalangan.toLocaleString('id-ID')}).`);
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await axios.post('/api/quests/create', {
                pembuat_id: myUserId,
                kategori,
                deskripsi: deskripsi.trim(),
                upah_jasa: numUpah,
                nominal_talangan: numTalangan,
                latitude: lokasi[0],
                longitude: lokasi[1]
            });

            if (res.data.success) {
                toast.success("Quest Baru Berhasil Dipublikasikan!");
                navigate('/beranda');
            } else {
                toast.error(res.data.message || "Gagal memublikasikan quest.");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Terjadi kesalahan sistem saat membuat quest.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isGuest = localStorage.getItem('guestMode') === 'true';

    if (isGuest) {
        return (
            <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Fitur Khusus Warga</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                    Anda berada dalam mode Tamu. Silakan daftar atau login dengan akun warga untuk membuat tugas baru.
                </p>
                <button 
                    className="btn btn-primary" 
                    onClick={() => {
                        localStorage.removeItem('guestMode');
                        navigate('/');
                    }}
                >
                    Login / Daftar Sekarang
                </button>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ paddingBottom: '90px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '2px solid var(--border-ink)', backgroundColor: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                <button 
                    onClick={() => navigate('/beranda')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold' }}>Buat Tugas Baru</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Peta Lokasi (Leaflet) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="form-label">Lokasi Pengerjaan (GPS)</label>
                    <div style={{ 
                        border: '2px solid var(--border-ink)', 
                        borderRadius: '16px', 
                        overflow: 'hidden', 
                        backgroundColor: 'var(--surface)',
                        boxShadow: '3px 3px 0 var(--border-ink)',
                        position: 'relative'
                    }}>
                        <div style={{ height: isMapExpanded ? '380px' : '220px', width: '100%', position: 'relative', transition: 'height 0.3s ease' }}>
                            <MapContainer 
                                center={lokasi} 
                                zoom={16} 
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={true}
                            >
                                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={handleDeteksiLokasi}
                                        disabled={isMemuatLokasi}
                                        style={{
                                            backgroundColor: '#8ed462',
                                            color: 'var(--border-ink)',
                                            border: '2px solid var(--border-ink)',
                                            borderRadius: '20px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            boxShadow: '2px 2px 0 var(--border-ink)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20"/></svg>
                                        {isMemuatLokasi ? 'Mendeteksi...' : 'Deteksi Otomatis'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsMapExpanded(!isMapExpanded)}
                                        style={{
                                            backgroundColor: 'var(--surface)',
                                            color: 'var(--border-ink)',
                                            border: '2px solid var(--border-ink)',
                                            borderRadius: '20px',
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            boxShadow: '2px 2px 0 var(--border-ink)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                                        {isMapExpanded ? 'Kecilkan' : 'Perbesar'}
                                    </button>
                                </div>

                                <MapUpdater center={lokasi} />
                                <MapResizeHandler isExpanded={isMapExpanded} />
                                <MapClickHandler setLokasi={setLokasi} setIsLokasiTerkunci={setIsLokasiTerkunci} lokasiAsli={lokasiAsli} />
                                <TileLayer keepBuffer={50} updateWhenZooming={false} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker
                                    draggable={true}
                                    eventHandlers={{
                                        dragend: (e) => {
                                            if (!lokasiAsli) {
                                                toast.error("Wajib menyalakan fitur 'Deteksi Otomatis' terlebih dahulu sebelum menentukan lokasi pin.");
                                                setLokasi([-3.440, 114.836]);
                                                return;
                                            }
                                            const marker = e.target;
                                            const pos = marker.getLatLng();
                                            const distance = L.latLng(lokasiAsli[0], lokasiAsli[1]).distanceTo(pos);
                                            if (distance > 100) {
                                                toast.error(`Pin ditolak! Jarak maksimum 100 meter dari lokasi GPS asli Anda (Jarak geser: ${Math.round(distance)} meter).`);
                                                setLokasi([...lokasiAsli]);
                                            } else {
                                                setLokasi([pos.lat, pos.lng]);
                                                setIsLokasiTerkunci(true);
                                            }
                                        }
                                    }}
                                    position={lokasi}
                                    icon={questPaperIcon}
                                >
                                    <Popup>{isLokasiTerkunci ? 'Lokasi dikunci. Jarak geser maksimal 100m.' : 'Klik Deteksi Otomatis dulu.'}</Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', padding: '10px 12px', margin: 0, borderTop: '1px solid var(--border-ink)' }}>
                            Tentukan titik lokasi pengerjaan tugas pada peta. Jika titik GPS kurang presisi, Anda bisa <b>menggeser ikon kertas quest</b> maksimal 100 meter dari lokasi aslinya.
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label">Kategori Tugas</label>
                        <div style={{ position: 'relative' }}>
                            <div 
                                className="form-input" 
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: 'var(--surface)', userSelect: 'none' }}
                                onClick={() => setIsKategoriOpen(!isKategoriOpen)}
                            >
                                <span>
                                    {kategori === 'jastip' ? 'Jasa Titip (Belanja / Antar)' : 
                                     kategori === 'fisik' ? 'Bantuan Fisik (Angkat Barang)' : 
                                     'Perbaikan Ringan'}
                                </span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isKategoriOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            
                            {isKategoriOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: 'var(--surface)', border: '2px solid var(--border-ink)', borderRadius: '12px', zIndex: 10, overflow: 'hidden', boxShadow: '4px 4px 0 var(--border-ink)' }}>
                                    {[
                                        { id: 'jastip', label: 'Jasa Titip (Belanja / Antar)' },
                                        { id: 'fisik', label: 'Bantuan Fisik (Angkat Barang)' },
                                        { id: 'perbaikan', label: 'Perbaikan Ringan' }
                                    ].map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={() => { setKategori(item.id); setIsKategoriOpen(false); }}
                                            style={{ 
                                                padding: '12px 16px', 
                                                cursor: 'pointer', 
                                                backgroundColor: kategori === item.id ? 'var(--bg-main)' : 'transparent',
                                                borderBottom: item.id !== 'perbaikan' ? '2px solid var(--border-ink)' : 'none',
                                                fontWeight: kategori === item.id ? '600' : '500'
                                            }}
                                            onMouseEnter={(e) => { if(kategori !== item.id) e.target.style.backgroundColor = 'var(--bg-main)'; }}
                                            onMouseLeave={(e) => { if(kategori !== item.id) e.target.style.backgroundColor = 'transparent'; }}
                                        >
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label">Deskripsi Tugas</label>
                        <textarea
                            value={deskripsi}
                            onChange={(e) => setDeskripsi(e.target.value)}
                            placeholder={
                                kategori === 'jastip' ? "Contoh: Tolong belikan nasi goreng di depan gang, pedas sedang..." :
                                kategori === 'fisik' ? "Contoh: Tolong bantu angkat galon air dari teras ke dapur..." :
                                "Contoh: Tolong pasangkan lampu yang putus di teras rumah, saya punya tangganya..."
                            }
                            rows="3"
                            className="form-input"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="form-label">Upah Jasa (Rp)</label>
                            <input
                                type="number"
                                value={upahJasa}
                                onChange={(e) => setUpahJasa(e.target.value)}
                                placeholder="5000"
                                className="form-input"
                                min="1000"
                                step="1000"
                                required
                            />
                        </div>

                        {kategori === 'jastip' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label className="form-label">Dana Talangan (Rp)</label>
                                <input
                                    type="number"
                                    value={talangan}
                                    onChange={(e) => setTalangan(e.target.value)}
                                    placeholder="20000"
                                    className="form-input"
                                    max={batasTalangan}
                                    step="1000"
                                />
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Maksimal: Rp {batasTalangan.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary"
                        style={{ marginTop: '12px', width: '100%', padding: '14px', fontSize: '16px' }}
                    >
                        {isSubmitting ? 'Memublikasikan Quest...' : '🚀 Publikasikan Quest'}
                    </button>

                </div>
            </form>
        </div>
    );
}
