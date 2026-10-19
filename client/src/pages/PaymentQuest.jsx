import { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { Banknote, QrCode, Wallet, Loader2, Handshake, Receipt, Star, Coins, MapPin, ShieldCheck } from 'lucide-react';

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const idOf = (value) => String(value?._id || value || '');

const paymentMethods = [
    {
        id: 'COD',
        Icon: Banknote,
        title: 'Bayar Tunai Langsung (COD P2P)',
        detail: 'Serahkan uang tunai langsung ke tangan pekerja di lokasi (Rekomendasi)'
    },
    {
        id: 'QRIS',
        Icon: QrCode,
        title: 'QRIS Dinamis P2P',
        detail: 'Pindai kode QRIS dengan m-Banking atau E-Wallet di tempat'
    },
    {
        id: 'EWALLET',
        Icon: Wallet,
        title: 'Transfer E-Wallet Langsung',
        detail: 'Kirim via DANA, GoPay, atau OVO'
    }
];

function PaymentQr({ reference, amount }) {
    const seed = [...String(reference || 'JAWARGA')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const finder = (x, y, originX, originY) => {
        const dx = x - originX;
        const dy = y - originY;
        if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return false;
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    };
    const cells = Array.from({ length: 625 }, (_, index) => {
        const x = index % 25;
        const y = Math.floor(index / 25);
        const inFinder = finder(x, y, 1, 1) || finder(x, y, 17, 1) || finder(x, y, 1, 17);
        const reserved = (x <= 8 && y <= 8) || (x >= 16 && y <= 8) || (x <= 8 && y >= 16);
        const generated = !reserved && ((x * 11 + y * 7 + x * y + seed) % 9 < 4);
        return <i key={index} className={inFinder || generated ? 'on' : ''} />;
    });
    return (
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
            <div className="payment-qr" style={{ margin: '0 auto' }}>
                <div className="payment-qr-grid">{cells}</div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>
                QRIS Dinamis · Nominal Presisi {rupiah(amount)}
            </p>
        </div>
    );
}

export default function PaymentQuest() {
    const navigate = useNavigate();
    const location = useLocation();
    const myId = localStorage.getItem('myUserId');
    
    const [questId, setQuestId] = useState(location.state?.questId || new URLSearchParams(location.search).get('questId') || null);
    const [quest, setQuest] = useState(null);
    const [method, setMethod] = useState('COD');
    const [wallet, setWallet] = useState('DANA');
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [changingMethod, setChangingMethod] = useState(false);
    const [providerOpen, setProviderOpen] = useState(false);
    const prevPaymentStatusRef = useRef(null);

    const load = useCallback(async (isPolling = false) => {
        try {
            let id = questId;
            if (!id) {
                const active = await axios.get('/api/chat/active');
                id = active.data.data._id;
                setQuestId(id);
            }
            const response = await axios.get(`/api/payments/${id}`);
            const data = response.data.data;
            
            // Cek jika ada perpindahan status dari UNPAID/PENDING ke PAID pada saat polling
            if (isPolling && prevPaymentStatusRef.current && prevPaymentStatusRef.current !== 'PAID' && data.payment_status === 'PAID') {
                toast.success('Pembayaran telah berhasil diselesaikan! Struk digital diterbitkan.', { duration: 4000 });
            }
            prevPaymentStatusRef.current = data.payment_status;
            
            setQuest(data);
            if (data.payment_method) {
                setMethod(data.payment_method);
            }
        } catch (error) {
            if (!isPolling && error.response?.status !== 404) {
                toast.error(error.response?.data?.message || 'Gagal memuat data pembayaran.');
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [questId]);

    useEffect(() => {
        load(false);
    }, [load]);

    // Live polling setiap 3 detik agar layar Pekerja & Klien langsung sinkron saat salah satu melakukan pembayaran
    useEffect(() => {
        if (!questId) return;
        if (quest?.payment_status === 'PAID') return; // Berhenti polling jika sudah lunas
        const pollTimer = setInterval(() => {
            load(true);
        }, 3000);
        return () => clearInterval(pollTimer);
    }, [questId, quest?.payment_status, load]);

    const isClient = quest ? idOf(quest.pembuat_id) === String(myId) : false;
    const workerName = quest?.pekerja_id?.nama_lengkap || 'Pekerja';
    const clientName = quest?.pembuat_id?.nama_lengkap || 'Klien';
    const upahNominal = quest ? (quest.agreed_upah || quest.upah_jasa || 0) : 0;
    const talanganNominal = quest ? (quest.nominal_talangan || 0) : 0;
    const totalBayar = upahNominal + talanganNominal;

    const createPayment = async () => {
        try {
            const { data } = await axios.post(`/api/payments/${questId}/create`, { method });
            setQuest(data.data);
            setChangingMethod(false);
            if (method === 'COD') {
                toast.success('Metode Tunai (COD) dipilih. Silakan lakukan serah terima fisik.');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyiapkan pembayaran.');
        }
    };

    const confirmPayment = async () => {
        setPaying(true);
        try {
            const { data } = await axios.post(`/api/payments/${questId}/simulate`, { outcome: 'PAID' });
            setQuest(data.data);
            setProviderOpen(false);
            toast.success('Pembayaran berhasil dikonfirmasi! Struk digital resmi telah diterbitkan.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Konfirmasi pembayaran gagal.');
        } finally {
            setPaying(false);
        }
    };

    const copyReceiptText = async () => {
        if (!quest) return;
        const text = `=== STRUK PEMBAYARAN P2P JAWARGA ===\n` +
            `No. Referensi : ${quest.payment_reference || '-'}\n` +
            `Metode        : ${quest.payment_method === 'COD' ? 'Tunai (COD P2P)' : quest.payment_method}\n` +
            `Tanggal       : ${new Date(quest.paid_at || Date.now()).toLocaleString('id-ID')}\n` +
            `Klien         : ${clientName}\n` +
            `Pekerja       : ${workerName}\n` +
            `Tugas         : ${quest.deskripsi}\n` +
            `Upah Jasa     : ${rupiah(upahNominal)}\n` +
            (talanganNominal > 0 ? `Uang Talangan : ${rupiah(talanganNominal)}\n` : '') +
            `TOTAL BAYAR   : ${rupiah(totalBayar)}\n` +
            `STATUS        : LUNAS (SELESAI)\n` +
            `=====================================`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Rincian struk berhasil disalin ke papan klip!');
        } catch {
            toast('Rincian struk dapat dicatat langsung dari layar.');
        }
    };

    if (loading) {
        return (
            <div className="revision-page revision-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: '2px solid var(--border-ink)',
                        boxShadow: '3px 3px 0 var(--border-ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                        color: 'var(--color-ink-black)'
                    }}>
                        <Loader2 size={28} strokeWidth={2.4} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                    <p style={{ fontWeight: '700', color: 'var(--color-ink-black)' }}>Memuat sesi pembayaran P2P…</p>
                </div>
            </div>
        );
    }

    if (!quest) {
        return (
            <>
                <div className="revision-page revision-center">
                    <div className="revision-empty">
                        <h2>Tidak Ada Transaksi Pembayaran</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Tugas ini belum memasuki tahap pembayaran atau transaksi tidak ditemukan.
                        </p>
                        <button className="revision-primary" onClick={() => navigate('/beranda')}>KEMBALI KE BERANDA</button>
                    </div>
                </div>
                <BottomNav />
            </>
        );
    }

    return (
        <>
            <div className="revision-page" style={{ paddingBottom: '120px' }}>
                {/* Header Nav */}
                <header className="revision-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => navigate('/detail-tugas', { state: { quest } })} style={{ cursor: 'pointer' }}>←</button>
                    <div>
                        <span>SISTEM PEMBAYARAN P2P</span>
                        <h1>{quest.payment_status === 'PAID' ? 'Struk Pembayaran' : 'Pembayaran & Serah Terima'}</h1>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'var(--color-ink-black)' }}>
                        <Handshake size={24} strokeWidth={2.2} />
                    </span>
                </header>

                <main className="revision-main" style={{ padding: '16px' }}>

                    {/* ============================================================== */}
                    {/* KASUS 1: STRUK DIGITAL BERSAMA (Jika Status Sudah PAID)        */}
                    {/* Tampil seragam di layar KLIEN maupun PEKERJA                   */}
                    {/* ============================================================== */}
                    {quest.payment_status === 'PAID' ? (
                        <div className="fade-up">
                            {/* Kartu Struk Fisik / Digital */}
                            <div style={{
                                backgroundColor: '#ffffff',
                                border: '3px solid var(--border-ink)',
                                borderRadius: '16px',
                                boxShadow: '6px 6px 0px var(--border-ink)',
                                padding: '24px 20px',
                                position: 'relative',
                                marginBottom: '20px'
                            }}>
                                {/* Badge Lunas */}
                                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: 'var(--accent-green, #8ed462)',
                                        color: 'var(--color-ink-black)',
                                        border: '2px solid var(--border-ink)',
                                        padding: '6px 16px',
                                        borderRadius: '50px',
                                        fontWeight: '800',
                                        fontSize: '0.85rem'
                                    }}>
                                        ✓ LUNAS & TERVERIFIKASI
                                    </span>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginTop: '12px', marginBottom: '4px' }}>
                                        TANDA TERIMA P2P
                                    </h2>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                                        Platform Jasa Warga · Transaksi Langsung di Lokasi
                                    </p>
                                </div>

                                <div style={{ borderTop: '2px dashed var(--border-ink)', margin: '14px 0' }} />

                                {/* Informasi Header Transaksi */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>No. Referensi:</span>
                                        <strong style={{ fontFamily: 'monospace', fontSize: '13px' }}>{quest.payment_reference || '-'}</strong>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Metode:</span>
                                        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                            {quest.payment_method === 'COD' ? (
                                                <><Banknote size={15} strokeWidth={2.2} /> Tunai (COD P2P)</>
                                            ) : quest.payment_method === 'QRIS' ? (
                                                <><QrCode size={15} strokeWidth={2.2} /> QRIS Dinamis</>
                                            ) : (
                                                quest.payment_method
                                            )}
                                        </strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Pemilik Quest (Klien):</span>
                                        <strong>{clientName}</strong>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Pekerja Pelaksana:</span>
                                        <strong>{workerName}</strong>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Waktu Pelunasan:</span>
                                        <strong>{new Date(quest.paid_at || quest.completed_at || Date.now()).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WITA</strong>
                                    </div>
                                </div>

                                <div style={{ borderTop: '2px dashed var(--border-ink)', margin: '14px 0' }} />

                                {/* Rincian Item Pekerjaan */}
                                <div style={{ marginBottom: '14px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        Rincian Pekerjaan
                                    </span>
                                    <p style={{ fontSize: '13px', margin: '4px 0 10px', fontWeight: '600', color: 'var(--text-main)' }}>
                                        {quest.deskripsi}
                                    </p>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Upah Jasa Kesepakatan</span>
                                        <span style={{ fontWeight: '700' }}>{rupiah(upahNominal)}</span>
                                    </div>

                                    {talanganNominal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Penggantian Uang Talangan Belanja</span>
                                            <span style={{ fontWeight: '700', color: 'var(--accent-coral)' }}>{rupiah(talanganNominal)}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ borderTop: '2px solid var(--border-ink)', margin: '14px 0' }} />

                                {/* Total Akhir */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: '800' }}>TOTAL AKHIR</span>
                                    <span style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--color-ink-black)' }}>
                                        {rupiah(totalBayar)}
                                    </span>
                                </div>

                                <div style={{
                                    marginTop: '16px',
                                    padding: '10px 12px',
                                    backgroundColor: 'var(--color-sandstone, #f7f4ed)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-ink)',
                                    fontSize: '11.5px',
                                    color: 'var(--text-main)',
                                    textAlign: 'center'
                                }}>
                                    {isClient ? (
                                        <span>✓ Anda telah menyelesaikan pembayaran P2P secara langsung kepada Pekerja.</span>
                                    ) : (
                                        <span>✓ Dana sebesar <strong>{rupiah(totalBayar)}</strong> telah sukses tercatat dan diakumulasikan ke Total Pendapatan Anda.</span>
                                    )}
                                </div>
                            </div>

                            {/* Tombol Aksi Struk */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    onClick={copyReceiptText}
                                    style={{
                                        backgroundColor: '#ffffff',
                                        color: 'var(--color-ink-black)',
                                        border: '2px solid var(--border-ink)',
                                        borderRadius: '50px',
                                        padding: '12px',
                                        fontWeight: '700',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        boxShadow: '2px 2px 0px var(--border-ink)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Receipt size={18} strokeWidth={2.2} /> Salin / Bagikan Rincian Struk
                                </button>

                                {isClient ? (
                                    <button
                                        onClick={() => navigate('/detail-tugas', { state: { quest } })}
                                        className="revision-primary"
                                        style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Star size={18} strokeWidth={2.2} /> BERI RATING & ULASAN PEKERJA
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/profil')}
                                        className="revision-primary"
                                        style={{ margin: 0, backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Coins size={18} strokeWidth={2.2} /> LIHAT TOTAL PENDAPATAN SAYA
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate('/beranda')}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        padding: '8px'
                                    }}
                                >
                                    Kembali ke Halaman Beranda
                                </button>
                            </div>
                        </div>
                    ) : !isClient ? (
                        /* ============================================================== */
                        /* KASUS 2: LAYAR PEKERJA SAAT MENUNGGU KLIEN MEMBAYAR (P2P WAIT)  */
                        /* ============================================================== */
                        <div className="fade-up" style={{ textAlign: 'center', padding: '24px 10px' }}>
                            <div style={{
                                width: '70px',
                                height: '70px',
                                backgroundColor: 'var(--color-sandstone)',
                                border: '2px solid var(--border-ink)',
                                borderRadius: '50px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                color: 'var(--color-ink-black)',
                                boxShadow: '3px 3px 0 var(--border-ink)'
                            }}>
                                <Handshake size={34} strokeWidth={2.2} />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px' }}>
                                Menunggu Pembayaran dari Klien
                            </h2>
                            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '340px', margin: '0 auto 20px' }}>
                                Klien <strong>{clientName}</strong> sedang memeriksa hasil pekerjaan Anda dan memilih metode pembayaran (Tunai COD atau QRIS).
                            </p>

                            <div style={{
                                backgroundColor: '#ffffff',
                                border: '2px solid var(--border-ink)',
                                borderRadius: '12px',
                                padding: '16px',
                                textAlign: 'left',
                                marginBottom: '20px',
                                boxShadow: '3px 3px 0 var(--border-ink)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Upah Kesepakatan</span>
                                    <strong>{rupiah(upahNominal)}</strong>
                                </div>
                                {talanganNominal > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Uang Talangan</span>
                                        <strong style={{ color: 'var(--accent-coral)' }}>{rupiah(talanganNominal)}</strong>
                                    </div>
                                )}
                                <div style={{ borderTop: '1.5px dashed var(--border-ink)', margin: '8px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <strong>Total yang Akan Anda Terima</strong>
                                    <strong style={{ color: 'var(--color-ink-black)', fontSize: '1.1rem' }}>{rupiah(totalBayar)}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#059669', fontWeight: '700' }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669', animation: 'ping 1.5s infinite' }} />
                                Sinkronisasi otomatis saat Klien menyelesaikan pembayaran...
                            </div>
                        </div>
                    ) : quest.payment_status === 'PENDING' && !changingMethod ? (
                        /* ============================================================== */
                        /* KASUS 3: LAYAR KLIEN SAAT MEMPROSES METODE TERPILIH            */
                        /* ============================================================== */
                        <div className="fade-up">
                            {method === 'COD' ? (
                                /* METODE 1: COD TUNAI LANGSUNG P2P */
                                <section className="clean-card" style={{ padding: '24px 20px', marginBottom: '16px', border: '3px solid var(--border-ink)', boxShadow: '4px 4px 0 var(--border-ink)' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                            border: '2px solid var(--border-ink)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 10px',
                                            color: 'var(--color-ink-black)',
                                            boxShadow: '2px 2px 0 var(--border-ink)'
                                        }}>
                                            <Banknote size={30} strokeWidth={2.2} />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>PEMBAYARAN TUNAI (COD P2P)</span>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '4px' }}>Serahkan Uang Tunai ke Pekerja</h2>
                                    </div>

                                    <div style={{ backgroundColor: 'var(--color-sandstone)', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-ink)', marginBottom: '16px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nominal Pas yang Wajib Diserahkan:</span>
                                        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-ink-black)', margin: '6px 0' }}>
                                            {rupiah(totalBayar)}
                                        </h1>
                                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px' }}>
                                            (Upah: {rupiah(upahNominal)} {talanganNominal > 0 && `+ Talangan: ${rupiah(talanganNominal)}`})
                                        </small>
                                    </div>

                                    <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '20px' }}>
                                        <p style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={16} strokeWidth={2.2} /> <span><strong>Pekerja:</strong> {workerName}</span>
                                        </p>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                            Silakan serahkan uang tunai sebesar <strong>{rupiah(totalBayar)}</strong> secara langsung kepada {workerName}. Setelah uang diserahterimakan, klik tombol konfirmasi di bawah untuk menerbitkan tanda terima resmi.
                                        </p>
                                    </div>

                                    <button
                                        className="revision-primary"
                                        disabled={paying}
                                        onClick={confirmPayment}
                                        style={{ width: '100%', margin: '0 0 10px', backgroundColor: 'var(--accent-green)' }}
                                    >
                                        {paying ? 'MEMVERIFIKASI…' : '✓ KONFIRMASI UANG TUNAI TELAH DISERAHKAN'}
                                    </button>

                                    <button
                                        onClick={() => setChangingMethod(true)}
                                        disabled={paying}
                                        style={{ width: '100%', background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', padding: '6px' }}
                                    >
                                        ↻ Ganti Metode ke QRIS / Lainnya
                                    </button>
                                </section>
                            ) : method === 'QRIS' ? (
                                /* METODE 2: QRIS DINAMIS P2P */
                                <section className="clean-card" style={{ padding: '24px 20px', marginBottom: '16px', border: '3px solid var(--border-ink)', boxShadow: '4px 4px 0 var(--border-ink)' }}>
                                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>PEMBAYARAN DIGITAL (QRIS P2P)</span>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginTop: '4px' }}>Pindai Kode QRIS di Bawah</h2>
                                    </div>

                                    <PaymentQr reference={quest.payment_reference} amount={totalBayar} />

                                    <div style={{ backgroundColor: 'var(--color-sandstone)', padding: '12px 16px', borderRadius: '8px', border: '1.5px solid var(--border-ink)', marginBottom: '16px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Pembayaran:</span>
                                        <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: '800' }}>{rupiah(totalBayar)}</strong>
                                        <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No. Ref: {quest.payment_reference}</small>
                                    </div>

                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px', lineHeight: '1.4' }}>
                                        Buka aplikasi m-Banking atau E-Wallet apa saja di ponsel Anda, scan kode QRIS di atas, dan selesaikan transaksi.
                                    </p>

                                    <button
                                        className="revision-primary"
                                        disabled={paying}
                                        onClick={confirmPayment}
                                        style={{ width: '100%', margin: '0 0 10px', backgroundColor: 'var(--accent-green)' }}
                                    >
                                        {paying ? 'MEMVERIFIKASI…' : '✓ SAYA SUDAH MEMBAYAR VIA QRIS'}
                                    </button>

                                    <button
                                        onClick={() => setChangingMethod(true)}
                                        disabled={paying}
                                        style={{ width: '100%', background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', padding: '6px' }}
                                    >
                                        ↻ Ganti Metode ke Tunai (COD)
                                    </button>
                                </section>
                            ) : (
                                /* METODE 3: TRANSFER E-WALLET */
                                <section className="payment-instruction">
                                    <div className="checkout-heading">
                                        <div>
                                            <span>TRANSFER E-WALLET P2P</span>
                                            <h2>Kirim Saldo ke Nomor Pekerja</h2>
                                        </div>
                                    </div>
                                    <div className="wallet-options">
                                        {['DANA', 'GoPay', 'OVO'].map((item) => (
                                            <button key={item} className={wallet === item ? 'selected' : ''} onClick={() => setWallet(item)}>
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="payment-destination">
                                        <span>Nomor {wallet} Tujuan:</span>
                                        <strong>{quest.pekerja_id?.no_whatsapp || '0812-3456-7890'}</strong>
                                        <small>a.n. {workerName}</small>
                                    </div>
                                    <div className="checkout-total">
                                        <span>Total yang dikirim</span>
                                        <strong>{rupiah(totalBayar)}</strong>
                                    </div>
                                    <button className="payment-change-method" disabled={paying} onClick={() => setChangingMethod(true)}>
                                        ↻ GANTI METODE LAIN
                                    </button>
                                    <button className="revision-primary payment-confirm" disabled={paying} onClick={() => setProviderOpen(true)}>
                                        KONFIRMASI TRANSFER SELESAI
                                    </button>
                                </section>
                            )}
                        </div>
                    ) : (
                        /* ============================================================== */
                        /* KASUS 4: LAYAR KLIEN MEMILIH METODE PEMBAYARAN P2P             */
                        /* ============================================================== */
                        <div className="fade-up">
                            {/* Kartu Hasil Kerja Fisik */}
                            <section className="clean-card" style={{ padding: '18px 20px', marginBottom: '16px', border: '2px solid var(--border-ink)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--border-ink)', fontWeight: '800' }}>
                                        ✓
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0 }}>HASIL PEKERJAAN FISIK</h3>
                                        <small style={{ color: 'var(--text-muted)' }}>Pekerja telah tiba di hadapan Anda</small>
                                    </div>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: '0 0 12px', lineHeight: '1.4' }}>
                                    Tugas: <strong>{quest.deskripsi}</strong>
                                </p>
                                <div style={{ backgroundColor: 'var(--color-sandstone)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-ink)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                        <span>Upah Jasa</span>
                                        <strong>{rupiah(upahNominal)}</strong>
                                    </div>
                                    {talanganNominal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                            <span>Talangan Belanja</span>
                                            <strong style={{ color: 'var(--accent-coral)' }}>{rupiah(talanganNominal)}</strong>
                                        </div>
                                    )}
                                    <div style={{ borderTop: '1px solid var(--border-ink)', margin: '6px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800' }}>
                                        <span>Total Yang Harus Dibayar</span>
                                        <span style={{ fontSize: '1.1rem' }}>{rupiah(totalBayar)}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Pilihan Metode Pembayaran P2P */}
                            <section className="payment-checkout" style={{ padding: '20px' }}>
                                <span className="section-label">PILIH CARA BAYAR P2P</span>
                                <h2 style={{ fontSize: '1.15rem', marginBottom: '14px' }}>Bagaimana Anda ingin membayar?</h2>

                                {paymentMethods.map((item) => (
                                    <button
                                        key={item.id}
                                        className={method === item.id ? 'payment-method selected' : 'payment-method'}
                                        onClick={() => setMethod(item.id)}
                                        style={{ textAlign: 'left', marginBottom: '10px' }}
                                    >
                                        <b style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><item.Icon size={22} strokeWidth={2.4} /></b>
                                        <span>
                                            <strong>{item.title}</strong>
                                            <small>{item.detail}</small>
                                        </span>
                                        <i>{method === item.id ? '✓' : ''}</i>
                                    </button>
                                ))}

                                <button
                                    className="revision-primary"
                                    onClick={createPayment}
                                    style={{ width: '100%', marginTop: '14px', backgroundColor: 'var(--accent-green)' }}
                                >
                                    LANJUTKAN PEMBAYARAN ({rupiah(totalBayar)})
                                </button>
                            </section>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal Konfirmasi Dialog Pembayaran untuk non-COD */}
            {providerOpen && (
                <div className="revision-modal" onMouseDown={() => !paying && setProviderOpen(false)}>
                    <section className="payment-provider-dialog" onMouseDown={(e) => e.stopPropagation()}>
                        <span>JAWARGA PAY · P2P HANDSHAKE</span>
                        <h2>Konfirmasi Pembayaran</h2>
                        <p>Pastikan Anda telah memeriksa hasil pekerjaan fisik secara langsung.</p>
                        <div>
                            <small>Pekerja Penerima</small>
                            <strong>{workerName}</strong>
                            <small>Metode</small>
                            <strong>{method === 'EWALLET' ? wallet : method}</strong>
                            <small>Total Dibayar</small>
                            <strong style={{ color: 'var(--color-ink-black)', fontSize: '1.2rem' }}>{rupiah(totalBayar)}</strong>
                            <small>Referensi</small>
                            <strong>{quest.payment_reference}</strong>
                        </div>
                        <aside style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={18} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                            <span>Begitu konfirmasi ditekan, transaksi resmi lunas dan struk digital akan terbit di kedua HP.</span>
                        </aside>
                        <button className="revision-primary" disabled={paying} onClick={confirmPayment}>
                            {paying ? 'MEMVERIFIKASI…' : `KONFIRMASI LUNAS (${rupiah(totalBayar)})`}
                        </button>
                        <button className="provider-cancel" disabled={paying} onClick={() => setProviderOpen(false)}>
                            BATAL
                        </button>
                    </section>
                </div>
            )}

            <BottomNav activePage="tugas" />
        </>
    );
}
