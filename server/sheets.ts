import { google } from 'googleapis';
import crypto from 'crypto';

export const SPREADSHEET_ID = '1ZNuFluKQi3lFP5qF-eQtfvDCcIDotu4v8jV89GwRgsQ';

// Memory storage holding data in-case Google OAuth has not yet been linked/init
export const memoryStore: Record<string, any[]> = {
  Camiones: [],
  Choferes: [],
  Rutas: [],
  Viajes: [],
  Gastos: [],
  Control_Repuestos: [],
  Control_Llantas: [],
  Historial_Aceite: []
};

// Local read and write mutation timing arrays to bypass slow/cached Google CDNs
export const lastFetchTime: Record<string, number> = {};
export const lastMutationTime: Record<string, number> = {};

// Keep track of our local modifications that might not have propagated to the public CDN feed yet
export const pendingLocalModifications: Record<string, Record<string, {
  timestamp: number;
  fields: Record<string, any>;
}>> = {};

export const pendingLocalAppends: Record<string, Array<{
  timestamp: number;
  record: Record<string, any>;
}>> = {};

export function isMockSession(authHeader: string): boolean {
  // Bypass Google Cloud OAuth entirely to enable public sheet sync 24/7
  return true;
}

/**
 * Maps the list of expected headers to their physical columns (indices) in the spreadsheet,
 * gracefully resolving header variations and avoiding conflicts (like "descripcion" vs "descripcion_").
 */
export function mapExpectedHeadersToActualIndices(
  expectedHeaders: string[],
  actualHeaderLabels: string[]
): Record<string, number> {
  const mapping: Record<string, number> = {};
  const lowercaseLabels = actualHeaderLabels.map(l => String(l || '').toLowerCase().trim());

  expectedHeaders.forEach(f => {
    const lowerF = f.toLowerCase().trim();

    // 1. High priority exact matching and specific schema conversions
    let idx = -1;

    if (lowerF === 'id_chofer') {
      idx = lowercaseLabels.findIndex(l => l === 'id_chofer' || l === 'id_conductor' || l === 'conductor' || l === 'chofer');
    } else if (lowerF === 'tipo_gasto') {
      idx = lowercaseLabels.findIndex(l => l === 'tipo_gasto' || l === 'descripcion_' || l === 'tipo_gasto_');
    } else if (lowerF === 'descripcion') {
      idx = lowercaseLabels.findIndex(l => l === 'descripcion'); // Match EXACT "descripcion" (skips "descripcion_")
    } else if (lowerF === 'foto_url') {
      idx = lowercaseLabels.findIndex(l => l === 'foto_url' || l === 'enlace' || l === 'comprobante' || l === 'foto');
    } else if (lowerF === 'monto') {
      idx = lowercaseLabels.findIndex(l => l === 'monto'); // MATCH exact "monto" (skips "monto_inicial")
    } else if (lowerF === 'monto_inicial') {
      idx = lowercaseLabels.findIndex(l => l === 'monto_inicial' || l === 'presupuesto' || l === 'saldo_inicial');
    } else if (lowerF === 'saldo_actual') {
      idx = lowercaseLabels.findIndex(l => l === 'saldo_actual' || l === 'saldo');
    } else {
      idx = lowercaseLabels.findIndex(l => l === lowerF);
    }

    // 2. Fallback to flexible substring matching if absolute exact match was not found
    if (idx === -1) {
      idx = lowercaseLabels.findIndex(l => {
        if (!l) return false;
        // Avoid mapping Expected "descripcion" to Physical "descripcion_"
        if (lowerF === 'descripcion' && l.endsWith('_')) return false;
        if (lowerF === 'tipo_gasto' && (l.includes('tipo') || l.includes('gasto'))) return true;
        if (lowerF === 'id_chofer' && (l.includes('chofer') || l.includes('conductor'))) return true;
        if (lowerF === 'foto_url' && (l.includes('foto') || l.includes('url') || l.includes('enlace') || l.includes('comprobante'))) return true;
        if (lowerF === 'monto_inicial' && l.includes('presupuesto')) return true;
        if (lowerF === 'saldo_actual' && l.includes('saldo')) return true;

        return l.includes(lowerF);
      });
    }

    if (idx !== -1) {
      mapping[f] = idx;
    }
  });

  return mapping;
}

