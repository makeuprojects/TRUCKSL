import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Truck,
  Fuel,
  Ticket,
  MoreHorizontal,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Viaje, Gasto, Chofer, Camion, Ruta } from '../types';

interface RouteDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: Viaje | null;
  choferes: Chofer[];
  camiones: Camion[];
  rutas: Ruta[];
  gastos: Gasto[];
  onDeleteViaje?: (id_viaje: string) => void;
}

type ExpenseCategory = 'DIESEL' | 'PEAJES' | 'OTROS';

const normalizeCategory = (tipo: string | undefined): ExpenseCategory => {
  if (!tipo) return 'OTROS';
  const categoria = tipo.toLowerCase();
  if (categoria.includes('diesel') || categoria.includes('combustible')) return 'DIESEL';
  if (categoria.includes('peaje') || categoria.includes('vias') || categoria.includes('reten')) return 'PEAJES';
  return 'OTROS';
};

const getCategoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case 'DIESEL': return <Fuel className="w-3.5 h-3.5 text-emerald-400" />;
    case 'PEAJES': return <Ticket className="w-3.5 h-3.5 text-orange-400" />;
    default: return <MoreHorizontal className="w-3.5 h-3.5 text-[#1E3A8A]" />;
  }
};

const safeParseNum = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const str = String(val);
  const cleaned = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isFinite(num) ? Math.abs(num) : 0;
};

