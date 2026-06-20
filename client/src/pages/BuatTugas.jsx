import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// Ikon kustom agar tidak bergantung pada aset lokal Leaflet
const customIcon = new L.DivIcon({
    html: `<div style="color: var(--color-coral-pop, #ff705d);"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
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

    const handleDapatkanLokasi = () => {
        if (!navigator.geolocation) {
            toast.error('Maaf, browser Anda tidak mendukung fitur lokasi GPS.');
            return;
        }
        setIsMemuatLokasi(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLokasi([latitude, longitude]);
                setLokasiAsli([latitude, longitude]);
                setIsLokasiTerkunci(true);
                setIsMemuatLokasi(false);
            },
            (error) => {
                toast.error('Gagal mendapatkan lokasi. Pastikan Anda telah mengizinkan akses lokasi (Location/GPS) di browser Anda. Error: ' + error.message);
                setIsMemuatLokasi(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleTerbitkan = async (e) => {
        e.preventDefault();
        if (!isLokasiTerkunci) {
            toast.error('Tolong kunci lokasi Anda terlebih dahulu menggunakan tombol GPS!');
            return;
        }

        const nominalTalanganNum = kategori === 'jastip' ? Number(talangan || 0) : 0;
        if (kategori === 'jastip' && nominalTalanganNum > batasTalangan) {
            toast.error(`GAGAL: Nominal talangan (Rp ${nominalTalanganNum.toLocaleString('id-ID')}) melebihi batas talangan akun Anda (Rp ${batasTalangan.toLocaleString('id-ID')}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                pembuat_id: localStorage.getItem('myUserId'),
                kategori: kategori,
                deskripsi: deskripsi,
                upah_jasa: Number(upahJasa),
                nominal_talangan: nominalTalanganNum,
                latitude: lokasi[0],
                longitude: lokasi[1]
            };

            const response = await axios.post('/api/quests', payload);

            if (response.data.success) {
                toast.success('Tugas berhasil diterbitkan! Sistem akan mencarikan pekerja terdekat. PIN Rahasia Anda: ' + response.data.data.pin_rahasia);
                navigate('/beranda');
            }
        } catch (error) {
            console.error('Gagal menerbitkan tugas:', error);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error('GAGAL: ' + error.response.data.message);
            } else {
                toast.error('Terjadi kesalahan sistem saat menghubungi server.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fade-up" style={{ padding: '0 0 100px' }}>
            
            {/* Header */}
            <header style={{ 
                display: 'flex', alignItems: 'center', gap: '14px', 
                padding: '20px', backgroundColor: 'var(--surface)', 
                borderBottom: '2px solid var(--border-ink)' 
            }}>
                <button onClick={() => navigate(-1)} style={{ 
                    background: 'var(--bg-main)', border: '2px solid var(--border-ink)', 
                    borderRadius: '50px', width: '36px', height: '36px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h2>Buat Tugas Baru</h2>
            </header>

            <div style={{ padding: '20px' }}>
                <form onSubmit={handleTerbitkan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Map Section */}
                    <div className="clean-card" style={{ padding: '18px 21px', transform: 'none', transition: 'none' }}>
                        <span className="section-label" style={{ marginBottom: '12px' }}>LOKASI PENGERJAAN (GPS)</span>

                        <div style={{
                            backgroundColor: 'var(--surface)',
                            ...(isMapExpanded ? {
                                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999
                            } : {
                                height: '240px', borderRadius: 'var(--radius-medium)', overflow: 'hidden', border: '2px solid var(--border-ink)', marginTop: '12px', marginBottom: '12px', position: 'relative', zIndex: 1
                            })
                        }}>
                            <MapContainer center={lokasi} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                                <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none', padding: '10px' }}>
                                    <div
                                        className="leaflet-control"
                                        style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', clear: 'both' }}
                                        ref={(ref) => {
                                            if (ref) {
                                                L.DomEvent.disableClickPropagation(ref);
                                                L.DomEvent.disableScrollPropagation(ref);
                                            }
                                        }}
                                    >
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMapExpanded(!isMapExpanded); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'var(--surface)', color: 'var(--text-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', fontFamily: 'var(--font-inter)' }}>
                                            {isMapExpanded ? (
                                                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg> Perkecil</>
                                            ) : (
                                                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg> Perbesar</>
                                            )}
                                        </button>
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDapatkanLokasi(); }} disabled={isMemuatLokasi}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'var(--accent-green)', color: 'var(--text-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', fontFamily: 'var(--font-inter)' }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                                            {isMemuatLokasi ? 'Mencari...' : 'Deteksi Otomatis'}
                                        </button>
                                    </div>
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
                                    icon={customIcon}
                                >
                                    <Popup>{isLokasiTerkunci ? 'Lokasi dikunci. Jarak geser maksimal 100m.' : 'Klik Deteksi Otomatis dulu.'}</Popup>
                                </Marker>
                                {isLokasiTerkunci && (
                                    <Circle center={lokasi} pathOptions={{ fillColor: '#8ed462', color: '#8ed462' }} radius={1000} />
                                )}
                            </MapContainer>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                            Pekerja dalam radius 1 KM akan melihat titik ini. Jika titik GPS kurang presisi, Anda bisa <b>menggeser pin</b> maksimal 100 meter dari lokasi aslinya.
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
                            id="buat-deskripsi"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="form-label">Upah Lelah Pekerja (Rp)</label>
                        <input type="number" value={upahJasa} onChange={(e) => setUpahJasa(e.target.value)} placeholder="Contoh: 5000" className="form-input" required id="buat-upah" />
                        {Number(upahJasa) > 0 && Number(upahJasa) < 2000 && (
                            <div className="speech-bubble" style={{ color: '#EF4444', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                <span>Upah ini tidak masuk akal! Harap berikan nominal yang manusiawi untuk pekerja.</span>
                            </div>
                        )}
                        {Number(upahJasa) >= 2000 && Number(upahJasa) < 5000 && (
                            <div className="speech-bubble" style={{ color: 'var(--accent-coral)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>Upah agak kemurahan nih, mungkin akan lambat diambil pekerja.</span>
                            </div>
                        )}
                        {Number(upahJasa) >= 20000 && Number(upahJasa) <= 100000 && (
                            <div className="speech-bubble" style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                                <span>Upah yang sangat dermawan! Tugas Anda pasti langsung disambar.</span>
                            </div>
                        )}
                        {Number(upahJasa) > 100000 && (
                            <div className="speech-bubble" style={{ color: '#F59E0B', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                <span>Nominalnya terlalu besar! Harap jangan terlalu dermawan.</span>
                            </div>
                        )}
                    </div>

                    {kategori === 'jastip' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="form-label">Dana Talangan Pekerja (Rp) — <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>Opsional</span></label>
                            <input type="number" value={talangan} onChange={(e) => setTalangan(e.target.value)} placeholder="Contoh: 15000" className="form-input" id="buat-talangan" />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Maksimal talangan akun Anda: Rp {batasTalangan.toLocaleString('id-ID')}</p>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="info-box" style={{ borderRadius: 'var(--radius-small)', borderLeft: '4px solid var(--accent-green)' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                            <strong>Perhatian:</strong> Pastikan upah sepadan dengan beban fisik/jarak. Sistem akan mempublikasikan tugas ini ke warga terdekat.
                        </p>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="buat-submit" style={{ marginTop: '4px' }}>
                        {isSubmitting ? 'Mengirim ke Sistem...' : 'Terbitkan Tugas'}
                    </button>
                </form>
            </div>
        </div>
    );
}
