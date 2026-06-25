import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, ShieldAlert, Sparkles, Truck, Calendar, Gauge, KeyRound, Phone, DollarSign } from 'lucide-react';
import { Chofer, Camion } from '../types';

interface EditSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'chofer' | 'camion' | null;
  data: any; // Can be Chofer or Camion type
  onSaveDriver: (id: string, updatedFields: {
    nombre_completo?: string;
    telefono?: string;
    pin_acceso?: string;
    estado?: string;
    presupuesto?: string;
    saldo_actual?: string;
  }) => Promise<boolean>;
  onSaveTruck: (id: string, updatedFields: {
    modelo?: string;
    anio?: string;
    kilometraje_actual?: string;
    saldo_presupuesto?: string;
    estado?: string;
    placa?: string;
    chasis?: string;
  }) => Promise<boolean>;
}

export default function EditSlideOver({
  isOpen,
  onClose,
  type,
  data,
  onSaveDriver,
  onSaveTruck
}: EditSlideOverProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Chofer reactive state variables
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pinAcceso, setPinAcceso] = useState('');
  const [driverEstado, setDriverEstado] = useState('Activo');
  const [presupuesto, setPresupuesto] = useState('');
  const [saldoActual, setSaldoActual] = useState('');

  // Camion reactive state variables
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [kilometrajeActual, setKilometrajeActual] = useState('');
  const [saldoPresupuesto, setSaldoPresupuesto] = useState('');
  const [truckEstado, setTruckEstado] = useState('Activo');
  const [placa, setPlaca] = useState('');
  const [chasis, setChasis] = useState('');

  // Initialize fields once data changes or panel opens
  useEffect(() => {
    if (!data) return;
    setErrorText('');

    if (type === 'chofer') {
      const c = data as Chofer;
      setNombreCompleto(c.nombre_completo || '');
      setTelefono(c.telefono || '');
      setPinAcceso(c.pin_acceso || '');
      setDriverEstado(c.estado || 'Activo');
      setPresupuesto(c.presupuesto || '10000');
      setSaldoActual(c.saldo_actual || '10000');
    } else if (type === 'camion') {
      const t = data as Camion;
      setModelo(t.modelo || '');
      setAnio(t.anio || '');
      setKilometrajeActual(t.kilometraje_actual || '');
      setSaldoPresupuesto(t.saldo_presupuesto || '10000');
      setTruckEstado(t.estado || 'Activo');
      setPlaca(t.placa || '');
      setChasis(t.chasis || '');
    }
  }, [type, data, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setIsSaving(true);

    try {
      if (type === 'chofer') {
        if (!nombreCompleto.trim()) {
          setErrorText('El nombre del conductor es requerido.');
          setIsSaving(false);
          return;
        }
        if (pinAcceso.length !== 4) {
          setErrorText('El PIN de seguridad debe asignarse con exactamente 4 números.');
          setIsSaving(false);
          return;
        }

        const success = await onSaveDriver(data.id_chofer, {
          nombre_completo: nombreCompleto,
          telefono,
          pin_acceso: pinAcceso,
          estado: driverEstado,
          presupuesto,
          saldo_actual: saldoActual
        });

        if (success) onClose();
      } else if (type === 'camion') {
        if (!modelo.trim()) {
          setErrorText('El modelo del camión es requerido.');
          setIsSaving(false);
          return;
        }

        const success = await onSaveTruck(data.id_camion, {
          modelo,
          anio,
          kilometraje_actual: kilometrajeActual,
          saldo_presupuesto: saldoPresupuesto,
          estado: truckEstado,
          placa,
          chasis
        });

        if (success) onClose();
      }
    } catch (err: any) {
      setErrorText(err.message || 'Error guardando cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Slideover Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 cursor-pointer"
          />

          {/* Slideover Window on Right Side */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 p-6 sm:p-8 flex flex-col z-50 text-slate-100 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-850 text-emerald-400 rounded-xl border border-slate-800">
                  {type === 'chofer' ? <User className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base tracking-tight leading-none mb-1">
                    {type === 'chofer' ? 'Editar Conductor' : 'Ficha de Camión'}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-mono">
                    ID: {type === 'chofer' ? data?.id_chofer : data?.id_camion}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white p-2 hover:bg-slate-800 border border-transparent hover:border-slate-700 rounded-xl cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error notifications */}
            {errorText && (
              <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-xs text-rose-450 leading-relaxed font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 pr-1 space-y-5">
              {type === 'chofer' ? (
                <>
                  {/* Driver Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={nombreCompleto}
                        onChange={(e) => setNombreCompleto(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:border-emerald-500"
                        placeholder="ej: Mauricio Sotomayor"
                      />
                    </div>
                  </div>

                  {/* Telephone / Phone number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Celular / Teléfono
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:border-emerald-500"
                        placeholder="ej: +591 76543210"
                      />
                    </div>
                  </div>

                  {/* PIN acceso */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block flex items-center justify-between">
                      <span>PIN Secreto Operativo (4 dígitos)</span>
                      <span className="font-mono text-[9px] text-amber-500">Requerido</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={pinAcceso}
                        onChange={(e) => setPinAcceso(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 tracking-widest font-mono text-center focus:outline-none focus:border-emerald-500"
                        placeholder="••••"
                      />
                    </div>
                  </div>

                  {/* Estado / Status selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Estado Operativo
                    </label>
                    <select
                      value={driverEstado}
                      onChange={(e) => setDriverEstado(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                    >
                      <option value="Activo">Activo (Habilitado)</option>
                      <option value="Inactivo">Inactivo (Suspendido)</option>
                    </select>
                  </div>

                  {/* Presupuesto Inicial (Asignado) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Presupuesto Caja Chica Asignado (BOB)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <DollarSign className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        value={presupuesto}
                        onChange={(e) => setPresupuesto(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Saldo Actual (Caja Chica Dinámica) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Saldo Disponible en Caja Chica Actual (BOB)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </span>
                      <input
                        type="number"
                        value={saldoActual}
                        onChange={(e) => setSaldoActual(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Modelo Camion */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Modelo del Vehículo
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Truck className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        placeholder="ej: Volvo FH 540 Globetrotter"
                      />
                    </div>
                  </div>

                  {/* Placa Camion */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Placa / Patente del Camión
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs font-bold font-mono">
                        #
                      </span>
                      <input
                        type="text"
                        value={placa}
                        onChange={(e) => setPlaca(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 uppercase"
                        placeholder="ej: 4893-XCS"
                      />
                    </div>
                  </div>

                  {/* Chasis Camion */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Número de Chasis (VIN)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs font-bold font-mono">
                        C
                      </span>
                      <input
                        type="text"
                        value={chasis}
                        onChange={(e) => setChasis(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 uppercase"
                        placeholder="ej: 9BWZZZ90Z..."
                      />
                    </div>
                  </div>

                  {/* Año vehiculo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Año de Fabricación
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        value={anio}
                        onChange={(e) => setAnio(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        placeholder="ej: 2022"
                      />
                    </div>
                  </div>

                  {/* Kms actual */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Odómetro / Kilometraje Actual (KM)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Gauge className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        value={kilometrajeActual}
                        onChange={(e) => setKilometrajeActual(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Presupuesto Camion */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Saldo Remanente de Presupuesto Mantenimiento (BOB)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <DollarSign className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        value={saldoPresupuesto}
                        onChange={(e) => setSaldoPresupuesto(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Estado Camion */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-200 font-bold uppercase tracking-wider block">
                      Estado Operativo / Taller
                    </label>
                    <select
                      value={truckEstado}
                      onChange={(e) => setTruckEstado(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                    >
                      <option value="Activo">Activo (Habilitado)</option>
                      <option value="Mantenimiento">Mantenimiento (Faltas/Taller)</option>
                      <option value="Inactivo">Inactivo (Retirado)</option>
                    </select>
                  </div>
                </>
              )}
            </form>

            {/* Footer containing action buttons */}
            <div className="pt-4 border-t border-slate-800 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                {isSaving ? (
                  <>
                    <Sparkles className="w-4.5 h-4.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>GUARDAR</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
