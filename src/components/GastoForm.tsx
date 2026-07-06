import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [tipoGasto, setTipoGasto] = useState('Combustible Subvencionado (5.72 Bs/L) ⛽');
  const [montoGasto, setMontoGasto] = useState('');
  const [descGasto, setDescGasto] = useState('');
  const [litrosCombustible, setLitrosCombustible] = useState('');
  const [piezaCambiada, setPiezaCambiada] = useState('');

  const handleTipoGastoChange = (val: string) => {
    setTipoGasto(val);
    setLitrosCombustible('');
    setMontoGasto('');
  };

  const handleLitrosChange = (val: string) => {
    setLitrosCombustible(val);
    if (val && !isNaN(Number(val))) {
      const calculated = (Number(val) * 5.72).toFixed(2);
      setMontoGasto(calculated);
    } else {
      setMontoGasto('');
    }
  };

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
    barColorClass = "bg-gradient-to-r from-orange-500 to-orange-400";
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

    if (tipoGasto === 'Repuestos ⚙️') {
      if (!piezaCambiada || piezaCambiada.trim() === '') {
        setErrorLocal('Por favor describe el repuesto cambiado en el campo correspondiente.');
        return;
      }
      if (gastoFiles.length === 0) {
        setErrorLocal('Para la categoría de Repuestos, es obligatorio añadir y subir una foto de la pieza reemplazada.');
        return;
      }
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

      let finalDescripcion = descGasto;
      if (tipoGasto === 'Combustible Subvencionado (5.72 Bs/L) ⛽') {
        const litrosInfo = `Carga Subvencionada: ${litrosCombustible} Litros @ 5.72 Bs/L.`;
        finalDescripcion = finalDescripcion ? `${litrosInfo} ${finalDescripcion}` : litrosInfo;
      } else if (tipoGasto === 'Combustible No Subvencionado (Facturado) ⛽') {
        const facturadoInfo = `Carga No Subvencionada (Facturada).`;
        finalDescripcion = finalDescripcion ? `${facturadoInfo} ${finalDescripcion}` : facturadoInfo;
      } else if (!finalDescripcion) {
        finalDescripcion = `Compra registrada por conductor ${driver.nombre_completo}`;
      }

      // 2. Submit Gasto payload
      const expensePayload = {
        id_viaje: activeViaje?.id_viaje || '',
        id_camion: selectedCamionId,
        id_chofer: driver.id_chofer,
        tipo_gasto: tipoGasto,
        monto: Number(montoGasto),
        descripcion: finalDescripcion,
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
        if (tipoGasto === 'Repuestos ⚙️') {
          const repuestoPayload = {
            id_gasto: resJson.data?.id_gasto || '',
            pieza_cambiada: piezaCambiada,
            destino_pieza_vieja: 'Pendiente'
          };
          
          await fetch('/api/control-repuestos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(repuestoPayload)
          }).catch(e => console.error('[Error] Fallback registering repuesto:', e));
        }

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
    <div className="w-full max-w-md bg-[#1E293B] border border-[#233554]/60 rounded-3xl shadow-2xl relative text-slate-100 flex flex-col max-h-[90vh]" id="gasto-form-component">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl z-10"></div>
      
      {/* Header (Fixed) */}
      <div className="flex items-center justify-between p-5 sm:px-6 pt-6 sm:pt-7 pb-4 border-b border-[#233554]/40 shrink-0">
        <h3 className="text-white font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
          <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="w-4 h-4" />
          </span>
          Registración de Ruta
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-200 hover:text-white p-1.5 bg-[#0A192F]/50 border border-[#112240] hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 rounded-xl transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-5 rounded-b-3xl scrollbar-thin scrollbar-thumb-[#233554] scrollbar-track-transparent">

      {/* Driver metadata panel */}
      <div className="bg-[#0A192F]/80 p-4 rounded-2xl border border-[#233554]/60 flex items-center justify-between shadow-inner">
        <div className="text-left space-y-0.5">
          <span className="text-[9px] text-emerald-400 font-mono font-bold block uppercase tracking-wider">Caja Chica Disponible</span>
          <span className="text-lg font-black text-[#00ff9d] font-mono tracking-tight leading-none block drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            {balanceActual.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Límite Permitido</span>
          <span className="text-xs font-black text-slate-200 font-mono mt-0.5 block">
            {limitePermitido.toLocaleString('es-BO')} Bs.
          </span>
        </div>
      </div>

      {/* Framer-Motion Animated Progress Bar */}
      <div className="bg-[#0A192F]/50 border border-[#233554]/40 p-4 rounded-2xl space-y-2.5">
        <div className="flex justify-between items-center text-[10px] font-mono font-bold">
          <span className="text-slate-400 uppercase tracking-widest">Consumo Acumulado</span>
          <span className={porcentaje > 85 ? 'text-rose-500 font-black' : 'text-slate-300'}>
            {(gastoHistorico + montoActual).toLocaleString('es-BO')} Bs. ({porcentaje.toFixed(1)}%)
          </span>
        </div>
        
        {/* Animated Bar using motion */}
        <div className="h-2 w-full bg-[#0A192F] rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(porcentaje, 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`h-full rounded-full ${barColorClass}`}
          />
        </div>

        {montoActual > 0 && !isExceeded && (
          <p className="text-[9px] text-emerald-400 font-medium leading-normal animate-pulse">
            ⚡ Consumo estimado posterior a esta compra: {(gastoHistorico + montoActual).toLocaleString('es-BO')} Bs. ({porcentaje.toFixed(1)}%)
          </p>
        )}
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Tipo de Gasto - Standardized select dropdown */}
        <div className="space-y-1">
          <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Tipo de Gasto</label>
          <select
            value={tipoGasto}
            onChange={(e) => handleTipoGastoChange(e.target.value)}
            className="w-full bg-slate-950 border border-[#112240] p-3.5 rounded-2xl focus:ring-1 focus:ring-emerald-500 text-sm font-semibold text-white outline-none"
          >
            <option value="Combustible Subvencionado (5.72 Bs/L) ⛽">Combustible Subvencionado (5.72 Bs/L) ⛽</option>
            <option value="Combustible No Subvencionado (Facturado) ⛽">Combustible No Subvencionado (Facturado) ⛽</option>
            <option value="Alimentación 🍲">Alimentación 🍲</option>
            <option value="Servicio de Taller 🔧">Servicio de Taller 🔧</option>
            <option value="Repuestos ⚙️">Repuestos ⚙️</option>
            <option value="Llantas 🜔">Llantas 🜔</option>
            <option value="Mantenimiento de Aceite 🛢️">Mantenimiento de Aceite 🛢️</option>
            <option value="Vías públicas / Peajes 🛣️">Vías públicas / Peajes 🛣️</option>
            <option value="Otros ⚙️">Otros ⚙️</option>
          </select>
        </div>

        {/* Input extra for Spare Parts (Repuestos) */}
        <AnimatePresence initial={false}>
          {tipoGasto === 'Repuestos ⚙️' && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden space-y-2 p-3.5 bg-[#0A192F]/60 border border-orange-500/25 rounded-2xl text-left"
            >
              <div className="flex justify-between items-center">
                <label className="text-xs text-orange-400 font-bold uppercase tracking-wider block">⚠️ Detalle del Repuesto Adquirido</label>
                <span className="text-[10px] text-orange-500 font-mono font-bold">Requerido</span>
              </div>
              <input
                type="text"
                required
                value={piezaCambiada}
                onChange={(e) => setPiezaCambiada(e.target.value)}
                placeholder="Ej. Disco de embrague, Filtro de aceite, Pastillas..."
                className="w-full bg-slate-950 border border-orange-500/30 p-3 rounded-xl text-white outline-none font-bold text-xs focus:border-orange-500"
              />
              <p className="text-[9px] text-slate-400 font-medium font-mono leading-tight">
                * Describe exactamente qué pieza o repuesto se está adquiriendo o cambiando. Esto se registrará para la decisión de reciclaje y control de piezas de Don Saúl.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input extra for Subsidized Fuel */}
        <AnimatePresence initial={false}>
          {tipoGasto === 'Combustible Subvencionado (5.72 Bs/L) ⛽' && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden space-y-1 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl"
            >
              <div className="flex justify-between items-center">
                <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">Litros Cargados</label>
                <span className="text-[10px] text-emerald-500 font-mono font-bold">Precio Fijo: 5.72 Bs/L</span>
              </div>
              <input
                type="number"
                required
                step="0.01"
                min="0.1"
                value={litrosCombustible}
                onChange={(e) => handleLitrosChange(e.target.value)}
                placeholder="Ej. 150 litros"
                className="w-full bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-white outline-none font-bold text-sm focus:border-emerald-500 font-mono"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amount in BOB / Bs */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Monto total (Bs.)</label>
            {tipoGasto === 'Combustible Subvencionado (5.72 Bs/L) ⛽' && (
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">Auto-calculado</span>
            )}
          </div>
          <input
            type="number"
            required
            min="1"
            readOnly={tipoGasto === 'Combustible Subvencionado (5.72 Bs/L) ⛽'}
            value={montoGasto}
            onChange={(e) => setMontoGasto(e.target.value)}
            placeholder={tipoGasto === 'Combustible Subvencionado (5.72 Bs/L) ⛽' ? "Se calculará con los litros..." : "Ingrese saldo gastado..."}
            className={`w-full bg-slate-950 border p-3.5 rounded-2xl text-white outline-none font-bold text-lg font-mono focus:border-emerald-500 ${
              tipoGasto === 'Combustible Subvencionado (5.72 Bs/L) ⛽' 
                ? 'border-emerald-500/30 text-emerald-400 cursor-not-allowed bg-slate-950/80' 
                : 'border-[#112240]'
            }`}
            id="gasto-monto-input"
          />
        </div>

        {/* Short Justification */}
        <div className="space-y-1">
          <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Justificación / Detalle</label>
          <input
            type="text"
            value={descGasto}
            onChange={(e) => setDescGasto(e.target.value)}
            placeholder="Detalle de la compra o comprobante..."
            className="w-full bg-slate-950 border border-[#112240] p-3.5 rounded-2xl text-white outline-none font-medium text-sm focus:border-emerald-500"
          />
        </div>

        {/* Multi receipt uploader */}
        <div className="space-y-2 text-left">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Adjuntar Facturas / Recibos</label>
          <div className="relative border-2 border-dashed border-[#233554] bg-[#0A192F]/50 rounded-2xl p-6 hover:bg-[#112240] hover:border-[#38BDF8] transition-colors cursor-pointer text-center group flex flex-col items-center justify-center min-h-[120px]">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="bg-[#112240] p-3 rounded-full mb-3 group-hover:bg-[#1E293B] transition-colors shadow-inner">
              <Image className="w-6 h-6 text-slate-400 group-hover:text-[#38BDF8] transition-colors" />
            </div>
            <p className="text-xs text-slate-300 font-medium group-hover:text-white transition-colors">Toca para abrir cámara o galería</p>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">JPG, PNG, WEBP</p>
          </div>
          
          {gastoFilesUrls.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-3">
              {gastoFilesUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#233554] shadow-md group bg-slate-900">
                  <img src={url} alt={`Comprobante ${i+1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="absolute top-1.5 right-1.5 bg-rose-500/90 backdrop-blur-sm hover:bg-rose-500 text-white p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg transform hover:scale-110 z-20"
                  >
                    <X className="w-3.5 h-3.5" />
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
          <div className="text-[10px] text-center text-slate-200 font-bold animate-pulse uppercase tracking-wider flex items-center justify-center gap-1.5">
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
              ? 'bg-[#112240] text-slate-400 border border-[#233554]/60 cursor-not-allowed shadow-none'
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
    </div>
  );
}
