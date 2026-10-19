import { useEffect, useState } from 'react';

const INITIAL_FORM = {
  nik: '6372000000000000',
  name: 'SARI PENGGUNA DUMMY',
  birthPlace: 'BANJARBARU',
  birthDate: '1998-03-05',
};

const SAMPLES = {
  clear: {
    label: 'KTP dummy jelas',
    description: 'Data terbaca dan seluruh bagian kartu terlihat.',
    tag: 'SKENARIO LOLOS',
  },
  blurry: {
    label: 'KTP dummy buram',
    description: 'Foto tidak fokus dan NIK sulit terbaca.',
    tag: 'SKENARIO DITOLAK',
  },
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 2.9 8 7 10 4.1-2 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function IdIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M5.5 16c.7-1.7 4.3-1.7 5 0M13 9h5M13 12h5M13 15h3" />
    </svg>
  );
}

function DummyKtp({ variant, form }) {
  return (
    <div className={`dummy-ktp ${variant === 'blurry' ? 'blurry' : ''}`}>
      <div className="watermark">DUMMY · BUKAN DOKUMEN ASLI</div>
      <div className="ktp-title">PROVINSI KALIMANTAN SELATAN</div>
      <div className="ktp-subtitle">KOTA BANJARBARU</div>
      <div className="ktp-body">
        <div className="ktp-data">
          <strong>NIK : {form.nik}</strong>
          <span>Nama : {form.name}</span>
          <span>Tempat/Tgl Lahir : {form.birthPlace}, 05-03-1998</span>
          <span>Alamat : JL. CONTOH DATA DUMMY</span>
          <span>Kel/Desa : GUNTUNG PAIKAT</span>
        </div>
        <div className="dummy-photo"><span>SD</span><small>FOTO<br />DUMMY</small></div>
      </div>
    </div>
  );
}