export default function RouteDetailDrawer({
  isOpen,
  onClose,
  viaje,
  choferes,
  camiones,
  rutas,
  gastos,
  onDeleteViaje
}: RouteDetailDrawerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  if (!isOpen || !viaje) return null;

  const currentDriver = choferes.find((c) => c.id_chofer === viaje.id_chofer);
  const currentTruck = camiones.find((t) => t.id_camion === viaje.id_camion);

  const routeExpenses = gastos
    .filter((g) => g.id_viaje && String(g.id_viaje).trim().toLowerCase() === String(viaje.id_viaje).trim().toLowerCase())
    .map(g => ({
      ...g,
      normalizedCat: normalizeCategory(g.tipo_gasto)
    }));

  const totalFuelExp = routeExpenses
    .filter((g) => g.normalizedCat === 'DIESEL')
    .reduce((acc, g) => acc + safeParseNum(g.monto), 0);

  const totalTollsExp = routeExpenses
    .filter((g) => g.normalizedCat === 'PEAJES')
    .reduce((acc, g) => acc + safeParseNum(g.monto), 0);

  const totalOtherExp = routeExpenses
    .filter((g) => g.normalizedCat === 'OTROS')
    .reduce((acc, g) => acc + safeParseNum(g.monto), 0);

  const totalRouteSpent = routeExpenses.reduce((acc, g) => acc + safeParseNum(g.monto), 0);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white border-l border-slate-200/80 shadow-2xl z-55 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-emerald-400 font-mono text-[9px] font-black uppercase tracking-wider rounded-md">
                    Auditoría en Ruta
                  </span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Viaje: <span className="font-mono text-[#1E3A8A]">{viaje.id_viaje}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {onDeleteViaje && (
                    <button
                      onClick={() => {
                        if (window.confirm('¿Está seguro de que desea cancelar (eliminar) este viaje? La ruta asociada se liberará nuevamente. Esta acción no se puede deshacer.')) {
                          onDeleteViaje(viaje.id_viaje);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition border border-rose-500/20 text-[10px] font-bold uppercase"
                    >
                      Cancelar Viaje
                    </button>
                  )}
                  <button onClick={onClose} className="p-1.5 rounded-lg bg-[#1e2943]/50 hover:bg-[#1e2943] text-slate-300 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 border border-slate-200 p-4 rounded-xl">
                  <div className="space-y-0.5"><span className="text-[9px] text-slate-600 uppercase font-bold">Chofer</span><span className="text-xs font-black text-slate-900 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#1E3A8A]" />{currentDriver?.nombre_completo || 'N/A'}</span></div>
                  <div className="space-y-0.5"><span className="text-[9px] text-slate-600 uppercase font-bold">Camión</span><span className="text-xs font-black text-slate-900 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-[#1E3A8A]" />{currentTruck?.modelo || 'N/A'}</span></div>
                </div>

                {/* Weigh Scale Ticket & Load Photos Section */}
                {viaje.foto_pesaje_url && viaje.foto_pesaje_url.trim().length > 6 && (
                  <div className="space-y-2 bg-slate-50/70 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      🎫 Certificación de Pesaje y Carga
                    </span>
                    <p className="text-[9.5px] text-slate-300">
                      Fotografías o tickets del pesaje y boletas oficiales reguladoras asociadas a este viaje:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {viaje.foto_pesaje_url.split(',').map((u) => u.trim()).filter(Boolean).map((imgUrl, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            setSelectedPhoto(imgUrl);
                            setZoomScale(1);
                          }}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200/60 bg-slate-950 cursor-pointer group shrink-0"
                          title="Click para ver certificación de carga"
                        >
                          <img 
                            src={imgUrl} 
                            alt="Ticket pesaje" 
                            className="w-full h-full object-cover transition duration-300 transform group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <ZoomIn className="w-4 h-4 text-slate-900" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Resumen Gastos</span>
                    <span className="text-slate-900 text-xs font-black font-mono">Bs. {totalRouteSpent.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-200 text-center"><span className="text-[9px] text-slate-600 uppercase block">Diésel</span><span className="text-xs font-bold font-mono text-emerald-400 block">{totalFuelExp.toFixed(2)}</span></div>
                    <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-200 text-center"><span className="text-[9px] text-slate-600 uppercase block">Peaje</span><span className="text-xs font-bold font-mono text-orange-400 block">{totalTollsExp.toFixed(2)}</span></div>
                    <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-200 text-center"><span className="text-[9px] text-slate-550 uppercase block">Otros</span><span className="text-xs font-bold font-mono text-[#1E3A8A] block">{totalOtherExp.toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Historial de Declaraciones</span>
                  {routeExpenses.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/20 border border-slate-200/80 rounded-xl text-xs text-slate-600 italic">
                      Esperando registros del conductor en tiempo real...
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-6">
                      {routeExpenses.map((gasto, index) => {
                        const rawPhotos = gasto.foto_url ? gasto.foto_url.split(',').map((u) => u.trim()).filter(Boolean) : [];
                        return (
                          <div key={`${gasto.id_gasto}-${index}`} className="relative group/timeline-item">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-[#090D16] border-2 border-blue-400 rounded-full" />
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 bg-[#1e2943]/70 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                  {getCategoryIcon(gasto.normalizedCat)}
                                  {gasto.normalizedCat}
                                </span>
                                <span className="font-mono text-sm font-black text-rose-400">Bs. {safeParseNum(gasto.monto).toFixed(2)}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{gasto.descripcion || 'Sin descripción'}</p>
                              
                              {rawPhotos.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-wider block">Estampas de Comprobante:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {rawPhotos.map((imgUrl, i) => (
                                      <div 
                                        key={i} 
                                        onClick={() => {
                                          setSelectedPhoto(imgUrl);
                                          setZoomScale(1);
                                        }}
                                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200/70 bg-slate-950 cursor-pointer group/item scale-100 hover:scale-105 transition duration-150"
                                      >
                                        <img 
                                          src={imgUrl} 
                                          alt="Comprobante Gasto" 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition">
                                          <ZoomIn className="w-3.5 h-3.5 text-slate-900" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-center items-center p-8"
          >
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-5 right-5 p-2 bg-[#112240] rounded-lg text-slate-900"><X /></button>
            <img src={selectedPhoto} alt="Comprobante" style={{ transform: `scale(${zoomScale})` }} className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.25))} className="p-2 bg-[#112240] text-slate-900 rounded"><ZoomOut /></button>
              <button onClick={() => setZoomScale(Math.min(3.0, zoomScale + 0.25))} className="p-2 bg-[#112240] text-slate-900 rounded"><ZoomIn /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
