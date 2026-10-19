import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { MessageSquare, Inbox, Lock, ShieldCheck, Shield, Send } from 'lucide-react';

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const idOf = (value) => String(value?._id || value || '');

export default function ChatNegotiation() {
    const navigate = useNavigate();
    const location = useLocation();
    const myId = localStorage.getItem('myUserId');
    const [questId, setQuestId] = useState(location.state?.questId || null);
    const [conversationId, setConversationId] = useState(location.state?.conversationId || null);
    const [quest, setQuest] = useState(null);
    const [conversation, setConversation] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [offerOpen, setOfferOpen] = useState(false);
    const [offer, setOffer] = useState({ amount: '', duration: '2 jam', note: '' });
    const [acceptingListedPrice, setAcceptingListedPrice] = useState(false);

    const initialStatusRef = useRef(null);
    const redirectedRef = useRef(false);

    const isClient = idOf(quest?.pembuat_id) === String(myId);
    const otherUser = isClient ? conversation?.worker_id : conversation?.client_id;
    const canNegotiate = conversation?.status === 'NEGOTIATING'
        && (quest?.status === 'OPEN' || (quest?.status === 'TAKEN' && quest?.negotiation_status !== 'AGREED'));
    const chatLocked = !conversation
        || ['REJECTED', 'CLOSED'].includes(conversation.status)
        || quest?.status === 'COMPLETED'
        || quest?.chat_status === 'DELETED';

    const loadData = useCallback(async () => {
        try {
            setLoadError('');
            if (conversationId) {
                const response = await axios.get(`/api/chat/conversations/${conversationId}/messages`);
                const loadedConversation = response.data.data.conversation;
                const loadedQuest = response.data.data.quest;
                setConversation(loadedConversation);
                setQuest(loadedQuest);
                setQuestId(loadedQuest._id);
                setMessages(response.data.data.messages);

                if (initialStatusRef.current === null && loadedQuest?.status) {
                    initialStatusRef.current = loadedQuest.status;
                } else if (
                    !redirectedRef.current &&
                    initialStatusRef.current === 'OPEN' &&
                    (loadedQuest?.status === 'TAKEN' || loadedConversation?.status === 'SELECTED' || loadedQuest?.negotiation_status === 'AGREED')
                ) {
                    redirectedRef.current = true;
                    toast.success('Penawaran telah disepakati! Mengalihkan ke Tugas Aktif...');
                    setTimeout(() => {
                        navigate('/detail-tugas', { replace: true });
                    }, 800);
                }
                return;
            }

            let activeQuestId = questId;
            if (!activeQuestId) {
                const active = await axios.get('/api/chat/active');
                activeQuestId = active.data.data._id;
                setQuestId(activeQuestId);
            }
            const response = await axios.get(`/api/chat/quests/${activeQuestId}/conversations`);
            const fetchedQuest = response.data.data.quest;
            const fetchedConversations = response.data.data.conversations;
            setQuest(fetchedQuest);
            setConversations(fetchedConversations);

            const requesterIsClient = idOf(fetchedQuest.pembuat_id) === String(myId);
            const selected = fetchedConversations.find((item) => item.status === 'SELECTED');
            const automatic = selected || (!requesterIsClient && fetchedConversations[0]) || (fetchedConversations.length === 1 ? fetchedConversations[0] : null);
            if (automatic) setConversationId(automatic._id);

            if (initialStatusRef.current === null && fetchedQuest?.status) {
                initialStatusRef.current = fetchedQuest.status;
            } else if (
                !redirectedRef.current &&
                initialStatusRef.current === 'OPEN' &&
                (fetchedQuest?.status === 'TAKEN' || fetchedQuest?.negotiation_status === 'AGREED' || selected)
            ) {
                redirectedRef.current = true;
                toast.success('Penawaran telah disepakati! Mengalihkan ke Tugas Aktif...');
                setTimeout(() => {
                    navigate('/detail-tugas', { replace: true });
                }, 800);
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Gagal memuat percakapan.';
            setLoadError(message);
            if (error.response?.status !== 404) toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [conversationId, questId, myId, navigate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    useEffect(() => {
        const timer = window.setInterval(loadData, 4000);
        return () => window.clearInterval(timer);
    }, [loadData]);

    const pendingOffer = useMemo(
        () => messages.findLast?.((message) => message.type === 'OFFER' && message.offer?.status === 'PENDING')
            || [...messages].reverse().find((message) => message.type === 'OFFER' && message.offer?.status === 'PENDING'),
        [messages]
    );

    const openOfferDialog = (preset = null) => {
        setOffer({
            amount: preset?.amount || quest?.agreed_upah || quest?.upah_jasa || '',
            duration: preset?.duration || '2 jam',
            note: ''
        });
        setOfferOpen(true);
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        try {
            await axios.post(`/api/chat/conversations/${conversationId}/messages`, { text: draft });
            setDraft('');
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Pesan gagal dikirim.');
        }
    };

    const sendOffer = async (event) => {
        event.preventDefault();
        try {
            await axios.post(`/api/chat/conversations/${conversationId}/offers`, offer);
            setOfferOpen(false);
            toast.success('Penawaran dikirim kepada pihak lainnya.');
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Penawaran gagal dikirim.');
        }
    };

    const acceptListedPrice = async () => {
        if (acceptingListedPrice) return;
        setAcceptingListedPrice(true);
        redirectedRef.current = true;
        try {
            await axios.post(`/api/chat/conversations/${conversationId}/accept-listed-price`);
            toast.success(`Quest berhasil diambil! Mengalihkan ke Tugas Aktif...`);
            setTimeout(() => {
                navigate('/detail-tugas', { replace: true });
            }, 800);
        } catch (error) {
            redirectedRef.current = false;
            toast.error(error.response?.data?.message || 'Quest gagal diterima.');
        } finally {
            setAcceptingListedPrice(false);
        }
    };

    const respondOffer = async (messageId, action) => {
        try {
            await axios.put(`/api/chat/conversations/${conversationId}/offers/${messageId}`, { action });
            if (action === 'ACCEPT') {
                redirectedRef.current = true;
                toast.success('Penawaran disepakati! Mengalihkan ke Tugas Aktif...');
                setTimeout(() => {
                    navigate('/detail-tugas', { replace: true });
                }, 800);
            } else {
                toast.success('Penawaran ditolak.');
                await loadData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Respons gagal dikirim.');
        }
    };

    const goBack = () => {
        if (conversation && isClient && quest?.status === 'OPEN' && conversations.length > 1) {
            setConversation(null);
            setConversationId(null);
            setMessages([]);
            return;
        }
        navigate('/detail-tugas');
    };

    if (loading) return <div className="revision-page revision-center">Memuat percakapan…</div>;

    if (!quest) return (
        <>
            <div className="revision-page revision-center">
                <div className="revision-empty">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-sandstone)', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}>
                            <MessageSquare size={30} strokeWidth={2.2} color="var(--color-ink-black)" />
                        </div>
                    </div>
                    <h2>Belum ada percakapan</h2><p>{loadError || 'Buka quest dan pilih Ajukan Penawaran.'}</p><button onClick={() => navigate('/beranda')} className="revision-primary">KEMBALI KE BERANDA</button>
                </div>
            </div>
            <BottomNav activePage="tugas" />
        </>
    );

    if (!conversationId) return (
        <>
            <div className="revision-page">
                <header className="revision-header"><button onClick={() => navigate('/detail-tugas')}>←</button><div><span>PENAWARAN QUEST</span><h1>Calon Pekerja</h1></div><i className="verified-dot">{conversations.length}</i></header>
                <main className="revision-main">
                    <section className="revision-quest-summary"><div><span>QUEST TERBUKA</span><strong>{quest.deskripsi}</strong></div><em>{conversations.length} PENAWAR</em><div className="summary-line"><span>Upah awal</span><strong>{rupiah(quest.upah_jasa)}</strong></div></section>
                    <div className="revision-privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Lock size={13} strokeWidth={2.4} /> Setiap calon Pekerja memiliki ruang negosiasi pribadi.
                    </div>
                    {conversations.length === 0 ? (
                        <div className="revision-empty" style={{ marginTop: '60px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-sandstone)', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}>
                                    <Inbox size={30} strokeWidth={2.2} color="var(--color-ink-black)" />
                                </div>
                            </div>
                            <h2>Belum ada penawaran</h2><p>Penawaran calon Pekerja akan muncul di halaman ini.</p>
                        </div>
                    ) : conversations.map((item) => (
                        <article className="clean-card" key={item._id} style={{ padding: '16px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}><strong>{item.worker_id?.nama_lengkap || 'Calon Pekerja'}</strong><span className="badge badge-dark">{item.status}</span></div>
                            {item.latest_offer ? <p style={{ fontSize: '13px', marginBottom: '10px' }}><b>{rupiah(item.latest_offer.amount)}</b> · {item.latest_offer.duration}<br />{item.latest_offer.note}</p> : <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Ruang dibuka, belum ada nominal penawaran.</p>}
                            <button className="revision-primary" onClick={() => setConversationId(item._id)}>BUKA NEGOSIASI →</button>
                        </article>
                    ))}
                </main>
            </div>
            <BottomNav activePage="tugas" />
        </>
    );

    return (
        <>
            <div className="revision-page">
                <header className="revision-header"><button onClick={goBack}>←</button><div><span>{quest.status === 'OPEN' ? 'NEGOSIASI PRA-TUGAS' : 'CHAT TUGAS AKTIF'}</span><h1>{otherUser?.nama_lengkap || 'Pengguna'}</h1></div><i className="verified-dot">✓</i></header>
                <main className="revision-main">
                    <section className="revision-quest-summary">
                        <div><span>{quest.status === 'OPEN' ? 'BELUM DIAMBIL' : 'QUEST AKTIF'}</span><strong>{quest.deskripsi}</strong></div>
                        <em>{conversation?.status === 'SELECTED' ? 'PEKERJA DIPILIH' : conversation?.status || 'NEGOSIASI'}</em>
                        <div className="summary-line"><span>Upah {quest.agreed_upah ? 'kesepakatan' : 'awal'}</span><strong>{rupiah(quest.agreed_upah || quest.upah_jasa)}</strong></div>
                        {quest.status === 'AWAITING_PAYMENT' && isClient && quest.payment_status !== 'PAID' && <button className="revision-payment-link" onClick={() => navigate('/pembayaran', { state: { questId } })}>LANJUT KE PEMBAYARAN →</button>}
                        {['TAKEN', 'IN_PROGRESS'].includes(quest.status) && (
                            <button
                                onClick={() => navigate('/detail-tugas')}
                                style={{
                                    width: '100%',
                                    marginTop: '10px',
                                    padding: '9px 12px',
                                    backgroundColor: 'var(--accent-green)',
                                    color: 'var(--text-main)',
                                    border: '2px solid var(--border-ink)',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    boxShadow: '2px 2px 0 var(--border-ink)'
                                }}
                            >
                                BUKA TUGAS AKTIF (NAVIGASI & PIN) →
                            </button>
                        )}
                    </section>

                    <div className="revision-privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} strokeWidth={2.4} color="var(--accent-green)" /> Nomor telepon kedua pihak disembunyikan.
                    </div>
                    <section className="chat-window">
                        {quest.chat_status === 'DELETED' ? (
                            <div className="revision-empty">
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-sandstone)', border: '2px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}>
                                        <Shield size={30} strokeWidth={2.2} color="var(--color-ink-black)" />
                                    </div>
                                </div>
                                <h2>Riwayat chat telah dihapus</h2>
                            </div>
                        ) : messages.length === 0 ? <div className="chat-placeholder">Mulai negosiasi dengan pesan atau ajukan penawaran.</div> : messages.map((message) => {
                            if (message.type === 'SYSTEM') return <div className="chat-system" key={message._id}>{message.text}</div>;
                            const own = idOf(message.sender_id) === String(myId);
                            if (message.type === 'OFFER') {
                                const canRespond = !own && message.offer.status === 'PENDING' && canNegotiate;
                                return <article key={message._id} className={`chat-offer ${own ? 'own' : ''}`}>
                                    <div><span>PENAWARAN</span><em>{message.offer.status}</em></div>
                                    <h2>{rupiah(message.offer.amount)}</h2>
                                    <p><b>Estimasi:</b> {message.offer.duration}</p><p>{message.offer.note}</p>
                                    {canRespond && <div className="offer-response"><button onClick={() => respondOffer(message._id, 'REJECT')}>TOLAK</button><button onClick={() => openOfferDialog(message.offer)}>TAWAR BALIK</button><button onClick={() => respondOffer(message._id, 'ACCEPT')}>TERIMA & PILIH</button></div>}
                                </article>;
                            }
                            return <div key={message._id} className={`chat-row ${own ? 'own' : ''}`}><div>{message.text}<small>{new Date(message.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{own ? ` · ${message.read_by?.length > 1 ? 'Dibaca' : 'Terkirim'}` : ''}</small></div></div>;
                        })}
                    </section>

                    {!chatLocked ? <>
                        {canNegotiate && !isClient && <button className="revision-accept-listed" disabled={acceptingListedPrice} onClick={acceptListedPrice}>{acceptingListedPrice ? 'MEMPROSES…' : `✓ TERIMA UPAH AWAL · ${rupiah(quest.upah_jasa)}`}</button>}
                        {canNegotiate && <button className="revision-offer-trigger" onClick={() => openOfferDialog(pendingOffer?.offer)}>+ {pendingOffer ? 'BUAT PENAWARAN BARU' : 'AJUKAN PENAWARAN'}</button>}
                        <form className="chat-composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="500" placeholder={quest.status === 'OPEN' ? 'Tulis pesan negosiasi…' : 'Tulis pesan tentang pekerjaan…'} /><button disabled={!draft.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={15} strokeWidth={2.4} /></button></form>
                    </> : <div className="chat-locked" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Lock size={14} strokeWidth={2.4} /> Percakapan ini sudah ditutup.</div>}
                </main>
            </div>
            <BottomNav activePage="tugas" />
            {offerOpen && <div className="revision-modal" onMouseDown={() => setOfferOpen(false)}><form className="revision-dialog" onSubmit={sendOffer} onMouseDown={(event) => event.stopPropagation()}><span className="section-label">PENAWARAN SEBELUM QUEST DIAMBIL</span><h2>Ajukan upah dan waktu</h2><label>Nominal<input type="number" min="1000" step="1000" value={offer.amount} onChange={(event) => setOffer({ ...offer, amount: event.target.value })} required /></label><label>Estimasi<input value={offer.duration} onChange={(event) => setOffer({ ...offer, duration: event.target.value })} required /></label><label>Catatan<textarea rows="3" maxLength="180" value={offer.note} onChange={(event) => setOffer({ ...offer, note: event.target.value })} required /></label><div><button type="button" onClick={() => setOfferOpen(false)}>BATAL</button><button type="submit">KIRIM PENAWARAN</button></div></form></div>}
        </>
    );
}
