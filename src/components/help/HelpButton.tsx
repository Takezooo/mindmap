"use client";

import { useEffect, useState } from "react";
import { CircleHelp, X } from "lucide-react";

export default function HelpButton() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target;

			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
			) {
				return;
			}

			if (
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!event.shiftKey &&
				event.key.toLowerCase() === "h"
			) {
				event.preventDefault();
				setOpen((current) => !current);
			}

			if (event.key === "Escape") {
				setOpen(false);
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const shortcuts: [string, string][] = [
		["Tab", "Add child node"],
		["Shift + Tab", "Add parent node"],
		["Enter", "Add sibling node"],
		["Delete / Backspace", "Delete selected nodes or connections"],
		["Q", "Toggle map sidebar (editor)"],
		["W", "Toggle selection mode"],
		["E", "Toggle properties sidebar (editor)"],
		["R", "Toggle resize mode"],
		["Ctrl + A", "Select all nodes"],
		["Ctrl + Z", "Undo"],
		["Ctrl + Shift + Z", "Redo"],
		["Ctrl + Y", "Redo"],
		["0", "Fit the entire mind map to the screen"],
		["1", "Focus on the first parent/root node"],
		["G", "Toggle grid"],
		["Shift + G", "Toggle snap to grid"],
		["H", "Open or close Help"]
	];

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				title="Help (H)"
				aria-label="Open keyboard shortcuts"
				className="landing-utility-button"
			>
				<CircleHelp size={18} strokeWidth={1.8} />
			</button>

			{open && (
				<div
					className="app-popup-overlay fixed inset-0 z-[100] flex items-center justify-center p-4"
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) {
							setOpen(false);
						}
					}}
				>
					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby="help-dialog-title"
						className="app-themed-popup max-h-[85dvh] w-full max-w-lg overflow-hidden"
					>
						{/* Header */}
						<div className="app-themed-popup-header flex items-center justify-between px-5 py-4">
							<div>
								<h2
									id="help-dialog-title"
									className="app-themed-popup-heading text-lg font-bold"
								>
									Keyboard Shortcuts
								</h2>

								<p className="app-themed-popup-muted mt-1 text-xs">
									A little guide to help you get around.
								</p>
							</div>

							<button
								type="button"
								onClick={() => setOpen(false)}
								className="app-themed-popup-close p-2"
								aria-label="Close help"
							>
								<X size={19} />
							</button>
						</div>

						{/* Shortcut list */}
						<div className="app-themed-popup-content max-h-[65dvh] overflow-y-auto p-5">
							<div className="space-y-2">
								{shortcuts.map(([key, description]) => (
									<div
										key={key}
										className="app-themed-popup-row flex items-center justify-between gap-4 px-3 py-3"
									>
										<span className="text-sm">{description}</span>

										<kbd className="app-themed-popup-key shrink-0 px-2 py-1 text-xs font-semibold">
											{key}
										</kbd>
									</div>
								))}
							</div>
						</div>
					</section>
				</div>
			)}
		</>
	);
}
