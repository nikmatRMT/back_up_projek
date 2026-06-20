import toast from 'react-hot-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';

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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/auth/register', formData);
            if (res.data.success) {
                // Hapus mode tamu dan dummy
                localStorage.removeItem('guestMode');
                localStorage.removeItem('dummyUserId');
                
                // Simpan token dan data user asli
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('myUserId', res.data.user.id);
                localStorage.setItem('userRole', res.data.user.role);
                
                // Set default authorization header untuk request selanjutnya
                axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
                
                toast.error('Pendaftaran berhasil! Mengalihkan ke halaman utama...');
                
                // Arahkan berdasarkan role pengguna
                if (res.data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/beranda');
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
            </div>

            {/* Form Card */}
            <div className="fade-up delay-1 clean-card" style={{ padding: '24px' }}>
                
                {error && (
                    <div className="error-box" style={{ marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

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
                        {isLoading ? 'Memproses...' : 'DAFTAR SEKARANG'}
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
