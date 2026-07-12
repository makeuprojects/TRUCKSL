import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camion,
  Ruta,
  Viaje,
  Gasto,
  ControlRepuesto,
  ServiceAlert,
  DashboardSummary,
  Chofer
} from '../types';
import ChoferProfileCard from './ChoferProfileCard';
import {
  User,
  PlusCircle,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Truck,
  MapPin,
  Wrench,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
  Lock,
  Edit,
  X,
  Phone,
  Settings,
  Database,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';

const safeParse = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  // Extract numbers, signs, and dots
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

interface DashboardAdministradorProps {
  token: string;
}

export default function DashboardAdministrador({ token }: DashboardAdministradorProps) {
  // Core Database States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [repuestos, setRepuestos] = useState<ControlRepuesto[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);

  // Interactive Background states
  const [scrollY, setScrollY] = useState(0);

  // App UI flow states
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Ninguna sincronización activa');
  const [responseMsg, setResponseMsg] = useState({ text: '', type: 'info' });

  // Modal Controllers
  const [selectedDriver, setSelectedDriver] = useState<Chofer | null>(null);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);

  // Add Driver Form states
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverId, setNewDriverId] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverPin, setNewDriverPin] = useState('');
  const [newDriverBudget, setNewDriverBudget] = useState('10000');
  const [showDriverPin, setShowDriverPin] = useState(false);

  // Edit Permissions Form states
  const [activePermissionDriver, setActivePermissionDriver] = useState<Chofer | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverPin, setEditDriverPin] = useState('');
  const [editDriverStatus, setEditDriverStatus] = useState('Activo');
  const [editDriverBudget, setEditDriverBudget] = useState('10000');
  const [showEditDriverPin, setShowEditDriverPin] = useState(false);

  // Core Data Creators
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [tarifaBase, setTarifaBase] = useState('500');

  const [camionModelo, setCamionModelo] = useState('');
  const [camionAnio, setCamionAnio] = useState('');
  const [camionOdo, setCamionOdo] = useState('');

  // Parallax background effect binder
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync Google Sheets Data Hub
  const syncDatabase = async () => {
    if (!token) return;
    setIsLoading(true);
    setIsSyncing(true);
    try {
      const authHeader = `Bearer ${token}`;

      let sumResult = { success: false, summary: { ingresos_totales: 0, gastos_totales: 0, utilidades: 0, vehiculos_activos: 0 }, alertas_servicio: [] as any[] };
      try {
        const sumRes = await fetch('/api/dashboard-summary', { headers: { Authorization: authHeader } });
        sumResult = await sumRes.json();
      } catch (err) {
        console.warn('[Resilience] Failed to fetch dashboard-summary:', err);
      }
      if (sumResult.success) {
        setSummary(sumResult.summary);
        setAlerts(sumResult.alertas_servicio || []);
      }

      const [resCamiones, resRutas, resViajes, resGastos, resRepuestos, resChoferes] = await Promise.all([
        fetch('/api/camiones', { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch camiones:', err);
            return { success: false, data: [] };
          }),
        fetch('/api/rutas', { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch rutas:', err);
            return { success: false, data: [] };
          }),
        fetch('/api/viajes', { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch viajes:', err);
            return { success: false, data: [] };
          }),
        fetch('/api/gastos', { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch gastos:', err);
            return { success: false, data: [] };
          }),
        fetch('/api/control-repuestos', { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch control-repuestos:', err);
            return { success: false, data: [] };
          }),
        fetch('/api/choferes', { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch choferes:', err);
            return { success: false, data: [] };
          })
      ]);

      if (resCamiones.success) setCamiones(resCamiones.data);
      if (resRutas.success) setRutas(resRutas.data);
      if (resViajes.success) setViajes(resViajes.data);
      if (resGastos.success) setGastos(resGastos.data);
      if (resRepuestos.success) setRepuestos(resRepuestos.data);
      if (resChoferes.success) setChoferes(resChoferes.data);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      setLastSyncText(`Sincronizado: ${timeStr}`);
      setResponseMsg({ text: 'Base de datos sincronizada con Google Sheets exitosamente.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setResponseMsg({ text: 'Error al actualizar base de datos en Google Sheets.', type: 'error' });
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncDatabase();
  }, [token]);

  // Form Submissions
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverId || !newDriverPin) {
      setResponseMsg({ text: 'El Nombre, ID y PIN son estrictamente requeridos.', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/choferes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_chofer: newDriverId,
          nombre_completo: newDriverName,
          telefono: newDriverPhone,
          pin_acceso: newDriverPin,
          estado: 'Activo',
          presupuesto: newDriverBudget || '10000',
          saldo_actual: newDriverBudget || '10000'
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setResponseMsg({ text: `Conductor "${newDriverName}" agregado al Google Sheets con éxito.`, type: 'success' });
        setIsAddDriverOpen(false);
        const newDrv: Chofer = {
          id_chofer: newDriverId,
          nombre_completo: newDriverName,
          telefono: newDriverPhone,
          pin_acceso: newDriverPin,
          estado: 'Activo',
          presupuesto: newDriverBudget || '10000',
          saldo_actual: newDriverBudget || '10000'
        };
        setChoferes(prev => [...prev.filter(d => d.id_chofer !== newDriverId), newDrv]);
        setNewDriverName('');
        setNewDriverId('');
        setNewDriverPhone('');
        setNewDriverPin('');
        setNewDriverBudget('10000');
        await syncDatabase();
      } else {
        setResponseMsg({ text: resJson.message || 'Error al agregar chofer.', type: 'error' });
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDriverPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePermissionDriver) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/choferes/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_chofer: activePermissionDriver.id_chofer,
          name: editDriverName,
          phone: editDriverPhone,
          pin: editDriverPin,
          estado: editDriverStatus,
          budget: editDriverBudget,
          balance: editDriverBudget // reset balance to new budget limit
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Permisos y presupuesto del conductor ${editDriverName} actualizados.`, type: 'success' });
        setIsEditPermissionsOpen(false);
        setActivePermissionDriver(null);
        setSelectedDriver(null); // Close main detail card to refresh viewport
        await syncDatabase();
      } else {
        setResponseMsg({ text: data.message || 'Error al actualizar permisos.', type: 'error' });
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDriverBalance = async (id_chofer: string, budget: number) => {
    try {
      const res = await fetch('/api/choferes/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_chofer,
          balance: String(budget)
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: 'Saldo total de caja chica reiniciado con éxito.', type: 'success' });
        await syncDatabase();
      } else {
        setResponseMsg({ text: data.message || 'Error al reiniciar saldo.', type: 'error' });
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origen || !destino || !tarifaBase) {
      setResponseMsg({ text: 'Rellene todos los campos de ruta.', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/rutas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origen,
          destino,
          tarifa_base: String(tarifaBase)
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Ruta ${origen} ➔ ${destino} creada.`, type: 'success' });
        setOrigen('');
        setDestino('');
        setTarifaBase('500');
        await syncDatabase();
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camionModelo || !camionAnio || !camionOdo) {
      setResponseMsg({ text: 'Rellene los datos del camión.', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/camiones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          modelo: camionModelo,
          anio: String(camionAnio),
          kilometraje_actual: String(camionOdo)
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Vehículo nuevo ${camionModelo} registrado correctamente.`, type: 'success' });
        setCamionModelo('');
        setCamionAnio('');
        setCamionOdo('');
        await syncDatabase();
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkshopDestinationChange = async (repuestoId: string, choiceValue: 'Desecho' | 'Reutilizar' | 'Reparar') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/control-repuestos/update-destino', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_repuesto_historial: repuestoId,
          destino_pieza_vieja: choiceValue
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Destino físico de pieza actualizado a: ${choiceValue}.`, type: 'success' });
        await syncDatabase();
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const executeAutoSeedDemoRepuesto = async () => {
    setIsLoading(true);
    try {
      const otherGasto = gastos.find(g => g.tipo_gasto.includes('repuesto') || g.tipo_gasto.includes('Taller'));
      const payload = {
        id_gasto: otherGasto?.id_gasto || `demo-gasto-${Math.floor(Math.random() * 1000)}`,
        pieza_cambiada: 'Alternador Heavy-Duty de 24V (Foton Cummins)',
        destino_pieza_vieja: 'Reparar'
      };
      const res = await fetch('/api/control-repuestos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: 'Pieza de repuesto insertada en Google Sheets.', type: 'success' });
        await syncDatabase();
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const totalEarningsThisMonth = gastos.reduce((sum, g) => sum + safeParse(g.monto), 0);

  const handleLogoutAndRedirect = () => {
    localStorage.removeItem('driver_session_user');
    localStorage.removeItem('driver_session_token');
    localStorage.clear();
    window.location.hash = '#/chofer-login';
    window.location.reload();
  };

  const ingresosValue = viajes.reduce((sum, v) => {
    const route = rutas.find((r) => r.id_ruta === v.id_ruta);
    const basePrice = Number(v.tarifa_pactada || route?.tarifa_base || 5000);
    const baseTons = Number(v.toneladas_base || 45) || 45;
    const extraTons = Number(v.toneladas_extras) || 0;
    const extraRateValue = (basePrice / baseTons) * extraTons;
    return sum + basePrice + extraRateValue;
  }, 0);
  const margenValue = ingresosValue - totalEarningsThisMonth;
  const isMargenNegative = margenValue < 0;

  return (
    <div className="relative bg-gradient-to-br from-[#0284c7] via-[#0b1b3d] to-[#020617] min-h-[100dvh] text-slate-100 overflow-hidden font-sans">
      
      {/* Subtle Noise Texture Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />


      {/* Parallax Holographic Dark Coordinate Map Backdrop */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      >
        <svg 
          className="w-[180%] h-[180%] absolute -top-1/4 -left-1/4 text-indigo-500/10" 
          viewBox="0 0 1000 1000" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Nodes representation */}
          <circle cx="200" cy="300" r="8" fill="#10B981" fillOpacity="0.5" className="animate-pulse" />
          <text x="215" y="305" fill="#64748B" fontSize="10" fontFamily="monospace">Base Oruro [Operativo]</text>
          
          <circle cx="500" cy="400" r="8" fill="#6366F1" fillOpacity="0.5" className="animate-pulse" />
          <text x="515" y="405" fill="#64748B" fontSize="10" fontFamily="monospace">Base Cochabamba [Logística]</text>

          <circle cx="800" cy="450" r="8" fill="#F59E0B" fillOpacity="0.5" className="animate-pulse" />
          <text x="815" y="455" fill="#64748B" fontSize="10" fontFamily="monospace">Base Santa Cruz [Distribución]</text>

          <circle cx="350" cy="150" r="8" fill="#10B981" fillOpacity="0.5" className="animate-pulse" />
          <text x="365" y="155" fill="#64748B" fontSize="10" fontFamily="monospace">Base Central La Paz [Don Saúl HQs]</text>

          <circle cx="450" cy="700" r="8" fill="#EC4899" fillOpacity="0.5" className="animate-pulse" />
          <text x="465" y="705" fill="#64748B" fontSize="10" fontFamily="monospace">Control Frontera [Potosí]</text>

          {/* Connected Route Lines */}
          <path d="M200 300 L350 150 M200 300 L500 400 M500 400 L800 450 M200 300 L450 700 M500 400 L450 700" stroke="currentColor" strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.25" />
          
          {/* Moving Flow particles along paths */}
          <circle cx="350" cy="150" r="3" fill="#10B981">
            <animate attributeName="cx" values="350;200;500;350" dur="10s" repeatCount="indefinite" />
            <animate attributeName="cy" values="150;300;400;150" dur="10s" repeatCount="indefinite" />
          </circle>
          <circle cx="500" cy="400" r="3" fill="#6366F1">
            <animate attributeName="cx" values="500;800;500" dur="15s" repeatCount="indefinite" />
            <animate attributeName="cy" values="400;450;400" dur="15s" repeatCount="indefinite" />
          </circle>

          {/* Grid Helper lines */}
          <path d="M0 100 H1000 M0 300 H1000 M0 500 H1000 M0 700 H1000 M0 900 H1000" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.04" />
          <path d="M100 0 V1000 M300 0 V1000 M500 0 V1000 M700 0 V1000 M900 0 V1000" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.04" />
        </svg>
      </div>

      {/* Floating Alert Messages */}
      <AnimatePresence>
        {responseMsg.text && (
          <div className="fixed top-24 right-6 z-50 max-w-sm">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl border text-xs shadow-2xl backdrop-blur-md flex items-start gap-4 ${
                responseMsg.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex-1 space-y-1">
                <span className="font-extrabold uppercase text-[10px] tracking-wider block">
                  {responseMsg.type === 'success' ? '✓ Operación Exitosa' : '⚠️ Alerta'}
                </span>
                <p className="leading-normal font-sans font-medium">{responseMsg.text}</p>
              </div>
              <button 
                onClick={() => setResponseMsg({ text: '', type: 'info' })} 
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-8">
        
        {/* Dynamic header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Activity className="w-6 h-6 animate-pulse" />
              </span>
              Operaciones Consolidated
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed font-sans flex flex-wrap items-center gap-2">
              <span>Consola de comando de Flota de Camiones y Liquidación de Gastos de Don Saúl.</span>
              <span className="bg-slate-900 text-slate-350 border border-slate-800 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shrink-0 font-medium font-sans">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                📍 Base Central: La Paz • {lastSyncText}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={syncDatabase}
              disabled={isSyncing}
              className="bg-slate-930 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer text-indigo-450 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}</span>
            </button>

            <button
              onClick={handleLogoutAndRedirect}
              className="bg-slate-930 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded-xl px-4 py-2.5 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* 1. FINANCIAL SUMMARY BAR (Pairing: Inter for text, Geist Mono for amounts) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1E293B]/40 hover:bg-[#1E293B]/55 backdrop-blur-md border border-white/[0.05] p-5 rounded-2xl relative transition duration-300">
            <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider font-sans">Ventas Totales Netas</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-xs font-mono font-bold text-slate-450">Bs.</span>
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
                {ingresosValue.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
              </span>
            </div>
            <p className="text-[9px] text-[#10B981] font-sans mt-1">✓ Facturación Google Sheets</p>
          </div>

          <div className="bg-[#1E293B]/40 hover:bg-[#1E293B]/55 backdrop-blur-md border border-white/[0.05] p-5 rounded-2xl relative transition duration-300">
            <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider font-sans">Gastos de Ruta Operativos</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-xs font-mono font-bold text-rose-500">Bs.</span>
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-405">
                {totalEarningsThisMonth.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
              </span>
            </div>
            <p className="text-[9px] text-[#EF4444] font-sans mt-1">⛽ Consumos, Comida, Taller</p>
          </div>

          <div className="bg-[#1E293B]/40 hover:bg-[#1E293B]/55 backdrop-blur-md border border-white/[0.05] p-5 rounded-2xl relative transition duration-300">
            <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider font-sans">Margen Utilidad Bruta</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-xs font-mono font-bold text-indigo-400">Bs.</span>
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${isMargenNegative ? 'text-rose-455' : 'text-emerald-405'}`}>
                {margenValue.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
              </span>
            </div>
            <p className="text-[9px] text-[#6366F1] font-sans mt-1">⚡ Eficiencia de operaciones</p>
          </div>

          <div className="bg-[#1E293B]/40 hover:bg-[#1E293B]/55 backdrop-blur-md border border-white/[0.05] p-5 rounded-2xl relative transition duration-300">
            <span className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider font-sans">Flota Activa de Camiones</span>
            <div className="flex items-baseline mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
                {camiones.filter(c => c.estado === 'Activo').length} Camiones
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-sans mt-1">De {camiones.length} unidades totales</p>
          </div>
        </div>

        {/* 2. GESTIÓN DE FLOTA / NOMINA DE CHOFERES BENTO SECTION */}
        <div className="bg-[#1E293B]/30 backdrop-blur-lg border border-white/[0.05] rounded-[32px] p-6 lg:p-8 space-y-6 relative shadow-2xl relative group">
          
          {/* Atmospheric Glow Highlight */}
          <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-tr from-emerald-500/5 to-indigo-500/5 blur-lg pointer-events-none opacity-50 transition group-hover:opacity-75"></div>

          {/* Header element */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0 relative z-10">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Gestión de Flota (Nómina de Conductores)
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Panel maestro de presupuestos, límites de gastos e historiales de liquidación de cada chofer habilitado.
              </p>
            </div>

            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-slate-950 font-extrabold px-5 py-3 rounded-2xl text-xs uppercase flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Agregar Chofer</span>
            </button>
          </div>

          {/* Real Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            {choferes.map((driver, index) => {
              const driverBudget = Number(driver.presupuesto !== undefined && driver.presupuesto !== "" ? driver.presupuesto : 10000);
              const driverBalance = Number(driver.saldo_actual !== undefined && driver.saldo_actual !== "" ? driver.saldo_actual : driverBudget);
              const trips = viajes.filter(v => v.id_chofer === driver.id_chofer);
              const completedCount = trips.filter(v => v.estado_viaje === 'Finalizado').length;
              const hasActiveTrip = trips.some(v => v.estado_viaje === 'En Ciclo');

              return (
                <motion.div
                  key={`${driver.id_chofer}-${index}`}
                  whileHover={{ y: -4, scale: 1.015 }}
                  onClick={() => setSelectedDriver(driver)}
                  className="bg-[#1E293B]/45 backdrop-blur-md border border-white/[0.05] hover:border-emerald-500/30 rounded-2xl p-5 space-y-4 transition duration-300 cursor-pointer shadow-lg relative group/card flex flex-col"
                  id={`driver-card-${driver.id_chofer}`}
                >
                  <div className="absolute top-3 right-3 text-[9px] font-mono font-bold text-indigo-400 bg-slate-905 px-2 py-0.5 rounded border border-slate-800">
                    ID: {driver.id_chofer}
                  </div>

                  <div className="flex items-center space-x-3 pb-2 border-b border-slate-800/40">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-white text-sm group-hover/card:text-emerald-400 transition truncate max-w-[124px]">
                          {driver.nombre_completo}
                        </h4>
                        {(driver.nombre_completo === "Don Saúl" || driver.id_chofer === "admin" || driver.id_chofer === "don_saul") && (
                          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0">
                            Admin / Operador
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-550" />
                        {driver.telefono || 'Sin celular'}
                      </span>
                    </div>
                  </div>

                  {/* Saldo visualizer */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-450 uppercase tracking-wider">Caja Chica Restante</span>
                      <span className={driverBalance < driverBudget * 0.15 ? 'text-rose-455 font-black' : 'text-[#10B981]'}>
                        {Math.round((driverBalance / driverBudget) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          driverBalance < driverBudget * 0.15 ? 'bg-rose-500' : 'bg-[#10B981]'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, (driverBalance / driverBudget) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-baseline pt-0.5 pb-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans">Saldo</span>
                      <strong className="text-sm font-black text-slate-200 font-mono">
                        {driverBalance.toLocaleString('es-BO')} / {driverBudget.toLocaleString('es-BO')} BOB
                      </strong>
                    </div>

                    {/* Presupuesto Ejecutado / Total Gastado */}
                    {(() => {
                      const totalSpentThisLoad = Math.max(0, driverBudget - driverBalance);
                      const totalHistoricSpent = (gastos || [])
                        .filter(g => {
                          const gChofer = String(g.id_chofer || '').trim().toLowerCase();
                          const dChofer = String(driver.id_chofer || '').trim().toLowerCase();
                          const dNombre = String(driver.nombre_completo || '').trim().toLowerCase();
                          return gChofer === dChofer || gChofer === dNombre;
                        })
                        .reduce((sum, g) => sum + safeParse(g.monto), 0);
                      
                      return (
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/40 text-[10.5px]">
                          <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px]">Gasto acumulado</span>
                          <span className="font-mono font-black text-rose-400" title={`Histórico total en sábanas: BOB ${totalHistoricSpent.toLocaleString('es-BO')}`}>
                             BOB {totalSpentThisLoad.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between text-[10px] border-t border-slate-800/40 pt-2.5">
                    <span className="text-slate-400 font-bold tracking-wide">Viajes Hechos: <strong className="text-white font-mono">{completedCount}</strong></span>
                    {hasActiveTrip ? (
                      <span className="text-[9px] font-extrabold font-mono text-amber-300 px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/25 animate-pulse">VIAJE EN CURSO</span>
                    ) : (
                      <span className="text-[9px] font-extrabold font-mono text-slate-450 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">LISTO</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 3. CORE OPERATIONAL TABLES BENTO BOX (Routes, Trucks, Oil Spares) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          
          {/* Tab 1: Control de Rutas */}
          <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-[32px] space-y-5 shadow-xl">
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              Gestión de Rutas y Tarifas de Vales
            </h3>

            {/* In-Line Quick Form */}
            <form onSubmit={handleCreateRoute} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
              <input
                type="text"
                required
                placeholder="Origen (ej: La Paz)"
                value={origen}
                onChange={e => setOrigen(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                required
                placeholder="Destino (ej: Santa Cruz)"
                value={destino}
                onChange={e => setDestino(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  placeholder="Tarifa BOB"
                  value={tarifaBase}
                  onChange={e => setTarifaBase(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full font-mono"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3.5 rounded-xl text-xs cursor-pointer">
                  +
                </button>
              </div>
            </form>

            <div className="max-h-60 overflow-y-auto border border-slate-850 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-850">
                  <tr>
                    <th className="p-3">Ruta ID</th>
                    <th className="p-3">Origen</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3">Tarifa Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {rutas.map((ruta, index) => (
                    <tr key={`${ruta.id_ruta}-${index}`} className="hover:bg-slate-900/40">
                      <td className="p-3 font-mono text-indigo-400 uppercase">{ruta.id_ruta}</td>
                      <td className="p-3">{ruta.origen}</td>
                      <td className="p-3">{ruta.destino}</td>
                      <td className="p-3 font-mono font-bold text-[#10B981]">{ruta.tarifa_base} BOB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tab 2: Historial de Aceite y Camiones */}
          <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-[32px] space-y-5 shadow-xl">
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-400" />
              Estado Físico de Camiones en Flota
            </h3>

            {/* In-Line Quick Form */}
            <form onSubmit={handleCreateTruck} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
              <input
                type="text"
                required
                placeholder="Camión (ej: Volvo FMX)"
                value={camionModelo}
                onChange={e => setCamionModelo(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                required
                placeholder="Año (ej: 2024)"
                value={camionAnio}
                onChange={e => setCamionAnio(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  placeholder="Kilómetros Inicial"
                  value={camionOdo}
                  onChange={e => setCamionOdo(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full font-mono"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3.5 rounded-xl text-xs cursor-pointer">
                  +
                </button>
              </div>
            </form>

            <div className="max-h-60 overflow-y-auto border border-slate-850 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-850">
                  <tr>
                    <th className="p-3">Interno ID</th>
                    <th className="p-3">Modelo / Fabricante</th>
                    <th className="p-3 font-mono">Kilometraje Actual</th>
                    <th className="p-3">Presupuesto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {camiones.map((truck, index) => (
                    <tr key={`${truck.id_camion}-${index}`} className="hover:bg-slate-900/40">
                      <td className="p-3 font-mono text-purple-400 uppercase">{truck.id_camion}</td>
                      <td className="p-3">{truck.modelo} ({truck.anio})</td>
                      <td className="p-3 font-mono">{Number(truck.kilometraje_actual).toLocaleString()} km</td>
                      <td className="p-3 font-mono font-bold text-emerald-450">{Number(truck.saldo_presupuesto).toLocaleString()} BOB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. WORKSHOP CONTROL SYSTEM FOR PIEZAS REMOVIDAS */}
        <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-[32px] space-y-5 shadow-xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-400" />
                Control de Repuestos Reciclados y Reparaciones de Taller
              </h3>
              <p className="text-xs text-slate-400">
                Audite y decrete el destino físico seguro de alternadores, llantas o refacciones sustituidas por los conductores.
              </p>
            </div>
            <button
              onClick={executeAutoSeedDemoRepuesto}
              className="border border-[#312E81] text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/30 font-bold text-xs uppercase px-4 py-2 rounded-xl transition"
            >
              Demo: Crear Entrada de Repuesto
            </button>
          </div>

          {repuestos.length === 0 ? (
            <div className="p-10 text-center bg-slate-950/20 border border-slate-850 rounded-2xl text-xs text-slate-500 font-medium">
              No se registran piezas de repuesto removidas actualmente. Se generan automáticamente cuando un conductor reporta reparaciones de Taller.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-850 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-850">
                  <tr>
                    <th className="p-4">Pieza Extraída</th>
                    <th className="p-4">Gasto Asociado ID</th>
                    <th className="p-4 text-center">Destino Físico (Auditoría)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {repuestos.map((row, index) => (
                    <tr key={`${row.id_repuesto_historial}-${index}`} className="hover:bg-slate-900/30 text-slate-350">
                      <td className="p-4 font-bold text-slate-200">{row.pieza_cambiada}</td>
                      <td className="p-4 font-mono text-purple-400 uppercase">{row.id_gasto}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {(['Desecho', 'Reutilizar', 'Reparar'] as const).map(option => (
                            <button
                              key={option}
                              onClick={() => handleWorkshopDestinationChange(row.id_repuesto_historial, option)}
                              className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all ${
                                row.destino_pieza_vieja === option
                                  ? option === 'Reparar'
                                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm shadow-amber-500/20'
                                    : option === 'Reutilizar'
                                      ? 'bg-emerald-500 text-slate-955 font-extrabold shadow-sm shadow-emerald-500/20'
                                      : 'bg-slate-600 text-white'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EXPANDED DRIVER DETAILS PROFILE DRAWER MODAL OVERLAY */}
      <AnimatePresence>
        {selectedDriver && (
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <ChoferProfileCard
              chofer={selectedDriver}
              gastos={gastos}
              onResetBalance={handleResetDriverBalance}
              onEditPermissions={(drv) => {
                setActivePermissionDriver(drv);
                setEditDriverName(drv.nombre_completo);
                setEditDriverPhone(drv.telefono || '');
                setEditDriverPin(drv.pin_acceso || '');
                setEditDriverStatus(drv.estado || 'Activo');
                setEditDriverBudget(drv.presupuesto || '10000');
                setIsEditPermissionsOpen(true);
              }}
              onClose={() => setSelectedDriver(null)}
              layoutId={`driver-card-${selectedDriver.id_chofer}`}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ADD DRIVER MODAL FORM OVERLAY */}
      <AnimatePresence>
        {isAddDriverOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateDriver}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-t-3xl"></div>
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                <h3 className="text-white font-black text-sm uppercase flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Agregar Nuevo Chofer
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Nombre Completo Conductor</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Saúl Quispe Ramos"
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-emerald-500 text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">ID Alfanumérico</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: chofer_saul"
                    value={newDriverId}
                    onChange={e => setNewDriverId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-emerald-500 font-mono text-slate-100 outline-none"
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">PIN de Acceso (4 dig)</label>
                  <div className="relative">
                    <input
                      type={showDriverPin ? "text" : "password"}
                      inputMode="numeric"
                      required
                      minLength={4}
                      maxLength={4}
                      placeholder="ej: 1234"
                      value={newDriverPin}
                      onChange={e => setNewDriverPin(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-3 pr-10 rounded-xl text-sm focus:border-emerald-500 font-mono text-slate-100 tracking-[0.2em] text-center outline-none"
                    />
                    <button 
                      type="button" 
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-emerald-400 transition-colors"
                      onClick={() => setShowDriverPin(!showDriverPin)}
                    >
                      {showDriverPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="ej: 71234567"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-emerald-500 text-slate-100 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Presupuesto Inicial (BOB)</label>
                  <input
                    type="number"
                    value={newDriverBudget}
                    onChange={e => setNewDriverBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm focus:border-emerald-500 font-mono text-[#10B981] font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-slate-950 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer"
                >
                  Crear Conductor
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PERMISSIONS / LIMITS MODAL OVERLAY */}
      <AnimatePresence>
        {isEditPermissionsOpen && activePermissionDriver && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleUpdateDriverPermissions}
              className="w-full max-w-sm bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-indigo-650 rounded-t-3xl"></div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-white font-black text-xs uppercase flex items-center gap-1.5 leading-none">
                  <Settings className="w-4 h-4 text-amber-400" />
                  Editar Permisos Conductor
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditPermissionsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Nombre de Chofer</label>
                <input
                  type="text"
                  required
                  value={editDriverName}
                  onChange={e => setEditDriverName(e.target.value)}
                  className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm focus:border-amber-500 outline-none text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5 relative">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">PIN de Entrada (4 dig)</label>
                  <div className="relative">
                    <input
                      type={showEditDriverPin ? "text" : "password"}
                      inputMode="numeric"
                      required
                      value={editDriverPin}
                      onChange={e => setEditDriverPin(e.target.value)}
                      className="w-full bg-slate-950 p-3 pr-10 rounded-xl border border-slate-800 font-mono text-sm focus:border-amber-500 tracking-wider text-center outline-none text-slate-100"
                    />
                    <button 
                      type="button" 
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-amber-400 transition-colors"
                      onClick={() => setShowEditDriverPin(!showEditDriverPin)}
                    >
                      {showEditDriverPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Estado Operativo</label>
                  <select
                    value={editDriverStatus}
                    onChange={e => setEditDriverStatus(e.target.value)}
                    className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs focus:border-amber-500 outline-none text-slate-200"
                  >
                    <option value="Activo">Activo ✅</option>
                    <option value="Suspendido">Suspendido 🛑</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Teléfono Móvil</label>
                  <input
                    type="text"
                    value={editDriverPhone}
                    onChange={e => setEditDriverPhone(e.target.value)}
                    className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm focus:border-amber-500 outline-none text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold block tracking-wide">Límite Caja Chica (BOB)</label>
                  <input
                    type="number"
                    value={editDriverBudget}
                    onChange={e => setEditDriverBudget(e.target.value)}
                    className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono font-bold text-[#10B981] focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditPermissionsOpen(false)}
                  className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-450 active:bg-amber-600 text-slate-950 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer"
                >
                  Guardar Permisos
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
