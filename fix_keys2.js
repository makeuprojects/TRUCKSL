import fs from 'fs';
import path from 'path';

function applyIndices(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // DashboardBentoGrid.tsx
  content = content.replace(/al\.map\(\(al\) => \{/g, 'al.map((al, index) => {');
  content = content.replace(/key=\{al\.id_camion\}/g, 'key={`${al.id_camion}-${index}`}');

  content = content.replace(/camiones\.map\(\(camion\) => \(/g, 'camiones.map((camion, index) => (');
  content = content.replace(/camiones\.map\(\(c\) => \(/g, 'camiones.map((c, index) => (');
  content = content.replace(/key=\{camion\.id_camion\}/g, 'key={`${camion.id_camion}-${index}`}');
  content = content.replace(/key=\{c\.id_camion\}/g, 'key={`${c.id_camion}-${index}`}');

  content = content.replace(/choferes\.map\(\(driver\) => \{/g, 'choferes.map((driver, index) => {');
  content = content.replace(/key=\{driver\.id_chofer\}/g, 'key={`${driver.id_chofer}-${index}`}');

  content = content.replace(/repuestos\.map\(\(rep\) => \{/g, 'repuestos.map((rep, index) => {');
  content = content.replace(/key=\{rep\.id_repuesto_historial\}/g, 'key={`${rep.id_repuesto_historial}-${index}`}');

  content = content.replace(/viajes\.map\(\(viaje\) => \{/g, 'viajes.map((viaje, index) => {');
  content = content.replace(/key=\{viaje\.id_viaje\}/g, 'key={`${viaje.id_viaje}-${index}`}');

  content = content.replace(/driverExpenses\.map\(\(expense\) => \(/g, 'driverExpenses.map((expense, index) => (');
  content = content.replace(/key=\{expense\.id_gasto\}/g, 'key={`${expense.id_gasto}-${index}`}');

  content = content.replace(/rutas\.map\(ruta => \(/g, 'rutas.map((ruta, index) => (');
  content = content.replace(/camiones\.map\(truck => \(/g, 'camiones.map((truck, index) => (');
  content = content.replace(/repuestos\.map\(row => \(/g, 'repuestos.map((row, index) => (');

  content = content.replace(/key=\{ruta\.id_ruta\}/g, 'key={`${ruta.id_ruta}-${index}`}');
  content = content.replace(/key=\{truck\.id_camion\}/g, 'key={`${truck.id_camion}-${index}`}');
  content = content.replace(/key=\{row\.id_repuesto_historial\}/g, 'key={`${row.id_repuesto_historial}-${index}`}');
  
  content = content.replace(/driverExpenses\.map\(\(gasto\) => \{/g, 'driverExpenses.map((gasto, index) => {');
  content = content.replace(/key=\{gasto\.id_gasto\}/g, 'key={`${gasto.id_gasto}-${index}`}');

  // Admin Tower
  content = content.replace(/activeViajes\.map\(\(viaje\) => \{/g, 'activeViajes.map((viaje, index) => {');
  content = content.replace(/repuestos\.map\(\(row\) => \(/g, 'repuestos.map((row, index) => (');
  content = content.replace(/choferes\.map\(\(driver\) => \{/g, 'choferes.map((driver, index) => {');
  content = content.replace(/camiones\.map\(\(truck\) => \(/g, 'camiones.map((truck, index) => (');
  
  fs.writeFileSync(filePath, content);
}

try {
  applyIndices('src/components/DashboardBentoGrid.tsx');
  applyIndices('src/components/DashboardAdministrador.tsx');
  applyIndices('src/components/DashboardAdminTower.tsx');
  applyIndices('src/components/ChoferProfileCard.tsx');
  console.log('Fixed keys');
} catch (e) {
  console.error(e);
}
