import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gasto, Chofer, Camion } from '../types';
import { Maximize2, X, ImageIcon, Calendar, CreditCard, ChevronRight } from 'lucide-react';

interface LiveExpenseFeedProps {
  gastos: Gasto[];
  choferes: Chofer[];
  camiones: Camion[];
}

export default function LiveExpenseFeed({ gastos, choferes, camiones }: LiveExpenseFeedProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null);

  // Match drivers by ID or name
  const getDriverName = (id_chofer?: string) => {
    if (!id_chofer) return 'Don Saúl (Admin)';
    const trimmedId = String(id_chofer).trim();
    const c = choferes.find((driver) => 
      driver.id_chofer === trimmedId || 
      driver.nombre_completo.toLowerCase() === trimmedId.toLowerCase()
    );
    if (c) return c.nombre_completo;
    // If it's literally a name, return it as capitalized clean name
    if (/^[A-Za-z\s]+$/.test(trimmedId)) {
      return trimmedId;
    }
    return `Chofer #${trimmedId}`;
  };

  // Match trucks by ID to get their Placa
  const getTruckPlate = (id_camion?: string) => {
    if (!id_camion) return 'N/A';
    const trimmedId = String(id_camion).trim();
    const t = camiones?.find((truck) => 
      truck.id_camion === trimmedId
    );
    if (t && t.placa) return t.placa;
    return trimmedId;
  };

  // Safe parsing helper
  const safeParse = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Format expense dates
  const formatExpenseDate = (dateStr?: string) => {
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
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Sort gastos descending by date or id if dates are equal
  const sortedGastos = [...gastos].sort((a, b) => {
    const timeA = new Date(a.fecha).getTime() || 0;
    const timeB = new Date(b.fecha).getTime() || 0;
    return timeB - timeA;
  });

  return (
    <div id="live-expense-feed" className="bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.18] p-6 transition-all duration-300 flex flex-col h-[400px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-3.5 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
          <h3 className="font-extrabold text-slate-100 text-sm uppercase tracking-wider font-sans">
            Módulo de Rendición en Vivo • Liqui-Feed
          </h3>
        </div>
        <span className="text-[10px] text-slate-200 font-mono bg-white/10 px-2 py-0.5 rounded border border-white/20">
          {sortedGastos.length} reportes
        </span>
      </div>

      {sortedGastos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 font-sans space-y-2">
          <CreditCard className="w-10 h-10 stroke-[1.2] text-slate-500" />
          <p className="text-xs">No hay liquidaciones reportadas aún.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {sortedGastos.map((g, idx) => {
            const driverName = getDriverName(g.id_chofer);
            const montoNum = safeParse(g.monto);
            const rawPhotos = g.foto_url ? g.foto_url.split(',').map((u) => u.trim()).filter(Boolean) : [];

            return (
              <motion.div
                key={`${g.id_gasto}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
                className="group flex items-start justify-between p-3.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700/60 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Category icon or thumbnail */}
                  {rawPhotos.length > 0 ? (
                    <div 
                      onClick={() => {
                        setSelectedImage(rawPhotos[0]);
                        setSelectedGasto(g);
                      }}
                      className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800/80 overflow-hidden relative cursor-zoom-in shrink-0 group/thumb"
                    >
                      <img
                        src={rawPhotos[0]}
                        alt="Comprobante"
                        className="w-full h-full object-cover transition duration-300 transform group-hover/thumb:scale-115"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs uppercase">
                      {g.tipo_gasto ? g.tipo_gasto.substring(0, 3) : 'GST'}
                    </div>
                  )}

                  {/* Driver & details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-200 text-xs group-hover:text-orange-400 transition truncate max-w-[140px]">
                        {driverName}
                      </span>
                      <span className="bg-slate-950 text-slate-300 border border-slate-800/60 text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded">
                        {g.tipo_gasto || 'General'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-100 font-medium leading-relaxed mt-1 max-w-[240px] truncate" title={g.descripcion}>
                      {g.descripcion || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[9.5px] text-slate-350 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-sky-400" />
                        {formatExpenseDate(g.fecha)}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">Camión: {getTruckPlate(g.id_camion)}</span>
                    </div>
                  </div>
                </div>

                {/* Amount in Geist Mono */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono mr-1">BOB</span>
                  <span className="text-sm font-black text-rose-450 font-mono tracking-tight group-hover:text-rose-400 transition">
                    -{montoNum.toLocaleString('es-BO', { minimumFractionDigits: 1 })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox view modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative max-w-xl w-full bg-slate-900 border border-slate-850 rounded-3xl p-4 overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-extrabold text-slate-100 text-xs uppercase tracking-wide">
                    Auditoría de Comprobante Digital
                  </h4>
                  {selectedGasto && (
                    <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                      Rendición por {getDriverName(selectedGasto.id_chofer)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedGasto(null);
                  }}
                  className="text-slate-300 hover:text-white p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Box Containing High Res Image */}
              <div className="h-[400px] w-full my-3 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-800">
                <img
                  src={selectedImage}
                  alt="High Resolution Bill"
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {selectedGasto && (() => {
                const modalPhotos = selectedGasto.foto_url ? selectedGasto.foto_url.split(',').map((u) => u.trim()).filter(Boolean) : [];
                return modalPhotos.length > 1 ? (
                  <div className="flex gap-2 justify-center pb-3 overflow-x-auto shrink-0">
                    {modalPhotos.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImage(url)}
                        className={`w-12 h-12 rounded-lg border border-slate-800 overflow-hidden bg-slate-950 cursor-pointer shrink-0 transition-all ${
                          selectedImage === url ? 'ring-2 ring-blue-500 border-transparent scale-105 shadow-md shadow-blue-500/20' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Comprobante Thumbnail ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}

              {selectedGasto && (
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-left shrink-0">
                  <div>
                    <span className="text-[9px] text-sky-450 font-mono uppercase font-bold tracking-wide">
                      Detalle de Liquidación
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed max-w-[360px] truncate">
                      {selectedGasto.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-mono block">Monto Facturado</span>
                    <span className="text-sm font-black text-rose-400 font-mono">
                      BOB {safeParse(selectedGasto.monto).toLocaleString('es-BO', { minimumFractionDigits: 1 })}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
