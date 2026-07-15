import React, { useState } from 'react';
import { Search, Eye, FileDown, Navigation, Calendar, User, Package } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Viaje, Chofer, Ruta, Gasto, Camion } from '../types';

interface TripHistoryArchiveProps {
  viajes: Viaje[];
  choferes: Chofer[];
  rutas: Ruta[];
  gastos: Gasto[];
  camiones?: Camion[];
  onOpenDetails: (viaje: Viaje) => void;
}

export default function TripHistoryArchive({ viajes, choferes, rutas, gastos, camiones, onOpenDetails }: TripHistoryArchiveProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtermos los viajes que están Finalizados
  const finishedTrips = viajes.filter(v => v.estado_viaje === 'Finalizado');

  const filteredTrips = finishedTrips.filter(viaje => {
    const drv = choferes.find(c => c.id_chofer === viaje.id_chofer);
    const route = rutas.find(r => r.id_ruta === viaje.id_ruta);
    const searchLower = searchTerm.toLowerCase();

    const matchesDriver = drv?.nombre_completo ? String(drv.nombre_completo).toLowerCase().includes(searchLower) : false;
    const matchesRoute = (route?.origen ? String(route.origen).toLowerCase().includes(searchLower) : false) || 
                         (route?.destino ? String(route.destino).toLowerCase().includes(searchLower) : false);
    const matchesId = viaje.id_viaje ? String(viaje.id_viaje).toLowerCase().includes(searchLower) : false;

    return matchesDriver || matchesRoute || matchesId;
  });

  const safeParse = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const getTripTotalExpenses = (tripId: string) => {
    return gastos
      .filter(g => g.tipo_gasto !== 'Pago Chofer' && g.id_viaje && String(g.id_viaje).trim().toLowerCase() === String(tripId).trim().toLowerCase())
      .reduce((acc, g) => acc + safeParse(g.monto), 0);
  };

  const handleExportPDF = (viaje: Viaje, chofer?: Chofer, ruta?: Ruta) => {
    toast.info("Generando reporte contable en PDF...", { duration: 1500 });
    
    setTimeout(() => {
      try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tripExpenses = gastos.filter(g => g.tipo_gasto !== 'Pago Chofer' && g.id_viaje && String(g.id_viaje).trim().toLowerCase() === String(viaje.id_viaje).trim().toLowerCase());
        const totalGastado = getTripTotalExpenses(viaje.id_viaje);

        // Find assigned Camion
        const camion = camiones?.find(c => c.id_camion === viaje.id_camion);
        const camionStr = camion ? `${camion.modelo} (Placa: ${camion.placa || 'N/A'})` : viaje.id_camion || 'N/A';

        // Rates & Settlement calculations matching UI exactly
        const basePrice = Number(viaje.tarifa_pactada || ruta?.tarifa_base || 5000);
        const baseTons = Number(viaje.toneladas_base || 45) || 45;
        const extraTonsRaw = Number(viaje.toneladas_extras) || 0;
        const totalTons = baseTons + extraTonsRaw;
        const extraTons = baseTons < 45 ? Math.max(0, totalTons - 45) : extraTonsRaw;
        const extraRateValue = (basePrice / baseTons) * extraTons;
        const totalFlete = basePrice + extraRateValue;
        const netSettlement = totalFlete - totalGastado;

        // --- 1. HEADER BRAND BANNER ---
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(14, 12, 182, 26, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("FLOTAS DON SAÚL", 20, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text("Sistema Integral de Monitoreo de Gastos y Ruteo", 20, 28);
        doc.text("Reporte de Rendición de Cuentas y Conciliación", 20, 32);

        // Right side of Header Banner
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(245, 158, 11); // amber-500
        doc.text("LIQUIDACIÓN OFICIAL", 190, 21, { align: 'right' });
        
        doc.setFont('helvetica', 'mono');
        doc.setFontSize(8);
        doc.setTextColor(248, 250, 252);
        doc.text(`ID Viaje: ${viaje.id_viaje}`, 190, 27, { align: 'right' });
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-BO')}`, 190, 32, { align: 'right' });

        // --- 2. LOGISTICS DETAILS GATHERED ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text("1. DATOS DE LOGÍSTICA Y PERSONAL", 14, 46);
        
        // Horizontal line separation
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(14, 48, 196, 48);

        // Data keys & values
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139); // slate-500
        
        doc.text("CONDUCTOR / CHOFER:", 14, 54);
        doc.text("ID CHOFER / PIN:", 14, 60);
        doc.text("VEHÍCULO / CAMIÓN:", 14, 66);

        doc.text("RUTA REGISTRADA:", 110, 54);
        doc.text("FECHA SALIDA:", 110, 60);
        doc.text("FECHA LLEGADA:", 110, 66);

        // Values placement
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(chofer?.nombre_completo || 'N/A', 52, 54);
        doc.text(`${chofer?.id_chofer || 'N/A'} (PIN: ****)`, 52, 60);
        doc.text(camionStr, 52, 66);

        doc.text(ruta ? `${ruta.origen} ➔ ${ruta.destino}` : 'N/A', 145, 54);
        doc.text(viaje.fecha_inicio || 'N/A', 145, 60);
        doc.text(viaje.fecha_fin || 'N/A', 145, 66);

        // --- 3. CARGO DETAILS & WEIGHING ---
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("2. PESAJES DE CARGA REGISTRADOS", 14, 76);
        doc.line(14, 78, 196, 78);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text("TONELADAS BASE:", 14, 84);
        doc.text("TONELADAS EXTRAS:", 80, 84);
        doc.text("TONELAJE TOTAL DE CARGA:", 140, 84);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(`${Number(viaje.toneladas_base || 0).toFixed(2)} t`, 46, 84);
        doc.text(`${Number(viaje.toneladas_extras || 0).toFixed(2)} t`, 116, 84);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(3, 105, 161); // sky-700
        doc.text(`${(Number(viaje.toneladas_base || 0) + Number(viaje.toneladas_extras || 0)).toFixed(2)} t`, 185, 84, { align: 'right' });

        // --- 4. FINANCIAL SETTLEMENT SUMMARY TABLE ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text("3. CONCILIACIÓN DE TARIFA Y SALDO NETO (LIQUIDACIÓN)", 14, 94);
        doc.line(14, 96, 196, 96);

        const summaryData = [
          ["Flete Base de Ruta (Tarifa Acordada)", `${ruta?.origen || 'Origen'} a ${ruta?.destino || 'Destino'}`, `${basePrice.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`],
          ["Incentivo por Tonelaje Adicional (Extras)", `${extraTons.toFixed(2)} t extras transportadas`, `${extraRateValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`],
          ["INGRESO BRUTO DEL FLETE (Ingreso)", "Suma total de flete base + exceso", `${totalFlete.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`],
          ["(-) GASTOS EN RUTA RESPALDADOS", "Combustible, peajes, viáticos, repuestos", `-${totalGastado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`],
          ["SALDO LÍQUIDO A ENTREGAR (NETO)", "Monto neto final a liquidar al conductor", `${netSettlement.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`]
        ];

        autoTable(doc, {
          startY: 99,
          head: [['Concepto / Operación', 'Detalle y Base de Cálculo', 'Monto en Bs.']],
          body: summaryData,
          theme: 'striped',
          styles: { fontSize: 8.5, cellPadding: 2.2 },
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            2: { halign: 'right', fontStyle: 'bold' }
          },
          didParseCell: function (data) {
            // Net settlement highlight
            if (data.row.index === summaryData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 253, 244]; // Soft emerald
              data.cell.styles.textColor = [21, 128, 61]; // Dark emerald text
            }
            // Gross flete row highlight
            if (data.row.index === 2) {
              data.cell.styles.fontStyle = 'bold';
            }
            // Expenses negative row highlight
            if (data.row.index === 3) {
              data.cell.styles.textColor = [220, 38, 38]; // Red
            }
          }
        });

        // --- 5. EXPENSES DETAIL LIST TABLE ---
        const nextY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("4. HISTORIAL DETALLADO DE COMPROBANTES DE GASTO", 14, nextY);
        doc.line(14, nextY + 2, 196, nextY + 2);

        const tableData = tripExpenses.map(g => [
          new Date(g.fecha).toLocaleDateString('es-BO') || '-',
          g.tipo_gasto || 'Otro',
          g.descripcion || '-',
          g.foto_url ? 'Sí (Digitalizado)' : 'No (S/C)',
          `${safeParse(g.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
        ]);

        tableData.push([
          '',
          '',
          'TOTAL DE EGRESOS EN TRÁNSITO:',
          '',
          `${totalGastado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} Bs.`
        ]);

        autoTable(doc, {
          startY: nextY + 5,
          head: [['Fecha', 'Categoría de Gasto', 'Descripción / Notas', 'Foto Comprobante', 'Monto (Bs.)']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2.8 },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            4: { halign: 'right' }
          },
          didParseCell: function (data) {
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [225, 29, 72]; // Soft rose red for total expenses
              data.cell.styles.fillColor = [255, 241, 242]; // Light red bg
              if (data.column.index === 4) {
                data.cell.styles.halign = 'right';
              }
            } else if (data.column.index === 4) {
              data.cell.styles.halign = 'right';
            }
          }
        });

        // --- 6. SIGNATURES & OFFICIAL SEAL STAMP ---
        let currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 180;
        if (currentY > 230) {
          doc.addPage();
          currentY = 30;
        }

        currentY += 20;

        // Subtle signature line dividers
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);

        // Driver Signature
        doc.line(25, currentY, 85, currentY);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("FIRMA DEL CONDUCTOR", 55, currentY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(chofer?.nombre_completo || 'N/A', 55, currentY + 9, { align: 'center' });
        doc.text(`C.I.: _________________`, 55, currentY + 13, { align: 'center' });

        // Saul / Administration Signature
        doc.line(125, currentY, 185, currentY);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text("AUTORIZADO Y CONCILIADO", 155, currentY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Don Saúl - Flotas Don Saúl", 155, currentY + 9, { align: 'center' });
        doc.text("Firma y Sello Administrativo", 155, currentY + 13, { align: 'center' });

        // Small audit log footer
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("Este reporte constituye un registro contable oficial emitido por el sistema Flotas Don Saúl. Los saldos conciliados han sido respaldados por comprobantes digitales cargados al servidor.", 105, 282, { align: 'center' });

        doc.save(`Liquidacion_${viaje.id_viaje}.pdf`);
        toast.success("PDF Descargado", { duration: 3000 });
      } catch (error) {
        toast.error("Error al generar el PDF");
        console.error("PDF generation error:", error);
      }
    }, 1500);
  };

  const handleExportExcel = () => {
    if (filteredTrips.length === 0) {
      toast.error("No hay viajes para exportar");
      return;
    }
    toast.info("Generando reporte Excel...", { duration: 1500 });
    
    setTimeout(() => {
      try {
        // 1. Column Headers
        const headers = [
          "ID Viaje",
          "Fecha Fin",
          "Chofer",
          "Origen",
          "Destino",
          "Toneladas Base",
          "Toneladas Extras",
          "Tarifa Base (Bs.)",
          "Tarifa Extra (Bs.)",
          "Gastos Totales (Bs.)",
          "Estado"
        ];

        // 2. Map trips data
        const rows = filteredTrips.map(viaje => {
          const drv = choferes.find(c => c.id_chofer === viaje.id_chofer);
          const route = rutas.find(r => r.id_ruta === viaje.id_ruta);
          const totalGastado = getTripTotalExpenses(viaje.id_viaje);
          const basePrice = Number(viaje.tarifa_pactada || route?.tarifa_base || 5000);
          const baseTons = Number(viaje.toneladas_base || 45) || 45;
          const extraTonsRaw = Number(viaje.toneladas_extras) || 0;
          const totalTons = baseTons + extraTonsRaw;
          const extraTons = baseTons < 45 ? Math.max(0, totalTons - 45) : extraTonsRaw;
          const extraRateValue = (basePrice / baseTons) * extraTons;
          
          return [
            viaje.id_viaje || "",
            viaje.fecha_fin || viaje.fecha_inicio || "Sin Fecha",
            drv?.nombre_completo || "Sin Chofer",
            route?.origen || "",
            route?.destino || "",
            viaje.toneladas_base || 0,
            extraTons || 0,
            basePrice,
            extraRateValue.toFixed(2),
            totalGastado.toFixed(2),
            viaje.estado_viaje || ""
          ];
        });

        // 3. Build CSV Content with semi-colon separator (highly recommended for Spanish locales & Excel auto-detection)
        // and escape values containing semi-colons or newlines
        const csvContent = [
          headers.join(";"),
          ...rows.map(row => row.map(val => {
            const strVal = String(val).replace(/"/g, '""');
            return strVal.includes(";") || strVal.includes("\n") || strVal.includes(",") ? `"${strVal}"` : strVal;
          }).join(";"))
        ].join("\n");

        // 4. Create blob with UTF-8 BOM so Excel decodes accented letters correctly
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Boveda_Viajes_FlotasDonSaul_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Excel (CSV) exportado con éxito");
      } catch (error) {
        toast.error("Error al exportar a Excel");
        console.error(error);
      }
    }, 1200);
  };

  return (
    <div className="bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 mt-6 shadow-xl animate-fade-in transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            La Bóveda de Viajes
          </h2>
          <p className="text-sm text-slate-200">Historial y liquidaciones de ruteo completado</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            Descargar Todo en Excel
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar chofer, ruta, o ID..." 
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-800 rounded-xl">
          <p className="text-sm">No se encontraron viajes finalizados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px] flex flex-col gap-3">
            {filteredTrips.map((viaje, idx) => {
              const drv = choferes.find(c => c.id_chofer === viaje.id_chofer);
              const route = rutas.find(r => r.id_ruta === viaje.id_ruta);
              const totalGastado = getTripTotalExpenses(viaje.id_viaje);
              
              return (
                <div key={`${viaje.id_viaje}-${idx}`} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between hover:border-emerald-500/40 transition group">
                  <div className="grid grid-cols-4 gap-4 flex-1 items-center">
                    {/* Fecha y Estado */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-lg shrink-0 group-hover:bg-emerald-950/30 transition">
                        <Calendar className="w-4 h-4 text-slate-300 group-hover:text-emerald-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-200">{viaje.fecha_fin || 'Sin Fecha'}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">ID: {viaje.id_viaje}</span>
                      </div>
                    </div>
                    
                    {/* Chofer */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">{drv?.nombre_completo || 'Sin Chofer'}</span>
                    </div>

                    {/* Ruta */}
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs text-indigo-200">{route?.origen || '?'} ➔ {route?.destino || '?'}</span>
                    </div>

                    {/* Gastos Totales */}
                    <div className="flex flex-col items-end pr-8">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Gastado</span>
                      <span className="font-mono text-sm text-emerald-400 font-bold tracking-tight">Bs. {totalGastado.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 border-l border-slate-800 pl-4 shrink-0">
                    <button 
                      onClick={() => onOpenDetails(viaje)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                      title="Ver Detalles del Viaje"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleExportPDF(viaje, drv, route)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-800 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