/**
 * Normalizes driver name from frontend identifier "Mauricio Prueba1" to base "Mauricio".
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed === 'Mauricio Prueba1' || trimmed.toLowerCase() === 'mauricio prueba1') {
    return 'Mauricio';
  }
  return trimmed;
}

/**
 * Heals split rows specifically for the "Gastos" tab.
 * In some cases, the Google Sheet records amounts/drivers in even rows and ids/descriptions in odd rows.
 * This helper pairs them up.
 */
export function healGastosRows<T extends Record<string, any>>(rawParsedObjects: T[]): T[] {
  const healedObjects: T[] = [];
  
  // Make a shallow copy of objects so we don't mutate input
  const list = rawParsedObjects.map(item => ({ ...item })) as any[];
  
  for (let i = 0; i < list.length; i++) {
    const current = list[i];
    
    if (!current.id_gasto) {
      // It's a partial row with no id_gasto (containing amount/id_chofer)
      let merged = false;
      
      // Try next row first (even is usually directly followed by odd in Google Sheet)
      if (i + 1 < list.length && list[i + 1].id_gasto) {
        const next = list[i + 1];
        if (!next.monto || next.monto === '0' || next.monto === '0.00' || next.monto === '' || !next.id_chofer || next.id_chofer === '') {
          next.monto = current.monto || next.monto;
          next.id_chofer = current.id_chofer || next.id_chofer;
          merged = true;
        }
      }
      
      // Try previous row if not merged
      if (!merged && i - 1 >= 0 && list[i - 1].id_gasto) {
        const prev = list[i - 1];
        if (!prev.monto || prev.monto === '0' || prev.monto === '0.00' || prev.monto === '' || !prev.id_chofer || prev.id_chofer === '') {
          prev.monto = current.monto || prev.monto;
          prev.id_chofer = current.id_chofer || prev.id_chofer;
          merged = true;
        }
      }
      
      // If we couldn't merge it, we'll keep it as is (so that no data is permanently lost if there is a solo partial row)
      if (!merged) {
        healedObjects.push(current as T);
      }
    } else {
      // This row HAS id_gasto. Check if its amount or driver is missing and can be populated from adjacent partial row
      if (!current.monto || current.monto === '0' || current.monto === '0.00' || current.monto === '' || !current.id_chofer || current.id_chofer === '') {
        if (i - 1 >= 0 && !list[i - 1].id_gasto) {
          const prev = list[i - 1];
          current.monto = prev.monto || current.monto;
          current.id_chofer = current.id_chofer || prev.id_chofer;
        } else if (i + 1 < list.length && !list[i + 1].id_gasto) {
          const next = list[i + 1];
          current.monto = next.monto || current.monto;
          current.id_chofer = current.id_chofer || next.id_chofer;
        }
      }
      healedObjects.push(current as T);
    }
  }
  return healedObjects;
}

/**
 * Tab names with their respective column schemas (headers).
 */
export const SHEET_SCHEMAS = {
  Camiones: ['id_camion', 'modelo', 'anio', 'kilometraje_actual', 'saldo_presupuesto', 'estado'],
  Choferes: ['id_chofer', 'nombre_completo', 'telefono', 'pin_acceso', 'estado', 'presupuesto', 'saldo_actual'],
  Rutas: ['id_ruta', 'origen', 'destino', 'tarifa_base', 'estado'],
  Viajes: ['id_viaje', 'id_camion', 'id_chofer', 'id_ruta', 'fecha_inicio', 'fecha_fin', 'estado_viaje', 'toneladas_base', 'toneladas_extras', 'foto_pesaje_url'],
  Gastos: ['id_gasto', 'id_viaje', 'id_camion', 'id_chofer', 'tipo_gasto', 'monto', 'fecha', 'descripcion', 'foto_url'],
  Control_Repuestos: ['id_repuesto_historial', 'id_gasto', 'pieza_cambiada', 'destino_pieza_vieja'],
  Control_Llantas: ['id_llanta', 'id_camion', 'posicion', 'km_instalacion', 'km_actual', 'estado'],
  Historial_Aceite: ['id_cambio', 'id_camion', 'km_cambio', 'proximo_cambio_km']
};

/**
 * Instantiates a Google Sheets client using the user's OAuth access token
 * from the request authorization header.
 */
