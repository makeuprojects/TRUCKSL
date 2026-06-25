import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  DollarSign, 
  History, 
  RotateCcw, 
  Edit3, 
  Lock, 
  Maximize2, 
  X, 
  AlertCircle,
  TrendingDown,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { Chofer, Gasto } from '../types';

const safeParse = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

interface ChoferProfileCardProps {
  chofer: Chofer;
  gastos: Gasto[];
  onResetBalance: (id_chofer: string, budget: number) => Promise<void>;
  onEditPermissions: (chofer: Chofer) => void;
  onClose: () => void;
  layoutId?: string;
}

export default function ChoferProfileCard({
  chofer,
  gastos,
  onResetBalance,
  onEditPermissions,
  onClose,
  layoutId
}: ChoferProfileCardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Filter expenses belonging to this driver
  const driverExpenses = restosSafe(gastos).filter(
    (g: Gasto) => g.id_chofer === chofer.id_chofer
  );

  // Parse list safety helper
  function restosSafe(arr: any) {
    return Array.isArray(arr) ? arr : [];
  }

  const budgetNum = Number(chofer.presupuesto !== undefined && chofer.presupuesto !== "" ? chofer.presupuesto : 10000);
  const balanceNum = Number(chofer.saldo_actual !== undefined && chofer.saldo_actual !== "" ? chofer.saldo_actual : budgetNum);
  const percentSpent = Math.max(0, Math.min(100, ((budgetNum - balanceNum) / budgetNum) * 100));

  const handleReset = async () => {
    setIsResetting(true);
    setResetSuccess(false);
    try {
      await onResetBalance(chofer.id_chofer, budgetNum);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <motion.div
      layoutId={layoutId}
      className="bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-[32px] p-6 text-slate-100 shadow-2xl relative max-w-xl w-full h-[85vh] flex flex-col focus:outline-none"
      id={`chofer-profile-${chofer.id_chofer}`}
    >
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-orange-500 rounded-t-[32px]"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-slate-100">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 leading-tight font-sans">
              {chofer.nombre_completo}
            </h2>
            <p className="text-[10px] font-mono font-bold tracking-widest text-slate-200 uppercase mt-0.5">
              Chofer ID: {chofer.id_chofer}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white p-2 bg-slate-950 border border-white/[0.06] rounded-xl transition cursor-pointer"
          aria-label="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content wrapper */}
      <div className="flex-1 overflow-y-auto pr-1 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* Core Balances Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Presupuesto */}
          <div className="bg-slate-950/60 border border-white/[0.05] p-4 rounded-2xl">
            <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">
              Límite Presupuesto
            </span>
            <div className="flex items-baseline space-x-1 mt-1.5 font-sans">
              <span className="text-xs text-slate-300 font-mono font-bold">BOB</span>
              <span className="text-xl font-black text-slate-100 font-mono leading-none">
                {budgetNum.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-200 mt-1 leading-normal">
              Asignado para caja chica.
            </p>
          </div>

          {/* Saldo Disponible */}
          <div className="bg-slate-950/60 border border-white/[0.05] p-4 rounded-2xl">
            <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">
              Saldo Restante
            </span>
            <div className="flex items-baseline space-x-1 mt-1.5 font-sans">
              <span className="text-xs font-mono font-bold text-emerald-400">BOB</span>
              <span className="text-xl font-black text-emerald-400 font-mono leading-none">
                {balanceNum.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-200 mt-1 leading-normal">
              Disponible para compras.
            </p>
          </div>

          {/* Total Ejecutado */}
          {/* Saldo Restante Card */}
          <div className="bg-slate-900 border border-white/[0.06] p-4 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-200 font-bold block uppercase tracking-wider">
              Saldo Restante Mensual
            </span>
            <div className="flex items-baseline space-x-1 mt-1.5 font-sans">
              <span className="text-xl font-black text-white font-mono leading-none">
                {balanceNum.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-mono font-bold text-slate-300 font-sans"> / {budgetNum.toLocaleString('es-BO', { minimumFractionDigits: 0 })} Bs</span>
            </div>
            <p className="text-[10px] text-slate-300 mt-1 leading-normal">
              Disponible para caja chica
            </p>
          </div>
        </div>

        {/* Spent Progress Bar */}
        <div className="bg-slate-900 border border-white/[0.06] p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold">
            <span className="text-slate-300 uppercase tracking-wider">Porcentaje Consumido</span>
            <span className={percentSpent > 85 ? 'text-rose-450' : 'text-slate-200'}>
              {percentSpent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                percentSpent > 85 ? 'bg-rose-500' : percentSpent > 50 ? 'bg-orange-500' : 'bg-slate-300'
              }`}
              style={{ width: `${percentSpent}%` }}
            ></div>
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Acciones de Operaciones</h4>
            <p className="text-[10px] text-slate-200">Acciones reservadas para Don Saúl.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Reset budget button */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-3.5 py-2 text-xs bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 rounded-xl transition font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{resetSuccess ? '¡Completado!' : 'Reiniciar Saldo'}</span>
            </button>
            {/* Edit limits & credentials */}
            <button
              onClick={() => onEditPermissions(chofer)}
              className="px-3.5 py-2 text-xs bg-slate-950 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded-xl transition font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Permisos</span>
            </button>
          </div>
        </div>

        {/* PIN Safety indicator */}
        <div className="flex items-center gap-2.5 px-1 text-[10px] text-slate-300 font-mono">
          <Lock className="w-4 h-4 text-indigo-300 shrink-0" />
          <span>PIN de Acceso Conductor: <strong className="text-slate-100 bg-slate-950 px-2 py-0.5 rounded border border-white/[0.08]">{chofer.pin_acceso || '0000'}</strong></span>
          <span className="text-slate-500">•</span>
          <span>Estado: <strong className="text-emerald-400 uppercase font-bold">{chofer.estado || 'Activo'}</strong></span>
        </div>

        {/* Expense History Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
            <h3 className="text-xs font-black uppercase text-slate-200 flex items-center gap-2 tracking-tight">
              <History className="w-4 h-4 text-sky-400" />
              Bitácora de Compras de la Semana ({driverExpenses.length})
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Don Saúl Audits</span>
          </div>

          {driverExpenses.length === 0 ? (
            <div className="p-6 text-center bg-slate-950/30 border border-white/[0.06] rounded-2xl space-y-2">
              <AlertCircle className="w-7 h-7 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300 uppercase tracking-widest font-bold">Sin Compras</p>
              <p className="text-[10px] text-slate-400">Este conductor aún no ha ingresado recibos de ruta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {driverExpenses.map((gasto, index) => {
                const images = gasto.foto_url ? gasto.foto_url.split(',').filter(Boolean) : [];
                return (
                  <div key={`${gasto.id_gasto}-${index}`} className="bg-slate-950/60 border border-white/[0.05] p-4 rounded-2xl space-y-3 hover:border-white/[0.1] transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-100">{gasto.tipo_gasto}</span>
                          <span className="text-[9px] bg-slate-900 border border-white/[0.06] text-slate-300 font-mono px-2 py-0.5 rounded">
                            {gasto.fecha}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mt-1 leading-normal">
                          {gasto.descripcion || 'Sin justificación.'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 font-mono block">Monto</span>
                        <span className="text-sm font-black text-rose-450 font-mono">
                          -{safeParse(gasto.monto).toLocaleString('es-BO')} BOB
                        </span>
                      </div>
                    </div>

                    {/* Receipt images list */}
                    {images.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-900">
                        <span className="text-[9px] text-slate-300 font-bold block uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          Comprobantes Digitales ({images.length})
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {images.map((img, i) => (
                            <div 
                              key={i} 
                              className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/[0.06] bg-slate-950 cursor-pointer group shrink-0"
                              onClick={() => setSelectedImage(img)}
                            >
                              <img 
                                src={img} 
                                alt="Receipt row" 
                                className="w-full h-full object-cover transition duration-300 transform group-hover:scale-110" 
                              />
                              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Full scale receipt lightbox modal overlay */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-3 overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center px-3 py-1.5 border-b border-slate-850">
                <span className="text-xs font-bold text-slate-300">Verificador de Factura Digital</span>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="text-slate-300 hover:text-white p-1 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-[450px] w-full mt-2.5 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
                <img 
                  src={selectedImage} 
                  alt="Full-sized Receipt" 
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 text-center">
                <p className="text-[10px] text-slate-400 font-mono">
                  Cloudinary Crypted Storage • Haz clic derecho para descargar o copiar url.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
