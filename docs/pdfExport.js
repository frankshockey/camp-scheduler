// PDF Export logic for Camp Scheduler
import { App } from './ui.js';

// PDF Export logic
export const PDFExport = {
  exportCamp: (camp, groups, activities, info) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${camp.name} Schedule`, 14, 18);
    doc.setFontSize(12);
    doc.text('Info:', 14, 28);
    doc.text(info || '', 14, 36, { maxWidth: 180 });
    let y = 46;
    groups.forEach(group => {
      doc.setFontSize(14);
      doc.text(group.name, 14, y);
      y += 8;
      doc.setFontSize(11);
      group.schedule.forEach(slot => {
        const activity = activities.find(a => a.id === slot.activityId) || { name: 'Unknown', color: '#eee' };
        doc.setFillColor(activity.color || '#eee');
        doc.rect(14, y - 5, 4, 4, 'F');
        // Determine text color based on background luminance
        const hex = (activity.color || '#eee').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Perceived luminance formula
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const textColor = luminance < 140 ? [255, 255, 255] : [0, 0, 0];
        doc.setTextColor(0, 0, 0); // Time column always black
        doc.text(`${slot.time} - `, 20, y, { baseline: 'top' });
        doc.setTextColor(...textColor); // Activity name color
        doc.text(activity.name, 20 + doc.getTextWidth(`${slot.time} - `), y, { baseline: 'top' });
        doc.setTextColor(0, 0, 0); // Reset to black for next row
        y += 7;
      });
      y += 4;
    });
    doc.save(`${camp.name}_schedule.pdf`);
  }
};
