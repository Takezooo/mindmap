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

	useEffect(() => {
		const savedTheme = window.localStorage.getItem("mindmap-theme");

		const initialTheme: Theme = savedTheme === "dark" ? "dark" : "light";

		setTheme(initialTheme);

		document.documentElement.classList.toggle("dark", initialTheme === "dark");
	}, []);

	function toggleTheme() {
		setTheme((currentTheme) => {
			const nextTheme: Theme = currentTheme === "light" ? "dark" : "light";

			document.documentElement.classList.toggle("dark", nextTheme === "dark");

			window.localStorage.setItem("mindmap-theme", nextTheme);

			return nextTheme;
		});
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
