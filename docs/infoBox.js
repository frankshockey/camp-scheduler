// Info Box logic for Camp Scheduler
import { App } from './ui.js';

export const InfoBox = {
    updateForSelectedCamp: () => {
        const { campDropdown, infoBox, campInfo } = App;
        if (!campDropdown || !infoBox) return;
        const selectedCamp = campDropdown.value;
        if (!selectedCamp || !campInfo[selectedCamp]) {
            infoBox.innerHTML = '<span style="color:#888;">Click here to add information about the selected camp.</span>';
        } else {
            infoBox.innerHTML = campInfo[selectedCamp];
        }
    },
    // Info Box logic
    initInfoBox: (info, onInfoChange) => {
        const infoBox = document.getElementById('info-box');
        import('./firestore.js').then(mod => {
            infoBox.innerHTML = mod.prettifyInfoBoxContent(info || '');
        });
        infoBox.oninput = () => onInfoChange(infoBox.innerHTML);
    },
    getInfoBoxContent: () => document.getElementById('info-box').innerHTML,
    setInfoBoxContent: (content) => {
        import('./firestore.js').then(mod => {
            document.getElementById('info-box').innerHTML = mod.prettifyInfoBoxContent(content || '');
        });
    }
};
