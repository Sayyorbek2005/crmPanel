import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
const ThemeContext = createContext({
  dark: false,
  toggle: () => {},
});
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("crm-theme") === "dark";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("crm-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  return (
    <ThemeContext.Provider
      value={{
        dark,
        toggle: () => setDark((d) => !d),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
