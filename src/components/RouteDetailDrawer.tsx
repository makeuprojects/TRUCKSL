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
  ZoomOut,
  Download
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
  onUpdateViaje?: (id_viaje: string, toneladas_base: string, tarifa_pactada: string) => Promise<boolean>;
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
  onDeleteViaje,
  onUpdateViaje
}: RouteDetailDrawerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // States for parameters editing
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [toneladasInput, setToneladasInput] = useState('');
  const [tarifaInput, setTarifaInput] = useState('');
  const [isSavingParams, setIsSavingParams] = useState(false);

  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viaje || !onUpdateViaje) return;
    setIsSavingParams(true);
    try {
      const success = await onUpdateViaje(viaje.id_viaje, toneladasInput, tarifaInput);
      if (success) {
        setIsEditingParams(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingParams(false);
    }
  };

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
      window.open(url, '_blank');
    }
  };

  if (!isOpen || !viaje) return null;

  const currentDriver = choferes.find((c) => c.id_chofer === viaje.id_chofer);
  const currentTruck = camiones.find((t) => t.id_camion === viaje.id_camion);

  const routeExpenses = gastos
    .filter((g) => g.tipo_gasto !== 'Pago Chofer' && g.id_viaje && String(g.id_viaje).trim().toLowerCase() === String(viaje.id_viaje).trim().toLowerCase())
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

  const currentRoute = rutas.find((r) => r.id_ruta === viaje.id_ruta);
  const basePrice = Number(viaje.tarifa_pactada || currentRoute?.tarifa_base || 5000);
  const baseTons = Number(viaje.toneladas_base || 45) || 45;
  const extraTonsRaw = Number(viaje.toneladas_extras) || 0;
  
  const totalTons = baseTons + extraTonsRaw;
  const extraTons = baseTons < 45 ? Math.max(0, totalTons - 45) : extraTonsRaw;
  const bonusTons = baseTons < 30 ? 0 : Math.max(0, totalTons - 45);
  const driverBonusValue = bonusTons * (basePrice / baseTons) * 0.40;

  const extraRateValue = (basePrice / baseTons) * extraTons;
  const totalTripEarnings = basePrice + extraRateValue;

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
              className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl z-55 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 bg-slate-900 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-emerald-400 font-mono text-[9px] font-black uppercase tracking-wider rounded-md">
                    Auditoría en Ruta
                  </span>
                  <h2 className="text-lg font-black text-slate-100 tracking-tight">
                    Viaje: <span className="font-mono text-sky-400">{viaje.id_viaje}</span>
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
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition border border-rose-500/20 text-[10px] font-bold uppercase"
                    >
                      Cancelar Viaje
                    </button>
                  )}
                  <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-900/50 border border-slate-800/60 p-4 rounded-xl">
                  <div className="space-y-0.5"><span className="text-[9px] text-slate-400 uppercase font-bold">Chofer</span><span className="text-xs font-black text-slate-200 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-sky-400" />{currentDriver?.nombre_completo || 'N/A'}</span></div>
                  <div className="space-y-0.5"><span className="text-[9px] text-slate-400 uppercase font-bold">Camión</span><span className="text-xs font-black text-slate-200 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-sky-400" />{currentTruck?.modelo || 'N/A'}</span></div>
                </div>

                {/* FINANCIAL PARAMETERS & FREIGHT SETTLEMENT */}
                <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      ⚖️ Configuración de Flete y Carga
                    </span>
                    {onUpdateViaje && !isEditingParams && (
                      <button
                        onClick={() => {
                          setToneladasInput(viaje.toneladas_base || '45');
                          setTarifaInput(viaje.tarifa_pactada || currentRoute?.tarifa_base || '5000');
                          setIsEditingParams(true);
                        }}
                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition uppercase underline"
                      >
                        Ajustar
                      </button>
                    )}
                  </div>

                  {!isEditingParams ? (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Toneladas Pactadas (Base)</span>
                        <span className="font-mono font-bold text-slate-200">{viaje.toneladas_base || '45'} t</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Tarifa Base Pactada</span>
                        <span className="font-mono font-bold text-slate-200">Bs. {basePrice.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Toneladas Extras</span>
                        <span className="font-mono font-bold text-orange-400">{extraTons} t</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Valor Excedente (Calculado)</span>
                        <span className="font-mono font-bold text-orange-400">Bs. {extraRateValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-800/60 flex flex-col space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Bono Chofer (Arriba de 45t):</span>
                          <span className="font-mono text-xs font-bold text-blue-400">+Bs. {driverBonusValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-300 font-black uppercase">Ingreso Total por Viaje:</span>
                          <span className="font-mono text-sm font-black text-emerald-400">Bs. {totalTripEarnings.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveParams} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase font-bold block">Toneladas Base (t)</label>
                          <input
                            type="number"
                            step="any"
                            value={toneladasInput}
                            onChange={(e) => setToneladasInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                            placeholder="45"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 uppercase font-bold block">Tarifa Base (Bs.)</label>
                          <input
                            type="number"
                            step="any"
                            value={tarifaInput}
                            onChange={(e) => setTarifaInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                            placeholder="5000"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingParams(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingParams}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-[#10B981] text-slate-950 text-[10px] font-black uppercase transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isSavingParams ? 'Guardando...' : 'Guardar Ajustes'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Weigh Scale Ticket & Load Photos Section */}
                {viaje.foto_pesaje_url && viaje.foto_pesaje_url.trim().length > 6 && (
                  <div className="space-y-2 bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl">
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
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-800/60 bg-slate-950 cursor-pointer group shrink-0"
                          title="Click para ver certificación de carga"
                        >
                          <img 
                            src={imgUrl} 
                            alt="Ticket pesaje" 
                            className="w-full h-full object-cover transition duration-300 transform group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-350 font-black uppercase tracking-wider">Resumen Gastos</span>
                    <span className="text-slate-100 text-xs font-black font-mono">Bs. {totalRouteSpent.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-center"><span className="text-[9px] text-slate-400 uppercase block">Diésel</span><span className="text-xs font-bold font-mono text-emerald-400 block">{totalFuelExp.toFixed(2)}</span></div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-center"><span className="text-[9px] text-slate-400 uppercase block">Peaje</span><span className="text-xs font-bold font-mono text-orange-400 block">{totalTollsExp.toFixed(2)}</span></div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-center"><span className="text-[9px] text-slate-400 uppercase block">Otros</span><span className="text-xs font-bold font-mono text-sky-400 block">{totalOtherExp.toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] text-slate-355 font-black uppercase tracking-wider">Historial de Declaraciones</span>
                  {routeExpenses.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/30 border border-slate-800/60 rounded-xl text-xs text-slate-400 italic">
                      Esperando registros del conductor en tiempo real...
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-800 pl-4 ml-2.5 space-y-6">
                      {routeExpenses.map((gasto, index) => {
                        const rawPhotos = gasto.foto_url ? gasto.foto_url.split(',').map((u) => u.trim()).filter(Boolean) : [];
                        return (
                          <div key={`${gasto.id_gasto}-${index}`} className="relative group/timeline-item">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-[#090D16] border-2 border-sky-400 rounded-full" />
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                  {getCategoryIcon(gasto.normalizedCat)}
                                  {gasto.normalizedCat}
                                </span>
                                <span className="font-mono text-sm font-black text-rose-450">Bs. {safeParseNum(gasto.monto).toFixed(2)}</span>
                              </div>
                              <p className="text-[11px] text-slate-200 leading-relaxed">{gasto.descripcion || 'Sin descripción'}</p>
                              
                              {rawPhotos.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Estampas de Comprobante:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {rawPhotos.map((imgUrl, i) => (
                                      <div 
                                        key={i} 
                                        onClick={() => {
                                          setSelectedPhoto(imgUrl);
                                          setZoomScale(1);
                                        }}
                                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group/item scale-100 hover:scale-105 transition duration-150"
                                      >
                                        <img 
                                          src={imgUrl} 
                                          alt="Comprobante Gasto" 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition">
                                          <ZoomIn className="w-3.5 h-3.5 text-white" />
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
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-5 right-5 p-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:text-red-400 transition cursor-pointer"><X /></button>
            <img src={selectedPhoto} alt="Comprobante" style={{ transform: `scale(${zoomScale})` }} className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" />
            <div className="mt-4 flex gap-2 items-center flex-wrap justify-center">
              <button onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.25))} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded cursor-pointer transition" title="Reducir Zoom"><ZoomOut /></button>
              <button onClick={() => setZoomScale(Math.min(3.0, zoomScale + 0.25))} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded cursor-pointer transition" title="Aumentar Zoom"><ZoomIn /></button>
              <button onClick={() => handleDownload(selectedPhoto)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-550/10 hover:bg-orange-550/20 border border-orange-550/30 text-orange-400 font-bold rounded cursor-pointer transition text-xs">
                <Download className="w-4 h-4" />
                <span>Descargar Comprobante</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
