console.log('Camp Scheduler initialized.');

const groupContainer = document.getElementById('group-box');
const addGroupButton = document.getElementById('add-group-button');
const addGlobalActivityButton = document.getElementById('add-global-activity-button');
const infoBox = document.getElementById('info-box');
const exportCampButton = document.getElementById('export-camp-button');
const campDropdown = document.getElementById('camp-dropdown');
const saveScheduleButton = document.getElementById('save-schedule-button');
const loadScheduleButton = document.getElementById('load-schedule-button');

const camps = [];
const campGroups = {};
const campInfo = {};
const availableActivities = [];

const addCampButton = document.getElementById('add-camp-button');
const currentCampHeading = document.getElementById('current-camp');
const campSelector = document.getElementById('camp-selector');
const campDisplaySpan = document.querySelector('#camp-display > span');
const editCampButton = document.getElementById('edit-camp-button');

defineFixedActivityPalette();

// Utility: isColorDark
function isColorDark(hsl) {
    // Parse hsl string: hsl(h, s%, l%)
    const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!match) return false;
    const l = parseInt(match[3]);
    return l < 60;
}

// Utility: getActivityColor
function getActivityColor(activityName) {
    const found = availableActivities.find(a => a.name === activityName);
    return found ? found.color : fixedActivityPalette[0];
}

function defineFixedActivityPalette() {
    if (typeof window.fixedActivityPalette === 'undefined') {
        window.fixedActivityPalette = [
            'hsl(0, 70%, 60%)',    // Red
            'hsl(30, 70%, 60%)',   // Orange
            'hsl(60, 70%, 60%)',   // Yellow
            'hsl(120, 70%, 60%)',  // Green
            'hsl(200, 70%, 60%)',  // Blue
            'hsl(270, 70%, 60%)',  // Purple
            'hsl(330, 70%, 60%)',  // Pink
            'hsl(180, 70%, 60%)',  // Teal
            'hsl(90, 70%, 60%)',   // Lime
            'hsl(210, 70%, 60%)',  // Sky Blue
        ];
    }
}

addCampButton.addEventListener('click', () => {
    showModalInput('Enter Camp Name:', (campName) => {
        if (camps.includes(campName)) {
            showAlert(`A camp with the name "${campName}" already exists.`);
            return;
        }
        camps.push(campName);
        campGroups[campName] = [];
        campInfo[campName] = `Information for ${campName}. Click to edit.`;
        updateCampInterface();
        campSelector.value = campName;
        loadGroupsForCamp(campName);
    });
});

if (addGlobalActivityButton) {
    addGlobalActivityButton.addEventListener('click', () => {
        showModalInputWithColor('Enter name for new available activity:', (activityName, selectedColor) => {
            const trimmedName = activityName.trim();
            if (availableActivities.some(a => a.name === trimmedName)) {
                showAlert(`Activity "${trimmedName}" is already in the available list.`);
                return;
            }
            availableActivities.push({ name: trimmedName, color: selectedColor });
            renderActivityPalette();
        });
    });
}

