import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, logout } from './auth';
import DriverApp from './components/DriverApp';
import AdminDashboard from './components/AdminDashboard';
import TireTrackParticlesBg from './components/TireTrackParticlesBg';
import {
  Truck,
  Database,
  UserCheck,
  Building,
  Key,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Layout,
  Smartphone,
  Sparkles,
  LogOut,
  ChevronRight,
  UserCheck as UserIcon,
  Lock,
  ChevronDown
} from 'lucide-react';
import { Chofer } from './types';

function AppBackground({ googleToken, localDriver, localDriverToken }: { googleToken: string | null; localDriver: Chofer | null; localDriverToken: string | null }) {
  const location = useLocation();
  const showBackground =
    location.pathname === '/' ||
    location.pathname === '/chofer-login' ||
    (location.pathname === '/admin' && !googleToken) ||
    (location.pathname === '/chofer' && (!localDriver || !localDriverToken));

  if (!showBackground) return null;
  return <TireTrackParticlesBg />;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  // Authenticated state for local driver session
  const [localDriver, setLocalDriver] = useState<Chofer | null>(null);
  const [localDriverToken, setLocalDriverToken] = useState<string | null>(null);

  // Auto-restore token and sessions on launch
  useEffect(() => {
    // 1. Google OAuth
    initAuth(
      (user, token) => {
        setCurrentUser(user);
        setGoogleToken(token);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    // 2. Local driver session
    const savedDriver = localStorage.getItem('driver_session_user');
    const savedDriverToken = localStorage.getItem('driver_session_token');
    if (savedDriver && savedDriverToken) {
      try {
        setLocalDriver(JSON.parse(savedDriver));
        setLocalDriverToken(savedDriverToken);
      } catch (e) {
        // quiet clear
      }
    }
  }, []);

  const handleGoogleLogin = async (onSuccess?: () => void) => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setGoogleToken(res.accessToken);
        setNeedsAuth(false);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      alert('Error de conexión al autenticar con Google. Verifique los permisos y emergentes de su navegador.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setGoogleToken(null);
    setNeedsAuth(true);
    localStorage.removeItem('driver_session_user');
    localStorage.removeItem('driver_session_token');
    setLocalDriver(null);
    setLocalDriverToken(null);
  };

  const handleDriverLoginSuccess = (driver: Chofer, token: string) => {
    setLocalDriver(driver);
    setLocalDriverToken(token);
    localStorage.setItem('driver_session_user', JSON.stringify(driver));
    localStorage.setItem('driver_session_token', token);
  };

  const handleDriverLogout = () => {
    localStorage.removeItem('driver_session_user');
    localStorage.removeItem('driver_session_token');
    setLocalDriver(null);
    setLocalDriverToken(null);
  };

  return (
    <HashRouter>
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#0284c7] via-[#0b1b3d] to-[#020617] text-white font-sans selection:bg-emerald-500/30 selection:text-white overflow-x-hidden relative">
        <AppBackground googleToken={googleToken} localDriver={localDriver} localDriverToken={localDriverToken} />
        <Routes>
          {/* Main Select Portal Page */}
          <Route
            path="/"
            element={
              <PortalSelector
                currentUser={currentUser}
                googleToken={googleToken}
                onSignOut={handleGoogleSignOut}
                localDriver={localDriver}
              />
            }
          />

          {/* Chofer Local PIN Login Form */}
          <Route
            path="/chofer-login"
            element={
              <ChoferLoginForm
                onLoginSuccess={handleDriverLoginSuccess}
                googleToken={googleToken}
              />
            }
          />

          {/* Protected Route: Chofer Screen */}
          <Route
            path="/chofer"
            element={
              localDriver && localDriverToken ? (
                <div className="min-h-screen bg-transparent">
                  <DriverApp
                    token={localDriverToken}
                    onLogout={handleDriverLogout}
                    initialDriver={localDriver}
                  />
                </div>
              ) : (
                <Navigate to="/chofer-login" replace />
              )
            }
          />

          {/* Protected Route: Admin Console */}
          <Route
            path="/admin"
            element={
              googleToken ? (
                <AdminConsoleLayout
                  token={googleToken}
                  userEmail={currentUser?.email || 'Don Saúl (Sheets Público 24/7)'}
                  onSignOut={handleGoogleSignOut}
                />
              ) : (
                <AdminGoogleLoginGate
                  isLoggingIn={isLoggingIn}
                  onLogin={() => handleGoogleLogin()}
                  onBypass={() => setGoogleToken('anonymous-public-sheets-session')}
                />
              )
            }
          />

          {/* Fallback to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

// ==========================================
// PORTAL ROUTING COMPONENTS
// ==========================================

interface PortalSelectorProps {
  currentUser: User | null;
  googleToken: string | null;
  onSignOut: () => void;
  localDriver: Chofer | null;
}

function PortalSelector({ currentUser, googleToken, onSignOut, localDriver }: PortalSelectorProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      {/* Visual background ambient glow elements */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-900/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="max-w-2xl w-full backdrop-blur-[12px] bg-[#112240]/80 border border-[#233554]/50 rounded-[32px] p-6 sm:p-10 md:p-12 space-y-8 text-center relative shadow-2xl"
      >
        {/* Colorful top border highlight */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-blue-500 to-orange-500 rounded-t-[32px]"></div>

        <div className="flex items-center justify-between border-b border-[#233554]/50 pb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-100 uppercase">
              Plataforma de Logística
            </span>
          </div>
          {googleToken ? (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 border border-blue-900/40 px-2 py-0.5 rounded-md">
                Admin: {currentUser?.email?.split('@')[0]}
              </span>
              <button
                onClick={onSignOut}
                className="text-slate-100 hover:text-red-400 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Desconectar
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-100">
              Modo Cloud sin vincular
            </span>
          )}
        </div>

        <div className="space-y-3 flex flex-col items-center">
          <div className="w-36 h-16 relative bg-slate-950/60 border border-[#233554]/50 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner select-none mb-2">
            {/* Parallax moving ground line under the truck */}
            <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-slate-800 overflow-hidden opacity-40">
              <div className="w-[200%] h-full bg-transparent">
                <svg viewBox="0 0 100 2" className="w-full h-full text-blue-500" preserveAspectRatio="none">
                  <line x1="0" y1="1" x2="200" y2="1" stroke="currentColor" strokeWidth="1" strokeDasharray="3,6" />
                  <animateTransform 
                    attributeName="transform" 
                    type="translate" 
                    from="0 0" 
                    to="-50 0" 
                    dur="0.8s" 
                    repeatCount="indefinite" 
                  />
                </svg>
              </div>
            </div>

            {/* Scale-down Profile Truck SVG container */}
            <div className="w-24 h-12 relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <svg viewBox="-20 -15 38 23" className="w-full h-full" fill="none">
                {/* Underglow */}
                <rect x="-17" y="2" width="28" height="2" rx="1" fill="#00f2ff" opacity="0.45" />
                {/* Frame */}
                <rect x="-16.5" y="1" width="26.5" height="1.8" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* Trailer with custom brushed gradient */}
                <rect x="-17" y="-9.5" width="16" height="10.5" rx="0.5" fill="url(#logo_trailerGrad)" stroke="#475569" strokeWidth="0.8" />
                {[-15.2, -11.8, -8.4, -5.0, -1.6].map((rx, idx) => (
                  <line key={`logo-rib-${idx}`} x1={rx} y1="-9" x2={rx} y2="0.5" stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.3" />
                ))}
                
                {/* Blue-Orange striped design */}
                <rect x="-17" y="-5.5" width="16" height="1.6" fill="#0284c7" fillOpacity="0.9" />
                <rect x="-17" y="-4.2" width="16" height="0.4" fill="#f59e0b" fillOpacity="0.9" />
                
                {/* Deflector */}
                <path d="M -0.5,-9.5 C 1,-10.8 3,-10.8 4.2,-9.5 L 4.5,-8 L -0.5,-8 Z" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.5" />
                {/* Cabin */}
                <path d="M -1,-8 L 4.5,-8 C 6.5,-8 8.5,-4 10.5,-2 L 11.2,1.5 L 11.2,3 L -1,3 Z" fill="url(#logo_cabGrad)" stroke="#ef4444" strokeWidth="0.6" />
                {/* Side Window */}
                <path d="M 3.8,-7.2 L 6.8,-7.2 L 8.3,-4.2 L 3.8,-4.2 Z" fill="url(#logo_windowGrad)" stroke="#1e293b" strokeWidth="0.5" />
                {/* Fuel Tank */}
                <rect x="0.8" y="1.5" width="5.2" height="1.6" rx="0.8" fill="url(#logo_chromeGrad)" stroke="#475569" strokeWidth="0.3" />

                {/* Chimney Stack */}
                <rect x="-0.8" y="-12.5" width="0.8" height="9" rx="0.2" fill="url(#logo_chromeGrad)" stroke="#475569" strokeWidth="0.3" />
                
                {/* Exhaust puffs */}
                <circle cx="-0.4" cy="-13" r="0.8" fill="#38bdf8" fillOpacity="0.4">
                  <animate attributeName="r" values="0.8;3;4.5" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.35;0" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="cx" values="-0.4;-3;-6" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="-13;-15;-16.5" dur="1.2s" repeatCount="indefinite" />
                </circle>

                {/* Steer wheel */}
                <g transform="translate(8, 3.5)">
                  <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                  <circle cx="0" cy="0" r="1.1" fill="url(#logo_chromeGrad)" />
                  <g>
                    <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                    <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                  </g>
                </g>
                {/* Rear Wheels */}
                <g transform="translate(4, 3.5)">
                  <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                  <circle cx="0" cy="0" r="1.1" fill="url(#logo_chromeGrad)" />
                  <g>
                    <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                    <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                  </g>
                </g>
                <g transform="translate(-10.5, 3.5)">
                  <circle cx="0" cy="0" r="2.4" fill="#0f172a" stroke="#334155" strokeWidth="0.4" />
                  <circle cx="0" cy="0" r="1.1" fill="url(#logo_chromeGrad)" />
                  <g>
                    <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#334155" strokeWidth="0.3" />
                    <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#334155" strokeWidth="0.3" />
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite" />
                  </g>
                </g>

                <defs>
                  <linearGradient id="logo_cabGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#7f1d1d" />
                  </linearGradient>
                  <linearGradient id="logo_trailerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <linearGradient id="logo_chromeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <linearGradient id="logo_windowGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-sans">
            SL ROAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">TRUCKING</span>
          </h1>
          <p className="text-xs text-slate-100 max-w-md mx-auto leading-relaxed">
            Consola centralizada para el pesaje, bitácora de choferes, consumos de combustible y mantenimiento preventivo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
          {/* DRIVERS ENTRY PANEL */}
          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => navigate(localDriver ? '/chofer' : '/chofer-login')}
            className="group backdrop-blur-[6px] bg-[#0A192F]/70 hover:bg-[#0A192F]/95 border border-[#233554]/50 hover:border-orange-500/40 rounded-2xl p-6 space-y-4 shadow-xl text-left cursor-pointer focus:ring-2 focus:ring-orange-500 outline-none relative overflow-hidden"
          >
            {/* Ambient Background Glow Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition duration-500" />
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/25 inline-block relative">
                <Truck className="w-6 h-6 animate-[pulse_3s_infinite]" />
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
              </div>
              <div className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-[9px] text-orange-400 font-bold uppercase tracking-wider rounded">
                Ruta & Pesaje
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-white group-hover:text-orange-400 transition">
                    {localDriver ? `Volver como ${localDriver.nombre_completo}` : 'Portal Conductores'}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition transform group-hover:translate-x-1.5" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ingreso rápido de conductores para registrar bitácoras, consumo de combustible, pesajes de carga y alertas de viaje.
                </p>
              </div>

              {/* Micro actions preview for realistic application purpose */}
              <div className="pt-2 border-t border-[#233554]/40 flex flex-wrap gap-2 text-[9px] font-mono text-slate-400">
                <span className="flex items-center gap-1 bg-[#112240]/60 px-2 py-1 rounded border border-[#233554]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Combustible
                </span>
                <span className="flex items-center gap-1 bg-[#112240]/60 px-2 py-1 rounded border border-[#233554]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Pesajes
                </span>
                <span className="flex items-center gap-1 bg-[#112240]/60 px-2 py-1 rounded border border-[#233554]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Alertas Offline
                </span>
              </div>
            </div>
          </motion.button>

          {/* ADMIN ENTRY PANEL */}
          <motion.button
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => navigate('/admin')}
            className="group backdrop-blur-[6px] bg-[#0A192F]/70 hover:bg-[#0A192F]/95 border border-[#233554]/50 hover:border-blue-500/40 rounded-2xl p-6 space-y-4 shadow-xl text-left cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none relative overflow-hidden"
          >
            {/* Ambient Background Glow Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition duration-500" />

            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/25 inline-block relative">
                <Building className="w-6 h-6" />
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400"></span>
                </span>
              </div>
              <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wider rounded">
                Torre de Control
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white group-hover:text-blue-400 transition">
                    Administración
                  </h3>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition transform group-hover:translate-x-1.5" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Consola centralizada para el control de la flota, aprobaciones de depósitos, inventario de repuestos y analíticas en tiempo real.
                </p>
              </div>

              {/* Micro actions preview for realistic application purpose */}
              <div className="pt-2 border-t border-[#233554]/40 flex flex-wrap gap-2 text-[9px] font-mono text-slate-400">
                <span className="flex items-center gap-1 bg-[#112240]/60 px-2 py-1 rounded border border-[#233554]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  Inventarios
                </span>
                <span className="flex items-center gap-1 bg-[#112240]/60 px-2 py-1 rounded border border-[#233554]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  Presupuestos
                </span>
                <span className="flex items-center gap-1 bg-[#112240]/60 px-2 py-1 rounded border border-[#233554]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  Sincronización
                </span>
              </div>
            </div>
          </motion.button>
        </div>

        <div className="pt-2 flex flex-col items-center justify-center space-y-1 text-slate-100 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-emerald-500" />
            <span>Proxy de Caching con Node-Cache & Colas Síncronos</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// LOCAL CHOFER PIN LOGIN SCREEN
interface ChoferLoginFormProps {
  onLoginSuccess: (driver: Chofer, token: string) => void;
  googleToken: string | null;
}

function ChoferLoginForm({ onLoginSuccess, googleToken }: ChoferLoginFormProps) {
  const navigate = useNavigate();
  const [choferList, setChoferList] = useState<Chofer[]>(() => {
    // Try to recover from previous successful fetches stored in localStorage
    try {
      const saved = localStorage.getItem('fallback_choferes_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading fallback_choferes_cache:', e);
    }
    // Hardcoded active drivers fallback to ensure perfect robust operation
    return [
      { id_chofer: 'CH-01', nombre_completo: 'Juan Carlos Perez', telefono: '71234567', pin_acceso: '1234', estado: 'Activo', presupuesto: '10000', saldo_actual: '9470' },
      { id_chofer: 'CH-02', nombre_completo: 'Mario Gomez', telefono: '78912345', pin_acceso: '4321', estado: 'Activo', presupuesto: '10005', saldo_actual: '10005' },
      { id_chofer: 'CH-03', nombre_completo: 'Don Saúl', telefono: '77742345', pin_acceso: '1111', estado: 'Activo', presupuesto: '15000', saldo_actual: '15000' },
      { id_chofer: 'CH-04', nombre_completo: 'Mauricio', telefono: '76543210', pin_acceso: '1234', estado: 'Activo', presupuesto: '10000', saldo_actual: '10000' }
    ];
  });
  const [selectedDriverName, setSelectedDriverName] = useState('');
  const [pin, setPin] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [errorStatus, setErrorStatus] = useState('');

  // Fetch driver names automatically from cache on screen open
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        // We call the API. The API uses cached spreadsheet data.
        const header = googleToken ? `Bearer ${googleToken}` : 'Bearer local-auth-fetcher';
        const res = await fetch('/api/choferes', {
          headers: { 'Authorization': header }
        });
        const data = await res.json();
        if (data.success && data.data) {
          // Keep only active drivers
          const actives = data.data.filter((c: any) => c.estado === 'Activo');
          
          // Deduplicate based on id_chofer or name to avoid listing cloned entries in the select
          const uniqueActives: any[] = [];
          const seen = new Set<string>();
          for (const item of actives) {
            const key = String(item.id_chofer || item.nombre_completo).toLowerCase().trim();
            if (!seen.has(key)) {
              seen.add(key);
              uniqueActives.push(item);
            }
          }
          
          setChoferList(uniqueActives);
          try {
            localStorage.setItem('fallback_choferes_cache', JSON.stringify(uniqueActives));
          } catch (storageErr) {
            console.warn('Could not save choferes to local cache:', storageErr);
          }
        }
      } catch (err) {
        console.warn('Cannot load drivers lists for helper select - using local fallback lists storage:', err);
      }
    };
    fetchDrivers();
    // Re-attempt after 4 seconds if fallback is in place to ensure smooth loading
    const timer = setTimeout(fetchDrivers, 4000);
    return () => clearTimeout(timer);
  }, [googleToken]);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus('');
    if (!selectedDriverName) {
      setErrorStatus('Por favor, selecciona o escribe tu nombre.');
      return;
    }
    if (pin.length !== 4) {
      setErrorStatus('El PIN debe ser de exactamente 4 números.');
      return;
    }

    setIsLogging(true);
    try {
      const header = googleToken ? `Bearer ${googleToken}` : 'Bearer local-auth-handshake';
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': header
        },
        body: JSON.stringify({
          nombre_completo: selectedDriverName,
          pin: pin
        })
      });

      const body = await response.json();
      if (body.success) {
        onLoginSuccess(body.chofer, body.token);
        navigate('/chofer');
      } else {
        setErrorStatus(body.message || 'Código PIN incorrecto o chofer inválido.');
      }
    } catch (err) {
      setErrorStatus('Error al conectar con la estación local. Revise su conexión.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-transparent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-md w-full backdrop-blur-[12px] bg-[#112240]/80 border border-[#233554]/50 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-blue-500 to-orange-500 rounded-t-[32px]"></div>
        
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20 shadow-md">
            <Smartphone className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Acceso Conductor</h2>
          <p className="text-[10px] text-slate-200 uppercase tracking-widest font-semibold">
            Inicia sesión con tu Nombre y tu PIN de Ruta
          </p>
        </div>

        {errorStatus && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-450 font-medium animate-bounce">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        <form onSubmit={handleLocalSubmit} className="space-y-4">
          {/* CHOFER DIRECT SELECT OR WRITE INPUT */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
              Selecciona tu Nombre
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-200 z-10 pointer-events-none">
                <UserIcon className="w-4.5 h-4.5" />
              </span>
              
              {choferList.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedDriverName}
                    onChange={(e) => setSelectedDriverName(e.target.value)}
                    className="w-full bg-[#0A192F] border border-[#233554] rounded-xl pl-10 pr-10 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer appearance-none transition"
                  >
                    <option value="">-- Elige tu Nombre de la Lista --</option>
                    {choferList
                      .filter((driver) => driver.nombre_completo !== 'Don Saúl')
                      .map((driver, index) => (
                        <option key={`${driver.id_chofer || driver.nombre_completo}-${index}`} value={driver.nombre_completo}>
                          {driver.nombre_completo}
                        </option>
                      ))}
                    <option value="Don Saúl">Don Saúl</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Escribe tu Nombre Completo..."
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  className="w-full bg-[#0A192F] border border-[#233554] rounded-xl pl-10 pr-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              )}
            </div>
          </div>

          {/* PIN keypad entry */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
              PIN Secreto de Acceso (4 dígitos)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-200 pointer-events-none">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-[#0A192F] border border-[#233554] rounded-xl pl-10 pr-4 py-3.5 text-sm text-center text-slate-100 font-mono tracking-[0.5em] text-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex-1 bg-[#112240] border border-[#233554] hover:bg-[#233554] text-slate-100 font-extrabold text-xs py-3.5 rounded-xl transition cursor-pointer outline-none"
            >
              VOLVER
            </motion.button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              disabled={isLogging}
              className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-amber-700 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 outline-none"
            >
              {isLogging ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <span>INGRESAR</span>
              )}
            </motion.button>
          </div>
        </form>

        <div className="text-center text-[10px] text-slate-100 font-mono leading-normal">
          ¿No apareces en la lista? Ingresa tu nombre manualmente o usa tu PIN asignado por Don Saúl.
        </div>
      </motion.div>
    </div>
  );
}

// ADMIN GOOGLE OAUTH SECURITY GATE
interface AdminGoogleLoginGateProps {
  isLoggingIn: boolean;
  onLogin: () => void;
  onBypass: () => void;
}

function AdminGoogleLoginGate({ isLoggingIn, onLogin, onBypass }: AdminGoogleLoginGateProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleAdminAccess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === 'SL1234') {
      onBypass();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-transparent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-md w-full backdrop-blur-[12px] bg-[#112240]/80 border border-[#233554]/50 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative text-center"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-blue-500 to-orange-500 rounded-t-[32px]"></div>

        <div className="mx-auto w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 flex items-center justify-center shadow-md">
          <Layout className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Consola Administrativa</h2>
          <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold font-mono">
            Acceso Restringido
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-sm px-2 mx-auto">
          Ingrese la contraseña de administrador para acceder a la consola centralizada de la flota.
        </p>

        <form onSubmit={handleAdminAccess} className="space-y-3 pt-1">
          <div>
            <input
              type="password"
              placeholder="Contraseña de acceso"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              className={`w-full bg-[#0A192F] border ${
                error
                  ? 'border-red-500 text-red-400 placeholder-red-350'
                  : 'border-[#233554] text-white placeholder-slate-400'
              } rounded-xl py-3.5 px-4 text-center font-bold tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition`}
            />
            {error && (
              <p className="text-[10px] text-red-400 mt-2 font-mono">Contraseña incorrecta</p>
            )}
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer transform font-sans text-xs tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            disabled={!password.trim()}
          >
            <span>INGRESAR ADMINISTRACIÓN</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="w-full bg-[#112240] border border-[#233554] hover:bg-[#233554] text-slate-100 font-extrabold py-3 px-4 rounded-xl transition text-[10px] uppercase tracking-wider mt-2 cursor-pointer outline-none"
          >
            VOLVER AL PORTAL
          </motion.button>
        </form>

        <div className="pt-2 text-[9px] text-slate-400 font-mono leading-relaxed">
          Google Sheets ID: <span className="text-blue-400 block break-all">1ZNuFluKQi3lFP5qF-eQtfvDCcIDotu4v8jV89GwRgsQ</span>
        </div>
      </motion.div>
    </div>
  );
}

// ADMIN CONSOLE SHELL
interface AdminConsoleLayoutProps {
  token: string;
  userEmail?: string;
  onSignOut: () => void;
}

function AdminConsoleLayout({ token, userEmail, onSignOut }: AdminConsoleLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent relative flex flex-col text-white">
      {/* Premium Desktop Navigation Bar */}
      <div className="bg-[#0d1324]/80 text-white flex items-center justify-between px-6 py-4 border-b border-slate-800/80 backdrop-blur-[12px]">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-sm tracking-wide">SL ROAD TRUCKING</span>
            <span className="text-[9px] bg-[#0a192f] text-emerald-400 border border-emerald-900/40 ml-2 px-1.5 py-0.5 rounded uppercase font-bold font-mono tracking-widest">
              Admin Consola
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-slate-100 text-xs hidden sm:inline-block font-medium">
            Admin: {userEmail || 'Conectado'}
          </span>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-100 hover:text-white font-bold transition py-1 px-2.5 rounded-lg border border-slate-800 bg-[#0d1324]/80 cursor-pointer"
          >
            Selector General
          </button>
          <button
            onClick={onSignOut}
            className="text-xs bg-[#0d1324]/90 hover:bg-rose-950 hover:text-rose-450 text-slate-100 border border-[#1e2943]/60 transition font-extrabold px-3 py-1.5 rounded-lg cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="flex-1 bg-transparent">
        <AdminDashboard token={token} />
      </div>
    </div>
  );
}
