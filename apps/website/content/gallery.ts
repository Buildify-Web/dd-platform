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

/** Order is the "All" view order — mixed so albums and shapes interleave. */
export const galleryItems: GalleryItem[] = [
  { id: "g7", album: "Events", caption: "The Dynamic Donalds family", photo: img("big-family-photo"), width: 1360, height: 766 },
  { id: "g3", album: "Competitions", caption: "Spell Bee Olympiad prize day", photo: img("spell-bee-prize-day"), width: 1277, height: 1020 },
  { id: "g13", album: "Classroom", caption: "Word-search worksheet activity", photo: img("worksheet-activity"), width: 1360, height: 1020 },
  { id: "g10", album: "Our Team", caption: "Our teaching team", photo: img("teaching-team"), width: 1077, height: 1020 },
  { id: "g1", album: "Events", caption: "Visit to Dr. Agarwal’s Eye Hospital", photo: img("eye-hospital-visit"), width: 1360, height: 680 },
  { id: "g12", album: "Classroom", caption: "Pot painting activity", photo: img("pot-painting-activity"), width: 1360, height: 1020 },
  { id: "g5", album: "Celebrations", caption: "Prize presentation", photo: img("prize-presentation"), width: 1360, height: 1020 },
  { id: "g16", album: "Competitions", caption: "Students writing their test", photo: img("test-day-collage"), width: 574, height: 1020 },
  { id: "g14", album: "Events", caption: "Yellow Day", photo: img("yellow-day"), width: 1360, height: 612 },
  { id: "g4", album: "Competitions", caption: "Our students at Bharatiya Vidya Bhavan", photo: img("bharatiya-vidya-bhavan"), width: 1360, height: 1020 },
  { id: "g9", album: "Celebrations", caption: "Gifts for every student", photo: img("gift-day-group"), width: 1360, height: 1020 },
  { id: "g2", album: "Classroom", caption: "Class photo after the lesson", photo: img("class-group-whiteboard"), width: 1152, height: 576 },
  // Shown after "Load more photos"
  { id: "g15", album: "Events", caption: "Red Day", photo: img("red-day"), width: 1360, height: 1020 },
  { id: "g6", album: "Celebrations", caption: "A gift for our youngest learner", photo: img("little-learner-award"), width: 1360, height: 1020 },
  { id: "g11", album: "Our Team", caption: "Teachers’ appreciation", photo: img("teachers-appreciation"), width: 1020, height: 1020 },
  { id: "g8", album: "Celebrations", caption: "Celebrating a young achiever", photo: img("student-recognition"), width: 1360, height: 1020 },
];
