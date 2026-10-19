import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { removeStorageItem } from '../utils/storageHelper';
import Logo from '../components/Logo';
import { Banknote, QrCode, Building2, Wallet, Printer, Check, X, Clock, Camera, ShieldCheck, CreditCard, ExternalLink, RotateCcw, LogOut } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({ totalUsers: 0, activeQuests: 0, completedToday: 0, fictitiousOrders: 0 });
    const [users, setUsers] = useState([]);
    const [quests, setQuests] = useState([]);
    const [payments, setPayments] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'quests', 'payments', 'reports'
    const [searchQuery, setSearchQuery] = useState('');
    const [questFilter, setQuestFilter] = useState('ALL'); // 'ALL', 'OPEN', 'TAKEN', 'COMPLETED', 'CANCELED'
    const [kycFilter, setKycFilter] = useState('ALL'); // 'ALL', 'VERIFIED', 'UNVERIFIED', 'REJECTED'
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL'); // 'ALL', 'PAID', 'PENDING', 'UNPAID', 'FAILED', 'REFUNDED'
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL'); // 'ALL', 'QRIS', 'VA', 'EWALLET'
    const [selectedReport, setSelectedReport] = useState(null); // 'users', 'completed', 'canceled', 'turnover'
    const [isLoading, setIsLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [selectedKycUser, setSelectedKycUser] = useState(null);
    const [selectedPaymentQuest, setSelectedPaymentQuest] = useState(null);
    const MY_USER_ID = localStorage.getItem('myUserId');
    const [adminName, setAdminName] = useState(localStorage.getItem('userName') || 'Admin');

    const fetchAdminData = async () => {
        try {
            const statsRes = await axios.get('/api/admin/dashboard');
            if (statsRes.data.success) {
                setStats(statsRes.data.data);
            }
            
            const usersRes = await axios.get('/api/admin/users');
            if (usersRes.data.success) {
                setUsers(usersRes.data.data);
                const currentAdmin = usersRes.data.data.find(u => u._id === MY_USER_ID);
                if (currentAdmin) {
                    setAdminName(currentAdmin.nama_lengkap);
                    localStorage.setItem('userName', currentAdmin.nama_lengkap);
                }
            }

            const questsRes = await axios.get('/api/admin/quests');
            if (questsRes.data.success) {
                setQuests(questsRes.data.data);
            }

            const paymentsRes = await axios.get('/api/admin/payments');
            if (paymentsRes.data.success) {
                setPayments(paymentsRes.data.data);
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

    const handleResetPassword = async (userId) => {
        if (!window.confirm("Yakin ingin mereset password pengguna ini menjadi 'warga123'?")) return;
        try {
            const res = await axios.put(`/api/admin/users/${userId}/reset-password`);
            if (res.data.success) {
                toast.success(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal mereset password");
        }
    };

    const handleUpdateKycStatus = async (userId, targetStatus, reason = '') => {
        let actionWord = targetStatus === 'VERIFIED' ? 'MENYETUJUI / MEMVERIFIKASI' : targetStatus === 'REJECTED' ? 'MENOLAK' : 'MEMBATALKAN / MENCABUT';
        if (targetStatus === 'REJECTED' && !reason) {
            const inputReason = window.prompt("Masukkan alasan penolakan verifikasi KTP (opsional):", "Data foto KTP buram atau tidak sesuai.");
            if (inputReason === null) return; // User canceled prompt
            reason = inputReason.trim() || 'Verifikasi ditolak oleh Administrator.';
        } else if (!window.confirm(`Yakin ingin ${actionWord} status verifikasi pengguna ini?`)) {
            return;
        }

        try {
            const res = await axios.put(`/api/admin/users/${userId}/kyc-status`, {
                status: targetStatus,
                rejection_reason: reason
            });
            if (res.data.success) {
                const updatedUser = res.data.data;
                setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...updatedUser } : u));
                if (selectedKycUser && selectedKycUser._id === userId) {
                    setSelectedKycUser(prev => ({ ...prev, ...updatedUser }));
                }
                if (targetStatus === 'VERIFIED') {
                    toast.success(res.data.message || "Pengguna berhasil diverifikasi!");
                } else if (targetStatus === 'REJECTED') {
                    toast.error(res.data.message || "Verifikasi pengguna ditolak.");
                } else {
                    toast.success(res.data.message || "Status verifikasi berhasil dicabut.");
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal memperbarui status KYC");
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

    const handleProcessRefund = async (questId) => {
        const reason = window.prompt("Masukkan alasan pemrosesan refund dana:", "Pengembalian dana akibat sengketa / pembatalan tugas.");
        if (reason === null) return; // Batal
        if (!window.confirm("PERINGATAN: Yakin ingin memproses REFUND untuk transaksi tugas ini? Status pembayaran akan diubah menjadi REFUNDED.")) return;

        try {
            const res = await axios.put(`/api/admin/payments/${questId}/refund`, { reason: reason.trim() });
            if (res.data.success) {
                toast.success(res.data.message || "Dana berhasil di-refund.");
                const updated = res.data.data;
                setPayments(prev => prev.map(p => p._id === questId ? { ...p, payment_status: 'REFUNDED', refund_reason: updated.refund_reason } : p));
                setQuests(prev => prev.map(q => q._id === questId ? { ...q, payment_status: 'REFUNDED', refund_reason: updated.refund_reason } : q));
                if (selectedPaymentQuest && selectedPaymentQuest._id === questId) {
                    setSelectedPaymentQuest(prev => ({ ...prev, payment_status: 'REFUNDED', refund_reason: updated.refund_reason }));
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal memproses refund");
        }
    };

    const paymentStatusLabel = (status) => ({
        PAID: 'Berhasil (PAID)',
        PENDING: 'Menunggu (PENDING)',
        UNPAID: 'Belum Bayar (UNPAID)',
        FAILED: 'Gagal (FAILED)',
        EXPIRED: 'Kedaluwarsa (EXPIRED)',
        REFUNDED: 'Di-refund (REFUNDED)',
        NOT_REQUIRED: 'Tunai / COD'
    }[status] || status || 'Tunai / COD');

    const paymentStatusColor = (status) => ({
        PAID: { bg: '#D1FAE5', text: '#065F46', border: '#059669' },
        PENDING: { bg: '#FEF3C7', text: '#92400E', border: '#D97706' },
        UNPAID: { bg: '#FFEDD5', text: '#C2410C', border: '#EA580C' },
        FAILED: { bg: '#FEE2E2', text: '#991B1B', border: '#DC2626' },
        EXPIRED: { bg: '#F1F5F9', text: '#475569', border: '#94A3B8' },
        REFUNDED: { bg: '#E0E7FF', text: '#3730A3', border: '#4F46E5' },
        NOT_REQUIRED: { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' }
    }[status] || { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' });

    const paymentMethodIcon = (method) => {
        if (method === 'COD') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Banknote size={14} strokeWidth={2.2} /> Tunai (COD P2P)</span>;
        if (method === 'QRIS') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><QrCode size={14} strokeWidth={2.2} /> QRIS P2P</span>;
        if (method === 'VA') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Building2 size={14} strokeWidth={2.2} /> Virtual Account</span>;
        if (method === 'EWALLET') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Wallet size={14} strokeWidth={2.2} /> E-Wallet</span>;
        return method || 'Tunai (COD P2P)';
    };

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const executeLogout = async () => {
        await removeStorageItem('token');
        await removeStorageItem('userRole');
        await removeStorageItem('myUserId');
        await removeStorageItem('guestMode');
        delete axios.defaults.headers.common.Authorization;
        navigate('/login');
    };

    // Filter Pengguna berdasarkan pencarian
    const filteredUsers = users.filter(u => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (u.nama_lengkap || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.no_whatsapp || '').includes(searchQuery);
        const matchesKyc = kycFilter === 'ALL' || (u.kyc_status || 'UNVERIFIED') === kycFilter;
        return matchesSearch && matchesKyc;
    });

    const kycSummary = {
        VERIFIED: users.filter(u => u.kyc_status === 'VERIFIED').length,
        UNVERIFIED: users.filter(u => !u.kyc_status || u.kyc_status === 'UNVERIFIED').length,
        REJECTED: users.filter(u => u.kyc_status === 'REJECTED').length
    };

    const kycLabel = (status) => ({
        VERIFIED: 'Terverifikasi',
        UNVERIFIED: 'Belum verifikasi',
        REJECTED: 'Ditolak'
    }[status] || 'Belum verifikasi');

    // Filter Tugas berdasarkan pencarian dan status filter
    const filteredQuests = quests.filter(q => {
        const matchesSearch = q.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.pembuat_id?.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.pekerja_id?.nama_lengkap || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = questFilter === 'ALL' || q.status === questFilter;
        return matchesSearch && matchesFilter;
    });

    // Filter Pembayaran
    const filteredPayments = payments.filter(p => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (p.payment_reference || '').toLowerCase().includes(query) ||
            (p.deskripsi || '').toLowerCase().includes(query) ||
            (p.pembuat_id?.nama_lengkap || '').toLowerCase().includes(query) ||
            (p.pembuat_id?.email || '').toLowerCase().includes(query) ||
            (p.pekerja_id?.nama_lengkap || '').toLowerCase().includes(query);
        const matchesStatus = paymentStatusFilter === 'ALL' || (p.payment_status || 'NOT_REQUIRED') === paymentStatusFilter;
        const matchesMethod = paymentMethodFilter === 'ALL' || (p.payment_method || 'CASH') === paymentMethodFilter;
        return matchesSearch && matchesStatus && matchesMethod;
    });

    const paymentStats = {
        totalCount: payments.length,
        paidCount: payments.filter(p => p.payment_status === 'PAID').length,
        paidTotalNominal: payments.filter(p => p.payment_status === 'PAID').reduce((sum, p) => sum + (p.upah_jasa || 0) + (p.nominal_talangan || 0), 0),
        pendingCount: payments.filter(p => ['PENDING', 'UNPAID'].includes(p.payment_status)).length,
        refundedCount: payments.filter(p => p.payment_status === 'REFUNDED').length,
        failedCount: payments.filter(p => ['FAILED', 'EXPIRED'].includes(p.payment_status)).length
    };


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
                    if(!workers[wid]) workers[wid] = { 
                        name: q.pekerja_id.nama_lengkap, 
                        no_wa: q.pekerja_id.no_whatsapp, 
                        rating: q.pekerja_id.rating_rata_rata || 0,
                        total_ulasan: q.pekerja_id.total_ulasan || 0,
                        diambil: 0, selesai: 0, batal: 0, upah: 0,
                        no_show: 0, incomplete: 0
                    };
                    workers[wid].diambil++;
                    if(q.status === 'COMPLETED') { 
                        workers[wid].selesai++; 
                        workers[wid].upah += (q.upah_jasa || 0); 
                    }
                    if(q.status === 'CANCELED') {
                        workers[wid].batal++;
                        if(q.cancel_reason === 'WORKER_NO_SHOW') workers[wid].no_show++;
                        if(q.cancel_reason === 'WORKER_INCOMPLETE') workers[wid].incomplete++;
                    }
                });
                const rows = Object.values(workers).map((w, i) => [
                    i + 1, 
                    w.name, 
                    w.no_wa, 
                    `${w.rating} / 5 (${w.total_ulasan} ulasan)`,
                    w.selesai, 
                    w.no_show, 
                    w.incomplete, 
                    `${w.diambil ? Math.round((w.selesai/w.diambil)*100) : 0}%`, 
                    `Rp ${w.upah.toLocaleString('id-ID')}`
                ]);
                return {
                    title: 'LAPORAN PERFORMA PEKERJA',
                    number: `LP-WRK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                    headers: [
                        { name: 'No', align: 'center' },
                        { name: 'Nama Pekerja' },
                        { name: 'No. WhatsApp' },
                        { name: 'Rating (Ulasan)', align: 'center' },
                        { name: 'Selesai', align: 'center' },
                        { name: 'No-Show', align: 'center' },
                        { name: 'Incomplete', align: 'center' },
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
        @page {
            margin: 10mm 12mm 10mm 12mm;
        }
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
            padding: 16px 20px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }
        table th, table td {
            padding: 6px 8px !important;
        }
        tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .summary-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
                        style={{ padding: '10px 20px', backgroundColor: 'var(--color-coral-pop)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', fontFamily: 'var(--font-inter)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Printer size={16} strokeWidth={2.2} /> Cetak / Simpan PDF
                    </button>
                </div>

                {/* Lembar Laporan Standar A4 */}
                <div className="report-container" style={{ width: '100%', maxWidth: '850px', backgroundColor: '#fff', border: '1px solid #94A3B8', padding: '48px', boxShadow: 'var(--shadow-card)', boxSizing: 'border-box' }}>
                    {/* Kop Surat Resmi */}
                    <div style={{ borderBottom: '3px double #000', paddingBottom: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Logo size={56} hasShadow={false} />
                            </div>
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
                            <p style={{ margin: '4px 0' }}><span style={{ fontWeight: '600' }}>Dicetak Oleh:</span> {adminName === 'Admin' ? 'Administrator' : `Administrator (${adminName})`}</p>
                        </div>
                    </div>

                    {/* Ringkasan Data Laporan */}
                    <div className="summary-block" style={{ border: '1px solid #CBD5E1', padding: '12px 20px', backgroundColor: '#F8FAFC', fontSize: '0.8rem', marginBottom: '24px', borderRadius: '6px' }}>
                        <p style={{ fontWeight: 'bold', color: '#1E3A8A', marginBottom: '6px', fontSize: '0.85rem' }}>Ringkasan Data:</p>
                        <div style={{ display: 'flex', gap: '48px' }}>
                            {reportData.summaries.map((s, i) => (
                                <p key={i} style={{ margin: 0 }}>{s.label}: <span style={{ fontWeight: '700', color: '#0F172A' }}>{s.value}</span></p>
                            ))}
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

                    {/* Tanda Tangan Laporan */}
                    <div className="signature-block" style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: '#0F172A' }}>
                        <div style={{ textAlign: 'center', width: '220px' }}>
                            <p style={{ margin: 0 }}>Banjarmasin, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p style={{ fontWeight: '700', margin: '4px 0 0 0' }}>Administrator</p>
                            <div style={{ borderBottom: '1.5px solid #000', width: '100%', marginTop: '48px', marginBottom: '4px' }}></div>
                            <p style={{ fontWeight: '700', margin: 0 }}>{adminName}</p>
                            {(adminName.toLowerCase().includes('nikmat') || adminName.toLowerCase().includes('rahmat') || adminName.toLowerCase().includes('rey')) && (
                                <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>NIM. 2210020047</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-cream-paper)', width: '100vw', maxWidth: 'none' }}>
            
            {/* Sidebar */}
            <aside style={{ width: '260px', backgroundColor: 'var(--color-pure-white)', borderRight: '2px solid var(--color-ink-black)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '2px solid var(--color-ink-black)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Logo size={44} hasShadow={false} />
                    <div>
                        <h2 style={{ fontSize: '1.2rem', color: 'var(--color-ink-black)', fontWeight: '800', lineHeight: 1.1 }}>JAWARGA</h2>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-stone-gray)', marginTop: '2px', fontWeight: '500' }}>Map Your Work & Tasks</p>
                    </div>
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
                        onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
                        style={{ 
                            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                            display: 'block', padding: '16px 24px', transition: 'all 0.2s',
                            backgroundColor: activeTab === 'payments' ? 'var(--color-fresh-grass)' : 'transparent', 
                            color: activeTab === 'payments' ? 'var(--color-ink-black)' : 'var(--color-stone-gray)', 
                            fontWeight: activeTab === 'payments' ? '700' : '500', fontFamily: 'var(--font-inter)' 
                        }}
                    >
                        Monitoring Pembayaran
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
                    <a href="#" onClick={(e) => { e.preventDefault(); handleLogoutClick(); }} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Logout
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
                
                {/* Topbar */}
                <header style={{ padding: '20px 32px', backgroundColor: 'var(--color-pure-white)', borderBottom: '2px solid var(--color-ink-black)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.3rem', color: 'var(--text-main)', fontWeight: '700' }}>
                        {activeTab === 'dashboard' && "Statistik Sistem Utama"}
                        {activeTab === 'users' && "Kelola Pengguna Aplikasi"}
                        {activeTab === 'quests' && "Pemantauan Transaksi Tugas"}
                        {activeTab === 'payments' && "Monitoring Pembayaran & Keuangan"}
                        {activeTab === 'reports' && "Pusat Cetak Dokumen Laporan"}
                    </h2>
                    
                    {/* Search Bar - hidden on reports & dashboard */}
                    {activeTab !== 'reports' && activeTab !== 'dashboard' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                placeholder={activeTab === 'users' ? "Cari nama, email, whatsapp..." : activeTab === 'payments' ? "Cari referensi, deskripsi, user..." : "Cari deskripsi, kategori, user..."}
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
                            <div className="clean-card" style={{ 
                                marginBottom: '32px', 
                                background: 'var(--color-ink-black)', 
                                color: '#fff', 
                                border: '2px solid var(--color-ink-black)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                padding: '24px 32px'
                            }}>
                                <Logo size={64} hasShadow={false} rounded={true} />
                                <div>
                                    <h1 style={{ color: 'var(--color-pure-white)', fontSize: '1.7rem', marginBottom: '6px' }}>Selamat Datang Kembali, Admin {adminName}!</h1>
                                    <p style={{ color: 'var(--color-cream-paper)', fontSize: '0.92rem', opacity: 0.9, lineHeight: 1.5 }}>
                                        JAWARGA (Map Your Work & Tasks) — Sistem informasi gotong royong, pemantauan penugasan mikro, verifikasi geofencing GPS kelurahan, dan transaksi kemasyarakatan Kelurahan Guntung Paikat.
                                    </p>
                                </div>
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
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', marginRight: '4px' }}>STATUS KYC:</span>
                                {[
                                    ['ALL', `Semua (${users.length})`],
                                    ['VERIFIED', `Terverifikasi (${kycSummary.VERIFIED})`],
                                    ['UNVERIFIED', `Belum verifikasi (${kycSummary.UNVERIFIED})`],
                                    ['REJECTED', `Ditolak (${kycSummary.REJECTED})`]
                                ].map(([filter, label]) => (
                                    <button key={filter} onClick={() => setKycFilter(filter)} style={{
                                        padding: '7px 11px', border: '1.5px solid var(--border-ink)', borderRadius: '999px', cursor: 'pointer',
                                        backgroundColor: kycFilter === filter ? 'var(--accent-green)' : 'var(--surface)',
                                        color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem'
                                    }}>{label}</button>
                                ))}
                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIK dan foto KTP tidak ditampilkan.</span>
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--color-ink-black)', color: '#fff' }}>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', width: '60px' }}>No</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Nama Lengkap</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>No. WhatsApp</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Saldo Wallet</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Status KYC</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Status Akun</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>Data pengguna tidak ditemukan.</td>
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
                                                    <button
                                                        onClick={() => setSelectedKycUser(user)}
                                                        title="Klik untuk membuka detail & kelola verifikasi identitas"
                                                        style={{
                                                            backgroundColor: user.kyc_status === 'VERIFIED' ? '#D1FAE5' : user.kyc_status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                                                            color: user.kyc_status === 'VERIFIED' ? '#065F46' : user.kyc_status === 'REJECTED' ? '#991B1B' : '#92400E',
                                                            border: '1.5px solid ' + (user.kyc_status === 'VERIFIED' ? '#059669' : user.kyc_status === 'REJECTED' ? '#DC2626' : '#D97706'),
                                                            padding: '4px 10px', fontWeight: '700', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <span>{user.kyc_status === 'VERIFIED' ? <Check size={12} strokeWidth={2.5} /> : user.kyc_status === 'REJECTED' ? <X size={12} strokeWidth={2.5} /> : <Clock size={12} strokeWidth={2.5} />}</span>
                                                        <span>{kycLabel(user.kyc_status || 'UNVERIFIED')}</span>
                                                    </button>
                                                    {user.kyc_verified_at && <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{new Date(user.kyc_verified_at).toLocaleDateString('id-ID')}</small>}
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
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => setSelectedKycUser(user)}
                                                                title="Kelola verifikasi identitas dan lihat dokumen KTP"
                                                                style={{
                                                                    border: 'none', background: user.kyc_document_image ? '#6366F1' : '#475569', color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                                    {user.kyc_document_image ? <Camera size={14} strokeWidth={2.2} /> : <ShieldCheck size={14} strokeWidth={2.2} />}
                                                                    {user.kyc_document_image ? 'Lihat KTP' : 'Kelola KYC'}
                                                                </span>
                                                            </button>
                                                            <button 
                                                                onClick={() => toggleStatus(user._id)}
                                                                style={{ 
                                                                    border: 'none', background: user.status === 'ACTIVE' ? '#F59E0B' : '#10B981', 
                                                                    color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.8rem', transition: 'transform 0.1s' 
                                                                }}
                                                            >
                                                                {user.status === 'ACTIVE' ? 'Blokir' : 'Buka Blokir'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteUser(user._id)}
                                                                style={{ 
                                                                    border: 'none', background: '#EF4444', 
                                                                    color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.8rem', transition: 'transform 0.1s' 
                                                                }}
                                                            >
                                                                Hapus
                                                            </button>
                                                            <button 
                                                                onClick={() => handleResetPassword(user._id)}
                                                                style={{ 
                                                                    border: 'none', background: '#3B82F6', 
                                                                    color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.8rem', transition: 'transform 0.1s' 
                                                                }}
                                                            >
                                                                Reset Sandi
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
                                                        {quest.payment_status && quest.payment_status !== 'NOT_REQUIRED' && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.68rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                                                                backgroundColor: paymentStatusColor(quest.payment_status).bg,
                                                                color: paymentStatusColor(quest.payment_status).text,
                                                                border: `1px solid ${paymentStatusColor(quest.payment_status).border}`
                                                            }}>
                                                                <CreditCard size={11} strokeWidth={2.2} /> {quest.payment_status}
                                                            </span>
                                                        )}
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

                    {/* TAB CONTENT: 4. MONITORING PEMBAYARAN */}
                    {activeTab === 'payments' && (
                        <div className="fade-up">
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '20px', border: '2px solid var(--color-ink-black)', borderRadius: '20px', borderTop: '4px solid #10B981', boxShadow: '4px 4px 0px var(--color-ink-black)' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>TOTAL DANA BERHASIL (PAID)</p>
                                    <h2 style={{ fontSize: '1.6rem', color: '#065F46', margin: '0 0 4px 0', fontWeight: '900' }}>Rp {paymentStats.paidTotalNominal.toLocaleString('id-ID')}</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}><strong>{paymentStats.paidCount}</strong> transaksi sukses</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '20px', border: '2px solid var(--color-ink-black)', borderRadius: '20px', borderTop: '4px solid #F59E0B', boxShadow: '4px 4px 0px var(--color-ink-black)' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>MENUNGGU PEMBAYARAN</p>
                                    <h2 style={{ fontSize: '1.6rem', color: '#92400E', margin: '0 0 4px 0', fontWeight: '900' }}>{paymentStats.pendingCount}</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Status PENDING / UNPAID</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '20px', border: '2px solid var(--color-ink-black)', borderRadius: '20px', borderTop: '4px solid #6366F1', boxShadow: '4px 4px 0px var(--color-ink-black)' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>TOTAL TRANSAKSI REFUND</p>
                                    <h2 style={{ fontSize: '1.6rem', color: '#3730A3', margin: '0 0 4px 0', fontWeight: '900' }}>{paymentStats.refundedCount}</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Pengembalian dana diproses</p>
                                </div>
                                <div style={{ backgroundColor: 'var(--color-pure-white)', padding: '20px', border: '2px solid var(--color-ink-black)', borderRadius: '20px', borderTop: '4px solid #EF4444', boxShadow: '4px 4px 0px var(--color-ink-black)' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px' }}>GAGAL / KEDALUWARSA</p>
                                    <h2 style={{ fontSize: '1.6rem', color: '#991B1B', margin: '0 0 4px 0', fontWeight: '900' }}>{paymentStats.failedCount}</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>FAILED / EXPIRED</p>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div className="clean-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginRight: '6px' }}>STATUS BAYAR:</span>
                                    {[
                                        ['ALL', `Semua (${payments.length})`],
                                        ['PAID', `Berhasil (${paymentStats.paidCount})`],
                                        ['PENDING', `Menunggu (${payments.filter(p => p.payment_status === 'PENDING').length})`],
                                        ['UNPAID', `Belum Bayar (${payments.filter(p => p.payment_status === 'UNPAID').length})`],
                                        ['REFUNDED', `Di-refund (${paymentStats.refundedCount})`],
                                        ['FAILED', `Gagal (${payments.filter(p => p.payment_status === 'FAILED').length})`],
                                        ['NOT_REQUIRED', `Tunai/COD (${payments.filter(p => !p.payment_status || p.payment_status === 'NOT_REQUIRED').length})`]
                                    ].map(([statusKey, label]) => (
                                        <button
                                            key={statusKey}
                                            onClick={() => setPaymentStatusFilter(statusKey)}
                                            style={{
                                                padding: '6px 12px', border: '1.5px solid var(--border-ink)', borderRadius: '999px', cursor: 'pointer',
                                                backgroundColor: paymentStatusFilter === statusKey ? 'var(--accent-green)' : 'var(--surface)',
                                                color: 'var(--text-main)', fontWeight: '700', fontSize: '0.75rem'
                                            }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginRight: '6px' }}>METODE BAYAR:</span>
                                    {[
                                        ['ALL', 'Semua Metode'],
                                        ['COD', 'Tunai (COD P2P)'],
                                        ['QRIS', 'QRIS P2P'],
                                        ['EWALLET', 'E-Wallet'],
                                        ['VA', 'Virtual Account']
                                    ].map(([methodKey, label]) => (
                                        <button
                                            key={methodKey}
                                            onClick={() => setPaymentMethodFilter(methodKey)}
                                            style={{
                                                padding: '5px 12px', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer',
                                                backgroundColor: paymentMethodFilter === methodKey ? 'var(--color-ink-black)' : 'var(--surface)',
                                                color: paymentMethodFilter === methodKey ? '#fff' : 'var(--text-muted)',
                                                fontWeight: '700', fontSize: '0.75rem'
                                            }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="clean-card" style={{ padding: 0 }}>
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700' }}>DATA TRANSAKSI PEMBAYARAN</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Menampilkan {filteredPayments.length} dari {payments.length} transaksi</p>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--color-ink-black)', color: '#fff' }}>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', width: '50px' }}>No</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', width: '150px' }}>No. Referensi</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700' }}>Deskripsi Tugas</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700' }}>Pembayar (Klien) & Pekerja</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'right', width: '140px' }}>Total Bayar</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'center', width: '130px' }}>Metode</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'center', width: '150px' }}>Status Pembayaran</th>
                                            <th style={{ padding: '16px 20px', fontWeight: '700', textAlign: 'center', width: '130px' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>Tidak ada data transaksi pembayaran sesuai filter.</td>
                                            </tr>
                                        ) : (
                                            filteredPayments.map((p, index) => {
                                                const totalAmount = (p.upah_jasa || 0) + (p.nominal_talangan || 0);
                                                const color = paymentStatusColor(p.payment_status || 'NOT_REQUIRED');
                                                return (
                                                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.15s' }}>
                                                        <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-muted)' }}>{index + 1}</td>
                                                        <td style={{ padding: '16px 20px' }}>
                                                            <span style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                                                {p.payment_reference || '-'}
                                                            </span>
                                                            <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                                                                {p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID') : p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}
                                                            </small>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                                            <span style={{
                                                                fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', marginRight: '6px',
                                                                backgroundColor: p.kategori === 'jastip' ? '#FEE2E2' : p.kategori === 'fisik' ? '#E0F2FE' : '#FEF3C7',
                                                                color: p.kategori === 'jastip' ? '#991B1B' : p.kategori === 'fisik' ? '#0369A1' : '#92400E'
                                                            }}>
                                                                {p.kategori?.toUpperCase()}
                                                            </span>
                                                            <span style={{ fontWeight: '600' }}>{p.deskripsi}</span>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', fontSize: '0.82rem' }}>
                                                            <div><span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Klien:</span> {p.pembuat_id?.nama_lengkap || '-'}</div>
                                                            <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}><span style={{ fontWeight: '700' }}>Pekerja:</span> {p.pekerja_id?.nama_lengkap || '-'}</div>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                            <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.92rem' }}>Rp {totalAmount.toLocaleString('id-ID')}</span>
                                                            <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Upah: Rp {p.upah_jasa?.toLocaleString('id-ID')} {p.nominal_talangan > 0 && `+ Talangan: Rp ${p.nominal_talangan.toLocaleString('id-ID')}`}</small>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                                                                backgroundColor: '#F1F5F9', color: '#1E293B', border: '1px solid #CBD5E1', display: 'inline-block'
                                                            }}>
                                                                {paymentMethodIcon(p.payment_method)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                            <span style={{
                                                                padding: '4px 10px', fontWeight: '800', fontSize: '0.75rem', borderRadius: '6px',
                                                                backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}`, display: 'inline-block'
                                                            }}>
                                                                {paymentStatusLabel(p.payment_status)}
                                                            </span>
                                                            {p.refund_reason && (
                                                                <small style={{ display: 'block', color: '#B91C1C', fontSize: '0.68rem', marginTop: '3px' }} title={p.refund_reason}>
                                                                    Alasan: {p.refund_reason.slice(0, 24)}...
                                                                </small>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                                <button
                                                                    onClick={() => setSelectedPaymentQuest(p)}
                                                                    style={{
                                                                        border: 'none', background: '#3B82F6', color: '#fff', padding: '5px 10px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.75rem'
                                                                    }}
                                                                >
                                                                    Detail
                                                                </button>
                                                                {p.payment_status === 'PAID' && (
                                                                    <button
                                                                        onClick={() => handleProcessRefund(p._id)}
                                                                        style={{
                                                                            border: 'none', background: '#EF4444', color: '#fff', padding: '5px 10px', cursor: 'pointer', fontWeight: '700', borderRadius: '6px', fontSize: '0.75rem'
                                                                        }}
                                                                    >
                                                                        Refund
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: 5. LAPORAN CETAK */}
                    {activeTab === 'reports' && (
                        <div className="fade-up">
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>Pilih jenis laporan sistem di bawah ini untuk melihat pratinjau lembaran dokumen resmi dengan kop surat, lalu cetak atau unduh sebagai file PDF.</p>

                            
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

            {selectedKycUser && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9998,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto'
                }}>
                    <div className="clean-card" style={{ backgroundColor: 'var(--color-pure-white)', width: '100%', maxWidth: '780px', padding: '28px', position: 'relative', border: '3px solid var(--color-ink-black)', borderRadius: '20px', boxShadow: '8px 8px 0px var(--color-ink-black)', maxHeight: '92vh', overflowY: 'auto' }}>
                        <button onClick={() => setSelectedKycUser(null)} aria-label="Tutup detail KTP" style={{ position: 'absolute', top: '16px', right: '16px', width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--color-ink-black)', background: 'var(--surface)', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px' }}>DETAIL & KELOLA VERIFIKASI IDENTITAS (KYC)</span>
                        <h2 style={{ margin: '6px 42px 4px 0', fontSize: '1.4rem', color: 'var(--color-ink-black)', fontWeight: '800' }}>{selectedKycUser.nama_lengkap}</h2>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: <strong>{selectedKycUser.email}</strong> | WhatsApp: <strong>{selectedKycUser.no_whatsapp}</strong></p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(280px, 1.2fr)', gap: '24px', alignItems: 'start', borderTop: '2px dashed var(--border-light)', paddingTop: '16px', marginBottom: '20px' }}>
                            <dl style={{ margin: 0, display: 'grid', gap: '12px' }}>
                                <div>
                                    <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>STATUS KYC SAAT INI</dt>
                                    <dd style={{ margin: 0 }}>
                                        <span style={{
                                            backgroundColor: selectedKycUser.kyc_status === 'VERIFIED' ? '#D1FAE5' : selectedKycUser.kyc_status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                                            color: selectedKycUser.kyc_status === 'VERIFIED' ? '#065F46' : selectedKycUser.kyc_status === 'REJECTED' ? '#991B1B' : '#92400E',
                                            border: '1.5px solid ' + (selectedKycUser.kyc_status === 'VERIFIED' ? '#059669' : selectedKycUser.kyc_status === 'REJECTED' ? '#DC2626' : '#D97706'),
                                            padding: '4px 12px', fontWeight: '800', fontSize: '0.8rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            <span>{selectedKycUser.kyc_status === 'VERIFIED' ? <Check size={14} strokeWidth={2.5} /> : selectedKycUser.kyc_status === 'REJECTED' ? <X size={14} strokeWidth={2.5} /> : <Clock size={14} strokeWidth={2.5} />}</span>
                                            <span>{kycLabel(selectedKycUser.kyc_status || 'UNVERIFIED')}</span>
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>NIK (NOMOR INDUK KEPENDUDUKAN)</dt>
                                    <dd style={{ margin: '3px 0 0', fontWeight: '800', letterSpacing: '0.06em', color: selectedKycUser.kyc_nik ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {selectedKycUser.kyc_nik || <em style={{ fontWeight: 'normal' }}>Belum mengisi NIK</em>}
                                    </dd>
                                </div>
                                <div>
                                    <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>NAMA LENGKAP PADA KTP</dt>
                                    <dd style={{ margin: '3px 0 0', fontWeight: '700', color: selectedKycUser.kyc_name ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {selectedKycUser.kyc_name || <em style={{ fontWeight: 'normal' }}>Belum mengisi nama KTP</em>}
                                    </dd>
                                </div>
                                <div>
                                    <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>ALAMAT SESUAI KTP</dt>
                                    <dd style={{ margin: '3px 0 0', lineHeight: '1.45', color: selectedKycUser.kyc_address ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                        {selectedKycUser.kyc_address || <em style={{ fontWeight: 'normal' }}>Belum mengisi alamat KTP</em>}
                                    </dd>
                                </div>
                                <div>
                                    <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>WAKTU DIVERIFIKASI</dt>
                                    <dd style={{ margin: '3px 0 0', fontSize: '0.85rem' }}>
                                        {selectedKycUser.kyc_verified_at ? new Date(selectedKycUser.kyc_verified_at).toLocaleString('id-ID') : '-'}
                                    </dd>
                                </div>
                                {selectedKycUser.kyc_rejection_reason && (
                                    <div style={{ backgroundColor: '#FEE2E2', border: '1.5px solid #F87171', borderRadius: '8px', padding: '10px 12px' }}>
                                        <dt style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: '800' }}>ALASAN PENOLAKAN</dt>
                                        <dd style={{ margin: '3px 0 0', color: '#B91C1C', fontSize: '0.85rem', lineHeight: '1.4' }}>{selectedKycUser.kyc_rejection_reason}</dd>
                                    </div>
                                )}
                            </dl>
                            
                            <div>
                                <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>FOTO DOKUMEN FISIK KTP</p>
                                {selectedKycUser.kyc_document_image ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={selectedKycUser.kyc_document_image} alt={`KTP ${selectedKycUser.nama_lengkap}`} style={{ display: 'block', width: '100%', maxHeight: '340px', objectFit: 'contain', background: 'var(--bg-main)', border: '2px solid var(--border-ink)', borderRadius: '12px' }} />
                                        <a href={selectedKycUser.kyc_document_image} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', color: '#3B82F6', fontWeight: '700', textDecoration: 'underline' }}>
                                            <span>Buka gambar ukuran penuh</span>
                                            <ExternalLink size={12} strokeWidth={2.2} />
                                        </a>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '40px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '12px', color: '#64748B'
                                    }}>
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            backgroundColor: '#E2E8F0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 10px',
                                            color: '#64748B'
                                        }}>
                                            <Camera size={30} strokeWidth={2} />
                                        </div>
                                        <p style={{ fontWeight: '700', margin: '0 0 4px', color: '#334155', fontSize: '0.95rem' }}>Belum Ada Foto KTP</p>
                                        <small style={{ fontSize: '0.8rem', lineHeight: '1.4', display: 'block' }}>Pengguna belum mengunggah foto KTP atau merupakan akun pengujian lama.</small>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* KONTROL AKSI ADMIN */}
                        <div style={{ borderTop: '2px solid var(--color-ink-black)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>AKSI ADMINISTRATOR UNTUK STATUS KYC:</span>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleUpdateKycStatus(selectedKycUser._id, 'VERIFIED')}
                                    style={{
                                        flex: 1, minWidth: '160px', padding: '10px 16px', backgroundColor: '#10B981', color: '#fff', border: '2px solid var(--color-ink-black)', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', boxShadow: '2px 2px 0px var(--color-ink-black)', fontSize: '0.85rem'
                                    }}
                                >
                                    ✓ Setujui / Verifikasi
                                </button>
                                <button
                                    onClick={() => handleUpdateKycStatus(selectedKycUser._id, 'REJECTED')}
                                    style={{
                                        flex: 1, minWidth: '160px', padding: '10px 16px', backgroundColor: '#EF4444', color: '#fff', border: '2px solid var(--color-ink-black)', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', boxShadow: '2px 2px 0px var(--color-ink-black)', fontSize: '0.85rem'
                                    }}
                                >
                                    ✕ Tolak Verifikasi
                                </button>
                                <button
                                    onClick={() => handleUpdateKycStatus(selectedKycUser._id, 'UNVERIFIED')}
                                    style={{
                                        flex: 1, minWidth: '160px', padding: '10px 16px', backgroundColor: '#F59E0B', color: '#fff', border: '2px solid var(--color-ink-black)', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', boxShadow: '2px 2px 0px var(--color-ink-black)', fontSize: '0.85rem'
                                    }}
                                >
                                    ↺ Cabut / Reset Verifikasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Pembayaran */}
            {selectedPaymentQuest && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9998,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto'
                }}>
                    <div className="clean-card" style={{ backgroundColor: 'var(--color-pure-white)', width: '100%', maxWidth: '680px', padding: '28px', position: 'relative', border: '3px solid var(--color-ink-black)', borderRadius: '20px', boxShadow: '8px 8px 0px var(--color-ink-black)' }}>
                        <button onClick={() => setSelectedPaymentQuest(null)} aria-label="Tutup detail pembayaran" style={{ position: 'absolute', top: '16px', right: '16px', width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--color-ink-black)', background: 'var(--surface)', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px' }}>RINCIAN TRANSAKSI PEMBAYARAN</span>
                        <h2 style={{ margin: '6px 42px 4px 0', fontSize: '1.35rem', color: 'var(--color-ink-black)', fontWeight: '800' }}>
                            {selectedPaymentQuest.payment_reference || 'Transaksi Tunai / COD'}
                        </h2>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Quest ID: <span style={{ fontFamily: 'monospace' }}>{selectedPaymentQuest._id}</span>
                        </p>

                        <div style={{ borderTop: '2px dashed var(--border-light)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>STATUS PEMBAYARAN</dt>
                                <dd style={{ margin: '4px 0 0' }}>
                                    <span style={{
                                        padding: '4px 10px', fontWeight: '800', fontSize: '0.8rem', borderRadius: '6px',
                                        backgroundColor: paymentStatusColor(selectedPaymentQuest.payment_status || 'NOT_REQUIRED').bg,
                                        color: paymentStatusColor(selectedPaymentQuest.payment_status || 'NOT_REQUIRED').text,
                                        border: `1px solid ${paymentStatusColor(selectedPaymentQuest.payment_status || 'NOT_REQUIRED').border}`,
                                        display: 'inline-block'
                                    }}>
                                        {paymentStatusLabel(selectedPaymentQuest.payment_status)}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>METODE PEMBAYARAN</dt>
                                <dd style={{ margin: '4px 0 0', fontWeight: '700', fontSize: '0.9rem' }}>
                                    {paymentMethodIcon(selectedPaymentQuest.payment_method)}
                                </dd>
                            </div>
                            <div>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>PEMBAYAR (KLIEN)</dt>
                                <dd style={{ margin: '3px 0 0', fontSize: '0.85rem' }}>
                                    <strong>{selectedPaymentQuest.pembuat_id?.nama_lengkap || 'N/A'}</strong><br/>
                                    <span style={{ color: 'var(--text-muted)' }}>WA: {selectedPaymentQuest.pembuat_id?.no_whatsapp || '-'}</span>
                                </dd>
                            </div>
                            <div>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>PENERIMA (PEKERJA)</dt>
                                <dd style={{ margin: '3px 0 0', fontSize: '0.85rem' }}>
                                    <strong>{selectedPaymentQuest.pekerja_id?.nama_lengkap || '-'}</strong><br/>
                                    <span style={{ color: 'var(--text-muted)' }}>WA: {selectedPaymentQuest.pekerja_id?.no_whatsapp || '-'}</span>
                                </dd>
                            </div>
                            <div style={{ gridColumn: 'span 2', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>RINCIAN BIAYA</dt>
                                <dd style={{ margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Upah Jasa:</span>
                                        <strong>Rp {selectedPaymentQuest.upah_jasa?.toLocaleString('id-ID')}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Nominal Talangan (Jastip):</span>
                                        <strong>Rp {selectedPaymentQuest.nominal_talangan?.toLocaleString('id-ID') || 0}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: '6px', marginTop: '4px', fontSize: '0.95rem' }}>
                                        <span style={{ fontWeight: '800' }}>Total Transaksi:</span>
                                        <strong style={{ color: '#065F46' }}>Rp {((selectedPaymentQuest.upah_jasa || 0) + (selectedPaymentQuest.nominal_talangan || 0)).toLocaleString('id-ID')}</strong>
                                    </div>
                                </dd>
                            </div>
                            <div>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>WAKTU DIBUAT</dt>
                                <dd style={{ margin: '3px 0 0', fontSize: '0.85rem' }}>
                                    {selectedPaymentQuest.created_at ? new Date(selectedPaymentQuest.created_at).toLocaleString('id-ID') : '-'}
                                </dd>
                            </div>
                            <div>
                                <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '800' }}>WAKTU LUNAS / DIPERBARUI</dt>
                                <dd style={{ margin: '3px 0 0', fontSize: '0.85rem' }}>
                                    {selectedPaymentQuest.paid_at ? new Date(selectedPaymentQuest.paid_at).toLocaleString('id-ID') : selectedPaymentQuest.payment_updated_at ? new Date(selectedPaymentQuest.payment_updated_at).toLocaleString('id-ID') : '-'}
                                </dd>
                            </div>
                            {selectedPaymentQuest.refund_reason && (
                                <div style={{ gridColumn: 'span 2', backgroundColor: '#FEE2E2', border: '1.5px solid #F87171', borderRadius: '8px', padding: '10px 12px' }}>
                                    <dt style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: '800' }}>CATATAN REFUND ADMINISTRATOR</dt>
                                    <dd style={{ margin: '3px 0 0', color: '#B91C1C', fontSize: '0.85rem', lineHeight: '1.4' }}>{selectedPaymentQuest.refund_reason}</dd>
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '2px solid var(--color-ink-black)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            {selectedPaymentQuest.payment_status === 'PAID' && (
                                <button
                                    onClick={() => handleProcessRefund(selectedPaymentQuest._id)}
                                    style={{
                                        padding: '10px 18px', backgroundColor: '#EF4444', color: '#fff', border: '2px solid var(--color-ink-black)', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', boxShadow: '2px 2px 0px var(--color-ink-black)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <RotateCcw size={15} strokeWidth={2.2} /> Proses Refund Dana Transaksi
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedPaymentQuest(null)}
                                style={{
                                    padding: '10px 20px', backgroundColor: 'var(--color-ink-black)', color: '#fff', border: 'none', borderRadius: '50px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Logout Admin */}
            {showLogoutModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="clean-card" style={{
                        backgroundColor: 'var(--color-pure-white)', width: '100%', maxWidth: '340px',
                        padding: '24px', position: 'relative', textAlign: 'center', border: '3px solid var(--color-ink-black)',
                        boxShadow: 'var(--shadow-card, 6px 6px 0px #000)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: 'rgba(255, 112, 93, 0.12)',
                            borderRadius: '50%',
                            border: '2px solid var(--color-ink-black)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                            color: 'var(--color-coral-pop, #ff705d)',
                            boxShadow: '2px 2px 0px var(--color-ink-black)'
                        }}>
                            <LogOut size={30} strokeWidth={2.2} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '8px', color: 'var(--color-ink-black)', fontFamily: 'var(--font-outfit)' }}>KELUAR ADMIN</h2>
                        <p style={{ fontSize: '13.5px', color: 'var(--color-stone-gray)', marginBottom: '20px', lineHeight: '1.5', fontFamily: 'var(--font-inter)' }}>
                            Apakah Anda yakin ingin keluar dari panel administrator Jasa Warga?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowLogoutModal(false)} style={{
                                flex: 1, backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', margin: 0, padding: '10px', fontWeight: '700', cursor: 'pointer', borderRadius: '50px'
                            }}>
                                BATAL
                            </button>
                            <button onClick={executeLogout} style={{
                                flex: 1, backgroundColor: 'var(--color-coral-pop, #ff705d)', color: 'white', border: '2px solid var(--color-ink-black)', margin: 0, padding: '10px', fontWeight: '700', cursor: 'pointer', borderRadius: '50px', boxShadow: '2px 2px 0px var(--color-ink-black)'
                            }}>
                                KELUAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
