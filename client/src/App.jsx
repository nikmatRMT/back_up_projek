import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import axios from 'axios';
import { syncStorageToLocalStorage } from './utils/storageHelper';
import { initErrorReporter } from './utils/errorReporter';
import { Smartphone, ShieldCheck } from 'lucide-react';
import LandingLogin from './pages/LandingLogin';

// Inisialisasi pelaporan error remote secara langsung
initErrorReporter();
import LengkapiProfil from './pages/LengkapiProfil';
import Beranda from './pages/Beranda';
import BuatTugas from './pages/BuatTugas';
import DetailTugas from './pages/DetailTugas';
import AdminDashboard from './pages/AdminDashboard';
import Profil from './pages/Profil';
import Register from './pages/Register';
import Riwayat from './pages/Riwayat';
import ChatNegotiation from './pages/ChatNegotiation';
import KycVerification from './pages/KycVerification';
import PaymentQuest from './pages/PaymentQuest';
import 'leaflet/dist/leaflet.css';
import './index.css';
import './revisionFeatures.css';

// Atur base URL API untuk web/dev dan Android native
const isNativePlatform = Capacitor.isNativePlatform();
const hostedApiUrl = import.meta.env.VITE_API_URL || 'https://housting-for-skripsi.vercel.app';
axios.defaults.baseURL = isNativePlatform
  ? hostedApiUrl
  : (import.meta.env.VITE_API_URL || '');

function MobileOnlyWrapper({ children }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [bypass, setBypass] = useState(localStorage.getItem('bypassMobileBlock') === 'true');

  useEffect(() => {
    const checkPlatform = () => {
      const isNative = Capacitor.isNativePlatform();
      const isWideScreen = window.innerWidth > 768;
      setIsDesktop(!isNative && isWideScreen);
    };

    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  const handleBypass = () => {
    localStorage.setItem('bypassMobileBlock', 'true');
    setBypass(true);
  };

  if (isDesktop && !bypass) {
    return (
      <div style={{
        backgroundColor: 'var(--color-sandstone, #f7f4ed)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'var(--font-outfit, sans-serif)',
        color: 'var(--color-ink-black, #1e1e24)'
      }}>
        <div style={{
          backgroundColor: 'var(--surface, #ffffff)',
          border: '4px solid var(--border-ink, #1e1e24)',
          boxShadow: '8px 8px 0px var(--border-ink, #1e1e24)',
          borderRadius: 'var(--radius-small, 16px)',
          padding: '40px 30px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'var(--color-sandstone, #f7f4ed)', border: '3px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0 var(--border-ink)' }}>
              <Smartphone size={44} strokeWidth={2.2} color="var(--color-ink-black)" />
            </div>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>AKSES WEBSITE DIBATASI</h1>
          <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>
            Sesuai ketentuan keamanan sistem Jasa Warga, halaman Klien dan Pekerja **hanya dapat diakses melalui Aplikasi Mobile Android/iOS**.<br /><br />
            Halaman website ini khusus disediakan untuk panel kontrol **Administrator**.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a href="/login" style={{
              display: 'block',
              textDecoration: 'none',
              backgroundColor: 'var(--color-sunshine-pop, #ffb000)',
              color: 'var(--color-ink-black, #1e1e24)',
              border: '2px solid var(--border-ink, #1e1e24)',
              padding: '12px',
              borderRadius: '50px',
              fontWeight: '700',
              boxShadow: '2px 2px 0px var(--border-ink, #1e1e24)',
              cursor: 'pointer'
            }}>MASUK SEBAGAI ADMIN / GUEST</a>

            <button onClick={handleBypass} style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#3b82f6',
              textDecoration: 'underline',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}>Bypass untuk Uji Coba Sidang</button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function getDefaultRoute() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const guestMode = localStorage.getItem('guestMode') === 'true';

  if (token) {
    return role === 'admin' ? '/admin' : '/beranda';
  }

  if (guestMode) {
    return '/beranda';
  }

  return '/login';
}

function PublicOnlyRoute({ children }) {
  const defaultRoute = getDefaultRoute();
  if (defaultRoute !== '/login') {
    return <Navigate to={defaultRoute} replace />;
  }
  return children;
}

function RequireUserRoute({ children }) {
  const token = localStorage.getItem('token');
  const guestMode = localStorage.getItem('guestMode') === 'true';

  if (!token && !guestMode) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/beranda" replace />;
  }

  return children;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const listenerPromise = CapApp.addListener('backButton', () => {
      const currentPath = location.pathname;

      if (currentPath === '/beranda' || currentPath === '/login' || currentPath === '/admin') {
        CapApp.exitApp();
        return;
      }

      navigate(-1);
    });

    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [location.pathname, navigate]);

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text-main)',
          border: '2px solid var(--border-ink)',
          boxShadow: '4px 4px 0px var(--border-ink)',
          fontWeight: '600',
          borderRadius: 'var(--radius-small)'
        },
        success: { iconTheme: { primary: 'var(--accent-green)', secondary: 'var(--bg-main)' } },
        error: { iconTheme: { primary: 'var(--accent-coral)', secondary: 'var(--bg-main)' } }
      }} />
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="/login" element={<PublicOnlyRoute><LandingLogin /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/lengkapi-profil" element={<RequireUserRoute><LengkapiProfil /></RequireUserRoute>} />
        <Route path="/beranda" element={<RequireUserRoute><MobileOnlyWrapper><Beranda /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/buat-tugas" element={<RequireUserRoute><MobileOnlyWrapper><BuatTugas /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/detail-tugas" element={<RequireUserRoute><MobileOnlyWrapper><DetailTugas /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/admin" element={<RequireAdminRoute><AdminDashboard /></RequireAdminRoute>} />
        <Route path="/riwayat" element={<RequireUserRoute><MobileOnlyWrapper><Riwayat /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/profil" element={<RequireUserRoute><MobileOnlyWrapper><Profil /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/chat" element={<RequireUserRoute><MobileOnlyWrapper><ChatNegotiation /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/verifikasi-identitas" element={<RequireUserRoute><MobileOnlyWrapper><KycVerification /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="/pembayaran" element={<RequireUserRoute><MobileOnlyWrapper><PaymentQuest /></MobileOnlyWrapper></RequireUserRoute>} />
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    const initStorage = async () => {
      await syncStorageToLocalStorage();
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      setIsSynced(true);
    };
    initStorage();
  }, []);

  if (!isSynced) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-sandstone, #f7f4ed)',
        fontFamily: 'var(--font-outfit, sans-serif)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50px', backgroundColor: 'var(--accent-green, #10b981)', border: '2.5px solid var(--border-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0 var(--border-ink)' }}>
              <ShieldCheck size={36} strokeWidth={2.4} color="var(--color-ink-black)" />
            </div>
          </div>
          <div style={{ fontWeight: '700', color: 'var(--color-ink-black)' }}>Memuat Sesi Aman...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
