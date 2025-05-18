// Firestore logic for Camp Scheduler
import { App } from './ui.js';

// Firestore logic
const db = window.firebaseDb;

export const Firestore = {
  saveCampSchedule: async (userId, campData) => {
    await db.collection('campSchedules').doc(userId).set(campData);
  },
  loadCampSchedule: async (userId) => {
    const doc = await db.collection('campSchedules').doc(userId).get();
    return doc.exists ? doc.data() : null;
  },
  prettifyInfoBoxContent: (html) => {
    // Remove unwanted tags, allow <b>, <i>, <u>, <br>, <div>, <span>, <font>, <strong>, <em>, <p>
    const allowed = /<(\/?(b|i|u|br|div|span|font|strong|em|p)[^>]*)>/gi;
    // Remove all tags except allowed
    let clean = html.replace(/<[^>]+>/g, tag => tag.match(allowed) ? tag : '');
    // Remove unwanted attributes (data-*, class, style, etc.)
    clean = clean.replace(/(<[a-z]+)([^>]*)(>)/gi, (m, tag, attrs, end) => {
      // Only keep href for <a> and src for <img> if needed (not used here)
      if (/^<(p|b|i|u|br|div|span|font|strong|em)$/i.test(tag)) return tag + end;
      return tag + end;
    });
    // Optionally, add more styling for readability
    clean = clean.replace(/<font([^>]*)>/gi, '<span style="font-size:1.1em; font-family:Times New Roman;">');
    clean = clean.replace(/<\/font>/gi, '</span>');
    return clean;
  }
};
