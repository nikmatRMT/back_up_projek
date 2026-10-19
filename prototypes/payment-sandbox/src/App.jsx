import { useState } from 'react';

const USERS = {
  client: { name: 'Dita Rahmawati', label: 'Klien', initials: 'DR' },
  worker: { name: 'Arif Pratama', label: 'Pekerja', initials: 'AP' },
};

const QUEST = {
  code: 'JW-2408-021',
  title: 'Perbaiki engsel pintu dapur',
  amount: 40000,
  duration: '2 jam',
};

const METHODS = {
  qris: { label: 'QRIS Sandbox', hint: 'Pindai kode QR dummy', icon: '▦' },
  va: { label: 'Virtual Account', hint: 'Nomor VA dummy', icon: 'VA' },
  wallet: { label: 'E-Wallet Sandbox', hint: 'Akun dompet dummy', icon: '◉' },
};

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 2.9 8 7 10 4.1-2 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

function PaymentVisual({ method }) {
  if (method === 'qris') {
    return (
      <div className="qr-wrap">
        <div className="fake-qr" aria-label="Kode QR dummy">
          {Array.from({ length: 64 }, (_, index) => <i key={index} className={(index * 7 + index % 5) % 3 === 0 ? 'dark' : ''} />)}
        </div>
        <span>QR DUMMY · TIDAK DAPAT DIBAYAR</span>
      </div>
    );
  }
  if (method === 'va') {
    return <div className="payment-code"><span>NOMOR VIRTUAL ACCOUNT DUMMY</span><strong>8808 0000 2408 021</strong><small>Jangan transfer ke nomor ini</small></div>;
  }
  return <div className="payment-code"><span>AKUN E-WALLET DUMMY</span><strong>08•• •••• 0000</strong><small>Tidak terhubung ke penyedia asli</small></div>;
}