// Custom modal with color palette for adding activities
function showModalInputWithColor(title, callback) {
    const paletteHtml = fixedActivityPalette.map(color =>
        `<div class="color-swatch" data-color="${color}" style="background:${color};display:inline-block;width:28px;height:28px;margin:3px;border-radius:50%;border:2px solid #fff;cursor:pointer;"></div>`
    ).join('');
    Swal.fire({
        title: title,
        html:
            '<input id="swal-activity-name" class="swal2-input" placeholder="Activity Name">' +
            '<div style="margin-top:10px;margin-bottom:5px;font-size:13px;text-align:left;">Pick a color:</div>' +
            `<div id="swal-color-palette">${paletteHtml}</div>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            const name = document.getElementById('swal-activity-name').value.trim();
            const selected = document.querySelector('.color-swatch.selected');
            if (!name) {
                Swal.showValidationMessage('Please enter an activity name.');
                return false;
            }
            if (!selected) {
                Swal.showValidationMessage('Please select a color.');
                return false;
            }
            return [name, selected.getAttribute('data-color')];
        },
        didOpen: () => {
            const swatches = document.querySelectorAll('.color-swatch');
            swatches.forEach(swatch => {
                swatch.addEventListener('click', function() {
                    swatches.forEach(s => s.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            callback(result.value[0], result.value[1]);
        }
    });
}

// --- Selection state for click-to-assign workflow ---
let selectedCellInfo = null; // { groupIndex, activityIndex, cellElement }

// Helper to clear any selected cell highlight
function clearSelectedCell() {
    if (selectedCellInfo && selectedCellInfo.cellElement) {
        selectedCellInfo.cellElement.classList.remove('selected-activity-cell');
    }
    selectedCellInfo = null;
}

// Patch renderActivityPalette to support click-to-assign to selected cell
function renderActivityPalette() {
    const palette = document.getElementById('activity-palette');
    palette.innerHTML = '';
    availableActivities.forEach(activity => {
        const badge = document.createElement('div');
        badge.className = 'activity-palette-item';
        badge.textContent = activity.name;
        badge.style.background = activity.color;
        badge.style.color = isColorDark(activity.color) ? '#fff' : '#222';
        badge.setAttribute('draggable', 'true');
        // Drag logic
        badge.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', activity.name);
        });
        // Click-to-assign for accessibility
        badge.addEventListener('click', () => {
            const campName = campSelector.value;
            if (!campName || !campGroups[campName] || campGroups[campName].length === 0) {
                showAlert('Please add a group to assign activities.');
                return;
            }
            // If a cell is selected, assign to that cell
            if (selectedCellInfo) {
                const { groupIndex, activityIndex } = selectedCellInfo;
                if (campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities[activityIndex]) {
                    campGroups[campName][groupIndex].activities[activityIndex].name = activity.name;
                }
                clearSelectedCell();
                loadGroupsForCamp(campName);
                return;
            }
            // Fallback: assign to first empty row in any group
            let assigned = false;
            for (let g = 0; g < campGroups[campName].length; g++) {
                const group = campGroups[campName][g];
                if (!group.activities) group.activities = [];
                let slot = group.activities.findIndex(a => !a.name);
                if (slot !== -1) {
                    group.activities[slot].name = activity.name;
                    assigned = true;
                    break;
                }
            }
            // If no empty slot, add to the first group
            if (!assigned) {
                campGroups[campName][0].activities.push({ name: activity.name, time: '09:00' });
            }
            loadGroupsForCamp(campName);
        });
        palette.appendChild(badge);
    });
}

// Patch addActivityToTable to allow selecting empty cells
function addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex) {
    const row = tableBody.insertRow();

    const cellTime = row.insertCell();
    const timeSelector = createCustomTimeSelector(activity.time);
    timeSelector.addEventListener('change', (e) => {
        if (campGroups[campName] && campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities[activityIndex]) {
            campGroups[campName][groupIndex].activities[activityIndex].time = e.target.value;
        }
    });
    cellTime.appendChild(timeSelector);

    const cellActivity = row.insertCell();
    cellActivity.textContent = activity.name || '';
    if (activity.name) {
        const bg = getActivityColor(activity.name);
        cellActivity.style.background = bg;
        cellActivity.style.color = isColorDark(bg) ? '#fff' : '#222';
        cellActivity.style.cursor = '';
        cellActivity.onclick = null;
    } else {
        cellActivity.style.background = '';
        cellActivity.style.color = '';
        // Allow click-to-select for empty cells
        cellActivity.style.cursor = 'pointer';
        cellActivity.onclick = (e) => {
            // Deselect previous
            clearSelectedCell();
            // Select this cell
            cellActivity.classList.add('selected-activity-cell');
            selectedCellInfo = { groupIndex, activityIndex, cellElement: cellActivity };
            // Optionally, scroll palette into view for accessibility
            document.getElementById('activity-palette').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
    // Always make droppable
    makeActivityCellsDroppable();

    // Add delete icon
    const deleteActivityIcon = document.createElement('i');
    deleteActivityIcon.className = 'fas fa-times action-icon';
    deleteActivityIcon.title = 'Delete Activity';
    deleteActivityIcon.style.color = '#d9534f';
    deleteActivityIcon.style.cursor = 'pointer';
    deleteActivityIcon.style.marginLeft = '10px';
    deleteActivityIcon.addEventListener('click', () => {
        campGroups[campName][groupIndex].activities.splice(activityIndex, 1);
        loadGroupsForCamp(campName);
    });
    cellActivity.appendChild(deleteActivityIcon);

    setTimeout(() => enableActivityRowReordering(tableBody, campName, groupIndex), 0);
}

// Deselect cell if clicking outside activity cells or palette
window.addEventListener('mousedown', (e) => {
    const palette = document.getElementById('activity-palette');
    if (
        selectedCellInfo &&
        !e.target.classList.contains('activity-palette-item') &&
        !e.target.classList.contains('selected-activity-cell') &&
        !palette.contains(e.target)
    ) {
        clearSelectedCell();
    }
});

// Add CSS for selected cell highlight
(function addSelectedCellStyle() {
    const style = document.createElement('style');
    style.innerHTML = `.selected-activity-cell { outline: 3px solid #007bff !important; box-shadow: 0 0 0 2px #b3d7ff; }`;
    document.head.appendChild(style);
})();

function syncActivityCellsToDataModel() {
    const selectedCamp = campSelector.value;
    const groupList = campGroups[selectedCamp];
    if (!groupList) return;
    document.querySelectorAll('.group-table').forEach((table, groupIdx) => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, activityIdx) => {
            const cell = row.cells[1];
            if (cell && groupList[groupIdx] && groupList[groupIdx].activities[activityIdx]) {
                // Remove delete icon if present
                const name = cell.textContent.replace(/\s*\u00D7\s*$/, '').trim();
                groupList[groupIdx].activities[activityIdx].name = name;
            }
        });
    });
}

