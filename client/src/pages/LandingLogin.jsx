import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';

export default function LandingLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/auth/login', { email, password });
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
                
                // Arahkan berdasarkan role pengguna
                if (res.data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/beranda');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat login.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuest = () => {
        localStorage.setItem('guestMode', 'true');
        navigate('/beranda');
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 24px', backgroundColor: 'var(--bg-main)' }}>
            
            {/* Hero / Branding Area */}
            <div className="fade-up" style={{ marginTop: '6vh', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 20px', width: 'fit-content' }}>
                    <Logo size={64} />
                </div>
                
                <h1 style={{ fontSize: 'clamp(2rem, 8vw, 2.8rem)', letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '8px' }}>
                    Jasa Warga
                </h1>
                <p style={{ color: 'var(--text-main)', fontWeight: '500', fontSize: 'var(--text-subheading)' }}>
                    Kelurahan Guntung Paikat
                </p>
                <p style={{ marginTop: '12px', fontSize: '14px', padding: '0 16px', color: 'var(--text-muted)', lineHeight: '1.55' }}>
                    Masuk ke akun Anda untuk mulai meminta atau memberikan bantuan.
                </p>
            </div>

            {/* Login Form Card */}
            <div className="fade-up delay-2" style={{ marginTop: 'auto', marginBottom: '24px' }}>
                <div className="clean-card" style={{ padding: '24px' }}>
                    
                    {error && (
                        <div className="error-box" style={{ marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="form-input"
                                placeholder="contoh@email.com"
                                id="login-email"
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Kata Sandi</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="form-input"
                                placeholder="Masukkan kata sandi"
                                id="login-password"
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={isLoading}
                            id="login-submit"
                        >
                            {isLoading ? 'Memproses...' : 'MASUK'}
                        </button>
                    </form>
                    
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Belum punya akun?{' '}
                            <span 
                                onClick={() => navigate('/register')} 
                                style={{ color: 'var(--accent-green)', fontWeight: '700', cursor: 'pointer', borderBottom: '2px solid var(--accent-green)' }}
                            >
                                Daftar Sekarang
                            </span>
                        </p>
                    </div>

                    <hr className="divider-mist" style={{ margin: '20px 0' }} />
                    
                    <button 
                        className="btn btn-outline" 
                        onClick={handleGuest}
                        id="login-guest"
                    >
                        Masuk sebagai Tamu (Lihat-lihat dulu)
                    </button>
                    
                </div>
            </div>

            {/* Footer accent */}
            <div style={{ 
                backgroundColor: 'var(--accent-yellow)', 
                margin: '0 -24px -32px',
                padding: '14px 24px',
                textAlign: 'center',
                borderTop: '2px solid var(--border-ink)'
            }}>
                <p style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '500' }}>
                    Aplikasi Skripsi — Layanan Jasa Berbasis Proximity
                </p>
            </div>
            
        </div>
    );
}
