import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast, Toaster } from 'sonner';
import { useAutoAnimate } from '@formkit/auto-animate/react';
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
import RouteMiniMap from './RouteMiniMap';
import RouteDetailDrawer from './RouteDetailDrawer';
import TripHistoryArchive from './TripHistoryArchive';
import {
  User,
  Users,
  Archive,
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
  ChevronRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';

interface DashboardDonSaulProps {
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

// Premium Skeleton component for loading metrics
function MetricSkeleton() {
  return (
    <div className="animate-pulse flex flex-col space-y-2 mt-2">
      <div className="h-6 w-32 bg-[#1e2943] rounded"></div>
      <div className="h-3 w-20 bg-[#1e2943] rounded"></div>
    </div>
  );
}

export default function DashboardDonSaul({ token }: DashboardDonSaulProps) {
  // AutoAnimate parent refs for elastic transitions
  const [driversListRef] = useAutoAnimate();
  const [trucksListRef] = useAutoAnimate();
  const [activeRoutesListRef] = useAutoAnimate();
  const [sparePartsTableRef] = useAutoAnimate();
  const seenEventsRef = useRef<Set<string>>(new Set());

  // Core Data Lists
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [repuestos, setRepuestos] = useState<ControlRepuesto[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);

  // Filtering states for the Bento Grid lists
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [truckFilterActive, setTruckFilterActive] = useState<'todos' | 'Activo' | 'Mantenimiento'>('todos');

  // Loaders
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [isCreatingTruck, setIsCreatingTruck] = useState(false);

  // Sync timestamps
  const [lastSyncText, setLastSyncText] = useState('Nunca sincronizado');

  // Slide Ovens & Modals controls
  const [selectedDriver, setSelectedDriver] = useState<Chofer | null>(null);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [slideOverType, setSlideOverType] = useState<'chofer' | 'camion' | null>(null);
  const [slideOverData, setSlideOverData] = useState<any>(null);
  const [selectedRouteViaje, setSelectedRouteViaje] = useState<Viaje | null>(null);
  const [isRouteDetailOpen, setIsRouteDetailOpen] = useState(false);

  // Forms states
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverId, setNewDriverId] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverPin, setNewDriverPin] = useState('');
  const [newDriverBudget, setNewDriverBudget] = useState('10000');
  const [showDriverPin, setShowDriverPin] = useState(false);

  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [tarifaBase, setTarifaBase] = useState('5000');

  const [camionModelo, setCamionModelo] = useState('');
  const [camionAnio, setCamionAnio] = useState('');
  const [camionOdo, setCamionOdo] = useState('');
  const [camionPlaca, setCamionPlaca] = useState('');
  const [camionChasis, setCamionChasis] = useState('');

  // Top navigation structure (Enterprise Tab Layout)
  const [activeTab, setActiveTab] = useState<'monitoreo' | 'historial' | 'personal'>('monitoreo');

  // Core Sync Engine
  const syncDatabase = async (): Promise<void> => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const authHeader = `Bearer ${token}`;

      const tb = `?t=${Date.now()}`;
      
      // Fetch summary and list assets in parallel
      const [resSummary, resCamiones, resRutas, resViajes, resGastos, resRepuestos, resChoferes] = await Promise.all([
        fetch(`/api/dashboard-summary${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch dashboard-summary:', err);
            return { success: false, summary: {}, alertas_servicio: [] };
          }),
        fetch(`/api/camiones${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch camiones:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/rutas${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch rutas:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/viajes${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch viajes:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/gastos${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch gastos:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/control-repuestos${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch control-repuestos:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/choferes${tb}`, { headers: { Authorization: authHeader } })
          .then((r) => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch choferes:', err);
            return { success: false, data: [] };
          })
      ]);

      if (resSummary.success) {
        setSummary(resSummary.summary);
        setAlerts(resSummary.alertas_servicio || []);
        
        // Trigger live notifications for any new dynamic events matching drivers
        if (Array.isArray(resSummary.novedades_tiempo_real)) {
          resSummary.novedades_tiempo_real.forEach((event: any) => {
            const eventKey = event.uuid || `${event.tipo_evento}-${event.timestamp_registro}-${event.id_referencia}`;
            if (eventKey && !seenEventsRef.current.has(eventKey)) {
              seenEventsRef.current.add(eventKey);
              toast.info(`${event.tipo_evento}`, {
                description: `${event.descripcion} (hace ${event.hace})`,
                duration: 6000,
                icon: '🚚'
              });
            }
          });
        }
      }
      if (resCamiones.success) setCamiones(resCamiones.data);
      if (resRutas.success) setRutas(resRutas.data);
      if (resViajes.success) setViajes(resViajes.data);
      if (resGastos.success) setGastos(resGastos.data);
      if (resRepuestos.success) setRepuestos(resRepuestos.data);
      if (resChoferes.success) setChoferes(resChoferes.data);

      const now = new Date();
      setLastSyncText(`Monitoreo en vivo • Sync: ${now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      setInitialLoaded(true);
    } catch (error: any) {
      console.error(error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncDatabase();
    // Fast 5-second polling coordinates immediate synchronization 24/7 without delays!
    const interval = setInterval(syncDatabase, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle premium toast sync action
  const handleManualSync = () => {
    toast.promise(syncDatabase(), {
      loading: 'Sincronizando flota y planillas en tiempo real con Google Sheets...',
      success: 'Base de datos de la flota actualizada correctamente',
      error: 'Error de red al actualizar planillas'
    });
  };

  const handleDeleteViaje = async (id_viaje: string) => {
    try {
      const authHeader = `Bearer ${token}`;
      const res = await fetch(`/api/viajes/${id_viaje}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Viaje eliminado exitosamente.');
        setIsRouteDetailOpen(false);
        setSelectedRouteViaje(null);
        await syncDatabase();
      } else {
        toast.error(data.message || 'Error al eliminar viaje.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión.');
    }
  };

  // Add Driver Form Submit
  const handleCreateDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverId.trim() || !newDriverPin.trim()) {
      toast.error('El nombre, ID y PIN secreto son requeridos.');
      return;
    }
    if (newDriverPin.length !== 4) {
      toast.error('El PIN debe tener exactamente 4 dígitos operativos');
      return;
    }

    setIsCreatingDriver(true);
    const creationPromise = async () => {
      const res = await fetch('/api/choferes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_chofer: newDriverId.trim().toLowerCase(),
          nombre_completo: newDriverName.trim(),
          telefono: newDriverPhone.trim(),
          pin_acceso: newDriverPin,
          estado: 'Activo',
          presupuesto: newDriverBudget || '10000',
          saldo_actual: newDriverBudget || '10000'
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Error registrando chofer en Sheets');
      }
      setIsAddDriverOpen(false);
      // Reset forms
      setNewDriverName('');
      setNewDriverId('');
      setNewDriverPhone('');
      setNewDriverPin('');
      setNewDriverBudget('10000');
      await syncDatabase();
    };

    toast.promise(creationPromise(), {
      loading: 'Añadiendo conductor y creando casillero de Caja Chica...',
      success: 'Conductor asignado y configurado en Google Sheets con éxito',
      error: (err) => err.message || 'Fallo al añadir nuevo conductor'
    });
    setIsCreatingDriver(false);
  };

  // Create Route Submit
  const handleCreateRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origen.trim() || !destino.trim() || !tarifaBase) {
      toast.error('Origen, destino y tarifa base de carga son obligatorios.');
      return;
    }
    setIsCreatingRoute(true);
    const routePromise = async () => {
      const res = await fetch('/api/rutas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origen: origen.trim(),
          destino: destino.trim(),
          tarifa_base: String(tarifaBase)
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setOrigen('');
      setDestino('');
      setTarifaBase('5000');
      await syncDatabase();
    };

    toast.promise(routePromise(), {
      loading: 'Guardando trayecto logístico en tabla de tarifas...',
      success: `Ruta ${origen} ➔ ${destino} integrada para asignación de viajes`,
      error: 'Error de red registrando ruta'
    });
    setIsCreatingRoute(false);
  };

  // Create Truck Submit
  const handleCreateTruckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camionModelo.trim() || !camionAnio.trim() || !camionOdo.trim()) {
      toast.error('Rellene la ficha técnica completa del camión nuevo');
      return;
    }
    setIsCreatingTruck(true);
    const truckPromise = async () => {
      const res = await fetch('/api/camiones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          modelo: camionModelo.trim(),
          anio: String(camionAnio),
          kilometraje_actual: String(camionOdo),
          placa: camionPlaca.trim(),
          chasis: camionChasis.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCamionModelo('');
      setCamionAnio('');
      setCamionOdo('');
      setCamionPlaca('');
      setCamionChasis('');
      await syncDatabase();
    };

    toast.promise(truckPromise(), {
      loading: 'Instanciando matrícula vehicular en Inventariado...',
      success: 'Camión registrado con éxito y habilitado para viajes',
      error: 'Fallo al añadir nuevo camión'
    });
    setIsCreatingTruck(false);
  };

  // Slide-over Callback to Save Driver Fields
  const onSaveDriver = async (id: string, fields: any) => {
    const editPromise = async () => {
      const res = await fetch('/api/choferes/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_chofer: id,
          name: fields.nombre_completo,
          phone: fields.telefono,
          pin: fields.pin_acceso,
          estado: fields.estado,
          budget: fields.presupuesto,
          balance: fields.saldo_actual
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await syncDatabase();
    };

    toast.promise(editPromise(), {
      loading: 'Actualizando registro personal en nube de Google Sheets...',
      success: 'Conductor guardado y sincronizado exitosamente',
      error: 'Error al actualizar chofer'
    });
    return true;
  };

  // Slide-over Callback to Save Truck Fields
  const onSaveTruck = async (id: string, fields: any) => {
    const truckPromise = async () => {
      const res = await fetch('/api/camiones/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_camion: id,
          modelo: fields.modelo,
          anio: fields.anio,
          kilometraje_actual: fields.kilometraje_actual,
          saldo_presupuesto: fields.saldo_presupuesto,
          estado: fields.estado,
          placa: fields.placa,
          chasis: fields.chasis
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await syncDatabase();
    };

    toast.promise(truckPromise(), {
      loading: 'Enviando ficha mecánica actualizada al servidor...',
      success: 'Especificaciones del vehículo actualizadas',
      error: 'Error actualizando datos de móvil'
    });
    return true;
  };

  // Reset Balance
  const handleResetDriverBalance = async (id_chofer: string, budget: number) => {
    const rstPromise = async () => {
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
      if (!data.success) throw new Error(data.message);
      await syncDatabase();
    };

    toast.promise(rstPromise(), {
      loading: 'Reiniciando valores de caja chica de carretera...',
      success: 'Saldo de caja chica restaurado a valor nominal',
      error: 'No se pudo restaurar el saldo'
    });
  };

  // Taller Pieza destin cambiador
  const handleWorkshopDestinationChange = async (repuestoId: string, choiceValue: 'Desecho' | 'Reutilizar' | 'Reparar') => {
    const updatePromise = async () => {
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
      if (!data.success) throw new Error(data.message);
      await syncDatabase();
    };

    toast.promise(updatePromise(), {
      loading: 'Actualizando dictamen de pieza extraída...',
      success: `Estado de pieza actualizado a: ${choiceValue}`,
      error: 'Error registrando dictamen'
    });
  };

  // Demo Insert Gasto / Repuesto Creator
  const executeAutoSeedDemoRepuesto = async () => {
    const taskPromise = async () => {
      // Find expense related to parts or workshops
      const repairExpense = gastos.find((g) => g.tipo_gasto.includes('repuesto') || g.tipo_gasto.includes('Taller')) || gastos[0];
      const payload = {
        id_gasto: repairExpense?.id_gasto || `G-IND-${Math.floor(Math.random() * 9000 + 1000)}`,
        pieza_cambiada: 'Corona de Distribución Scania 440 (Taller Central Oruro)',
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
      if (!data.success) throw new Error(data.message);
      await syncDatabase();
    };

    toast.promise(taskPromise(), {
      loading: 'Creando registro de Taller simulado para control físico...',
      success: 'Pieza extraída registrada. Don Saúl ya puede dictaminar su destino.',
      error: 'Fallo al inicializar demo'
    });
  };

  // Log Out Handlers
  const handleLogoutAndRedirect = () => {
    localStorage.removeItem('driver_session_user');
    localStorage.removeItem('driver_session_token');
    localStorage.clear();
    toast.success('Sesión finalizada. Redirigiendo a Login...');
    setTimeout(() => {
      window.location.hash = '#/chofer-login';
      window.location.reload();
    }, 850);
  };

  // Safely format departure dates
  const formatDepartureDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'Hoy';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return dateStr;
      }
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Calculations with NaN defenses
  const totalExpensesThisMonth = gastos.reduce((sum, g) => sum + safeParse(g.monto), 0);
  const ingresosValue = safeParse(summary?.ingresos_totales || 84000);
  const margenValue = ingresosValue - totalExpensesThisMonth;
  const isMargenNegative = margenValue < 0;

  // Active viajas monitoring
  const activeViajes = viajes.filter((v) => v.estado_viaje === 'En Ciclo');

  // Trigger Open Drawers
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

  // Filters for Bento Grid Lists
  const filteredDrivers = choferes.filter((d) => {
    if (!d) return false;
    const name = String(d.nombre_completo || '').toLowerCase();
    const id = String(d.id_chofer || '').toLowerCase();
    const query = String(driverSearchQuery || '').toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  const filteredTrucks = camiones.filter((t) => {
    if (truckFilterActive === 'todos') return true;
    return t.estado === truckFilterActive;
  });

  return (
    <div className="relative bg-gradient-to-br from-[#0284c7] via-[#0b1b3d] to-[#020617] min-h-[100dvh] text-slate-100 overflow-hidden font-sans pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-24">
      {/* Toasting system integrated */}
      <Toaster richColors closeButton theme="dark" position="bottom-right" />

      {/* Elegant horizontal satin light beam */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.18] to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[150px] bg-white/[0.015] rounded-full blur-[80px] pointer-events-none" />

      {/* Futuristic high-contrast dotted matrix mapping background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff02_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-80" />

      {/* Elegant soft white & misty silver background ambient glows */}
      <div className="absolute top-0 left-0 w-full h-[550px] bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-white/[0.025] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-12 right-12 w-[300px] h-[300px] bg-white/[0.02] rounded-full blur-[80px] pointer-events-none" />

      {/* NOCTURNAL MAP IN THE BACKGROUND WITH EM SECTIONS (z-index: -1, sutil opacity) */}
      <div 
        id="nocturnal-geotrack-map" 
        className="fixed inset-0 pointer-events-none select-none opacity-20 flex items-center justify-center overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <svg
          viewBox="0 0 1600 1100"
          className="w-full h-full min-w-[1200px] object-cover text-sky-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Grid visual lines */}
          <g className="text-sky-200" strokeWidth="0.3" strokeOpacity="0.2">
            <line x1="0" y1="200" x2="1600" y2="200" strokeDasharray="3,3" />
            <line x1="0" y1="400" x2="1600" y2="400" strokeDasharray="3,3" />
            <line x1="0" y1="600" x2="1600" y2="600" strokeDasharray="3,3" />
            <line x1="0" y1="800" x2="1600" y2="800" strokeDasharray="3,3" />
            <line x1="0" y1="1000" x2="1600" y2="1000" strokeDasharray="3,3" />
            
            <line x1="300" y1="0" x2="300" y2="1100" strokeDasharray="3,3" />
            <line x1="600" y1="0" x2="600" y2="1100" strokeDasharray="3,3" />
            <line x1="900" y1="0" x2="900" y2="1100" strokeDasharray="3,3" />
            <line x1="1200" y1="0" x2="1200" y2="1100" strokeDasharray="3,3" />
            <line x1="1500" y1="0" x2="1500" y2="1100" strokeDasharray="3,3" />
          </g>

          {/* Connected routes representation */}
          <g className="text-sky-300" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="10,8">
            <path d="M410 230 L550 420" id="route-lp-or" />
            <path d="M550 420 L820 480" id="route-or-co" />
            <path d="M820 480 L1210 520" id="route-co-sc" />
            <path d="M550 420 L760 840" id="route-or-po" />
            <path d="M820 480 L760 840" id="route-co-po" />
            <path d="M1210 520 L1400 300" id="route-sc-be" />
          </g>

          {/* Abstract Truck Graphic Graphic (Center background) */}
          <g transform="translate(600, 300) scale(4)" className="text-slate-800 opacity-20" fill="currentColor">
            <path d="M78 28.5V23H67.5V14C67.5 12.8954 66.6046 12 65.5 12H19C17.8954 12 17 12.8954 17 14V33C17 34.1046 17.8954 35 19 35H21.5C21.5 38.0376 23.9624 40.5 27 40.5C30.0376 40.5 32.5 38.0376 32.5 35H55.5C55.5 38.0376 57.9624 40.5 61 40.5C64.0376 40.5 66.5 38.0376 66.5 35H67.5V28.5H78ZM27 38.5C25.067 38.5 23.5 36.933 23.5 35C23.5 33.067 25.067 31.5 27 31.5C28.933 31.5 30.5 33.067 30.5 35C30.5 36.933 28.933 38.5 27 38.5ZM61 38.5C59.067 38.5 57.5 36.933 57.5 35C57.5 33.067 59.067 31.5 61 31.5C62.933 31.5 64.5 33.067 64.5 35C64.5 36.933 62.933 38.5 61 38.5ZM19 14H65.5V33H19V14ZM67.5 25H76V30H67.5V25Z"/>
            <path d="M4 14H15V33H4V14Z"/>
          </g>

          {/* Base Cities nodes with Electromagnetic ping effect */}
          {/* Base Central: La Paz */}
          <g transform="translate(410, 230)">
            <circle cx="0" cy="0" r="24" className="animate-ping text-emerald-450 fill-emerald-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="8" fill="#10B981" />
            <text x="20" y="6" fill="#64748B" fontSize="16" fontWeight="bold" fontFamily="monospace">La Paz (Sede Central)</text>
          </g>

          {/* Base Oruro */}
          <g transform="translate(550, 420)">
            <circle cx="0" cy="0" r="20" className="animate-ping text-[#1E3A8A] fill-blue-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#6366F1" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Oruro (Taller Base)</text>
          </g>

          {/* Base Cochabamba */}
          <g transform="translate(820, 480)">
            <circle cx="0" cy="0" r="20" className="animate-ping text-[#1E3A8A] fill-blue-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#6366F1" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Cochabamba</text>
          </g>

          {/* Base Santa Cruz */}
          <g transform="translate(1210, 520)">
            <circle cx="0" cy="0" r="22" className="animate-ping text-amber-450 fill-orange-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#F59E0B" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Santa Cruz (Distribución)</text>
          </g>

          {/* Control Frontera: Potosí */}
          <g transform="translate(760, 840)">
            <circle cx="0" cy="0" r="20" className="animate-ping text-rose-450 fill-rose-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#EC4899" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Frontera Potosí</text>
          </g>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative" style={{ zIndex: 10 }}>
        
        {/* TOP COMPACT HEADER ROW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06] backdrop-blur-md">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-white/10 border border-white/20 text-slate-100 font-mono text-[9px] font-black uppercase tracking-widest rounded-md leading-none shadow-[0_0_12px_rgba(255,255,255,0.05)]">
                SL ROAD TRUCKING Console
              </span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight flex items-center gap-3">
              <span className="bg-white/10 border border-white/20 text-slate-100 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg font-black text-sm">
                🛰
              </span>
              <span className="bg-gradient-to-r from-slate-50 via-white to-slate-300 bg-clip-text text-transparent">
                Bienvenido Saul
              </span>
              <motion.div
                animate={{ x: [0, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Truck className="w-8 h-8 text-slate-300" />
              </motion.div>
            </h1>
            <p className="text-xs text-slate-200/95 font-sans leading-relaxed">
              Consola del Administrador para la sincronización, auditorías y monitoreo en vivo de flotas bolivianas.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Sync trigger button with premium soft-white satin styling */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="relative group bg-white/10 hover:bg-white/15 active:bg-white/5 border border-white/20 hover:border-white/35 text-slate-50 rounded-xl px-4 py-2.5 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition shadow-md shadow-white/[0.02]"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-45 transition'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}</span>
            </button>

            <button
              onClick={handleLogoutAndRedirect}
              className="bg-red-950/20 hover:bg-red-950/45 text-red-400 border border-red-900/40 rounded-xl px-4 py-2.5 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* METRICS HUD - PERFECTLY ALIGNED, NON-NaN, GEIST MONO */}
        <div id="analytics-hud" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Ingresos Brutos */}
          <div className="relative group overflow-hidden bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.18] p-5 rounded-2xl shadow-xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
            <div className="absolute top-0 right-0 p-3 text-white/[0.06] group-hover:text-emerald-450/15 transition duration-300">
              <TrendingUp className="w-12 h-12 stroke-[1.2]" />
            </div>
            <span className="text-[9.5px] text-slate-200/90 font-black block uppercase tracking-wider">
              Ingresos Brutos Fletados
            </span>
            {!initialLoaded ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-2 text-left">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xs font-mono font-bold text-slate-300">BOB</span>
                  <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                    {ingresosValue.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                  ✓ Conciliación Activa de Cartas Portes
                </span>
              </div>
            )}
          </div>

          {/* Gastos Totales */}
          <div className="relative group overflow-hidden bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.18] p-5 rounded-2xl shadow-xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
            <div className="absolute top-0 right-0 p-3 text-white/[0.06] group-hover:text-rose-450/15 transition duration-300">
              <DollarSign className="w-12 h-12 stroke-[1.2]" />
            </div>
            <span className="text-[9.5px] text-slate-200/90 font-black block uppercase tracking-wider">
              Gastos de Ruta Operativos
            </span>
            {!initialLoaded ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-2 text-left">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xs font-mono font-bold text-rose-300">BOB</span>
                  <span className="text-2xl font-black font-mono tracking-tight text-rose-400">
                    {totalExpensesThisMonth.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-rose-400 font-bold block mt-1">
                  ⬇ Retiros de Caja Chica Totales
                </span>
              </div>
            )}
          </div>

          {/* Margen */}
          <div className="relative group overflow-hidden bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.18] p-5 rounded-2xl shadow-xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
            <div className="absolute top-0 right-0 p-3 text-white/[0.06] group-hover:text-sky-450/15 transition duration-300">
              <Layers className="w-12 h-12 stroke-[1.2]" />
            </div>
            <span className="text-[9.5px] text-slate-200/90 font-black block uppercase tracking-wider">
              Margen de Utilidad Bruta
            </span>
            {!initialLoaded ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-2 text-left">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xs font-mono font-bold text-slate-300">BOB</span>
                  <span className={`text-2xl font-black font-mono tracking-tight ${isMargenNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {margenValue.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-indigo-300 font-bold block mt-1">
                  ⚡ Rendimiento del capital fletado
                </span>
              </div>
            )}
          </div>

        </div>

        {/* TOP COMMAND NAVIGATION */}
        <div className="flex bg-slate-900/85 backdrop-blur-md border border-white/[0.08] mb-6 rounded-2xl p-1.5 mt-6 shadow-xl gap-1.5">
          <button
            onClick={() => setActiveTab('monitoreo')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-black uppercase transition-all duration-300 rounded-xl focus:outline-none cursor-pointer ${
              activeTab === 'monitoreo'
                ? 'text-slate-50 bg-white/10 border border-white/20 shadow-[0_4px_20px_rgba(255,255,255,0.06),inset_0_1px_1px_rgba(255,255,255,0.1)] font-extrabold'
                : 'text-slate-400 border border-transparent hover:text-slate-100 hover:bg-white/[0.03]'
            }`}
          >
            <Activity className="w-4.5 h-4.5" />
            Monitoreo en Vivo
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-black uppercase transition-all duration-300 rounded-xl focus:outline-none cursor-pointer ${
              activeTab === 'historial'
                ? 'text-slate-50 bg-white/10 border border-white/20 shadow-[0_4px_20px_rgba(255,255,255,0.06),inset_0_1px_1px_rgba(255,255,255,0.1)] font-extrabold'
                : 'text-slate-400 border border-transparent hover:text-slate-100 hover:bg-white/[0.03]'
            }`}
          >
            <Archive className="w-4.5 h-4.5" />
            La Bóveda Histórica
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-black uppercase transition-all duration-300 rounded-xl focus:outline-none cursor-pointer ${
              activeTab === 'personal'
                ? 'text-slate-50 bg-white/10 border border-white/20 shadow-[0_4px_20px_rgba(255,255,255,0.06),inset_0_1px_1px_rgba(255,255,255,0.1)] font-extrabold'
                : 'text-slate-400 border border-transparent hover:text-slate-100 hover:bg-white/[0.03]'
            }`}
          >
            <Users className="w-4.5 h-4.5" />
            Control de Personal y Flota
          </button>
        </div>

        {/* CONDITIONALLY RENDER MAIN CONTENT BASED ON TABS */}
        <div className="w-full">
          {activeTab === 'monitoreo' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
              {/* MONITOREO DE RUTAS EN TIEMPO REAL */}
            <div id="live-route-container" className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-6 rounded-2xl space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider">
                    Estado de Rutas Activas
                  </h3>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[9.5px] font-black font-mono">
                  {activeViajes.length} Unidades en Tránsito
                </span>
              </div>

              <div ref={activeRoutesListRef} className="space-y-3.5">
                {activeViajes.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-2">
                    <MapPin className="w-10 h-10 text-slate-400 mx-auto stroke-[1]" />
                    <p className="text-xs text-slate-200 font-bold">Sin viajes activos de carretera en el ciclo</p>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Cuando un conductor inicie su viaje con el PIN en la app móvil, su estatus aparecerá listado dinámicamente aquí.
                    </p>
                  </div>
                ) : (
                  activeViajes.map((viaje, index) => {
                    const drv = choferes.find((c) => c.id_chofer === viaje.id_chofer);
                    const truck = camiones.find((c) => c.id_camion === viaje.id_camion);
                    const route = rutas.find((r) => r.id_ruta === viaje.id_ruta);

                    return (
                      <div
                        key={`${viaje.id_viaje}-${drv?.id_chofer || 'no-drv'}-${truck?.id_camion || 'no-trk'}-${index}`}
                        onClick={() => {
                          setSelectedRouteViaje(viaje);
                          setIsRouteDetailOpen(true);
                        }}
                        className="relative overflow-hidden group p-4 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex flex-col gap-4 transition duration-300 animate-fade-in cursor-pointer hover:scale-[1.02] active:scale-[0.99] shadow-lg hover:shadow-emerald-950/10 animate-pulse-subtle"
                        title="Haga clic para auditar la ruta y los comprobantes en detalle"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-all duration-300 animate-pulse"></span>
                              <span className="text-[10px] font-black font-mono text-sky-400/90 group-hover:text-sky-300 uppercase transition-colors">
                                ID {viaje.id_viaje}
                              </span>
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-black px-1.5 py-0.5 rounded">
                                EN MONITOREO
                              </span>
                            </div>
                            <h4 className="text-slate-100 font-black text-sm tracking-tight flex items-center gap-1.5 group-hover:text-white transition-colors duration-300">
                              📍 En Ruta: {route?.origen || 'La Paz'} ➔ {route?.destino || 'Oruro'}
                            </h4>
                            <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">
                              Zarpó el {formatDepartureDate(viaje.fecha_inicio)}
                            </p>
                            <div className="flex gap-4 mt-1">
                              <span className="text-[10px] font-mono font-bold bg-slate-900 group-hover:bg-slate-850 text-slate-300 group-hover:text-slate-200 px-2.5 py-1 rounded-md transition-colors border border-slate-800">
                                Pesaje: {Number(viaje.toneladas_base) + Number(viaje.toneladas_extras)} t
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-slate-900 group-hover:bg-slate-850 text-slate-300 group-hover:text-emerald-400 px-2.5 py-1 rounded-md transition-colors border border-slate-800">
                                Status: {viaje.estado_viaje}
                              </span>
                            </div>
                          </div>

                          {/* Right dynamic Badge */}
                          <div className="bg-slate-900 group-hover:bg-slate-850 border border-slate-800/80 group-hover:border-emerald-500/20 rounded-xl px-4 py-2 flex flex-col justify-center text-left shrink-0 sm:min-w-48 shadow-inner transition-colors duration-300">
                            <span className="text-[8px] text-slate-400 group-hover:text-slate-300 uppercase font-black tracking-wider transition-colors">Chofer y Camión</span>
                            <span className="text-xs font-black text-slate-200 group-hover:text-white mt-0.5 truncate max-w-[130px] transition-colors" title={drv?.nombre_completo}>
                              👤 {drv?.nombre_completo || 'Sin chofer'}
                            </span>
                            <span className="text-[10.5px] font-mono text-indigo-300 group-hover:text-indigo-200 mt-0.5 transition-colors" title={truck?.modelo}>
                              Ref: {truck?.modelo || 'Sin camión'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Premium Radar Map */}
                        <RouteMiniMap 
                          origen={route?.origen || 'La Paz'} 
                          destino={route?.destino || 'Oruro'} 
                          idViaje={viaje.id_viaje}
                        />

                        {/* Quick Action Overlay (Hover) */}
                        <div className="absolute inset-y-0 right-0 w-1/2 sm:w-1/3 bg-gradient-to-l from-slate-950 via-slate-900/70 to-transparent flex items-center justify-end pr-4 sm:pr-8 translate-x-full group-hover:translate-x-0 transition-transform duration-300 pointer-events-none z-20">
                          <button 
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] pointer-events-auto transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRouteViaje(viaje);
                              setIsRouteDetailOpen(true);
                            }}
                          >
                            👁️ Auditar Viaje en Vivo
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* LIVE FEED DE COMPROBANTES CON VISOR INTEGRADO Y AUTOANIMATE */}
            <LiveExpenseFeed gastos={gastos} choferes={choferes} camiones={camiones} />

            {/* CONTROL DE REPUESTOS Y DICTAMEN DIARIO */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-sky-400" />
                    Destino y Reciclaje de Piezas Extraídas
                  </h3>
                  <p className="text-xs text-slate-300">
                    Evita fugas de stock. Determina si los repuestos usados van a desecho, reutilización o rectificación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={executeAutoSeedDemoRepuesto}
                  className="border border-slate-800 text-sky-400 bg-slate-950/60 hover:bg-slate-800 hover:border-emerald-500/40 font-black text-[9px] uppercase px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer shadow-md shadow-emerald-950/10"
                >
                  Simular Pieza Extraída
                </button>
              </div>

              {repuestos.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 border border-slate-800/60 rounded-xl text-xs text-slate-400">
                  No hay activos reciclados por Taller actualmente. Se crean automáticamente cuando un conductor reporta gasto de repuestos.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-300 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Refacción Cambiada</th>
                        <th className="p-3">ID Recibo</th>
                        <th className="p-3 text-center">Formato de Reciclaje (Dictamen)</th>
                      </tr>
                    </thead>
                    <tbody ref={sparePartsTableRef} className="divide-y divide-slate-800/50">
                      {repuestos.map((row, index) => (
                        <tr key={`${row.id_repuesto_historial}-${row.id_gasto}-${index}`} className="hover:bg-slate-800/40 text-slate-200 transition duration-150">
                          <td className="p-3 font-extrabold text-slate-100">{row.pieza_cambiada}</td>
                          <td className="p-3 font-mono text-sky-400 uppercase">{row.id_gasto}</td>
                          <td className="p-3 flex items-center justify-center gap-1.5">
                            {(['Desecho', 'Reutilizar', 'Reparar'] as const).map((option) => (
                              <button
                                key={option}
                                onClick={() => handleWorkshopDestinationChange(row.id_repuesto_historial, option)}
                                className={`px-2 py-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer ${
                                  row.destino_pieza_vieja === option
                                    ? option === 'Reparar'
                                      ? 'bg-orange-500 text-slate-950 font-extrabold'
                                      : option === 'Reutilizar'
                                        ? 'bg-emerald-500 text-slate-950 font-extrabold'
                                        : 'bg-slate-600 text-slate-900'
                                    : 'bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
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
          )}

          {activeTab === 'personal' && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
              <div className="space-y-8">
                {/* DRIVERS / CHOFERES BOARD */}
                <div className="bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-4 shadow-2xl relative transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-400" />
                    Plantilla de Choferes
                  </h3>
                  <p className="text-[10px] text-slate-300 font-normal">Don Saúl e inspectores autorizados.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-md shadow-emerald-950/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Chofer
                </button>
              </div>

              {/* Filtering & Searching */}
              <div className="relative shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar chofer por nombre o ID..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/40 focus:bg-slate-900"
                />
              </div>

              {/* Reorder list with AutoAnimate */}
              <div ref={driversListRef} className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredDrivers.map((driver, index) => {
                  const isAdmin = driver.id_chofer === 'don_saul' || driver.nombre_completo === 'Don Saúl' || driver.id_chofer === 'admin';
                  return (
                    <div
                      key={`${driver.id_chofer}-${driver.nombre_completo}-${index}`}
                      className="group/card flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-[#131d35]/65 border border-slate-800/40 hover:border-sky-500/20 transition duration-300"
                    >
                      <div
                        onClick={() => setSelectedDriver(driver)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                          <User className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-slate-100 text-xs group-hover/card:text-sky-400 transition truncate max-w-[124px]">
                              {driver.nombre_completo}
                            </h4>
                            {isAdmin && (
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[8px] font-black uppercase px-2 py-0.5 rounded leading-none shrink-0">
                                Operator
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {driver.telefono || 'Sin celular'}
                          </span>
                        </div>
                      </div>

                      {/* Discret Pencil Edit Button */}
                      <button
                        onClick={() => openEditDriver(driver)}
                        className="p-2 hover:bg-slate-800/45 border border-transparent hover:border-slate-700/60 rounded-lg text-slate-400 hover:text-sky-400 transition cursor-pointer ml-1"
                        title="Ficha y Caja Chica"
                      >
                        <Edit className="w-3.5 h-3.5 stroke-[1.2]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ESTADO DE CAMIONES FLEET CARD */}
            <div className="bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-4 shadow-2xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400" />
                    Fichas Físicas de Camiones
                  </h3>
                  <p className="text-[10px] text-slate-200">Kilometrajes y Alertas de Taller.</p>
                </div>
                <span className="text-[9.5px] text-slate-200 font-mono bg-white/10 border border-white/20 px-2.5 py-0.5 rounded">
                  {camiones.length} activos
                </span>
              </div>

              {/* Toggle Filters */}
              <div className="flex gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
                {(['todos', 'Activo', 'Mantenimiento'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTruckFilterActive(filter)}
                    className={`flex-1 py-1.5 text-[9px] uppercase font-black rounded-lg transition cursor-pointer text-center ${
                      truckFilterActive === filter
                        ? 'bg-sky-500/20 text-sky-450 border border-sky-500/30 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`}
                  >
                    {filter === 'todos' ? 'TODOS' : filter === 'Activo' ? 'EN CARRETERA' : 'TALLER / FALTA'}
                  </button>
                ))}
              </div>

              {/* Camiones list with elastic transition */}
              <div ref={trucksListRef} className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredTrucks.map((truck, idx) => (
                  <div
                    key={`${truck.id_camion}-${truck.modelo}-${idx}`}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-900/40 hover:bg-[#131d35]/65 border border-slate-800/40 hover:border-sky-500/20 transition duration-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                        <Truck className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-100 text-xs truncate max-w-[170px]" title={truck.modelo}>
                          {truck.modelo}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] text-slate-400 font-mono">
                          <span className="text-sky-300 font-bold bg-sky-500/15 border border-sky-500/20 px-1 py-0.2 rounded">{truck.id_camion}</span>
                          <span>•</span>
                          <span>{safeParse(truck.kilometraje_actual).toLocaleString()} KM</span>
                          <span>•</span>
                          <span className={truck.estado === 'Activo' ? 'text-emerald-400' : 'text-amber-500'}>
                            {truck.estado}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                          {safeParse(truck.saldo_presupuesto).toLocaleString('es-BO')} BOB
                        </span>
                      </div>
                      {/* Discrete Pencil Edit Icon */}
                      <button
                        onClick={() => openEditTruck(truck)}
                        className="p-1.5 hover:bg-slate-800/45 border border-transparent hover:border-slate-700/60 rounded-lg text-slate-400 hover:text-sky-400 transition cursor-pointer"
                        title="Ficha Técnica"
                      >
                        <Edit className="w-3.5 h-3.5 stroke-[1.2]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* REGISTER TRAJECTORY / ROUTE QUICK FORM */}
            <div className="bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-4 shadow-2xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
              <h3 className="font-extrabold text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/[0.05] pb-2.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Registrar Tarifa de Trayecto
              </h3>
              <form onSubmit={handleCreateRouteSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Origen</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: Oruro"
                      value={origen}
                      onChange={(e) => setOrigen(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Destino</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: Santiago..."
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block uppercase font-bold">Tarifa Base por Carga Completa (BOB)</label>
                  <div className="flex gap-2.5">
                    <input
                      type="number"
                      required
                      placeholder="ej: 7500"
                      value={tarifaBase}
                      onChange={(e) => setTarifaBase(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={isCreatingRoute}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-[10px] uppercase px-4.5 rounded-lg text-xs cursor-pointer transition shrink-0 flex items-center justify-center shadow-md shadow-emerald-950/20"
                    >
                      {isCreatingRoute ? '...' : 'Crear'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* REGISTER NEW TRUCK QUICK FORM */}
            <div className="bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] p-6 rounded-2xl space-y-4 shadow-2xl transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
              <h3 className="font-extrabold text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/[0.05] pb-2.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                Registrar Ficha Vehicular
              </h3>
              <form onSubmit={handleCreateTruckSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block uppercase font-bold">Modelo del Vehículo</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Scania R500"
                    value={camionModelo}
                    onChange={(e) => setCamionModelo(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Placa / Patente</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 4893-XCS"
                      value={camionPlaca}
                      onChange={(e) => setCamionPlaca(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition uppercase font-mono"
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
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Año Fabricación</label>
                    <input
                      type="number"
                      required
                      placeholder="ej: 2023"
                      value={camionAnio}
                      onChange={(e) => setCamionAnio(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Odómetro Inicial (KM)</label>
                    <input
                      type="number"
                      required
                      placeholder="ej: 45000"
                      value={camionOdo}
                      onChange={(e) => setCamionOdo(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingTruck}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer text-center shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5"
                >
                  {isCreatingTruck ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Registrando Ficha...</span>
                    </>
                  ) : (
                    <span>Habilitar Nueva Unidad Móvil</span>
                  )}
                </button>
              </form>
            </div>
            </div>
          </div>
          )}

          {activeTab === 'historial' && (
            <div className="max-w-5xl mx-auto animate-fade-in">
              {/* BÓVEDA DE VIAJES (Historial) */}
              <TripHistoryArchive 
                viajes={viajes}
                choferes={choferes}
                rutas={rutas}
                gastos={gastos}
                onOpenDetails={(viaje) => {
                  setSelectedRouteViaje(viaje);
                  setIsRouteDetailOpen(true);
                }}
              />
            </div>
          )}
        </div>

      </div>

      {/* SLIDE OVER REUSABLE PANEL */}
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

      {/* DETAILED PROFILE POPUP OVERLAY */}
      <AnimatePresence>
        {selectedDriver && (
          <div className="fixed inset-0 z-40 bg-white/90 backdrop-blur-md flex items-center justify-center p-4">
            <ChoferProfileCard
              chofer={selectedDriver}
              gastos={gastos}
              onResetBalance={handleResetDriverBalance}
              onEditPermissions={(drv) => {
                setSelectedDriver(null);
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
          <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateDriverSubmit}
              className="w-full max-w-sm bg-white border border-slate-200/50 rounded-3xl p-6 space-y-4 shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-t-3xl" />
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <h3 className="text-slate-900 font-black text-sm uppercase flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Agregar Nuevo Chofer
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="text-slate-700 hover:text-slate-900 p-1 hover:bg-[#1e2943] rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 uppercase font-bold block tracking-wide">Nombre de Conductor</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Walter Melgarejo"
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-sm focus:border-blue-300 text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 uppercase font-bold block tracking-wide">ID Alfanumérico</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: walter_mel"
                    value={newDriverId}
                    onChange={e => setNewDriverId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-sm focus:border-blue-300 font-mono text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-xs text-slate-700 uppercase font-bold block tracking-wide">PIN de Carretera (4 dig)</label>
                  <div className="relative">
                    <input
                      type={showDriverPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      required
                      placeholder="ej: 9021"
                      value={newDriverPin}
                      onChange={e => setNewDriverPin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/60 p-3 pr-10 rounded-xl text-sm focus:border-blue-300 font-mono text-slate-900 tracking-[0.2em] text-center outline-none"
                    />
                    <button 
                      type="button" 
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                      onClick={() => setShowDriverPin(!showDriverPin)}
                    >
                      {showDriverPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 uppercase font-bold block tracking-wide">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="ej: 79234567"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-sm focus:border-blue-300 text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 uppercase font-bold block tracking-wide">Presupuesto Mensual (Bs)</label>
                  <input
                    type="number"
                    value={newDriverBudget}
                    onChange={e => setNewDriverBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-sm focus:border-blue-300 font-mono text-blue-600 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="w-full bg-slate-100 hover:bg-[#1e2943] border border-slate-200/60 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDriver}
                  className="w-full bg-blue-500 hover:bg-indigo-455 active:bg-blue-600 text-slate-950 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  {isCreatingDriver ? (
                    <Sparkles className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Crear Chofer</span>
                  )}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <RouteDetailDrawer
        isOpen={isRouteDetailOpen}
        onClose={() => {
          setIsRouteDetailOpen(false);
          setSelectedRouteViaje(null);
        }}
        viaje={selectedRouteViaje}
        choferes={choferes}
        camiones={camiones}
        rutas={rutas}
        gastos={gastos}
        onDeleteViaje={handleDeleteViaje}
      />

    </div>
  );
}
