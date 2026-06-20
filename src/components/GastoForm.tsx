import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Image, 
  X, 
  Loader2, 
  TrendingDown, 
  AlertTriangle,
  Receipt,
  FileText
} from 'lucide-react';
import { Chofer, Viaje } from '../types';

interface GastoFormProps {
  driver: Chofer;
  activeViaje?: Viaje | null;
  selectedCamionId: string;
  token: string;
  onSuccess: (amount: number) => void;
  onClose: () => void;
}

export default function GastoForm({
  driver,
  activeViaje,
  selectedCamionId,
  token,
  onSuccess,
  onClose
}: GastoFormProps) {
  // Input fields state
  const [tipoGasto, setTipoGasto] = useState('Combustible ⛽');
  const [montoGasto, setMontoGasto] = useState('');
  const [descGasto, setDescGasto] = useState('');

  // Files uploader states
  const [gastoFiles, setGastoFiles] = useState<File[]>([]);
  const [gastoFilesUrls, setGastoFilesUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  // Driver budget computations
  const limitePermitido = Number(driver?.presupuesto !== undefined && driver?.presupuesto !== "" ? driver?.presupuesto : 10000);
  const balanceActual = Number(driver?.saldo_actual !== undefined && driver?.saldo_actual !== "" ? driver?.saldo_actual : limitePermitido);
  const gastoHistorico = Math.max(0, limitePermitido - balanceActual);
  
  // Real-time calculation with current user input
  const montoActual = Number(montoGasto) || 0;
  const porcentaje = ((gastoHistorico + montoActual) / limitePermitido) * 100;
  const isExceeded = porcentaje > 100;
  const isBudgetAgotado = balanceActual <= 0;

  // Conditional color gradient for the bar according to the percentage
  let barColorClass = "bg-gradient-to-r from-emerald-500 to-teal-400";
  if (porcentaje >= 50 && porcentaje <= 85) {
    barColorClass = "bg-gradient-to-r from-amber-500 to-orange-400";
  } else if (porcentaje > 85) {
    barColorClass = "bg-gradient-to-r from-rose-500 to-red-600";
  }

  // Handle local files loaded for uploader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setGastoFiles((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGastoFilesUrls((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setGastoFiles((prev) => prev.filter((_, i) => i !== index));
    setGastoFilesUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!montoGasto || Number(montoGasto) <= 0) {
      setErrorLocal('Por favor ingresa un monto válido mayor a cero.');
      return;
    }

    if (isExceeded) {
      setErrorLocal('Error: Este registro excede el límite de caja chica disponible.');
      return;
    }

    setIsUploading(true);
    let uploadedUrls: string[] = [];

    try {
      // 1. Upload receipt files to Cloudinary through our custom Multer route
      if (gastoFiles.length > 0) {
        const formData = new FormData();
        gastoFiles.forEach((file) => {
          formData.append('photos', file);
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.urls) {
          uploadedUrls = uploadData.urls;
        } else {
          throw new Error(uploadData.message || 'Error al subir fotos de recibo.');
        }
      }

      const eventUuid = crypto.randomUUID();
      const currentTimestamp = new Date().toISOString();

      // 2. Submit Gasto payload
      const expensePayload = {
        id_viaje: activeViaje?.id_viaje || '',
        id_camion: selectedCamionId,
        id_chofer: driver.id_chofer,
        tipo_gasto: tipoGasto,
        monto: Number(montoGasto),
        descripcion: descGasto || `Compra registrada por conductor ${driver.nombre_completo}`,
        foto_url: uploadedUrls.join(','),
        id_evento_uuid: eventUuid,
        timestamp_registro: currentTimestamp
      };

      console.log('Enviando a Sheets:', expensePayload);

      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expensePayload)
      });

      const resJson = await res.json();
      if (resJson.success) {
        onSuccess(Number(montoGasto));
        onClose();
      } else {
        setErrorLocal(resJson.message || 'Error al guardar el gasto en Google Sheets.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorLocal(err.message || 'Fallo de conexión o de subida de imágenes a Cloudinary.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#1E293B] border border-slate-700/60 rounded-3xl p-6 space-y-5 shadow-2xl relative text-slate-100" id="gasto-form-component">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
          <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="w-4 h-4" />
          </span>
          Registración de Ruta
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 bg-slate-900/50 border border-slate-800 rounded-xl transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Driver metadata panel */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center justify-between">
        <div className="text-left space-y-0.5">
          <span className="text-[9px] text-[#10B981] font-mono font-bold block uppercase tracking-wider">Caja Chica Disponible</span>
          <span className="text-lg font-black text-emerald-400 font-mono tracking-tight leading-none block">
            {balanceActual.toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] text-slate-550 font-bold block uppercase tracking-wider">Límite Permitido</span>
          <span className="text-xs font-black text-slate-300 font-mono">
            {limitePermitido.toLocaleString('es-BO')} BOB
          </span>
        </div>
      </div>

      {/* Framer-Motion Animated Progress Bar */}
      <div className="bg-[#0F172A]/50 border border-slate-850 p-4 rounded-2xl space-y-2.5">
        <div className="flex justify-between items-center text-[10px] font-mono font-bold">
          <span className="text-slate-450 uppercase tracking-widest">Consumo Acumulado</span>
          <span className={porcentaje > 85 ? 'text-rose-500 font-black' : 'text-slate-350'}>
            {(gastoHistorico + montoActual).toLocaleString('es-BO')} BOB ({porcentaje.toFixed(1)}%)
          </span>
        </div>
        
        {/* Animated Bar using motion */}
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(porcentaje, 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`h-full rounded-full ${barColorClass}`}
          />
        </div>

        {montoActual > 0 && !isExceeded && (
          <p className="text-[9px] text-emerald-400 font-medium leading-normal animate-pulse">
            ⚡ Consumo estimado posterior a esta compra: {(gastoHistorico + montoActual).toLocaleString('es-BO')} BOB ({porcentaje.toFixed(1)}%)
          </p>
        )}
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Tipo de Gasto - Standardized select dropdown */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Tipo de Gasto</label>
          <select
            value={tipoGasto}
            onChange={(e) => setTipoGasto(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl focus:ring-1 focus:ring-emerald-500 text-sm font-semibold text-white outline-none"
          >
            <option value="Alimentación 🍲">Alimentación 🍲</option>
            <option value="Combustible ⛽">Combustible ⛽</option>
            <option value="Servicio de Taller 🔧">Servicio de Taller 🔧</option>
            <option value="Llantas 🜔">Llantas 🜔</option>
            <option value="Mantenimiento de Aceite 🛢️">Mantenimiento de Aceite 🛢️</option>
            <option value="Vías públicas / Peajes 🛣️">Vías públicas / Peajes 🛣️</option>
            <option value="Otros ⚙️">Otros ⚙️</option>
          </select>
        </div>

        {/* Amount in BOB */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Monto total (BOB)</label>
          <input
            type="number"
            required
            min="1"
            value={montoGasto}
            onChange={(e) => setMontoGasto(e.target.value)}
            placeholder="Ingrese saldo gastado..."
            className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none font-bold text-lg focus:border-emerald-500 font-mono"
            id="gasto-monto-input"
          />
        </div>

        {/* Short Justification */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Justificación / Detalle</label>
          <input
            type="text"
            value={descGasto}
            onChange={(e) => setDescGasto(e.target.value)}
            placeholder="Detalle de la compra o comprobante..."
            className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-white outline-none font-medium text-sm focus:border-emerald-500"
          />
        </div>

        {/* Multi receipt uploader */}
        <div className="space-y-1.5 text-left bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Adjuntar Facturas / Recibos (Múltiple)</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-extrabold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />
          
          {gastoFilesUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2.5">
              {gastoFilesUrls.map((url, i) => (
                <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-800 group bg-slate-950">
                  <img src={url} alt="Receipt preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-black transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Errors & State Warnings */}
        {errorLocal && (
          <div className="p-3 bg-rose-950/25 text-rose-400 border border-rose-900/50 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorLocal}</span>
          </div>
        )}

        {isUploading && (
          <div className="text-[10px] text-center text-slate-400 font-bold animate-pulse uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Subiendo comprobantes y registrando en Google Sheets...</span>
          </div>
        )}

        {/* Submit button with budget checks */}
        <motion.button
          whileTap={!(isExceeded || isBudgetAgotado || isUploading) ? { scale: 0.95 } : undefined}
          type="submit"
          disabled={isExceeded || isBudgetAgotado || isUploading}
          className={`w-full font-black py-4 px-4 rounded-2xl text-xs sm:text-sm tracking-wide transition cursor-pointer shadow-lg uppercase ${
            isExceeded || isBudgetAgotado
              ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-450 shadow-emerald-500/10'
          }`}
          id="gasto-submit-btn"
        >
          {isExceeded || isBudgetAgotado ? (
            <span>Error: Presupuesto agotado 🛑</span>
          ) : isUploading ? (
            <span>Registrando...</span>
          ) : (
            <span>Confirmar Compra</span>
          )}
        </motion.button>
        {isExceeded && (
          <p className="text-xs text-rose-400 text-center font-bold mt-2.5 animate-pulse flex items-center justify-center gap-1.5" id="exceeded-warning">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Error: Este registro excede el límite de caja chica disponible</span>
          </p>
        )}
      </form>
    </div>
  );
}
