"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
	theme: Theme;
	toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>("light");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const savedTheme = window.localStorage.getItem("mindmap-theme");
		const initialTheme: Theme = savedTheme === "dark" ? "dark" : "light";

		setTheme(initialTheme);
		document.documentElement.classList.toggle("dark", initialTheme === "dark");
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return;

		document.documentElement.classList.toggle("dark", theme === "dark");
		window.localStorage.setItem("mindmap-theme", theme);
	}, [theme, mounted]);

	function toggleTheme() {
		setTheme((current) => (current === "light" ? "dark" : "light"));
	}

	return (
		<ThemeContext.Provider value={{ theme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error("useTheme must be used inside ThemeProvider");
	}

	return context;
}
