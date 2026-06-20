import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminDashboard() {
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({ totalUsers: 0, activeQuests: 0, completedToday: 0, fictitiousOrders: 0 });
    const [users, setUsers] = useState([]);
    const [quests, setQuests] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'quests', 'reports'
    const [searchQuery, setSearchQuery] = useState('');
    const [questFilter, setQuestFilter] = useState('ALL'); // 'ALL', 'OPEN', 'TAKEN', 'COMPLETED', 'CANCELED'
    const [selectedReport, setSelectedReport] = useState(null); // 'users', 'completed', 'canceled', 'turnover'
    const [isLoading, setIsLoading] = useState(true);

    const fetchAdminData = async () => {
        try {
            const statsRes = await axios.get('/api/admin/dashboard');
            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }
            
            const usersRes = await axios.get('/api/admin/users');
            if (usersRes.data.success) {
                setUsers(usersRes.data.data);
            }

            const questsRes = await axios.get('/api/admin/quests');
            if (questsRes.data.success) {
                setQuests(questsRes.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat data admin:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // Mengatur tampilan halaman admin agar lebar penuh (full screen)
    useEffect(() => {
        const root = document.getElementById('root');
        if (root) {
            root.style.maxWidth = '100%';
            root.style.width = '100%';
        }
        return () => {
            if (root) {
                root.style.maxWidth = '430px';
            }
        };
    }, []);

    const toggleStatus = async (userId) => {
        if (!window.confirm("Yakin ingin mengubah status keaktifan pengguna ini?")) return;
        try {
            const res = await axios.put(`/api/admin/users/${userId}/toggle-status`);
            if (res.data.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, status: res.data.data.status } : u));
                toast.error("Status pengguna berhasil diubah.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal mengubah status");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("PERINGATAN: Yakin ingin MENGHAPUS pengguna ini secara permanen? Semua tugas yang terkait juga akan ikut terhapus. Aksi ini tidak dapat dibatalkan!")) return;
        try {
            const res = await axios.delete(`/api/admin/users/${userId}`);
            if (res.data.success) {
                setUsers(users.filter(u => u._id !== userId));
                toast.error("Akun pengguna berhasil dihapus secara permanen.");
                fetchAdminData(); // Refresh data statistik dashboard
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal menghapus pengguna");
        }
    };

    const handleCancelQuest = async (questId) => {
        if (!window.confirm("PERINGATAN: Yakin ingin membatalkan tugas ini secara paksa? Aksi ini akan mengubah status tugas menjadi CANCELED.")) return;
        try {
            const res = await axios.put(`/api/admin/quests/${questId}/cancel`);
            if (res.data.success) {
                setQuests(quests.map(q => q._id === questId ? { ...q, status: 'CANCELED' } : q));
                // Reload stats
                const statsRes = await axios.get('/api/admin/dashboard');
                if (statsRes.data.success) setStats(statsRes.data.data);
                toast.error("Tugas berhasil dibatalkan secara paksa oleh Admin.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal membatalkan tugas");
        }
    };

    // Filter Pengguna berdasarkan pencarian
    const filteredUsers = users.filter(u => 
        u.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.no_whatsapp.includes(searchQuery)
    );

    // Filter Tugas berdasarkan pencarian dan status filter
    const filteredQuests = quests.filter(q => {
        const matchesSearch = q.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.pembuat_id?.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.pekerja_id?.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = questFilter === 'ALL' || q.status === questFilter;
        return matchesSearch && matchesFilter;
    });

    const getReportData = (type) => {
        switch (type) {
            case 'users':
                return {
                    title: 'LAPORAN DATA PENGGUNA TERDAFTAR',
                    number: `LP-USR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Nama Lengkap' },
                        { name: 'Email' },
                        { name: 'No. WhatsApp', align: 'center' },
                        { name: 'Batas Talangan', align: 'right' },
                        { name: 'Status Akun', align: 'center' }
                    ],
                    rows: users.map((u, i) => [
                        i + 1,
                        u.nama_lengkap,
                        u.email,
                        u.no_whatsapp,
                        `Rp ${u.batas_talangan?.toLocaleString('id-ID') || 0}`,
                        u.status === 'ACTIVE' ? 'Aktif' : 'Diblokir'
                    ]),
                    summaries: [
                        { label: 'Total Pengguna', value: users.length },
                        { label: 'Aktif', value: users.filter(u => u.status === 'ACTIVE').length },
                        { label: 'Diblokir', value: users.filter(u => u.status === 'SUSPENDED').length }
                    ]
                };
            case 'completed': {
                const completed = quests.filter(q => q.status === 'COMPLETED');
                return {
                    title: 'LAPORAN TRANSAKSI TUGAS SELESAI',
                    number: `LP-QST-COM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Kategori', align: 'center' },
                        { name: 'Deskripsi' },
                        { name: 'Upah Jasa', align: 'right' },
                        { name: 'Talangan', align: 'right' },
                        { name: 'Klien (Pembuat)' },
                        { name: 'Pekerja' }
                    ],
                    rows: completed.map((q, i) => [
                        i + 1,
                        q.kategori.toUpperCase(),
                        q.deskripsi.length > 50 ? q.deskripsi.substring(0, 50) + "..." : q.deskripsi,
                        `Rp ${q.upah_jasa?.toLocaleString('id-ID') || 0}`,
                        `Rp ${q.nominal_talangan?.toLocaleString('id-ID') || 0}`,
                        q.pembuat_id?.nama_lengkap || 'N/A',
                        q.pekerja_id?.nama_lengkap || 'N/A'
                    ]),
                    summaries: [
                        { label: 'Total Sukses', value: completed.length },
                        { label: 'Total Upah Jasa', value: `Rp ${completed.reduce((acc, curr) => acc + (curr.upah_jasa || 0), 0).toLocaleString('id-ID')}` },
                        { label: 'Total Talangan', value: `Rp ${completed.reduce((acc, curr) => acc + (curr.nominal_talangan || 0), 0).toLocaleString('id-ID')}` }
                    ]
                };
            }
            case 'canceled': {
                const canceled = quests.filter(q => q.status === 'CANCELED');
                return {
                    title: 'LAPORAN PEMBATALAN TUGAS / ORDER FIKTIF',
                    number: `LP-QST-CAN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Kategori', align: 'center' },
                        { name: 'Deskripsi' },
                        { name: 'Upah Jasa', align: 'right' },
                        { name: 'Klien (Pembuat)' },
                        { name: 'Pekerja Terakhir' }
                    ],
                    rows: canceled.map((q, i) => [
                        i + 1,
                        q.kategori.toUpperCase(),
                        q.deskripsi.length > 50 ? q.deskripsi.substring(0, 50) + "..." : q.deskripsi,
                        `Rp ${q.upah_jasa?.toLocaleString('id-ID') || 0}`,
                        q.pembuat_id?.nama_lengkap || 'N/A',
                        q.pekerja_id?.nama_lengkap || 'N/A'
                    ]),
                    summaries: [
                        { label: 'Total Tugas Dibatalkan', value: canceled.length }
                    ]
                };
            }
            case 'turnover': {
                const completed = quests.filter(q => q.status === 'COMPLETED');
                const totalUpah = completed.reduce((acc, curr) => acc + (curr.upah_jasa || 0), 0);
                const totalTalangan = completed.reduce((acc, curr) => acc + (curr.nominal_talangan || 0), 0);
                return {
                    title: 'LAPORAN PERPUTARAN UANG HYPERLOCAL',
                    number: `LP-FIN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Kategori', align: 'center' },
                        { name: 'Upah Jasa', align: 'right' },
                        { name: 'Nominal Talangan', align: 'right' },
                        { name: 'Total Transaksi', align: 'right' },
                        { name: 'Tanggal Transaksi', align: 'center' }
                    ],
                    rows: completed.map((q, i) => {
                        const total = (q.upah_jasa || 0) + (q.nominal_talangan || 0);
                        return [
                            i + 1,
                            q.kategori.toUpperCase(),
                            `Rp ${q.upah_jasa?.toLocaleString('id-ID') || 0}`,
                            `Rp ${q.nominal_talangan?.toLocaleString('id-ID') || 0}`,
                            `Rp ${total.toLocaleString('id-ID')}`,
                            q.completed_at ? new Date(q.completed_at).toLocaleDateString('id-ID') : new Date(q.created_at).toLocaleDateString('id-ID')
                        ];
                    }),
                    summaries: [
                        { label: 'Total Uang Jasa', value: `Rp ${totalUpah.toLocaleString('id-ID')}` },
                        { label: 'Total Uang Talangan', value: `Rp ${totalTalangan.toLocaleString('id-ID')}` },
                        { label: 'Total Perputaran Uang', value: `Rp ${(totalUpah + totalTalangan).toLocaleString('id-ID')}` }
                    ]
                };
            }
            case 'daily_activity': {
                const daily = {};
                quests.forEach(q => {
                    const date = new Date(q.created_at).toLocaleDateString('id-ID');
                    if(!daily[date]) daily[date] = { date, dibuat: 0, selesai: 0, batal: 0 };
                    daily[date].dibuat++;
                    if(q.status === 'COMPLETED') daily[date].selesai++;
                    if(q.status === 'CANCELED') daily[date].batal++;
                });
                const rows = Object.values(daily).map((d, i) => [
                    i + 1, d.date, d.dibuat, d.selesai, d.batal
                ]);
                return {
                    title: 'LAPORAN AKTIVITAS HARIAN SISTEM',
                    number: `LP-ACT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Tanggal', align: 'center' },
                        { name: 'Tugas Dibuat', align: 'center' },
                        { name: 'Tugas Selesai', align: 'center' },
                        { name: 'Tugas Dibatalkan', align: 'center' }
                    ],
                    rows: rows,
                    summaries: [
                        { label: 'Total Hari Aktif', value: rows.length },
                        { label: 'Total Tugas Dibuat', value: quests.length }
                    ]
                };
            }
            case 'worker_performance': {
                const workers = {};
                quests.filter(q => q.pekerja_id).forEach(q => {
                    const wid = q.pekerja_id._id;
                    if(!workers[wid]) workers[wid] = { name: q.pekerja_id.nama_lengkap, no_wa: q.pekerja_id.no_whatsapp, diambil: 0, selesai: 0, batal: 0, upah: 0 };
                    workers[wid].diambil++;
                    if(q.status === 'COMPLETED') { workers[wid].selesai++; workers[wid].upah += (q.upah_jasa || 0); }
                    if(q.status === 'CANCELED') workers[wid].batal++;
                });
                const rows = Object.values(workers).map((w, i) => [
                    i + 1, w.name, w.no_wa, w.selesai, w.batal, `${w.diambil ? Math.round((w.selesai/w.diambil)*100) : 0}%`, `Rp ${w.upah.toLocaleString('id-ID')}`
                ]);
                return {
                    title: 'LAPORAN PERFORMA PEKERJA',
                    number: `LP-WRK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Nama Pekerja' },
                        { name: 'No. WhatsApp' },
                        { name: 'Tugas Selesai', align: 'center' },
                        { name: 'Tugas Batal', align: 'center' },
                        { name: 'Rasio Sukses', align: 'center' },
                        { name: 'Total Upah (Rp)', align: 'right' }
                    ],
                    rows: rows,
                    summaries: [
                        { label: 'Total Pekerja Aktif', value: Object.keys(workers).length }
                    ]
                };
            }
            case 'account_security': {
                const rows = users.map((u, i) => [
                    i + 1, u.nama_lengkap, u.email, u.no_whatsapp || 'Belum diisi', 'Tervalidasi Google', u.status || 'Aktif'
                ]);
                return {
                    title: 'LAPORAN VERIFIKASI AKUN & KEAMANAN',
                    number: `LP-SEC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Nama Pengguna' },
                        { name: 'Email (Google)' },
                        { name: 'No. WA' },
                        { name: 'Verifikasi SSO' },
                        { name: 'Status Akun' }
                    ],
                    rows: rows,
                    summaries: [
                        { label: 'Total Akun Terverifikasi', value: users.length }
                    ]
                };
            }
            case 'popular_categories': {
                const cats = {};
                quests.forEach(q => {
                    const c = q.kategori;
                    if(!cats[c]) cats[c] = { name: c, total: 0, selesai: 0, upah: 0 };
                    cats[c].total++;
                    if(q.status === 'COMPLETED') { cats[c].selesai++; cats[c].upah += (q.upah_jasa || 0); }
                });
                const rows = Object.values(cats).map((c, i) => [
                    i + 1, c.name.toUpperCase(), c.total, c.selesai, `${c.total ? Math.round((c.selesai/c.total)*100) : 0}%`, `Rp ${c.selesai ? Math.round(c.upah/c.selesai).toLocaleString('id-ID') : 0}`
                ]);
                return {
                    title: 'LAPORAN KATEGORI TUGAS TERPOPULER',
                    number: `LP-CAT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Kategori Tugas' },
                        { name: 'Jumlah Tugas', align: 'center' },
                        { name: 'Tugas Selesai', align: 'center' },
                        { name: 'Rasio Selesai', align: 'center' },
                        { name: 'Rata-rata Upah', align: 'right' }
                    ],
                    rows: rows,
                    summaries: [
                        { label: 'Total Kategori', value: Object.keys(cats).length }
                    ]
                };
            }
            default:
                return null;
        }
    };

    if (isLoading) {
        return <div style={{ padding: '60px', textAlign: 'center', fontWeight: 'bold' }}>Memuat panel administrator...</div>;
    }

    const printStyles = `
    @media print {
        body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        #root {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .no-print {
            display: none !important;
        }
        .report-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }
    }
    `;

    // Render Preview Laporan yang Siap Cetak (A4 Layout)
    if (selectedReport) {
        const reportData = getReportData(selectedReport);
        return (
            <div style={{ padding: '30px 20px', minHeight: '100vh', backgroundColor: 'var(--color-cream-paper)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <style>{printStyles}</style>
                
                {/* Control Panel (Hanya di layar, tidak ikut diprint) */}
                <div className="no-print" style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '16px 24px', backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '50px' }}>
                    <button 
                        onClick={() => setSelectedReport(null)}
                        style={{ padding: '10px 20px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', fontFamily: 'var(--font-inter)' }}
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <button 
                        onClick={() => window.print()}
                        style={{ padding: '10px 20px', backgroundColor: 'var(--color-coral-pop)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', fontFamily: 'var(--font-inter)' }}
                    >
                        🖨️ Cetak / Simpan PDF
                    </button>
                </div>

                {/* Lembar Laporan Standar A4 */}
                <div className="report-container" style={{ width: '100%', maxWidth: '850px', backgroundColor: '#fff', border: '1px solid #94A3B8', padding: '48px', boxShadow: 'var(--shadow-card)', boxSizing: 'border-box' }}>
                    {/* Kop Surat Resmi */}
                    <div style={{ borderBottom: '3px double #000', paddingBottom: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ width: '64px', height: '64px', border: '3px solid #1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem', color: '#1E3A8A', borderRadius: '8px' }}>M</div>
                            <div style={{ textAlign: 'center', flex: 1, padding: '0 20px' }}>
                                <p style={{ fontSize: '0.8rem', letterSpacing: '3px', color: '#1E3A8A', margin: 0, fontWeight: '800' }}>APLIKASI MICRO-TASKING HYPER-LOCAL</p>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '4px 0', color: '#0F172A', letterSpacing: '0.5px' }}>{reportData.title}</h1>
                                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>Jl. Ahmad Yani KM 4.5, Kota Banjarmasin, Kalimantan Selatan, Kode Pos 70233</p>
                            </div>
                            <div style={{ width: '64px' }}></div>
                        </div>
                    </div>

                    {/* Meta Info Laporan */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155', border: '1px solid #E2E8F0', padding: '12px 18px', backgroundColor: '#F8FAFC', marginBottom: '24px', borderRadius: '6px' }}>
                        <div>
                            <p style={{ margin: '4px 0' }}><span style={{ fontWeight: '600' }}>No. Laporan:</span> {reportData.number}</p>
                            <p style={{ margin: '4px 0' }}><span style={{ fontWeight: '600' }}>Periode:</span> Semua Data Transaksi (Sampai dengan {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '4px 0' }}><span style={{ fontWeight: '600' }}>Tanggal Cetak:</span> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p style={{ margin: '4px 0' }}><span style={{ fontWeight: '600' }}>Dicetak Oleh:</span> Administrator (nikmatRMT)</p>
                        </div>
                    </div>

                    {/* Tabel Laporan */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginBottom: '28px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1E3A8A', color: '#fff' }}>
                                {reportData.headers && reportData.headers.map((h, i) => (
                                    <th key={i} style={{ border: '1px solid #CBD5E1', padding: '10px 12px', textAlign: h.align || 'left', fontWeight: '700' }}>{h.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.rows && reportData.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={reportData.headers.length} style={{ border: '1px solid #CBD5E1', padding: '20px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>Tidak ada data laporan.</td>
                                </tr>
                            ) : (
                                reportData.rows.map((row, index) => (
                                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                                        {row.map((cell, cIdx) => (
                                            <td key={cIdx} style={{ border: '1px solid #CBD5E1', padding: '10px 12px', color: '#0F172A', textAlign: reportData.headers[cIdx].align || 'left' }}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Ringkasan Data Laporan */}
                    <div style={{ border: '1px solid #CBD5E1', padding: '16px 20px', backgroundColor: '#F8FAFC', fontSize: '0.8rem', marginBottom: '40px', borderRadius: '6px' }}>
                        <p style={{ fontWeight: 'bold', color: '#1E3A8A', marginBottom: '8px', fontSize: '0.85rem' }}>Ringkasan Data:</p>
                        <div style={{ display: 'flex', gap: '48px' }}>
                            {reportData.summaries.map((s, i) => (
                                <p key={i} style={{ margin: 0 }}>{s.label}: <span style={{ fontWeight: '700', color: '#0F172A' }}>{s.value}</span></p>
                            ))}
                        </div>
                    </div>

                    {/* Tanda Tangan Laporan */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: '#0F172A' }}>
                        <div style={{ textAlign: 'center', width: '220px' }}>
                            <p style={{ margin: 0 }}>Banjarmasin, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p style={{ fontWeight: '700', margin: '4px 0 0 0' }}>Administrator</p>
                            <div style={{ borderBottom: '1.5px solid #000', width: '100%', marginTop: '72px', marginBottom: '4px' }}></div>
                            <p style={{ fontWeight: '700', margin: 0 }}>nikmatRMT</p>
                            <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>NIM. 2210020047</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-up" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-cream-paper)', width: '100vw', maxWidth: 'none' }}>
            
            {/* Sidebar */}
            <aside style={{ width: '260px', backgroundColor: 'var(--color-pure-white)', borderRight: '2px solid var(--color-ink-black)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '2px solid var(--color-ink-black)' }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--color-ink-black)', fontWeight: '800' }}>ADMINISTRATOR</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-stone-gray)' }}>Micro-Tasking Panel</p>
                </div>
                
                <nav style={{ padding: '20px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button 
                        onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
                        style={{ 
                            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                            display: 'block', padding: '16px 24px', transition: 'all 0.2s',
                            backgroundColor: activeTab === 'dashboard' ? 'var(--color-fresh-grass)' : 'transparent', 
                            color: activeTab === 'dashboard' ? 'var(--color-ink-black)' : 'var(--color-stone-gray)', 
                            fontWeight: activeTab === 'dashboard' ? '700' : '500', fontFamily: 'var(--font-inter)' 
                        }}
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
                        style={{ 
                            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                            display: 'block', padding: '16px 24px', transition: 'all 0.2s',
                            backgroundColor: activeTab === 'users' ? 'var(--color-fresh-grass)' : 'transparent', 
                            color: activeTab === 'users' ? 'var(--color-ink-black)' : 'var(--color-stone-gray)', 
                            fontWeight: activeTab === 'users' ? '700' : '500', fontFamily: 'var(--font-inter)' 
                        }}
                    >
                        Kelola Pengguna
                    </button>
                    <button 
                        onClick={() => { setActiveTab('quests'); setSearchQuery(''); }}
                        style={{ 
                            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                            display: 'block', padding: '16px 24px', transition: 'all 0.2s',
                            backgroundColor: activeTab === 'quests' ? 'var(--color-fresh-grass)' : 'transparent', 
                            color: activeTab === 'quests' ? 'var(--color-ink-black)' : 'var(--color-stone-gray)', 
                            fontWeight: activeTab === 'quests' ? '700' : '500', fontFamily: 'var(--font-inter)' 
                        }}
                    >
                        Pantau Transaksi
                    </button>
                    <button 
                        onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
                        style={{ 
                            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                            display: 'block', padding: '16px 24px', transition: 'all 0.2s',
                            backgroundColor: activeTab === 'reports' ? 'var(--color-fresh-grass)' : 'transparent', 
                            color: activeTab === 'reports' ? 'var(--color-ink-black)' : 'var(--color-stone-gray)', 
                            fontWeight: activeTab === 'reports' ? '700' : '500', fontFamily: 'var(--font-inter)' 
                        }}
                    >
                        Laporan Cetak
                    </button>
                </nav>

                <div style={{ padding: '20px 24px', borderTop: '2px solid var(--color-ink-black)' }}>
                    <a href="#" onClick={(e) => {e.preventDefault(); navigate('/');}} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Logout
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
                
                {/* Topbar */}
                <header style={{ padding: '20px 32px', backgroundColor: 'var(--color-pure-white)', borderBottom: '2px solid var(--color-ink-black)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: '700' }}>
                        {activeTab === 'dashboard' && "Statistik Sistem Utama"}
                        {activeTab === 'users' && "Kelola Pengguna Aplikasi"}
                        {activeTab === 'quests' && "Pemantauan Transaksi Tugas"}
                        {activeTab === 'reports' && "Pusat Cetak Dokumen Laporan"}
                    </h2>
                    
                    {/* Search Bar - hidden on reports & dashboard */}
                    {activeTab !== 'reports' && activeTab !== 'dashboard' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                placeholder={activeTab === 'users' ? "Cari nama, email, whatsapp..." : "Cari deskripsi, kategori, user..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ padding: '8px 16px', border: '2px solid var(--color-ink-black)', borderRadius: '50px', outline: 'none', width: '280px', fontSize: '0.9rem', fontFamily: 'var(--font-inter)' }} 
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    style={{ padding: '8px 12px', backgroundColor: '#E2E8F0', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)' }}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    )}
                </header>

                <div style={{ padding: '32px', flex: 1 }}>
                    
                    {/* TAB CONTENT: 1. DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <div className="fade-up">
                            {/* Greeting Banner */}
                            <div className="clean-card" style={{ marginBottom: '32px', background: 'var(--color-ink-black)', color: '#fff', border: '2px solid var(--color-ink-black)' }}>
                                <h1 style={{ color: 'var(--color-pure-white)', fontSize: '1.8rem', marginBottom: '8px' }}>Selamat Datang Kembali, Admin nikmatRMT!</h1>
                                <p style={{ color: 'var(--color-cream-paper)', fontSize: '0.95rem', opacity: 0.9 }}>Pantau transaksi harian, amankan transaksi, kelola pengguna yang bermasalah, dan cetak berkas laporan dengan mudah.</p>
                            </div>

                            {/* Stat Cards Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '24px', border: '2px solid var(--color-ink-black)', borderRadius: '24px', borderTop: '4px solid var(--color-fresh-grass)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>TOTAL PENGGUNA</p>
                                    <h1 style={{ fontSize: '2.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>{stats.totalUsers}</h1>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Terdaftar di sistem</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '24px', border: '2px solid var(--color-ink-black)', borderRadius: '24px', borderTop: '4px solid var(--color-coral-pop)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>TUGAS BERJALAN</p>
                                    <h1 style={{ fontSize: '2.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>{stats.activeQuests}</h1>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sedang dikerjakan pekerja</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '24px', border: '2px solid var(--color-ink-black)', borderRadius: '24px', borderTop: '4px solid var(--color-sky-pop)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>SELESAI HARI INI</p>
                                    <h1 style={{ fontSize: '2.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>{stats.completedToday}</h1>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Transaksi sukses hari ini</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '24px', border: '2px solid var(--color-ink-black)', borderRadius: '24px', borderTop: '4px solid var(--color-coral-pop)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '8px' }}>ORDER DIBATALKAN</p>
                                    <h1 style={{ fontSize: '2.2rem', color: 'var(--text-main)', marginBottom: '4px' }}>{quests.filter(q => q.status === 'CANCELED').length}</h1>
                                    <p style={{ fontSize: '0.8rem', color: '#EF4444', fontWeight: '600' }}>Total tugas batal</p>
                                </div>
                            </div>

                            {/* Dua Tabel Ringkasan Cepat di Dashboard */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                {/* User baru */}
                                <div className="clean-card" style={{ padding: '20px' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>Pengguna Terbaru</h3>
                                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {users.slice(0, 3).map((u) => (
                                            <li key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border-light)' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>{u.nama_lengkap}</p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</p>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: u.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2', color: u.status === 'ACTIVE' ? '#065F46' : '#991B1B', fontWeight: '600' }}>
                                                    {u.status === 'ACTIVE' ? 'Aktif' : 'Blokir'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Tugas baru */}
                                <div className="clean-card" style={{ padding: '20px' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>Tugas Terbaru</h3>
                                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {quests.slice(0, 3).map((q) => (
                                            <li key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border-light)' }}>
                                                <div style={{ maxWidth: '70%' }}>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.deskripsi}</p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kategori: {q.kategori}</p>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#F3F4F6', color: 'var(--text-muted)', fontWeight: '600' }}>
                                                    {q.status}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: 2. KELOLA PENGGUNA */}
                    {activeTab === 'users' && (
                        <div className="fade-up clean-card" style={{ padding: 0 }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700' }}>DATA PENGGUNA TERDAFTAR</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {filteredUsers.length} dari {users.length} pengguna</p>
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--color-ink-black)', color: '#fff' }}>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', width: '60px' }}>No</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Nama Lengkap</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>No. WhatsApp</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Saldo Wallet</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Status Akun</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>Data pengguna tidak ditemukan.</td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user, index) => (
                                            <tr key={user._id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '16px 24px', fontWeight: '600', color: 'var(--text-muted)' }}>{index + 1}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.nama_lengkap}</span> {user.role === 'admin' && <span style={{ fontSize: '0.7rem', padding: '1px 6px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '4px', marginLeft: '6px', fontWeight: '700' }}>Admin</span>} <br/>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', color: 'var(--text-main)' }}>{user.no_whatsapp}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '600', color: 'var(--text-main)' }}>
                                                    Rp {user.saldo?.toLocaleString('id-ID') || 0}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    <span style={{ 
                                                        backgroundColor: user.status === 'ACTIVE' ? '#D1FAE5' : '#FEE2E2', 
                                                        color: user.status === 'ACTIVE' ? '#065F46' : '#991B1B',
                                                        padding: '4px 12px', fontWeight: '700', fontSize: '0.8rem', borderRadius: '6px' 
                                                    }}>
                                                        {user.status === 'ACTIVE' ? 'Aktif' : 'Diblokir'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    {user.role !== 'admin' ? (
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                            <button 
                                                                onClick={() => toggleStatus(user._id)}
                                                                style={{ 
                                                                    border: 'none', background: user.status === 'ACTIVE' ? '#F59E0B' : '#10B981', 
                                                                    color: '#fff', padding: '6px 14px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.8rem', transition: 'transform 0.1s' 
                                                                }}
                                                            >
                                                                {user.status === 'ACTIVE' ? 'Blokir' : 'Buka Blokir'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteUser(user._id)}
                                                                style={{ 
                                                                    border: 'none', background: '#EF4444', 
                                                                    color: '#fff', padding: '6px 14px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.8rem', transition: 'transform 0.1s' 
                                                                }}
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB CONTENT: 3. PANTAU TRANSAKSI */}
                    {activeTab === 'quests' && (
                        <div className="fade-up">
                            {/* Filter Status Bar */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                {['ALL', 'OPEN', 'TAKEN', 'COMPLETED', 'CANCELED'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setQuestFilter(filter)}
                                        style={{ 
                                            padding: '8px 16px', border: '1px solid var(--border-light)', borderRadius: '8px', cursor: 'pointer',
                                            backgroundColor: questFilter === filter ? 'var(--primary)' : '#fff',
                                            color: questFilter === filter ? '#fff' : 'var(--text-muted)',
                                            fontWeight: '700', fontSize: '0.85rem'
                                        }}
                                    >
                                        {filter === 'ALL' && "Semua Tugas"}
                                        {filter === 'OPEN' && "Terbuka (OPEN)"}
                                        {filter === 'TAKEN' && "Diambil (TAKEN)"}
                                        {filter === 'COMPLETED' && "Selesai (COMPLETED)"}
                                        {filter === 'CANCELED' && "Dibatalkan (CANCELED)"}
                                    </button>
                                ))}
                            </div>

                            <div className="clean-card" style={{ padding: 0 }}>
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700' }}>MONITORING TRANSAKSI TUGAS</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {filteredQuests.length} dari {quests.length} tugas</p>
                                </div>
                                
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--color-ink-black)', color: '#fff' }}>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', width: '50px' }}>No</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', width: '110px' }}>Kategori</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700' }}>Deskripsi Tugas</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right', width: '140px' }}>Uang Jasa</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700' }}>Pembuat / Pekerja</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'center', width: '130px' }}>Status</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'center', width: '140px' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuests.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>Tidak ada data tugas terdeteksi.</td>
                                            </tr>
                                        ) : (
                                            filteredQuests.map((quest, index) => (
                                                <tr key={quest._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                    <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-muted)' }}>{index + 1}</td>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <span style={{ 
                                                            fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', fontWeight: '700',
                                                            backgroundColor: quest.kategori === 'jastip' ? '#FEE2E2' : quest.kategori === 'fisik' ? '#E0F2FE' : '#FEF3C7',
                                                            color: quest.kategori === 'jastip' ? '#991B1B' : quest.kategori === 'fisik' ? '#0369A1' : '#92400E'
                                                        }}>
                                                            {quest.kategori.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                        {quest.deskripsi}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.9rem' }}>Rp {quest.upah_jasa?.toLocaleString('id-ID')}</span> <br/>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Talangan: Rp {quest.nominal_talangan?.toLocaleString('id-ID') || 0}</span>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Client:</span> {quest.pembuat_id?.nama_lengkap || 'N/A'} <br/>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Pekerja:</span> {quest.pekerja_id?.nama_lengkap || '-'}
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', fontWeight: '700', fontSize: '0.75rem', borderRadius: '6px',
                                                            backgroundColor: quest.status === 'OPEN' ? '#DBEAFE' : quest.status === 'TAKEN' ? '#FEF3C7' : quest.status === 'COMPLETED' ? '#D1FAE5' : '#FEE2E2',
                                                            color: quest.status === 'OPEN' ? '#1E40AF' : quest.status === 'TAKEN' ? '#92400E' : quest.status === 'COMPLETED' ? '#065F46' : '#991B1B',
                                                        }}>
                                                            {quest.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                        {(quest.status === 'OPEN' || quest.status === 'TAKEN') ? (
                                                            <button 
                                                                onClick={() => handleCancelQuest(quest._id)}
                                                                style={{ 
                                                                    border: 'none', background: '#EF4444', 
                                                                    color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.75rem' 
                                                                }}
                                                            >
                                                                Batalkan Paksa
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: 4. LAPORAN CETAK */}
                    {activeTab === 'reports' && (
                        <div className="fade-up">
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>Pilih jenis laporan akademik skripsi di bawah untuk memunculkan pratinjau lembaran cetak dengan kop surat, lalu unduh dokumen sebagai PDF.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                
                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-fresh-grass)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-fresh-grass)', color: 'var(--color-ink-black)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 1</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Data Pengguna</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Mencetak berkas data statistik seluruh user klien dan pekerja yang telah terdaftar di sistem.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('users')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-sky-pop)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-sky-pop)', color: 'var(--color-pure-white)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 2</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Transaksi Selesai</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Mencetak riwayat tugas yang telah selesai diselesaikan dengan pencatatan status COMPLETED.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('completed')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-coral-pop)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-coral-pop)', color: 'var(--color-pure-white)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 3</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Pembatalan & Order Fiktif</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Mencetak data tugas yang dibatalkan oleh pengguna atau dibatalkan paksa karena order fiktif.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('canceled')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-sunshine-pop)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-sunshine-pop)', color: 'var(--color-ink-black)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 4</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Perputaran Uang</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Mencetak akumulasi upah jasa dan nominal talangan dari seluruh sirkulasi dana di sistem.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('turnover')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-fresh-grass)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-fresh-grass)', color: 'var(--color-ink-black)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 5</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Aktifitas Harian Sistem</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Mencatat jumlah tugas dibuat, diambil, selesai, dibatalkan, beserta data pengguna login dan registrasi baru.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('daily_activity')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-sky-pop)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-sky-pop)', color: 'var(--color-pure-white)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 6</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Performa Pekerja</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Mengkalkulasi rasio kesuksesan, total tugas selesai, total upah, dan total jarak tempuh per pekerja aktif.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('worker_performance')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-coral-pop)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-coral-pop)', color: 'var(--color-pure-white)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 7</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Verifikasi Akun & Keamanan</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Memantau status verifikasi Google, duplikasi akun WhatsApp, serta daftar akun yang ditolak atau diblokir.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('account_security')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s', borderLeft: '6px solid var(--color-sunshine-pop)' }}>
                                    <div>
                                        <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: 'var(--color-sunshine-pop)', color: 'var(--color-ink-black)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '14px', fontFamily: 'var(--font-inter)' }}>LAPORAN 8</span>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700', marginBottom: '8px' }}>Kategori Tugas Terpopuler</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>Klasifikasi metrik kepopuleran tugas, rata-rata upah, total perputaran uang, dan rata-rata jarak per kategori.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedReport('popular_categories')}
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}
                                    >
                                        Buka & Cetak Laporan
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
