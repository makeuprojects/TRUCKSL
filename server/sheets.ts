import { google } from 'googleapis';
import crypto from 'crypto';

export const SPREADSHEET_ID = '1ZNuFluKQi3lFP5qF-eQtfvDCcIDotu4v8jV89GwRgsQ';

// Memory storage holding data in-case Google OAuth has not yet been linked/init
export const memoryStore: Record<string, any[]> = {
  Camiones: [
    { id_camion: 'CAM-01', modelo: 'Volvo FMX 440', anio: '2021', kilometraje_actual: '124000', saldo_presupuesto: '15000', estado: 'Activo' },
    { id_camion: 'CAM-02', modelo: 'Scania R500', anio: '2022', kilometraje_actual: '98500', saldo_presupuesto: '18000', estado: 'Activo' },
    { id_camion: 'CAM-03', modelo: 'Mercedes-Benz Actros', anio: '2020', kilometraje_actual: '185000', saldo_presupuesto: '8000', estado: 'Mantenimiento' }
  ],
  Choferes: [
    { id_chofer: 'CH-01', nombre_completo: 'Juan Carlos Perez', telefono: '71234567', pin_acceso: '1234', estado: 'Activo', presupuesto: '10000', saldo_actual: '9470' },
    { id_chofer: 'CH-02', nombre_completo: 'Mario Gomez', telefono: '78912345', pin_acceso: '4321', estado: 'Activo', presupuesto: '10005', saldo_actual: '10005' },
    { id_chofer: 'CH-03', nombre_completo: 'Don Saúl', telefono: '77742345', pin_acceso: '1111', estado: 'Activo', presupuesto: '15000', saldo_actual: '15000' },
    { id_chofer: 'CH-04', nombre_completo: 'Mauricio', telefono: '76543210', pin_acceso: '1234', estado: 'Activo', presupuesto: '10000', saldo_actual: '10000' }
  ],
  Rutas: [
    { id_ruta: 'RUT-01', origen: 'La Paz', destino: 'Santa Cruz', tarifa_base: '3200', estado: 'Disponible' },
    { id_ruta: 'RUT-02', origen: 'Oruro', destino: 'Cochabamba', tarifa_base: '1500', estado: 'Disponible' },
    { id_ruta: 'RUT-03', origen: 'Potosí', destino: 'Tarija', tarifa_base: '2800', estado: 'Disponible' }
  ],
  Viajes: [
    { id_viaje: 'VIA-101', id_camion: 'CAM-01', id_chofer: 'CH-01', id_ruta: 'RUT-01', fecha_inicio: '2026-06-15', fecha_fin: '2026-06-16', estado_viaje: 'Finalizado', toneladas_base: '45', toneladas_extras: '5', foto_pesaje_url: '' },
    { id_viaje: 'VIA-102', id_camion: 'CAM-02', id_chofer: 'CH-02', id_ruta: 'RUT-02', fecha_inicio: '2026-06-16', fecha_fin: '', estado_viaje: 'En Ciclo', toneladas_base: '45', toneladas_extras: '0', foto_pesaje_url: '' }
  ],
  Gastos: [
    { id_gasto: 'GAS-01', id_viaje: 'VIA-101', id_camion: 'CAM-01', id_chofer: 'CH-01', tipo_gasto: 'Combustible', monto: '450', fecha: '2026-06-15', descripcion: 'Recarga diésel estación central', foto_url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg' },
    { id_gasto: 'GAS-02', id_viaje: 'VIA-101', id_camion: 'CAM-01', id_chofer: 'CH-01', tipo_gasto: 'Peajes', monto: '80', fecha: '2026-06-15', descripcion: 'Tranca autopista LP-SC', foto_url: '' }
  ],
  Control_Repuestos: [],
  Control_Llantas: [
    { id_llanta: 'LLAN-01', id_camion: 'CAM-01', posicion: 'Delantera Izquierda', km_instalacion: '110000', km_actual: '124000', estado: 'Bueno' }
  ],
  Historial_Aceite: [
    { id_cambio: 'ACE-01', id_camion: 'CAM-01', km_cambio: '120000', proximo_cambio_km: '130000' }
  ]
};

export function isMockSession(authHeader: string): boolean {
  return !authHeader || 
         authHeader.includes('mock-local-session-placeholder') || 
         authHeader.includes('local-auth-fetcher') ||
         authHeader.includes('local-auth-handshake');
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
 * Reads any tab from Google Sheets and parses the rows into JSON objects.
 */
export async function getSheetRows<T extends Record<string, any>>(
  authHeader: string,
  tabName: keyof typeof SHEET_SCHEMAS
): Promise<T[]> {
  if (isMockSession(authHeader)) {
    console.log(`[Mock Memory DB] Getting rows for tabName: ${tabName}`);
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

      return dataRows.map((row) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          const val = row[index] !== undefined ? row[index] : '';
          obj[header] = val;
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

        return obj as T;
      });
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
  const enrichedBody = { ...body } as any;
  if (!enrichedBody[idPlaceholderName]) {
    enrichedBody[idPlaceholderName] = crypto.randomUUID();
  }

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
    console.log(`[Mock Memory DB] Appending row to tabName: ${tabName}`);
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
    console.log(`[Mock Memory DB] Updating row on tabName: ${tabName}, ID: ${idValue}`);
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