if (exportCampButton) {
    exportCampButton.addEventListener('click', () => {
        // Sync UI to data model before exporting
        syncActivityCellsToDataModel();

        const selectedCampName = campSelector.value;

        if (!selectedCampName) {
            alert('Please select a camp to export.');
            return;
        }

        // Check for jsPDF main library constructor
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
            alert('jsPDF library is not loaded correctly. Please check CDN links and internet connection.');
            console.error('jsPDF constructor (window.jspdf.jsPDF) not found. window.jspdf object:', window.jspdf);
            return;
        }
        const { jsPDF } = window.jspdf; // Now we know window.jspdf.jsPDF is a function

        // Initialize a temporary jsPDF instance to check for autoTable plugin
        const docForCheck = new jsPDF();
        if (typeof docForCheck.autoTable !== 'function') {
            alert('jspdf-autotable plugin is not loaded correctly. Please check CDN links and internet connection.');
            console.error('doc.autoTable method not found on jsPDF instance. Instance for check:', docForCheck, 'window.jspdf:', window.jspdf);
            return;
        }

        // Proceed with actual PDF generation
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'letter'
        });

        const campDataForExport = campInfo[selectedCampName] || "No information available for this camp.";
        const allGroupsForCamp = campGroups[selectedCampName] || [];
        const groupsToExport = allGroupsForCamp.slice(0, 4); // Limit to a maximum of 4 groups

        let currentY = 30; // Starting Y position, slightly smaller margin
        const pageMargin = 30;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (2 * pageMargin);

        // Camp Title
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text(`Camp Schedule: ${selectedCampName}`, pageWidth / 2, currentY + 10, { align: 'center' });
        currentY += 40;

        // Add the camp information section FIRST
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Camp Information:', pageMargin, currentY);
        currentY += 18;
        currentY = checkPageOverflow(doc, currentY, pageHeight, pageMargin); // Check for overflow

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const infoLinesForPdf = doc.splitTextToSize(campDataForExport, contentWidth);
        doc.text(infoLinesForPdf, pageMargin, currentY);
        currentY += (infoLinesForPdf.length * 10) + 50; // Add extra padding after info section
        currentY = checkPageOverflow(doc, currentY, pageHeight, pageMargin); // Check for overflow

        // Groups and Activities
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Groups & Activities:', pageMargin, currentY);
        currentY += 20;

        const numActualColumns = groupsToExport.length > 0 ? groupsToExport.length : 1; // 1 to 4 columns
        const columnGap = (numActualColumns > 2) ? 10 : 15; // Smaller gap for more columns
        const columnWidth = (contentWidth - ((numActualColumns - 1) * columnGap)) / numActualColumns;

        let groupRowYStart = currentY;
        let columnXPositions = [];
        for (let i = 0; i < numActualColumns; i++) {
            columnXPositions.push(pageMargin + i * (columnWidth + columnGap));
        }

        let maxTableEndYInRow = groupRowYStart;

        for (let i = 0; i < groupsToExport.length; i++) {
            const group = groupsToExport[i];
            const currentX = columnXPositions[i];
            let currentGroupY = groupRowYStart;
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            const groupNameLines = doc.splitTextToSize(`Group: ${group.name}`, columnWidth - 10);
            doc.text(groupNameLines, currentX, currentGroupY);
            currentGroupY += groupNameLines.length * 14 + 5;
            if (group.activities && group.activities.length > 0) {
                const activitiesForTable = group.activities;
                const tableBody = activitiesForTable.map(act => [act.time, act.name || 'N/A']);
                doc.autoTable({
                    startY: currentGroupY,
                    head: [['Time', 'Activity']],
                    body: tableBody,
                    theme: 'grid', // Restore grid lines for better readability
                    margin: { left: currentX },
                    tableWidth: 'wrap',
                    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                    headStyles: { fillColor: [255, 255, 255], textColor: [0,0,0] }, // White header, black text
                    didDrawCell: function (data) {
                        // Color only the activity cells (column 1, not header)
                        if (data.section === 'body' && data.column.index === 1) {
                            const activityName = data.cell.raw;
                            // Only color if activityName is non-empty, not 'N/A', and not just whitespace
                            if (activityName && activityName.trim() && activityName !== 'N/A') {
                                const hsl = getActivityColor(activityName.trim());
                                const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
                                if (match) {
                                    const h = parseInt(match[1]);
                                    const s = parseInt(match[2]) / 100;
                                    const l = parseInt(match[3]) / 100;
                                    function hslToRgb(h, s, l) {
                                        let r, g, b;
                                        if (s === 0) {
                                            r = g = b = l;
                                        } else {
                                            const hue2rgb = function (p, q, t) {
                                                if (t < 0) t += 1;
                                                if (t > 1) t -= 1;
                                                if (t < 1 / 6) return p + (q - p) * 6 * t;
                                                if (t < 1 / 2) return q;
                                                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                                                return p;
                                            };
                                            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                                            const p = 2 * l - q;
                                            r = hue2rgb(p, q, h / 360 + 1 / 3);
                                            g = hue2rgb(p, q, h / 360);
                                            b = hue2rgb(p, q, h / 360 - 1 / 3);
                                        }
                                        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
                                    }
                                    const [r, g, b] = hslToRgb(h, s, l);
                                    data.cell.styles.fillColor = [r, g, b];
                                }
                            }
                        }
                    },
                    didDrawTable: function(data) {
                        if (data.table.finalY > maxTableEndYInRow) {
                            maxTableEndYInRow = data.table.finalY;
                        }
                    }
                });
            } else {
                doc.setFontSize(10);
                doc.setFont(undefined, 'italic');
                doc.text('No activities scheduled for this group.', currentX + 5, currentGroupY + 10);
                const noActivityTextHeight = 10;
                if (currentGroupY + noActivityTextHeight > maxTableEndYInRow) {
                    maxTableEndYInRow = currentGroupY + noActivityTextHeight;
                }
            }
        }

        currentY = (groupsToExport.length > 0 ? maxTableEndYInRow : groupRowYStart) + 20; // Space before potential note
        currentY = checkPageOverflow(doc, currentY, pageHeight, pageMargin);

        if (allGroupsForCamp.length > 4) {
            let noteY = currentY + 20;
            noteY = checkPageOverflow(doc, noteY, pageHeight, pageMargin);
            doc.setFontSize(8);
            doc.setFont(undefined, 'italic');
            doc.text(`Note: This camp has ${allGroupsForCamp.length} groups. Only the first 4 are displayed on this page.`, pageMargin, noteY);
        }

        doc.save(`Camp_Schedule_${selectedCampName.replace(/\s+/g, '_')}.pdf`);
    });
}


