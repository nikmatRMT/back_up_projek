import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import BottomNav from '../components/BottomNav';

export default function Beranda() {
    const navigate = useNavigate();
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const MY_USER_ID = localStorage.getItem('myUserId');

    const [quests, setQuests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedQuest, setSelectedQuest] = useState(null);
    const [stats, setStats] = useState({
        incomeToday: 0,
        incomeMonth: 0,
        questsMonth: 0,
        distanceTodayKm: 0
    });

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
    }, [isGuest, MY_USER_ID]);

    useEffect(() => {
        const fetchQuests = async (lat, lng) => {
            try {
                const res = await axios.get(`/api/quests/nearby?latitude=${lat}&longitude=${lng}`);
                if (res.data.success) {
                    setQuests(res.data.data);
                }
            } catch (err) {
                console.error("Gagal mengambil data tugas:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchQuests(pos.coords.latitude, pos.coords.longitude),
                (err) => {
                    console.warn("GPS Ditolak/Gagal, menggunakan lokasi default.");
                    fetchQuests(-3.440, 114.836);
                }
            );
        } else {
            fetchQuests(-3.440, 114.836);
        }
    }, []);

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
            const res = await axios.put(`/api/quests/${questId}/take`, { pekerja_id: MY_USER_ID });
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
    const langkah = Math.round(stats.distanceTodayKm * 1300);
    const kalori = Math.round(stats.distanceTodayKm * 55);

    return (
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
                    <p style={{ fontSize: '13px' }}>Filter Radius: Maks 1 km</p>
                </div>
                <button style={{ 
                    background: 'var(--accent-green)', border: '2px solid var(--border-ink)', 
                    borderRadius: '50px', width: '40px', height: '40px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </header>

            <div style={{ padding: '16px 20px' }}>
                
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
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.65 21.35a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83l.06-.06a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83Z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.4 2.9a2 2 0 0 1 2.83 0l5.66 5.66a2 2 0 0 1 0 2.83l-.06.06a2 2 0 0 1-2.83 0L6.34 5.73a2 2 0 0 1 0-2.83Z"/></svg>
                            </div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{langkah.toLocaleString('id-ID')}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Langkah</p>
                            </div>
                        </div>
                        <div style={{ flex: 1, borderRight: '2px solid var(--border-ink)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.20, zIndex: 0 }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                            </div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{kalori}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Kalori</p>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.20, zIndex: 0 }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
                            </div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{stats.distanceTodayKm}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Km</p>
                            </div>
                        </div>
                    </div>
                    <div className="info-box" style={{ borderRadius: '50px', textAlign: 'center', padding: '10px 16px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Setara jogging santai 15 menit — sambil dapat uang!</p>
                    </div>
                </div>

                {/* ── Daftar Tugas Tersedia ──────────────── */}

                <div style={{ marginTop: '12px' }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <p style={{ color: 'var(--text-muted)' }}>Mencari satelit dan tugas di sekitar...</p>
                        </div>
                    ) : quests.length === 0 ? (
                        <div className="clean-card" style={{ padding: '24px', textAlign: 'center', border: '2px dashed var(--border-ink)' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                                    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                                    <path d="M12 20h.01"/>
                                </svg>
                            </div>
                            <p style={{ color: 'var(--text-muted)' }}>Belum ada permintaan bantuan dalam radius 1 KM dari lokasi Anda saat ini.</p>
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

            {/* ── MODAL DETAIL TUGAS ────────────────────── */}
            {selectedQuest && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(44,46,42,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="clean-card fade-up" style={{ padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', textTransform: 'uppercase' }}>{selectedQuest.kategori}</h3>
                            <button onClick={() => setSelectedQuest(null)} style={{ background: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: '50px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>&times;</button>
                        </div>
                        
                        {/* Map */}
                        <div style={{ height: '170px', backgroundColor: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: 'var(--radius-medium)', marginBottom: '16px', overflow: 'hidden' }}>
                            <MapContainer center={[selectedQuest.lokasi.coordinates[1], selectedQuest.lokasi.coordinates[0]]} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={[selectedQuest.lokasi.coordinates[1], selectedQuest.lokasi.coordinates[0]]} />
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

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setSelectedQuest(null)} className="btn btn-outline" style={{ flex: 1 }}>BATAL</button>
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
        </div>
    );
}
