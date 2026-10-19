import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { History, ShoppingBag, Wrench, FileText, ShieldCheck } from 'lucide-react';

const Riwayat = () => {
    const navigate = useNavigate();
    const MY_USER_ID = localStorage.getItem('myUserId');
    const [historyList, setHistoryList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!MY_USER_ID) {
            navigate('/login');
            return;
        }
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const cleanApiUrl = API_URL.replace(/\/$/, '');
            const response = await fetch(`${cleanApiUrl}/api/quests/history?user_id=${MY_USER_ID}`);
            const data = await response.json();
            if (data.success) {
                setHistoryList(data.data);
            }
        } catch (error) {
            console.error("Gagal mengambil riwayat:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '110px' }}>

            {/* Header */}
            <header style={{ 
                display: 'flex', alignItems: 'center', gap: '14px', 
                padding: '20px', backgroundColor: 'var(--surface)', 
                borderBottom: '2px solid var(--border-ink)' 
            }}>
                <button onClick={() => navigate('/profil')} style={{ 
                    background: 'var(--bg-main)', border: '2px solid var(--border-ink)', 
                    borderRadius: '50px', width: '36px', height: '36px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)'
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h2>Riwayat Tugas</h2>
            </header>

            <div style={{ padding: '20px' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>Memuat riwayat...</p>
                ) : historyList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div style={{ 
                            width: '64px', height: '64px', 
                            backgroundColor: 'var(--color-sandstone)', 
                            borderRadius: '50px', 
                            border: '2px solid var(--border-ink)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            margin: '0 auto 16px',
                            boxShadow: '2px 2px 0 var(--border-ink)'
                        }}>
                            <History size={28} strokeWidth={2.4} color="var(--color-ink-black)" />
                        </div>
                        <h3 style={{ marginBottom: '8px' }}>Belum Ada Riwayat</h3>
                        <p style={{ fontSize: '14px' }}>Selesaikan tugas sebagai klien atau pekerja untuk melihat catatan riwayat di sini.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {historyList.map((quest) => {
                            const pembuatId = quest.pembuat_id?._id || quest.pembuat_id;
                            const isKlien = pembuatId === MY_USER_ID;
                            const totalUang = quest.upah_jasa + (quest.nominal_talangan || 0);
                            
                            // Mendapatkan info mitra (klien atau pekerja)
                            const mitra = isKlien ? quest.pekerja_id : quest.pembuat_id;
                            const statusSelesai = quest.status === 'COMPLETED';

                            // Ikon kategori
                            let KategoriIconComponent = FileText;
                            let kategoriLabel = 'Lainnya';
                            if (quest.kategori === 'jastip') {
                                KategoriIconComponent = ShoppingBag;
                                kategoriLabel = 'Jasa Titip (Jastip)';
                            } else if (quest.kategori === 'fisik') {
                                KategoriIconComponent = Wrench;
                                kategoriLabel = 'Jasa Fisik';
                            }

                            return (
                                <div key={quest._id} className="clean-card" style={{ 
                                    padding: '20px', 
                                    position: 'relative',
                                    border: '2px solid var(--border-ink)',
                                    boxShadow: statusSelesai ? '4px 4px 0px var(--accent-green)' : '4px 4px 0px var(--accent-coral)',
                                    transition: 'transform 0.2s',
                                    backgroundColor: 'var(--surface)'
                                }}>
                                    {/* Badge Status & Role */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <span className={`badge ${isKlien ? 'badge-sunshine' : 'badge-green'}`}>
                                                {isKlien ? 'SAYA KLIEN' : 'SAYA PEKERJA'}
                                            </span>
                                        </div>
                                        <span className={`badge ${statusSelesai ? 'badge-green' : 'badge-coral'}`} style={{
                                            backgroundColor: statusSelesai ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                            color: statusSelesai ? 'var(--accent-green)' : 'var(--accent-coral)',
                                            border: `1.5px solid ${statusSelesai ? 'var(--accent-green)' : 'var(--accent-coral)'}`,
                                            fontWeight: '700'
                                        }}>
                                            {statusSelesai ? '✓ SELESAI' : '✗ BATAL'}
                                        </span>
                                    </div>

                                    {/* Kategori & Deskripsi */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                                        <div style={{ 
                                            padding: '8px', 
                                            backgroundColor: 'var(--bg-main)', 
                                            border: '2px solid var(--border-ink)', 
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '1.5px 1.5px 0 var(--border-ink)'
                                        }}>
                                            <KategoriIconComponent size={20} strokeWidth={2.2} color="var(--color-ink-black)" />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                {kategoriLabel}
                                            </span>
                                            <p style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600', 
                                                color: 'var(--text-main)', 
                                                marginTop: '4px',
                                                lineHeight: '1.4' 
                                            }}>
                                                {quest.deskripsi}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Info Mitra Kerja */}
                                    {mitra && (
                                        <div style={{ 
                                            backgroundColor: 'var(--bg-main)', 
                                            border: '2px solid var(--border-ink)', 
                                            borderRadius: '8px',
                                            padding: '10px 14px', 
                                            marginBottom: '16px',
                                            fontSize: '13px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>
                                                    {isKlien ? 'PEKERJA (MITRA):' : 'KLIEN (MITRA):'}
                                                </span>
                                                <strong style={{ color: 'var(--text-main)' }}>{mitra.nama_lengkap}</strong>
                                            </div>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10.5px', fontWeight: '700' }}>
                                                <ShieldCheck size={13} strokeWidth={2.2} color="var(--accent-green)" /> NOMOR DILINDUNGI
                                            </span>
                                        </div>
                                    )}

                                    <hr className="divider-dashed" style={{ margin: '0 0 12px', borderColor: 'var(--border-ink)' }} />

                                    {/* Detail Pembayaran */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Upah Jasa:</span>
                                            <span>Rp {quest.upah_jasa?.toLocaleString('id-ID')}</span>
                                        </div>
                                        {quest.nominal_talangan > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Uang Talangan:</span>
                                                <span>Rp {quest.nominal_talangan?.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            marginTop: '6px',
                                            paddingTop: '6px',
                                            borderTop: '1px dashed var(--border-ink)' 
                                        }}>
                                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                                                {isKlien ? 'Total Pengeluaran:' : 'Total Pendapatan:'}
                                            </span>
                                            <span style={{ 
                                                fontSize: '16px', 
                                                fontWeight: '800', 
                                                color: isKlien ? 'var(--accent-coral)' : 'var(--accent-green)' 
                                            }}>
                                                {isKlien ? '-' : '+'} Rp {totalUang.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tanggal Transaksi */}
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: 'var(--text-muted)', 
                                        textAlign: 'right', 
                                        marginTop: '12px' 
                                    }}>
                                        Dibuat pada: {new Date(quest.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <BottomNav activePage="profil" />
        </div>
    );
};

export default Riwayat;
