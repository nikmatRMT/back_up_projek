import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import { stopNativePollingService } from '../utils/notificationHelper';
import { removeStorageItem } from '../utils/storageHelper';
import { LayoutDashboard, Award, LogOut } from 'lucide-react';

export default function Profil() {
    const navigate = useNavigate();
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const MY_USER_ID = localStorage.getItem('myUserId');

    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(!isGuest);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editWA, setEditWA] = useState('');
    const [showWorkersModal, setShowWorkersModal] = useState(false);
    const [topWorkers, setTopWorkers] = useState([]);
    const [loadingWorkers, setLoadingWorkers] = useState(false);

    const handleOpenWorkersModal = async () => {
        setShowWorkersModal(true);
        setLoadingWorkers(true);
        try {
            const res = await axios.get('/api/quests/top-workers');
            if (res.data.success) {
                setTopWorkers(res.data.data);
            }
        } catch {
            toast.error("Gagal memuat daftar pekerja terbaik.");
        } finally {
            setLoadingWorkers(false);
        }
    };

    useEffect(() => {
        if (isGuest) return;
        setIsLoading(true);
        axios.get(`/api/users/profile?user_id=${MY_USER_ID}`)
            .then(res => {
                if (res.data.success) {
                    setProfile(res.data.data);
                    setEditName(res.data.data.nama_lengkap || '');
                    setEditWA(res.data.data.no_whatsapp || '');
                }
            })
            .catch(err => toast.error("Gagal memuat profil: " + err.response?.data?.message))
            .finally(() => setIsLoading(false));
    }, [MY_USER_ID, isGuest]);

    const handleUpdateProfile = () => {
        if (!editName.trim() || !editWA.trim()) {
            return toast.error("Nama dan Nomor WhatsApp tidak boleh kosong!");
        }
        setIsLoading(true);
        axios.put('/api/users/profile', {
            user_id: MY_USER_ID,
            nama_lengkap: editName,
            no_whatsapp: editWA
        })
            .then(res => {
                if (res.data.success) {
                    toast.success("Profil berhasil diperbarui!");
                    setProfile(res.data.data);
                    setIsEditing(false);
                }
            })
            .catch(err => toast.error("Gagal memperbarui profil: " + err.response?.data?.message))
            .finally(() => setIsLoading(false));
    };

    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const executeLogout = async () => {
        // Matikan background polling service native jika ada
        stopNativePollingService().catch(() => {});
        await removeStorageItem('guestMode');
        await removeStorageItem('token');
        await removeStorageItem('myUserId');
        await removeStorageItem('userRole');
        navigate('/login');
    };

    return (
        <>
            <div className="fade-up" style={{ paddingBottom: '100px', backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>

            {/* Header */}
            <header style={{ padding: '20px', backgroundColor: 'var(--surface)', borderBottom: '2px solid var(--border-ink)' }}>
                <h2>Profil Akun</h2>
            </header>

            <div style={{ padding: '20px' }}>

                {/* Profile Card */}
                <div className="clean-card" style={{ padding: '24px 21px', textAlign: 'center', marginBottom: '20px' }}>
                    {/* Avatar */}
                    <div
                        onClick={() => !isGuest && toast.error('Fitur upload foto belum aktif untuk menghemat penyimpanan server.')}
                        style={{ 
                            width: '72px', height: '72px', 
                            backgroundColor: 'var(--accent-green)', 
                            color: 'var(--text-main)', 
                            borderRadius: '50px', 
                            border: '2px solid var(--border-ink)',
                            margin: '0 auto 16px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: 'pointer', position: 'relative' 
                        }}
                    >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--surface)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                        {!isGuest && (
                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'var(--accent-coral)', borderRadius: '50%', padding: '5px', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                            </div>
                        )}
                    </div>

                    {isGuest ? (
                        <>
                            <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Pengguna Tamu</h3>
                            <p style={{ fontSize: '14px' }}>Anda saat ini dalam mode lihat-lihat.</p>
                        </>
                    ) : isLoading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Memuat profil...</p>
                    ) : profile ? (
                        <>
                            {isEditing ? (
                                <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="form-input" style={{ textAlign: 'center' }} placeholder="Nama Lengkap" />
                                    <input 
                                        type="text" 
                                        value={editWA} 
                                        onChange={(e) => {
                                            const cleanValue = e.target.value.replace(/[^0-9]/g, '');
                                            if (cleanValue.length <= 15) {
                                                setEditWA(cleanValue);
                                            }
                                        }} 
                                        maxLength={15}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        className="form-input" 
                                        style={{ textAlign: 'center' }} 
                                        placeholder="Nomor WA (contoh: 0812...)" 
                                    />
                                </div>
                            ) : (
                                <>
                                    <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{profile.nama_lengkap}</h3>
                                    <p style={{ fontSize: '14px', marginBottom: '8px' }}>{profile.email}</p>
                                </>
                            )}
                            <span className={`badge ${profile.kyc_status === 'VERIFIED' ? 'badge-green' : ''}`} style={profile.kyc_status !== 'VERIFIED' ? { background: 'var(--accent-yellow)', border: '1.5px solid var(--border-ink)' } : undefined}>
                                {profile.kyc_status === 'VERIFIED' ? 'Identitas Terverifikasi' : 'Identitas Belum Diverifikasi'}
                            </span>

                            {/* Income Card */}
                            <div style={{ 
                                marginTop: '20px', 
                                backgroundColor: 'var(--accent-green)', 
                                color: 'var(--text-main)', 
                                padding: '18px', 
                                borderRadius: 'var(--radius-cards)', 
                                border: '2px solid var(--border-ink)',
                                textAlign: 'left' 
                            }}>
                                <span className="section-label" style={{ color: 'var(--text-main)', opacity: 0.7, marginBottom: '4px' }}>TOTAL PENDAPATAN (UANG TUNAI)</span>
                                <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2rem)', marginTop: '4px', marginBottom: '4px' }}>
                                    Rp {Number(profile.saldo || 0).toLocaleString('id-ID')}
                                </h1>
                                <p style={{ fontSize: '12px', color: 'var(--text-main)', opacity: 0.65 }}>Uang yang sudah Anda terima langsung dari Klien</p>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Gagal memuat profil.</p>
                    )}
                </div>

                {/* Account Settings */}
                {!isGuest && profile && (
                    <div className="clean-card" style={{ padding: '18px 21px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <span className="section-label">PENGATURAN AKUN</span>
                            <button onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-green)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>
                                {isEditing ? 'SIMPAN' : 'EDIT'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Nomor WhatsApp</span>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{profile.no_whatsapp}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Batas Talangan</span>
                            <span style={{ fontSize: '14px', fontWeight: '700' }}>Rp {profile.batas_talangan.toLocaleString('id-ID')}</span>
                        </div>
                        <button onClick={() => navigate('/verifikasi-identitas')} className="btn" style={{ marginTop: '10px', marginBottom: 0, background: profile.kyc_status === 'VERIFIED' ? 'var(--accent-green)' : 'var(--accent-yellow)', border: '2px solid var(--border-ink)' }}>
                            {profile.kyc_status === 'VERIFIED' ? '✓ LIHAT STATUS VERIFIKASI' : 'VERIFIKASI IDENTITAS (KTP)'}
                        </button>
                    </div>
                )}

                {/* Admin Link */}
                {!isGuest && localStorage.getItem('userRole') === 'admin' && (
                    <div onClick={() => navigate('/admin')} className="clean-card"
                        style={{ padding: '16px 21px', marginBottom: '16px', background: 'var(--color-sandstone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--accent-green)', marginBottom: '2px' }}>
                                <LayoutDashboard size={18} strokeWidth={2.4} />
                                Panel Admin
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Kelola pengguna, pantau tugas, cetak laporan.</p>
                        </div>
                        <span style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold' }}>→</span>
                    </div>
                )}



                {/* Riwayat Link */}
                {!isGuest && (
                    <div onClick={() => navigate('/riwayat')} className="clean-card"
                        style={{ padding: '16px 21px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>Riwayat Tugas</h3>
                            <p style={{ fontSize: '12px', margin: 0 }}>Lihat tugas yang selesai & transaksi uang</p>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</span>
                    </div>
                )}

                {/* Pekerja Terbaik Link */}
                {!isGuest && (
                    <div onClick={handleOpenWorkersModal} className="clean-card"
                        style={{ padding: '16px 21px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>Pekerja Terbaik</h3>
                            <p style={{ fontSize: '12px', margin: 0 }}>Cari & hubungi pekerja dengan rating terbaik</p>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>→</span>
                    </div>
                )}

                {/* Logout */}
                <button onClick={handleLogout} className="btn" style={{ backgroundColor: '#fef2f0', color: 'var(--accent-coral)', border: '2px solid var(--accent-coral)', marginBottom: '16px' }}>
                    {isGuest ? 'KEMBALI KE LOGIN' : 'LOGOUT (KELUAR)'}
                </button>

                {/* Admin Sosmed */}
                {!isGuest && (
                    <div className="clean-card" style={{ padding: '16px 21px', marginTop: '16px' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Sosial Media Admin</h3>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <a href="https://instagram.com/nikmatRMT" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                Instagram
                            </a>
                            <a href="https://github.com/nikmatRMT" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                                GitHub
                            </a>
                            <a href="https://facebook.com/nikmatRMT" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                                Facebook
                            </a>
                            <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                WhatsApp
                            </a>
                        </div>
                    </div>
                )}

                {/* Modal Pekerja Terbaik */}
                {showWorkersModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div className="clean-card" style={{
                            backgroundColor: 'var(--surface)', width: '100%', maxWidth: '440px',
                            maxHeight: '80vh', overflowY: 'auto', padding: '24px', position: 'relative'
                        }}>
                            <button onClick={() => setShowWorkersModal(false)} style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'none', border: 'none', fontSize: '1.2rem',
                                fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-main)'
                            }}>✕</button>

                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                                <Award size={22} strokeWidth={2.4} color="#ffb000" />
                                Rekomendasi Pekerja Terbaik
                            </h2>

                            {loadingWorkers ? (
                                <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>Memuat...</p>
                            ) : topWorkers.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>Belum ada pekerja dengan rating saat ini.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {topWorkers.map((worker) => {
                                        return (
                                            <div key={worker._id} style={{
                                                border: '2px solid var(--border-ink)',
                                                borderRadius: 'var(--radius-small)',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: 'var(--bg-main)'
                                            }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>{worker.nama_lengkap}</h4>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                        <span style={{ color: '#ffb000', fontSize: '0.9rem', fontWeight: '800' }}>★ {worker.rating_rata_rata}</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>({worker.total_ulasan} Ulasan)</span>
                                                    </div>
                                                </div>
                                                <span className="badge badge-green" style={{ fontSize: '9px' }}>
                                                    {worker.kyc_status === 'VERIFIED' ? '✓ TERVERIFIKASI' : 'NOMOR DILINDUNGI'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Modal Konfirmasi Logout */}
                {showLogoutModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div className="clean-card" style={{
                            backgroundColor: 'var(--surface)', width: '100%', maxWidth: '340px',
                            padding: '24px', position: 'relative', textAlign: 'center'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fee2e2', border: '2.5px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}>
                                    <LogOut size={28} strokeWidth={2.4} color="var(--accent-coral)" />
                                </div>
                            </div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>LOGOUT</h2>
                            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                                Apakah Anda yakin ingin keluar dari akun Jasa Warga Anda?
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowLogoutModal(false)} className="btn" style={{
                                    flex: 1, backgroundColor: 'var(--bg-main)', border: '2px solid var(--border-ink)', margin: 0
                                }}>
                                    BATAL
                                </button>
                                <button onClick={executeLogout} className="btn" style={{
                                    flex: 1, backgroundColor: 'var(--accent-coral)', color: 'white', border: '2px solid var(--border-ink)', margin: 0, boxShadow: '2px 2px 0px var(--border-ink)'
                                }}>
                                    KELUAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            </div>
            <BottomNav activePage="profil" />
        </>
    );
}
