import { useNavigate } from 'react-router-dom';

/**
 * BottomNav — Floating white pill navigation bar (MindMarket style)
 * 
 * Props:
 *   activePage: 'beranda' | 'tugas' | 'profil'
 */
export default function BottomNav({ activePage = 'beranda' }) {
    const navigate = useNavigate();

    const items = [
        {
            key: 'beranda',
            label: 'Beranda',
            path: '/beranda',
            icon: (active) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-fresh-grass)' : 'none'} stroke={active ? 'var(--color-ink-black)' : 'var(--color-stone-gray)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            )
        },
        {
            key: 'tugas',
            label: 'Tugas Aktif',
            path: '/detail-tugas',
            icon: (active) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-fresh-grass)' : 'none'} stroke={active ? 'var(--color-ink-black)' : 'var(--color-stone-gray)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            )
        },
        {
            key: 'profil',
            label: 'Profil',
            path: '/profil',
            icon: (active) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-fresh-grass)' : 'none'} stroke={active ? 'var(--color-ink-black)' : 'var(--color-stone-gray)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            )
        }
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '400px',
            background: 'var(--color-pure-white)',
            border: '2px solid var(--color-ink-black)',
            borderRadius: '50px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '10px 0',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
            zIndex: 100
        }}>
            {items.map((item) => {
                const isActive = activePage === item.key;
                return (
                    <div
                        key={item.key}
                        onClick={() => navigate(item.path)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease',
                            transform: isActive ? 'scale(1.05)' : 'scale(1)'
                        }}
                    >
                        {item.icon(isActive)}
                        <span style={{
                            fontSize: '11px',
                            fontWeight: isActive ? '700' : '500',
                            color: isActive ? 'var(--color-ink-black)' : 'var(--color-stone-gray)',
                            letterSpacing: '0.02em'
                        }}>
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </nav>
    );
}
