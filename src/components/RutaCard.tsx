import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Loader2 } from 'lucide-react';
import { Ruta } from '../types';

interface RutaCardProps {
  key?: string | number;
  id: string;
  ruta: Ruta;
  onStartTrip: (ruta: Ruta) => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function RutaCard({ id, ruta, onStartTrip, isLoading, disabled }: RutaCardProps) {
  return (
    <motion.div
      layoutId={`ruta-card-${ruta.id_ruta}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      whileHover={{ 
        scale: 1.04, 
        y: -4,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
        transition: { duration: 0.2, ease: "easeOut" } 
      }}
      className="bg-[#0A192F]/80 backdrop-blur-md border border-[#112240] rounded-3xl p-6 hover:border-[#233554]/80 transition-colors space-y-4 flex flex-col justify-between"
      id={id}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-orange-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-sm">
              <MapPin className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tight leading-none mb-0.5">ORIGEN</span>
              <span className="text-white font-extrabold text-sm sm:text-base leading-tight block truncate">{ruta.origen}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-sm">
              <MapPin className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tight leading-none mb-0.5">DESTINO</span>
              <span className="text-white font-extrabold text-sm sm:text-base leading-tight block truncate">{ruta.destino}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 px-3.5 py-2.5 rounded-2xl text-center shadow-inner shrink-0 self-start">
          <span className="text-[9px] block font-mono font-bold tracking-wider text-emerald-500 leading-none mb-1">TARIFA</span>
          <span className="text-sm font-black font-mono leading-none">{ruta.tarifa_base} BOB</span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={disabled || isLoading}
        onClick={() => onStartTrip(ruta)}
        className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:bg-[#112240] disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black tracking-wide text-xs sm:text-sm py-3.5 rounded-2xl leading-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-orange-500/25"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-950 shrink-0" />
            <span>INICIANDO...</span>
          </>
        ) : (
          <span>INICIAR VIAJE</span>
        )}
      </motion.button>
    </motion.div>
  );
}
