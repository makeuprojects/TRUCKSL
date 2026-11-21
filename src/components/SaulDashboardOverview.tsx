import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Percent, 
  Activity, 
  Truck, 
  Users, 
  Briefcase, 
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Coins,
  Receipt
} from 'lucide-react';
import { Viaje, Chofer, Camion, Gasto, Ruta } from '../types';

interface SaulDashboardOverviewProps {
  viajes: Viaje[];
  choferes: Chofer[];
  camiones: Camion[];
  gastos: Gasto[];
  rutas: Ruta[];
  ingresosValue: number;
  totalExpensesValue: number;
  margenValue: number;
}

const COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function SaulDashboardOverview({
  viajes,
  choferes,
  camiones,
  gastos,
  rutas,
  ingresosValue,
  totalExpensesValue,
  margenValue
}: SaulDashboardOverviewProps) {
  const [expandedTripId, setExpandedTripId] = React.useState<string | null>(null);

  const safeParse = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const getTripTotalExpenses = (tripId: string) => {
    return gastos
      .filter(g => g.tipo_gasto !== 'Pago Chofer' && g.id_viaje && String(g.id_viaje).trim().toLowerCase() === String(tripId).trim().toLowerCase())
      .reduce((acc, g) => acc + safeParse(g.monto), 0);
  };

  // 1. Data for Income vs Expenses Bar Chart (comparing the base fare + extras of last 6 completed/active trips)
  const recentTripsData = viajes.slice(-6).map(v => {
    const totalGasto = getTripTotalExpenses(v.id_viaje);
    const route = rutas.find(r => r.id_ruta === v.id_ruta);
    const basePrice = Number(v.tarifa_pactada || route?.tarifa_base || 5000);
    const baseTons = Number(v.toneladas_base || 45) || 45;
    const extraTonsRaw = Number(v.toneladas_extras) || 0;
    const totalTons = baseTons + extraTonsRaw;
    const extraTons = baseTons < 45 ? Math.max(0, totalTons - 45) : extraTonsRaw;
    const extraRateValue = (basePrice / baseTons) * extraTons;
    const baseFare = basePrice + extraRateValue;
    
    const label = route ? `${route.origen.substring(0, 3)}-${route.destino.substring(0, 3)}` : `V-${v.id_viaje.substring(0, 4)}`;
    return {
      name: label,
      id: v.id_viaje,
      Ingreso: baseFare || 4500, // fallback for visual completeness if 0
      Gastos: totalGasto,
      Utilidad: (baseFare || 4500) - totalGasto
    };
  });

  // 2. Data for Expense Distribution Pie Chart
  const expenseCategories = gastos
    .filter(g => g.tipo_gasto !== 'Pago Chofer')
    .reduce((acc: { [key: string]: number }, curr) => {
    let cat = 'OTROS';
    const tipo = String(curr.tipo_gasto || '').toLowerCase();
    if (tipo.includes('diesel') || tipo.includes('combustible')) {
      cat = 'COMBUSTIBLE';
    } else if (tipo.includes('peaje') || tipo.includes('vias') || tipo.includes('reten')) {
      cat = 'PEAJES / RETENES';
    } else if (tipo.includes('taller') || tipo.includes('repuesto') || tipo.includes('mantenimiento')) {
      cat = 'MANTENIMIENTO';
    } else if (tipo.includes('viatico') || tipo.includes('alimentacion') || tipo.includes('hospedaje')) {
      cat = 'VIÁTICOS';
    }
    acc[cat] = (acc[cat] || 0) + safeParse(curr.monto);
    return acc;
  }, {});

  const pieData = Object.keys(expenseCategories).map(key => ({
    name: key,
    value: parseFloat(expenseCategories[key].toFixed(2))
  }));

  // Fallback if pieData is empty
  const finalPieData = pieData.length > 0 ? pieData : [
    { name: 'COMBUSTIBLE', value: 4500 },
    { name: 'PEAJES / RETENES', value: 1200 },
    { name: 'VIÁTICOS', value: 1800 },
    { name: 'MANTENIMIENTO', value: 2500 },
    { name: 'OTROS', value: 900 }
  ];

  // 3. Data for Expense Trend Area Chart over time
  const sortedTripsForTrend = [...viajes]
    .filter(v => v.fecha_inicio)
    .sort((a, b) => new Date(a.fecha_inicio!).getTime() - new Date(b.fecha_inicio!).getTime())
    .slice(-8)
    .map(v => {
      const totalGasto = getTripTotalExpenses(v.id_viaje);
      return {
        fecha: v.fecha_inicio ? new Date(v.fecha_inicio).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : 'S/F',
        id: `ID: ${v.id_viaje}`,
        'Monto Gastado': totalGasto
      };
    });

  const finalTrendData = sortedTripsForTrend.length > 0 ? sortedTripsForTrend : [
    { fecha: '05 Jun', 'Monto Gastado': 1200 },
    { fecha: '10 Jun', 'Monto Gastado': 2100 },
    { fecha: '14 Jun', 'Monto Gastado': 1800 },
    { fecha: '18 Jun', 'Monto Gastado': 3100 },
    { fecha: '22 Jun', 'Monto Gastado': 2500 },
    { fecha: '25 Jun', 'Monto Gastado': 1900 },
    { fecha: '28 Jun', 'Monto Gastado': 3400 }
  ];

  // Calculations for summary stats
  const activeTripsCount = viajes.filter(v => v.estado_viaje === 'En Ciclo').length;
  const completedTripsCount = viajes.filter(v => v.estado_viaje === 'Finalizado').length;
  const maintenanceTrucksCount = camiones.filter(c => c.estado === 'Mantenimiento').length;
  const activeTrucksCount = camiones.filter(c => c.estado === 'Activo').length;
  const profitabilityRate = ingresosValue > 0 ? ((margenValue / ingresosValue) * 100) : 0;

  // Filter low balance drivers (<20% of budget or < 1200 BOB)
  const lowBalanceDrivers = choferes.filter(d => {
    const isAdmin = d.id_chofer === 'don_saul' || d.nombre_completo === 'Don Saúl' || d.id_chofer === 'admin';
    if (isAdmin) return false;
    const budget = safeParse(d.presupuesto) || 10000;
    const balance = d.saldo_actual !== undefined && d.saldo_actual !== "" ? safeParse(d.saldo_actual) : budget;
    return balance < (budget * 0.20) || balance < 1200;
  });

  return (
    <div id="saul-dashboard-overview-root" className="space-y-8 animate-fade-in">
      
      {/* ALERTA CRÍTICA: CHOFERES CON SALDO BAJO */}
      {lowBalanceDrivers.length > 0 && (
        <div className="relative overflow-hidden bg-rose-950/40 border border-rose-500/30 rounded-2xl p-5 shadow-2xl animate-pulse-subtle">
          <div className="absolute top-0 right-0 p-4 text-rose-500/10 pointer-events-none">
            <AlertCircle className="w-24 h-24 stroke-[1.2]" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest font-mono">
                  Alerta de Presupuesto Crítico
                </span>
              </div>
              <h3 className="text-base font-black text-rose-100 font-sans tracking-tight">
                Hay {lowBalanceDrivers.length} choferes con caja chica en nivel crítico de saldo
              </h3>
              <p className="text-xs text-rose-300 max-w-2xl leading-relaxed">
                Su saldo actual disponible está por debajo del 20% de su fondo asignado o es menor a 1,200 Bs. Realice un desembolso para evitar paradas o falta de caja en retenes/peajes.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 relative z-10">
            {lowBalanceDrivers.map((driver, index) => {
              const budget = safeParse(driver.presupuesto) || 10000;
              const balance = driver.saldo_actual !== undefined && driver.saldo_actual !== "" ? safeParse(driver.saldo_actual) : budget;
              const percentage = budget > 0 ? (balance / budget) * 100 : 0;
              return (
                <div 
                  key={`${driver.id_chofer}-${index}`}
                  className="bg-slate-950/70 border border-rose-500/20 rounded-xl p-3 flex flex-col justify-between hover:border-rose-500/45 transition duration-300"
                >
                  <div>
                    <div className="flex justify-between items-start gap-1.5">
                      <span className="font-extrabold text-xs text-slate-100 block truncate max-w-[120px]">
                        👤 {driver.nombre_completo}
                      </span>
                      <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[8px] font-black uppercase rounded leading-none shrink-0 font-mono">
                        {percentage.toFixed(0)}% Restante
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">Bs.</span>
                      <span className="text-lg font-black text-rose-400 font-mono leading-none">
                        {balance.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">/ {budget.toLocaleString('es-BO', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-rose-500/10 flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-mono">Tel: {driver.telefono || 'Sin celular'}</span>
                    <span className="text-[8px] text-rose-400 font-black uppercase tracking-wider animate-pulse">
                      ⚡ Requiere Recarga
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Multi-Dimension Cards row with Refined Dark Glassmorphism & Mobile-First GPU Speed */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
        
        {/* Card 1: Eficiencia de Margen */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="group glass-sheen perf-contain bg-gradient-to-b from-slate-900/85 to-slate-950/95 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-emerald-500/35 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-[0_8px_28px_-8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-300 ease-natural md:hover:-translate-y-1 cursor-default relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-bold uppercase tracking-wider transition-colors">Rentabilidad</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300 ease-natural">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10 flex items-end justify-between gap-2">
            <div>
              <h4 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-400 tabular-nums">
                {profitabilityRate.toFixed(1)}%
              </h4>
              <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium block mt-1">
                {profitabilityRate >= 30 ? 'Margen óptimo' : 'Margen normal'}
              </span>
            </div>
            <svg viewBox="0 0 42 18" className="w-10 h-5 shrink-0 opacity-85" fill="none">
              <motion.path
                d="M 2,14 L 10,11 L 18,13 L 27,6 L 34,8 L 40,3"
                stroke="#34d399"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0.2 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Card 2: Monitoreo Viajes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="group glass-sheen perf-contain bg-gradient-to-b from-slate-900/85 to-slate-950/95 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-sky-500/35 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-[0_8px_28px_-8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-300 ease-natural md:hover:-translate-y-1 cursor-default relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-bold uppercase tracking-wider transition-colors">Viajes (Status)</span>
            <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform duration-300 ease-natural">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10 flex items-end justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">{viajes.length}</span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">totales</span>
              </div>
              <div className="flex gap-2 mt-1 font-mono tabular-nums">
                <span className="text-[9.5px] sm:text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {completedTripsCount} Fin
                </span>
                <span className="text-[9.5px] sm:text-[10px] text-sky-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> {activeTripsCount} Cicl
                </span>
              </div>
            </div>
            <svg viewBox="0 0 42 18" className="w-10 h-5 shrink-0 opacity-85" fill="none">
              <motion.path
                d="M 2,13 L 9,9 L 17,12 L 24,5 L 33,7 L 40,4"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0.2 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Card 3: Estado de Flota */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="group glass-sheen perf-contain bg-gradient-to-b from-slate-900/85 to-slate-950/95 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-indigo-500/35 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-[0_8px_28px_-8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-300 ease-natural md:hover:-translate-y-1 cursor-default relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-bold uppercase tracking-wider transition-colors">Unidades Flota</span>
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-300 ease-natural">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">{camiones.length}</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">camiones</span>
            </div>
            <div className="flex gap-2 mt-1 tabular-nums">
              <span className="text-[9.5px] sm:text-[10px] text-slate-300 font-medium">
                {activeTrucksCount} Operando
              </span>
              {maintenanceTrucksCount > 0 && (
                <span className="text-[9.5px] sm:text-[10px] text-amber-400 font-bold">
                  ({maintenanceTrucksCount} Taller)
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Card 4: Choferes Totales */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="group glass-sheen perf-contain bg-gradient-to-b from-slate-900/85 to-slate-950/95 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-violet-500/35 p-4 sm:p-5 rounded-3xl flex flex-col justify-between shadow-[0_8px_28px_-8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-300 ease-natural md:hover:-translate-y-1 cursor-default relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-bold uppercase tracking-wider transition-colors">Personal / Choferes</span>
            <div className="p-1.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform duration-300 ease-natural">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">{choferes.length}</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">conductores</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium block mt-1 truncate">
              Sincronización activa
            </span>
          </div>
        </motion.div>

      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Bar Chart of Income vs Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 perf-contain bg-gradient-to-b from-slate-900/85 to-slate-950/95 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-3xl p-5 sm:p-6 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
                Comparativa de Viajes Recientes (Ingreso vs Gasto)
              </h3>
              <p className="text-[10px] text-slate-400">Últimos 6 fletes liquidados o activos en ruta</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] text-slate-300 font-bold font-mono">Flete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
                <span className="text-[9px] text-slate-300 font-bold font-mono">Gasto</span>
              </div>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentTripsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}
                  itemStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <Bar dataKey="Ingreso" fill="#10b981" radius={[6, 6, 0, 0]} name="Ingreso Flete (Bs.)" />
                <Bar dataKey="Gastos" fill="#f97316" radius={[6, 6, 0, 0]} name="Gastos Ruta (Bs.)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right: Pie Chart for Category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="perf-contain bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-3xl p-5 sm:p-6 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
              Distribución de Gastos por Categoría
            </h3>
            <p className="text-[10px] text-slate-400">Clasificación acumulada de facturas reportadas</p>
          </div>

          <div className="h-[180px] w-full relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="rgba(2,6,23,0.7)"
                  strokeWidth={2}
                >
                  {finalPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)' }}
                  itemStyle={{ fontSize: '11px', color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Total</span>
              <span className="text-sm font-black font-mono text-emerald-400 mt-1 tabular-nums">
                Bs.{totalExpensesValue.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left pt-3 border-t border-white/[0.06]">
            {finalPieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase truncate leading-none">{entry.name}</span>
                  <span className="text-[10px] font-mono font-black text-slate-200 mt-0.5 tabular-nums">Bs.{entry.value.toLocaleString('es-BO', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Bottom Area chart: Expenses trend */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
        className="perf-contain bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-3xl p-5 sm:p-6 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors duration-300 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
            Tendencia de Costos de Ruta (Historial de Desembolsos)
          </h3>
          <p className="text-[10px] text-slate-400">Curva de gasto operativo en los últimos viajes liquidados</p>
        </div>

        <div className="h-[185px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={finalTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
              <XAxis 
                dataKey="fecha" 
                stroke="#94a3b8" 
                fontSize={10} 
                fontWeight="bold" 
                tickLine={false} 
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                fontWeight="bold" 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}
              />
              <Area 
                type="monotone" 
                dataKey="Monto Gastado" 
                stroke="#38bdf8" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorGastos)" 
                name="Costos de Ruta (Bs.)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 📋 AUDITORÍA DE RENDIMIENTO POR VIAJE (Ingresos vs. Gastos) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="perf-contain bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2 flex-wrap">
              <span>📋 Auditoría de Rendimiento por Viaje</span>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-lg uppercase font-mono tracking-widest whitespace-nowrap shrink-0">Datos Reales</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Desglose uno a uno de ingresos por flete (tarifa base + toneladas extras) y gastos reales reportados por conductores en ruta.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] font-mono shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Ingresos (Flete)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Gastos (Ruta)</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Margen Neto</span>
            </div>
          </div>
        </div>

        {/* Audit list */}
        <div className="space-y-3.5">
          {viajes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              No hay viajes registrados para auditar.
            </div>
          ) : (
            [...viajes]
              .slice()
              .reverse()
              .map((v, idx) => {
                const route = rutas.find(r => r.id_ruta === v.id_ruta);
                const driver = choferes.find(c => c.id_chofer === v.id_chofer);
                const truck = camiones.find(c => c.id_camion === v.id_camion);

                const basePrice = Number(v.tarifa_pactada || route?.tarifa_base || 5000);
                const baseTons = Number(v.toneladas_base || 45) || 45;
                const extraTonsRaw = Number(v.toneladas_extras) || 0;
                const totalTons = baseTons + extraTonsRaw;
                const extraTons = baseTons < 45 ? Math.max(0, totalTons - 45) : extraTonsRaw;
                const extraRateValue = (basePrice / baseTons) * extraTons;
                const totalIncome = basePrice + extraRateValue;

                // Filter expenses that belong to this trip
                const tripExpensesList = gastos.filter(
                  g => g.tipo_gasto !== 'Pago Chofer' && g.id_viaje && String(g.id_viaje).trim().toLowerCase() === String(v.id_viaje).trim().toLowerCase()
                );

                const totalGasto = tripExpensesList.reduce((acc, g) => acc + safeParse(g.monto), 0);
                const netProfit = totalIncome - totalGasto;
                const marginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
                
                const isExpanded = expandedTripId === v.id_viaje;

                let progressColor = 'bg-emerald-500';
                let textColor = 'text-emerald-400';
                let borderBgColor = 'border-emerald-500/20 bg-emerald-950/20';

                if (marginPct < 30) {
                  progressColor = 'bg-rose-500';
                  textColor = 'text-rose-400';
                  borderBgColor = 'border-rose-500/20 bg-rose-950/20';
                } else if (marginPct < 60) {
                  progressColor = 'bg-amber-500';
                  textColor = 'text-amber-400';
                  borderBgColor = 'border-amber-500/20 bg-amber-950/20';
                }

                return (
                  <div 
                    key={`${v.id_viaje}-${idx}`}
                    className="perf-contain bg-slate-950/55 hover:bg-slate-950/85 border border-white/[0.06] hover:border-white/[0.15] rounded-2xl transition-colors duration-200 ease-natural overflow-hidden"
                  >
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => setExpandedTripId(isExpanded ? null : v.id_viaje)}
                      className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none active:scale-[0.995] transition-transform duration-150"
                    >
                      {/* Left: Route Name, ID & Driver */}
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-slate-900/90 border border-white/[0.08] rounded-xl text-sky-400 font-mono text-[10px] font-bold leading-none flex items-center justify-center shrink-0 tabular-nums">
                          ID: {v.id_viaje.substring(0, 6)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-100 uppercase tracking-tight flex-wrap">
                            <span>{route?.origen || 'Origen'}</span>
                            <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>{route?.destino || 'Destino'}</span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                              v.estado_viaje === 'Finalizado' 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                            }`}>
                              {v.estado_viaje}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            👤 Chofer: <strong className="text-slate-300">{driver?.nombre_completo || 'No asignado'}</strong> • 🚛 Vehículo: <strong className="text-slate-300">{truck?.modelo || 'S/N'} ({truck?.placa || 'S/P'})</strong>
                          </p>
                        </div>
                      </div>

                      {/* Right: Income, Expenses, Profit Summary */}
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono tabular-nums">
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 block uppercase font-sans font-bold">Ingreso Flete</span>
                          <span className="text-emerald-400 font-black">Bs. {totalIncome.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 block uppercase font-sans font-bold">Gastos Ruta</span>
                          <span className="text-rose-400 font-black">Bs. {totalGasto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 block uppercase font-sans font-bold">Utilidad Neta</span>
                          <span className={`font-black ${textColor}`}>Bs. {netProfit.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] text-slate-400 block uppercase font-sans font-bold">Margen Neto</span>
                            <span className={`text-[10px] font-black ${textColor}`}>{marginPct.toFixed(1)}%</span>
                          </div>
                          <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div className={`h-full transition-all duration-500 ${progressColor}`} style={{ width: `${Math.max(0, Math.min(100, marginPct))}%` }} />
                          </div>
                        </div>

                        {/* Animated Chevron Icon */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="text-slate-400"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Collapsible Body with expense lists and income formula detail */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-4 border-t border-white/[0.06] bg-slate-950/35">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              {/* Left: How Saul manages Income (Flete Formula) */}
                              <div className="space-y-2 bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl">
                                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">
                                  ⚙️ Gestión de Ingresos (Fórmula Don Saúl)
                                </span>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                  Don Saúl determina los ingresos del flete directamente configurando la <strong>Tarifa Base</strong> de la ruta en la pestaña de configuración. Si hay sobrepeso (más de {baseTons} toneladas), se añade el flete de extras:
                                </p>
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-800 text-[10px] font-mono">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Tarifa de Ruta Base (Hasta {baseTons} t):</span>
                                    <span className="text-slate-200 font-black">Bs. {basePrice.toLocaleString('es-BO')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Toneladas Extras Transportadas:</span>
                                    <span className="text-blue-400 font-black">{extraTons} t</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Bono por Sobrepeso:</span>
                                    <span className="text-emerald-400 font-black">+Bs. {extraRateValue.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between pt-1.5 border-t border-slate-800 font-black text-xs text-slate-100">
                                    <span className="uppercase font-sans">Total Ingreso Cobrado:</span>
                                    <span>Bs. {totalIncome.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Itemized Expenses on the Route */}
                              <div className="space-y-2 bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-wider block">
                                    ⛽ Comprobantes y Gastos en Ruta
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">Total: {tripExpensesList.length} registros</span>
                                </div>
                                
                                {tripExpensesList.length === 0 ? (
                                  <div className="text-center py-6 text-[10px] text-slate-500 italic">
                                    El conductor aún no ha subido comprobantes de gastos en esta ruta.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 font-sans">
                                    {tripExpensesList.map((g, idx) => (
                                      <div 
                                        key={`${g.id_gasto}-${idx}`}
                                        className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] bg-slate-800 text-slate-300 font-black font-mono px-1.5 py-0.5 rounded uppercase">
                                              {g.tipo_gasto.replace(/⛽|🍲|🔧|🜔|🛢️|🎫/g, '').trim()}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-mono">
                                              {g.timestamp_registro ? new Date(g.timestamp_registro).toLocaleDateString('es-BO') : ''}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-300 mt-1 leading-normal truncate">{g.descripcion || 'Sin descripción'}</p>
                                        </div>
                                        <span className="text-xs font-black text-rose-400 font-mono shrink-0 tabular-nums">
                                          -Bs. {safeParse(g.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Summary of margin explanation */}
                            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10.5px] font-sans ${borderBgColor}`}>
                              <p className="text-slate-200 leading-normal">
                                ℹ️ <strong>Margen de Utilidad del Viaje:</strong> En esta ruta, Don Saúl retiene el <strong>{marginPct.toFixed(1)}%</strong> del flete cobrado después de liquidar los gastos operativos autodeclarados del chofer.
                              </p>
                              <span className={`font-black uppercase shrink-0 tabular-nums ${textColor}`}>
                                Retorno Neto: Bs. {netProfit.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
          )}
        </div>
      </motion.div>

    </div>
  );
}
