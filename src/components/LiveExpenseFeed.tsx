import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gasto, Chofer, Camion } from '../types';
import { Maximize2, X, Calendar, CreditCard, Download } from 'lucide-react';

interface LiveExpenseFeedProps {
  gastos: Gasto[];
  choferes: Chofer[];
  camiones: Camion[];
}

export default function LiveExpenseFeed({ gastos, choferes, camiones }: LiveExpenseFeedProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Highlight newly arriving expenses without flashing existing records on initial mount
  useEffect(() => {
    const currentKeys = gastos.map((g, i) => String(g.id_gasto || `${g.fecha}-${g.monto}-${i}`));
    if (!initializedRef.current) {
      if (currentKeys.length > 0) {
        currentKeys.forEach((k) => seenIdsRef.current.add(k));
        initializedRef.current = true;
      }
      return;
    }

    const newlyAdded = currentKeys.filter((k) => !seenIdsRef.current.has(k));
    if (newlyAdded.length > 0) {
      newlyAdded.forEach((k) => seenIdsRef.current.add(k));
      setFreshIds((prev) => {
        const next = new Set(prev);
        newlyAdded.forEach((k) => next.add(k));
        return next;
      });
      const timer = setTimeout(() => {
        setFreshIds((prev) => {
          const next = new Set(prev);
          newlyAdded.forEach((k) => next.delete(k));
          return next;
        });
      }, 3600);
      return () => clearTimeout(timer);
    }
  }, [gastos]);

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

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `comprobante_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante_${Date.now()}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div id="live-expense-feed" className="perf-contain bg-gradient-to-b from-slate-900/80 to-slate-950/90 backdrop-blur-md md:backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] rounded-3xl p-5 sm:p-6 transition-colors duration-300 ease-natural flex flex-col h-[400px] shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5 mb-4 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
          </span>
          <h3 className="font-extrabold text-slate-100 text-xs sm:text-sm uppercase tracking-wider font-sans truncate">
            Módulo de Rendición en Vivo • Liqui-Feed
          </h3>
        </div>
        <span className="text-[10px] text-slate-200 font-mono bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-white/[0.12] whitespace-nowrap shrink-0 tabular-nums">
          {sortedGastos.length} reportes
        </span>
      </div>

      {sortedGastos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 font-sans space-y-2">
          <CreditCard className="w-10 h-10 stroke-[1.2] text-slate-500" />
          <p className="text-xs">No hay liquidaciones reportadas aún.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {sortedGastos.map((g, idx) => {
            const driverName = getDriverName(g.id_chofer);
            const montoNum = safeParse(g.monto);
            const rawPhotos = g.foto_url ? g.foto_url.split(',').map((u) => u.trim()).filter(Boolean) : [];
            const itemKey = String(g.id_gasto || `${g.fecha}-${g.monto}-${idx}`);
            const isFresh = freshIds.has(itemKey);
            const animateItem = idx < 8;

            return (
              <motion.div
                key={`${itemKey}-${idx}`}
                initial={animateItem ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: animateItem ? idx * 0.035 : 0, ease: [0.16, 1, 0.3, 1] }}
                className={`group flex items-start justify-between p-3.5 rounded-2xl bg-slate-900/55 hover:bg-slate-900/85 border border-white/[0.06] hover:border-white/[0.15] hover:-translate-y-0.5 shadow-sm transition-all duration-200 ease-natural ${
                  isFresh ? 'feed-item-fresh border-emerald-500/40' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Category icon or thumbnail */}
                  {rawPhotos.length > 0 ? (
                    <motion.div 
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        setSelectedImage(rawPhotos[0]);
                        setSelectedGasto(g);
                      }}
                      className="w-12 h-12 rounded-xl bg-slate-950 border border-white/[0.08] overflow-hidden relative cursor-zoom-in shrink-0 group/thumb"
                    >
                      <img
                        src={rawPhotos[0]}
                        alt="Comprobante"
                        className="w-full h-full object-cover transition-transform duration-300 ease-natural group-hover/thumb:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/[0.08] flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs uppercase font-mono">
                      {g.tipo_gasto ? g.tipo_gasto.substring(0, 3) : 'GST'}
                    </div>
                  )}

                  {/* Driver & details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-100 text-xs group-hover:text-orange-400 transition-colors truncate max-w-[140px]">
                        {driverName}
                      </span>
                      <span className="bg-slate-950/80 text-slate-300 border border-white/[0.08] text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded-md">
                        {g.tipo_gasto || 'General'}
                      </span>
                      {isFresh && (
                        <span className="text-[8px] font-black font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          NUEVO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-200 font-medium leading-relaxed mt-1 max-w-[240px] truncate" title={g.descripcion}>
                      {g.descripcion || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[9.5px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-sky-400" />
                        {formatExpenseDate(g.fecha)}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300">Camión: {getTruckPlate(g.id_camion)}</span>
                    </div>
                  </div>
                </div>

                {/* Amount in Mono */}
                <div className="text-right shrink-0 tabular-nums pl-2">
                  <span className="text-[10px] text-slate-400 font-mono mr-1">BOB</span>
                  <span className="text-sm font-black text-rose-400 font-mono tracking-tight group-hover:text-rose-300 transition-colors">
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-xl w-full bg-gradient-to-b from-slate-900 to-slate-950 border border-white/[0.12] rounded-3xl p-4 sm:p-5 overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.75)] flex flex-col"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/[0.08] gap-2">
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-100 text-xs uppercase tracking-wide truncate">
                    Auditoría de Comprobante Digital
                  </h4>
                  {selectedGasto && (
                    <p className="text-[10px] text-slate-300 font-mono mt-0.5 truncate">
                      Rendición por {getDriverName(selectedGasto.id_chofer)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => selectedImage && handleDownload(selectedImage)}
                    className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl cursor-pointer transition-all duration-200 text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
                    title="Descargar Comprobante"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Descargar</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedGasto(null);
                    }}
                    className="text-slate-300 hover:text-white p-1.5 bg-slate-950 hover:bg-slate-800 border border-white/[0.1] rounded-xl cursor-pointer transition-all duration-200 active:scale-95"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Box Containing High Res Image */}
              <div className="h-[52vh] sm:h-[400px] w-full my-3 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center relative border border-white/[0.08]">
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
                        className={`w-12 h-12 rounded-xl border border-white/[0.1] overflow-hidden bg-slate-950 cursor-pointer shrink-0 transition-all duration-200 active:scale-95 ${
                          selectedImage === url ? 'ring-2 ring-sky-400 border-transparent scale-105 shadow-md shadow-sky-500/20' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Comprobante Thumbnail ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}

              {selectedGasto && (
                <div className="bg-slate-950/90 rounded-2xl p-3.5 border border-white/[0.08] flex items-center justify-between text-left shrink-0">
                  <div className="min-w-0 pr-3">
                    <span className="text-[9px] text-sky-400 font-mono uppercase font-bold tracking-wide">
                      Detalle de Liquidación
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed max-w-[360px] truncate">
                      {selectedGasto.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="text-[9px] text-slate-400 font-mono block">Monto Facturado</span>
                    <span className="text-sm font-black text-rose-400 font-mono">
                      BOB {safeParse(selectedGasto.monto).toLocaleString('es-BO', { minimumFractionDigits: 1 })}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
