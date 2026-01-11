
import { TribunalEvent } from "../types.ts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// Fix: Updated events type to (TribunalEvent & { unit: string })[] to resolve missing 'unit' property error on line 18.
export const exportToPDF = (events: (TribunalEvent & { unit: string })[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Calendario de Actividades del Tribunal", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);

  const tableData = events.map(event => [
    event.title,
    event.unit,
    event.startTime.toLocaleString(),
    event.type.toUpperCase(),
    event.status.toUpperCase()
  ]);

  // Use any cast to call autoTable if the library's types are not correctly augmenting the jsPDF instance
  (doc as any).autoTable({
    startY: 35,
    head: [['Título', 'Unidad', 'Fecha/Hora', 'Tipo', 'Estado']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`Calendario_Tribunal_${new Date().getTime()}.pdf`);
};

// Fix: Updated events type to (TribunalEvent & { unit: string })[] to resolve missing 'unit' property error on line 39.
export const exportToExcel = (events: (TribunalEvent & { unit: string })[]) => {
  const data = events.map(event => ({
    Título: event.title,
    Unidad: event.unit,
    Inicio: event.startTime.toISOString(),
    Fin: event.endTime.toISOString(),
    Tipo: event.type,
    Estado: event.status,
    Descripción: event.description
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Eventos");
  
  XLSX.writeFile(workbook, `Agenda_Tribunal_${new Date().getTime()}.xlsx`);
};
