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
import EditSlideOver from './EditSlideOver';
import LiveExpenseFeed from './LiveExpenseFeed';
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
  Calendar,
  Gauge,
  Plus,
  ArrowRightLeft,
  Eye,
  EyeOff
} from 'lucide-react';

interface DashboardAdminTowerProps {
  token: string;
}

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

export default function DashboardAdminTower({ token }: DashboardAdminTowerProps) {
  // Core Database States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [repuestos, setRepuestos] = useState<ControlRepuesto[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);

  // App UI flow states
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Ninguna sincronización activa');
  const [responseMsg, setResponseMsg] = useState({ text: '', type: 'info' });

  // Modal / Drawer Controllers
  const [selectedDriver, setSelectedDriver] = useState<Chofer | null>(null);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [slideOverType, setSlideOverType] = useState<'chofer' | 'camion' | null>(null);
  const [slideOverData, setSlideOverData] = useState<any>(null);

  // Add Driver Form states
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverId, setNewDriverId] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverPin, setNewDriverPin] = useState('');
  const [newDriverBudget, setNewDriverBudget] = useState('10000');
  const [showDriverPin, setShowDriverPin] = useState(false);

  // Quick Add Routes Form states
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [tarifaBase, setTarifaBase] = useState('500');

  // Quick Add Truck Form states
  const [camionModelo, setCamionModelo] = useState('');
  const [camionAnio, setCamionAnio] = useState('');
  const [camionOdo, setCamionOdo] = useState('');
  const [camionPlaca, setCamionPlaca] = useState('');
  const [camionChasis, setCamionChasis] = useState('');

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

  // Form Submissions - Add Driver
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

  // Reusable Save Handlers
  const onSaveDriver = async (id: string, updatedFields: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/choferes/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_chofer: id,
          name: updatedFields.nombre_completo,
          phone: updatedFields.telefono,
          pin: updatedFields.pin_acceso,
          estado: updatedFields.estado,
          budget: updatedFields.presupuesto,
          balance: updatedFields.saldo_actual
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Conductor "${updatedFields.nombre_completo}" guardado con éxito y sincronizado.`, type: 'success' });
        await syncDatabase();
        return true;
      } else {
        setResponseMsg({ text: data.message || 'Error actualizando datos de conductor.', type: 'error' });
        return false;
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message || 'Error de conexión operativa.', type: 'error' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const onSaveTruck = async (id: string, updatedFields: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/camiones/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_camion: id,
          modelo: updatedFields.modelo,
          anio: updatedFields.anio,
          kilometraje_actual: updatedFields.kilometraje_actual,
          saldo_presupuesto: updatedFields.saldo_presupuesto,
          estado: updatedFields.estado,
          placa: updatedFields.placa,
          chasis: updatedFields.chasis
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Camión "${updatedFields.modelo}" guardado con éxito.`, type: 'success' });
        await syncDatabase();
        return true;
      } else {
        setResponseMsg({ text: data.message || 'Error actualizando registro del camión.', type: 'error' });
        return false;
      }
    } catch (err: any) {
      setResponseMsg({ text: err.message || 'Error de red en actualización.', type: 'error' });
      return false;
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
          kilometraje_actual: String(camionOdo),
          placa: camionPlaca.trim(),
          chasis: camionChasis.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setResponseMsg({ text: `Vehículo nuevo ${camionModelo} registrado correctamente.`, type: 'success' });
        setCamionModelo('');
        setCamionAnio('');
        setCamionOdo('');
        setCamionPlaca('');
        setCamionChasis('');
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

  const handleLogoutAndRedirect = () => {
    localStorage.removeItem('driver_session_user');
    localStorage.removeItem('driver_session_token');
    localStorage.clear();
    window.location.hash = '#/chofer-login';
    window.location.reload();
  };

  const totalEarningsThisMonth = gastos
    .filter(g => g.tipo_gasto !== 'Pago Chofer')
    .reduce((sum, g) => sum + safeParse(g.monto), 0);
  const ingresosValue = viajes.reduce((sum, v) => {
    const route = rutas.find((r) => r.id_ruta === v.id_ruta);
    const basePrice = Number(v.tarifa_pactada || route?.tarifa_base || 5000);
    const baseTons = Number(v.toneladas_base || 45) || 45;
    const extraTonsRaw = Number(v.toneladas_extras) || 0;
    const totalTons = baseTons + extraTonsRaw;
    const extraTons = baseTons < 45 ? Math.max(0, totalTons - 45) : extraTonsRaw;
    const extraRateValue = (basePrice / baseTons) * extraTons;
    return sum + basePrice + extraRateValue;
  }, 0);
  const margenValue = ingresosValue - totalEarningsThisMonth;
  const isMargenNegative = margenValue < 0;

  // Active routes monitoring logic: "En Ciclo" viajes
  const activeViajes = viajes.filter((v) => v.estado_viaje === 'En Ciclo');

  const openEditDriver = (driver: Chofer) => {
    setSlideOverType('chofer');
    setSlideOverData(driver);
    setSlideOverOpen(true);
  };

  const openEditTruck = (truck: Camion) => {
    setSlideOverType('camion');
    setSlideOverData(truck);
    setSlideOverOpen(true);
  };

  return (
    <div className="relative bg-[#0F172A] min-h-screen text-slate-100 overflow-hidden font-sans pb-16">
      {/* Background visual components */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Vector visual background maps decoration */}
      <div className="absolute inset-x-0 top-12 h-[350px] pointer-events-none select-none opacity-15">
        <svg
          viewBox="0 0 1000 800"
          className="w-full h-full text-indigo-505"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
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

          <path d="M200 300 L350 150 M200 300 L500 400 M500 400 L800 450 M200 300 L450 700 M500 400 L450 700" stroke="currentColor" strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.25" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        
        {/* TOP STATUS MSG */}
        <AnimatePresence>
          {responseMsg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setResponseMsg({ text: '', type: 'info' })}
              className={`p-4 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer shadow-lg backdrop-blur border ${
                responseMsg.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-350'
                  : responseMsg.type === 'error'
                    ? 'bg-rose-950/80 border-rose-500/30 text-rose-350'
                    : 'bg-slate-900/90 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
                <span>{responseMsg.text}</span>
              </div>
              <span className="text-[10px] text-slate-500 hover:text-white transition">Cerrar ✕</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER BRANDING CONTROL TOWER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.05]">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-white tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-tr from-indigo-500 to-indigo-600 text-slate-950 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg font-black text-sm">
                ✈
              </span>
              Torre de Control Operativa
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed font-sans flex flex-wrap items-center gap-2">
              <span>Módulo centralizado de supervisión analítica de Flota de Camiones y Liquidación de Don Saúl.</span>
              <span className="bg-slate-900 text-slate-350 border border-slate-800 px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shrink-0 font-medium font-sans">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                📍 Base Central: La Paz • {lastSyncText}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={syncDatabase}
              disabled={isSyncing}
              className="bg-slate-930 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer text-indigo-400 transition"
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

        {/* FINANCIAL HUD BOARD */}
        <div id="financial-hud-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#1E293B]/30 hover:bg-[#1E293B]/40 border border-white/[0.04] p-5 rounded-2xl shadow-xl transition">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Ingresos Brutos Fletados</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-xs font-mono font-bold text-slate-450">Bs.</span>
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white animate-fade-in">
                {ingresosValue.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
              </span>
            </div>
            <p className="text-[9px] text-[#10B981] font-sans mt-2">✓ Conciliación Google Sheets Activa</p>
          </div>

          <div className="bg-[#1E293B]/30 hover:bg-[#1E293B]/40 border border-white/[0.04] p-5 rounded-2xl shadow-xl transition">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Gastos de Ruta Operativos</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-xs font-mono font-bold text-rose-500 animate-pulse">Bs.</span>
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-400">
                {totalEarningsThisMonth.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
              </span>
            </div>
            <p className="text-[9px] text-rose-450 font-sans mt-2">⬇ Retiro Caja Chica Conductor</p>
          </div>

          <div className="bg-[#1E293B]/30 hover:bg-[#1E293B]/40 border border-white/[0.04] p-5 rounded-2xl shadow-xl transition">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Margen Utilidad Bruta</span>
            <div className="flex items-baseline space-x-1 mt-2">
              <span className="text-xs font-mono font-bold text-indigo-400">Bs.</span>
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${isMargenNegative ? 'text-rose-500' : 'text-emerald-400'}`}>
                {margenValue.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
              </span>
            </div>
            <p className="text-[9px] text-[#6366F1] font-sans mt-2">⚡ Eficiencia general de operaciones</p>
          </div>
        </div>

        {/* TWO COLUMN GRID: LEFT CORE MONITORS; RIGHT LISTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 7-COLUMNS: MONITORS & LOGS */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* MONITOREO DE RUTAS EN TIEMPO REAL */}
            <div id="live-route-monitor-card" className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider font-sans">
                    Estado de Rutas Activas
                  </h3>
                </div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded text-[9px] font-black font-mono">
                  {activeViajes.length} camiones en carretera
                </span>
              </div>

              {activeViajes.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/20 border border-slate-850 rounded-xl space-y-2.5">
                  <MapPin className="w-10 h-10 text-slate-600 mx-auto stroke-[1.2]" />
                  <p className="text-xs text-slate-400 font-medium">No se reportan viajes en carretera en este ciclo.</p>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Cuando los conductores inicialicen un ciclo de viaje despegando desde La Paz u otra base vía celular, aparecerá aquí como Live monitor con telemetría de ruta.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activeViajes.map((viaje, index) => {
                    const drv = choferes.find((c) => c.id_chofer === viaje.id_chofer);
                    const truck = camiones.find((c) => c.id_camion === viaje.id_camion);
                    const route = rutas.find((c) => c.id_ruta === viaje.id_ruta);

                    return (
                      <div
                        key={`${viaje.id_viaje}-${index}`}
                        className="p-4 bg-slate-930/50 hover:bg-slate-905 border border-white/[0.03] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span className="text-xs font-black text-indigo-400 font-mono uppercase">
                              ID Viaje: {viaje.id_viaje}
                            </span>
                          </div>
                          <h4 className="text-white font-extrabold text-sm font-sans flex items-center gap-1.5 mt-0.5">
                            📍 En Ruta: {route?.origen || 'Cargando'} ➔ {route?.destino || 'Cargando'}
                          </h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Inicio: {viaje.fecha_inicio || 'Hoy'} • Pesaje: {safeParse(viaje.toneladas_base) + safeParse(viaje.toneladas_extras)} t
                          </p>
                        </div>

                        {/* Pulsative live Badge */}
                        <div className="bg-indigo-950/70 border border-indigo-900/65 rounded-xl p-3 flex flex-col justify-center text-left shrink-0 sm:min-w-44 shadow-lg">
                          <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Chofer Asignado</span>
                          <span className="text-xs font-extrabold text-indigo-300 truncate max-w-[130px] block mt-0.5">
                            👤 {drv?.nombre_completo || 'Chofer Indistinto'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5 font-medium">
                            🚛 {truck?.modelo || 'Patente Temporal'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LIVE SYSTEM EXPENSES COMPARED WITH LIGHTBOX */}
            <LiveExpenseFeed gastos={gastos} choferes={choferes} camiones={camiones} />

            {/* SEEDING & SPARE PARTS RECYCLING MONITOR */}
            <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-indigo-400" />
                    Control y Destino de Repuestos Extraídos (Taller)
                  </h3>
                  <p className="text-xs text-slate-400 font-normal">
                    Filtra y dictamina el fin físico de alternadores, filtros o llantas obsoletas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={executeAutoSeedDemoRepuesto}
                  className="border border-[#312E81] text-indigo-300 bg-indigo-950/30 hover:bg-indigo-900/30 font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                >
                  Demo: Reparar Entrada
                </button>
              </div>

              {repuestos.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/20 border border-slate-850 rounded-xl text-xs text-slate-500 font-medium">
                  No hay activos reciclados por Taller actualmente. Se crean cuando un camión ingresa por repuestos de Taller.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-850 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-850">
                      <tr>
                        <th className="p-3">Refacción Reemplazada</th>
                        <th className="p-3">ID Recibo</th>
                        <th className="p-3 text-center">Dictamen de Don Saúl</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {repuestos.map((row, index) => (
                        <tr key={`${row.id_repuesto_historial}-${index}`} className="hover:bg-slate-900/30 text-slate-350">
                          <td className="p-3 font-extrabold text-slate-200">{row.pieza_cambiada}</td>
                          <td className="p-3 font-mono text-indigo-400 uppercase">{row.id_gasto}</td>
                          <td className="p-3 flex items-center justify-center gap-2">
                            {(['Desecho', 'Reutilizar', 'Reparar'] as const).map((option) => (
                              <button
                                key={option}
                                onClick={() => handleWorkshopDestinationChange(row.id_repuesto_historial, option)}
                                className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer ${
                                  row.destino_pieza_vieja === option
                                    ? option === 'Reparar'
                                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                                      : option === 'Reutilizar'
                                        ? 'bg-emerald-500 text-slate-950 font-extrabold'
                                        : 'bg-slate-600 text-white'
                                    : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-350'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT 5-COLUMNS: FORMS & TEAM NOMINA CARD */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* CONDUCTORES CARD REGISTER */}
            <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-2xl space-y-5 shadow-xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  Nómina de Conductores
                </h3>
                <button
                  onClick={() => setIsAddDriverOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 font-extrabold text-[10px] uppercase text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Conductor
                </button>
              </div>

              {/* Driver Lists */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {choferes.map((driver, index) => {
                  const isAdmin = driver.id_chofer === 'don_saul' || driver.nombre_completo === 'Don Saúl' || driver.id_chofer === 'admin';
                  return (
                    <div
                      key={`${driver.id_chofer}-${index}`}
                      className="group/card flex items-center justify-between p-3 rounded-xl bg-slate-930/60 hover:bg-slate-900 border border-white/[0.02] hover:border-indigo-500/20 transition duration-300"
                    >
                      <div
                        onClick={() => setSelectedDriver(driver)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <User className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-white text-xs group-hover/card:text-emerald-400 transition truncate max-w-[124px]">
                              {driver.nombre_completo}
                            </h4>
                            {isAdmin && (
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[8px] font-black uppercase px-2 py-0.5 rounded leading-none shrink-0">
                                Operator
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {driver.telefono || 'Sin celular'}
                          </span>
                        </div>
                      </div>

                      {/* Small discret EDIT button */}
                      <button
                        onClick={() => openEditDriver(driver)}
                        className="p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700/60 rounded-lg text-slate-400 hover:text-indigo-400 transition cursor-pointer ml-2"
                        title="Editar Conductor"
                      >
                        <Edit className="w-3.5 h-3.5 stroke-[1.2]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ESTADO FISICO DE CAMIONES */}
            <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  Estado Físico de Camiones
                </h3>
                <span className="text-[9px] text-slate-400 font-mono bg-slate-900 border border-dashed border-slate-800 px-2.5 py-0.5 rounded">
                  {camiones.length} activos
                </span>
              </div>

              {/* Truck lists */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {camiones.map((truck, index) => (
                  <div
                    key={`${truck.id_camion}-${index}`}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-930/60 hover:bg-slate-900 border border-white/[0.02] hover:border-indigo-500/15 transition duration-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <Truck className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs truncate max-w-[170px]">
                          {truck.modelo} ({truck.anio})
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span className="text-purple-400 font-semibold">{truck.id_camion}</span>
                          <span>•</span>
                          <span>{safeParse(truck.kilometraje_actual).toLocaleString()} KM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-450 font-bold bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded">
                        {safeParse(truck.saldo_presupuesto).toLocaleString()} BOB
                      </span>
                      {/* Discrete Pencil Edit Icon */}
                      <button
                        onClick={() => openEditTruck(truck)}
                        className="p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700/60 rounded-lg text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                        title="Ficha Camión"
                      >
                        <Edit className="w-3.5 h-3.5 stroke-[1.2]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QUICK FORM: CREAR RUTA DE VIAJE */}
            <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Registrar Nueva Ruta
              </h3>
              <form onSubmit={handleCreateRoute} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Origen</label>
                    <input
                      type="text"
                      required
                      placeholder="La Paz o base"
                      value={origen}
                      onChange={(e) => setOrigen(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-100 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Destino</label>
                    <input
                      type="text"
                      required
                      placeholder="Cochabamba..."
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block uppercase font-bold">Tarifa Unitaria BOB (Carga Base)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      placeholder="Tarifa en BOB"
                      value={tarifaBase}
                      onChange={(e) => setTarifaBase(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-100 font-mono outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer text-white transition shrink-0"
                    >
                      Crear
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* QUICK FORM: REGISTRAR CAMION */}
            <div className="bg-[#1E293B]/30 border border-white/[0.05] p-6 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                Registrar Nuevo Camión
              </h3>
              <form onSubmit={handleCreateTruck} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block uppercase font-bold">Modelo / Fabricante</label>
                  <input
                    type="text"
                    required
                    placeholder="Volvo FH16, DAF, Scania R..."
                    value={camionModelo}
                    onChange={(e) => setCamionModelo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2.5 rounded-lg text-slate-100 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Placa / Patente</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 4893-XCS"
                      value={camionPlaca}
                      onChange={(e) => setCamionPlaca(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Número de Chasis</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 9BWZZZ90Z..."
                      value={camionChasis}
                      onChange={(e) => setCamionChasis(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Año Fabricación</label>
                    <input
                      type="number"
                      required
                      placeholder="2024"
                      value={camionAnio}
                      onChange={(e) => setCamionAnio(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-100 font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Odo Inicial (KM)</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={camionOdo}
                      onChange={(e) => setCamionOdo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-100 font-mono outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-xs py-2.5 rounded-lg transition cursor-pointer text-center"
                >
                  Registrar Ficha Vehicular
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>

      {/* REUSABLE EDIT DRAWER / SLIDEOVER PANEL */}
      <EditSlideOver
        isOpen={slideOverOpen}
        onClose={() => {
          setSlideOverOpen(false);
          setSlideOverType(null);
          setSlideOverData(null);
        }}
        type={slideOverType}
        data={slideOverData}
        onSaveDriver={onSaveDriver}
        onSaveTruck={onSaveTruck}
      />

      {/* EXPANDED DRIVER DETAILS PROFILE DRAWER MODAL OVERLAY */}
      <AnimatePresence>
        {selectedDriver && (
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <ChoferProfileCard
              chofer={selectedDriver}
              gastos={gastos}
              onResetBalance={handleResetDriverBalance}
              onEditPermissions={(drv) => {
                setSelectedDriver(null); // transition to drawer
                openEditDriver(drv);
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
                  className="text-slate-500 hover:text-white cursor-pointer"
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
                      maxLength={4}
                      required
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
                  className="w-full bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-slate-950 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer animate-fade-in"
                >
                  Crear Conductor
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
