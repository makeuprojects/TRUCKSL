import React, { useState } from 'react';
import { Search, Eye, FileDown, Navigation, Calendar, User, Package } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Viaje, Chofer, Ruta, Gasto } from '../types';

interface TripHistoryArchiveProps {
  viajes: Viaje[];
  choferes: Chofer[];
  rutas: Ruta[];
  gastos: Gasto[];
  onOpenDetails: (viaje: Viaje) => void;
}

export default function TripHistoryArchive({ viajes, choferes, rutas, gastos, onOpenDetails }: TripHistoryArchiveProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtermos los viajes que están Finalizados
  const finishedTrips = viajes.filter(v => v.estado_viaje === 'Finalizado');

  const filteredTrips = finishedTrips.filter(viaje => {
    const drv = choferes.find(c => c.id_chofer === viaje.id_chofer);
    const route = rutas.find(r => r.id_ruta === viaje.id_ruta);
    const searchLower = searchTerm.toLowerCase();

    const matchesDriver = drv?.nombre_completo.toLowerCase().includes(searchLower);
    const matchesRoute = route?.origen.toLowerCase().includes(searchLower) || route?.destino.toLowerCase().includes(searchLower);
    const matchesId = viaje.id_viaje.toLowerCase().includes(searchLower);

    return matchesDriver || matchesRoute || matchesId;
  });

  const getTripTotalExpenses = (tripId: string) => {
    return gastos
      .filter(g => g.id_viaje === tripId)
      .reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
  };

  const handleExportPDF = (viaje: Viaje, chofer?: Chofer, ruta?: Ruta) => {
    toast.info("Generando reporte contable en PDF...", { duration: 1500 });
    
    setTimeout(() => {
      try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tripExpenses = gastos.filter(g => g.id_viaje === viaje.id_viaje);
        const totalGastado = getTripTotalExpenses(viaje.id_viaje);

        // Título corporativo
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("LIQUIDACIÓN DE GASTOS", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text("FLOTAS DON SAÚL", 105, 27, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(14, 30, 196, 30); // Line divider
        
        // Metadatos
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("Datos del Viaje:", 14, 35);
        doc.setFont('helvetica', 'normal');
        
        doc.text(`ID de Viaje: ${viaje.id_viaje}`, 14, 42);
        doc.text(`Chofer: ${chofer?.nombre_completo || 'N/A'}`, 14, 49);
        doc.text(`Pesaje Total: ${(Number(viaje.toneladas_base) + Number(viaje.toneladas_extras)).toFixed(2)} t`, 14, 56);
        
        doc.text(`Origen: ${ruta?.origen || 'N/A'}`, 110, 42);
        doc.text(`Destino: ${ruta?.destino || 'N/A'}`, 110, 49);
        
        doc.text(`Fecha Inicio: ${viaje.fecha_inicio || 'N/A'}`, 110, 56);
        doc.text(`Fecha Fin: ${viaje.fecha_fin || 'N/A'}`, 110, 63);

        // Preparar datos para autoTable
        const tableData = tripExpenses.map(g => [
          new Date(g.fecha).toLocaleDateString() || '-',
          g.tipo_gasto || 'Otro',
          g.descripcion || '-',
          `${parseFloat(g.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
        ]);

        // Fila final de totales
        tableData.push([
          '',
          '',
          'TOTAL GASTADO:',
          `${totalGastado.toLocaleString('es-BO', { minimumFractionDigits: 2 })} BOB`
        ]);

        autoTable(doc, {
          startY: 65,
          head: [['Fecha', 'Categoría', 'Descripción', 'Monto (BOB)']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
          didParseCell: function (data) {
            // Check if it's the last row for "TOTAL GASTADO" style
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [16, 185, 129]; // Emerald 500
              if (data.column.index === 3) {
                data.cell.styles.halign = 'right';
              }
            } else if (data.column.index === 3) {
              data.cell.styles.halign = 'right';
            }
          }
        });

        doc.save(`Liquidacion_${viaje.id_viaje}.pdf`);
        toast.success("PDF Descargado", { duration: 3000 });
      } catch (error) {
        toast.error("Error al generar el PDF");
        console.error("PDF generation error:", error);
      }
    }, 1500);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 mt-6 shadow-xl animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            La Bóveda de Viajes
          </h2>
          <p className="text-sm text-slate-400">Historial y liquidaciones de ruteo completado</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar chofer, ruta, o ID..." 
            className="w-full bg-slate-950 border border-slate-800 text-slate-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
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
                <div key={`${viaje.id_viaje}-${idx}`} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition group">
                  <div className="grid grid-cols-4 gap-4 flex-1 items-center">
                    {/* Fecha y Estado */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-lg shrink-0 group-hover:bg-emerald-950/30 transition">
                        <Calendar className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-200">{viaje.fecha_fin || 'Sin Fecha'}</span>
                        <span className="text-[10px] text-emerald-500 font-mono">ID: {viaje.id_viaje}</span>
                      </div>
                    </div>
                    
                    {/* Chofer */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-300">{drv?.nombre_completo || 'Sin Chofer'}</span>
                    </div>

                    {/* Ruta */}
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs text-indigo-200">{route?.origen || '?'} ➔ {route?.destino || '?'}</span>
                    </div>

                    {/* Gastos Totales */}
                    <div className="flex flex-col items-end pr-8">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Gastado</span>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300 text-xs font-medium rounded-lg transition"
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
