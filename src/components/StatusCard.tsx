import React from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  Wrench, 
  Compass, 
  CheckCircle, 
  AlertTriangle, 
  Droplet,
  Power,
  DollarSign
} from 'lucide-react';
import { Camion, ServiceAlert } from '../types';
import { THEME } from '../theme.config';

interface StatusCardProps {
  key?: string;
  camion: Camion;
  serviceAlert?: ServiceAlert;
  onSelectAction?: (camionId: string) => void;
}

export default function StatusCard({ camion, serviceAlert, onSelectAction }: StatusCardProps) {
  // Determine physical health and icon illustration based on condition
  const getStatusConfig = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'mantenimiento':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20',
          text: 'text-amber-400',
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          label: 'Mantenimiento',
          Icon: Wrench,
          description: 'Sometido a reajuste técnico'
        };
      case 'inactivo':
        return {
          bg: 'bg-rose-500/10 border-rose-500/20',
          text: 'text-rose-400',
          badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          label: 'Inactivo',
          Icon: Power,
          description: 'Fuera de operaciones'
        };
      case 'activo':
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: 'Operativo',
          Icon: Truck,
          description: 'En circulación regular'
        };
    }
  };

  const config = getStatusConfig(camion.estado);
  const StateIcon = config.Icon;

  // Retrieve oil status alert details
  const hasAlert = !!serviceAlert;
  const isCritical = serviceAlert?.estado_alerta === 'CRITICAL';
  const isNear = serviceAlert?.estado_alerta === 'NEAR_LIMIT';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={THEME.transitions.springHover}
      className={`relative overflow-hidden p-5 ${THEME.glass} transition-all duration-300 flex flex-col justify-between h-full bg-[#1A2333]/90`}
    >
      {/* Structural subtle glow in ambient borders */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />

      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-medium text-slate-400 tracking-wider uppercase">
              Chasis / Camión
            </span>
            <h4 className="font-extrabold text-sm text-white tracking-tight uppercase line-clamp-1">
              {camion.modelo}
            </h4>
            <span className="text-[10px] text-slate-500 font-semibold block">
              Año {camion.anio || '2023'}
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${config.badge}`}>
            {config.label}
          </span>
        </div>

        {/* Dynamic Vector Illustration Center */}
        <div className={`p-4 rounded-xl border flex items-center justify-center relative group min-h-[96px] ${config.bg}`}>
          {/* Animated rings for active state */}
          {camion.estado === 'Activo' && (
            <span className="absolute w-12 h-12 rounded-full bg-emerald-500/5 border border-emerald-500/10 animate-ping -z-10" />
          )}
          {camion.estado === 'Mantenimiento' && (
            <span className="absolute w-12 h-12 rounded-full bg-amber-500/5 border border-amber-500/10 animate-pulse -z-10" />
          )}

          <div className="text-center space-y-2">
            <StateIcon 
              className={`w-9 h-9 mx-auto ${config.text} transition-transform group-hover:scale-105`} 
              strokeWidth={1.2} 
            />
            <p className="text-[10px] text-slate-400 font-medium leading-normal max-w-[150px] mx-auto">
              {config.description}
            </p>
          </div>
        </div>

        {/* Odometer and Remaining Budget */}
        <div className="grid grid-cols-2 gap-3.5 border-t border-slate-800/60 pt-3.5 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Millas / Odómetro
            </span>
            <div className="text-white font-bold font-mono tracking-tight text-xs flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-400" strokeWidth={1} />
              {Number(camion.kilometraje_actual || 0).toLocaleString()} KM
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Fondos en Sheets
            </span>
            <div className="text-emerald-400 font-bold font-mono tracking-tight text-xs flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500/70" strokeWidth={1} />
              {Number(camion.saldo_presupuesto || 0).toLocaleString()} BOB
            </div>
          </div>
        </div>
      </div>

      {/* Traffic light (Semáforo) oil warning bottom bar */}
      <div className="mt-4 border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] leading-none">
        <div className="flex items-center gap-1.5">
          <Droplet 
            className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-400' : isNear ? 'text-amber-400' : 'text-slate-500'}`} 
            strokeWidth={1.5} 
          />
          <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wide">Lubricante:</span>
        </div>

        <div>
          {hasAlert ? (
            <span className={`px-2 py-0.5 rounded font-mono font-extrabold text-[9px] uppercase tracking-wider ${
              isCritical 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : isNear 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isCritical ? '⚡ CAMBIO YA' : isNear ? '⚠️ CRÍTICO' : '✓ ÓPTIMO'}
            </span>
          ) : (
            <span className="text-slate-500 italic text-[10px]">Sin Registro</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
