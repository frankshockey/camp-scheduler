// Activity Palette logic for Camp Scheduler
import { App } from './ui.js';

// Activity Palette logic
export const ActivityPalette = {
  init: (activities, onActivityAdd, onActivityEdit, onActivityDelete) => {
    const palette = document.getElementById('activity-palette');
    palette.innerHTML = '';
    activities.forEach((activity, idx) => {
      const div = document.createElement('div');
      div.className = 'activity-palette-item';
      div.style.background = activity.color || '#eee';
      div.draggable = true;
      // Wrap activity name in a span for flex layout
      const nameSpan = document.createElement('span');
      nameSpan.className = 'activity-name';
      nameSpan.textContent = activity.name;
      div.appendChild(nameSpan);
      div.title = 'Drag to schedule or click to edit';
      div.addEventListener('click', () => onActivityEdit(idx));
      div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('activity-idx', idx);
        e.dataTransfer.effectAllowed = 'copy';
      });
      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-activity-btn';
      delBtn.innerHTML = '<i class="fa fa-trash"></i>';
      delBtn.title = 'Delete Activity';
      delBtn.onclick = e => {
        e.stopPropagation();
        onActivityDelete(idx);
      };
      div.appendChild(delBtn);
      palette.appendChild(div);
    });
    // Add/Edit Activities button (styled like Edit Camp)
    let editBtn = document.getElementById('edit-activities-button');
    if (editBtn) editBtn.remove();
    editBtn = document.createElement('button');
    editBtn.id = 'edit-activities-button';
    editBtn.textContent = 'Edit Activities';
    // Remove all inline styles, rely on CSS only
    editBtn.className = '';
    editBtn.addEventListener('click', () => onActivityAdd && onActivityAdd());
    palette.appendChild(editBtn);
  },
  add: (activities, activity) => activities.push(activity),
  edit: (activities, idx, newActivity) => { activities[idx] = newActivity; },
  delete: (activities, idx) => { activities.splice(idx, 1); }
};
