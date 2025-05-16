console.log('Camp Scheduler initialized.');

const groupContainer = document.getElementById('group-box');
const addGroupButton = document.getElementById('add-group-button');
const addGlobalActivityButton = document.getElementById('add-global-activity-button');
const infoBox = document.getElementById('info-box');
const exportCampButton = document.getElementById('export-camp-button');
const campDropdown = document.getElementById('camp-dropdown');

const camps = [];
const campGroups = {};
const campInfo = {};
const availableActivities = [];

const addCampButton = document.getElementById('add-camp-button');
const currentCampHeading = document.getElementById('current-camp');
const campSelector = document.getElementById('camp-selector');
const campDisplaySpan = document.querySelector('#camp-display > span');

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

        // Ensure the Edit Camp button is updated immediately after adding a camp
        let editButton = document.getElementById('edit-camp-button');
        if (!editButton) {
            editButton = document.createElement('button');
            editButton.id = 'edit-camp-button';
            editButton.textContent = 'Edit Camp';
            editButton.addEventListener('click', () => editCampName(campName));
            currentCampHeading.insertAdjacentElement('afterend', editButton); // Place beside current camp heading
        } else {
            editButton.onclick = () => editCampName(campName);
        }
    });
});

if (addGlobalActivityButton) {
    addGlobalActivityButton.addEventListener('click', () => {
        showModalInput('Enter name for new available activity:', (activityName) => {
            const trimmedName = activityName.trim();
            if (availableActivities.includes(trimmedName)) {
                showAlert(`Activity "${trimmedName}" is already in the available list.`);
                return;
            }
            availableActivities.push(trimmedName);
            console.log('Available Activities:', availableActivities);
        });
    });
}

