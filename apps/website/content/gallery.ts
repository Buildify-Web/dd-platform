/**
 * Gallery items (later managed by admin through the web admin portal).
 * `photo: null` renders the coloured tile used in the design.
 */
export type Album = "Classroom" | "Events" | "Competitions" | "Celebrations";
export const albums: Album[] = ["Classroom", "Events", "Competitions", "Celebrations"];

export type GalleryItem = {
  id: string;
  album: Album;
  caption: string;
  date: string;
  photo: string | null;
  tone: "sun" | "ink" | "sage" | "brand";
  /** tall photo tile (portrait) vs short banner tile */
  tall?: boolean;
};

export const galleryItems: GalleryItem[] = [
  { id: "g1", album: "Classroom", caption: "Our new offline classroom", date: "June 2026", photo: "/images/gallery-empty-classroom.webp", tone: "sun", tall: true },
  { id: "g2", album: "Competitions", caption: "Spell Bee school round", date: "Aug 2026", photo: null, tone: "sun" },
  { id: "g3", album: "Classroom", caption: "Grade 3 maths practice", date: "July 2026", photo: null, tone: "sun" },
  { id: "g4", album: "Events", caption: "Phonics week", date: "July 2026", photo: "/images/gallery-abc-blocks.webp", tone: "sun" },
  { id: "g5", album: "Classroom", caption: "Love to learn corner", date: "May 2026", photo: "/images/gallery-love-to-learn.webp", tone: "sun" },
  { id: "g6", album: "Competitions", caption: "Science Olympiad quiz prep", date: "Sept 2026", photo: "/images/gallery-quiz-prep.webp", tone: "sun", tall: true },
  { id: "g7", album: "Events", caption: "Parents’ open day", date: "Apr 2026", photo: null, tone: "ink" },
  { id: "g8", album: "Competitions", caption: "Olympiad mock test day", date: "Oct 2026", photo: null, tone: "sage" },
  { id: "g9", album: "Events", caption: "Library study hour", date: "Aug 2026", photo: "/images/gallery-group-activity.webp", tone: "sun", tall: true },
  { id: "g10", album: "Classroom", caption: "Grade 9 science lesson", date: "Sept 2026", photo: "/images/gallery-classroom-lesson.webp", tone: "sun", tall: true },
  { id: "g11", album: "Celebrations", caption: "Diwali celebration", date: "Nov 2026", photo: null, tone: "sun" },
  { id: "g12", album: "Classroom", caption: "Board exam revision", date: "Feb 2026", photo: null, tone: "ink" },
  // Loaded with "Load more photos"
  { id: "g13", album: "Classroom", caption: "Chemistry lab session", date: "Oct 2026", photo: "/images/gallery-science-lab.webp", tone: "sun", tall: true },
  { id: "g14", album: "Celebrations", caption: "Annual Day rehearsals", date: "Jan 2026", photo: null, tone: "brand" },
  { id: "g15", album: "Events", caption: "Online class setup", date: "Mar 2026", photo: "/images/gallery-reading-corner.webp", tone: "sun", tall: true },
  { id: "g16", album: "Celebrations", caption: "Children’s Day", date: "Nov 2025", photo: null, tone: "sage" },
];