export function getSheetsClient(authHeader?: string) {
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    throw new Error('Authorization header with a valid user OAuth bearer token is required.');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

/**
 * Verifies that the Google Spreadsheet has all the required tabs and headers.
 * If any tab is missing, it creates the tab and initializes the header row.
 */
export async function initializeSpreadsheetStructure(authHeader: string): Promise<void> {
  const sheets = getSheetsClient(authHeader);
  
  // 1. Get spreadsheet metadata to verify existing worksheets
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const existingTitles = new Set(
    meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]
  );

  const requests: any[] = [];

  // Check which sheets are missing
  for (const [title, headers] of Object.entries(SHEET_SCHEMAS)) {
    if (!existingTitles.has(title)) {
      requests.push({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: headers.length + 5,
            },
          },
        },
      });
    }
  }

  // 2. Add missing sheets in a batch update
  if (requests.length > 0) {
    console.log(`[Spreadsheet Init] Adding missing tabs: ${requests.map(r => r.addSheet.properties.title).join(', ')}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
  }

  // 3. Verify and write header rows where appropriate
  for (const [title, headers] of Object.entries(SHEET_SCHEMAS)) {
    // Check if sheet contains headers already by reading row 1
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A1:Z1`,
    });

    const values = res.data.values;
    if (!values || values.length === 0 || values[0].length === 0) {
      console.log(`[Spreadsheet Init] Initializing headers and default seed rows for sheet: ${title}`);
      const rowsToInsert = [headers];
      const seedData = memoryStore[title] || [];
      for (const item of seedData) {
        const row = headers.map(header => item[header] !== undefined ? String(item[header]) : '');
        rowsToInsert.push(row);
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${title}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rowsToInsert,
        },
      });
    }
  }
}

/**
 * Automatically initializes spreadsheet tabs and headers if a range or sheet not found error is encountered.
 */
async function withAutoInit<T>(authHeader: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error: any) {
    const errorStr = String(error.message || error);
    const isRangeOrNotFoundError = 
      errorStr.includes('Unable to parse range') ||
      errorStr.includes('not found') ||
      errorStr.includes('INVALID_ARGUMENT') ||
      errorStr.includes('Requested entity was not found') ||
      error.status === 400 ||
      error.code === 400;

    if (isRangeOrNotFoundError) {
      console.log('[Sheets Auto-Init] Missing sheet or invalid range encountered. Running live initialization...');
      try {
        await initializeSpreadsheetStructure(authHeader);
      } catch (initErr) {
        console.error('[Sheets Auto-Init] Error running fallback initialize:', initErr);
      }
      // Retry the action
      return await action();
    }
    throw error;
  }
}

/**
 * Fetches the public Google Sheet rows using Google Visualization Endpoint.
 * This is active 24/7 and does NOT require Google login.
 */
