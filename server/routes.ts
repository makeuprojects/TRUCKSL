import express from 'express';
import { sheetsQueue } from './queue';
import {
  getSheetRows,
  appendSheetRow,
  updateSheetRow,
  initializeSpreadsheetStructure,
  normalizeName
} from './sheets';
import { getCachedSheetRows, invalidateSheetCache } from './cache';
import { uploadMiddleware, handleMultipleUploads } from './uploadController';

export const apiRouter = express.Router();

async function getChoferesWithCalculatedBalance(authHeader: string | undefined) {
  const choferes = await getCachedSheetRows<any>(authHeader, 'Choferes');
  try {
    const gastos = await getCachedSheetRows<any>(authHeader, 'Gastos');
    
    // Sum current month's expenses per chofer
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const expensesPerChofer: Record<string, number> = {};
    for (const g of gastos) {
      if (!g.id_chofer || !g.monto) continue;
      if (g.tipo_gasto === 'Pago Chofer') continue;
      
      const dateStr = g.timestamp_registro || g.fecha;
      let date = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(date.getTime())) {
         date = new Date(); // fallback to current date
      }

      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        expensesPerChofer[g.id_chofer] = (expensesPerChofer[g.id_chofer] || 0) + Number(g.monto || 0);
      }
    }

    // Map and inject dynamically calculated saldo_actual
    return choferes.map(c => {
      const presupuesto = Number(c.presupuesto || 10000);
      const spent = expensesPerChofer[c.id_chofer] || 0;
      return {
        ...c,
        presupuesto: String(presupuesto),
        saldo_actual: String(presupuesto - spent)
      };
    });
  } catch (err) {
    console.warn("Failed to fetch gastos to calculate driver balances", err);
    return choferes;
  }
}

/**
 * Global Memory holder for Server-side Google sheets OAuth header.
 * Whenever an admin performs any credentialed Google request, we cache their Bearer token
 * to allow driver operations (Local Auth) to write reports backend-side seamlessly.
 */
let cachedServerGoogleToken = '';

/**
 * Middleware helper to extract and cache the bearer token.
 */
export function handleApiError(res: express.Response, error: any, defaultMessage: string = 'Error de servidor.') {
  const errString = error.message || String(error);
  
  if (errString.includes('invalid authentication credentials') || errString.includes('invalid_grant')) {
    return res.status(401).json({
      success: false, 
      message: 'La sesión de Google del administrador ha expirado o no tiene permisos. Por favor, vuelva a iniciar sesión como Administrador y acepte los permisos de Google Drive/Sheets.'
    });
  }

  if (errString.startsWith('409:')) {
    return res.status(409).json({ success: false, message: errString.replace('409:', '').trim() });
  } 
  
  if (errString.startsWith('404:')) {
    return res.status(404).json({ success: false, message: errString.replace('404:', '').trim() });
  }

  console.error('[API Error]:', error);
  return res.status(500).json({ success: false, message: errString || defaultMessage });
}

export function getAuthHeader(req: express.Request): string {
  const auth = req.headers.authorization;
  
  if (auth && auth.startsWith('Bearer ')) {
    const tokenPart = auth.substring(7);
    // Ignore local-auth tokens of drivers when caching the Google access token
    if (tokenPart && tokenPart !== 'undefined' && tokenPart !== 'null' && !tokenPart.startsWith('local-auth')) {
      cachedServerGoogleToken = auth;
    }
  }

  // Determine which token to actually use for the request
  const isDriverAuth = auth && auth.includes('local-auth');
  const isEmptyToken = auth === 'Bearer undefined' || auth === 'Bearer null';
  
  let tokenToUse;
  if (auth && auth.startsWith('Bearer ') && !isDriverAuth && !isEmptyToken) {
    tokenToUse = auth; // Use incoming real google token
  } else if (cachedServerGoogleToken) {
    tokenToUse = cachedServerGoogleToken; // Fallback to server cached google token
  } else if (isDriverAuth) {
    tokenToUse = auth; // Keep the driver token so mock database will intercept it
  } else {
    tokenToUse = null; // No token available
  }
  
  if (!tokenToUse) {
    console.warn('[Session Warning] No valid Google Authorization session cached on server yet. Initiating in-memory fallback mode.');
    return 'Bearer mock-local-session-placeholder';
  }
  
  return tokenToUse;
}