function updateCampInterface() {
    const previouslySelectedCamp = campSelector.value;
    campSelector.innerHTML = '';

    if (!campDisplaySpan) {
        console.error('The span element within #camp-display was not found.');
    }

    if (camps.length === 0) {
        if (campDisplaySpan) {
            campDisplaySpan.textContent = 'No camps available';
            campDisplaySpan.style.display = 'inline';
        }
        campSelector.style.display = 'none';
        currentCampHeading.textContent = 'Camp Scheduler';
        editCampButton.style.display = 'none';
    } else if (camps.length === 1) {
        const campName = camps[0];
        const option = document.createElement('option');
        option.value = campName;
        option.textContent = campName;
        campSelector.appendChild(option);
        campSelector.value = campName;

        if (campDisplaySpan) {
            campDisplaySpan.textContent = campName;
            campDisplaySpan.style.display = 'inline';
        }
        campSelector.style.display = 'none';
        currentCampHeading.textContent = `Current Camp: ${campName}`;
        editCampButton.style.display = 'inline-block';
        editCampButton.textContent = 'Edit Camp';
        editCampButton.onclick = () => editCampName(campName);
    } else {
        camps.forEach((camp) => {
            const option = document.createElement('option');
            option.value = camp;
            option.textContent = camp;
            campSelector.appendChild(option);
        });

        if (camps.includes(previouslySelectedCamp)) {
            campSelector.value = previouslySelectedCamp;
        } else {
            campSelector.value = camps[camps.length - 1];
        }

        if (campDisplaySpan) campDisplaySpan.style.display = 'none';
        campSelector.style.display = 'inline-block';
        currentCampHeading.textContent = `Current Camp: ${campSelector.value}`;
        editCampButton.style.display = 'inline-block';
        editCampButton.textContent = 'Edit Camp';
        editCampButton.onclick = () => editCampName(campSelector.value);
    }
    console.log('Camp Selector Options:', campSelector.innerHTML);

    if (campDropdown) {
        const previouslySelectedInfoCamp = campDropdown.value;
        campDropdown.innerHTML = '';

        const selectPromptOption = document.createElement('option');
        selectPromptOption.value = "";
        selectPromptOption.textContent = camps.length === 0 ? "No camps available" : "Select a camp for info";
        campDropdown.appendChild(selectPromptOption);

        camps.forEach((camp) => {
            const option = document.createElement('option');
            option.value = camp;
            option.textContent = camp;
            campDropdown.appendChild(option);
        });

        if (camps.includes(previouslySelectedInfoCamp)) {
            campDropdown.value = previouslySelectedInfoCamp;
        } else if (camps.length === 1) {
             campDropdown.value = camps[0];
        }
    }
}

// --- Camp Info Box Synchronization ---
function updateInfoBoxForSelectedCamp() {
    if (!campDropdown || !infoBox) return;
    const selectedCamp = campDropdown.value;
    if (!selectedCamp || !campInfo[selectedCamp]) {
        infoBox.innerText = 'Click here to add information about the selected camp.';
    } else {
        infoBox.innerText = campInfo[selectedCamp];
    }
}

if (campDropdown && infoBox) {
    campDropdown.addEventListener('change', () => {
        updateInfoBoxForSelectedCamp();
    });
    // Save edits to campInfo on blur or input
    infoBox.addEventListener('blur', () => {
        const selectedCamp = campDropdown.value;
        if (selectedCamp) {
            campInfo[selectedCamp] = infoBox.innerText.trim();
        }
    });
    infoBox.addEventListener('input', () => {
        const selectedCamp = campDropdown.value;
        if (selectedCamp) {
            campInfo[selectedCamp] = infoBox.innerText.trim();
        }
    });
}

