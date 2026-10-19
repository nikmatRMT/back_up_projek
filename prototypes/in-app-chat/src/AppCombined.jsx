import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEMO_RETENTION_SECONDS,
  PARTICIPANTS,
  QUEST,
  createInitialChatState,
} from './data/demo';
import { clearChatState, loadChatState, saveChatState } from './utils/chatStorage';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `00:${String(totalSeconds).padStart(2, '0')}`;
}

function createId(prefix) {
  return window.crypto?.randomUUID?.() || `${prefix}-${Date.now()}`;
}

function MessageStatus({ status }) {
  if (status === 'read') {
    return <span className="message-status read" title="Sudah dibaca">✓✓</span>;
  }
  if (status === 'delivered') {
    return <span className="message-status" title="Sudah diterima">✓✓</span>;
  }
  return <span className="message-status" title="Terkirim">✓</span>;
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 2.9 8 7 10 4.1-2 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function OfferCard({ message, isOwn, canRespond, onAccept, onReject, onCounter }) {
  const statusLabels = {
    PENDING: 'MENUNGGU JAWABAN',
    ACCEPTED: 'DISEPAKATI',
    REJECTED: 'DITOLAK',
    EXPIRED: 'DIGANTIKAN',
  };

  return (
    <article className={`offer-card ${message.offerStatus.toLowerCase()} ${isOwn ? 'own' : ''}`}>
      <div className="offer-heading">
        <span>{message.isCounter ? 'TAWARAN BALIK' : 'PENAWARAN'}</span>
        <span className={`offer-status ${message.offerStatus.toLowerCase()}`}>
          {statusLabels[message.offerStatus]}
        </span>
      </div>
      <strong className="offer-amount">{formatRupiah(message.amount)}</strong>
      <dl className="offer-details">
        <div><dt>Estimasi</dt><dd>{message.duration}</dd></div>
        <div><dt>Catatan</dt><dd>{message.note}</dd></div>
      </dl>
      {canRespond && (
        <div className="offer-actions">
          <button type="button" className="reject-offer" onClick={() => onReject(message.id)}>TOLAK</button>
          <button type="button" className="counter-offer" onClick={() => onCounter(message)}>TAWAR BALIK</button>
          <button type="button" className="accept-offer" onClick={() => onAccept(message)}>TERIMA</button>
        </div>
      )}
      <div className="offer-time">
        <time>{formatTime(message.createdAt)}</time>
        {isOwn && <MessageStatus status={message.status} />}
      </div>
    </article>
  );
}

function AppCombined() {
  const [activeRole, setActiveRole] = useState('client');
  const [chatState, setChatState] = useState(loadChatState);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [offerDialog, setOfferDialog] = useState(null);
  const [offerForm, setOfferForm] = useState({ amount: QUEST.reward, duration: '2 jam', note: '' });
  const messagesEndRef = useRef(null);

  const activeUser = PARTICIPANTS[activeRole];
  const otherRole = activeRole === 'client' ? 'worker' : 'client';
  const otherUser = PARTICIPANTS[otherRole];
  const isNegotiating = chatState.transactionStatus === 'NEGOTIATING';
  const isInProgress = chatState.transactionStatus === 'IN_PROGRESS';
  const isRetention = chatState.chatStatus === 'RETENTION';
  const isDeleted = chatState.chatStatus === 'DELETED';
  const isChatOpen = chatState.chatStatus === 'ACTIVE';
  const remainingRetention = isRetention ? Math.max(0, chatState.deleteAt - now) : 0;

  const messages = useMemo(
    () => [...chatState.messages].sort((a, b) => a.createdAt - b.createdAt),
    [chatState.messages],
  );

  useEffect(() => saveChatState(chatState), [chatState]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isRetention && now >= chatState.deleteAt) {
      setChatState((current) => ({
        ...current,
        chatStatus: 'DELETED',
        messages: [],
        deletedAt: Date.now(),
      }));
    }
  }, [chatState.deleteAt, isRetention, now]);

  useEffect(() => {
    setChatState((current) => {
      let changed = false;
      const nextMessages = current.messages.map((message) => {
        if (message.senderId !== activeUser.id && message.status !== 'read') {
          changed = true;
          return { ...message, status: 'read' };
        }
        return message;
      });
      return changed ? { ...current, messages: nextMessages } : current;
    });
  }, [activeUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const switchRole = (role) => {
    setActiveRole(role);
    setDraft('');
  };

  const systemMessage = (text) => ({
    id: createId('system'),
    kind: 'system',
    senderId: 'system',
    text,
    createdAt: Date.now() + 1,
    status: 'read',
  });

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !isChatOpen) return;
    const message = {
      id: createId('message'),
      kind: 'text',
      senderId: activeUser.id,
      text,
      createdAt: Date.now(),
      status: 'delivered',
    };
    setChatState((current) => ({ ...current, messages: [...current.messages, message] }));
    setDraft('');
  };

  const openOfferDialog = (sourceOffer = null) => {
    setOfferForm({
      amount: sourceOffer?.amount || QUEST.reward,
      duration: sourceOffer?.duration || '2 jam',
      note: sourceOffer ? '' : 'Harga menyesuaikan tingkat kesulitan pekerjaan.',
    });
    setOfferDialog({ isCounter: Boolean(sourceOffer) });
  };

  const submitOffer = (event) => {
    event.preventDefault();
    const amount = Number(offerForm.amount);
    if (!Number.isFinite(amount) || amount < 1000 || !offerForm.duration.trim() || !offerForm.note.trim()) return;
    const offer = {
      id: createId('offer'),
      kind: 'offer',
      senderId: activeUser.id,
      amount,
      duration: offerForm.duration.trim(),
      note: offerForm.note.trim(),
      isCounter: offerDialog.isCounter,
      offerStatus: 'PENDING',
      createdAt: Date.now(),
      status: 'delivered',
    };
    setChatState((current) => ({
      ...current,
      messages: current.messages
        .map((message) => (
          message.kind === 'offer' && message.offerStatus === 'PENDING'
            ? { ...message, offerStatus: 'EXPIRED' }
            : message
        ))
        .concat(offer),
    }));
    setOfferDialog(null);
  };

  const acceptOffer = (offer) => {
    setChatState((current) => ({
      ...current,
      transactionStatus: 'IN_PROGRESS',
      agreement: {
        amount: offer.amount,
        duration: offer.duration,
        acceptedAt: Date.now(),
        acceptedOfferId: offer.id,
      },
      messages: current.messages
        .map((message) => {
          if (message.id === offer.id) return { ...message, offerStatus: 'ACCEPTED' };
          if (message.kind === 'offer' && message.offerStatus === 'PENDING') {
            return { ...message, offerStatus: 'EXPIRED' };
          }
          return message;
        })
        .concat(systemMessage(`Kesepakatan tercapai: ${formatRupiah(offer.amount)} · ${offer.duration}. Quest mulai dikerjakan.`)),
    }));
  };

  const rejectOffer = (offerId) => {
    setChatState((current) => ({
      ...current,
      messages: current.messages
        .map((message) => message.id === offerId ? { ...message, offerStatus: 'REJECTED' } : message)
        .concat(systemMessage(`${activeUser.roleLabel} menolak penawaran. Negosiasi masih dapat dilanjutkan.`)),
    }));
  };

  const completeTransaction = () => {
    const closedAt = Date.now();
    setChatState((current) => ({
      ...current,
      transactionStatus: 'COMPLETED',
      chatStatus: 'RETENTION',
      closedAt,
      deleteAt: closedAt + DEMO_RETENTION_SECONDS * 1000,
    }));
    setShowCompleteDialog(false);
    setDraft('');
  };

  const resetDemo = () => {
    clearChatState();
    setChatState(createInitialChatState());
    setActiveRole('client');
    setDraft('');
    setShowCompleteDialog(false);
    setOfferDialog(null);
    setNow(Date.now());
  };

  const statusLabel = isNegotiating ? 'NEGOSIASI' : isInProgress ? 'DIKERJAKAN' : 'SELESAI';
  const statusClass = isNegotiating ? 'negotiating' : isInProgress ? 'active' : isDeleted ? 'deleted' : 'completed';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">PROTOTIPE FITUR 02 + 03</span>
          <h1>Chat &amp; Penawaran</h1>
          <p>Negosiasi upah tanpa membuka nomor telepon.</p>
        </div>
        <img className="app-logo" src="/logo.jpg" alt="Logo Jawarga" />
      </header>

      <main>
        <section className="role-card fade-up">
          <div className="section-heading compact">
            <div><span className="section-label">MODE PENGUJIAN</span><h2>Lihat sebagai</h2></div>
            <button className="demo-badge reset-mini" type="button" onClick={resetDemo}>RESET</button>
          </div>
          <div className="role-switch" aria-label="Pilih perspektif pengguna">
            {Object.entries(PARTICIPANTS).map(([role, participant]) => (
              <button key={role} type="button" className={activeRole === role ? `role-button active ${role}` : 'role-button'} onClick={() => switchRole(role)}>
                <span className="role-avatar">{participant.initials}</span>
                <span><strong>{participant.roleLabel}</strong><small>{participant.name}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="quest-card fade-up delay-1">
          <div className="quest-topline">
            <span className="section-label">QUEST {QUEST.transactionCode}</span>
            <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
          </div>
          <h2>{QUEST.title}</h2>
          <p>{QUEST.location}</p>
          <div className="quest-meta">
            <span>{chatState.agreement ? 'Upah disepakati' : 'Upah awal klien'}</span>
            <strong>{formatRupiah(chatState.agreement?.amount || QUEST.reward)}</strong>
          </div>
          {chatState.agreement && (
            <div className="agreement-strip"><span>Estimasi disepakati</span><strong>{chatState.agreement.duration}</strong></div>
          )}
          {activeRole === 'client' && isInProgress && isChatOpen && (
            <button className="complete-button" type="button" onClick={() => setShowCompleteDialog(true)}>SELESAIKAN TRANSAKSI</button>
          )}
        </section>

        <section className="privacy-banner fade-up delay-2">
          <div className="privacy-icon"><ShieldIcon /></div>
          <div><strong>Negosiasi aman di dalam aplikasi</strong><p>Nomor telepon tersembunyi dan kesepakatan tercatat bersama quest.</p></div>
        </section>

        <section className="chat-card fade-up delay-3">
          <header className="chat-header">
            <div className={`contact-avatar ${otherRole}`}>{otherUser.initials}</div>
            <div className="contact-info"><strong>{otherUser.name}</strong><span><i /> {otherUser.roleLabel} · Identitas terverifikasi</span></div>
            <ChatIcon />
          </header>

          {isNegotiating && isChatOpen && (
            <div className="phase-banner"><strong>FASE NEGOSIASI</strong><span>Setujui satu penawaran agar quest mulai dikerjakan.</span></div>
          )}

          {isRetention && (
            <div className="retention-banner" role="status">
              <div><span className="retention-label">CHAT DIKUNCI · AUTO-DELETE</span><strong>{formatCountdown(remainingRetention)}</strong></div>
              <p>Simulasi 30 detik ini mewakili masa retensi 30 hari pada produksi.</p>
            </div>
          )}

          {isDeleted ? (
            <div className="deleted-state">
              <div className="deleted-icon"><ShieldIcon /></div>
              <span className="status-badge deleted">RIWAYAT DIHAPUS</span>
              <h2>Pesan dan riwayat negosiasi telah dihapus</h2>
              <p>Ringkasan transaksi tetap tercatat, tetapi isi percakapan sudah tidak dapat diakses.</p>
              <button type="button" className="reset-button" onClick={resetDemo}>ULANGI SIMULASI</button>
            </div>
          ) : (
            <>
              <div className="message-area" aria-live="polite">
                <div className="date-divider"><span>Hari ini</span></div>
                {messages.map((message) => {
                  if (message.kind === 'system') return <div key={message.id} className="system-message"><span>{message.text}</span></div>;
                  const isOwn = message.senderId === activeUser.id;
                  if (message.kind === 'offer') {
                    const canRespond = isNegotiating && isChatOpen && !isOwn && message.offerStatus === 'PENDING';
                    return (
                      <div key={message.id} className={isOwn ? 'message-row own' : 'message-row'}>
                        <OfferCard message={message} isOwn={isOwn} canRespond={canRespond} onAccept={acceptOffer} onReject={rejectOffer} onCounter={openOfferDialog} />
                      </div>
                    );
                  }
                  return (
                    <div key={message.id} className={isOwn ? 'message-row own' : 'message-row'}>
                      <div className={isOwn ? 'message-bubble own' : 'message-bubble'}>
                        <p>{message.text}</p>
                        <div className="message-meta"><time>{formatTime(message.createdAt)}</time>{isOwn && <MessageStatus status={message.status} />}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {isChatOpen ? (
                <>
                  {isNegotiating && (
                    <div className="offer-toolbar">
                      <span>{activeRole === 'worker' ? 'Punya usulan upah atau waktu?' : 'Klien juga dapat membuat tawaran balik.'}</span>
                      <button type="button" onClick={() => openOfferDialog()}>{activeRole === 'worker' ? '+ AJUKAN PENAWARAN' : '+ BUAT TAWARAN'}</button>
                    </div>
                  )}
                  <form className="composer" onSubmit={sendMessage}>
                    <label className="sr-only" htmlFor="chat-message">Tulis pesan</label>
                    <textarea
                      id="chat-message"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder={`Tulis pesan sebagai ${activeUser.roleLabel}…`}
                      maxLength={500}
                      rows={1}
                    />
                    <button type="submit" aria-label="Kirim pesan" disabled={!draft.trim()}><SendIcon /></button>
                  </form>
                </>
              ) : (
                <div className="locked-composer"><ShieldIcon /><span>Percakapan ditutup karena transaksi telah selesai.</span></div>
              )}
            </>
          )}
        </section>

        {!isDeleted && (
          <aside className="prototype-note"><strong>Alur prototipe terpadu</strong><p>Chat dibuka saat pekerja mengajukan penawaran. Setelah salah satu tawaran diterima, quest menjadi aktif dan chat berlanjut sampai transaksi selesai.</p></aside>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navigasi prototipe">
        <button type="button"><span className="nav-symbol">⌂</span><span>Quest</span></button>
        <button type="button" className="active"><ChatIcon /><span>Chat</span></button>
        <button type="button"><span className="nav-symbol">○</span><span>Profil</span></button>
      </nav>

      {offerDialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setOfferDialog(null)}>
          <form className="dialog-card offer-dialog" role="dialog" aria-modal="true" aria-labelledby="offer-dialog-title" onSubmit={submitOffer} onMouseDown={(event) => event.stopPropagation()}>
            <span className="dialog-symbol offer-symbol">Rp</span>
            <h2 id="offer-dialog-title">{offerDialog.isCounter ? 'Ajukan tawaran balik' : 'Buat penawaran'}</h2>
            <p>Penawaran akan muncul sebagai kartu dan tercatat di dalam percakapan.</p>
            <label><span>Nominal upah</span><input type="number" min="1000" step="1000" value={offerForm.amount} onChange={(event) => setOfferForm((current) => ({ ...current, amount: event.target.value }))} required /></label>
            <label><span>Estimasi pengerjaan</span><input type="text" value={offerForm.duration} onChange={(event) => setOfferForm((current) => ({ ...current, duration: event.target.value }))} maxLength="40" placeholder="Contoh: 2 jam" required /></label>
            <label><span>Alasan atau catatan</span><textarea value={offerForm.note} onChange={(event) => setOfferForm((current) => ({ ...current, note: event.target.value }))} maxLength="180" rows="3" required /></label>
            <div className="dialog-actions">
              <button type="button" className="cancel-button" onClick={() => setOfferDialog(null)}>BATAL</button>
              <button type="submit" className="confirm-button">KIRIM TAWARAN</button>
            </div>
          </form>
        </div>
      )}

      {showCompleteDialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowCompleteDialog(false)}>
          <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="complete-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="dialog-symbol">✓</span>
            <h2 id="complete-dialog-title">Selesaikan transaksi?</h2>
            <p>Chat langsung dikunci dan seluruh pesan akan dihapus otomatis setelah hitung mundur 30 detik.</p>
            <div className="dialog-actions">
              <button type="button" className="cancel-button" onClick={() => setShowCompleteDialog(false)}>BATAL</button>
              <button type="button" className="confirm-button" onClick={completeTransaction}>YA, SELESAIKAN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppCombined;
