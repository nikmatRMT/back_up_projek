import toast from 'react-hot-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import { saveStorageItem, removeStorageItem } from '../utils/storageHelper';
import { ShieldCheck } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nama_lengkap: '',
        email: '',
        no_whatsapp: '',
        password: '',
        role: 'user'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'no_whatsapp') {
            const cleanValue = value.replace(/[^0-9]/g, '');
            if (cleanValue.length <= 15) {
                setFormData({ ...formData, [name]: cleanValue });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/auth/register', formData);
            if (res.data.success) {
                // Hapus mode tamu dan dummy
                await removeStorageItem('guestMode');
                await removeStorageItem('dummyUserId');
                
                // Simpan token dan data user asli
                await saveStorageItem('token', res.data.token);
                await saveStorageItem('myUserId', res.data.user.id);
                await saveStorageItem('userRole', res.data.user.role);
                
                // Set default authorization header untuk request selanjutnya
                axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
                
                toast.success('Akun berhasil dibuat. Lanjutkan verifikasi identitas.');
                
                // Arahkan berdasarkan role pengguna
                if (res.data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/verifikasi-identitas', { replace: true, state: { fromRegistration: true } });
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mendaftar.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 24px', backgroundColor: 'var(--bg-main)' }}>
            
            {/* Header */}
            <div className="fade-up" style={{ marginTop: '2vh', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ margin: '0 auto 16px', width: 'fit-content' }}>
                    <Logo size={48} />
                </div>
                <h1 style={{ fontSize: 'var(--text-heading-sm)', marginBottom: '8px' }}>Buat Akun Baru</h1>
                <p style={{ fontSize: '14px' }}>Bergabunglah dengan komunitas Jasa Warga Guntung Paikat.</p>
                <div style={{ display: 'inline-flex', marginTop: '13px', padding: '6px 11px', background: 'var(--accent-yellow)', border: '1.5px solid var(--border-ink)', borderRadius: '999px', fontSize: '10px', fontWeight: '800' }}>LANGKAH 1 DARI 2 · DATA AKUN</div>
            </div>

            {/* Form Card */}
            <div className="fade-up delay-1 clean-card" style={{ padding: '24px' }}>
                
                {error && (
                    <div className="error-box" style={{ marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '17px', padding: '12px 13px', background: '#e5f6da', border: '1.5px solid var(--border-ink)', borderRadius: '13px', fontSize: '11px', lineHeight: '1.5' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <ShieldCheck size={15} strokeWidth={2.4} color="var(--color-ink-black)" />
                        Verifikasi identitas pada langkah berikutnya
                    </strong>
                    Setelah akun dibuat, Anda akan diarahkan untuk verifikasi KTP sebelum dapat mengambil atau mengerjakan quest.
                </div>

                <form onSubmit={handleRegister}>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="form-label">Nama Lengkap</label>
                        <input 
                            type="text" 
                            name="nama_lengkap"
                            value={formData.nama_lengkap}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="Contoh: Budi Santoso"
                            id="register-name"
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label className="form-label">Nomor WhatsApp Aktif</label>
                        <input 
                            type="text" 
                            name="no_whatsapp"
                            value={formData.no_whatsapp}
                            onChange={handleChange}
                            required
                            maxLength={15}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            className="form-input"
                            placeholder="Contoh: 08123456789"
                            id="register-whatsapp"
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Hanya digunakan untuk komunikasi dengan pengguna lain.</p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label className="form-label">Email</label>
                        <input 
                            type="email" 
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="form-input"
                            placeholder="contoh@email.com"
                            id="register-email"
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label className="form-label">Kata Sandi</label>
                        <input 
                            type="password" 
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength="6"
                            className="form-input"
                            placeholder="Minimal 6 karakter"
                            id="register-password"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={isLoading}
                        id="register-submit"
                    >
                        {isLoading ? 'Memproses...' : 'BUAT AKUN & LANJUT VERIFIKASI'}
                    </button>
                </form>
                
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        Sudah punya akun?{' '}
                        <span 
                            onClick={() => navigate('/login')} 
                            style={{ color: 'var(--accent-green)', fontWeight: '700', cursor: 'pointer', borderBottom: '2px solid var(--accent-green)' }}
                        >
                            Masuk di sini
                        </span>
                    </p>
                </div>
                
            </div>
            
        </div>
    );
}