// Call after updating camp interface or loading schedule
function syncInfoBoxAfterUIUpdate() {
    setTimeout(updateInfoBoxForSelectedCamp, 0);
}

// Patch updateCampInterface and restoreSchedule to sync info box
const originalUpdateCampInterface = updateCampInterface;
updateCampInterface = function() {
    originalUpdateCampInterface.apply(this, arguments);
    syncInfoBoxAfterUIUpdate();
};

const originalRestoreSchedule = restoreSchedule;
restoreSchedule = function(data) {
    originalRestoreSchedule.apply(this, arguments);
    syncInfoBoxAfterUIUpdate();
};

campSelector.addEventListener('change', () => {
    const selectedCamp = campSelector.value;
    currentCampHeading.textContent = `Current Camp: ${selectedCamp}`;
    loadGroupsForCamp(selectedCamp);
});

function loadGroupsForCamp(campName) {
    if (!groupContainer) {
        console.error('Group container #group-box not found.');
        return;
    }
    groupContainer.innerHTML = '';

    if (!campName || !campGroups[campName]) {
        groupContainer.textContent = campName ? 'No groups for this camp yet. Click "Add Group".' : 'Select a camp to see groups.';
        renderActivityPalette();
        return;
    }
    const groups = campGroups[campName];
    if (groups.length === 0) {
        groupContainer.textContent = 'No groups for this camp yet. Click "Add Group".';
    }
    groups.forEach((group, index) => {
        createGroupBox(group.name, index, campName);
    });
    // Render the activity palette after loading groups
    renderActivityPalette();
    // Save activity names from table cells to group data
    const groupList = campGroups[campName];
    if (groupList) {
        document.querySelectorAll('.group-table').forEach((table, groupIdx) => {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row, activityIdx) => {
                const cell = row.cells[1];
                if (cell) {
                    const name = cell.textContent.replace(/\s*\u00D7\s*$/, '').trim(); // Remove delete icon if present
                    if (groupList[groupIdx] && groupList[groupIdx].activities[activityIdx]) {
                        groupList[groupIdx].activities[activityIdx].name = name;
                    }
                }
            });
        });
    }
}

// Make activity cells droppable for drag-and-drop assignment
function makeActivityCellsDroppable() {
    document.querySelectorAll('.group-table tbody td:nth-child(2)').forEach(cell => {
        cell.ondragover = (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
        };
        cell.ondragleave = () => {
            cell.classList.remove('drag-over');
        };
        cell.ondrop = (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            const activityName = e.dataTransfer.getData('text/plain');
            if (!activityName) return;
            // Find the group and row index
            const row = cell.parentElement;
            const table = row.closest('table');
            const groupBox = table.closest('.group');
            const campName = campSelector.value;
            const groupIndex = Array.from(document.querySelectorAll('.group')).indexOf(groupBox);
            const activityIndex = Array.from(row.parentElement.children).indexOf(row);
            if (campGroups[campName] && campGroups[campName][groupIndex]) {
                campGroups[campName][groupIndex].activities[activityIndex].name = activityName;
            }
            loadGroupsForCamp(campName);
        };
    });
}

