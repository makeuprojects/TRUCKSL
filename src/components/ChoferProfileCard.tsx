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

  const budgetNum = Number(chofer.presupuesto || 10000);
  const balanceNum = Number(chofer.saldo_actual !== undefined ? chofer.saldo_actual : budgetNum);
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
      className="bg-[#1E293B]/95 backdrop-blur-xl border border-slate-700/50 rounded-[32px] p-6 text-slate-100 shadow-2xl relative max-w-xl w-full h-[85vh] flex flex-col focus:outline-none"
      id={`chofer-profile-${chofer.id_chofer}`}
    >
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500 rounded-t-[32px]"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white leading-tight font-sans">
              {chofer.nombre_completo}
            </h2>
            <p className="text-[10px] font-mono font-bold tracking-widest text-[#10B981] uppercase mt-0.5">
              Chofer ID: {chofer.id_chofer}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-2 bg-slate-900 border border-slate-800 rounded-xl transition"
          aria-label="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content wrapper */}
      <div className="flex-1 overflow-y-auto pr-1 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* Core Balances Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Presupuesto */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
              Límite Presupuesto
            </span>
            <div className="flex items-baseline space-x-1 mt-1.5">
              <span className="text-xs text-slate-400 font-mono font-bold">BOB</span>
              <span className="text-xl font-black text-slate-100 font-mono leading-none">
                {budgetNum.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Asignado para reposición de caja chica.
            </p>
          </div>

          {/* Saldo Disponible */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
              Saldo Restante
            </span>
            <div className="flex items-baseline space-x-1 mt-1.5">
              <span className="text-xs font-mono font-bold text-emerald-500">BOB</span>
              <span className="text-xl font-black text-[#10B981] font-mono leading-none">
                {balanceNum.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Disponible para registrar nuevas compras.
            </p>
          </div>
        </div>

        {/* Spent Progress Bar */}
        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold">
            <span className="text-slate-500 uppercase tracking-wider">Porcentaje Consumido</span>
            <span className={percentSpent > 85 ? 'text-rose-400' : 'text-indigo-400'}>
              {percentSpent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                percentSpent > 85 ? 'bg-rose-500' : percentSpent > 50 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${percentSpent}%` }}
            ></div>
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wide">Acciones de Operaciones</h4>
            <p className="text-[10px] text-slate-400">Acciones reservadas para Don Saúl.</p>
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
              className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 rounded-xl transition font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Permisos</span>
            </button>
          </div>
        </div>

        {/* PIN Safety indicator */}
        <div className="flex items-center gap-2.5 px-1 text-[10px] text-slate-400 font-mono">
          <Lock className="w-4 h-4 text-indigo-450 shrink-0" />
          <span>PIN de Acceso Conductor: <strong className="text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{chofer.pin_acceso || '0000'}</strong></span>
          <span className="text-slate-600">•</span>
          <span>Estado: <strong className="text-emerald-400 uppercase font-bold">{chofer.estado || 'Activo'}</strong></span>
        </div>

        {/* Expense History Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-300 flex items-center gap-2 tracking-tight">
              <History className="w-4 h-4 text-indigo-400" />
              Bitácora de Compras de la Semana ({driverExpenses.length})
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Don Saúl Audits</span>
          </div>

          {driverExpenses.length === 0 ? (
            <div className="p-6 text-center bg-slate-950/30 border border-slate-850 rounded-2xl space-y-2">
              <AlertCircle className="w-7 h-7 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Sin Compras</p>
              <p className="text-[10px] text-slate-500">Este conductor aún no ha ingresado recibos de ruta.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {driverExpenses.map((gasto, index) => {
                const images = gasto.foto_url ? gasto.foto_url.split(',').filter(Boolean) : [];
                return (
                  <div key={`${gasto.id_gasto}-${index}`} className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-3 hover:border-slate-700 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">{gasto.tipo_gasto}</span>
                          <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded">
                            {gasto.fecha}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-normal">
                          {gasto.descripcion || 'Sin justificación.'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 font-mono block">Monto</span>
                        <span className="text-sm font-black text-rose-400 font-mono">
                          -{Number(gasto.monto).toLocaleString('es-BO')} BOB
                        </span>
                      </div>
                    </div>

                    {/* Receipt images list */}
                    {images.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-900">
                        <span className="text-[9px] text-slate-550 font-bold block uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500" />
                          Comprobantes Digitales ({images.length})
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {images.map((img, i) => (
                            <div 
                              key={i} 
                              className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group shrink-0"
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
              <div className="flex justify-between items-center px-3 py-1.5 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400">Verificador de Factura Digital</span>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="text-slate-400 hover:text-white p-1 bg-slate-950 border border-slate-850 rounded-lg"
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
                <p className="text-[10px] text-slate-500 font-mono">
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
