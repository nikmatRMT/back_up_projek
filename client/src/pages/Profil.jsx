import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

export default function Profil() {
    const navigate = useNavigate();
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const MY_USER_ID = localStorage.getItem('myUserId');

    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(!isGuest);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editWA, setEditWA] = useState('');

    useEffect(() => {
        if (!isGuest) {
            axios.get(`/api/users/profile?user_id=${MY_USER_ID}`)
                .then(res => {
                    if (res.data.success) {
                        setProfile(res.data.data);
                        setEditName(res.data.data.nama_lengkap);
                        setEditWA(res.data.data.no_whatsapp);
                    }
                })
                .catch(err => console.error("Gagal load profil:", err))
                .finally(() => setIsLoading(false));
        }
    }, [isGuest, MY_USER_ID]);

    const handleSaveProfile = () => {
        setIsLoading(true);
        axios.put('/api/users/profile', { user_id: MY_USER_ID, nama_lengkap: editName, no_whatsapp: editWA })
            .then(res => {
                if (res.data.success) {
                    setProfile(res.data.data);
                    setIsEditing(false);
                    toast.error('Profil berhasil diperbarui!');
                }
            })
            .catch(err => toast.error("Gagal memperbarui profil: " + err.response?.data?.message))
            .finally(() => setIsLoading(false));
    };

    const handleLogout = () => {
        if (window.confirm('Yakin ingin keluar?')) {
            localStorage.removeItem('guestMode');
            localStorage.removeItem('token');
            localStorage.removeItem('myUserId');
            localStorage.removeItem('userRole');
            navigate('/login');
        }
    };

    return (
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
                                    <input type="text" value={editWA} onChange={(e) => setEditWA(e.target.value)} className="form-input" style={{ textAlign: 'center' }} placeholder="Nomor WA (contoh: 0812...)" />
                                </div>
                            ) : (
                                <>
                                    <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{profile.nama_lengkap}</h3>
                                    <p style={{ fontSize: '14px', marginBottom: '8px' }}>{profile.email}</p>
                                </>
                            )}
                            <span className="badge badge-green">Akun Terverifikasi</span>

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
                            <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
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
                    </div>
                )}

                {/* Admin Link */}
                {!isGuest && localStorage.getItem('userRole') === 'admin' && (
                    <div onClick={() => navigate('/admin')} className="clean-card"
                        style={{ padding: '16px 21px', marginBottom: '16px', background: 'var(--color-sandstone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--accent-green)', marginBottom: '2px' }}>🖥️ Panel Admin</h3>
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

            </div>

            <BottomNav activePage="profil" />
        </div>
    );
}