// Patch addActivityToTable to always call makeActivityCellsDroppable after rendering
function addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex) {
    const row = tableBody.insertRow();

    const cellTime = row.insertCell();
    const timeSelector = createCustomTimeSelector(activity.time);
    timeSelector.addEventListener('change', (e) => {
        if (campGroups[campName] && campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities[activityIndex]) {
            campGroups[campName][groupIndex].activities[activityIndex].time = e.target.value;
        }
    });
    cellTime.appendChild(timeSelector);

    const cellActivity = row.insertCell();
    cellActivity.textContent = activity.name || '';
    if (activity.name) {
        const bg = getActivityColor(activity.name);
        cellActivity.style.background = bg;
        cellActivity.style.color = isColorDark(bg) ? '#fff' : '#222';
    } else {
        cellActivity.style.background = '';
        cellActivity.style.color = '';
        // Allow click-to-select for empty cells
        cellActivity.style.cursor = 'pointer';
        cellActivity.onclick = (e) => {
            // Deselect previous
            clearSelectedCell();
            // Select this cell
            cellActivity.classList.add('selected-activity-cell');
            selectedCellInfo = { groupIndex, activityIndex, cellElement: cellActivity };
            // Optionally, scroll palette into view for accessibility
            document.getElementById('activity-palette').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
    // Always make droppable
    makeActivityCellsDroppable();

    // Add delete icon
    const deleteActivityIcon = document.createElement('i');
    deleteActivityIcon.className = 'fas fa-times action-icon';
    deleteActivityIcon.title = 'Delete Activity';
    deleteActivityIcon.style.color = '#d9534f';
    deleteActivityIcon.style.cursor = 'pointer';
    deleteActivityIcon.style.marginLeft = '10px';
    deleteActivityIcon.addEventListener('click', () => {
        campGroups[campName][groupIndex].activities.splice(activityIndex, 1);
        loadGroupsForCamp(campName);
    });
    cellActivity.appendChild(deleteActivityIcon);

    setTimeout(() => enableActivityRowReordering(tableBody, campName, groupIndex), 0);
}

// Implement loadActivitiesForGroup
function loadActivitiesForGroup(tableBody, groupName, groupIndex, campName) {
    const group = campGroups[campName][groupIndex];
    if (!group || !group.activities) return;
    tableBody.innerHTML = '';
    group.activities.forEach((activity, activityIndex) => {
        addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex);
    });
}

// Example: Animate group addition
function createGroupBox(groupName, groupIndex, campName) {
    // Create group box element
    const groupBox = document.createElement('div');
    groupBox.className = 'group';
    groupBox.draggable = true;
    groupBox.id = `group-${normalizeId(groupName)}-${groupIndex}`;

    // Group header
    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
        <span class="group-title">${groupName}</span>
        <button class="edit-group-button" title="Edit Group Name">
            <i class="fas fa-edit"></i>
        </button>
        <button class="delete-group-button" title="Delete Group">
            <i class="fas fa-trash"></i>
        </button>
        <button class="add-row-button" title="Add Activity Row">
            <i class="fas fa-plus"></i>
        </button>
    `;
    groupBox.appendChild(header);

    // Group table for activities
    const table = document.createElement('table');
    table.className = 'group-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width:60px;">Time</th>
                <th>Activity</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    groupBox.appendChild(table);

    // Add event listeners for edit, delete, and add-row buttons
    header.querySelector('.edit-group-button').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentName = groupBox.querySelector('.group-title').textContent;
        showModalInput('Edit Group Name:', (newName) => {
            if (newName && newName !== currentName) {
                // Update group name in data model
                const campName = campSelector.value;
                const groupIndex = Array.from(document.querySelectorAll('.group')).indexOf(groupBox);
                if (campGroups[campName] && campGroups[campName][groupIndex]) {
                    campGroups[campName][groupIndex].name = newName;
                }
                updateGroupBox(groupBox, newName);
            }
        });
    });

    header.querySelector('.delete-group-button').addEventListener('click', (e) => {
        e.stopPropagation();
        const campName = campSelector.value;
        const groupIndex = Array.from(document.querySelectorAll('.group')).indexOf(groupBox);
        if (campGroups[campName] && campGroups[campName][groupIndex]) {
            campGroups[campName].splice(groupIndex, 1);
        }
        groupBox.remove();
        // Optionally, reload groups to refresh indices
        loadGroupsForCamp(campName);
    });

    header.querySelector('.add-row-button').addEventListener('click', (e) => {
        e.stopPropagation();
        const group = campGroups[campName][groupIndex];
        if (!group.activities) group.activities = [];
        group.activities.push({ time: '09:00', name: '' });
        loadGroupsForCamp(campName);
    });

    // Append to container
    groupContainer.appendChild(groupBox);

    // Load activities for this group
    loadActivitiesForGroup(table.querySelector('tbody'), groupName, groupIndex, campName);
}

// Implement updateGroupBox
function updateGroupBox(groupBox, newName) {
    const titleSpan = groupBox.querySelector('.group-title');
    if (titleSpan) {
        titleSpan.textContent = newName;
    }
}

function normalizeId(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function showModalInput(title, callback) {
    Swal.fire({
        title: title,
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Submit',
    }).then((result) => {
        if (result.isConfirmed && result.value.trim() !== '') {
            callback(result.value.trim());
        }
    });
}

function showAlert(message) {
    Swal.fire({
        icon: 'info',
        title: 'Info',
        text: message,
    });
}

addGroupButton.addEventListener('click', () => {
    const selectedCamp = campSelector.value;
    if (!selectedCamp) {
        showAlert('Please select a camp first before adding a group.');
        return;
    }
    showModalInput('Enter Group Name:', (groupName) => {
        if (!campGroups[selectedCamp]) {
            campGroups[selectedCamp] = [];
        }
        if (campGroups[selectedCamp].some(group => group.name === groupName)) {
            showAlert(`A group named "${groupName}" already exists in camp "${selectedCamp}".`);
            return;
        }
        campGroups[selectedCamp].push({ name: groupName, activities: [] });
        loadGroupsForCamp(selectedCamp);
    });
});

// Add drag-and-drop functionality for groups and activities
groupContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('group')) {
        e.dataTransfer.setData('text/plain', e.target.id);
    }
});

groupContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
});

groupContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedElement = document.getElementById(draggedId);
    const dropTarget = e.target.closest('.group');
    if (draggedElement && dropTarget && draggedElement !== dropTarget) {
        groupContainer.insertBefore(draggedElement, dropTarget.nextSibling);
    }
});

// Enable drag-to-reorder for activity rows within a group table
function enableActivityRowReordering(tableBody, campName, groupIndex) {
    let dragSrcRow = null;
    tableBody.querySelectorAll('tr').forEach((row, idx) => {
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', function (e) {
            dragSrcRow = row;
            row.classList.add('dragging-row');
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', function () {
            row.classList.remove('dragging-row');
            dragSrcRow = null;
        });
        row.addEventListener('dragover', function (e) {
            e.preventDefault();
            if (row !== dragSrcRow) row.classList.add('drag-over-row');
        });
        row.addEventListener('dragleave', function () {
            row.classList.remove('drag-over-row');
        });
        row.addEventListener('drop', function (e) {
            e.preventDefault();
            row.classList.remove('drag-over-row');
            if (dragSrcRow && dragSrcRow !== row) {
                // Find indices
                const rows = Array.from(tableBody.querySelectorAll('tr'));
                const fromIdx = rows.indexOf(dragSrcRow);
                const toIdx = rows.indexOf(row);
                // Update data model
                const group = campGroups[campName][groupIndex];
                if (group && group.activities) {
                    const [moved] = group.activities.splice(fromIdx, 1);
                    group.activities.splice(toIdx, 0, moved);
                }
                // Re-render table
                while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
                group.activities.forEach((activity, activityIndex) => {
                    addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex);
                });
            }
        });
    });
}

// Patch addActivityToTable to call enableActivityRowReordering after adding a row
function addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex) {
    const row = tableBody.insertRow();

    const cellTime = row.insertCell();
    const timeSelector = createCustomTimeSelector(activity.time);
    timeSelector.addEventListener('change', (e) => {
        if (campGroups[campName] && campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities[activityIndex]) {
            campGroups[campName][groupIndex].activities[activityIndex].time = e.target.value;
        }
    });
    cellTime.appendChild(timeSelector);

    const cellActivity = row.insertCell();
    cellActivity.textContent = activity.name || '';
    if (activity.name) {
        const bg = getActivityColor(activity.name);
        cellActivity.style.background = bg;
        cellActivity.style.color = isColorDark(bg) ? '#fff' : '#222';
    } else {
        cellActivity.style.background = '';
        cellActivity.style.color = '';
        // Allow click-to-select for empty cells
        cellActivity.style.cursor = 'pointer';
        cellActivity.onclick = (e) => {
            // Deselect previous
            clearSelectedCell();
            // Select this cell
            cellActivity.classList.add('selected-activity-cell');
            selectedCellInfo = { groupIndex, activityIndex, cellElement: cellActivity };
            // Optionally, scroll palette into view for accessibility
            document.getElementById('activity-palette').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
    }
    // Always make droppable
    makeActivityCellsDroppable();

    // Add delete icon
    const deleteActivityIcon = document.createElement('i');
    deleteActivityIcon.className = 'fas fa-times action-icon';
    deleteActivityIcon.title = 'Delete Activity';
    deleteActivityIcon.style.color = '#d9534f';
    deleteActivityIcon.style.cursor = 'pointer';
    deleteActivityIcon.style.marginLeft = '10px';
    deleteActivityIcon.addEventListener('click', () => {
        campGroups[campName][groupIndex].activities.splice(activityIndex, 1);
        loadGroupsForCamp(campName);
    });
    cellActivity.appendChild(deleteActivityIcon);

    setTimeout(() => enableActivityRowReordering(tableBody, campName, groupIndex), 0);
}

// Add or update activity details
function showActivityDetailsModal(activity, onSave) {
    Swal.fire({
        title: activity.name ? `Details for: ${activity.name}` : 'Activity Details',
        html:
            `<label for="swal-activity-location" style="float:left;font-size:13px;margin-top:8px;">Location</label>` +
            `<input id="swal-activity-location" class="swal2-input" placeholder="Location" value="${activity.location || ''}">` +
            `<label for="swal-activity-instructor" style="float:left;font-size:13px;margin-top:8px;">Instructor</label>` +
            `<input id="swal-activity-instructor" class="swal2-input" placeholder="Instructor" value="${activity.instructor || ''}">` +
            `<label for="swal-activity-description" style="float:left;font-size:13px;margin-top:8px;">Description</label>` +
            `<textarea id="swal-activity-description" class="swal2-textarea" placeholder="Description">${activity.description || ''}</textarea>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return {
                location: document.getElementById('swal-activity-location').value.trim(),
                instructor: document.getElementById('swal-activity-instructor').value.trim(),
                description: document.getElementById('swal-activity-description').value.trim(),
            };
        }
    }).then((result) => {
        if (result.isConfirmed && onSave) {
            onSave(result.value);
        }
    });
}

