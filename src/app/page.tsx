"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { FileText, Map as MapIcon, X } from "lucide-react";

import hyacinth from "../hyacinth.png";
import ThemeToggle from "@/components/theme/ThemeToggle";
import HelpButton from "@/components/help/HelpButton";

type PopupType = "patch-notes" | "roadmap" | null;

function InfoPopup({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
}) {
	return (
		<div
			className="app-popup-overlay fixed inset-0 z-[100] flex items-center justify-center p-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="app-themed-popup max-h-[85dvh] w-full max-w-2xl overflow-hidden"
			>
				{/* Header */}
				<div className="app-themed-popup-header flex items-center justify-between px-5 py-4">
					<h2 className="app-themed-popup-heading text-lg font-bold">
						{title}
					</h2>

					<button
						type="button"
						onClick={onClose}
						className="app-themed-popup-close p-2"
						aria-label="Close popup"
					>
						<X size={19} />
					</button>
				</div>

				{/* Content */}
				<div
					className="
                        app-themed-popup-content
                        max-h-[70dvh] overflow-y-auto
                        p-5 text-left text-sm leading-7
                        sm:p-7
                    "
				>
					{children}
				</div>
			</section>
		</div>
	);
}

export default function Home() {
	const [popup, setPopup] = useState<PopupType>(null);

	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") setPopup(null);
		}

		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, []);

	return (
		<main className="landing-page relative min-h-[100dvh] overflow-hidden bg-[#FAF7FF] text-[#3F3545]">
			<div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-8">
				<ThemeToggle />
			</div>

			<div
				className="landing-glow-one pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#F1EAFB] blur-3xl"
				aria-hidden="true"
			/>

			<div
				className="landing-glow-two pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#F7DDE9] blur-3xl"
				aria-hidden="true"
			/>

			<div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-52 text-center sm:pb-56 md:pb-60">
				<h1 className="text-5xl font-bold tracking-tight text-[#6F527F] sm:text-6xl md:text-7xl">
					Riri&apos;s MindMap
				</h1>

				<p className="mt-5 max-w-md text-base leading-7 text-[#887B91] sm:text-lg">
					You got this!
				</p>

				<Link
					href="/dashboard"
					className="
						landing-open-button mt-8 inline-flex items-center justify-center
						rounded-xl bg-[#9B7EBD] px-7 py-3
						text-sm font-semibold text-white
						shadow-[0_0_18px_rgba(155,126,189,0.40),0_0_35px_rgba(155,126,189,0.20)]
						transition-all duration-300
						hover:-translate-y-0.5
						hover:bg-[#6F527F]
						hover:shadow-[0_0_25px_rgba(155,126,189,0.65),0_0_45px_rgba(155,126,189,0.35)]
						active:translate-y-0
					"
				>
					Open Mind Map
				</Link>
			</div>

			<div
				className="pointer-events-none absolute bottom-0 left-1/2 z-10 w-[180px] -translate-x-1/2 m:w-[220px] md:w-[280px] lg:w-[340px]"
				aria-hidden="true"
			>
				<div className="landing-flower-glow absolute bottom-[-15%] left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-[65px] sm:h-52 sm:w-52 md:h-64 md:w-64" />
				<Image
					src={hyacinth}
					alt=""
					priority
					className="relative h-auto w-full select-none"
					style={{ imageRendering: "pixelated" }}
				/>
			</div>
			<div className="fixed bottom-5 left-5 z-30 flex items-center gap-2 sm:bottom-7 sm:left-8 text-sm font-medium">
				v1.8
			</div>
			<div className="fixed bottom-5 right-5 z-30 flex items-center gap-2 sm:bottom-7 sm:right-8">
				<button
					type="button"
					onClick={() => setPopup("patch-notes")}
					title="Patch Notes"
					aria-label="Open Patch Notes"
					className="landing-utility-button"
				>
					<FileText size={18} strokeWidth={1.8} />
				</button>

				<button
					type="button"
					onClick={() => setPopup("roadmap")}
					title="Roadmap"
					aria-label="Open Roadmap"
					className="landing-utility-button"
				>
					<MapIcon size={18} strokeWidth={1.8} />
				</button>
				<HelpButton />
			</div>

			{popup === "patch-notes" && (
				<InfoPopup title="Patch Notes" onClose={() => setPopup(null)}>
					<section className="space-y-3">
						<h3 className="popup-section-heading font-bold">Introduction</h3>

						<p>
							I vibe-coded this mind map for my girlfriend to help her, I
							suppose... I really hope this helps. Shoutout to you, my Riri. I
							love you!
						</p>

						<p>
							If you found this website, it means you&apos;re part of the group
							I trust enough to let you see what I&apos;ve made for her. Or
							maybe I just wanted to share my work because it&apos;s cool.
							Either way, now you know!
						</p>
					</section>

					<div className="popup-content-divider my-6 border-t" />

					<div className="space-y-6">
						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.0</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Created the basic mind map.</li>
								<li>
									Added a left sidebar for the map structure and a right sidebar
									for node properties.
								</li>
								<li>
									Added basic keyboard shortcuts, including a delete shortcut
									that was later removed and brought back.
								</li>
								<li>
									Created the homepage and added the purple hyacinth flower,
									drawn by me using Aseprite.
								</li>
							</ul>
							<p className="mt-3">
								<strong>A little meaning behind the flower:</strong> Hyacinths
								are often associated with sincerity, joy, and new beginnings.
								Purple hyacinths can also symbolize sorrow or asking for
								forgiveness. I chose this flower because it felt meaningful to
								me.
							</p>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.1</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Fixed the flower on the homepage.</li>
								<li>Set up the database using Supabase.</li>
								<li>
									Added database connectivity so your progress can be saved.
								</li>
							</ul>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.2</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Added the dashboard.</li>
								<li>Added dark mode to the main pages.</li>
								<li>
									Added the ability to show or hide a node&apos;s description
									directly inside the node.
								</li>
							</ul>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.3</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Brought back the delete shortcut.</li>
								<li>
									Added Undo and Redo functionality, including keyboard
									shortcuts.
								</li>
								<li>Applied dark mode to all pages except the login page.</li>
							</ul>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.4</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Added keyboard shortcuts 0 and 1.</li>
								<li>Fixed the issue with selecting multiple nodes.</li>
								<li>
									Fixed several dark mode issues and applied dark mode across
									all pages.
								</li>
								<li>Added Snap to Grid, with shortcuts G and Shift + G.</li>
								<li>Improved the sidebar and Undo/Redo controls.</li>
								<li>Added navigation back to the dashboard and homepage.</li>
								<li>Fixed the functionality of shortcut 1.</li>
								<li>Changed the favicon.</li>
							</ul>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.5</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Fixed dark mode styling for controls and sidebars.</li>
								<li>
									Added the ability to reassign and delete arrow connections.
								</li>
								<li>Added the ability to delete multiple nodes at once.</li>
								<li>
									Added the ability to create arrow connections between nodes.
								</li>
								<li>Improved tablet usability and portability.</li>
								<li>Adjusted the toolbar to make it more compact.</li>
								<li>
									Added Grid and Snap to Grid toggles, along with Show/Hide
									controls for the sidebars and properties panel.
								</li>
								<li>
									Added Patch Notes, Help, and Roadmap popups to the homepage.
								</li>
								<li>Added glow effects to the buttons and flower.</li>
								<li>Added a version number display to the homepage.</li>
								<li>Redesigned the Roadmap popup.</li>
							</ul>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.6</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>Remove the Hide Sidebar and Hide Properties options.</li>
								<li>Fix the three-dot menu issue on the dashboard.</li>
								<li>Fix the node overlap issue.</li>
								<li>Automatically create a new map when importing a map.</li>
								<li>
									Fixed the delete confirmation modal display and added
									permanent folder deletion with automatic reassignment of its
									mind maps and child folders to the parent folder.
								</li>
							</ul>
						</section>

						<section>
							<h3 className="popup-section-heading font-bold">Patch v1.7</h3>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>
									Implement flashcard and deck types with Supabase database
									integration.
								</li>
								<li>Implement flashcard deck CRUD operations.</li>
								<li>
									Implement flashcard generation from mind maps with duplicate
									card prevention.
								</li>
								<li>
									Implement study session creation, completion, and answer
									review recording.
								</li>
								<li>
									Implement session history and summary retrieval with
									authentication and ownership checks.
								</li>
								<li>
									Implement interactive study sessions with answer submission,
									progress tracking, and results.
								</li>
								<li>Add dark mode support to flashcard generation.</li>
								<li>
									Fix the node dragging jitter issue when opening descriptions
									by preventing description layout recalculations from
									interfering with active dragging.
								</li>
							</ul>
						</section>
					</div>
				</InfoPopup>
			)}

			{popup === "roadmap" && (
				<InfoPopup title="Development Roadmap" onClose={() => setPopup(null)}>
					<div className="space-y-7">
						<p className="text-sm leading-6">
							A look at what&apos;s planned for future updates. Features and
							release plans may change along the way.
						</p>

						<div className="space-y-6">
							{/* Patch v1.8 */}
							<section className="roadmap-card relative rounded-xl p-4">
								<div className="mb-4 flex items-center justify-between gap-3">
									<h3 className="popup-section-heading font-bold">
										Patch v1.8
									</h3>
									<span className="roadmap-status rounded-full px-3 py-1 text-xs font-semibold">
										Planned
									</span>
								</div>

								<ul className="space-y-3 text-sm">
									<li className="flex items-start gap-3">
										<span className="roadmap-checkbox mt-0.5 inline-flex h-4 w-4 shrink-0 rounded" />
										<span>
											Introduce a fill-in-the-blanks Quiz feature with a scoring
											system.
										</span>
									</li>
								</ul>
							</section>

							{/* Patch v1.9 */}
							<section className="roadmap-card relative rounded-xl p-4">
								<div className="mb-4 flex items-center justify-between gap-3">
									<h3 className="popup-section-heading font-bold">
										Patch v1.9
									</h3>
									<span className="roadmap-status rounded-full px-3 py-1 text-xs font-semibold">
										Planned
									</span>
								</div>

								<ul className="space-y-3 text-sm">
									<li className="flex items-start gap-3">
										<span className="roadmap-checkbox mt-0.5 inline-flex h-4 w-4 shrink-0 rounded" />
										<span>
											Redesign the Add Description and Hide Description icons.
										</span>
									</li>
								</ul>
							</section>
						</div>
					</div>
				</InfoPopup>
			)}
		</main>
	);
}