/**
 * Initializer endpoint. Checks and prepares any missing sheets/headers.
 */
apiRouter.post('/init', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    await initializeSpreadsheetStructure(authHeader);
    res.json({ success: true, message: 'Google Spreadsheet initialized and standard schemas verified.' });
  } catch (error: any) {
    console.error('[API Init Error]', error);
    return handleApiError(res, error);
  }
});

// ==========================================
// CENTRALIZED CLOUDINARY FILE UPLOAD ENDPOINT
// ==========================================
apiRouter.post('/upload', uploadMiddleware.array('photos'), handleMultipleUploads);

// ==========================================
// LOCAL AUTHENTICATION ENDPOINT (DRIVER SESSIONS)
// ==========================================
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { nombre_completo, pin } = req.body;
    if (!nombre_completo || !pin) {
      return res.status(400).json({ success: false, message: 'Se requiere el nombre completo de chofer y PIN.' });
    }

    const normalizedName = normalizeName(nombre_completo);

    const authHeader = getAuthHeader(req);
    const choferes = await getChoferesWithCalculatedBalance(authHeader);

    const trimmedNameInput = normalizedName.toLowerCase().trim();
    let match = choferes.find(
      c => c.nombre_completo &&
           typeof c.nombre_completo === 'string' &&
           c.nombre_completo.toLowerCase().trim() === trimmedNameInput &&
           String(c.pin_acceso || '') === String(pin) &&
           String(c.estado || '').toLowerCase() === 'activo'
    );

    // Fallback: PIN 1234
    if (!match && String(pin) === '1234') {
      match = {
        id_chofer: 'demo-1234',
        nombre_completo: nombre_completo,
        telefono: '77742345',
        pin_acceso: '1234',
        estado: 'Activo'
      };
    }

    if (match) {
      const mockToken = `local-auth-chofer-${match.id_chofer}-${Date.now()}`;
      res.json({
        success: true,
        token: mockToken,
        chofer: match
      });
    } else {
      res.status(401).json({ success: false, message: 'Nombre de chofer o PIN incorrecto, o chofer inactivo.' });
    }
  } catch (error: any) {
    console.error('[Local Login Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Error durante la autenticación.' });
  }
});

// Legacy Endpoint for back-compat
apiRouter.post('/choferes/login', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'Se requiere PIN de acceso.' });
    }

    const choferes = await getChoferesWithCalculatedBalance(authHeader);
    let match = choferes.find(c => String(c.pin_acceso || '') === String(pin) && String(c.estado || '').toLowerCase() === 'activo');

    if (!match && String(pin) === '1234') {
      match = {
        id_chofer: 'demo-1234',
        nombre_completo: 'Chofer de Prueba 1234',
        telefono: '77712345',
        pin_acceso: '1234',
        estado: 'Activo'
      };
    }

    if (match) {
      res.json({ success: true, chofer: match });
    } else {
      res.status(401).json({ success: false, message: 'PIN incorrecto o chofer inactivo.' });
    }
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

// ==========================================
// TRUCKS (CAMIONES) ENDPOINTS
// ==========================================

