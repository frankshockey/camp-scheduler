// Main entry point for Camp Scheduler modular app
import { App, initUI } from './ui.js';
import { ActivityPalette } from './activityPalette.js';
import { InfoBox } from './infoBox.js';
import { PDFExport } from './pdfExport.js';
import { Firestore } from './firestore.js';

window.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    initUI();
    window.fixedActivityPalette = [
        '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997',
        '#343a40', '#f8f9fa', '#e83e8c', '#6610f2', '#6c757d', '#ff5722', '#00bcd4', '#8bc34a'
    ];
    // Add manual reload schedule button for user
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Reload Schedule';
    reloadBtn.style = 'margin-left:12px;padding:8px 12px;font-size:14px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;vertical-align:middle;';
    reloadBtn.addEventListener('click', () => {
        import('./ui.js').then(mod => mod.clearScheduleUI());
    });
    document.getElementById('menu').appendChild(reloadBtn);
    console.log('Camp Scheduler modular main.js loaded.');
});
