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

function App() {
  const [activeRole, setActiveRole] = useState('client');
  const [chatState, setChatState] = useState(loadChatState);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const messagesEndRef = useRef(null);

  const activeUser = PARTICIPANTS[activeRole];
  const otherRole = activeRole === 'client' ? 'worker' : 'client';
  const otherUser = PARTICIPANTS[otherRole];
  const isActive = chatState.chatStatus === 'ACTIVE';
  const isRetention = chatState.chatStatus === 'RETENTION';
  const isDeleted = chatState.chatStatus === 'DELETED';
  const remainingRetention = isRetention ? Math.max(0, chatState.deleteAt - now) : 0;

  const messages = useMemo(
    () => [...chatState.messages].sort((a, b) => a.createdAt - b.createdAt),
    [chatState.messages],
  );

  useEffect(() => {
    saveChatState(chatState);
  }, [chatState]);

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

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !isActive) return;

    const message = {
      id: window.crypto?.randomUUID?.() || `message-${Date.now()}`,
      senderId: activeUser.id,
      text,
      createdAt: Date.now(),
      status: 'delivered',
    };

    setChatState((current) => ({
      ...current,
      messages: [...current.messages, message],
    }));
    setDraft('');
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
    setNow(Date.now());
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">PROTOTIPE FITUR 02</span>
          <h1>Chat Dalam Aplikasi</h1>
          <p>Komunikasi transaksi tanpa membuka nomor telepon.</p>
        </div>
        <img className="app-logo" src="/logo.jpg" alt="Logo Jawarga" />
      </header>

      <main>
        <section className="role-card fade-up">
          <div className="section-heading compact">
            <div>
              <span className="section-label">MODE PENGUJIAN</span>
              <h2>Lihat sebagai</h2>
            </div>
            <span className="demo-badge">DATA DUMMY</span>
          </div>
          <div className="role-switch" aria-label="Pilih perspektif pengguna">
            {Object.entries(PARTICIPANTS).map(([role, participant]) => (
              <button
                key={role}
                type="button"
                className={activeRole === role ? `role-button active ${role}` : 'role-button'}
                onClick={() => switchRole(role)}
              >
                <span className="role-avatar">{participant.initials}</span>
                <span>
                  <strong>{participant.roleLabel}</strong>
                  <small>{participant.name}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="quest-card fade-up delay-1">
          <div className="quest-topline">
            <span className="section-label">TRANSAKSI {QUEST.transactionCode}</span>
            <span className={isActive ? 'status-badge active' : isDeleted ? 'status-badge deleted' : 'status-badge completed'}>
              {isActive ? 'DIKERJAKAN' : 'SELESAI'}
            </span>
          </div>
          <h2>{QUEST.title}</h2>
          <p>{QUEST.location}</p>
          <div className="quest-meta">
            <span>Nilai transaksi</span>
            <strong>{formatRupiah(QUEST.reward)}</strong>
          </div>
          {activeRole === 'client' && isActive && (
            <button className="complete-button" type="button" onClick={() => setShowCompleteDialog(true)}>
              SELESAIKAN TRANSAKSI
            </button>
          )}
        </section>

        <section className="privacy-banner fade-up delay-2">
          <div className="privacy-icon"><ShieldIcon /></div>
          <div>
            <strong>Nomor telepon tetap tersembunyi</strong>
            <p>Klien dan Pekerja hanya melihat nama, peran, serta status verifikasi.</p>
          </div>
        </section>

        <section className="chat-card fade-up delay-3">
          <header className="chat-header">
            <div className={`contact-avatar ${otherRole}`}>{otherUser.initials}</div>
            <div className="contact-info">
              <strong>{otherUser.name}</strong>
              <span><i /> {otherUser.roleLabel} · Identitas terverifikasi</span>
            </div>
            <ChatIcon />
          </header>

          {isRetention && (
            <div className="retention-banner" role="status">
              <div>
                <span className="retention-label">CHAT DIKUNCI · AUTO-DELETE</span>
                <strong>{formatCountdown(remainingRetention)}</strong>
              </div>
              <p>Simulasi 30 detik ini mewakili masa retensi 30 hari pada produksi.</p>
            </div>
          )}

          {isDeleted ? (
            <div className="deleted-state">
              <div className="deleted-icon"><ShieldIcon /></div>
              <span className="status-badge deleted">RIWAYAT DIHAPUS</span>
              <h2>Pesan telah dihapus otomatis</h2>
              <p>Transaksi tetap tercatat, tetapi isi percakapan sudah tidak dapat diakses oleh kedua pihak.</p>
              <button type="button" className="reset-button" onClick={resetDemo}>ULANGI SIMULASI</button>
            </div>
          ) : (
            <>
              <div className="message-area" aria-live="polite">
                <div className="date-divider"><span>Hari ini</span></div>
                {messages.map((message) => {
                  const isOwn = message.senderId === activeUser.id;
                  return (
                    <div key={message.id} className={isOwn ? 'message-row own' : 'message-row'}>
                      <div className={isOwn ? 'message-bubble own' : 'message-bubble'}>
                        <p>{message.text}</p>
                        <div className="message-meta">
                          <time>{formatTime(message.createdAt)}</time>
                          {isOwn && <MessageStatus status={message.status} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {isActive ? (
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
                  <button type="submit" aria-label="Kirim pesan" disabled={!draft.trim()}>
                    <SendIcon />
                  </button>
                </form>
              ) : (
                <div className="locked-composer">
                  <ShieldIcon />
                  <span>Percakapan ditutup karena transaksi telah selesai.</span>
                </div>
              )}
            </>
          )}
        </section>

        {!isDeleted && (
          <aside className="prototype-note">
            <strong>Yang disimulasikan</strong>
            <p>Pertukaran perspektif, pengiriman pesan, tanda dibaca, penguncian percakapan, dan penghapusan otomatis tanpa database utama.</p>
          </aside>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navigasi prototipe">
        <button type="button">
          <span className="nav-symbol">⌂</span>
          <span>Quest</span>
        </button>
        <button type="button" className="active">
          <ChatIcon />
          <span>Chat</span>
        </button>
        <button type="button">
          <span className="nav-symbol">○</span>
          <span>Profil</span>
        </button>
      </nav>

      {showCompleteDialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowCompleteDialog(false)}>
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
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

export default App;
