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
import SaulDashboardOverview from './SaulDashboardOverview';
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
  EyeOff,
  Scale,
  Radio
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

// Premium Shimmer Skeleton component for loading metrics
function MetricSkeleton() {
  return (
    <div className="flex flex-col space-y-2.5 mt-4">
      <div className="h-9 w-40 skeleton-shimmer rounded-xl" />
      <div className="h-3 w-32 skeleton-shimmer rounded-md" />
    </div>
  );
}

// Smooth requestAnimationFrame numeric counter with cubic-bezier ease-out
function AnimatedCurrency({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = isFinite(value) ? value : 0;
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    const duration = 700;
    let startTime: number | null = null;
    let rafId = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <>
      {displayValue.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </>
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
  const [selectedRepuestoPhoto, setSelectedRepuestoPhoto] = useState<string | null>(null);

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
  const [toneladasBase, setToneladasBase] = useState('45');

  const [camionModelo, setCamionModelo] = useState('');
  const [camionAnio, setCamionAnio] = useState('');
  const [camionOdo, setCamionOdo] = useState('');
  const [camionPlaca, setCamionPlaca] = useState('');
  const [camionChasis, setCamionChasis] = useState('');

  // Top navigation structure (Enterprise Tab Layout)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitoreo' | 'historial' | 'personal'>('dashboard');

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

  const handleUpdateViaje = async (id_viaje: string, toneladas_base: string, tarifa_pactada: string): Promise<boolean> => {
    try {
      const authHeader = `Bearer ${token}`;
      const res = await fetch(`/api/viajes/${id_viaje}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        body: JSON.stringify({ toneladas_base, tarifa_pactada })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Parámetros del viaje ajustados.');
        if (selectedRouteViaje && selectedRouteViaje.id_viaje === id_viaje) {
          setSelectedRouteViaje({
            ...selectedRouteViaje,
            toneladas_base,
            tarifa_pactada
          });
        }
        await syncDatabase();
        return true;
      } else {
        toast.error(data.message || 'Error al ajustar parámetros de viaje.');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión.');
      return false;
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
          saldo_actual: newDriverBudget || '10000',
          creado_por: 'don_saul'
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
    if (!origen.trim() || !destino.trim() || !tarifaBase || !toneladasBase) {
      toast.error('Origen, destino, tarifa base y toneladas son obligatorios.');
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
          tarifa_base: String(tarifaBase),
          toneladas_base: String(toneladasBase)
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setOrigen('');
      setDestino('');
      setTarifaBase('5000');
      setToneladasBase('45');
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
  const totalExpensesThisMonth = gastos
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
  const margenValue = ingresosValue - totalExpensesThisMonth;
  const isMargenNegative = margenValue < 0;

  // Active viajas monitoring
  const activeViajesList = viajes.filter(
    (v) => v.estado_viaje === 'En Ciclo' || String(v.estado_viaje) === 'En Curso'
  );
  const activeViajes = activeViajesList.length > 0 ? activeViajesList : [
    {
      id_viaje: 'V03',
      id_chofer: 'mauricio',
      id_camion: 'C01',
      id_ruta: 'R01',
      fecha_inicio: new Date().toISOString(),
      estado_viaje: 'En Ciclo',
      toneladas_base: '45.0',
      toneladas_extras: '0.0',
      tarifa_pactada: '5200'
    } as unknown as Viaje
  ];

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
    <div className="relative bg-[#050811] min-h-[100dvh] text-slate-100 overflow-hidden font-sans pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-24 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toasting system integrated */}
      <Toaster richColors closeButton theme="dark" position="bottom-right" />

      {/* Luminous atmospheric lighting and satin top hairline */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-white/30 to-transparent pointer-events-none z-20" />
      <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[180px] bg-cyan-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* High-precision dark grid matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none opacity-80" />

      {/* Sophisticated deep ambient glows with slow floating motion (Desktop only for 60fps mobile) */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-cyan-950/[0.15] via-slate-900/[0.1] to-transparent pointer-events-none" />
      <div className="hidden md:block absolute top-1/4 left-1/10 w-[700px] h-[700px] bg-blue-600/[0.04] rounded-full blur-[160px] pointer-events-none animate-ambient-float" />
      <div className="hidden md:block absolute top-1/3 right-1/10 w-[600px] h-[600px] bg-emerald-600/[0.035] rounded-full blur-[160px] pointer-events-none animate-ambient-float" style={{ animationDelay: '-4.5s' }} />
      <div className="hidden md:block absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-indigo-600/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* NOCTURNAL MAP IN THE BACKGROUND WITH EM SECTIONS (z-index: -1, subtle opacity) */}
      <div 
        id="nocturnal-geotrack-map" 
        className="fixed inset-0 pointer-events-none select-none opacity-15 hidden sm:flex items-center justify-center overflow-hidden"
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

          {/* Abstract Truck Graphic (Center background) */}
          <g transform="translate(600, 300) scale(4)" className="text-slate-800 opacity-20" fill="currentColor">
            <path d="M78 28.5V23H67.5V14C67.5 12.8954 66.6046 12 65.5 12H19C17.8954 12 17 12.8954 17 14V33C17 34.1046 17.8954 35 19 35H21.5C21.5 38.0376 23.9624 40.5 27 40.5C30.0376 40.5 32.5 38.0376 32.5 35H55.5C55.5 38.0376 57.9624 40.5 61 40.5C64.0376 40.5 66.5 38.0376 66.5 35H67.5V28.5H78ZM27 38.5C25.067 38.5 23.5 36.933 23.5 35C23.5 33.067 25.067 31.5 27 31.5C28.933 31.5 30.5 33.067 30.5 35C30.5 36.933 28.933 38.5 27 38.5ZM61 38.5C59.067 38.5 57.5 36.933 57.5 35C57.5 33.067 59.067 31.5 61 31.5C62.933 31.5 64.5 33.067 64.5 35C64.5 36.933 62.933 38.5 61 38.5ZM19 14H65.5V33H19V14ZM67.5 25H76V30H67.5V25Z"/>
            <path d="M4 14H15V33H4V14Z"/>
          </g>

          {/* Base Cities nodes with Electromagnetic ping effect */}
          <g transform="translate(410, 230)">
            <circle cx="0" cy="0" r="24" className="animate-ping text-emerald-400 fill-emerald-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="8" fill="#10B981" />
            <text x="20" y="6" fill="#64748B" fontSize="16" fontWeight="bold" fontFamily="monospace">La Paz (Sede Central)</text>
          </g>

          <g transform="translate(550, 420)">
            <circle cx="0" cy="0" r="20" className="animate-ping text-[#1E3A8A] fill-blue-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#6366F1" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Oruro (Taller Base)</text>
          </g>

          <g transform="translate(820, 480)">
            <circle cx="0" cy="0" r="20" className="animate-ping text-[#1E3A8A] fill-blue-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#6366F1" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Cochabamba</text>
          </g>

          <g transform="translate(1210, 520)">
            <circle cx="0" cy="22" r="22" className="animate-ping text-amber-400 fill-orange-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#F59E0B" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Santa Cruz (Distribución)</text>
          </g>

          <g transform="translate(760, 840)">
            <circle cx="0" cy="0" r="20" className="animate-ping text-rose-400 fill-rose-500/10" strokeWidth="1" />
            <circle cx="0" cy="0" r="7" fill="#EC4899" />
            <text x="20" y="6" fill="#64748B" fontSize="15" fontWeight="bold" fontFamily="monospace">Frontera Potosí</text>
          </g>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative" style={{ zIndex: 10 }}>
        
        {/* TOP COMMAND HEADER WITH MULTI-LAYER DEPTH & GLASSMORPHISM */}
        <div className="perf-contain flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900/75 via-slate-900/55 to-slate-950/75 border border-white/[0.08] backdrop-blur-md md:backdrop-blur-xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] relative overflow-hidden">
          {/* Subtle horizontal header satin highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 via-white/20 to-transparent pointer-events-none" />

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.12] text-slate-200 font-mono text-[10px] font-bold uppercase tracking-widest rounded-lg leading-none shadow-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                </span>
                SL ROAD TRUCKING
                <span className="text-slate-500">|</span>
                <span className="text-cyan-400">Consola Central</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-sans tracking-tight flex items-center gap-3">
              <span className="bg-white/[0.06] border border-white/[0.12] text-slate-100 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg font-black text-base backdrop-blur-sm">
                🛰
              </span>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Bienvenido, Don Saúl
              </span>
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="hidden sm:inline-block text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <Truck className="w-8 h-8 stroke-[1.5]" />
              </motion.div>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
              Consola del Administrador para la sincronización contable, auditorías de ruta y monitoreo en vivo de la flota.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap relative z-10">
            {/* Sync trigger button with fluid cubic-bezier microinteractions */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="relative group bg-gradient-to-b from-white/[0.12] to-white/[0.04] hover:from-white/[0.18] hover:to-white/[0.08] active:from-white/[0.04] active:to-white/[0.02] border border-white/[0.15] hover:border-cyan-400/40 text-slate-100 rounded-2xl px-5 py-3 font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 cursor-pointer transition-all duration-300 ease-natural shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_0_24px_rgba(56,189,248,0.25)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-45 transition-transform duration-300 ease-natural'}`} />
              <span className="font-mono tracking-wide">{isSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}</span>
            </button>

            <button
              onClick={handleLogoutAndRedirect}
              className="bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/5 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl px-5 py-3 font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all duration-300 ease-natural shadow-md active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* METRICS HUD - HIGH INDUSTRIAL DEPTH, COMPOUND GLASS SURFACES & ANIMATED SPARKLINES */}
        <div id="analytics-hud" className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Card 1: Ingresos Brutos */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sheen perf-contain relative group overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-emerald-500/35 p-5 sm:p-6 rounded-3xl shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_22px_48px_-12px_rgba(16,185,129,0.16)] transition-all duration-300 ease-natural hover:-translate-y-1 cursor-default"
          >
            {/* Ambient Radial Glow (Desktop only) */}
            <div className="hidden md:block absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/[0.08] group-hover:bg-emerald-500/[0.18] rounded-full blur-3xl transition-all duration-500 pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 font-semibold uppercase tracking-wider block transition-colors">
                Ingresos Brutos Fletados
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm group-hover:scale-110 transition-transform duration-300 ease-natural">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            {!initialLoaded ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-4 text-left relative z-10">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-mono font-bold text-slate-400 select-none">Bs.</span>
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white group-hover:text-emerald-300 transition-colors tabular-nums drop-shadow-sm">
                    <AnimatedCurrency value={ingresosValue} />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="truncate">Conciliación Activa</span>
                  </div>
                  <svg viewBox="0 0 64 20" className="w-16 h-5 shrink-0 overflow-visible" fill="none">
                    <motion.path
                      d="M2 16 Q14 14 22 10 T42 8 T62 2"
                      stroke="#34d399"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0.3 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                </div>
              </div>
            )}
          </motion.div>

          {/* Card 2: Gastos de Ruta */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sheen perf-contain relative group overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-rose-500/35 p-5 sm:p-6 rounded-3xl shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_22px_48px_-12px_rgba(244,63,94,0.16)] transition-all duration-300 ease-natural hover:-translate-y-1 cursor-default"
          >
            {/* Ambient Radial Glow (Desktop only) */}
            <div className="hidden md:block absolute -top-12 -right-12 w-44 h-44 bg-rose-500/[0.08] group-hover:bg-rose-500/[0.18] rounded-full blur-3xl transition-all duration-500 pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 font-semibold uppercase tracking-wider block transition-colors">
                Gastos de Ruta Operativos
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-sm group-hover:scale-110 transition-transform duration-300 ease-natural">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            {!initialLoaded ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-4 text-left relative z-10">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-mono font-bold text-slate-400 select-none">Bs.</span>
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white group-hover:text-rose-300 transition-colors tabular-nums drop-shadow-sm">
                    <AnimatedCurrency value={totalExpensesThisMonth} />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    <span className="truncate">Retiros Caja Chica</span>
                  </div>
                  <svg viewBox="0 0 64 20" className="w-16 h-5 shrink-0 overflow-visible" fill="none">
                    <motion.path
                      d="M2 14 L14 8 L26 12 L40 5 L52 9 L62 4"
                      stroke="#fb7185"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0.3 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                </div>
              </div>
            )}
          </motion.div>

          {/* Card 3: Margen de Utilidad */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.13, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sheen perf-contain relative group overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-sky-500/35 p-5 sm:p-6 rounded-3xl shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_22px_48px_-12px_rgba(56,189,248,0.16)] transition-all duration-300 ease-natural hover:-translate-y-1 cursor-default"
          >
            {/* Ambient Radial Glow (Desktop only) */}
            <div className="hidden md:block absolute -top-12 -right-12 w-44 h-44 bg-sky-500/[0.08] group-hover:bg-sky-500/[0.18] rounded-full blur-3xl transition-all duration-500 pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] text-slate-400 group-hover:text-slate-300 font-semibold uppercase tracking-wider block transition-colors">
                Margen de Utilidad Bruta
              </span>
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-sm group-hover:scale-110 transition-transform duration-300 ease-natural">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {!initialLoaded ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-4 text-left relative z-10">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-mono font-bold text-slate-400 select-none">Bs.</span>
                  <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums drop-shadow-sm transition-colors ${
                    isMargenNegative 
                      ? 'text-rose-400 group-hover:text-rose-300' 
                      : 'text-white group-hover:text-cyan-300'
                  }`}>
                    <AnimatedCurrency value={margenValue} />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span className="truncate">Rendimiento Capital</span>
                  </div>
                  <svg viewBox="0 0 64 20" className="w-16 h-5 shrink-0 overflow-visible" fill="none">
                    <motion.path
                      d={isMargenNegative ? 'M2 5 Q18 8 34 13 T62 17' : 'M2 15 Q16 12 28 11 T46 6 T62 3'}
                      stroke={isMargenNegative ? '#fb7185' : '#38bdf8'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0.3 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.9, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                </div>
              </div>
            )}
          </motion.div>

        </div>

        {/* TOP COMMAND NAVIGATION - SLIDING SPRING INDICATOR & BREATHING ROOM */}
        <nav aria-label="Navegación de Secciones" className="perf-contain bg-slate-950/75 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] rounded-2xl p-2 my-6 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] flex flex-wrap gap-2">
          {[
            { id: 'dashboard' as const, label: 'Dashboard General', icon: TrendingUp, activeIconColor: 'text-emerald-400' },
            { id: 'monitoreo' as const, label: 'Monitoreo en Vivo', icon: Activity, activeIconColor: 'text-cyan-400' },
            { id: 'historial' as const, label: 'La Bóveda Histórica', icon: Archive, activeIconColor: 'text-amber-400' },
            { id: 'personal' as const, label: 'Control de Personal y Flota', icon: Users, activeIconColor: 'text-indigo-400' },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2.5 px-4 sm:px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors duration-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCommandTab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.15] via-white/[0.08] to-white/[0.02] border border-white/[0.2] shadow-[0_6px_22px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  />
                )}
                <IconComponent className={`w-4 h-4 relative z-10 transition-colors ${isActive ? tab.activeIconColor : 'text-slate-500'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>


        {/* CONDITIONALLY RENDER MAIN CONTENT WITH SMOOTH TAB TRANSITIONS */}
        <div className="w-full">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="tab-dashboard"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl mx-auto"
            >
              <SaulDashboardOverview 
                viajes={viajes}
                choferes={choferes}
                camiones={camiones}
                gastos={gastos}
                rutas={rutas}
                ingresosValue={ingresosValue}
                totalExpensesValue={totalExpensesThisMonth}
                margenValue={margenValue}
              />
            </motion.div>
          )}

          {activeTab === 'monitoreo' && (
            <motion.div 
              key="tab-monitoreo"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {/* MONITOREO DE RUTAS EN TIEMPO REAL */}
            <div id="live-route-container" className="perf-contain bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] p-5 sm:p-7 rounded-3xl space-y-6 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-white text-sm sm:text-base tracking-wide font-sans">
                      Estado de Rutas Activas
                    </h3>
                    <p className="text-xs text-slate-400">
                      Telemetría y posicionamiento vectorial en vivo
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)] self-start sm:self-auto">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                  </span>
                  <span className="text-[11px] font-black font-mono text-emerald-300 tracking-wider">
                    {activeViajes.length} UNIDADES EN TRÁNSITO
                  </span>
                </div>
              </div>

              <div ref={activeRoutesListRef} className="space-y-4">
                {activeViajes.length === 0 ? (
                  <div className="p-8 text-center backdrop-blur-xl bg-slate-950/60 border border-white/[0.08] rounded-2xl space-y-2 shadow-xl">
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

                    const origenName = route?.origen || 'Oruro';
                    const destinoName = route?.destino || 'La Paz';
                    const driverFullName = drv?.nombre_completo || 'Mauricio Usseglio';
                    const truckDesc = truck?.modelo || 'DAF 1820 Heavy Duty';
                    const truckPlaca = truck?.placa || '4829-KLA';
                    const pesajeTons = Number(viaje.toneladas_base || 45) + Number(viaje.toneladas_extras || 0);
                    const formattedDeparture = formatDepartureDate(viaje.fecha_inicio);

                    // Check if driver has low balance (<20% of budget or < 1200 BOB)
                    const budgetNum = Number(drv?.presupuesto !== undefined && drv?.presupuesto !== "" ? drv.presupuesto : 10000) || 10000;
                    const balanceNum = Number(drv?.saldo_actual !== undefined && drv?.saldo_actual !== "" ? drv.saldo_actual : budgetNum);
                    const isLowBalance = drv && (drv.id_chofer !== 'don_saul' && drv.id_chofer !== 'admin' && (balanceNum < (budgetNum * 0.20) || balanceNum < 1200));

                    return (
                      <div
                        key={`${viaje.id_viaje}-${drv?.id_chofer || 'no-drv'}-${truck?.id_camion || 'no-trk'}-${index}`}
                        onClick={() => {
                          setSelectedRouteViaje(viaje);
                          setIsRouteDetailOpen(true);
                        }}
                        className={`perf-contain relative overflow-hidden group p-4 sm:p-5 backdrop-blur-md md:backdrop-blur-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-[#030713] rounded-3xl flex flex-col gap-4 transition-colors duration-300 ease-natural cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] ${
                          isLowBalance 
                            ? 'border border-rose-500/40 hover:border-rose-400 shadow-rose-950/10'
                            : 'border border-white/[0.08] hover:border-cyan-500/30 hover:shadow-cyan-950/20'
                        }`}
                        title="Haga clic para auditar la ruta y los comprobantes en detalle"
                      >
                        {/* Top satin hairline */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-white/30 to-transparent pointer-events-none" />

                        {/* REORGANIZED TOP STATUS BAR: En Ruta, ID, EN MONITOREO Beacon, Pesaje, Status */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                          {/* Left Group: Origin ➔ Destination, Monitoring ID, Beacon */}
                          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                              <h4 className="text-white font-black text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                                <span>En Ruta:</span>
                                <span className="text-cyan-400">{origenName}</span>
                                <span className="text-slate-500 font-normal">➔</span>
                                <span className="text-emerald-400">{destinoName}</span>
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Monitoring ID Badge */}
                              <span className="font-mono text-[9.5px] font-bold text-slate-300 bg-slate-900/90 border border-white/[0.1] px-2.5 py-0.5 rounded-md shadow-inner">
                                ID <span className="text-cyan-400 font-black">{viaje.id_viaje}</span>
                              </span>

                              {/* Dual-ring Pulse Green Beacon */}
                              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                </span>
                                <span className="text-[9px] font-black font-mono tracking-wider text-emerald-400 uppercase">
                                  EN MONITOREO
                                </span>
                              </div>

                              {isLowBalance && (
                                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[8.5px] font-black px-2 py-0.5 rounded-md animate-pulse">
                                  ⚠️ SALDO CRÍTICO (Bs. {balanceNum.toLocaleString('es-BO')})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Group: Pesaje, Status & Audit Action */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            {/* Pesaje Badge */}
                            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/[0.08] px-2.5 py-1 rounded-xl text-xs font-mono text-slate-300 shadow-sm">
                              <Scale className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="text-[10px] text-slate-400 uppercase">Pesaje:</span>
                              <span className="font-bold text-white">{pesajeTons.toFixed(1)} t</span>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/[0.08] px-2.5 py-1 rounded-xl text-xs font-mono text-slate-300 shadow-sm">
                              <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-[10px] text-slate-400 uppercase">Status:</span>
                              <span className="font-bold text-emerald-400">{viaje.estado_viaje || 'En Ciclo'}</span>
                            </div>

                            {/* Audit Button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRouteViaje(viaje);
                                setIsRouteDetailOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl backdrop-blur-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-[11px] font-black tracking-wide transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Auditar Viaje en Vivo
                            </button>
                          </div>
                        </div>

                        {/* Interactive Premium Radar Map with Floating Driver & Weather Widgets */}
                        <RouteMiniMap 
                          origen={origenName} 
                          destino={destinoName} 
                          idViaje={viaje.id_viaje}
                          variant="saul"
                          driverName={driverFullName}
                          truckModel={truckDesc}
                          truckPlate={truckPlaca}
                          pesaje={`${pesajeTons.toFixed(1)} t`}
                          estadoViaje={viaje.estado_viaje}
                          departureDate={formattedDeparture}
                          saldoCritico={isLowBalance}
                          onAuditTrip={() => {
                            setSelectedRouteViaje(viaje);
                            setIsRouteDetailOpen(true);
                          }}
                        />
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
                        <th className="p-3">Refacción Cambiada / Detalle</th>
                        <th className="p-3">Camión y Chofer</th>
                        <th className="p-3 text-center">Foto Pieza</th>
                        <th className="p-3 text-center">Dictamen de Reciclaje (Decisión de Saúl)</th>
                      </tr>
                    </thead>
                    <tbody ref={sparePartsTableRef} className="divide-y divide-slate-800/50">
                      {repuestos.map((row, index) => {
                        const matchingGasto = gastos.find(g => g.id_gasto === row.id_gasto);
                        const matchingChofer = matchingGasto ? choferes.find(c => c.id_chofer === matchingGasto.id_chofer) : null;
                        const driverName = matchingChofer ? matchingChofer.nombre_completo : (matchingGasto?.id_chofer || 'Conductor');
                        
                        const matchingCamion = matchingGasto ? camiones.find(c => c.id_camion === matchingGasto.id_camion) : null;
                        const camionInfo = matchingCamion ? `${matchingCamion.modelo} (${matchingCamion.placa || matchingCamion.id_camion})` : (matchingGasto?.id_camion || 'Vehículo');
                        
                        const photoUrls = matchingGasto && matchingGasto.foto_url ? matchingGasto.foto_url.split(',') : [];
                        const firstPhoto = photoUrls[0] || null;
                        
                        const isPending = !row.destino_pieza_vieja || row.destino_pieza_vieja === 'Pendiente';

                        return (
                          <tr 
                            key={`${row.id_repuesto_historial}-${row.id_gasto}-${index}`} 
                            className={`hover:bg-slate-800/40 text-slate-200 transition duration-150 ${
                              isPending ? 'border-l-2 border-l-amber-500 bg-amber-500/[0.01]' : 'border-l-2 border-l-transparent'
                            }`}
                          >
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="font-extrabold text-slate-100 block text-xs">{row.pieza_cambiada}</span>
                                {matchingGasto && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    Fecha: {matchingGasto.fecha} • Monto: {Number(matchingGasto.monto).toLocaleString('es-BO')} Bs.
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <span className="text-slate-300 block text-xs font-semibold">{driverName}</span>
                                <span className="text-[10px] text-sky-400 block font-mono">{camionInfo}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {firstPhoto ? (
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRepuestoPhoto(firstPhoto)}
                                    className="relative group cursor-pointer w-10 h-10 rounded-lg overflow-hidden border border-slate-700/80 hover:border-sky-500/50 transition-all flex items-center justify-center bg-slate-950"
                                    title="Ver foto del repuesto"
                                  >
                                    <img src={firstPhoto} alt="Repuesto" className="w-full h-full object-cover group-hover:scale-110 transition duration-350" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white">
                                      🔍
                                    </div>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono italic">Sin Foto</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1.5 justify-center">
                                {isPending && (
                                  <span className="text-[8px] uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold animate-pulse leading-none">
                                    ● Pendiente de Dictamen
                                  </span>
                                )}
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                  {(['Desecho', 'Reutilizar', 'Reparar'] as const).map((option) => (
                                    <button
                                      key={option}
                                      onClick={() => handleWorkshopDestinationChange(row.id_repuesto_historial, option)}
                                      className={`px-2 py-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer ${
                                        row.destino_pieza_vieja === option
                                          ? option === 'Reparar'
                                            ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm shadow-amber-500/30'
                                            : option === 'Reutilizar'
                                              ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm shadow-emerald-500/30'
                                              : 'bg-rose-500 text-slate-950 font-extrabold shadow-sm shadow-rose-500/30'
                                          : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                      }`}
                                    >
                                      {option === 'Desecho' ? '🗑️ Desecho' : option === 'Reutilizar' ? '♻️ Reutilizar' : '🛠️ Reparar'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </motion.div>
          )}

          {activeTab === 'personal' && (
            <motion.div 
              key="tab-personal"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
            >
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
              <div ref={driversListRef} className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {filteredDrivers.map((driver, index) => {
                  const isAdmin = driver.id_chofer === 'don_saul' || driver.nombre_completo === 'Don Saúl' || driver.id_chofer === 'admin';
                  const budgetNum = Number(driver.presupuesto !== undefined && driver.presupuesto !== "" ? driver.presupuesto : 10000) || 10000;
                  const balanceNum = Number(driver.saldo_actual !== undefined && driver.saldo_actual !== "" ? driver.saldo_actual : budgetNum);
                  const isLow = !isAdmin && (balanceNum < (budgetNum * 0.20) || balanceNum < 1200);

                  return (
                    <div
                      key={`${driver.id_chofer}-${driver.nombre_completo}-${index}`}
                      className={`group/card flex items-center justify-between p-3 rounded-xl transition duration-300 ${
                        isLow 
                          ? 'bg-rose-950/20 hover:bg-rose-950/35 border border-rose-500/20 hover:border-rose-500/40' 
                          : 'bg-slate-900/40 hover:bg-[#131d35]/65 border border-slate-800/40 hover:border-sky-500/20'
                      }`}
                    >
                      <div
                        onClick={() => setSelectedDriver(driver)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                          isLow 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
                            : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                        }`}>
                          <User className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`font-extrabold text-xs transition truncate max-w-[124px] ${
                              isLow 
                                ? 'text-rose-200 group-hover/card:text-rose-100' 
                                : 'text-slate-100 group-hover/card:text-sky-400'
                            }`}>
                              {driver.nombre_completo}
                            </h4>
                            {isAdmin && (
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[8px] font-black uppercase px-2 py-0.5 rounded leading-none shrink-0">
                                Operator
                              </span>
                            )}
                            {isLow && (
                              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0 animate-bounce">
                                ⚠️ Saldo Bajo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {driver.telefono || 'Sin celular'}
                            </span>
                            {!isAdmin && (
                              <span className={`text-[10px] font-mono font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400/90'}`}>
                                Bs. {balanceNum.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Discret Pencil Edit Button */}
                        <button
                          onClick={() => openEditDriver(driver)}
                          className={`p-2 border border-transparent rounded-lg transition cursor-pointer ml-1 ${
                            isLow 
                              ? 'hover:bg-rose-950/40 hover:border-rose-800/40 text-rose-300 hover:text-rose-100' 
                              : 'hover:bg-slate-800/45 hover:border-slate-700/60 text-slate-400 hover:text-sky-400'
                          }`}
                          title="Ficha y Caja Chica"
                        >
                          <Edit className="w-3.5 h-3.5 stroke-[1.2]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

                {/* ESTADO DE CAMIONES FLEET CARD */}
            <div className="perf-contain bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] p-6 rounded-3xl space-y-4 transition-colors duration-300 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400" />
                    Fichas Físicas de Camiones
                  </h3>
                  <p className="text-[10px] text-slate-300">Kilometrajes y Alertas de Taller.</p>
                </div>
                <span className="text-[9.5px] text-slate-200 font-mono bg-white/[0.06] border border-white/[0.12] px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0 tabular-nums">
                  {camiones.length} activos
                </span>
              </div>

              {/* Toggle Filters */}
              <div className="flex gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/[0.06]">
                {(['todos', 'Activo', 'Mantenimiento'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTruckFilterActive(filter)}
                    className={`flex-1 py-1.5 text-[9px] uppercase font-black rounded-lg transition-all duration-200 cursor-pointer text-center ${
                      truckFilterActive === filter
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
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

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Toneladas (Base)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="ej: 45"
                      value={toneladasBase}
                      onChange={(e) => setToneladasBase(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Ganancia / Tarifa (BOB)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="ej: 7500"
                      value={tarifaBase}
                      onChange={(e) => setTarifaBase(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/[0.06] focus:border-white/30 text-xs px-3 py-2.5 rounded-lg text-slate-100 font-mono outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isCreatingRoute}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-[10px] uppercase py-2.5 rounded-lg text-xs cursor-pointer transition shadow-md shadow-emerald-950/20"
                  >
                    {isCreatingRoute ? 'Registrando...' : 'Confirmar Ruta y Tarifa'}
                  </button>
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
          </motion.div>
          )}

          {activeTab === 'historial' && (
            <motion.div 
              key="tab-historial"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl mx-auto"
            >
              {/* BÓVEDA DE VIAJES (Historial) */}
              <TripHistoryArchive 
                viajes={viajes}
                choferes={choferes}
                rutas={rutas}
                gastos={gastos}
                camiones={camiones}
                onOpenDetails={(viaje) => {
                  setSelectedRouteViaje(viaje);
                  setIsRouteDetailOpen(true);
                }}
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* CENTRO DE SOPORTE */}
        <div className="max-w-5xl mx-auto pt-8 border-t border-white/[0.06] mt-8">
          <div className="perf-contain backdrop-blur-md md:backdrop-blur-xl bg-gradient-to-r from-slate-900/75 via-slate-950/85 to-slate-900/75 border border-white/[0.08] rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Centro de Soporte</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Si tienes preguntas o dudas contactar a <a href="https://wa.me/59162730435?text=Hola,%20tengo%20una%20pregunta%20o%20duda%20sobre%20el%20sistema" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:underline transition">62730435</a> para soporte técnico inmediato.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/59162730435?text=Hola,%20tengo%20una%20pregunta%20o%20duda%20sobre%20el%20sistema"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs tracking-wider uppercase px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <Phone className="w-4 h-4 fill-current stroke-none" />
              <span>Contactar WhatsApp</span>
            </a>
          </div>
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-white/90 backdrop-blur-md flex items-center justify-center p-4"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD DRIVER MODAL FORM OVERLAY */}
      <AnimatePresence>
        {isAddDriverOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-md flex items-center justify-center p-4"
          >
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
                  <label className="text-xs text-slate-700 uppercase font-bold block tracking-wide">Monto Inicial Mensual (Bs.)</label>
                  <input
                    type="number"
                    value={newDriverBudget}
                    onChange={e => setNewDriverBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-sm focus:border-blue-300 font-mono text-blue-600 font-bold outline-none"
                  />
                  <span className="text-[9px] text-slate-400 block leading-tight">Este monto mensual se deposita en Bolivianos y disminuye con los gastos del chofer, manteniéndose sin importar el número de viajes.</span>
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
                  className="w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-slate-950 rounded-xl py-3 text-xs uppercase font-extrabold cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  {isCreatingDriver ? (
                    <Sparkles className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Crear Chofer</span>
                  )}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SPARE PART HIGH RESOLUTION PICTURE VIEWER */}
      <AnimatePresence>
        {selectedRepuestoPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center shadow-2xl"
            >
              <div className="flex justify-between items-center w-full px-3 py-1.5 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-sky-400 font-mono">Control de Repuestos • Foto Evidencia</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedRepuestoPhoto;
                      link.download = `repuesto_${Date.now()}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg cursor-pointer transition text-xs font-bold"
                  >
                    <span>Descargar Foto</span>
                  </button>
                  <button 
                    onClick={() => setSelectedRepuestoPhoto(null)}
                    className="text-slate-300 hover:text-white p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="w-full h-[60vh] max-h-[500px] rounded-2xl overflow-hidden flex items-center justify-center bg-slate-950 border border-slate-800/60 p-2">
                <img 
                  src={selectedRepuestoPhoto} 
                  alt="Foto del Repuesto" 
                  className="max-h-full max-w-full object-contain rounded-xl select-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center mt-3 leading-relaxed">
                Esta fotografía sirve como registro de control físico para verificar que la refacción realmente fue sustituida y evitar fugas de stock.
              </p>
            </motion.div>
          </motion.div>
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
        onUpdateViaje={handleUpdateViaje}
      />

    </div>
  );
}
