import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function LengkapiProfil() {
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate('/beranda');
    };

    return (
        <div className="fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 24px', backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
            
            <div style={{ marginTop: '8vh', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 20px', width: 'fit-content' }}>
                    <Logo size={64} />
                </div>
                
                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, var(--text-heading-sm))', marginBottom: '16px' }}>
                    Tinggal Satu Langkah Lagi!
                </h1>
                
                <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', lineHeight: '1.6', textAlign: 'left', marginBottom: '32px' }}>
                    Halo, <strong style={{ color: 'var(--text-main)' }}>Budi</strong> (budi.s@gmail.com). Untuk menjaga keamanan warga Guntung Paikat dari akun fiktif, kami memerlukan nomor WhatsApp aktif Anda. <strong style={{ color: 'var(--text-main)' }}>Satu nomor hanya dapat digunakan untuk satu akun.</strong>
                </p>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <label className="form-label" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        NOMOR WHATSAPP
                    </label>
                    <div style={{ display: 'flex', border: '2px solid var(--border-ink)', borderRadius: 'var(--radius-small)', overflow: 'hidden', backgroundColor: 'var(--surface)', marginBottom: '12px' }}>
                        <div style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-main)', padding: '13px 16px', fontWeight: '700', fontSize: 'var(--text-body-sm)', borderRight: '2px solid var(--border-ink)' }}>
                            +62
                        </div>
                        <input 
                            type="tel" 
                            placeholder="81234567890" 
                            style={{ flex: 1, border: 'none', padding: '13px 16px', fontSize: 'var(--text-body-sm)', outline: 'none', fontFamily: 'var(--font-inter)', color: 'var(--text-main)' }}
                            required
                            id="lengkapi-whatsapp"
                        />
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '32px', lineHeight: '1.5' }}>
                        Pastikan nomor ini aktif. Pekerja akan menghubungi Anda via nomor ini saat mengerjakan tugas.
                    </p>

                    <button type="submit" className="btn btn-primary" id="lengkapi-submit">
                        Simpan & Masuk Aplikasi
                    </button>
                </form>
            </div>
            
        </div>
    );
}
