import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  RefreshCw,
  PlusCircle,
  Truck,
  MapPin,
  CheckCircle,
  Wrench,
  ChevronRight,
  Database,
  ArrowUpRight,
  Sparkles,
  Zap,
  Briefcase,
  Play
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
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
import StatusCard from './StatusCard';
import { THEME } from '../theme.config';

const safeParse = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

interface DashboardBentoGridProps {
  summary: DashboardSummary | null;
  alerts: ServiceAlert[];
  camiones: Camion[];
  rutas: Ruta[];
  viajes: Viaje[];
  gastos: Gasto[];
  repuestos: ControlRepuesto[];
  choferes: Chofer[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  
  // Custom actions
  onAddRouteSubmit: (e: React.FormEvent, origen: string, destino: string, tarifa: string) => Promise<void>;
  onAddTruckSubmit: (e: React.FormEvent, modelo: string, anio: string, odo: string) => Promise<void>;
  onRegisterOilSubmit: (e: React.FormEvent, camionId: string, kmCambio: string, kmProximo: string) => Promise<void>;
  onWorkshopRepuestoChange: (repuestoId: string, choiceValue: 'Desecho' | 'Reutilizar' | 'Reparar') => Promise<void>;
  onAutoSeedDemo: () => Promise<void>;
}

export default function DashboardBentoGrid({
  summary,
  alerts,
  camiones,
  rutas,
  viajes,
  gastos,
  repuestos,
  choferes,
  isLoading,
  onRefresh,
  onAddRouteSubmit,
  onAddTruckSubmit,
  onRegisterOilSubmit,
  onWorkshopRepuestoChange,
  onAutoSeedDemo
}: DashboardBentoGridProps) {
  // Local state for active audited driver details
  const [selectedDriverForDetail, setSelectedDriverForDetail] = useState<Chofer | null>(null);

  // Local form inputs
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [tarifaBase, setTarifaBase] = useState('500');

  const [selectedCamionId, setSelectedCamionId] = useState('');
  const [kmCambio, setKmCambio] = useState('');
  const [kmProximo, setKmProximo] = useState('');

  const [camionModelo, setCamionModelo] = useState('');
  const [camionAnio, setCamionAnio] = useState('');
  const [camionOdo, setCamionOdo] = useState('');

  // Floating loader state tracker to show circular animations inside buttons directly
  const [activeFormSubmitting, setActiveFormSubmitting] = useState<'refresh' | 'route' | 'truck' | 'oil' | 'demo' | null>(null);

  // Sparkline data generation based on recent trips or standard historical points when fresh
  const generateSparklineData = () => {
    if (viajes.length === 0) {
      return [
        { day: 'Lun', factor: 2300 },
        { day: 'Mar', factor: 3400 },
        { day: 'Mié', factor: 2800 },
        { day: 'Jue', factor: 4500 },
        { day: 'Vie', factor: 5200 },
        { day: 'Sáb', factor: 4900 },
        { day: 'Dom', factor: 6100 },
      ];
    }
    // Create an aggregate from latest trips
    return viajes.slice(-8).map((v, idx) => ({
      day: `V${idx + 1}`,
      factor: (parseFloat(v.toneladas_base || '45') * (parseFloat(v.toneladas_extras || '0') + 1)) * 10
    }));
  };

  const sparklineData = generateSparklineData();

  // Unified submission hooks to toggle micro spinning loaders
  const wrapAction = async (formId: 'refresh' | 'route' | 'truck' | 'oil' | 'demo', actionFn: () => Promise<void>) => {
    setActiveFormSubmitting(formId);
    try {
      await actionFn();
    } finally {
      setActiveFormSubmitting(formId);
      // Brief timeout to let layout animate smoothly
      setTimeout(() => setActiveFormSubmitting(null), 400);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0F172A] text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-8 pb-20 selection:bg-indigo-505 selection:text-white">
      
      {/* 1. SEAMLESS GLASS BANNER HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/60 pb-6 gap-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest leading-none">
            <Zap className="w-4 h-4 text-indigo-400 animate-pulse" strokeWidth={1} />
            <span>Consola de Flotas Real-Time</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1 px-0.5 flex items-center gap-2.5">
            Módulo General Don Saúl 
            <span className="text-[10px] font-mono font-bold tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">
              Pro Terminal v4.1
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Centro de comando asimétrico sincronizado de forma instantánea con el libro maestro en Google Sheets. 
            Monitoreo preventivo de combustible, desgaste e inventario de repuestos.
          </p>
        </div>

        {/* Action button inside wrapper tool */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={isLoading || activeFormSubmitting !== null}
            onClick={() => wrapAction('refresh', onRefresh)}
            className="flex items-center gap-2 bg-[#1E293B]/70 hover:bg-[#1E293B] border border-white/[0.05] text-slate-200 font-bold text-xs px-5 py-3 rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-slate-950/20"
          >
            {activeFormSubmitting === 'refresh' || isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" strokeWidth={1} />
            )}
            <span>Sincronizar Sheets</span>
          </motion.button>
        </div>
      </div>

      {/* 2. THE BENTO GRID ARCHITECTURE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[220px]">
        
        {/* BIG BOX (2x2): METRICAS FINANCIERAS Y SPARKLINE DE FACTURACIÓN */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          transition={THEME.transitions.springHover}
          className={`md:col-span-2 md:row-span-2 p-6 flex flex-col justify-between ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/40`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase block">
                  Caja General de Operaciones
                </span>
                <h3 className="text-lg font-black text-white tracking-tight">Utilidad Neta Consolidada</h3>
              </div>
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                <DollarSign className="w-5 h-5 text-indigo-400" strokeWidth={1.2} />
              </div>
            </div>

            {/* Numerical breakdown */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-800/80 pb-3">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Utilidades de Flota (D.S.)</p>
                <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white glow-text">
                  {summary ? `${summary.utilidades.toLocaleString()} BOB` : '--- BOB'}
                </h2>
              </div>
              
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] text-emerald-400 font-semibold uppercase">Fletes Facturados</p>
                <h4 className="text-lg sm:text-xl font-bold font-mono tracking-tight text-emerald-400">
                  {summary ? `${summary.ingresos_totales.toLocaleString()} BOB` : '--- BOB'}
                </h4>
              </div>
            </div>
          </div>

          {/* Sparkline Visualisation graph */}
          <div className="h-28 w-full mt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 5, right: 3, left: 3, bottom: 5 }}>
                <defs>
                  <linearGradient id="glowIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelClassName="text-slate-400 text-[10px]"
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="factor" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#glowIndigo)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute top-1 left-2 pointer-events-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Actualización de Sheets activa</span>
            </div>
          </div>

          {/* Balance breakdown footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/50 pt-3">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400 rotate-180" strokeWidth={1.5} />
              Gasto en Ruta: <strong className="text-slate-250 font-mono">{summary ? summary.gastos_totales.toLocaleString() : '---'} BOB</strong>
            </span>
            <span className="text-[10px] font-semibold text-slate-500">PRODUCCIÓN NETA TOTAL (40% CHOFER / 60% ADMIN)</span>
          </div>

        </motion.div>

        {/* BIG BOX (2x2): SEMÁFORO PREDICTIVO Y ALERTAS CRÍTICAS DE LUBRICACIÓN */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          transition={THEME.transitions.springHover}
          className={`md:col-span-2 md:row-span-2 p-6 flex flex-col justify-between ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/40`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-rose-400 tracking-widest uppercase block">
                  Semáforo Predictivo de Aceite
                </span>
                <h3 className="text-lg font-black text-white tracking-tight">Salud de Lubricantes</h3>
              </div>
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-400" strokeWidth={1.2} />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Indicador inteligente. Calcula de forma automática la proximidad de mantenimiento preventivo sobre el odómetro digital de la patente:
            </p>
          </div>

          {/* Scrollable Traffic List Box */}
          <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2.5 mt-3.5 scrollbar-thin scrollbar-thumb-slate-800">
            {alerts.length === 0 ? (
              <div className="h-full flex items-center justify-center p-8 text-xs text-slate-500 text-center italic">
                Inserta registros de lubricación para procesar alertas de aceite.
              </div>
            ) : (
              alerts.map((al, index) => {
                const isCritical = al.estado_alerta === 'CRITICAL';
                const isNear = al.estado_alerta === 'NEAR_LIMIT';
                
                return (
                  <div 
                    key={`${al.id_camion}-${index}`} 
                    className="p-3 bg-[#0F172A]/50 hover:bg-[#0F172A]/85 border border-[#1E293B] rounded-xl flex items-center justify-between transition gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-white uppercase">{al.modelo}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-widest font-black uppercase ${
                          isCritical 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : isNear 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isCritical ? 'CRÍTICO' : isNear ? 'REQUERIDO' : 'ÓPTIMO'}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        Odómetro: <strong className="text-slate-200">{al.kilometraje_actual} KM</strong> | Próximo Cambio: <strong className="text-slate-250">{al.proximo_cambio_km || 'SD'} KM</strong>
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-mono min-w-[70px]">
                      {isCritical ? (
                        <span className="text-rose-400 font-extrabold text-[10px]">-{Math.abs(al.km_restantes)} KM 🚨</span>
                      ) : (
                        <span className="text-slate-300">{al.km_restantes} KM</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800/50 pt-3 text-[9px] text-slate-500 font-mono uppercase text-right tracking-wide mt-2">
            Mantenimiento preventivo cíclico de 10,000 kilómetros
          </div>

        </motion.div>

        {/* SMALL BOX (1x1): INVENTARIO ACTIVO */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={THEME.transitions.springHover}
          className={`p-5 flex flex-col justify-between ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/40`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Flota Registrada
            </span>
            <Truck className="w-5 h-5 text-emerald-400" strokeWidth={1} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black font-mono tracking-tight text-white">
              {summary ? summary.vehiculos_activos : '0'} Units
            </h2>
            <p className="text-[10px] text-slate-400 leading-normal">
              Camiones autorizados para la asignación de viajes.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/20 block text-center w-full uppercase">
            Sincronización Activa
          </span>
        </motion.div>

        {/* SMALL BOX (1x1): RUTAS ESTABLECIDAS */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={THEME.transitions.springHover}
          className={`p-5 flex flex-col justify-between ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/40`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Rutas Disponibles
            </span>
            <MapPin className="w-5 h-5 text-indigo-400" strokeWidth={1} />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black font-mono tracking-tight text-white">
              {rutas.length} Rutas
            </h2>
            <p className="text-[10px] text-slate-400 leading-normal">
              Rutas de carga publicadas en la bitácora de choferes.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2.5 py-1 rounded border border-indigo-500/20 block text-center w-full uppercase">
            Habilitadas en PWA
          </span>
        </motion.div>

      </div>

      {/* 3. CAMIONES HEALTH GRID (FLEET CONTROLLER STATUS CARDS) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
            <Briefcase className="w-5 h-5 text-indigo-400" strokeWidth={1} />
            Efectivos de la Flota (Camiones)
          </h3>
          <p className="text-xs text-slate-400">
            Registro global de camiones, chasis e inversión presupuestal asociada de Don Saúl.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {camiones.map((camion, index) => (
            <StatusCard 
              key={`${camion.id_camion}-${index}`}
              camion={camion}
              serviceAlert={alerts.find(a => a.id_camion === camion.id_camion)}
            />
          ))}
        </div>
      </div>

      {/* NÓMINA DE CONDUCTORES / CHOFERES */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Nómina de Conductores (Choferes)
          </h3>
          <p className="text-xs text-slate-400">
            Resumen en vivo del personal de ruta. Haz clic en un conductor para ver su expediente de gastos, toneladas desplazadas y comprobantes vinculados de Cloudinary.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {choferes.map((driver, index) => {
            const completedTrips = viajes.filter(v => v.id_chofer === driver.id_chofer && v.estado_viaje === 'Finalizado');
            const inCycleTrip = viajes.find(v => v.id_chofer === driver.id_chofer && v.estado_viaje === 'En Ciclo');
            
            // Calculate total extra earnings
            let totalBonoChofer = 0;
            completedTrips.forEach((v) => {
              const matchingRuta = rutas.find(r => r.id_ruta === v.id_ruta);
              const basePrice = Number(matchingRuta?.tarifa_base || 500);
              const extraTons = Number(v.toneladas_extras) || 0;
              const extraRateValue = (basePrice / 45) * extraTons;
              totalBonoChofer += (extraRateValue * 0.40);
            });

            return (
              <motion.div
                key={`${driver.id_chofer}-${index}`}
                whileHover={{ y: -3, scale: 1.02 }}
                onClick={() => setSelectedDriverForDetail(driver)}
                className={`backdrop-blur-[12px] border border-white/[0.05] rounded-2xl p-5 space-y-4 bg-[#1E293B]/40 hover:border-emerald-500/30 transition duration-300 relative group cursor-pointer shadow-lg`}
              >
                <div className="absolute top-2.5 right-2.5 text-[8.5px] font-mono select-none px-2 py-0.5 rounded uppercase font-bold bg-slate-900/60 border border-slate-800 text-indigo-400">
                  ID: {driver.id_chofer.substring(0, 5)}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition truncate max-w-[130px]">
                      {driver.nombre_completo}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Tel: {driver.telefono || 'Sin registrar'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-slate-450 block text-[9px] uppercase font-semibold">Bono Colectado</span>
                    <strong className="text-emerald-400 font-mono text-xs">{totalBonoChofer.toLocaleString()} BOB</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-450 block text-[9px] uppercase font-semibold">Viajes Hechos</span>
                    <strong className="text-white font-mono text-xs">{completedTrips.length} Viajes</strong>
                  </div>
                </div>

                {(() => {
                  const driverBudget = Number(driver.presupuesto !== undefined && driver.presupuesto !== "" ? driver.presupuesto : 10000);
                  const driverBalance = Number(driver.saldo_actual !== undefined && driver.saldo_actual !== "" ? driver.saldo_actual : driverBudget);
                  const totalSpentThisLoad = Math.max(0, driverBudget - driverBalance);
                  const percentSpent = ((totalSpentThisLoad) / driverBudget) * 100;
                  
                  return (
                    <div className="border-t border-slate-800/60 pt-3 space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-450 uppercase font-semibold text-[8px]">Presupuesto Ejecutado</span>
                        <span className="font-mono font-bold text-rose-400 text-[10px]">{percentSpent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(percentSpent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] items-baseline font-mono">
                        <span className="text-slate-550 text-[8px] uppercase font-semibold">Monto Gastado</span>
                        <span className="text-rose-400 font-black text-xs">
                          BOB {totalSpentThisLoad.toLocaleString('es-BO')}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {inCycleTrip ? (
                  <div className="bg-amber-500/15 border border-amber-500/25 text-amber-300 font-black text-[9px] py-1 px-2 rounded-lg flex items-center justify-between">
                    <span>VIAJE ACTIVO</span>
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></span>
                  </div>
                ) : (
                  <div className="bg-[#0F172A]/55 text-slate-500 font-bold text-[9px] py-1 px-2 rounded-lg text-center uppercase tracking-wider">
                    Listo en Parada
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. WORKSHOP SPAR PARTS MANAGER BLOCK */}
      <div className={`p-6 ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/40 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Wrench className="w-4.5 h-4.5" strokeWidth={1.2} />
              Control Físico de Piezas Cambiadas (Taller)
            </h4>
            <p className="text-xs text-slate-400">
              Desgaste y recambio preventivo: Elige el destino final de las piezas deterioradas removidas.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={activeFormSubmitting === 'demo'}
            onClick={() => wrapAction('demo', onAutoSeedDemo)}
            className="text-xs uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {activeFormSubmitting === 'demo' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" strokeWidth={1} />
            )}
            <span>Demo: Insertar Repuesto</span>
          </motion.button>
        </div>

        {repuestos.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-[#0F172A]/40 border border-[#1E293B] rounded-2xl italic leading-relaxed">
            No se registran piezas extraídas. Los choferes insertarán refacciones al registrar gastos de Taller ó crea un demo arriba para prueba.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="p-4">Refacción Sustituida</th>
                  <th className="p-4">Gasto de Origen</th>
                  <th className="p-4 text-center">Destino Físico (Sheets en vivo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0F172A]/20">
                {repuestos.map((rep, index) => {
                  const targetDestino = rep.destino_pieza_vieja || 'Desecho';
                  return (
                    <tr key={`${rep.id_repuesto_historial}-${index}`} className="hover:bg-[#1E293B]/20 transition">
                      <td className="p-4">
                        <span className="font-bold text-slate-100">{rep.pieza_cambiada}</span>
                      </td>
                      <td className="p-4 font-mono text-slate-500 text-[10px]">{rep.id_gasto}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-6">
                          
                          {/* Radio: Desecho */}
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`pieza-destino-bento-${rep.id_repuesto_historial}`}
                              checked={targetDestino === 'Desecho'}
                              onChange={() => onWorkshopRepuestoChange(rep.id_repuesto_historial, 'Desecho')}
                              className="w-4 h-4 rounded-full border border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer bg-slate-950 focus:ring-indigo-500"
                            />
                            <span className={`font-semibold text-xs ${targetDestino === 'Desecho' ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                              Desecho 🗑️
                            </span>
                          </label>

                          {/* Radio: Reutilizar */}
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`pieza-destino-bento-${rep.id_repuesto_historial}`}
                              checked={targetDestino === 'Reutilizar'}
                              onChange={() => onWorkshopRepuestoChange(rep.id_repuesto_historial, 'Reutilizar')}
                              className="w-4 h-4 rounded-full border border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer bg-slate-950 focus:ring-indigo-500"
                            />
                            <span className={`font-semibold text-xs ${targetDestino === 'Reutilizar' ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                              Reutilizar o Reacondicionar 🛞
                            </span>
                          </label>

                          {/* Radio: Reparar */}
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`pieza-destino-bento-${rep.id_repuesto_historial}`}
                              checked={targetDestino === 'Reparar'}
                              onChange={() => onWorkshopRepuestoChange(rep.id_repuesto_historial, 'Reparar')}
                              className="w-4 h-4 rounded-full border border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer bg-slate-950 focus:ring-indigo-500"
                            />
                            <span className={`font-semibold text-xs ${targetDestino === 'Reparar' ? 'text-white font-extrabold' : 'text-slate-500'}`}>
                              Reparación y Calibrado ⚙️
                            </span>
                          </label>

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

      {/* 5. GESTION DE FORMULARIOS INDUSTRIALES (RUTAS GASTOS E IMPORTACIONES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD ROAD PLANNER */}
        <div className={`p-6 ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/30 flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" strokeWidth={1} />
                Planillado de Rutas Directas
              </h4>
              <p className="text-xs text-slate-400">
                Añade destinos y publica tarifas base en el dispositivo móvil de los conductores.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await wrapAction('route', async () => {
                  await onAddRouteSubmit(e, origen, destino, tarifaBase);
                  setOrigen('');
                  setDestino('');
                  setTarifaBase('500');
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Lugar de Origen</label>
                <input
                  type="text"
                  required
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  placeholder="Ej. Planta de Cemento El Puente"
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Destino Final de Viaje</label>
                <input
                  type="text"
                  required
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  placeholder="Ej. Terminal de Tarija"
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Tarifa Base (BOB)</label>
                <input
                  type="number"
                  required
                  value={tarifaBase}
                  onChange={(e) => setTarifaBase(e.target.value)}
                  placeholder="Ej. 1200"
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium font-mono"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={activeFormSubmitting !== null}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
              >
                {activeFormSubmitting === 'route' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" strokeWidth={1} />
                )}
                <span>Añadir Ruta Carga</span>
              </motion.button>
            </form>
          </div>
        </div>

        {/* LUBRICATING OIL WARNING PLANNER */}
        <div className={`p-6 ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/30 flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4" strokeWidth={1} />
                Planillar Cambio de Aceite
              </h4>
              <p className="text-xs text-slate-400">
                Logea de forma manual el odómetro del último cambio de aceite para restablecer alertas.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await wrapAction('oil', async () => {
                  await onRegisterOilSubmit(e, selectedCamionId, kmCambio, kmProximo);
                  setKmCambio('');
                  setKmProximo('');
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Selecciona Patente/Camión</label>
                <select
                  value={selectedCamionId}
                  onChange={(e) => setSelectedCamionId(e.target.value)}
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-slate-300 focus:border-indigo-500 font-medium"
                >
                  <option value="">Elegir vehículo...</option>
                  {camiones.map((c, index) => (
                    <option key={`${c.id_camion}-${index}`} value={c.id_camion}>
                      {c.modelo} (Odo: {c.kilometraje_actual} KM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Kilometraje en Cambio</label>
                <input
                  type="number"
                  required
                  value={kmCambio}
                  onChange={(e) => setKmCambio(e.target.value)}
                  placeholder="Ej. 65000"
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Kilometraje Próximo Cambio (Opcional)</label>
                <input
                  type="number"
                  value={kmProximo}
                  onChange={(e) => setKmProximo(e.target.value)}
                  placeholder="Por defecto: Cambio + 10,000 KM"
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium font-mono"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={activeFormSubmitting !== null}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
              >
                {activeFormSubmitting === 'oil' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={1} />
                )}
                <span>Guardar Registro Lubricación</span>
              </motion.button>
            </form>
          </div>
        </div>

        {/* INPUT REVOLST: ADD NEW VEHICLE TO FLEET */}
        <div className={`p-6 ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/30 flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4" strokeWidth={1} />
                Registrar Unidad de Carga
              </h4>
              <p className="text-xs text-slate-400">
                Añade una nueva máquinaVolvo o Foton a la bitácora activa del consorcio en Sheets.
              </p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await wrapAction('truck', async () => {
                  await onAddTruckSubmit(e, camionModelo, camionAnio, camionOdo);
                  setCamionModelo('');
                  setCamionAnio('');
                  setCamionOdo('');
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Modelo / Patente</label>
                <input
                  type="text"
                  required
                  value={camionModelo}
                  onChange={(e) => setCamionModelo(e.target.value)}
                  placeholder="Ej. Volvo FMX 460 Carrier Heavy"
                  className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Año Fabricación</label>
                  <input
                    type="text"
                    value={camionAnio}
                    onChange={(e) => setCamionAnio(e.target.value)}
                    placeholder="Ej. 2024"
                    className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Odómetro Inicial</label>
                  <input
                    type="number"
                    required
                    value={camionOdo}
                    onChange={(e) => setCamionOdo(e.target.value)}
                    placeholder="En KM..."
                    className="w-full bg-[#111827]/70 border border-slate-800 p-3 rounded-xl outline-none text-white focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-normal border border-slate-800 bg-slate-950 p-3 rounded-xl">
                ℹ️ <strong>Mando:</strong> Al inicializar la patente en Sheets, Don Saúl le asigna automáticamente un saldo presupuestario de <strong>10,000 BOB</strong>.
              </p>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={activeFormSubmitting !== null}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
              >
                {activeFormSubmitting === 'truck' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" strokeWidth={1} />
                )}
                <span>Guardar Vehículo</span>
              </motion.button>
            </form>
          </div>
        </div>

      </div>

      {/* 6. HISTORICO COMPLETO DE VIAJES REALIZADOS EN LA PLANILLA */}
      <div className={`p-6 ${THEME.glass} ${THEME.shadows} bg-[#1E293B]/40 space-y-4`}>
        <div className="space-y-1">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <CheckCircle className="text-emerald-400 w-5 h-5" strokeWidth={1} />
            Bitácora de Recorridos Completados y Ticket de Pesaje
          </h3>
          <p className="text-xs text-slate-400">
            Histórico detallado de las entregas reportadas a través del módulo móvil choferes.
          </p>
        </div>

        {viajes.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-[#0F172A]/40 border border-[#1E293B] rounded-2xl italic leading-relaxed">
            Sin históricos registrados. Una vez completado un recorrido por tus conductores se actualizará esta lista.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/85">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="p-4">Trayecto Planificado</th>
                  <th className="p-4 font-mono">ID Operativo</th>
                  <th className="p-4">Emisión</th>
                  <th className="p-4 font-mono">Volumen Base</th>
                  <th className="p-4">Estado Viaje</th>
                  <th className="p-4 text-center">Ticket de Pesaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-855/50 bg-[#0F172A]/10">
                {viajes.map((viaje, index) => {
                  const matchingRuta = rutas.find(r => r.id_ruta === viaje.id_ruta);
                  const isCompleted = viaje.estado_viaje === 'Finalizado';
                  return (
                    <tr key={`${viaje.id_viaje}-${index}`} className="hover:bg-[#1E293B]/20 transition">
                      <td className="p-4">
                        <span className="font-extrabold text-white block">Origen: {matchingRuta?.origen || 'Carga Libre'}</span>
                        <span className="text-indigo-400 font-bold block pt-1 text-[10px] uppercase">
                          ➔ Destino: {matchingRuta?.destino || 'Descarga'}
                        </span>
                      </td>
                      <td className="p-4 space-y-0.5 font-mono text-[9px] text-slate-500">
                        <div>ID Viaje: {viaje.id_viaje.substring(0, 8)}...</div>
                        <div>Chofer ID: {viaje.id_chofer.substring(0, 8)}...</div>
                      </td>
                      <td className="p-4 text-slate-400 text-[10px] whitespace-nowrap">
                        {viaje.fecha_inicio ? new Date(viaje.fecha_inicio).toLocaleDateString() : 'SD'}
                      </td>
                      <td className="p-4 font-mono text-[11px]">
                        <span className="text-slate-200 font-bold block">Base: {viaje.toneladas_base || '45'} TN</span>
                        <span className="text-emerald-400 font-bold block">Extra: +{viaje.toneladas_extras || '0'} TN</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-wider font-extrabold ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {viaje.estado_viaje}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {viaje.foto_pesaje_url ? (
                          <div className="inline-flex items-center gap-2">
                            <img
                              referrerPolicy="no-referrer"
                              src={viaje.foto_pesaje_url}
                              alt="Ticket Pesaje"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-700 cursor-pointer hover:scale-150 transition-transform active:scale-95 bg-slate-950"
                              onClick={() => {
                                const nw = window.open();
                                if (nw) nw.document.write(`<img src="${viaje.foto_pesaje_url}" style="max-height:100vh; display:block; margin:auto;" />`);
                              }}
                            />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Vista</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No Capturado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EXPANDABLE COMPREHENSIVE DRILL-DOWN AUDIT SLIDER (DRAWER/MODAL) */}
      <AnimatePresence>
        {selectedDriverForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-end font-sans">
            {/* Dark glass backdrop layout */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDriverForDetail(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Premium industrial audit sheet */}
            <motion.div
              initial={{ x: '100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="absolute top-0 bottom-0 right-0 w-full max-w-lg bg-[#0F172A] border-l border-white/[0.05] shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10"
            >
              <div className="space-y-6">
                
                {/* Header overview */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{selectedDriverForDetail.nombre_completo}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                          Chofer {selectedDriverForDetail.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDriverForDetail(null)}
                    className="text-slate-500 hover:text-white transition duration-200 uppercase font-black text-xs cursor-pointer p-1"
                  >
                    ✕ CERRAR
                  </button>
                </div>

                {/* Audit computational section */}
                {(() => {
                  const driverTrips = viajes.filter(v => v.id_chofer === selectedDriverForDetail.id_chofer);
                  const completed = driverTrips.filter(t => t.estado_viaje === 'Finalizado');
                  
                  // Extract all Gasto items associated with this driver's voyages
                  const driverExpenses = gastos.filter(g => {
                    return driverTrips.some(t => t.id_viaje === g.id_viaje);
                  });

                  let totalBonoAcumulado = 0;
                  let totalTonsBases = 0;
                  let totalTonsExtras = 0;

                  completed.forEach((v) => {
                    const matchingRuta = rutas.find(r => r.id_ruta === v.id_ruta);
                    const basePrice = Number(matchingRuta?.tarifa_base || 500);
                    const baseTons = Number(v.toneladas_base) || 45;
                    const extraTons = Number(v.toneladas_extras) || 0;
                    const extraRateValue = (basePrice / 45) * extraTons;
                    
                    totalBonoAcumulado += (extraRateValue * 0.40);
                    totalTonsBases += baseTons;
                    totalTonsExtras += extraTons;
                  });

                  const totalGastoGenerado = driverExpenses.reduce((sum, g) => sum + safeParse(g.monto), 0);

                  // Extract all Cloudinary URLs from this driver's trips
                  const imageUrls: string[] = [];
                  completed.forEach((v) => {
                    if (v.foto_pesaje_url) {
                      const list = v.foto_pesaje_url.split(',').map(s => s.trim()).filter(Boolean);
                      imageUrls.push(...list);
                    }
                  });

                  return (
                    <div className="space-y-6">
                      
                      {/* STATS TILES GRID */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5 shadow">
                          <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold block">Total Bonos Extras (40%)</span>
                          <strong className="text-xl font-bold font-mono text-emerald-400">{totalBonoAcumulado.toLocaleString()} BOB</strong>
                        </div>
                        
                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5 shadow">
                          <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold block">Fletes Finalizados</span>
                          <strong className="text-xl font-bold font-mono text-white">{completed.length} Viajes</strong>
                        </div>

                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5 shadow">
                          <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold block">Carga Desplazada</span>
                          <strong className="text-base font-extrabold font-mono text-indigo-300">
                            {(totalTonsBases + totalTonsExtras).toLocaleString()} TN
                          </strong>
                        </div>

                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5 shadow">
                          <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold block">Rendición de Gastos</span>
                          <strong className="text-base font-extrabold font-mono text-rose-455">
                            {totalGastoGenerado.toLocaleString()} BOB
                          </strong>
                        </div>
                      </div>

                      {/* HISTORIAL COMPLETO DE GASTOS */}
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800/60 pb-1.5 flex items-center justify-between font-mono">
                          <span>Bitácora de Gastos de Ruta</span>
                          <span className="text-[9.5px] text-slate-500 font-semibold">{driverExpenses.length} entradas</span>
                        </h4>

                        {driverExpenses.length === 0 ? (
                          <div className="p-6 text-center text-slate-600 text-[11px] bg-slate-900/20 border border-slate-850 rounded-xl italic">
                            No se registran gastos rendidos por este chofer.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {driverExpenses.map((expense, index) => (
                              <div key={`${expense.id_gasto}-${index}`} className="p-3 bg-[#0F172A] border border-slate-850 rounded-xl flex items-center justify-between gap-3 text-[11px]">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white uppercase truncate max-w-[120px]">{expense.tipo_gasto}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">{expense.fecha}</span>
                                  </div>
                                  <p className="text-slate-450 text-[10px] italic truncate">{expense.descripcion || 'Sin descripción de ruta'}</p>
                                </div>
                                <div className="font-extrabold text-rose-400 font-mono shrink-0">
                                  -{safeParse(expense.monto).toLocaleString()} BOB
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* GALERÍA DE COMPROBANTES DESDE CLOUDINARY API */}
                      <div className="space-y-2.5 pt-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800/60 pb-1.5 flex items-center justify-between font-mono">
                          <span>Galería de Boletas de Pesaje</span>
                          <span className="text-[9.5px] text-indigo-400 font-bold">{imageUrls.length} capturas</span>
                        </h4>

                        {imageUrls.length === 0 ? (
                          <div className="p-10 text-center text-slate-600 text-[11px] bg-slate-900/20 border border-slate-850 rounded-xl italic leading-relaxed">
                            No se registran fotos de boletas subidas por este conductor. Las fotos subidas a Cloudinary se enlazan automáticamente.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3 p-2 border border-slate-850 bg-slate-950/40 rounded-xl max-h-40 overflow-y-auto scrollbar-thin">
                            {imageUrls.map((url, index) => (
                              <motion.div
                                key={index}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', delay: index * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                                className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer shadow-md group h-20"
                                onClick={() => {
                                  // Open high fidelity Cloudinary link safely in new tab
                                  window.open(url, '_blank');
                                }}
                              >
                                <img
                                  referrerPolicy="no-referrer"
                                  src={url}
                                  alt={`Ticket ${index + 1}`}
                                  className="w-full h-full object-cover transition duration-300 group-hover:brightness-110"
                                />
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                                  <span className="text-[9px] text-white font-bold uppercase tracking-wide">Zoom 🔍</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}

              </div>

              {/* Action footer */}
              <button
                onClick={() => setSelectedDriverForDetail(null)}
                className="w-full bg-[#1E293B] hover:bg-slate-800 text-slate-200 font-black text-xs py-3.5 rounded-xl border border-white/[0.05] transition cursor-pointer mt-6 uppercase tracking-wider shadow"
              >
                CERRAR EXPEDIENTE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

