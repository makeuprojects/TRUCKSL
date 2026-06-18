export interface Camion {
  id_camion: string;
  modelo: string;
  anio: string;
  kilometraje_actual: string;
  saldo_presupuesto: string;
  estado: string; // 'Activo' | 'Mantenimiento' | 'Inactivo'
}

export interface Chofer {
  id_chofer: string;
  nombre_completo: string;
  telefono: string;
  pin_acceso: string;
  estado: string; // 'Activo' | 'Inactivo'
  presupuesto?: string; // Assigned budget, e.g., '10000'
  saldo_actual?: string; // Current available balance
}

export interface Ruta {
  id_ruta: string;
  origen: string;
  destino: string;
  tarifa_base: string;
  estado: 'Disponible' | 'Ocupada';
}

export interface Viaje {
  id_viaje: string;
  id_camion: string;
  id_chofer: string;
  id_ruta: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado_viaje: 'En Ciclo' | 'Finalizado';
  toneladas_base: string;
  toneladas_extras: string;
  foto_pesaje_url: string;
  id_evento_uuid?: string;
  timestamp_registro?: string;
}

export interface Gasto {
  id_gasto: string;
  id_viaje: string;
  id_camion: string;
  id_chofer?: string;
  tipo_gasto: string;
  monto: string;
  fecha: string;
  descripcion: string;
  foto_url?: string;
  id_evento_uuid?: string;
  timestamp_registro?: string;
}

export interface ControlRepuesto {
  id_repuesto_historial: string;
  id_gasto: string;
  pieza_cambiada: string;
  destino_pieza_vieja: 'Desecho' | 'Reutilizar' | 'Reparar';
}

export interface ControlLlanta {
  id_llanta: string;
  id_camion: string;
  posicion: string;
  km_instalacion: string;
  km_actual: string;
  estado: string;
}

export interface HistorialAceite {
  id_cambio: string;
  id_camion: string;
  km_cambio: string;
  proximo_cambio_km: string;
}

export interface DashboardSummary {
  ingresos_totales: number;
  gastos_totales: number;
  utilidades: number;
  vehiculos_activos: number;
}

export interface ServiceAlert {
  id_camion: string;
  modelo: string;
  kilometraje_actual: number;
  proximo_cambio_km: number;
  km_restantes: number;
  estado_alerta: 'NORMAL' | 'NEAR_LIMIT' | 'CRITICAL';
}