function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedSample, setSelectedSample] = useState(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('FORM');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'REVIEWING') return undefined;
    const timer = window.setTimeout(() => {
      setStatus(selectedSample === 'clear' ? 'VERIFIED' : 'REJECTED');
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [selectedSample, status]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const submitVerification = (event) => {
    event.preventDefault();
    if (!/^\d{16}$/.test(form.nik)) {
      setError('NIK dummy harus terdiri dari 16 digit.');
      return;
    }
    if (!form.name.trim() || !form.birthPlace.trim() || !form.birthDate) {
      setError('Lengkapi seluruh data identitas dummy.');
      return;
    }
    if (!selectedSample) {
      setError('Pilih salah satu dokumen KTP dummy.');
      return;
    }
    if (!consent) {
      setError('Persetujuan simulasi harus dicentang.');
      return;
    }
    setError('');
    setStatus('REVIEWING');
  };

  const resetDemo = () => {
    setForm(INITIAL_FORM);
    setSelectedSample(null);
    setConsent(false);
    setStatus('FORM');
    setError('');
  };

  const retry = () => {
    setSelectedSample(null);
    setConsent(false);
    setStatus('FORM');
    setError('');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">PROTOTIPE FITUR 04</span>
          <h1>Verifikasi Identitas</h1>
          <p>Simulasi KYC aman dengan data dummy.</p>
        </div>
        <img src="/logo.jpg" alt="Logo Jawarga" className="app-logo" />
      </header>

      <main>
        <section className="safety-banner fade-up">
          <div className="safety-icon"><ShieldIcon /></div>
          <div>
            <strong>Jangan unggah KTP asli</strong>
            <p>Prototype ini hanya menggunakan dokumen contoh. Tidak ada data yang dikirim ke server atau database.</p>
          </div>
        </section>

        <section className="progress-card fade-up delay-1">
          <span className="section-label">STATUS VERIFIKASI</span>
          <div className="progress-steps">
            <div className="done"><b>1</b><span>Data</span></div>
            <i className={status !== 'FORM' ? 'done' : ''} />
            <div className={status !== 'FORM' ? 'done' : ''}><b>2</b><span>Periksa</span></div>
            <i className={status === 'VERIFIED' ? 'done' : ''} />
            <div className={status === 'VERIFIED' ? 'done' : ''}><b>3</b><span>Selesai</span></div>
          </div>
        </section>

        {status === 'FORM' && (
          <form className="kyc-card fade-up delay-2" onSubmit={submitVerification}>
            <div className="card-heading">
              <div><span className="section-label">01 · DATA IDENTITAS</span><h2>Isi data dummy</h2></div>
              <span className="dummy-badge">DATA DUMMY</span>
            </div>

            <div className="form-grid">
              <label className="wide"><span>NIK dummy</span><input inputMode="numeric" maxLength="16" value={form.nik} onChange={(event) => updateField('nik', event.target.value.replace(/\D/g, ''))} /></label>
              <label className="wide"><span>Nama lengkap</span><input value={form.name} onChange={(event) => updateField('name', event.target.value)} /></label>
              <label><span>Tempat lahir</span><input value={form.birthPlace} onChange={(event) => updateField('birthPlace', event.target.value)} /></label>
              <label><span>Tanggal lahir</span><input type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} /></label>
            </div>

            <div className="document-section">
              <span className="section-label">02 · DOKUMEN CONTOH</span>
              <h2>Pilih skenario KTP</h2>
              <div className="sample-options">
                {Object.entries(SAMPLES).map(([key, sample]) => (
                  <button key={key} type="button" className={selectedSample === key ? `sample-button selected ${key}` : `sample-button ${key}`} onClick={() => { setSelectedSample(key); setError(''); }}>
                    <span className="sample-icon"><IdIcon /></span>
                    <span><strong>{sample.label}</strong><small>{sample.description}</small><em>{sample.tag}</em></span>
                  </button>
                ))}
              </div>
            </div>

            {selectedSample && (
              <div className="preview-block">
                <div className="preview-heading"><span>PRATINJAU DOKUMEN</span><strong>{SAMPLES[selectedSample].label}</strong></div>
                <DummyKtp variant={selectedSample} form={form} />
              </div>
            )}

            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(''); }} />
              <span>Saya memahami bahwa seluruh data dalam simulasi ini bukan identitas asli.</span>
            </label>

            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="submit-button" type="submit">KIRIM UNTUK DIPERIKSA</button>
          </form>
        )}

        {status === 'REVIEWING' && (
          <section className="result-card reviewing fade-up" aria-live="polite">
            <div className="scan-animation"><IdIcon /><i /></div>
            <span className="status-pill reviewing">SEDANG DIPERIKSA</span>
            <h2>Memeriksa dokumen dummy…</h2>
            <p>Sistem menyimulasikan pemeriksaan keterbacaan dokumen dan kecocokan data.</p>
            <div className="review-list"><span>Format identitas</span><span>Keterbacaan KTP</span><span>Kecocokan data</span></div>
          </section>
        )}

        {status === 'VERIFIED' && (
          <section className="result-card verified fade-up">
            <div className="result-icon"><ShieldIcon /></div>
            <span className="status-pill verified">IDENTITAS TERVERIFIKASI</span>
            <h2>Akun dummy berhasil diverifikasi</h2>
            <p>Pengguna sekarang memperoleh badge terverifikasi dan dapat mengakses fitur transaksi.</p>
            <div className="profile-result">
              <div className="avatar">SP</div>
              <div><strong>Sari Pengguna Dummy <span>✓</span></strong><small>Identitas terverifikasi · Simulasi</small></div>
            </div>
            <div className="result-summary"><span>NIK tersamarkan</span><strong>6372••••••••0000</strong><span>Status dokumen</span><strong>Valid · Dummy</strong></div>
            <button className="secondary-button" type="button" onClick={resetDemo}>ULANGI SIMULASI</button>
          </section>
        )}

        {status === 'REJECTED' && (
          <section className="result-card rejected fade-up">
            <div className="result-icon">!</div>
            <span className="status-pill rejected">VERIFIKASI DITOLAK</span>
            <h2>Dokumen tidak dapat dibaca</h2>
            <p>Pengguna diminta mengulangi pengajuan tanpa membuat akun langsung diblokir.</p>
            <div className="rejection-reasons"><strong>Alasan penolakan</strong><span>Foto KTP terlalu buram</span><span>Nomor identitas tidak terbaca jelas</span></div>
            <button className="submit-button" type="button" onClick={retry}>COBA DOKUMEN LAIN</button>
          </section>
        )}

        <aside className="privacy-note">
          <strong>Catatan implementasi produksi</strong>
          <p>Dokumen asli nantinya memerlukan enkripsi, pembatasan akses, kebijakan retensi, persetujuan pengguna, serta penyedia verifikasi yang sah. Prototype ini tidak melakukan proses tersebut.</p>
        </aside>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi prototipe">
        <button type="button"><span>⌂</span><small>Quest</small></button>
        <button type="button"><span>○</span><small>Aktivitas</small></button>
        <button type="button" className="active"><ShieldIcon /><small>Verifikasi</small></button>
      </nav>
    </div>
  );
}

export default App;
