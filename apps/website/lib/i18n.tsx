"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Lightweight EN / Tamil switch for the site chrome (navbar, footer, primary CTAs).
 * Page body copy is English until the client supplies reviewed Tamil content.
 */
export type Lang = "en" | "ta";

const dict = {
  en: {
    home: "Home",
    about: "About",
    courses: "Courses",
    tutors: "Tutors",
    achievements: "Achievements",
    gallery: "Gallery",
    alumni: "Alumni",
    alumniFeedback: "Alumni & Feedback",
    contact: "Contact",
    enquireNow: "Enquire now",
    explore: "Explore",
    programmes: "Programmes",
    footerTagline: "Tuition and competition coaching for Pre‑KG to Grade 12, online and offline.",
    appNote: "Parent & Teacher app on Android and iOS",
    menu: "Menu",
    close: "Close",
    switchLang: "Switch to Tamil",
  },
  ta: {
    home: "முகப்பு",
    about: "எங்களைப் பற்றி",
    courses: "பாடநெறிகள்",
    tutors: "ஆசிரியர்கள்",
    achievements: "சாதனைகள்",
    gallery: "படத்தொகுப்பு",
    alumni: "முன்னாள் மாணவர்கள்",
    alumniFeedback: "முன்னாள் மாணவர்கள் & கருத்து",
    contact: "தொடர்பு",
    enquireNow: "விசாரிக்க",
    explore: "பார்வையிட",
    programmes: "திட்டங்கள்",
    footerTagline:
      "Pre-KG முதல் 12ஆம் வகுப்பு வரை டியூஷன் மற்றும் போட்டிப் பயிற்சி — ஆன்லைன் & நேரடி வகுப்புகள்.",
    appNote: "Android மற்றும் iOS-இல் பெற்றோர் & ஆசிரியர் செயலி",
    menu: "மெனு",
    close: "மூடு",
    switchLang: "Switch to English",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

type Ctx = { lang: Lang; toggle: () => void; t: (k: DictKey) => string };

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "dd-lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preference after mount
      if (saved === "ta" || saved === "en") setLang(saved);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "ta" ? "ta" : "en";
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "en" ? "ta" : "en";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, toggle, t: (k) => dict[lang][k] }), [lang, toggle]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
