import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "he";

type Ctx = { lang: Lang; dir: "ltr" | "rtl"; toggle: () => void; t: (v: { en: string; he: string }) => string };

const LangContext = createContext<Ctx>({
  lang: "en",
  dir: "ltr",
  toggle: () => {},
  t: (v) => v.en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("pp-lang");
    if (stored === "he" || stored === "en") setLang(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const value: Ctx = {
    lang,
    dir: lang === "he" ? "rtl" : "ltr",
    toggle: () => {
      setLang((prev) => {
        const next = prev === "en" ? "he" : "en";
        localStorage.setItem("pp-lang", next);
        return next;
      });
    },
    t: (v) => (lang === "he" ? v.he : v.en),
  };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
