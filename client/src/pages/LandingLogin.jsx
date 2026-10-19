import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logo from '../components/Logo';
import { saveStorageItem, removeStorageItem } from '../utils/storageHelper';
import { KeyRound } from 'lucide-react';

export default function LandingLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    // Cek sesi aktif saat pertama kali dibuka untuk auto-redirect
    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');
        const guestMode = localStorage.getItem('guestMode') === 'true';

        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (role === 'admin') {
                navigate('/admin', { replace: true });
            } else {
                navigate('/beranda', { replace: true });
            }
        } else if (guestMode) {
            navigate('/beranda', { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/auth/login', { email, password });
            if (res.data.success) {
                // Hapus mode tamu dan dummy
                await removeStorageItem('guestMode');
                await removeStorageItem('dummyUserId');

                // Simpan email terakhir untuk mempermudah login berikutnya
                await saveStorageItem('rememberedEmail', email);

                // Simpan token dan data user asli
                await saveStorageItem('token', res.data.token);
                await saveStorageItem('myUserId', res.data.user.id);
                await saveStorageItem('userRole', res.data.user.role);
                await saveStorageItem('userName', res.data.user.nama_lengkap);

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

    const handleForgotSubmit = (e) => {
        e.preventDefault();
        if (!forgotEmail) return;
        
        const adminWhatsapp = '6281250066701'; 
        const messageText = `Halo Admin Jasa Warga, saya lupa password untuk akun dengan email: ${forgotEmail}. Mohon bantuan untuk melakukan reset password.`;
        const waUrl = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(messageText)}`;
        
        setShowForgotModal(false);
        setForgotEmail('');
        window.open(waUrl, '_blank');
    };

    const handleGuest = async () => {
        await saveStorageItem('guestMode', 'true');
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
                            {email.length > 0 && !email.includes('@') && (
                                <div className="speech-bubble" style={{ color: '#EF4444', display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                    <span>Format email salah! Harap sertakan simbol '@' (contoh: nama@email.com).</span>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Kata Sandi</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="form-input"
                                    placeholder="Masukkan kata sandi"
                                    id="login-password"
                                    style={{ paddingRight: '48px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                    }}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                            {password.length > 0 && password.length < 6 && (
                                <div className="speech-bubble" style={{ color: '#EF4444', display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                    <span>Kata sandi terlalu pendek! Minimal adalah 6 karakter.</span>
                                </div>
                            )}
                            <div style={{ textAlign: 'right', marginTop: '8px' }}>
                                <span 
                                    onClick={() => setShowForgotModal(true)}
                                    style={{ fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Lupa Password?
                                </span>
                            </div>
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

            {/* Modal Lupa Password */}
            {showForgotModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="clean-card" style={{
                        backgroundColor: 'var(--color-pure-white)', width: '100%', maxWidth: '340px',
                        padding: '24px', position: 'relative', textAlign: 'center', border: '3px solid var(--color-ink-black)',
                        boxShadow: 'var(--shadow-card, 6px 6px 0px #000)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-sandstone)', border: '2.5px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0 var(--border-ink)' }}>
                                <KeyRound size={30} strokeWidth={2.4} color="var(--color-ink-black)" />
                            </div>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '8px', color: 'var(--color-ink-black)', fontFamily: 'var(--font-outfit)' }}>LUPA PASSWORD?</h2>
                        <p style={{ fontSize: '13px', color: 'var(--color-stone-gray)', marginBottom: '16px', lineHeight: '1.5', fontFamily: 'var(--font-inter)' }}>
                            Masukkan email terdaftar Anda. Kami akan mengarahkan Anda ke WhatsApp Admin untuk memverifikasi dan melakukan reset sandi.
                        </p>
                        <form onSubmit={handleForgotSubmit}>
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                                placeholder="Masukkan email terdaftar"
                                className="form-input"
                                style={{ marginBottom: '16px', textAlign: 'center' }}
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => { setShowForgotModal(false); setForgotEmail(''); }} style={{
                                    flex: 1, backgroundColor: 'var(--color-pure-white)', border: '2px solid var(--color-ink-black)', margin: 0, padding: '10px', fontWeight: '700', cursor: 'pointer', borderRadius: '50px'
                                }}>
                                    BATAL
                                </button>
                                <button type="submit" style={{
                                    flex: 1, backgroundColor: 'var(--accent-green, #10B981)', color: 'white', border: '2px solid var(--color-ink-black)', margin: 0, padding: '10px', fontWeight: '700', cursor: 'pointer', borderRadius: '50px', boxShadow: '2px 2px 0px var(--color-ink-black)'
                                }}>
                                    KIRIM WA
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
