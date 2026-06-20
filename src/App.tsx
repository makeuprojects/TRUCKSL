import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './auth';
import DriverApp from './components/DriverApp';
import AdminDashboard from './components/AdminDashboard';
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
  Lock
} from 'lucide-react';
import { Chofer } from './types';

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
      <div className="min-h-screen bg-gradient-to-br from-[#3b0b59] via-[#1f0535] to-[#0a0216] text-white font-sans selection:bg-fuchsia-500/30 selection:text-white overflow-x-hidden">
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
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative">
      {/* Visual background ambient glow elements */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-2xl w-full backdrop-blur-[12px] bg-[#0d1324]/80 border border-[#1e2943]/50 rounded-[32px] p-8 md:p-12 space-y-8 text-center relative shadow-2xl">
        {/* Colorful top border highlight */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500 rounded-t-[32px]"></div>

        <div className="flex items-center justify-between border-b border-[#1e2943]/50 pb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-300 uppercase">
              Operación Activa
            </span>
          </div>
          {googleToken ? (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded-md">
                Admin: {currentUser?.email?.split('@')[0]}
              </span>
              <button
                onClick={onSignOut}
                className="text-slate-300 hover:text-rose-400 text-[11px] font-medium flex items-center gap-1 transition"
              >
                <LogOut className="w-3 h-3" />
                Desconectar
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-300">
              Modo Cloud sin vincular
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 text-indigo-400 rounded-full border border-[#1e2943]/50 flex items-center justify-center shadow-lg">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-sans">
            Gestión de Flota <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Enterprise</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Consola centralizada para el pesaje, bitácora de choferes, consumos de combustible y mantenimiento preventivo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
          {/* DRIVERS ENTRY PANEL */}
          <button
            onClick={() => navigate(localDriver ? '/chofer' : '/chofer-login')}
            className="group backdrop-blur-[6px] bg-[#0d1324]/60 hover:bg-[#0d1324]/90 border border-[#1e2943]/50 hover:border-emerald-500/30 rounded-2xl p-6 space-y-4 transition-all duration-300 transform hover:-translate-y-1 shadow-lg text-left cursor-pointer focus:ring-2 focus:ring-emerald-500"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 inline-block">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition">
                  {localDriver ? `Volver como ${localDriver.nombre_completo}` : 'Portal Choferes'}
                </h3>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition transform group-hover:translate-x-1" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingreso rápido para conductores usando Nombre y PIN de 4 dígitos. Reportes de combustible, pesaje y alertas sin conexión.
              </p>
            </div>
          </button>

          {/* ADMIN ENTRY PANEL */}
          <button
            onClick={() => navigate('/admin')}
            className="group backdrop-blur-[6px] bg-[#0d1324]/60 hover:bg-[#0d1324]/90 border border-[#1e2943]/50 hover:border-indigo-500/30 rounded-2xl p-6 space-y-4 transition-all duration-300 transform hover:-translate-y-1 shadow-lg text-left cursor-pointer focus:ring-2 focus:ring-indigo-500"
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 inline-block">
              <Layout className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white group-hover:text-indigo-400 transition">
                  Consola Don Saúl
                </h3>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition transform group-hover:translate-x-1" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tablero analítico financiero, aprobaciones, control de inventario de repuestos y cambio de aceite de los vehículos.
              </p>
            </div>
          </button>
        </div>

        <div className="pt-2 flex flex-col items-center justify-center space-y-1 text-slate-300 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-emerald-500" />
            <span>Proxy de Caching con Node-Cache & Colas Síncronos</span>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="max-w-md w-full backdrop-blur-[12px] bg-[#0d1324]/80 border border-[#1e2943]/50 rounded-[24px] p-8 space-y-6 shadow-2xl relative">
        
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shadow-md">
            <Smartphone className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Acceso Conductor</h2>
          <p className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold">
            Inicia sesión con tu Nombre y tu PIN de Ruta
          </p>
        </div>

        {errorStatus && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-450 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        <form onSubmit={handleLocalSubmit} className="space-y-4">
          {/* CHOFER DIRECT SELECT OR WRITE INPUT */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
              Selecciona tu Nombre
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-300">
                <UserIcon className="w-4.5 h-4.5" />
              </span>
              
              {choferList.length > 0 ? (
                <select
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  className="w-full bg-[#070a13] border border-[#1e2943]/60 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
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
              ) : (
                <input
                  type="text"
                  placeholder="Escribe tu Nombre Completo..."
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  className="w-full bg-[#070a13] border border-[#1e2943]/60 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>
          </div>

          {/* PIN keypad entry */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
              PIN Secreto de Acceso (4 dígitos)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-300">
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
                className="w-full bg-[#070a13] border border-[#1e2943]/60 rounded-xl pl-10 pr-4 py-3 text-sm text-center text-slate-200 font-mono tracking-[0.5em] text-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 bg-[#0d1324] border border-[#1e2943]/60 hover:bg-[#16223f] text-slate-300 font-extrabold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              VOLVER
            </button>
            <button
              type="submit"
              disabled={isLogging}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLogging ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <span>INGRESAR</span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-[10px] text-slate-300 font-mono leading-normal">
          ¿No apareces en la lista? Ingresa tu nombre manualmente o usa tu PIN asignado por Don Saúl (PIN por defecto: 1234).
        </div>
      </div>
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
    <div className="min-h-screen bg-[#070a13] flex items-center justify-center p-4">
      <div className="max-w-md w-full backdrop-blur-[12px] bg-[#0d1324]/80 border border-[#1e2943]/50 rounded-[24px] p-8 space-y-6 shadow-2xl relative text-center">
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-t-[24px]"></div>

        <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center justify-center shadow-lg">
          <Layout className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Consola de Don Saúl</h2>
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold font-mono">
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
              className={`w-full bg-[#151d2f]/80 border ${error ? 'border-red-500/50 text-red-100 placeholder-red-500/50' : 'border-indigo-500/30 text-emerald-100'} rounded-xl py-3.5 px-4 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition`}
            />
            {error && (
              <p className="text-[10px] text-red-400 mt-2 font-mono">Contraseña incorrecta</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-center gap-2 transition cursor-pointer transform font-sans text-xs tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!password.trim()}
          >
            <span>INGRESAR COMO DON SAÚL</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full bg-transparent hover:bg-slate-950 text-slate-400 font-bold py-2 px-4 rounded-xl transition text-[10px] uppercase tracking-wider mt-2"
          >
            VOLVER AL PORTAL
          </button>
        </form>

        <div className="pt-2 text-[9px] text-slate-400 font-mono leading-relaxed">
          Google Sheets ID: <span className="text-indigo-400 block break-all">1ZNuFluKQi3lFP5qF-eQtfvDCcIDotu4v8jV89GwRgsQ</span>
        </div>
      </div>
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
      <div className="bg-[#0d1324]/80 text-white flex items-center justify-between px-6 py-4 border-b border-fuchsia-900/50 backdrop-blur-[12px]">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-fuchsia-500/20 text-fuchsia-400 rounded-lg border border-fuchsia-500/20">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-sm tracking-wide">Flotas Don Saúl</span>
            <span className="text-[9px] bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-900/60 ml-2 px-1.5 py-0.5 rounded uppercase font-bold font-mono tracking-widest">
              Admin Consola
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-slate-300 text-xs hidden sm:inline-block font-medium">
            Admin: {userEmail || 'Conectado'}
          </span>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-300 hover:text-white font-bold transition py-1 px-2.5 rounded-lg border border-fuchsia-900/80 bg-[#0d1324]/80 cursor-pointer"
          >
            Selector General
          </button>
          <button
            onClick={onSignOut}
            className="text-xs bg-[#0d1324]/90 hover:bg-rose-950 hover:text-rose-450 text-slate-200 border border-[#1e2943]/60 transition font-extrabold px-3 py-1.5 rounded-lg cursor-pointer"
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