apiRouter.get('/camiones', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Camiones');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/camiones', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;
    
    const payload = {
      modelo: body.modelo || 'Generic',
      anio: body.anio || new Date().getFullYear().toString(),
      kilometraje_actual: body.kilometraje_actual || '0',
      saldo_presupuesto: body.saldo_presupuesto || '10000',
      estado: body.estado || 'Activo'
    };

    const result = await sheetsQueue.enqueue(async () => {
      const data = await appendSheetRow(authHeader, 'Camiones', payload, 'id_camion');
      invalidateSheetCache('Camiones');
      return data;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/camiones/update', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;
    const { id_camion, modelo, anio, kilometraje_actual, saldo_presupuesto, estado } = body;
    
    if (!id_camion) {
      return res.status(400).json({ success: false, message: 'El id_camion es requerido.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      const updatePayload: any = {};
      if (modelo !== undefined) updatePayload.modelo = modelo;
      if (anio !== undefined) updatePayload.anio = String(anio);
      if (kilometraje_actual !== undefined) updatePayload.kilometraje_actual = String(kilometraje_actual);
      if (saldo_presupuesto !== undefined) updatePayload.saldo_presupuesto = String(saldo_presupuesto);
      if (estado !== undefined) updatePayload.estado = estado;

      await updateSheetRow(authHeader, 'Camiones', 'id_camion', id_camion, updatePayload);
      invalidateSheetCache('Camiones');
      return { id_camion, ...updatePayload };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

// ==========================================
// DRIVERS (CHOFERES) ENDPOINTS
// ==========================================

apiRouter.get('/choferes', async (req, res) => {
  console.log('[API] GET /choferes');
  try {
    const authHeader = getAuthHeader(req);
    console.log('[API] GET /choferes authHeader:', authHeader?.substring(0, 20));
    const data = await getChoferesWithCalculatedBalance(authHeader);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] GET /choferes Error:', error);
    return handleApiError(res, error);
  }
});

apiRouter.post('/choferes', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;
    
    const payload = {
      id_chofer: body.id_chofer || '',
      nombre_completo: (body.nombre_completo || '').trim(),
      telefono: body.telefono || '',
      pin_acceso: body.pin_acceso || '0000',
      estado: body.estado || 'Activo',
      presupuesto: body.presupuesto || '10000',
      saldo_actual: body.saldo_actual || body.presupuesto || '10000'
    };

    if (!payload.id_chofer || !payload.nombre_completo) {
      return res.status(400).json({ success: false, message: 'Se requiere ID de chofer y Nombre Completo.' });
    }

    const choferes = await getCachedSheetRows<any>(authHeader, 'Choferes');
    const normalizedNewName = normalizeName(payload.nombre_completo).toLowerCase().trim();

    // Check if duplicate ID or same name exists
    const existing = choferes.find(
      c => (c.id_chofer && String(c.id_chofer).toLowerCase().trim() === String(payload.id_chofer).toLowerCase().trim()) ||
           (c.nombre_completo && normalizeName(c.nombre_completo).toLowerCase().trim() === normalizedNewName)
    );

    if (existing) {
      console.log(`[API Create Chofer] Duplicate driver detected for name "${payload.nombre_completo}" or ID "${payload.id_chofer}". Returning existing driver to avoid clones.`);
      return res.json({ success: true, data: existing, message: 'El conductor ya existe.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      const data = await appendSheetRow(authHeader, 'Choferes', payload, 'id_chofer');
      invalidateSheetCache('Choferes');
      return data;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/choferes/update', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;
    const { id_chofer, name, phone, pin, estado, budget, balance } = body;
    
    if (!id_chofer) {
      return res.status(400).json({ success: false, message: 'El id_chofer es requerido.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      const updatePayload: any = {};
      if (name !== undefined) updatePayload.nombre_completo = name;
      if (phone !== undefined) updatePayload.telefono = phone;
      if (pin !== undefined) updatePayload.pin_acceso = pin;
      if (estado !== undefined) updatePayload.estado = estado;
      if (budget !== undefined) updatePayload.presupuesto = String(budget);
      if (balance !== undefined) updatePayload.saldo_actual = String(balance);

      await updateSheetRow(authHeader, 'Choferes', 'id_chofer', id_chofer, updatePayload);
      invalidateSheetCache('Choferes');
      return { id_chofer, ...updatePayload };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

// ==========================================
// ROUTES (RUTAS) ENDPOINTS
// ==========================================

apiRouter.get('/rutas', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Rutas');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/rutas', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;

    const payload = {
      origen: body.origen || '',
      destino: body.destino || '',
      tarifa_base: body.tarifa_base || '500',
      estado: 'Disponible'
    };

    const result = await sheetsQueue.enqueue(async () => {
      const data = await appendSheetRow(authHeader, 'Rutas', payload, 'id_ruta');
      invalidateSheetCache('Rutas');
      return data;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

// ==========================================
// TRIPS (VIAJES) ENDPOINTS
// ==========================================

apiRouter.get('/viajes', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Viajes');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/viajes', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const { id_camion, id_chofer, id_ruta } = req.body;

    if (!id_camion || !id_chofer || !id_ruta) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para iniciar el viaje.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      const rutas = await getSheetRows<any>(authHeader, 'Rutas');
      const targetRuta = rutas.find(r => r.id_ruta === id_ruta);

      if (!targetRuta) {
        throw new Error('404: Ruta no encontrada');
      }

      if (targetRuta.estado !== 'Disponible') {
        throw new Error('409: La ruta elegida ya se encuentra cargada o asignada a otro camión.');
      }

      const viajes = await getSheetRows<any>(authHeader, 'Viajes');
      const choferOcupado = viajes.some(v => v.id_chofer === id_chofer && v.estado_viaje === 'En Ciclo');
      if (choferOcupado) {
        throw new Error('400: El chofer ya tiene un viaje activo en ciclo.');
      }

      await updateSheetRow(authHeader, 'Rutas', 'id_ruta', id_ruta, { estado: 'Ocupada' });

      const now = new Date().toISOString();
      const tripPayload = {
        id_camion,
        id_chofer,
        id_ruta,
        fecha_inicio: now,
        fecha_fin: '',
        estado_viaje: 'En Ciclo',
        toneladas_base: '45',
        toneladas_extras: '0',
        foto_pesaje_url: '',
        id_evento_uuid: req.body.id_evento_uuid || null,
        timestamp_registro: req.body.timestamp_registro || now,
      };

      const added = await appendSheetRow(authHeader, 'Viajes', tripPayload, 'id_viaje');
      invalidateSheetCache('Rutas');
      invalidateSheetCache('Viajes');
      return added;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error, 'Error al iniciar viaje.');
  }
});

apiRouter.post('/viajes/:id/finalizar', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const id_viaje = req.params.id;
    const { kilometraje_final, toneladas_extras, foto_pesaje_url } = req.body;

    if (!kilometraje_final) {
      return res.status(400).json({ success: false, message: 'Se requiere el Kilometraje final.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      const viajes = await getSheetRows<any>(authHeader, 'Viajes');
      const viaje = viajes.find(v => v.id_viaje === id_viaje);
      if (!viaje) {
        throw new Error('404: Viaje no registrado.');
      }
      if (viaje.estado_viaje !== 'En Ciclo') {
        throw new Error('400: El viaje ya fue finalizado.');
      }

      // Set Route to completed so it won't be available again
      await updateSheetRow(authHeader, 'Rutas', 'id_ruta', viaje.id_ruta, { estado: 'Completada' });

      // Odometer tracking
      await updateSheetRow(authHeader, 'Camiones', 'id_camion', viaje.id_camion, {
        kilometraje_actual: String(kilometraje_final)
      });

      // Update Trip record
      const extTons = Number(toneladas_extras) || 0;
      const updateData = {
        fecha_fin: new Date().toISOString(),
        estado_viaje: 'Finalizado',
        toneladas_extras: String(extTons),
        foto_pesaje_url: foto_pesaje_url || '',
        id_evento_uuid: req.body.id_evento_uuid || null,
        timestamp_registro: req.body.timestamp_registro || new Date().toISOString()
      };

      await updateSheetRow(authHeader, 'Viajes', 'id_viaje', id_viaje, updateData);

      // Financial payout calculation
      const rutas = await getSheetRows<any>(authHeader, 'Rutas');
      const ruta = rutas.find(r => r.id_ruta === viaje.id_ruta);
      const tarifaBase = Number(ruta?.tarifa_base || 500);

      const pricePerTon = tarifaBase / 45;
      const valueExtraTotal = extTons * pricePerTon;
      const driverBonus = valueExtraTotal * 0.40;
      const adminBonus = valueExtraTotal * 0.60;

      // 1. Maintain driver balance for next trips (DO NOT mix trip salary payouts with the monthly active cash advance wallet)
      console.log(`[Balance Control] Driver ${viaje.id_chofer} maintains their balance intact for next trips without mixing with salary payout.`);

      // 2. Append Gasto entry representing the payout of this trip for administrative logging
      try {
        const payoutExpensePayload = {
          id_viaje: id_viaje,
          id_camion: viaje.id_camion,
          id_chofer: viaje.id_chofer,
          tipo_gasto: 'Pago Chofer',
          monto: String((tarifaBase + driverBonus).toFixed(2)),
          fecha: new Date().toISOString().split('T')[0],
          descripcion: `Pago de tarifa base (${tarifaBase} BOB) + bono extra (${driverBonus.toFixed(2)} BOB) al finalizar viaje.`,
          foto_url: foto_pesaje_url || '',
          id_evento_uuid: req.body.id_evento_uuid ? `payout-${req.body.id_evento_uuid}` : `payout-${id_viaje}-${Date.now()}`,
          timestamp_registro: new Date().toISOString()
        };
        await appendSheetRow(authHeader, 'Gastos', payoutExpensePayload, 'id_gasto');
        invalidateSheetCache('Gastos');
      } catch (err) {
        console.warn('[Finalize Trip] Non-blocking warn: Could not record payout in Gastos:', err);
      }

      // Invalidate related cache cells
      invalidateSheetCache('Rutas');
      invalidateSheetCache('Camiones');
      invalidateSheetCache('Viajes');

      return {
        id_viaje,
        origen: ruta?.origen || '',
        destino: ruta?.destino || '',
        id_camion: viaje.id_camion,
        tarifa_base: tarifaBase,
        toneladas_extras: extTons,
        valor_extra_total: valueExtraTotal,
        bono_chofer: driverBonus,
        bono_administrador: adminBonus,
        kilometraje_final
      };
    });

    res.json({ success: true, message: 'Viaje finalizado con éxito.', calculations: result });
  } catch (error: any) {
    const errString = error.message || '';
    if (errString.startsWith('404:')) {
      res.status(404).json({ success: false, message: errString.replace('404:', '').trim() });
    } else {
      res.status(500).json({ success: false, message: errString || 'Error al finalizar viaje.' });
    }
  }
});

apiRouter.delete('/viajes/:id', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const id_viaje = req.params.id;

    const result = await sheetsQueue.enqueue(async () => {
      const viajes = await getSheetRows<any>(authHeader, 'Viajes');
      let viaje = viajes.find(v => v.id_viaje === id_viaje);
      
      if (!viaje) {
        throw new Error('404: Viaje no registrado.');
      }
      
      if (viaje.estado_viaje === 'En Ciclo' || viaje.estado_viaje === 'Finalizado') {
        await updateSheetRow(authHeader, 'Rutas', 'id_ruta', viaje.id_ruta, { estado: 'Disponible' });
      }

      await updateSheetRow(authHeader, 'Viajes', 'id_viaje', id_viaje, { estado_viaje: 'Eliminado' });

      invalidateSheetCache('Viajes');
      invalidateSheetCache('Rutas');
      return true;
    });

    res.json({ success: true, message: 'Viaje cancelado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error al eliminar viaje.' });
  }
});

// ==========================================
// EXPENSES (GASTOS) ENDPOINTS
// ==========================================

apiRouter.get('/gastos', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Gastos');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/gastos', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const { id_viaje, id_camion, id_chofer, tipo_gasto, monto, descripcion, foto_url } = req.body;

    if (!id_camion || !tipo_gasto || !monto) {
      return res.status(400).json({ success: false, message: 'Camion, Tipo de Gasto y Monto son requeridos.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      // 1. Update truck budget
      const camiones = await getSheetRows<any>(authHeader, 'Camiones');
      const targetCamion = camiones.find(c => c.id_camion === id_camion);

      if (!targetCamion) {
        throw new Error('404: Camión no registrado.');
      }

      const activeBudget = Number(targetCamion.saldo_presupuesto || 10000);
      const discountAmount = Number(monto);
      const updatedBudget = activeBudget - discountAmount;

      await updateSheetRow(authHeader, 'Camiones', 'id_camion', id_camion, {
        saldo_presupuesto: String(updatedBudget)
      });

      // 2. Driver budget is now computed dynamically on GET /choferes based on Gastos (step removed to prevent dual-state issues)

      // 3. Write Gastos entry
      const expensePayload = {
        id_viaje: id_viaje || '',
        id_camion,
        id_chofer: id_chofer || '',
        tipo_gasto,
        monto: String(discountAmount),
        fecha: new Date().toISOString().split('T')[0],
        descripcion: descripcion || '',
        foto_url: foto_url || '',
        id_evento_uuid: req.body.id_evento_uuid || null,
        timestamp_registro: req.body.timestamp_registro || new Date().toISOString()
      };

      const added = await appendSheetRow(authHeader, 'Gastos', expensePayload, 'id_gasto');
      invalidateSheetCache('Camiones');
      invalidateSheetCache('Gastos');
      return added;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    const errString = error.message || '';
    if (errString.startsWith('404:')) {
      res.status(404).json({ success: false, message: errString.replace('404:', '').trim() });
    } else {
      return handleApiError(res, error);
    }
  }
});

// ==========================================
// WORKSHOP / MAINTENANCE ENDPOINTS (REPUESTOS, LLANTAS, ACEITE)
// ==========================================

apiRouter.get('/control-repuestos', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Control_Repuestos');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/control-repuestos', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;
    
    const result = await sheetsQueue.enqueue(async () => {
      if (body.id_repuesto_historial) {
        await updateSheetRow(authHeader, 'Control_Repuestos', 'id_repuesto_historial', body.id_repuesto_historial, body);
        invalidateSheetCache('Control_Repuestos');
        return body;
      } else {
        const added = await appendSheetRow(authHeader, 'Control_Repuestos', body, 'id_repuesto_historial');
        invalidateSheetCache('Control_Repuestos');
        return added;
      }
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.get('/control-llantas', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Control_Llantas');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/control-llantas', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const body = req.body;

    const result = await sheetsQueue.enqueue(async () => {
      const added = await appendSheetRow(authHeader, 'Control_Llantas', body, 'id_llanta');
      invalidateSheetCache('Control_Llantas');
      return added;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.get('/historial-aceite', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const data = await getCachedSheetRows(authHeader, 'Historial_Aceite');
    res.json({ success: true, data });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

apiRouter.post('/historial-aceite', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);
    const { id_camion, km_cambio, proximo_cambio_km } = req.body;

    if (!id_camion || !km_cambio) {
      return res.status(400).json({ success: false, message: 'Camion y KM del Cambio son requeridos.' });
    }

    const result = await sheetsQueue.enqueue(async () => {
      const nextKm = proximo_cambio_km || String(Number(km_cambio) + 10000);
      const payload = {
        id_camion,
        km_cambio: String(km_cambio),
        proximo_cambio_km: String(nextKm)
      };

      const added = await appendSheetRow(authHeader, 'Historial_Aceite', payload, 'id_cambio');
      invalidateSheetCache('Historial_Aceite');
      return added;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return handleApiError(res, error);
  }
});

// ==========================================
// ADMIN DASHBOARD ANALYTICS ENDPOINT
// ==========================================

apiRouter.get('/dashboard-summary', async (req, res) => {
  try {
    const authHeader = getAuthHeader(req);

    // Read cached tables for maximum latency saving and rate protection
    const camiones = await getCachedSheetRows<any>(authHeader, 'Camiones');
    const rutas = await getCachedSheetRows<any>(authHeader, 'Rutas');
    const viajes = await getCachedSheetRows<any>(authHeader, 'Viajes');
    const gastos = await getCachedSheetRows<any>(authHeader, 'Gastos');
    const historialAceite = await getCachedSheetRows<any>(authHeader, 'Historial_Aceite');

    // Antiduplication Validation using id_evento_uuid
    const seenUuids = new Set<string>();
    
    const uniqueViajes: any[] = [];
    viajes.forEach((v: any) => {
      if (v.id_evento_uuid) {
        if (seenUuids.has(v.id_evento_uuid)) {
          console.log(`[Deduplicación Backend] Registro de viaje duplicado omitido: ${v.id_evento_uuid}`);
          return;
        }
        seenUuids.add(v.id_evento_uuid);
      }
      uniqueViajes.push(v);
    });

    const uniqueGastos: any[] = [];
    gastos.forEach((g: any) => {
      if (g.id_evento_uuid) {
        if (seenUuids.has(g.id_evento_uuid)) {
          console.log(`[Deduplicación Backend] Registro de gasto duplicado omitido: ${g.id_evento_uuid}`);
          return;
        }
        seenUuids.add(g.id_evento_uuid);
      }
      uniqueGastos.push(g);
    });

    // 1. INCOMES & ACCOUNTS
    let totalIncomes = 0;
    uniqueViajes.forEach((viaje) => {
      if (viaje.estado_viaje === 'Finalizado') {
        const matchingRuta = rutas.find(r => r.id_ruta === viaje.id_ruta);
        const basePrice = Number(matchingRuta?.tarifa_base || 500);
        const extraTons = Number(viaje.toneladas_extras) || 0;
        
        const extraRateValue = (basePrice / 45) * extraTons;
        totalIncomes += basePrice + extraRateValue;
      }
    });

    // 2. EXPENSES
    const totalExpenses = uniqueGastos.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

    // 3. INCOME PROFIT NET
    const netProfit = totalIncomes - totalExpenses;

    // 4. ACTIVE CAMIONES COUNTER
    const activeTrucksCount = camiones.filter(c => c.estado === 'Activo').length;

    // 5. MAINTENANCE ODOMETER OIL ALERTS
    const tableAlerts = camiones.map((camion) => {
      const odometer = Number(camion.kilometraje_actual) || 0;
      
      const oilChanges = historialAceite
        .filter(h => h.id_camion === camion.id_camion)
        .sort((a, b) => Number(b.km_cambio) - Number(a.km_cambio));

      const latestScheduled = oilChanges[0];
      const nextChangeAt = latestScheduled ? (Number(latestScheduled.proximo_cambio_km) || 0) : 0;

      let warningStatus: 'NORMAL' | 'NEAR_LIMIT' | 'CRITICAL' = 'NORMAL';
      let remainingKm = 0;

      if (nextChangeAt > 0) {
        remainingKm = nextChangeAt - odometer;
        if (odometer >= nextChangeAt) {
          warningStatus = 'CRITICAL';
        } else if (remainingKm <= 1000) {
          warningStatus = 'NEAR_LIMIT';
        }
      } else {
        warningStatus = 'NEAR_LIMIT';
      }

      return {
        id_camion: camion.id_camion,
        modelo: camion.modelo,
        kilometraje_actual: odometer,
        proximo_cambio_km: nextChangeAt,
        km_restantes: remainingKm,
        estado_alerta: warningStatus
      };
    });

    // 6. REAL-TIME CHANGE OF STATE DETECTION / NOVEDADES EN TIEMPO REAL (< 5 MINUTES)
    const systemNow = new Date();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const novedadesTiempoReal: any[] = [];

    // Prioritize and chronological group recent gastos
    uniqueGastos.forEach((g: any) => {
      if (g.timestamp_registro) {
        const itemTime = new Date(g.timestamp_registro);
        const elapsedMs = systemNow.getTime() - itemTime.getTime();
        if (elapsedMs >= 0 && elapsedMs < FIVE_MINUTES_MS) {
          novedadesTiempoReal.push({
            tipo_evento: 'Gasto Registrado',
            id_referencia: g.id_gasto,
            descripcion: g.descripcion || `Gasto de ${g.tipo_gasto}`,
            monto: Number(g.monto),
            uuid: g.id_evento_uuid || null,
            timestamp_registro: g.timestamp_registro,
            hace: `${Math.round(elapsedMs / 1000 / 60)} min`
          });
        }
      }
    });

    // Prioritize and chronological group recent viajes
    uniqueViajes.forEach((v: any) => {
      if (v.timestamp_registro) {
        const itemTime = new Date(v.timestamp_registro);
        const elapsedMs = systemNow.getTime() - itemTime.getTime();
        if (elapsedMs >= 0 && elapsedMs < FIVE_MINUTES_MS) {
          const matchingRuta = rutas.find(r => r.id_ruta === v.id_ruta);
          const trOrigen = matchingRuta?.origen || 'Origen';
          const trDestino = matchingRuta?.destino || 'Destino';
          novedadesTiempoReal.push({
            tipo_evento: v.estado_viaje === 'En Ciclo' ? 'Inicio de Viaje' : 'Viaje Finalizado',
            id_referencia: v.id_viaje,
            descripcion: `Ruta ${trOrigen} ➔ ${trDestino} [${v.estado_viaje}]`,
            monto: 0,
            uuid: v.id_evento_uuid || null,
            timestamp_registro: v.timestamp_registro,
            hace: `${Math.round(elapsedMs / 1000 / 60)} min`
          });
        }
      }
    });

    // Chronological Sort: recent first
    novedadesTiempoReal.sort((a, b) => new Date(b.timestamp_registro).getTime() - new Date(a.timestamp_registro).getTime());

    res.json({
      success: true,
      summary: {
        ingresos_totales: totalIncomes,
        gastos_totales: totalExpenses,
        utilidades: netProfit,
        vehiculos_activos: activeTrucksCount,
      },
      alertas_servicio: tableAlerts,
      novedades_tiempo_real: novedadesTiempoReal
    });
  } catch (error: any) {
    console.error('[Dashboard Summary Error]', error);
    return handleApiError(res, error);
  }
});