function App() {
  const [role, setRole] = useState('client');
  const [method, setMethod] = useState('qris');
  const [payment, setPayment] = useState({ status: 'UNPAID', reference: null, updatedAt: null });
  const [showGateway, setShowGateway] = useState(false);

  const activeUser = USERS[role];
  const isClient = role === 'client';

  const startPayment = () => {
    const reference = `SBX-${Date.now().toString().slice(-8)}`;
    setPayment({ status: 'PENDING', reference, updatedAt: Date.now() });
    setShowGateway(true);
  };

  const setOutcome = (status) => {
    setPayment((current) => ({ ...current, status, updatedAt: Date.now() }));
    setShowGateway(false);
  };

  const retry = () => {
    setPayment({ status: 'UNPAID', reference: null, updatedAt: null });
    setShowGateway(false);
  };

  const resetDemo = () => {
    setRole('client');
    setMethod('qris');
    setPayment({ status: 'UNPAID', reference: null, updatedAt: null });
    setShowGateway(false);
  };

  const statusText = {
    UNPAID: 'BELUM DIBAYAR',
    PENDING: 'MENUNGGU PEMBAYARAN',
    PAID: 'PEMBAYARAN BERHASIL',
    FAILED: 'PEMBAYARAN GAGAL',
  }[payment.status];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">PROTOTIPE FITUR 05</span>
          <h1>Payment Sandbox</h1>
          <p>Simulasi pembayaran tanpa uang sungguhan.</p>
        </div>
        <img src="/logo.jpg" alt="Logo Jawarga" className="app-logo" />
      </header>

      <main>
        <section className="sandbox-banner fade-up">
          <div className="shield-box"><ShieldIcon /></div>
          <div><strong>Mode sandbox aktif</strong><p>Jangan masukkan rekening, PIN, OTP, atau data pembayaran asli.</p></div>
          <span>TEST</span>
        </section>

        <section className="role-card fade-up delay-1">
          <div className="section-heading">
            <div><span className="section-label">MODE PENGUJIAN</span><h2>Lihat sebagai</h2></div>
            <button type="button" className="reset-button" onClick={resetDemo}>RESET</button>
          </div>
          <div className="role-switch">
            {Object.entries(USERS).map(([key, user]) => (
              <button key={key} type="button" className={role === key ? `role-button active ${key}` : 'role-button'} onClick={() => setRole(key)}>
                <span>{user.initials}</span><span><strong>{user.label}</strong><small>{user.name}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="invoice-card fade-up delay-2">
          <div className="invoice-top">
            <div><span className="section-label">TAGIHAN QUEST {QUEST.code}</span><h2>{QUEST.title}</h2></div>
            <span className={`status-badge ${payment.status.toLowerCase()}`}>{statusText}</span>
          </div>
          <div className="agreement-row"><span>Kesepakatan</span><strong>{QUEST.duration}</strong></div>
          <div className="price-row"><span>Total pembayaran</span><strong>{formatRupiah(QUEST.amount)}</strong></div>
          <p>Nominal berasal dari penawaran yang telah disepakati di dalam chat.</p>
        </section>

        {payment.status === 'UNPAID' && isClient && (
          <section className="payment-card fade-up delay-3">
            <span className="section-label">PILIH METODE PEMBAYARAN</span>
            <h2>Bayar dengan</h2>
            <div className="method-list">
              {Object.entries(METHODS).map(([key, item]) => (
                <button key={key} type="button" className={method === key ? 'method-button selected' : 'method-button'} onClick={() => setMethod(key)}>
                  <span className="method-icon">{item.icon}</span>
                  <span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  <i>{method === key ? '✓' : ''}</i>
                </button>
              ))}
            </div>
            <div className="total-line"><span>Jumlah</span><strong>{formatRupiah(QUEST.amount)}</strong></div>
            <button type="button" className="primary-button" onClick={startPayment}>LANJUTKAN PEMBAYARAN</button>
          </section>
        )}

        {payment.status === 'UNPAID' && !isClient && (
          <section className="state-card waiting fade-up">
            <div className="state-icon">⌛</div>
            <span className="status-badge unpaid">BELUM DIBAYAR</span>
            <h2>Menunggu pembayaran Klien</h2>
            <p>Pekerja hanya dapat melihat status. Metode dan proses pembayaran dikendalikan oleh Klien.</p>
          </section>
        )}

        {payment.status === 'PENDING' && (
          <section className="state-card pending fade-up">
            <div className="state-icon pulse">⌛</div>
            <span className="status-badge pending">MENUNGGU PEMBAYARAN</span>
            <h2>{isClient ? 'Pembayaran belum dikonfirmasi' : 'Klien sedang melakukan pembayaran'}</h2>
            <p>Referensi sandbox: <strong>{payment.reference}</strong>. Tidak ada dana yang benar-benar diproses.</p>
            {isClient && <button type="button" className="primary-button" onClick={() => setShowGateway(true)}>BUKA SIMULASI PEMBAYARAN</button>}
          </section>
        )}

        {payment.status === 'FAILED' && (
          <section className="state-card failed fade-up">
            <div className="state-icon">!</div>
            <span className="status-badge failed">PEMBAYARAN GAGAL</span>
            <h2>Transaksi sandbox tidak berhasil</h2>
            <p>{isClient ? 'Tidak ada dana yang terpotong. Silakan pilih metode dan coba kembali.' : 'Klien perlu mengulangi pembayaran. Quest belum dinyatakan lunas.'}</p>
            {isClient && <button type="button" className="primary-button" onClick={retry}>COBA LAGI</button>}
          </section>
        )}

        {payment.status === 'PAID' && (
          <section className="receipt-card fade-up">
            <div className="receipt-icon"><ReceiptIcon /></div>
            <span className="status-badge paid">PEMBAYARAN BERHASIL</span>
            <h2>{isClient ? 'Pembayaran telah dikonfirmasi' : 'Quest telah dibayar Klien'}</h2>
            <p>Ini adalah kuitansi simulasi. Tidak ada pencairan dana sungguhan kepada Pekerja.</p>
            <div className="receipt-detail">
              <span>Referensi</span><strong>{payment.reference}</strong>
              <span>Metode</span><strong>{METHODS[method].label}</strong>
              <span>Waktu simulasi</span><strong>{formatDate(payment.updatedAt)}</strong>
              <span>Total</span><strong>{formatRupiah(QUEST.amount)}</strong>
            </div>
            <div className="paid-notice"><ShieldIcon /><span>Status pembayaran dapat dilihat oleh Klien dan Pekerja tanpa membagikan data rekening.</span></div>
            <button type="button" className="secondary-button" onClick={resetDemo}>ULANGI SIMULASI</button>
          </section>
        )}

        <aside className="prototype-note">
          <strong>Batas prototype</strong>
          <p>Hanya menguji alur checkout dan perubahan status. Integrasi produksi memerlukan akun merchant, webhook tervalidasi, keamanan server, rekonsiliasi, serta kebijakan pengembalian dana.</p>
        </aside>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi prototipe">
        <button type="button"><span>⌂</span><small>Quest</small></button>
        <button type="button" className="active"><span>Rp</span><small>Pembayaran</small></button>
        <button type="button"><span>○</span><small>Profil</small></button>
      </nav>

      {showGateway && (
        <div className="gateway-backdrop" role="presentation" onMouseDown={() => setShowGateway(false)}>
          <section className="gateway-sheet" role="dialog" aria-modal="true" aria-labelledby="gateway-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="gateway-handle" />
            <div className="gateway-heading">
              <div><span className="section-label">SANDBOX PROVIDER</span><h2 id="gateway-title">{METHODS[method].label}</h2></div>
              <button type="button" onClick={() => setShowGateway(false)} aria-label="Tutup">×</button>
            </div>
            <PaymentVisual method={method} />
            <div className="gateway-amount"><span>Total simulasi</span><strong>{formatRupiah(QUEST.amount)}</strong></div>
            <p className="gateway-help">Pilih hasil di bawah untuk menyimulasikan respons webhook dari payment gateway.</p>
            <div className="outcome-buttons">
              <button type="button" className="success" onClick={() => setOutcome('PAID')}>SIMULASIKAN BERHASIL</button>
              <button type="button" className="pending-outcome" onClick={() => setOutcome('PENDING')}>BIARKAN TERTUNDA</button>
              <button type="button" className="failure" onClick={() => setOutcome('FAILED')}>SIMULASIKAN GAGAL</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
