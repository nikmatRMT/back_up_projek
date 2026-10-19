import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { MessageSquare, ShieldCheck, Shield, Lock, Send } from 'lucide-react';

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

export default function ChatQuest() {
    const navigate = useNavigate();
    const location = useLocation();
    const myId = localStorage.getItem('myUserId');
    const [questId, setQuestId] = useState(location.state?.questId || null);
    const [quest, setQuest] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [offerOpen, setOfferOpen] = useState(false);
    const [offer, setOffer] = useState({ amount: '', duration: '2 jam', note: '' });

    const loadConversation = useCallback(async () => {
        try {
            let activeId = questId;
            if (!activeId) {
                const active = await axios.get('/api/chat/active');
                activeId = active.data.data._id;
                setQuestId(activeId);
            }
            const response = await axios.get(`/api/chat/${activeId}/messages`);
            setQuest(response.data.data.quest);
            setMessages(response.data.data.messages);
        } catch (error) {
            if (error.response?.status !== 404) toast.error(error.response?.data?.message || 'Gagal memuat chat.');
        } finally {
            setLoading(false);
        }
    }, [questId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadConversation();
    }, [loadConversation]);
    useEffect(() => {
        const timer = window.setInterval(loadConversation, 4000);
        return () => window.clearInterval(timer);
    }, [loadConversation]);

    const isClient = String(quest?.pembuat_id?._id) === String(myId);
    const otherUser = isClient ? quest?.pekerja_id : quest?.pembuat_id;
    const chatLocked = !quest || quest.chat_status !== 'ACTIVE' || quest.status === 'COMPLETED';

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        try {
            await axios.post(`/api/chat/${questId}/messages`, { text: draft });
            setDraft('');
            await loadConversation();
        } catch (error) { toast.error(error.response?.data?.message || 'Pesan gagal dikirim.'); }
    };

    const sendOffer = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`/api/chat/${questId}/offers`, offer);
            setOfferOpen(false);
            setOffer({ amount: '', duration: '2 jam', note: '' });
            await loadConversation();
        } catch (error) { toast.error(error.response?.data?.message || 'Penawaran gagal dikirim.'); }
    };

    const respondOffer = async (messageId, action) => {
        try {
            await axios.put(`/api/chat/${questId}/offers/${messageId}`, { action });
            toast.success(action === 'ACCEPT' ? 'Penawaran disepakati.' : 'Penawaran ditolak.');
            await loadConversation();
        } catch (error) { toast.error(error.response?.data?.message || 'Respons gagal dikirim.'); }
    };

    if (loading) return <div className="revision-page revision-center">Memuat percakapan…</div>;
    if (!quest) return (
        <><div className="revision-page revision-center"><div className="revision-empty"><div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-sandstone)', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}><MessageSquare size={30} strokeWidth={2.2} color="var(--color-ink-black)" /></div></div><h2>Belum ada chat aktif</h2><p>Chat dibuat setelah Pekerja mengambil quest.</p><button onClick={() => navigate('/beranda')} className="revision-primary">KEMBALI KE BERANDA</button></div></div><BottomNav activePage="tugas" /></>
    );

    return (
        <>
            <div className="revision-page">
                <header className="revision-header"><button onClick={() => navigate('/detail-tugas')}>←</button><div><span>CHAT QUEST</span><h1>{otherUser?.nama_lengkap || 'Pengguna'}</h1></div><i className="verified-dot">✓</i></header>
                <main className="revision-main">
                    <section className="revision-quest-summary">
                        <div><span>QUEST AKTIF</span><strong>{quest.deskripsi}</strong></div>
                        <em>{quest.negotiation_status === 'AGREED' ? 'DISEPAKATI' : 'NEGOSIASI'}</em>
                        <div className="summary-line"><span>Upah {quest.agreed_upah ? 'kesepakatan' : 'awal'}</span><strong>{rupiah(quest.agreed_upah || quest.upah_jasa)}</strong></div>
                        {quest.negotiation_status === 'AGREED' && isClient && quest.payment_status !== 'PAID' && <button className="revision-payment-link" onClick={() => navigate('/pembayaran', { state: { questId } })}>LANJUT KE PEMBAYARAN →</button>}
                    </section>

                    <div className="revision-privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ShieldCheck size={14} strokeWidth={2.4} color="var(--accent-green)" /> Nomor telepon kedua pihak disembunyikan.</div>
                    <section className="chat-window">
                        {quest.chat_status === 'DELETED' ? <div className="revision-empty"><div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-sandstone)', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}><Shield size={30} strokeWidth={2.2} color="var(--color-ink-black)" /></div></div><h2>Riwayat chat telah dihapus</h2></div> : messages.length === 0 ? <div className="chat-placeholder">Mulai percakapan tentang quest ini.</div> : messages.map((message) => {
                            if (message.type === 'SYSTEM') return <div className="chat-system" key={message._id}>{message.text}</div>;
                            const own = String(message.sender_id?._id || message.sender_id) === String(myId);
                            if (message.type === 'OFFER') {
                                const canRespond = !own && message.offer.status === 'PENDING' && quest.status === 'TAKEN';
                                return <article key={message._id} className={`chat-offer ${own ? 'own' : ''}`}>
                                    <div><span>PENAWARAN</span><em>{message.offer.status}</em></div>
                                    <h2>{rupiah(message.offer.amount)}</h2>
                                    <p><b>Estimasi:</b> {message.offer.duration}</p><p>{message.offer.note}</p>
                                    {canRespond && <div className="offer-response"><button onClick={() => respondOffer(message._id, 'REJECT')}>TOLAK</button><button onClick={() => { setOffer({ amount: message.offer.amount, duration: message.offer.duration, note: '' }); setOfferOpen(true); }}>TAWAR BALIK</button><button onClick={() => respondOffer(message._id, 'ACCEPT')}>TERIMA</button></div>}
                                </article>;
                            }
                            return <div key={message._id} className={`chat-row ${own ? 'own' : ''}`}><div>{message.text}<small>{new Date(message.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{own ? ` · ${message.read_by?.length > 1 ? 'Dibaca' : 'Terkirim'}` : ''}</small></div></div>;
                        })}
                    </section>

                    {!chatLocked ? <>
                        {quest.status === 'TAKEN' && <button className="revision-offer-trigger" onClick={() => { setOffer((current) => ({ ...current, amount: current.amount || quest.upah_jasa })); setOfferOpen(true); }}>+ AJUKAN PENAWARAN</button>}
                        <form className="chat-composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="500" placeholder="Tulis pesan…" /><button disabled={!draft.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={15} strokeWidth={2.4} /></button></form>
                    </> : <div className="chat-locked" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Lock size={14} strokeWidth={2.4} /> Chat dikunci setelah transaksi selesai.</div>}
                </main>
            </div>
            <BottomNav activePage="tugas" />
            {offerOpen && <div className="revision-modal" onMouseDown={() => setOfferOpen(false)}><form className="revision-dialog" onSubmit={sendOffer} onMouseDown={(event) => event.stopPropagation()}><span className="section-label">PENAWARAN DI DALAM CHAT</span><h2>Ajukan upah dan waktu</h2><label>Nominal<input type="number" min="1000" step="1000" value={offer.amount} onChange={(event) => setOffer({ ...offer, amount: event.target.value })} required /></label><label>Estimasi<input value={offer.duration} onChange={(event) => setOffer({ ...offer, duration: event.target.value })} required /></label><label>Catatan<textarea rows="3" maxLength="180" value={offer.note} onChange={(event) => setOffer({ ...offer, note: event.target.value })} required /></label><div><button type="button" onClick={() => setOfferOpen(false)}>BATAL</button><button type="submit">KIRIM</button></div></form></div>}
        </>
    );
}