export async function fetchPublicSheetRows<T extends Record<string, any>>(
  tabName: keyof typeof SHEET_SCHEMAS
): Promise<T[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName as string)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    const text = await res.text();
    
    // Extract JSON between "google.visualization.Query.setResponse(" and ");"
    const startIdx = text.indexOf('google.visualization.Query.setResponse(');
    if (startIdx === -1) {
      throw new Error('Invalid visualization response format');
    }
    const jsonStr = text.substring(startIdx + 'google.visualization.Query.setResponse('.length, text.lastIndexOf(');'));
    const parsed = JSON.parse(jsonStr);
    
    if (parsed.status !== 'ok') {
      throw new Error(`Google visualization response error state: ${parsed.status}`);
    }
    
    const rows = parsed.table.rows || [];
    const expectedHeaders = SHEET_SCHEMAS[tabName];
    const cols = parsed.table.cols || [];

    // Robust and flexible column matching: map each expected header to its actual column position in the sheet
    const colLabels = cols.map((col: any) => col ? String(col.label || '').trim() : '');
    const headerToColIdx = mapExpectedHeadersToActualIndices(expectedHeaders, colLabels);

    // Fallback to default indices for any unresolved expected fields to keep data safe
    expectedHeaders.forEach((header, defaultIdx) => {
      if (headerToColIdx[header] === undefined) {
        headerToColIdx[header] = defaultIdx;
      }
    });
    
    const rawParsedObjects: any[] = [];

    // Parse all rows in physical order (chronological)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r.c) continue;
      const obj: any = {};
      let isHeaderRow = false;
      let hasAnyValue = false;

      expectedHeaders.forEach((header: string) => {
        const colIdx = headerToColIdx[header];
        const cell = r.c && r.c[colIdx];
        let val = '';
        if (cell) {
          if (cell.v !== null && cell.v !== undefined) {
            val = String(cell.v).trim();
            if (val.startsWith('Date(')) {
              try {
                const parts = val.substring(5, val.length - 1).split(',').map(Number);
                if (parts.length >= 3) {
                  // Adjust month mapping: Google returns 0-based index for month values in Date(...)
                  const d = new Date(parts[0], parts[1], parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
                  val = d.toISOString();
                }
              } catch (e) {}
            }
          }
        }
        
        if (val !== '') {
          hasAnyValue = true;
        }

        // If the value matches the header itself, it's the header row of the sheet being parsed as data
        if (val.toLowerCase() === header.toLowerCase()) {
          isHeaderRow = true;
        }

        obj[header] = val;
      });
      
      if (isHeaderRow || !hasAnyValue) {
        continue; // Skip header row or completely empty rows
      }

      // Normalize common column names
      if (obj.monto_inicial !== undefined && obj.presupuesto === undefined) {
        obj.presupuesto = obj.monto_inicial;
      } else if (obj.presupuesto !== undefined && obj.monto_inicial === undefined) {
        obj.monto_inicial = obj.presupuesto;
      }
      if (obj.saldo !== undefined && obj.saldo_actual === undefined) {
        obj.saldo_actual = obj.saldo;
      } else if (obj.saldo_actual !== undefined && obj.saldo === undefined) {
        obj.saldo = obj.saldo_actual;
      }

      // Live fallback schemas sanitization (ensuring empty spreadsheet entries do not get mapped as empty string/zero budget)
      if (tabName === 'Choferes') {
        if (!obj.presupuesto || obj.presupuesto === '') {
          obj.presupuesto = '10000';
        }
        if (!obj.saldo_actual || obj.saldo_actual === '') {
          obj.saldo_actual = obj.presupuesto;
        }
      } else if (tabName === 'Camiones') {
        if (!obj.saldo_presupuesto || obj.saldo_presupuesto === '') {
          obj.saldo_presupuesto = '10000';
        }
      }

      rawParsedObjects.push(obj);
    }

    // Apply the healing split-rows method if Gastos tab is fetched
    let processedObjects = rawParsedObjects;
    if (tabName === 'Gastos') {
      processedObjects = healGastosRows(rawParsedObjects);
    }

    const result: any[] = [];
    const seenIds = new Set<string>();
    const primaryKey = expectedHeaders[0];

    // Filter, deduplicate from newest to oldest and keep chronological order
    for (let i = processedObjects.length - 1; i >= 0; i--) {
      const obj = processedObjects[i];
      const idVal = String(obj[primaryKey] || '').trim();
      
      if (!idVal) {
        continue; // Skip completely blank/draft records that could not be healed
      }

      if (seenIds.has(idVal.toLowerCase())) {
        console.warn(`[Public Sheets Deduplicator] Already seen PK: "${idVal}" in tab: ${tabName}. Skipping older duplicate clone.`);
        continue;
      }

      // 3. Apply Local Mod/Append Overrides to hide temporary CDN Cache delays
      // This heals the "amount goes back to 100% just after a transaction" visual bug
      if (pendingLocalModifications[tabName] && pendingLocalModifications[tabName][idVal]) {
        const pending = pendingLocalModifications[tabName][idVal];
        if (Date.now() - pending.timestamp < 300000) { // Keep overridden for 5 min while cache propagates
          Object.assign(obj, pending.fields);
        } else {
          delete pendingLocalModifications[tabName][idVal]; // Expiration logic
        }
      }

      seenIds.add(idVal.toLowerCase());
      result.unshift(obj);
    }

    // Include local appends that haven't hit the public CDN yet
    if (pendingLocalAppends[tabName]) {
       const now = Date.now();
       const activeAppends = [];
       for (const app of pendingLocalAppends[tabName]) {
         if (now - app.timestamp < 300000) {
           activeAppends.push(app);
           const idVal = String(app.record[primaryKey] || '').trim();
           if (idVal && !seenIds.has(idVal.toLowerCase())) {
             result.push(app.record); // append to end
             seenIds.add(idVal.toLowerCase());
           }
         }
       }
       pendingLocalAppends[tabName] = activeAppends; // keep memory clean
    }

    return result as T[];
  } catch (error) {
    console.error(`[fetchPublicSheetRows] Error fetching tab ${tabName}:`, error);
    throw error;
  }
}

