/**
 * Gallery items (later managed by admin through the web admin portal).
 * Photos live in `public/images/gallery`. `width`/`height` are the real pixel
 * sizes so the grid shows each photo at its natural shape (no awkward crops).
 */
export type Album = "Classroom" | "Competitions" | "Events" | "Celebrations" | "Our Team";
export const albums: Album[] = ["Classroom", "Competitions", "Events", "Celebrations", "Our Team"];

export type GalleryItem = {
  id: string;
  album: Album;
  caption: string;
  photo: string;
  width: number;
  height: number;
  /** Optional, e.g. "Aug 2026" — shown when set. */
  date?: string;
};

const img = (name: string) => `/images/gallery/${name}.webp`;

/** Order is the "All" view order: strongest photos first, albums interleaved. */
export const galleryItems: GalleryItem[] = [
  { id: "g17", album: "Competitions", caption: "Prize winners with their certificates and trophies", photo: img("prize-winners-certificates"), width: 1600, height: 1001 },
  { id: "g7", album: "Events", caption: "The Dynamic Donalds family", photo: img("big-family-photo"), width: 1360, height: 766 },
  { id: "g22", album: "Competitions", caption: "Trophy winners on stage", photo: img("trophy-winners-stage"), width: 1600, height: 1200 },
  { id: "g19", album: "Events", caption: "Getting ready for the event", photo: img("ready-for-the-event"), width: 1600, height: 1200 },
  { id: "g26", album: "Competitions", caption: "Our trophies and a memento for maximum participants", photo: img("trophy-collection"), width: 1600, height: 479 },
  { id: "g25", album: "Our Team", caption: "Our teachers and staff", photo: img("dd-family-team"), width: 1600, height: 1137 },
  { id: "g3", album: "Competitions", caption: "Spell Bee Olympiad prize day", photo: img("spell-bee-prize-day"), width: 1277, height: 1020 },
  { id: "g24", album: "Classroom", caption: "Paper flower craft activity", photo: img("paper-flower-craft"), width: 1600, height: 1200 },
  { id: "g30", album: "Celebrations", caption: "Diwali celebrations", photo: img("diwali-sparklers"), width: 1600, height: 1200 },
  { id: "g20", album: "Competitions", caption: "Students receiving their awards on stage", photo: img("awards-on-stage-collage"), width: 1067, height: 1600 },
  { id: "g18", album: "Events", caption: "On the way to a competition", photo: img("bus-ride-to-competition"), width: 1600, height: 1200 },
  { id: "g10", album: "Our Team", caption: "Our teaching team", photo: img("teaching-team"), width: 1077, height: 1020 },
  { id: "g27", album: "Competitions", caption: "Certificates of appreciation", photo: img("certificates-of-appreciation"), width: 1600, height: 800 },
  { id: "g21", album: "Celebrations", caption: "Saraswati Pooja with our teachers", photo: img("saraswati-pooja"), width: 1200, height: 1600 },
  { id: "g13", album: "Classroom", caption: "Word-search worksheet activity", photo: img("worksheet-activity"), width: 1360, height: 1020 },
  { id: "g23", album: "Our Team", caption: "Our teachers honoured on stage", photo: img("teachers-honoured-collage"), width: 900, height: 1600 },
  { id: "g1", album: "Events", caption: "Visit to Dr. Agarwal’s Eye Hospital", photo: img("eye-hospital-visit"), width: 1360, height: 680 },
  { id: "g29", album: "Events", caption: "Eye check-up during the hospital visit", photo: img("eye-check-up"), width: 1600, height: 800 },
  { id: "g12", album: "Classroom", caption: "Pot painting activity", photo: img("pot-painting-activity"), width: 1360, height: 1020 },
  { id: "g5", album: "Celebrations", caption: "Prize presentation", photo: img("prize-presentation"), width: 1360, height: 1020 },
  { id: "g4", album: "Competitions", caption: "Our students at Bharatiya Vidya Bhavan", photo: img("bharatiya-vidya-bhavan"), width: 1360, height: 1020 },
  { id: "g14", album: "Events", caption: "Yellow Day", photo: img("yellow-day"), width: 1360, height: 612 },
  { id: "g9", album: "Celebrations", caption: "Gifts for every student", photo: img("gift-day-group"), width: 1360, height: 1020 },
  { id: "g2", album: "Classroom", caption: "Class photo after the lesson", photo: img("class-group-whiteboard"), width: 1152, height: 576 },
  { id: "g16", album: "Competitions", caption: "Students writing their test", photo: img("test-day-collage"), width: 574, height: 1020 },
  { id: "g15", album: "Events", caption: "Red Day", photo: img("red-day"), width: 1360, height: 1020 },
  { id: "g6", album: "Celebrations", caption: "A gift for our youngest learner", photo: img("little-learner-award"), width: 1360, height: 1020 },
  { id: "g11", album: "Our Team", caption: "Teachers’ appreciation", photo: img("teachers-appreciation"), width: 1020, height: 1020 },
  { id: "g8", album: "Celebrations", caption: "Celebrating a young achiever", photo: img("student-recognition"), width: 1360, height: 1020 },
  { id: "g28", album: "Celebrations", caption: "An evening celebration", photo: img("evening-celebration"), width: 800, height: 1600 },
];