if (exportCampButton) {
    exportCampButton.addEventListener('click', () => {
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

            doc.setFontSize(14); // Increase font size for better visibility
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
                    theme: 'striped',
                    margin: { left: currentX },
                    tableWidth: 'wrap',
                    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' }, // Adjusted font size and padding
                    headStyles: { fillColor: [22, 160, 133], fontSize: 12 },
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
        return;
    }
    const groups = campGroups[campName];
    if (groups.length === 0) {
        groupContainer.textContent = 'No groups for this camp yet. Click "Add Group".';
    }
    groups.forEach((group, index) => {
        createGroupBox(group.name, index, campName);
    });
}

function createActivitySelector(selectedActivityName) {
    const selectElement = document.createElement('select');
    selectElement.classList.add('activity-dropdown');

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Select Activity";
    selectElement.appendChild(defaultOption);

    availableActivities.forEach(activityName => {
        const option = document.createElement('option');
        option.value = activityName;
        option.textContent = activityName;
        if (activityName === selectedActivityName) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
    return selectElement;
}

if (campDropdown && infoBox) {
    campDropdown.addEventListener('change', () => {
        const selectedCamp = campDropdown.value;
        if (selectedCamp && campInfo[selectedCamp]) {
            infoBox.textContent = campInfo[selectedCamp];
        } else if (selectedCamp) {
            infoBox.textContent = `Information for ${selectedCamp}. Click to edit.`;
        } else {
            infoBox.textContent = 'Select a camp to see or add information.';
        }
    });

    infoBox.addEventListener('blur', () => {
        const selectedCamp = campDropdown.value;
        if (selectedCamp) {
            campInfo[selectedCamp] = infoBox.textContent;
            console.log(`Info saved for ${selectedCamp}:`, campInfo[selectedCamp]);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateCampInterface();
    loadGroupsForCamp(campSelector.value);
    if (campDropdown.options.length > 0 && campDropdown.value && campInfo[campDropdown.value]) {
        infoBox.textContent = campInfo[campDropdown.value];
    } else if (campDropdown.options.length > 0 && campDropdown.value) {
        infoBox.textContent = `Information for ${campDropdown.value}. Click to edit.`;
    }
    else {
        infoBox.textContent = 'Select a camp to see or add information.';
    }
});

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

// Add color coding for camps and groups
function assignColor(element, color) {
    element.style.backgroundColor = color;
}

// Example: Assign random colors to camps
camps.forEach((camp) => {
    const campElement = document.querySelector(`[data-camp="${camp}"]`);
    if (campElement) {
        assignColor(campElement, `#${Math.floor(Math.random() * 16777215).toString(16)}`);
    }
});

// Add animations for adding/removing groups
function animateElement(element, animationName, callback) {
    element.classList.add('animated', animationName);
    element.addEventListener('animationend', () => {
        element.classList.remove('animated', animationName);
        if (callback) callback();
    }, { once: true });
}

// Example: Animate group addition
function createGroupBox(groupName, groupIndex, campName) {
    const groupElement = document.createElement('div');
    groupElement.className = 'group';
    groupElement.id = `group-${normalizeId(campName)}-${groupIndex}`;
    groupElement.draggable = true;

    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';

    const groupNameSpan = document.createElement('span');
    groupNameSpan.textContent = groupName;

    const undoIcon = document.createElement('i');
    undoIcon.className = 'fas fa-undo action-icon';
    undoIcon.title = 'Undo (Placeholder)';
    undoIcon.addEventListener('click', () => {
        console.log(`Undo clicked for group: ${groupName} in camp: ${campName}`);
    });

    const deleteGroupIcon = document.createElement('i');
    deleteGroupIcon.className = 'fas fa-trash action-icon';
    deleteGroupIcon.title = 'Delete Group';
    deleteGroupIcon.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete group "${groupName}" from camp "${campName}"?`)) {
            if (campGroups[campName] && campGroups[campName][groupIndex]) {
                campGroups[campName].splice(groupIndex, 1);
                loadGroupsForCamp(campName);
            } else {
                console.error("Group or camp not found for deletion.");
                groupElement.remove();
            }
        }
    });

    const addActivityIcon = document.createElement('i');
    addActivityIcon.className = 'fas fa-plus action-icon';
    addActivityIcon.title = 'Add Activity';
    addActivityIcon.addEventListener('click', () => {
        const defaultActivityTime = "07:00";
        const currentTableBody = groupElement.querySelector('.group-table tbody');
        if (currentTableBody) {
            if (!campGroups[campName][groupIndex].activities) {
                campGroups[campName][groupIndex].activities = [];
            }
            const newActivity = { time: defaultActivityTime, name: "" };
            campGroups[campName][groupIndex].activities.push(newActivity);
            addActivityToTable(newActivity, currentTableBody, campName, groupIndex, campGroups[campName][groupIndex].activities.length - 1);
        } else {
            console.error("Could not find table body for group:", groupName);
        }
    });

    groupHeader.appendChild(groupNameSpan);
    groupHeader.appendChild(undoIcon);
    groupHeader.appendChild(deleteGroupIcon);
    groupHeader.appendChild(addActivityIcon);

    const groupTable = document.createElement('table');
    groupTable.className = 'group-table';
    const tableHead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Time', 'Activity'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    const tableBody = document.createElement('tbody');

    groupTable.appendChild(tableHead);
    groupTable.appendChild(tableBody);

    groupElement.appendChild(groupHeader);
    groupElement.appendChild(groupTable);

    if (groupContainer.textContent.startsWith('No groups for this camp yet') || groupContainer.textContent.startsWith('Select a camp')) {
       groupContainer.innerHTML = '';
    }
    animateElement(groupElement, 'fadeIn');
    groupContainer.appendChild(groupElement);

    if (campGroups[campName] && campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities) {
        campGroups[campName][groupIndex].activities.forEach((activity, activityIndex) => {
            addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex);
        });
    }
}

function addActivityToTable(activity, tableBody, campName, groupIndex, activityIndex) {
    const row = tableBody.insertRow();

    const cellTime = row.insertCell();
    const timeSelector = createCustomTimeSelector(activity.time);
    timeSelector.addEventListener('change', (e) => {
        if (campGroups[campName] && campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities[activityIndex]) {
            campGroups[campName][groupIndex].activities[activityIndex].time = e.target.value;
            console.log(`Time updated for activity "${activity.name}" to ${e.target.value}`);
        }
    });
    cellTime.appendChild(timeSelector);

    const cellActivity = row.insertCell();
    cellActivity.style.display = 'flex';
    cellActivity.style.justifyContent = 'space-between';
    cellActivity.style.alignItems = 'center';

    const activitySelector = createActivitySelector(activity.name);
    activitySelector.addEventListener('change', (e) => {
        if (campGroups[campName] && campGroups[campName][groupIndex] && campGroups[campName][groupIndex].activities[activityIndex]) {
            campGroups[campName][groupIndex].activities[activityIndex].name = e.target.value;
            console.log(`Activity for group "${groupNameFromData(campName, groupIndex)}" at ${activity.time} updated to "${e.target.value}"`);
        }
    });
    activitySelector.style.flexGrow = '1';
    cellActivity.appendChild(activitySelector);

    const deleteActivityIcon = document.createElement('i');
    deleteActivityIcon.className = 'fas fa-times action-icon';
    deleteActivityIcon.title = 'Delete Activity';
    deleteActivityIcon.style.color = '#d9534f';
    deleteActivityIcon.style.cursor = 'pointer';
    deleteActivityIcon.style.marginLeft = '10px';
    deleteActivityIcon.addEventListener('click', () => {
        const currentActivityName = campGroups[campName][groupIndex].activities[activityIndex] ? campGroups[campName][groupIndex].activities[activityIndex].name : 'this activity';
        if (confirm(`Delete activity "${currentActivityName}" at ${activity.time}?`)) {
            campGroups[campName][groupIndex].activities.splice(activityIndex, 1);
            row.remove();
        }
    });
    cellActivity.appendChild(deleteActivityIcon);
}

// Helper function to safely get group name for logging
function groupNameFromData(campName, groupIndex) {
    if (campGroups[campName] && campGroups[campName][groupIndex]) {
        return campGroups[campName][groupIndex].name;
    }
    return 'Unknown Group';
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

        // Update the Edit Camp button's event listener
        const editButton = document.getElementById('edit-camp-button');
        if (editButton) {
            editButton.onclick = () => editCampName(trimmedNewName);
        }

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
            if (!editButton) {
                editButton = document.createElement('button');
                editButton.id = 'edit-camp-button';
                editButton.textContent = 'Edit Camp';
                editButton.addEventListener('click', () => editCampName(selectedCamp));
                currentCampContainer.appendChild(editButton); // Place beside current camp heading
            } else {
                editButton.onclick = () => editCampName(selectedCamp);
            }
        } else if (editButton) {
            editButton.remove();
        }
    });
}
