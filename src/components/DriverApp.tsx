import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  Truck,
  Navigation,
  DollarSign,
  Camera,
  AlertTriangle,
  Wifi,
  WifiOff,
  User,
  LogOut,
  MapPin,
  Play,
  RotateCw,
  Plus,
  Minus,
  CheckCircle,
  FileText,
  Menu,
  X,
  TrendingUp,
  Award,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Camion, Chofer, Ruta, Viaje, Gasto } from '../types';
import RutaCard from './RutaCard';
import GastoForm from './GastoForm';

interface DriverAppProps {
  token: string;
  onLogout: () => void;
  initialDriver?: Chofer | null;
}

export default function DriverApp({ token, onLogout, initialDriver }: DriverAppProps) {
  // Authentication state
  const [pin, setPin] = useState('');
  const [authenticatedDriver, setAuthenticatedDriver] = useState<Chofer | null>(initialDriver || null);
  const [authError, setAuthError] = useState('');
  
  // Multiple files upload holders
  const [fotosPesaje, setFotosPesaje] = useState<string[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [gastoFiles, setGastoFiles] = useState<File[]>([]);
  const [gastoFilesUrls, setGastoFilesUrls] = useState<string[]>([]);
  const [isUploadingGastoFiles, setIsUploadingGastoFiles] = useState(false);


  // Core Data Lists
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [selectedCamionId, setSelectedCamionId] = useState('');

  // Active status
  const [activeViaje, setActiveViaje] = useState<Viaje | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startingRouteId, setStartingRouteId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'info' });

  // Modals & Inputs
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [tipoGasto, setTipoGasto] = useState('Combustible');
  const [montoGasto, setMontoGasto] = useState('');
  const [descGasto, setDescGasto] = useState('');

  // Trip Completion flow
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [kmFinal, setKmFinal] = useState('');
  const [toneladasExtras, setToneladasExtras] = useState(0);
  const [fotoPesaje, setFotoPesaje] = useState<string>(''); // Base64 or URL
  const [isCapturingReal, setIsCapturingReal] = useState(false);

  // Custom Modals for replacing native alerts and window.confirm
  const [modalType, setModalType] = useState<'START_TRIP' | 'NO_PHOTO_CONFIRM' | 'TRIP_SUCCESS' | null>(null);
  const [selectedRutaToStart, setSelectedRutaToStart] = useState<Ruta | null>(null);
  const [tripSummaryData, setTripSummaryData] = useState<{
    valor_extra_total: number;
    bono_chofer: number;
    bono_administrador: number;
  } | null>(null);
  const [expenseModalError, setExpenseModalError] = useState('');
  const [finalizeModalError, setFinalizeModalError] = useState('');

  // Offline Simulator/State Engine
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [offlineAction, setOfflineAction] = useState<any>(null); // holds offline payload to sync

  // Tracks connectivity
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Determine current active online status based on navigator or simulation mode
  const currentNetworkActive = isOnline && !simulateOffline;

  // Refresh lists helper
  const loadDriverData = async (noCache = false) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const authHeader = `Bearer ${token}`;
      const timestamp = noCache ? `?nocache=${Date.now()}` : '';
      
      const [resCamiones, resRutas, resViajes, resChoferes] = await Promise.all([
        fetch(`/api/camiones${timestamp}`, { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch camiones, using fallback empty array:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/rutas${timestamp}`, { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch rutas, using fallback empty array:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/viajes${timestamp}`, { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch voyages, using fallback empty array:', err);
            return { success: false, data: [] };
          }),
        fetch(`/api/choferes${timestamp}`, { headers: { Authorization: authHeader } })
          .then(r => r.json())
          .catch(err => {
            console.warn('[Resilience] Failed to fetch drivers, using fallback empty array:', err);
            return { success: false, data: [] };
          })
      ]);

      if (resCamiones.success) setCamiones(resCamiones.data);
      if (resRutas.success) setRutas(resRutas.data);
      
      if (resChoferes?.success && authenticatedDriver) {
        const liveDriver = resChoferes.data.find((d: Chofer) => d.id_chofer === authenticatedDriver.id_chofer);
        if (liveDriver) {
          setAuthenticatedDriver(liveDriver);
          localStorage.setItem('driver_session_user', JSON.stringify(liveDriver));
        }
      }

      if (resViajes.success && authenticatedDriver) {
        setViajes(resViajes.data);
        const active = resViajes.data.find(
          (v: Viaje) => v.id_chofer === authenticatedDriver.id_chofer && v.estado_viaje === 'En Ciclo'
        );
        if (active) {
          setActiveViaje(active);
          setSelectedCamionId(active.id_camion);
        } else {
          setActiveViaje(null);
        }
      }
    } catch (err) {
      console.error('Error fetching driver context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger loading when driver changes or lists reload
  useEffect(() => {
    if (authenticatedDriver && !camiones.length) {
      loadDriverData(true);
    }
  }, [authenticatedDriver]);

  // Load state from localStorage on load if offline
  useEffect(() => {
    const savedDriver = localStorage.getItem('driver_session_user');
    if (savedDriver) {
      setAuthenticatedDriver(JSON.parse(savedDriver));
    } else if (initialDriver) {
      setAuthenticatedDriver(initialDriver);
    }

    const savedPending = localStorage.getItem('pending_sync_actions');
    if (savedPending) {
      setOfflineAction(JSON.parse(savedPending));
    }
  }, [initialDriver]);

  // Trigger automatic sync if network becomes active
  useEffect(() => {
    if (currentNetworkActive && offlineAction) {
      handleSyncOfflineActions();
    }
  }, [currentNetworkActive, offlineAction]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setAuthError('Introduce un PIN de 4 dígitos.');
      return;
    }
    setAuthError('');
    setIsLoading(true);

    try {
      // Pin based local check bypass if offline
      if (!currentNetworkActive) {
        // Look up saved drivers if any
        const savedOfflineDrivers = localStorage.getItem('offline_drivers_list');
        if (savedOfflineDrivers) {
          const offlineDrivers: Chofer[] = JSON.parse(savedOfflineDrivers);
          const matched = offlineDrivers.find(d => d.pin_acceso === pin && d.estado === 'Activo');
          if (matched) {
            setAuthenticatedDriver(matched);
            localStorage.setItem('driver_session_user', JSON.stringify(matched));
            return;
          }
        }
        
        // Default driver in offline sandbox mode to maintain mock capability
        if (pin === '1234') {
          const mockDriver: Chofer = {
            id_chofer: 'mock-off-1',
            nombre_completo: 'Chofer Offline Alternativo',
            telefono: '77712345',
            pin_acceso: '1234',
            estado: 'Activo'
          };
          setAuthenticatedDriver(mockDriver);
          localStorage.setItem('driver_session_user', JSON.stringify(mockDriver));
          return;
        }
        setAuthError('Modo offline: Usa PIN 1234 para fines de demostración sin conexión.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/choferes/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin })
      });

      const bodyData = await res.json();
      if (bodyData.success) {
        setAuthenticatedDriver(bodyData.chofer);
        localStorage.setItem('driver_session_user', JSON.stringify(bodyData.chofer));
        
        // Cache this logged driver for future offline bypasses
        localStorage.setItem('offline_drivers_list', JSON.stringify([bodyData.chofer]));
      } else {
        setAuthError(bodyData.message || 'Código PIN incorrecto.');
      }
    } catch (err: any) {
      setAuthError('Ocurrió un error de red al iniciar sesión. Compruebe su conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = () => {
    setAuthenticatedDriver(null);
    setActiveViaje(null);
    setPin('');
    localStorage.removeItem('driver_session_user');
    if (onLogout) {
      onLogout();
    }
  };

  // Start trip operation
  const handleStartTrip = (ruta: Ruta) => {
    if (!selectedCamionId) {
      setMessage({ text: 'Por favor, selecciona un camión primero.', type: 'error' });
      return;
    }

    const currentChoferId = authenticatedDriver?.id_chofer;
    const isVehicleBusy = viajes.some(v => v.id_camion === selectedCamionId && v.estado_viaje === 'En Ciclo');
    const isDriverBusy = viajes.some(v => v.id_chofer === currentChoferId && v.estado_viaje === 'En Ciclo');

    if (isVehicleBusy || isDriverBusy) {
      setMessage({ text: '⚠️ Bloqueo de Seguridad: Este conductor o vehículo ya posee un viaje activo en tránsito. Finaliza el ciclo actual antes de iniciar uno nuevo.', type: 'error' });
      return;
    }

    setSelectedRutaToStart(ruta);
    setModalType('START_TRIP');
  };

  const executeStartTrip = async (ruta: Ruta) => {
    if (!ruta || startingRouteId !== null) return;
    setStartingRouteId(ruta.id_ruta);
    setMessage({ text: '', type: 'info' });

    // Verificación de respaldo (Defensa contra latencia)
    const currentChoferId = authenticatedDriver?.id_chofer;
    const isVehicleBusy = viajes.some(v => v.id_camion === selectedCamionId && v.estado_viaje === 'En Ciclo');
    const isDriverBusy = viajes.some(v => v.id_chofer === currentChoferId && v.estado_viaje === 'En Ciclo');
    
    if (isVehicleBusy || isDriverBusy) {
        setMessage({ text: 'Error: Operación rechazada. El camión o chofer ya se encuentran en ruta.', type: 'error' });
        setStartingRouteId(null);
        setModalType(null);
        return;
    }

    try {
      const res = await fetch('/api/viajes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_camion: selectedCamionId,
          id_chofer: authenticatedDriver?.id_chofer,
          id_ruta: ruta.id_ruta,
          id_evento_uuid: crypto.randomUUID(),
          timestamp_registro: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        setActiveViaje(data.data);
        setMessage({ text: '¡Viaje iniciado con éxito! El camión ya se encuentra en ciclo.', type: 'success' });
        loadDriverData(true);
        setModalType(null); // Close on success!
      } else {
        setMessage({ text: data.message || 'No se pudo iniciar el viaje.', type: 'error' });
        setModalType(null); // Close to show error message
      }
    } catch (err) {
      setMessage({ text: 'Error de red. No se pudo conectar al servidor.', type: 'error' });
      setModalType(null);
    } finally {
      setStartingRouteId(null);
    }
  };

  // File picker handler converting images to inline base64 for reliable preview and storage
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setFilesToUpload(prev => [...prev, ...newFiles]);
      
      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFotosPesaje(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      setMessage({ text: `Se agregaron ${files.length} fotos al reporte de pesaje.`, type: 'success' });
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotosPesaje(prev => prev.filter((_, i) => i !== index));
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Modal Fast Expense logic (Rule 4)
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseModalError('');
    if (!montoGasto || Number(montoGasto) <= 0) {
      setExpenseModalError('Introduzca un monto válido.');
      return;
    }

    const availableBalance = Number(
      authenticatedDriver?.saldo_actual !== undefined && authenticatedDriver?.saldo_actual !== ""
        ? authenticatedDriver.saldo_actual
        : (authenticatedDriver?.presupuesto !== undefined && authenticatedDriver?.presupuesto !== "" ? authenticatedDriver.presupuesto : 10000)
    );
    if (Number(montoGasto) > availableBalance) {
      setExpenseModalError('Alerta de saldo: El monto excede tu saldo asignado disponible.');
      return;
    }

    setIsLoading(true);
    let uploadedUrls: string[] = [];
    
    try {
      // 1. Upload receipt photos if any
      if (gastoFiles.length > 0) {
        setIsUploadingGastoFiles(true);
        const formData = new FormData();
        gastoFiles.forEach((file) => {
          formData.append('photos', file);
        });
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.urls) {
          uploadedUrls = uploadData.urls;
        }
      }

      // 2. Prepare full payload with budget subtractor
      const expensePayload = {
        id_viaje: activeViaje?.id_viaje || '',
        id_camion: selectedCamionId,
        id_chofer: authenticatedDriver?.id_chofer || '',
        tipo_gasto: tipoGasto,
        monto: Number(montoGasto),
        descripcion: descGasto || `Compra registrada por conductor ${authenticatedDriver?.nombre_completo}`,
        foto_url: uploadedUrls.join(','),
        id_evento_uuid: crypto.randomUUID(),
        timestamp_registro: new Date().toISOString()
      };

      if (!currentNetworkActive) {
        // Offline fallback: save expense in pendings
        const pendingAction = {
          type: 'EXPENSE',
          payload: expensePayload,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('pending_sync_actions', JSON.stringify(pendingAction));
        setOfflineAction(pendingAction);
        
        setIsGastoModalOpen(false);
        setMontoGasto('');
        setDescGasto('');
        setGastoFiles([]);
        setGastoFilesUrls([]);
        setMessage({ text: 'Offline: Compra guardada localmente. Se sincronizará al recuperar señal.', type: 'success' });
        return;
      }

      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expensePayload)
      });

      const resJson = await res.json();
      if (resJson.success) {
        setMessage({ text: `Compra de ${montoGasto} BOB registrada. El saldo se descontó con éxito.`, type: 'success' });
        setIsGastoModalOpen(false);
        setMontoGasto('');
        setDescGasto('');
        setGastoFiles([]);
        setGastoFilesUrls([]);
        loadDriverData(true);
      } else {
        setMessage({ text: resJson.message || 'Error al guardar compra.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al registrar compra y fotos adjuntas.', type: 'error' });
    } finally {
      setIsUploadingGastoFiles(false);
      setIsLoading(false);
    }
  };

  // Complete/Finalize Trip (Rule 3)
  const handleFinalizeTripSubmit = async () => {
    setFinalizeModalError('');
    if (!kmFinal || Number(kmFinal) <= 0) {
      setFinalizeModalError('Introduzca un Kilometraje final válido.');
      return;
    }

    if (fotosPesaje.length === 0) {
      setModalType('NO_PHOTO_CONFIRM');
      return;
    }

    await executeFinalizeTripSubmit();
  };

  const executeFinalizeTripSubmit = async () => {
    setModalType(null);
    setIsLoading(true);
    let finalFotoUrls = fotosPesaje.join(',');
    
    try {
      if (currentNetworkActive && filesToUpload.length > 0) {
        setMessage({ text: 'Subiendo comprobantes a Cloudinary...', type: 'info' });
        const formData = new FormData();
        filesToUpload.forEach((file) => formData.append('photos', file));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!uploadRes.ok) throw new Error('Error en la subida');
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.urls) {
            finalFotoUrls = uploadData.urls.join(',');
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
             console.warn("Subida de foto lenta, guardando datos de ruta de respaldo...");
          } else {
             throw err;
          }
        }
      }

      const payload = {
        kilometraje_final: Number(kmFinal),
        toneladas_extras: toneladasExtras,
        foto_pesaje_url: finalFotoUrls || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400',
        id_evento_uuid: crypto.randomUUID(),
        timestamp_registro: new Date().toISOString()
      };

      if (!currentNetworkActive) {
        const pendingAction = {
          type: 'FINALIZE_TRIP',
          tripId: activeViaje?.id_viaje,
          payload,
          timestamp: new Date().toISOString()
        };

        localStorage.setItem('pending_sync_actions', JSON.stringify(pendingAction));
        setOfflineAction(pendingAction);
        
        setActiveViaje(null);
        setKmFinal('');
        setToneladasExtras(0);
        setFotosPesaje([]);
        setFilesToUpload([]);
        
        setMessage({
          text: '¡Viaje Terminado Sin Conexión!',
          type: 'success'
        });
        return;
      }

      const res = await fetch(`/api/viajes/${activeViaje?.id_viaje}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      
      if (resData.success) {
        await fetch('/api/cache/clear', { method: 'POST', body: JSON.stringify({ tabs: ['Viajes', 'Camiones', 'Rutas', 'Gastos'] }) }).catch(() => {});
        await loadDriverData(true);
        
        setActiveViaje(null);
        setKmFinal('');
        setToneladasExtras(0);
        setFotosPesaje([]);
        setFilesToUpload([]);
        setModalType('TRIP_SUCCESS');
      } else {
        throw new Error(resData.message || 'Error al finalizar viaje.');
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al finalizar el viaje.', type: 'error' });
    } finally {
      setIsLoading(false);
      setModalType(null);
    }
  };


  // Sync Offline Queue items manually or when connection goes live
  const handleSyncOfflineActions = async () => {
    if (!offlineAction) return;
    setIsLoading(true);
    setMessage({ text: 'Sincronizando registros offline con Google Sheets...', type: 'info' });

    try {
      const authHeader = `Bearer ${token}`;

      if (offlineAction.type === 'EXPENSE') {
        const res = await fetch('/api/gastos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(offlineAction.payload)
        });
        const resJson = await res.json();
        if (resJson.success) {
          setMessage({ text: '¡Sincronización Completa! Tu Gasto Offline ha sido guardado.', type: 'success' });
          localStorage.removeItem('pending_sync_actions');
          setOfflineAction(null);
          loadDriverData(true);
        } else {
          setMessage({ text: 'No se pudo sincronizar el gasto: ' + resJson.message, type: 'error' });
        }
      } 
      else if (offlineAction.type === 'FINALIZE_TRIP') {
        const res = await fetch(`/api/viajes/${offlineAction.tripId}/finalizar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(offlineAction.payload)
        });
        const resJson = await res.json();
        if (resJson.success) {
          setMessage({ text: '¡Sincronización exitosa! Tu reporte de pesaje y viaje offline fue guardado en la nube.', type: 'success' });
          localStorage.removeItem('pending_sync_actions');
          setOfflineAction(null);
          loadDriverData(true);
        } else {
          setMessage({ text: 'No se pudo sincronizar el viaje: ' + resJson.message, type: 'error' });
        }
      }
    } catch (err: any) {
      setMessage({ text: 'La sincronización falló. Volveremos a intentar.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Auth Screen if not logged in using PIN
  if (!authenticatedDriver) {
    return (
      <div className="max-w-md w-full bg-[#112240] rounded-3xl border border-[#233554] p-8 space-y-6 mx-auto animate-fade-in shadow-2xl">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-orange-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shadow-md">
            <Truck className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Choferes de Ruta</h1>
          <p className="text-xs text-slate-200 text-center uppercase tracking-wider font-semibold">SL ROAD TRUCKING</p>
        </div>

        {/* Network Stager warning */}
        <div className="flex items-center justify-between bg-[#0A192F] px-4 py-2.5 rounded-xl border border-[#233554]/60 text-xs">
          <div className="flex items-center space-x-2">
            {currentNetworkActive ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-100 font-medium">Bases Disponibles en Línea</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-red-400 font-semibold">Modo Offline Activado</span>
              </>
            )}
          </div>
          {/* Debug connection layout modifier */}
          <button
            onClick={() => setSimulateOffline(!simulateOffline)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono leading-none border transition-colors ${
              simulateOffline 
                ? 'bg-orange-950/40 text-orange-400 border-amber-800' 
                : 'bg-slate-750 text-slate-200 border-[#233554] hover:bg-[#233554]'
            }`}
          >
            {simulateOffline ? 'SIM: OFFLINE' : 'PROBAR OFFLINE'}
          </button>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-200 font-semibold uppercase tracking-wider">PIN de Conductor</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="w-5 h-5" />
              </span>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-950 border border-[#233554] text-white font-mono text-center tracking-widest text-2xl py-3 pl-10 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              />
            </div>
            <p className="text-[10px] text-slate-200 text-center mt-1">
              Ingresa tu código PIN de 4 dígitos. Para pruebas usa: <strong className="text-emerald-400">1234</strong>
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-950/40 text-red-400 border border-red-800/60 rounded-xl text-xs text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-lg transform active:scale-98 transition cursor-pointer"
          >
            {isLoading ? 'Comprobando acceso...' : 'INGRESAR'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          ¿No tienes PIN? Solicítalo a <strong>Don Saúl</strong>.
        </p>
      </div>
    );
  }

  // Calculation of KPIs
  const completedTrips = viajes.filter(v => v.id_chofer === authenticatedDriver.id_chofer && v.estado_viaje !== 'En Ciclo');
  const totalBonus = completedTrips.reduce((acc, v) => {
    const extras = parseFloat(v.toneladas_extras || '0');
    return acc + (extras * (500 / 45) * 0.40);
  }, 0);
  const totalTons = completedTrips.reduce((acc, v) => {
    const base = parseFloat(v.toneladas_base || '45');
    const extras = parseFloat(v.toneladas_extras || '0');
    return acc + base + extras;
  }, 0);

  // Active sub-state string for AnimatePresence tracking
  let subState = 'ROUTES';
  if (activeViaje) {
    subState = isFinalizing ? 'FINALIZE' : 'ACTIVE';
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      {/* 1. Header (Mobile Visible, Desktop Hidden) */}
      <header className="lg:hidden bg-[#0A192F]/80 backdrop-blur-md border-b border-[#112240]/50 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 hover:bg-[#112240] rounded-lg text-slate-200 hover:text-white transition cursor-pointer font-bold uppercase text-[10px]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-1">
            <span className="p-1 bg-orange-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Truck className="w-4 h-4" />
            </span>
            <span className="font-extrabold text-sm text-white">Flota Choferes</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentNetworkActive ? (
            <span className="flex items-center text-[10px] bg-emerald-950/45 text-emerald-400 border border-emerald-900/60 font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 animate-pulse"></span>
              Línea
            </span>
          ) : (
            <span className="flex items-center text-[10px] bg-red-950/45 text-red-500 border border-red-900/60 font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
              Offline
            </span>
          )}
        </div>
      </header>

      {/* 2. Main Layout Shell */}
      <div className="flex flex-1 relative overflow-x-hidden">
        
        {/* Desktop Sidebar (Docked) */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 border-r border-[#112240]/50 bg-[#0A192F]/60 backdrop-blur-md p-6 h-[calc(100vh-0px)] sticky top-0 justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-[#112240]/50">
              <span className="p-2 bg-orange-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-inner">
                <Truck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="font-black text-base text-white tracking-tight leading-tight">Flota Choferes</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Módulo Conductor</p>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-3xl space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-extrabold shadow-inner shrink-0 leading-none">
                  {authenticatedDriver.nombre_completo.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider leading-none">CONDUCTOR</span>
                  <div className="text-white font-bold text-sm truncate leading-tight mt-0.5">{authenticatedDriver.nombre_completo}</div>
                </div>
              </div>

              {/* Vehicle selector */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">Vehículo Activo</label>
                {activeViaje ? (
                  <div className="bg-[#0A192F] border border-[#112240] p-2 py-2.5 rounded-xl text-xs text-white font-bold truncate flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    {camiones.find(c => c.id_camion === selectedCamionId)?.modelo || 'Camión Asignado'}
                  </div>
                ) : (
                  <select
                    value={selectedCamionId}
                    onChange={(e) => setSelectedCamionId(e.target.value)}
                    className="w-full bg-slate-950 border border-[#112240] p-2.5 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs outline-none text-white font-medium cursor-pointer"
                  >
                    <option value="">Selecciona un camión...</option>
                    {camiones.map((c, idx) => (
                      <option key={`${c.id_camion}-${idx}`} value={c.id_camion}>
                        {c.modelo} ({c.anio})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Offline simulator */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-3xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold uppercase tracking-wider text-[10px]">Conexión</span>
                {currentNetworkActive ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5" /> En Línea
                  </span>
                ) : (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5 animate-bounce" /> Offline
                  </span>
                )}
              </div>

              {offlineAction && (
                <button
                  onClick={handleSyncOfflineActions}
                  disabled={isLoading || !currentNetworkActive}
                  className="w-full bg-blue-600 hover:bg-indigo-505 disabled:opacity-40 text-white text-xs py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Sincronizar Pendientes
                </button>
              )}

              <button
                onClick={() => setSimulateOffline(!simulateOffline)}
                className={`w-full py-2 border rounded-xl text-xs font-bold leading-none transition duration-200 cursor-pointer ${
                  simulateOffline 
                    ? 'bg-orange-950/40 text-orange-400 border-amber-800' 
                    : 'bg-[#112240] border-[#233554] hover:bg-slate-750 text-slate-100'
                }`}
              >
                {simulateOffline ? 'DESACTIVAR SIMULADOR' : 'PROBAR MODO OFFLINE'}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-850">
            <button
              onClick={onLogout}
              className="w-full border border-[#112240] hover:bg-slate-850 text-slate-100 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              ← Volver al Portal
            </button>
            <button
              onClick={clearAuth}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión Conductor
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed inset-y-0 left-0 z-50 w-80 bg-[#0A192F] border-r border-[#112240] p-6 flex flex-col justify-between shadow-2xl lg:hidden"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 bg-orange-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-inner">
                        <Truck className="w-5 h-5" />
                      </span>
                      <span className="font-extrabold text-sm text-white">Menú Conductor</span>
                    </div>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-1 hover:bg-[#112240] rounded-lg text-slate-200 hover:text-white transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Profile section */}
                  <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-orange-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
                        {authenticatedDriver.nombre_completo.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block leading-none">CONDUCTOR</span>
                        <div className="text-white font-extrabold text-xs truncate mt-0.5">{authenticatedDriver.nombre_completo}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[9px] text-slate-200 font-bold uppercase tracking-wider block">Vehículo Activo</label>
                      {activeViaje ? (
                        <div className="bg-[#0A192F] border border-[#112240] p-2 rounded-xl text-xs text-white font-bold truncate flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-emerald-400" />
                          {camiones.find(c => c.id_camion === selectedCamionId)?.modelo || 'Camión Asignado'}
                        </div>
                      ) : (
                        <select
                          value={selectedCamionId}
                          onChange={(e) => setSelectedCamionId(e.target.value)}
                          className="w-full bg-slate-950 border border-[#112240] p-2.5 rounded-xl focus:ring-1 focus:ring-emerald-500 text-xs outline-none text-white font-medium"
                        >
                          <option value="">Selecciona un camión...</option>
                          {camiones.map((c, index) => (
                            <option key={`${c.id_camion}-${index}`} value={c.id_camion}>
                              {c.modelo}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Offline helper */}
                  <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-semibold uppercase tracking-wider text-[9px]">Sincronización</span>
                      {currentNetworkActive ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5" /> En Línea
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <WifiOff className="w-3.5 h-3.5" /> Offline
                        </span>
                      )}
                    </div>

                    {offlineAction && (
                      <button
                        onClick={() => {
                          setIsMobileSidebarOpen(false);
                          handleSyncOfflineActions();
                        }}
                        disabled={isLoading || !currentNetworkActive}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Sincronizar Pendientes
                      </button>
                    )}

                    <button
                      onClick={() => setSimulateOffline(!simulateOffline)}
                      className={`w-full py-2 border rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                        simulateOffline 
                          ? 'bg-orange-950/40 text-orange-400 border-amber-800' 
                          : 'bg-[#112240] border-slate-705 hover:bg-slate-750 text-slate-100'
                      }`}
                    >
                      {simulateOffline ? 'DESACTIVAR SIMULADOR' : 'PROBAR MODO OFFLINE'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <button
                    onClick={onLogout}
                    className="w-full border border-[#112240] hover:bg-slate-850 text-slate-100 hover:text-white font-bold py-2 px-4 rounded-lg text-xs transition"
                  >
                    ← Volver al Portal
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      clearAuth();
                    }}
                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2 border border-rose-500/10"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar Sesión
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3-Column Layout: Column 2 (Central Main Workspace Area) */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-4xl mx-auto w-full space-y-6 pb-28 lg:pb-10 overflow-y-auto">
          
          {/* Messaging alerts */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 border rounded-3xl text-sm flex items-start gap-3 shadow-lg ${
                  message.type === 'success' 
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 shadow-emerald-950/10' 
                    : message.type === 'error'
                    ? 'bg-red-950/40 text-red-500 border-red-800/60 shadow-red-950/10'
                    : 'bg-blue-950/40 text-blue-400 border-blue-800/60 shadow-blue-950/10'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : message.type === 'error' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="leading-tight font-medium">{message.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Display State Navigation with smooth Framer Motion Transitions */}
          <AnimatePresence mode="wait">
            {subState === 'ROUTES' && (
              <motion.div
                key="state-routes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Odometer selector visible only on mobile layout */}
                <div className="lg:hidden bg-[#0A192F] border border-[#112240] p-4 rounded-3xl space-y-2.5">
                  <span className="text-[10px] text-slate-505 font-extrabold uppercase tracking-wider block">Camión de la Flota</span>
                  <select
                    value={selectedCamionId}
                    onChange={(e) => setSelectedCamionId(e.target.value)}
                    className="w-full bg-slate-950 border border-[#112240] p-3.5 rounded-2xl focus:ring-1 focus:ring-emerald-500 text-sm outline-none text-white font-bold cursor-pointer"
                  >
                    <option value="">Selecciona tu camión asignado...</option>
                    {camiones.map((c, idx) => (
                      <option key={`${c.id_camion}-${idx}`} value={c.id_camion}>
                        {c.modelo} ({c.anio})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Rutas de Transporte</h2>
                    <p className="text-xs text-slate-200 mt-0.5">Selecciona tu destino para iniciar el ciclo comercial.</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (isLoading) return;
                      await loadDriverData(true);
                      setMessage({ text: 'Rutas actualizadas correctamente.', type: 'success' });
                    }}
                    className="p-2 sm:p-3 bg-[#0A192F] border border-[#112240] hover:bg-slate-850 active:bg-slate-850 text-slate-200 hover:text-emerald-400 hover:border-[#233554]/60 rounded-2xl transition cursor-pointer flex items-center justify-center shadow"
                    title="Actualizar Rutas"
                    disabled={isLoading}
                  >
                    <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {rutas.filter(r => r.estado === 'Disponible' && !viajes.some(v => v.id_ruta === r.id_ruta && v.estado_viaje === 'En Ciclo')).length === 0 ? (
                  <div className="p-12 text-center bg-slate-905/30 border border-slate-850 rounded-3xl text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-slate-600 animate-bounce" />
                    <span className="font-semibold text-sm">No hay rutas asignadas disponibles.</span>
                    <span className="text-xs text-slate-600 max-w-xs">Pídele a Don Saúl o administración que asigne rutas con estado "Disponible" en Google Sheets.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rutas
                      .filter(r => r.estado === 'Disponible' && !viajes.some(v => v.id_ruta === r.id_ruta && v.estado_viaje === 'En Ciclo'))
                      .map((ruta, index) => {
                        const isVehicleBusy = viajes.some(v => v.id_camion === selectedCamionId && v.estado_viaje === 'En Ciclo');
                        const isDriverBusy = viajes.some(v => v.id_chofer === authenticatedDriver?.id_chofer && v.estado_viaje === 'En Ciclo');
                        const isBlocked = isVehicleBusy || isDriverBusy;

                        return (
                          <div key={`${ruta.id_ruta}-${index}`} className="flex flex-col gap-2">
                            {isBlocked && (
                              <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl text-[10px] text-orange-500 font-bold text-center flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Bloqueo de Seguridad: Conductor/Vehículo Ocupado
                              </div>
                            )}
                            <RutaCard
                              id={ruta.id_ruta}
                              ruta={ruta}
                              onStartTrip={handleStartTrip}
                              isLoading={startingRouteId === ruta.id_ruta}
                              disabled={!!startingRouteId || !selectedCamionId || isBlocked}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            )}

            {subState === 'ACTIVE' && (
              <motion.div
                key="state-active"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="bg-[#0A192F] border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-6 animate-pulse-border shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                  <div className="inline-flex p-4 bg-orange-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shadow-inner">
                    <Navigation className="w-8 h-8 animate-bounce text-emerald-400" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h4 className="text-white text-lg sm:text-xl font-black tracking-tight uppercase">Viaje Registrado en Ciclo</h4>
                    <p className="text-xs text-slate-200 max-w-md mx-auto leading-relaxed">
                      Llevando cargamento de <strong className="text-emerald-400">45 Toneladas Base</strong>. Rutas secundarias bloqueadas hasta completar el pesaje.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none pb-1.5 tracking-wider">Origen del Viaje</span>
                      <span className="text-white font-extrabold text-sm sm:text-base">
                        {rutas.find(r => r.id_ruta === activeViaje?.id_ruta)?.origen || 'Consultando...'}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none pb-1.5 tracking-wider">Destino del Viaje</span>
                      <span className="text-white font-extrabold text-sm sm:text-base">
                        {rutas.find(r => r.id_ruta === activeViaje?.id_ruta)?.destino || 'Consultando...'}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none pb-1.5 tracking-wider">Vehículo Utilizado</span>
                      <span className="text-white font-extrabold text-sm truncate block">
                        {camiones.find(c => c.id_camion === activeViaje?.id_camion)?.modelo || 'Camión'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsGastoModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base py-5 px-6 rounded-3xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl border border-blue-500/30 font-sans leading-none"
                  >
                    <DollarSign className="w-5.5 h-5.5" />
                    <span>REGISTRAR GASTO RÁPIDO</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsFinalizing(true)}
                    className="bg-rose-500 hover:bg-rose-450 text-white font-extrabold text-sm sm:text-base py-5 px-6 rounded-3xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl border border-rose-500/30 font-sans leading-none"
                  >
                    <CheckCircle className="w-5.5 h-5.5" />
                    <span>FINALIZAR VIAJE ACTIVO</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {subState === 'FINALIZE' && (
              <motion.div
                key="state-finalize"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="bg-[#0A192F] border border-[#112240] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                  <div className="space-y-1">
                    <h3 className="text-white font-black text-lg sm:text-xl tracking-tight uppercase">Confirmar Cierre de Viaje</h3>
                    <p className="text-xs text-slate-200">Registra el ticket oficial de pesaje y odómetro del vehículo.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Odometer Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Kilometraje Final (Odometer)</label>
                      <input
                        type="number"
                        value={kmFinal}
                        onChange={(e) => setKmFinal(e.target.value)}
                        placeholder="Ingresa kilometraje actual del camión..."
                        className="w-full bg-slate-950 border border-[#112240] p-4 rounded-2xl text-white font-extrabold outline-none text-sm focus:border-emerald-500"
                      />
                    </div>

                    {finalizeModalError && (
                      <div className="p-3.5 bg-rose-950/20 text-rose-400 border border-rose-900/40 rounded-2xl text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                        <span>{finalizeModalError}</span>
                      </div>
                    )}

                    {/* Stepper +/- selector for Extra Tons */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Sueldo / Toneladas Extra (Tons)</label>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Base obligatoria: 45 Tons</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-950 border border-[#112240] p-3 rounded-2xl">
                        <motion.button
                          whileTap={{ scale: 0.90 }}
                          type="button"
                          onClick={() => setToneladasExtras(Math.max(0, toneladasExtras - 1))}
                          className="w-12 h-12 bg-[#0A192F] border border-slate-705 rounded-xl text-slate-305 font-bold hover:bg-slate-850 flex items-center justify-center transition cursor-pointer shadow"
                        >
                          <Minus className="w-5 h-5" />
                        </motion.button>
                        <div className="text-center">
                          <span className="text-[10px] block text-slate-400 font-bold leading-none uppercase tracking-wide">Adicional</span>
                          <span className="text-lg sm:text-xl font-black text-white font-mono mt-1 block">{toneladasExtras} Tons</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.90 }}
                          type="button"
                          onClick={() => setToneladasExtras(toneladasExtras + 1)}
                          className="w-12 h-12 bg-[#0A192F] border border-slate-705 rounded-xl text-slate-305 font-bold hover:bg-slate-850 flex items-center justify-center transition cursor-pointer shadow"
                        >
                          <Plus className="w-5 h-5" />
                        </motion.button>
                      </div>

                      {toneladasExtras > 0 && (
                        <div className="p-3 bg-indigo-950/30 text-blue-400 border border-indigo-900/40 rounded-xl text-xs leading-relaxed font-semibold">
                          <strong>Ganancia Estimada Extras (40% Chofer):</strong> Un estimado de <strong>{((toneladasExtras * (500 / 45)) * 0.40).toFixed(1)} BOB</strong> se acumulará como bono personal.
                        </div>
                      )}
                    </div>

                    {/* Camera Capture */}
                    <div className="space-y-2">
                      <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Fotografía del Ticket de Pesaje (Múltiple)</label>
                      <div className="flex flex-col border border-dashed border-[#112240] rounded-3xl p-5 bg-slate-950 text-center gap-4">
                        
                        {fotosPesaje.length > 0 && (
                          <div className="space-y-3 w-full">
                            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block text-left">
                              ✓ {fotosPesaje.length} Foto(s) Preparada(s)
                            </span>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                              <AnimatePresence>
                                {fotosPesaje.map((foto, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.4, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                    className="relative group border border-[#112240] rounded-xl overflow-hidden bg-[#0A192F] aspect-video h-16"
                                  >
                                    <img
                                      src={foto}
                                      alt={`Ticket fraction ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFoto(index)}
                                      className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-650 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer border border-rose-450"
                                    >
                                      ✕
                                    </button>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                          <Camera className="w-8 h-8 text-blue-400 animate-pulse shrink-0" />
                          <div className="space-y-1">
                            <span className="text-xs text-slate-100 font-extrabold block">Toma fotos con la cámara</span>
                            <p className="text-[9px] text-slate-400 leading-none">Puedes seleccionar múltiples fotos como comprobantes del pesaje.</p>
                          </div>
                          
                          <input
                            type="file"
                            id="weigh-photo-capture"
                            accept="image/*"
                            capture="environment"
                            multiple
                            onChange={handleFileCapture}
                            className="hidden"
                          />
                          <motion.label
                            whileTap={{ scale: 0.95 }}
                            htmlFor="weigh-photo-capture"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition cursor-pointer shadow mt-1 inline-block"
                          >
                            {fotosPesaje.length > 0 ? 'AÑADIR MÁS COMPROS' : 'ACTIVAR CÁMARA'}
                          </motion.label>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Report Delivery Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsFinalizing(false)}
                      className="bg-slate-950 border border-[#112240] text-slate-100 hover:bg-[#0A192F] font-bold py-3.5 px-4 rounded-2xl text-xs transition uppercase cursor-pointer"
                    >
                      VOLVER ATRÁS
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleFinalizeTripSubmit}
                      className="bg-orange-500 text-slate-950 font-black hover:bg-emerald-400 py-3.5 px-4 rounded-2xl text-xs transition cursor-pointer shadow uppercase"
                    >
                      ENTREGAR VIAJE
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 3-Column Layout: Column 3 (Alerts & KPIs Panel, docked on Desktop, hidden on Mobile) */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-[#112240] bg-[#0A192F]/80 backdrop-blur-md p-6 h-[calc(100vh-0px)] sticky top-0 justify-between">
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-850">
              <h3 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Estadísticas del Chofer
              </h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">Control de Rendimiento</p>
            </div>

            {/* KPIs statistics */}
            <div className="grid grid-cols-1 gap-3">
              {/* Progress Bar for Expenses */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider leading-none mb-1">
                    Saldo Mensual Disponible
                  </span>
                  {(() => {
                    const statPresupuesto = Number(authenticatedDriver?.presupuesto !== undefined && authenticatedDriver?.presupuesto !== "" ? authenticatedDriver.presupuesto : 10000) || 10000;
                    const statSaldoActual = Number(authenticatedDriver?.saldo_actual !== undefined && authenticatedDriver?.saldo_actual !== "" ? authenticatedDriver.saldo_actual : statPresupuesto);
                    return (
                      <div className="text-right">
                        <span className="text-xl font-black text-white font-mono">{statSaldoActual.toLocaleString('es-BO')}</span>
                        <span className="text-xs text-slate-500 font-mono"> / {statPresupuesto.toLocaleString('es-BO')} BOB</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mt-1">
                  <span>Consumo de Caja Chica</span>
                  {(() => {
                    const statPresupuesto = Number(authenticatedDriver?.presupuesto !== undefined && authenticatedDriver?.presupuesto !== "" ? authenticatedDriver.presupuesto : 10000) || 10000;
                    const statSaldoActual = Number(authenticatedDriver?.saldo_actual !== undefined && authenticatedDriver?.saldo_actual !== "" ? authenticatedDriver.saldo_actual : statPresupuesto);
                    const remainingPercent = Math.max(0, Math.min(100, (statSaldoActual / statPresupuesto) * 100));
                    return <span>{remainingPercent.toFixed(0)}% Restante</span>;
                  })()}
                </div>
                <div className="h-1.5 w-full bg-[#0A192F] rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, (() => {
                        const statPresupuesto = Number(authenticatedDriver?.presupuesto !== undefined && authenticatedDriver?.presupuesto !== "" ? authenticatedDriver.presupuesto : 10000) || 10000;
                        const statSaldoActual = Number(authenticatedDriver?.saldo_actual !== undefined && authenticatedDriver?.saldo_actual !== "" ? authenticatedDriver.saldo_actual : statPresupuesto);
                        return (statSaldoActual / statPresupuesto) * 100;
                      })()))}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-855 p-4 rounded-3xl space-y-1">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider leading-none">VIAJES COMPLETADOS</span>
                <div className="text-xl font-black text-white font-mono mt-1">{completedTrips.length} Viajes</div>
              </div>

              <div className="bg-slate-950/40 border border-slate-855 p-4 rounded-3xl space-y-1">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider leading-none">TONELADAS RECIENTES</span>
                <div className="text-xl font-black text-white font-mono mt-1">{totalTons.toFixed(0)} Tons</div>
              </div>

              <div className="bg-orange-500/5 border border-emerald-500/10 p-4 rounded-3xl space-y-1 text-emerald-400">
                <span className="text-[9px] text-emerald-500 font-extrabold uppercase block tracking-wider leading-none">BONOS DE EXTRAS (40%)</span>
                <div className="text-xl font-black text-emerald-400 font-mono mt-1">{totalBonus.toFixed(1)} BOB</div>
              </div>

              {activeViaje && (
                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-3xl space-y-2 text-blue-400">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-blue-400 font-extrabold uppercase tracking-wider block">GASTOS DEL VIAJE</span>
                    <button
                      onClick={() => setIsGastoModalOpen(true)}
                      className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold px-1.5 py-0.5 rounded hover:bg-blue-500/30 cursor-pointer"
                    >
                      + Añadir
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-200 leading-relaxed font-semibold">
                    Puedes registrar consumos de combustible, peajes o talleres en cualquier momento presionando el botón "Registrar Gasto Rápido".
                  </div>
                </div>
              )}
            </div>

            {/* Daily warnings checklist */}
            <div className="bg-slate-950/40 border border-slate-855 p-4 rounded-3xl space-y-3">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">RECOMENDACIONES DIARIAS</span>
              <ul className="text-[10px] text-slate-200 space-y-2 leading-tight">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 select-none">✓</span>
                  <span>Verificar la presión de llantas antes de cada viaje.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 select-none">✓</span>
                  <span>Llevar el ticket de pesaje oficial de báscula.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 select-none">✓</span>
                  <span>Asegurar que el kilometraje inicial coincida.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-[9px] text-slate-600 leading-tight">
            Flotas Don Saúl • Conectividad protegida por Queue Buffer Síncrono.
          </div>
        </aside>

      </div>

      {/* 3. Floating Action Buttons (FABs) - Mobile view only */}
      {subState === 'ACTIVE' && (
        <div className="lg:hidden fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsGastoModalOpen(true)}
            className="w-14 h-14 bg-orange-500 hover:bg-orange-400 text-white rounded-full flex items-center justify-center shadow-2xl border border-orange-500/40 cursor-pointer shadow-orange-500/20"
            title="Registrar Gasto"
          >
            <DollarSign className="w-6 h-6" />
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFinalizing(true)}
            className="w-14 h-14 bg-orange-500 hover:bg-orange-400 text-white rounded-full flex items-center justify-center shadow-2xl border border-orange-500/40 cursor-pointer shadow-orange-500/20"
            title="Finalizar Viaje"
          >
            <CheckCircle className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* QUICK EXPENSE DISPATCHER MODAL */}
      {isGastoModalOpen && authenticatedDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <GastoForm
            driver={authenticatedDriver}
            activeViaje={activeViaje}
            selectedCamionId={selectedCamionId || 'CAM-01'}
            token={token}
            onSuccess={(amount: number) => {
              if (authenticatedDriver) {
                const updatedDriver = {
                  ...authenticatedDriver,
                  saldo_actual: (Number(authenticatedDriver.saldo_actual || 10000) - amount).toString()
                };
                setAuthenticatedDriver(updatedDriver);
                localStorage.setItem('driver_session_user', JSON.stringify(updatedDriver));
              }
              setMessage({ text: `Gasto de ${amount} BOB registrado con éxito.`, type: 'success' });
              loadDriverData(true);
            }}
            onClose={() => setIsGastoModalOpen(false)}
          />
        </div>
      )}

      {/* 4. CUSTOM RECURRING MODALS & FEEDBACK DIALOGS (REPLACING NATIVE ALERTS/CONFIRMS) */}
      <AnimatePresence>
        {/* START TRIP CONFIRMATION DIALOG */}
        {modalType === 'START_TRIP' && selectedRutaToStart && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0A192F] border border-[#112240] rounded-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="space-y-2 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20 shadow-md">
                  <Play className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-white font-extrabold text-base tracking-tight uppercase">¿Iniciar Viaje?</h3>
                <p className="text-xs text-slate-200 leading-normal">
                  ¿Confirmas iniciar este viaje con destino a <strong className="text-white">"{selectedRutaToStart.destino}"</strong>?
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">ORIGEN:</span>
                  <span className="text-white">{selectedRutaToStart.origen}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">DESTINO:</span>
                  <span className="text-white">{selectedRutaToStart.destino}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-slate-850 pt-2">
                  <span className="text-orange-500">TARIFA BASE:</span>
                  <span className="text-orange-400 font-bold font-mono">{selectedRutaToStart.tarifa_base} BOB</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={startingRouteId !== null}
                  onClick={() => {
                    setModalType(null);
                    setSelectedRutaToStart(null);
                  }}
                  className="bg-slate-950 border border-[#112240] text-slate-100 hover:bg-[#0A192F] font-bold py-3 px-4 rounded-xl text-xs transition uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={startingRouteId !== null}
                  onClick={() => executeStartTrip(selectedRutaToStart)}
                  className="bg-orange-500 text-slate-950 font-black hover:bg-orange-400 py-3 px-4 rounded-xl text-xs transition cursor-pointer shadow uppercase flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startingRouteId !== null ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-slate-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Iniciando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* FINALIZE TRIP WITHOUT PHOTO WARNING DIALOG */}
        {modalType === 'NO_PHOTO_CONFIRM' && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0A192F] border border-[#112240] rounded-3xl p-6 space-y-5 shadow-2xl"
            >
              <div className="space-y-2 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-md">
                  <AlertTriangle className="w-5 h-5 animate-bounce text-orange-400" />
                </div>
                <h3 className="text-white font-extrabold text-base tracking-tight uppercase">¿Sin Foto del Ticket?</h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  ¿Deseas finalizar sin adjuntar foto del ticket de pesaje? Se recomienda encarecidamente sacarle una fotografía para respaldo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="bg-slate-950 border border-[#112240] text-slate-100 hover:bg-[#0A192F] font-bold py-3 px-4 rounded-xl text-xs transition uppercase cursor-pointer"
                >
                  Tomar Foto
                </button>
                <button
                  type="button"
                  onClick={() => executeFinalizeTripSubmit()}
                  className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition cursor-pointer shadow uppercase"
                >
                  Ignorar y Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* TRIP SUCCESS DETAILED STATISTICS REPORT DIALOG */}
        {modalType === 'TRIP_SUCCESS' && tripSummaryData && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0A192F] border border-[#112240] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl"
            >
              <div className="space-y-2 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-md">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-white font-extrabold text-lg tracking-tight uppercase">¡Viaje Finalizado Con Éxito!</h3>
                <p className="text-xs text-slate-200 leading-normal text-center">
                  El viaje ha concluido formalmente. Se ha realizado el cálculo de toneladas extras para el balance general:
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-3.5 shadow-inner">
                <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-850/50 pb-2.5">
                  <span className="text-slate-200 uppercase">Total Pago Extra:</span>
                  <span className="text-white font-extrabold text-base font-mono">
                    {tripSummaryData.valor_extra_total.toFixed(2)} BOB
                  </span>
                </div>
                
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      <span className="text-emerald-400 font-bold uppercase tracking-wide text-[10px]">Tu Comisión (40% Chofer):</span>
                    </div>
                    <span className="text-white font-extrabold font-mono text-sm">
                      {tripSummaryData.bono_chofer.toFixed(2)} BOB
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="text-blue-400 font-bold uppercase tracking-wide text-[10px]">Don Saúl (60% Admin):</span>
                    </div>
                    <span className="text-slate-100 font-extrabold font-mono text-xs">
                      {tripSummaryData.bono_administrador.toFixed(2)} BOB
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    setTripSummaryData(null);
                    setActiveViaje(null);
                  }}
                  className="w-full bg-orange-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm tracking-wide transition cursor-pointer shadow-lg shadow-emerald-500/10 uppercase"
                >
                  Entendido / Continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