/**
 * Sends rows to the public Apps Script Web App for background synchronization.
 * Active 24/7 without credentials.
 */
export async function syncToAppsScriptWebapp(tabName: string, data: any): Promise<boolean> {
  const url = "https://script.google.com/macros/s/AKfycbxkz2knra1-RVlwQnF2GJ0BmTogZ8oa1k-Xs2T5H2Lx3NbfAF9ES_qwcpG2QKmAOhZM/exec";
  
  // Enrich data with cross-compatible aliases for spreadsheet headers
  const enrichedData = { ...data };
  if (tabName === 'Gastos') {
    if (data.id_chofer && !data.id_conductor) {
      enrichedData.id_conductor = data.id_chofer;
    }
    if (data.id_conductor && !data.id_chofer) {
      enrichedData.id_chofer = data.id_conductor;
    }
    if (data.tipo_gasto && !data.descripcion_) {
      enrichedData.descripcion_ = data.tipo_gasto;
    }
    if (data.descripcion_ && !data.tipo_gasto) {
      enrichedData.tipo_gasto = data.descripcion_;
    }
    if (data.foto_url && !data.enlace) {
      enrichedData.enlace = data.foto_url;
    }
    if (data.enlace && !data.foto_url) {
      enrichedData.foto_url = data.enlace;
    }
  }

  const payload = {
    action: tabName,
    spreadsheetId: SPREADSHEET_ID,
    spreadsheet_id: SPREADSHEET_ID,
    headers: SHEET_SCHEMAS[tabName as keyof typeof SHEET_SCHEMAS],
    data: enrichedData
  };

  try {
    console.log(`[Public Apps Script Writer] Sending payload for tab ${tabName} to Apps Script...`);
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[Apps Script POST Sync] Response status error: ${res.status}`);
      return false;
    }

    const json = await res.json();
    const isSuccess = json && json.status === 'success';
    console.log(`[Public Apps Script Writer] Sync success for tab ${tabName}:`, isSuccess, json);
    return isSuccess;
  } catch (err) {
    console.warn(`[Apps Script POST Sync Error] Could not sync ${tabName} to Apps Script:`, err);
    return false;
  }
}

/**
 * Reads any tab from Google Sheets and parses the rows into JSON objects.
 */
export async function getSheetRows<T extends Record<string, any>>(
  authHeader: string,
  tabName: keyof typeof SHEET_SCHEMAS
): Promise<T[]> {
  if (isMockSession(authHeader)) {
    const FETCH_COOLDOWN = 15000; // 15 seconds
    const MUTATION_LOCK_DURATION = 35000; // 35 seconds
    const now = Date.now();
    const hasData = memoryStore[tabName] && memoryStore[tabName].length > 0;
    const timeSinceFetch = now - (lastFetchTime[tabName] || 0);
    const timeSinceMutation = now - (lastMutationTime[tabName] || 0);

    // Rule A: If we wrote a mutation recently on this tab, DO NOT fetch from the public feed
    // which has a delayed/cached CDN, to prevent overwriting active memoryStore.
    if (hasData && timeSinceMutation < MUTATION_LOCK_DURATION) {
      console.log(`[Mock Cache Rule A] Lock Active. Using local memoryStore for "${tabName}" (last mutated ${Math.round(timeSinceMutation/1000)}s ago)`);
      return (memoryStore[tabName] || []) as T[];
    }

    // Rule B: Return cached data if time since last visualization pull is short
    if (hasData && timeSinceFetch < FETCH_COOLDOWN) {
      console.log(`[Mock Cache Rule B] Cache Hit. Using local memoryStore for "${tabName}" (last fetched ${Math.round(timeSinceFetch/1000)}s ago)`);
      return (memoryStore[tabName] || []) as T[];
    }

    console.log(`[Public Sheets Dynamic Auth-less Reader] Fetching live feed for tab: ${tabName}`);
    try {
      const liveRows = await fetchPublicSheetRows<T>(tabName);
      
      // Additional safety check: If there was a mutation during the network transit time,
      // do not overwrite the memory cell.
      if (Date.now() - (lastMutationTime[tabName] || 0) < MUTATION_LOCK_DURATION) {
        console.log(`[Mock Cache Race Safety Check] Aborting memory override for "${tabName}" because of a concurrent mutation lock.`);
        return (memoryStore[tabName] || []) as T[];
      }

      memoryStore[tabName] = liveRows;
      lastFetchTime[tabName] = Date.now();
      return liveRows;
    } catch (err) {
      console.warn(`[Public Sheets Feed Error] Failed to read ${tabName} without auth, fallback to memoryStore:`, err);
    }
    return (memoryStore[tabName] || []) as T[];
  }
  try {
    return await withAutoInit(authHeader, async () => {
      const sheets = getSheetsClient(authHeader);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1:Z5000`, // Support up to 5000 rows
      });

      let rawRows = response.data.values;
      if (!rawRows || rawRows.length === 0 || rawRows[0].length === 0) {
        console.log(`[getSheetRows] Sheet ${tabName} is completely empty. Seeding headers and default rows...`);
        const headers = SHEET_SCHEMAS[tabName];
        const rowsToInsert = [headers];
        const seedData = memoryStore[tabName] || [];
        for (const item of seedData) {
          const row = headers.map(header => item[header] !== undefined ? String(item[header]) : '');
          rowsToInsert.push(row);
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${tabName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsToInsert,
          },
        });

        // Re-read
        const retryResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${tabName}!A1:Z5000`,
        });
        rawRows = retryResponse.data.values || rowsToInsert;
      }

      if (!rawRows || rawRows.length <= 1) {
        return [];
      }

      const headers = rawRows[0] as string[];
      const dataRows = rawRows.slice(1);
      const seenIds = new Set<string>();
      const expectedFields = SHEET_SCHEMAS[tabName] || [];
      const primaryKey = expectedFields[0];

      // Create a map of lowercased trimmed expected fields to their exact original name
      const expectedMap = new Map<string, string>();
      expectedFields.forEach(f => expectedMap.set(f.toLowerCase().trim(), f));

      // Find the index in `headers` for each expected field
      const fieldToIdx = mapExpectedHeadersToActualIndices(expectedFields, headers);

      const rawParsedObjects: any[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const obj: any = {};
        
        // Map expected fields using the resolved columnIndex
        expectedFields.forEach(field => {
          const idx = fieldToIdx[field];
          const val = (idx !== undefined && row[idx] !== undefined) ? row[idx] : '';
          obj[field] = String(val).trim();
        });

        // Keep any other remaining header columns that might not be in SHEET_SCHEMAS as-is
        headers.forEach((h, idx) => {
          const lowerH = String(h).toLowerCase().trim();
          if (!expectedMap.has(lowerH)) {
            const val = row[idx] !== undefined ? row[idx] : '';
            obj[h] = String(val).trim();
          }
        });

        // Normalize common column name variations across Google Sheets schemas
        if (obj.monto_inicial !== undefined && obj.presupuesto === undefined) {
          obj.presupuesto = obj.monto_inicial;
        } else if (obj.presupuesto !== undefined && obj.monto_inicial === undefined) {
          obj.monto_inicial = obj.presupuesto;
        }

        if (obj.saldo !== undefined && obj.saldo_actual === undefined) {
          obj.saldo_actual = obj.saldo;
        } else if (obj.saldo_actual !== undefined && obj.saldo === undefined) {
          obj.saldo = obj.saldo_actual;
        }

        // Live fallback schemas sanitization (ensuring empty spreadsheet entries do not get mapped as empty string/zero budget)
        if (tabName === 'Choferes') {
          if (!obj.presupuesto || obj.presupuesto === '') {
            obj.presupuesto = '10000';
          }
          if (!obj.saldo_actual || obj.saldo_actual === '') {
            obj.saldo_actual = obj.presupuesto;
          }
        } else if (tabName === 'Camiones') {
          if (!obj.saldo_presupuesto || obj.saldo_presupuesto === '') {
            obj.saldo_presupuesto = '10000';
          }
        }

        rawParsedObjects.push(obj);
      }

      // Apply the healing split-rows method if Gastos tab is fetched
      let processedObjects = rawParsedObjects;
      if (tabName === 'Gastos') {
        processedObjects = healGastosRows(rawParsedObjects);
      }

      const parsedRows: T[] = [];
      seenIds.clear();
      for (let i = processedObjects.length - 1; i >= 0; i--) {
        const obj = processedObjects[i];
        const idVal = String(obj[primaryKey] || '').trim();
        if (!idVal) {
          continue;
        }

        if (seenIds.has(idVal.toLowerCase())) {
          console.warn(`[Private Sheets Deduplicator] Already seen PK: "${idVal}" in tab: ${tabName}. Skipping older duplicate line.`);
          continue;
        }
        seenIds.add(idVal.toLowerCase());
        parsedRows.unshift(obj as T);
      }
      return parsedRows;
    });
  } catch (error) {
    console.warn(`[Sheets Fallback] getSheetRows failed for tab: "${tabName}". Falling back to memoryStore. Error:`, error);
    return (memoryStore[tabName] || []) as T[];
  }
}

/**
 * Appends a parsed JSON object as a row to a Google Sheets tab.
 * Generates a clean UUID if the ID column is empty.
 */
export async function appendSheetRow<T extends Record<string, any>>(
  authHeader: string,
  tabName: keyof typeof SHEET_SCHEMAS,
  body: T,
  idPlaceholderName: string
): Promise<T> {
  // Lock the read cache on this tab to bypass stale visualization CDN
  lastMutationTime[tabName] = Date.now();

  const enrichedBody = { ...body } as any;
  if (!enrichedBody[idPlaceholderName]) {
    enrichedBody[idPlaceholderName] = crypto.randomUUID();
  }

  // Register locally so that fetchPublicSheetRows cache resolves it instantly for the next few minutes
  if (!pendingLocalAppends[tabName]) {
    pendingLocalAppends[tabName] = [];
  }
  pendingLocalAppends[tabName].push({
    timestamp: Date.now(),
    record: enrichedBody
  });

  // Always keep memoryStore in sync first!
  if (!memoryStore[tabName]) {
    memoryStore[tabName] = [];
  }
  const index = memoryStore[tabName].findIndex(
    r => String(r[idPlaceholderName]) === String(enrichedBody[idPlaceholderName])
  );
  if (index === -1) {
    memoryStore[tabName].push(enrichedBody);
  } else {
    memoryStore[tabName][index] = enrichedBody;
  }

  if (isMockSession(authHeader)) {
    console.log(`[Mock Memory DB] Appending row to tabName: ${tabName}, trigger background sync...`);
    syncToAppsScriptWebapp(tabName, enrichedBody).catch(err => {
      console.warn(`[Background Push Error] Fails to sync append for ${tabName}:`, err);
    });
    return enrichedBody;
  }

  try {
    const headers = SHEET_SCHEMAS[tabName];
    const rowValues = headers.map((header) => {
      const value = enrichedBody[header];
      return value !== undefined ? String(value) : '';
    });

    await withAutoInit(authHeader, async () => {
      const sheets = getSheetsClient(authHeader);

      // Check if this ID already exists physically in sheet to prevent clones/repeats
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1:Z5000`,
      });
      const rawRows = response.data.values;
      if (rawRows && rawRows.length > 1) {
        const fileHeaders = rawRows[0] as string[];
        const idColIndex = fileHeaders.indexOf(idPlaceholderName);
        if (idColIndex !== -1) {
          const targetIdVal = String(enrichedBody[idPlaceholderName]).toLowerCase().trim();
          const existingRowIdx = rawRows.findIndex((row, idx) => idx > 0 && String(row[idColIndex] || '').toLowerCase().trim() === targetIdVal);
          if (existingRowIdx !== -1) {
            console.log(`[appendSheetRow Safety Check] ID "${enrichedBody[idPlaceholderName]}" already exists in sheet "${tabName}". Updating existing row instead of appending.`);
            await updateSheetRow(authHeader, tabName, idPlaceholderName, enrichedBody[idPlaceholderName], enrichedBody);
            return;
          }
        }
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A:A`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });
    });
  } catch (error) {
    console.warn(`[Sheets Fallback] Failed to append row live to sheet for ${tabName}, fell back to memoryStore. Error:`, error);
  }

  return enrichedBody;
}

/**
 * Updates a specific row in Google Sheets matching `idValue` on column `idColumnName`.
 */
export async function updateSheetRow<T extends Record<string, any>>(
  authHeader: string,
  tabName: keyof typeof SHEET_SCHEMAS,
  idColumnName: string,
  idValue: string,
  updatedFields: Partial<T>
): Promise<void> {
  // Lock the read cache on this tab to bypass stale visualization CDN
  lastMutationTime[tabName] = Date.now();

  // Register local modification override to evade 5min CDN cache returning stale data to clients
  if (!pendingLocalModifications[tabName]) {
    pendingLocalModifications[tabName] = {};
  }
  const idValueStr = String(idValue).trim();
  pendingLocalModifications[tabName][idValueStr] = {
    timestamp: Date.now(),
    fields: { ...(pendingLocalModifications[tabName][idValueStr]?.fields || {}), ...updatedFields }
  };

  // Always keep memoryStore in sync first!
  const rows = memoryStore[tabName] || [];
  const index = rows.findIndex(row => String(row[idColumnName]) === String(idValue));
  if (index !== -1) {
    rows[index] = { ...rows[index], ...updatedFields };
  } else {
    console.warn(`[Mock Sync] Row with ID ${idValue} not found in mock store for ${tabName}. Appending instead.`);
    const newRow = { [idColumnName]: idValue, ...updatedFields };
    rows.push(newRow);
  }

  if (isMockSession(authHeader)) {
    console.log(`[Mock Memory DB] Updating row on tabName: ${tabName}, ID: ${idValue}, trigger background sync...`);
    const finalRowObj = index !== -1 ? rows[index] : { [idColumnName]: idValue, ...updatedFields };
    syncToAppsScriptWebapp(tabName, { ...finalRowObj, _updateIdColumn: idColumnName, _updateIdValue: idValue }).catch(err => {
      console.warn(`[Background Push Error] Fails to sync update for ${tabName}:`, err);
    });
    return;
  }

  try {
    await withAutoInit(authHeader, async () => {
      const sheets = getSheetsClient(authHeader);
      const headers = SHEET_SCHEMAS[tabName];

      // Read whole sheet to locate row index
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1:Z5000`,
      });

      let rawRows = response.data.values;
      if (!rawRows || rawRows.length === 0 || rawRows[0].length === 0) {
        console.log(`[updateSheetRow] Sheet ${tabName} is completely empty. Seeding headers and default rows...`);
        const rowsToInsert = [headers];
        const seedData = memoryStore[tabName] || [];
        for (const item of seedData) {
          const row = headers.map(header => item[header] !== undefined ? String(item[header]) : '');
          rowsToInsert.push(row);
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${tabName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsToInsert,
          },
        });

        // Re-read
        const retryResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${tabName}!A1:Z5000`,
        });
        rawRows = retryResponse.data.values || rowsToInsert;
      }

      if (!rawRows || rawRows.length <= 1) {
        throw new Error(`Sheet ${tabName} has only headers or is empty. Cannot update row with ID ${idValue}.`);
      }

      const fileHeaders = rawRows[0] as string[];
      const idColIndex = fileHeaders.indexOf(idColumnName);
      if (idColIndex === -1) {
        throw new Error(`ID Column ${idColumnName} not found in sheet ${tabName}.`);
      }

      let rowToUpdateIndex = -1;
      for (let i = 1; i < rawRows.length; i++) {
        if (rawRows[i][idColIndex] === idValue) {
          rowToUpdateIndex = i;
          break;
        }
      }

      if (rowToUpdateIndex === -1) {
        throw new Error(`Row with ID ${idValue} not found in sheet ${tabName}.`);
      }

      // Create updated values list matching headers order
      const existingRow = rawRows[rowToUpdateIndex];
      const fieldsToUpdate = updatedFields as Record<string, any>;
      const updatedRowValues = headers.map((header, index) => {
        if (fieldsToUpdate[header] !== undefined) {
          return String(fieldsToUpdate[header]);
        }
        return existingRow[index] !== undefined ? String(existingRow[index]) : '';
      });

      // Calculate coordinates (Google Sheets rows are 1-indexed)
      const excelRowNumber = rowToUpdateIndex + 1;
      const range = `${tabName}!A${excelRowNumber}:Z${excelRowNumber}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRowValues],
        },
      });
    });
  } catch (error) {
    console.warn(`[Sheets Fallback] Failed to update row live in Google Sheets for ${tabName}, fell back to memoryStore. Error:`, error);
  }
}
