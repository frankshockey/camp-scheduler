// UI rendering and event handlers for Camp Scheduler
import { ActivityPalette } from './activityPalette.js';
import { InfoBox } from './infoBox.js';
import { PDFExport } from './pdfExport.js';
import { Firestore } from './firestore.js';

export const App = {
    groupContainer: document.getElementById('group-box'),
    addGroupButton: document.getElementById('add-group-button'),
    addGlobalActivityButton: document.getElementById('add-global-activity-button'),
    infoBox: document.getElementById('info-box'),
    exportCampButton: document.getElementById('export-camp-button'),
    campDropdown: document.getElementById('camp-dropdown'),
    saveScheduleButton: document.getElementById('save-schedule-button'),
    loadScheduleButton: document.getElementById('load-schedule-button'),
    addCampButton: document.getElementById('add-camp-button'),
    currentCampHeading: document.getElementById('current-camp'),
    editCampButton: document.getElementById('edit-camp-button'),
    camps: [],
    campGroups: {},
    campInfo: {},
    availableActivities: [],
    selectedCellInfo: null
};

// Example: UI initialization (to be expanded)
export const initUI = () => {
    // Remove duplicate 'Add Group' buttons if they exist
    const allAddGroupButtons = document.querySelectorAll('#add-group-button');
    if (allAddGroupButtons.length > 1) {
        for (let i = 1; i < allAddGroupButtons.length; i++) {
            allAddGroupButtons[i].parentElement.removeChild(allAddGroupButtons[i]);
        }
    }
    // No campSelector logic needed
    console.log('UI initialized.');
};

export const updateCampInterface = () => {
    const { currentCampHeading, editCampButton, camps, campGroups } = App;
    if (camps.length === 0) {
        currentCampHeading.textContent = 'Camp Scheduler';
        editCampButton.style.display = 'none';
    } else if (camps.length === 1) {
        const campName = camps[0];
        currentCampHeading.textContent = `Current Camp: ${campName}`;
        editCampButton.style.display = 'inline-block';
        editCampButton.textContent = 'Edit Camp';
        editCampButton.onclick = () => {
            const currentCamp = camps[0];
            if (!currentCamp) return;
            const Swal = window.Swal || window.swal || window.SweetAlert2;
            if (!Swal) {
                alert('SweetAlert2 is not loaded.');
                return;
            }
            Swal.fire({
                title: 'Edit Camp Name',
                input: 'text',
                inputValue: currentCamp,
                showCancelButton: true,
                confirmButtonText: 'Save',
                inputValidator: (value) => {
                    if (!value.trim()) return 'Camp name cannot be empty';
                    if (camps.includes(value.trim()) && value.trim() !== currentCamp) return 'Camp name already exists';
                    return null;
                }
            }).then(result => {
                if (result.isConfirmed && result.value && result.value.trim() !== currentCamp) {
                    const newName = result.value.trim();
                    // Update camp name in App.camps
                    const idx = camps.indexOf(currentCamp);
                    if (idx !== -1) camps[idx] = newName;
                    // Update campGroups and campInfo keys
                    if (App.campGroups[currentCamp]) {
                        App.campGroups[newName] = App.campGroups[currentCamp];
                        delete App.campGroups[currentCamp];
                    }
                    if (App.campInfo[currentCamp]) {
                        App.campInfo[newName] = App.campInfo[currentCamp];
                        delete App.campInfo[currentCamp];
                    }
                    updateCampInterface();
                    loadGroupsForCamp(newName);
                }
            });
        };
    } else {
        // If you want to show the current camp in the heading, do so here
        // Otherwise, just show the default
        currentCampHeading.textContent = 'Camp Scheduler';
        editCampButton.style.display = 'inline-block';
    }

    // Remove the campDropdown (info selector) element from the DOM if it exists
    const campDropdownElem = document.getElementById('camp-dropdown');
    if (campDropdownElem) {
        campDropdownElem.parentElement && campDropdownElem.parentElement.removeChild(campDropdownElem);
    }

    // Synchronize info box with selected camp (preserve HTML formatting)
    if (App.infoBox) {
        const currentCamp = (camps.length === 1) ? camps[0] : campSelector.value;
        if (currentCamp && App.campInfo[currentCamp]) {
            App.infoBox.innerHTML = App.campInfo[currentCamp];
        } else {
            App.infoBox.innerHTML = '';
        }
        // Save info box changes to the correct camp (preserve HTML)
        App.infoBox.oninput = () => {
            const camp = (camps.length === 1) ? camps[0] : campSelector.value;
            if (camp) App.campInfo[camp] = App.infoBox.innerHTML;
        };
    }
}

// Utility to clear all UI and data (for manual reload behavior)
export const clearScheduleUI = () => {
  App.camps.length = 0;
  Object.keys(App.campGroups).forEach(k => delete App.campGroups[k]);
  Object.keys(App.campInfo).forEach(k => delete App.campInfo[k]);
  App.availableActivities.length = 0;
  if (App.groupContainer) App.groupContainer.innerHTML = '';
  if (App.infoBox) App.infoBox.innerHTML = '';
  if (App.campDropdown) App.campDropdown.innerHTML = '';
  if (App.campSelector) App.campSelector.innerHTML = '';
  if (App.campDisplaySpan) App.campDisplaySpan.textContent = 'No camps available';
  if (App.currentCampHeading) App.currentCampHeading.textContent = 'Camp Scheduler';
  if (App.editCampButton) App.editCampButton.style.display = 'none';
  // Optionally clear activity palette
  const palette = document.getElementById('activity-palette');
  if (palette) palette.innerHTML = '';
};