function createCustomTimeSelector(selectedTimeValue) {
    const selectElement = document.createElement('select');
    selectElement.classList.add('time-dropdown');

    const startHour = 7;
    const endHour = 21;
    const incrementMinutes = 10;

    for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m += incrementMinutes) {
            if (h === endHour && m > 0) break;

            const hourString = String(h).padStart(2, '0');
            const minuteString = String(m).padStart(2, '0');
            const timeValue = `${hourString}:${minuteString}`;

            const option = document.createElement('option');
            option.value = timeValue;
            option.textContent = timeValue;

            if (timeValue === selectedTimeValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        }
    }
    return selectElement;
}

console.log('End of script.js');

function checkPageOverflow(doc, currentY, pageHeight, pageMargin) {
    // Check if the current Y position exceeds the page height minus the margin
    if (currentY > pageHeight - pageMargin) {
        doc.addPage(); // Add a new page
        return pageMargin; // Reset Y position to the top margin of the new page
    }
    return currentY; // Return the current Y position if no overflow
}

function editCampName(oldCampName) {
    showModalInput(`Edit Camp Name (Current: ${oldCampName}):`, (newCampName) => {
        const trimmedNewName = newCampName.trim();

        if (!trimmedNewName || trimmedNewName === oldCampName) {
            showAlert('No changes made to the camp name.');
            return;
        }

        if (camps.includes(trimmedNewName)) {
            showAlert(`A camp with the name "${trimmedNewName}" already exists.`);
            return;
        }

        // Update camp name in all relevant data structures
        const campIndex = camps.indexOf(oldCampName);
        if (campIndex !== -1) {
            camps[campIndex] = trimmedNewName;
        }

        if (campGroups[oldCampName]) {
            campGroups[trimmedNewName] = campGroups[oldCampName];
            delete campGroups[oldCampName];
        }

        if (campInfo[oldCampName]) {
            campInfo[trimmedNewName] = campInfo[oldCampName];
            delete campInfo[oldCampName];
        }

        // Refresh the UI to reflect the updated camp name
        updateCampInterface();
        if (campSelector.value === oldCampName) {
            campSelector.value = trimmedNewName;
        }
        if (campDropdown.value === oldCampName) {
            campDropdown.value = trimmedNewName;
        }
        loadGroupsForCamp(trimmedNewName);

        showAlert(`Camp name updated to "${trimmedNewName}" successfully.`);
    });
}

