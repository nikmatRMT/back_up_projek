import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
            const response = await fetch(`http://localhost:5000/api/quests/history?user_id=${MY_USER_ID}`);
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
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '40px' }}>

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
                            margin: '0 auto 16px' 
                        }}>
                            <span style={{ fontSize: '24px' }}>📜</span>
                        </div>
                        <h3 style={{ marginBottom: '8px' }}>Belum Ada Riwayat</h3>
                        <p style={{ fontSize: '14px' }}>Selesaikan tugas sebagai klien atau pekerja untuk melihat catatan riwayat di sini.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {historyList.map((quest) => {
                            const isKlien = quest.pembuat_id === MY_USER_ID;
                            const totalUang = quest.upah_jasa + (quest.nominal_talangan || 0);
                            
                            return (
                                <div key={quest._id} className="clean-card" style={{ padding: '18px 21px' }}>
                                    {/* Role & Date */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span className={`badge ${isKlien ? 'badge-sunshine' : 'badge-green'}`}>
                                            {isKlien ? 'SAYA KLIEN' : 'SAYA PEKERJA'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {new Date(quest.created_at).toLocaleDateString('id-ID')}
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: '1rem', marginBottom: '4px', textTransform: 'uppercase' }}>{quest.kategori}</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.5' }}>{quest.deskripsi}</p>
                                    
                                    <hr className="divider-dashed" style={{ margin: '0 0 12px' }} />
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>Total Transaksi:</span>
                                        <span style={{ fontSize: '1rem', fontWeight: '800', color: isKlien ? 'var(--accent-coral)' : 'var(--accent-green)' }}>
                                            {isKlien ? '-' : '+'} Rp {totalUang.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Riwayat;
