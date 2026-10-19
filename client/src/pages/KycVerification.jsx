import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { ShieldCheck } from 'lucide-react';

export default function KycVerification() {
    const navigate = useNavigate();
    const location = useLocation();
    const fromRegistration = location.state?.fromRegistration === true;
    const [status, setStatus] = useState('UNVERIFIED');
    const [reason, setReason] = useState('');
    const [accountName, setAccountName] = useState('');
    const [form, setForm] = useState({ nik: '', name: '', address: '' });
    const [documentFile, setDocumentFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/kyc/status').then(({ data }) => { setStatus(data.data.kyc_status); setReason(data.data.kyc_rejection_reason || ''); setAccountName(data.data.nama_lengkap || ''); }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const changeDocument = (event) => {
        const file = event.target.files?.[0] || null;
        if (file && file.size > 3 * 1024 * 1024) {
            toast.error('Ukuran foto KTP maksimal 3 MB. Gunakan foto yang lebih kecil.');
            event.target.value = '';
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setDocumentFile(file);
        setPreviewUrl(file ? URL.createObjectURL(file) : '');
    };

    const readDocumentAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Foto KTP tidak dapat dibaca.'));
        reader.readAsDataURL(file);
    });

    const verify = async () => {
        if (form.nik.length !== 16) return toast.error('NIK harus terdiri dari 16 digit.');
        if (!form.name.trim() || !form.address.trim()) return toast.error('Nama dan alamat KTP wajib diisi.');
        if (!documentFile) return toast.error('Ambil atau unggah foto KTP terlebih dahulu.');
        if (!consent) return toast.error('Centang persetujuan penggunaan data contoh.');
        setLoading(true);
        try {
            const documentImage = await readDocumentAsDataUrl(documentFile);
            const { data } = await axios.post('/api/kyc/verify', {
                nik: form.nik,
                name: form.name,
                address: form.address,
                document_image: documentImage
            });
            setStatus(data.data.kyc_status);
            setReason(data.data.kyc_rejection_reason || '');
            if (data.data.kyc_status === 'VERIFIED') toast.success('Identitas berhasil diverifikasi.');
            else toast.error('Verifikasi ditolak. Periksa kembali data KTP.');
        } catch (error) { toast.error(error.response?.data?.message || 'Verifikasi gagal.'); }
        finally { setLoading(false); }
    };

    return <><div className="revision-page"><header className="revision-header"><button onClick={() => navigate(fromRegistration ? '/beranda' : '/profil')}>←</button><div><span>{fromRegistration ? 'LANGKAH 2 DARI 2' : 'VERIFIKASI AKUN'}</span><h1>Verifikasi Identitas</h1></div><i style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={24} strokeWidth={2.4} color="var(--color-ink-black)" /></i></header><main className="revision-main">
        <div className="kyc-warning"><strong>Gunakan identitas contoh untuk pengujian</strong><p>Data contoh dan foto KTP disimpan agar dapat diperiksa melalui panel Administrator proyek ini.</p></div>
        {loading ? <div className="revision-center">Memeriksa status…</div> : status === 'VERIFIED' ? <section className="revision-result success"><span>✓</span><em>IDENTITAS TERVERIFIKASI</em><h2>Akun dapat membuat dan mengambil quest</h2><p>Data identitas telah sesuai dengan data akun.</p><button className="revision-primary" onClick={() => navigate('/beranda')}>MULAI GUNAKAN APLIKASI</button></section> : <form className="kyc-form" onSubmit={(event) => { event.preventDefault(); verify(); }}><span className="section-label">DATA IDENTITAS</span><h2>Isi sesuai KTP</h2>{status === 'REJECTED' && <div className="kyc-rejected">Ditolak: {reason}</div>}<label className="kyc-field">NIK<input inputMode="numeric" maxLength="16" value={form.nik} onChange={(event) => setForm({ ...form, nik: event.target.value.replace(/\D/g, '') })} placeholder="16 digit NIK" required /><small>{form.nik.length}/16 digit</small></label><label className="kyc-field">Nama lengkap sesuai KTP<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={`Contoh: ${accountName || 'Nama lengkap'}`} required /></label><label className="kyc-field">Alamat sesuai KTP<textarea rows="3" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Masukkan alamat lengkap" required /></label><label className="kyc-upload"><input type="file" accept="image/*" capture="environment" onChange={changeDocument} /><span>{previewUrl ? <img src={previewUrl} alt="Pratinjau KTP" /> : <b>▣</b>}</span><strong>{documentFile ? 'Ganti foto KTP' : 'Ambil / Unggah Foto KTP'}</strong><small>{documentFile ? documentFile.name : 'Pastikan seluruh bagian KTP terlihat jelas'}</small></label><label className="kyc-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Saya menyatakan data contoh yang dimasukkan boleh disimpan dan diperiksa oleh Administrator untuk pengujian.</span></label><button className="revision-primary" type="submit">KIRIM VERIFIKASI IDENTITAS</button></form>}
        <aside className="revision-note"><strong>Implementasi produksi</strong><p>Foto akan diproses oleh penyedia KYC resmi dengan OCR, pemeriksaan keaslian, dan persetujuan perlindungan data.</p></aside>
    </main></div><BottomNav activePage="profil" /></>;
}