// Wrap the camp dropdown and edit button in a container for better layout
if (campDropdown) {
    const campControlsContainer = document.getElementById('camp-controls');

    // Move the Edit Camp button beside the current camp heading
    const currentCampContainer = currentCampHeading.parentElement;
    let editButton = document.getElementById('edit-camp-button');

    campDropdown.addEventListener('change', () => {
        const selectedCamp = campDropdown.value;

        if (selectedCamp) {
            if (editButton) {
                editButton.style.display = 'inline-block';
                editButton.textContent = 'Edit Camp';
                editButton.onclick = () => editCampName(selectedCamp);
                currentCampContainer.appendChild(editButton); // Place beside current camp heading
            }
        } else if (editButton) {
            editButton.style.display = 'none';
        }
    });
}

// Save schedule to localStorage and offer JSON download
if (saveScheduleButton) {
    saveScheduleButton.addEventListener('click', () => {
        const data = {
            camps,
            campGroups,
            campInfo,
            availableActivities
        };
        // Save to localStorage
        localStorage.setItem('campSchedulerData', JSON.stringify(data));
        // Offer download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'camp-schedule-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('Schedule saved to local storage and downloaded as JSON.');
    });
}

// Load schedule from localStorage or JSON file
if (loadScheduleButton) {
    loadScheduleButton.addEventListener('click', () => {
        Swal.fire({
            title: 'Load Schedule',
            html: '<button id="load-from-local" class="swal2-confirm swal2-styled" style="margin:5px;">From Local Storage</button>' +
                  '<input type="file" id="load-from-file" accept="application/json" style="margin:5px;">',
            showCancelButton: true,
            showConfirmButton: false,
            didOpen: () => {
                document.getElementById('load-from-local').onclick = () => {
                    const data = localStorage.getItem('campSchedulerData');
                    if (data) {
                        try {
                            restoreSchedule(JSON.parse(data));
                            Swal.close();
                            showAlert('Schedule loaded from local storage.');
                        } catch (e) {
                            showAlert('Failed to load schedule from local storage.');
                        }
                    } else {
                        showAlert('No saved schedule found in local storage.');
                    }
                };
                document.getElementById('load-from-file').onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        try {
                            const data = JSON.parse(evt.target.result);
                            restoreSchedule(data);
                            Swal.close();
                            showAlert('Schedule loaded from file.');
                        } catch (err) {
                            showAlert('Invalid JSON file.');
                        }
                    };
                    reader.readAsText(file);
                };
            }
        });
    });
}

function restoreSchedule(data) {
    if (!data) return;
    // Defensive: Only assign if structure matches
    if (Array.isArray(data.camps)) camps.length = 0, camps.push(...data.camps);
    if (typeof data.campGroups === 'object') {
        Object.keys(campGroups).forEach(k => delete campGroups[k]);
        Object.assign(campGroups, data.campGroups);
    }
    if (typeof data.campInfo === 'object') {
        Object.keys(campInfo).forEach(k => delete campInfo[k]);
        Object.assign(campInfo, data.campInfo);
    }
    if (Array.isArray(data.availableActivities)) {
        availableActivities.length = 0;
        availableActivities.push(...data.availableActivities);
    }
    updateCampInterface();
    if (camps.length > 0) {
        campSelector.value = camps[0];
        loadGroupsForCamp(camps[0]);
    } else {
        loadGroupsForCamp(null);
    }
    renderActivityPalette();
}
