import type { SVGProps } from "react";

/** Portal line icons (24px grid, 1.7 stroke), matching the admin & staff designs. */
type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

const icon = (d: React.ReactNode) => {
  const C = (p: P) => <svg {...base(p)}>{d}</svg>;
  return C;
};

export const IGrid = icon(
  <>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
  </>,
);
export const ICheckSquare = icon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>,
);
export const IUsers = icon(
  <>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.4c1.6.6 2.7 2.2 3 4.6" />
  </>,
);
export const IUser = icon(
  <>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" />
  </>,
);
export const ICalendar = icon(
  <>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </>,
);
export const ICalendarCheck = icon(
  <>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M9 14.8l2 2 4-4" />
  </>,
);
export const IBook = icon(
  <>
    <path d="M6 4.5h10.5a1.5 1.5 0 0 1 1.5 1.5v13.5H7.5A1.5 1.5 0 0 1 6 18V4.5Z" />
    <path d="M9.5 8.5h5M9.5 12h5" />
  </>,
);
export const IPencil = icon(<path d="M4.5 19.5h4l10-10-4-4-10 10v4ZM13 7l4 4" />);
export const IChart = icon(<path d="M4 4v16h16M7.5 15l3.5-4 3 2.5 5-6" />);
export const IFile = icon(
  <>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8L14 3.5Z" />
    <path d="M14 3.5V8h4.5M9 12.5h6M9 16h6" />
  </>,
);
export const IClipboard = icon(
  <>
    <rect x="5.5" y="5" width="13" height="15.5" rx="2" />
    <path d="M9 5V3.8h6V5M9 10h6M9 13.5h6" />
  </>,
);
export const ICap = icon(
  <>
    <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" />
    <path d="M6.5 11.5v4c1.4 1.4 3.3 2 5.5 2s4.1-.6 5.5-2v-4" />
  </>,
);
export const ITrophy = icon(
  <>
    <path d="M8 4.5h8v4.5a4 4 0 0 1-8 0V4.5ZM12 13v3.5M8.5 20h7M10 16.5h4" />
    <path d="M8 6.5H5.5a2.5 2.5 0 0 0 2.6 3M16 6.5h2.5a2.5 2.5 0 0 1-2.6 3" />
  </>,
);
export const ICard = icon(
  <>
    <rect x="3.5" y="6" width="17" height="12" rx="2.2" />
    <path d="M3.5 10h17M7 14.5h3" />
  </>,
);
export const IRupee = icon(<path d="M7 5h10M7 9h10M7 5c5 0 6.5 2 6.5 4S12 13 7 13l7 7" />);
export const IDollar = icon(<path d="M12 3.5v17M16 7.5c-.6-1.4-2-2.2-4-2.2-2.4 0-4 1.2-4 3s1.6 2.6 4 3.2 4 1.4 4 3.3-1.7 3.2-4 3.2c-2.1 0-3.7-.9-4.3-2.4" />);
export const IBars = icon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M8.5 16v-4M12 16V8.5M15.5 16v-6" />
  </>,
);
export const IMegaphone = icon(<path d="M4 10v4a1 1 0 0 0 1 1h2.5L14 19V5L7.5 9H5a1 1 0 0 0-1 1ZM17.5 9a4 4 0 0 1 0 6M8 15l1.2 4.5" />);
export const IBell = icon(<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5ZM10 20.5a2.2 2.2 0 0 0 4 0" />);
export const IIdCard = icon(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 15.5c.5-1.3 1.6-2 3-2s2.5.7 3 2M14.5 10h3M14.5 13h3" />
  </>,
);
export const IGlobe = icon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5Z" />
  </>,
);
export const IHistory = icon(<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 4.5V9H9M12 8v4.5l3 1.8" />);
export const IGear = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5l1.6 1.9 2.4-.5.8 2.3 2.3.8-.5 2.4 1.9 1.6-1.9 1.6.5 2.4-2.3.8-.8 2.3-2.4-.5L12 20.5l-1.6-1.9-2.4.5-.8-2.3-2.3-.8.5-2.4L3.5 12l1.9-1.6-.5-2.4 2.3-.8.8-2.3 2.4.5L12 3.5Z" />
  </>,
);
export const ISearch = icon(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </>,
);
export const ISliders = icon(<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4.5v5M6 14.5v5M4 12h6M14 12h6M10 9.5v5" />);
export const IPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IChevronRight = icon(<path d="m10 6 6 6-6 6" />);
export const IChevronLeft = icon(<path d="m14 6-6 6 6 6" />);
export const IChevronDown = icon(<path d="m6 10 6 6 6-6" />);
export const ILogOut = icon(<path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7M10 12h10M16.5 8.5 20 12l-3.5 3.5" />);
export const ICamera = icon(
  <>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="12.5" r="3.2" />
  </>,
);
export const IImage = icon(
  <>
    <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
    <circle cx="9" cy="10" r="1.7" />
    <path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" />
  </>,
);
export const IUpload = icon(<path d="M12 15.5V5M7.5 9.5 12 5l4.5 4.5M5 15.5V19h14v-3.5" />);
export const IFileUp = icon(
  <>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8L14 3.5Z" />
    <path d="M14 3.5V8h4.5M12 17v-6M9.5 13.5 12 11l2.5 2.5" />
  </>,
);
export const ITrash = icon(<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 10.5v6M13.5 10.5v6" />);
export const IClip = icon(<path d="m19 11.5-7 7a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5a3 3 0 0 1 4.2 4.2L9.8 16.4a1.5 1.5 0 0 1-2.1-2.1L14.5 7.5" />);
export const IDownload = icon(<path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5M5 19h14" />);
export const IArrowUpRight = icon(<path d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15" />);
export const IArrowRight = icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IEye = icon(
  <>
    <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </>,
);
export const ISun = icon(
  <>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
  </>,
);
export const IMoon = icon(<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />);
export const IClock = icon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);
export const IWarn = icon(<path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.5M12 17v.1" />);
export const IMenu = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IClose = icon(<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />);
export const ICheck = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const ILock = icon(
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
    <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
  </>,
);
export const IBriefcase = icon(
  <>
    <rect x="3.5" y="7" width="17" height="12.5" rx="2.2" />
    <path d="M9 7V5.2h6V7M3.5 12h17" />
  </>,
);
export const IMail = icon(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
    <path d="m4.5 7 7.5 5.5L19.5 7" />
  </>,
);
export const IPhone = icon(<path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8L16 13l4 1.5v3A2 2 0 0 1 18 19.5 14.5 14.5 0 0 1 4.5 6 2 2 0 0 1 6.5 4Z" />);
export const IQuote = icon(<path d="M9.5 7.5H6a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 6 13.5h3v1a3 3 0 0 1-3 3M19.5 7.5H16a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 16 13.5h3v1a3 3 0 0 1-3 3" />);
export const IDrag = icon(
  <>
    <circle cx="9" cy="6.5" r=".8" />
    <circle cx="15" cy="6.5" r=".8" />
    <circle cx="9" cy="12" r=".8" />
    <circle cx="15" cy="12" r=".8" />
    <circle cx="9" cy="17.5" r=".8" />
    <circle cx="15" cy="17.5" r=".8" />
  </>,
);
export const IWifi = icon(<path d="M4 9.5a12 12 0 0 1 16 0M7 13a7.5 7.5 0 0 1 10 0M10 16.4a3 3 0 0 1 4 0M12 19.5v.1" />);
export const ILink = icon(<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />);
export const ISend = icon(<path d="M4 12 20 4.5 13.5 20l-2.5-6.5L4 12ZM11 13.5l4.5-4.5" />);
export const IRefresh = icon(<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9M18 4v3.5h-3.5M6 20v-3.5h3.5" />);
export const IShield = icon(<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />);
export const IHome = icon(<path d="M4 11 12 4.5 20 11M6.5 9v10.5h11V9" />);
export const IDot = icon(<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />);
export const IStar = icon(<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6L12 4Z" />);
