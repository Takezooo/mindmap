"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { Menu, Settings, X } from "lucide-react";

import MindMapCanvas from "@/components/mindmap/MindMapCanvas";

import NodeProperties from "@/components/mindmap/NodeProperties";

import MindMapDatabaseSync from "@/components/mindmap/MindMapDatabaseSync";
import UndoRedoControls from "@/components/mindmap/UndoRedoControls";
import MapTree from "@/components/sidebar/MapTree";

import MapBackup from "@/components/mindmap/MapBackup";

import { useMindMapStore } from "@/stores/mindmap-store";

type MobilePanel = "map" | "properties" | null;

export default function EditorPage() {
	const router = useRouter();

	const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
	const [desktopLeftOpen, setDesktopLeftOpen] = useState(true);
	const [desktopRightOpen, setDesktopRightOpen] = useState(true);

	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const addChild = useMindMapStore((state) => state.addChild);
	const addParent = useMindMapStore((state) => state.addParent);

	useEffect(() => {
		function handleSidebarShortcuts(event: KeyboardEvent) {
			const modifier =
				event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
			const key = event.key.toLowerCase();
			const target = event.target;

			// Desktop only
			if (!window.matchMedia("(min-width: 768px)").matches) return;
			// Ignore shortcuts while editing text

			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
			) {
				return;
			}

			if (!modifier && !event.altKey && key === "q") {
				event.preventDefault();
				setDesktopLeftOpen((current) => !current);
			}

			if (!modifier && !event.altKey && key === "e") {
				event.preventDefault();
				setDesktopRightOpen((current) => !current);
			}
		}

		window.addEventListener("keydown", handleSidebarShortcuts);

		return () => {
			window.removeEventListener("keydown", handleSidebarShortcuts);
		};
	}, []);

	useEffect(() => {
		const tabletQuery = window.matchMedia(
			"(min-width: 768px) and (max-width: 1023px)",
		);

		const handleTabletChange = (event: MediaQueryListEvent) => {
			if (event.matches) {
				setDesktopLeftOpen(false);
				setDesktopRightOpen(false);
			} else {
				setDesktopLeftOpen(true);
				setDesktopRightOpen(true);
			}
		};

		// Apply the initial layout.
		if (tabletQuery.matches) {
			setDesktopLeftOpen(false);
			setDesktopRightOpen(false);
		}

		tabletQuery.addEventListener("change", handleTabletChange);

		return () => {
			tabletQuery.removeEventListener("change", handleTabletChange);
		};
	}, []);

	return (
		<main className="mindmap-editor h-[100dvh] overflow-hidden bg-[#FAF7FF] text-[#3F3545]">
			<MindMapDatabaseSync />

			{/* DESKTOP */}

			<div className="hidden h-full md:flex">
				{/* LEFT SIDEBAR */}

				{desktopLeftOpen && (
					<aside className="flex w-72 shrink-0 flex-col border-r border-[#E7DDF0] bg-white">
						<div className="flex items-center justify-between gap-2 border-b border-[#E7DDF0] p-4">
							<div>
								<h2
									className="text-lg cursor-pointer font-bold text-[#6F527F]"
									onClick={() => router.push("/dashboard")}
								>
									Riri's Mind Map
								</h2>

								<p className="mt-1 text-xs text-[#887B91]">
									For you review, FIGHTING!
								</p>
							</div>

							<ThemeToggle />
						</div>

						<div className="flex flex-col gap-2 border-b border-[#E7DDF0] p-4">
							<MapBackup />

							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => addParent(selectedNodeId ?? undefined)}
									className="rounded-lg border border-[#DCCBE8] bg-[#FAF7FF] px-3 py-2.5 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB]"
								>
									+ Parent
								</button>

								<button
									type="button"
									onClick={() => {
										if (selectedNodeId) addChild(selectedNodeId);
									}}
									disabled={!selectedNodeId}
									className="rounded-lg bg-[#9B7EBD] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#6F527F] disabled:cursor-not-allowed disabled:opacity-40"
								>
									+ Child
								</button>
							</div>

							<UndoRedoControls />
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto p-3">
							<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#887B91]">
								Map Outline
							</p>

							<MapTree />
						</div>
					</aside>
				)}

				{/* CANVAS */}

				<section className="relative min-w-0 flex-1 bg-[#F8F4FC]">
					{/* DESKTOP SIDEBAR TOGGLES */}

					<div className="absolute right-4 top-4 z-20 flex gap-2">
						<button
							type="button"
							onClick={() => setDesktopLeftOpen((current) => !current)}
							className="mindmap-sidebar-toggle flex items-center gap-2 rounded-lg border border-[#E7DDF0] bg-white px-3 py-2 text-xs font-medium text-[#6F527F] shadow-sm transition hover:bg-[#F1EAFB]"
							aria-label={
								desktopLeftOpen ? "Hide map outline" : "Show map outline"
							}
							title={desktopLeftOpen ? "Hide map outline" : "Show map outline"}
						>
							<Menu size={17} />
							{desktopLeftOpen ? "Hide Sidebar" : "Show Sidebar"}
							<span className="opacity-60">: Q</span>
						</button>
						<button
							type="button"
							onClick={() => setDesktopRightOpen((current) => !current)}
							className="mindmap-sidebar-toggle flex items-center gap-2 rounded-lg border border-[#E7DDF0] bg-white px-3 py-2 text-xs font-medium text-[#6F527F] shadow-sm transition hover:bg-[#F1EAFB]"
							aria-label={
								desktopRightOpen ? "Hide properties" : "Show properties"
							}
							title={desktopRightOpen ? "Hide properties" : "Show properties"}
						>
							<Settings size={17} />
							{desktopRightOpen ? "Hide Properties" : "Show Properties"}
							<span className="opacity-60">: E</span>
						</button>
					</div>

					<MindMapCanvas />
				</section>

				{/* RIGHT SIDEBAR */}

				{desktopRightOpen && <NodeProperties />}
			</div>

			{/* MOBILE */}

			<div className="flex h-full flex-col md:hidden">
				{/* MOBILE HEADER */}

				<header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E7DDF0] bg-white px-3">
					<button
						type="button"
						onClick={() => {
							setMobilePanel("map");
						}}
						className="rounded-lg p-2 text-[#6F527F] hover:bg-[#F1EAFB]"
						aria-label="Open map"
					>
						<Menu size={21} />
					</button>

					<h1
						className="text-sm font-semibold text-[#6F527F]"
						onClick={() => router.push("/dashboard")}
					>
						Riri's Mind Map
					</h1>

					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => {
								setMobilePanel("properties");
							}}
							className="rounded-lg p-2 text-[#6F527F] hover:bg-[#F1EAFB]"
							aria-label="Open properties"
						>
							<Settings size={19} />
						</button>
					</div>
				</header>

				{/* MOBILE CANVAS */}

				<section className="min-h-0 flex-1 bg-[#F8F4FC]">
					<MindMapCanvas />
				</section>
			</div>

			{/* MOBILE MAP DRAWER */}

			{mobilePanel === "map" && (
				<div className="fixed inset-0 z-50 md:hidden">
					{/* BACKDROP */}
					<button
						type="button"
						aria-label="Close map"
						onClick={() => {
							setMobilePanel(null);
						}}
						className="absolute inset-0 bg-[#3F3545]/20"
					/>

					{/* PANEL */}

					<aside className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-xl">
						<div className="flex items-center justify-between items-center border-b border-[#E7DDF0] px-5 py-4">
							<div className="flex flex-col items-left">
								<h2
									className="font-semibold text-[#6F527F]"
									onClick={() => router.push("/dashboard")}
								>
									Map Outline
								</h2>
								<p className="mt-1 text-xs text-[#887B91]">Select a node</p>
							</div>
							<div className="flex gap-1">
								<ThemeToggle />
								<button
									type="button"
									onClick={() => {
										setMobilePanel(null);
									}}
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E7DDF0] bg-[#FAF7FF] text-[#6F527F] transition hover:bg-[#F1EAFB] dark:border-[#51405F] dark:bg-[#30283C] dark:text-[#E8D9F5] dark:hover:bg-[#40334E]"
									aria-label="Close map"
								>
									<X size={18} />
								</button>
							</div>
						</div>

						<div className="flex flex-col gap-2 border-b border-[#E7DDF0] p-4">
							<MapBackup />

							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										addParent(selectedNodeId ?? undefined);
										setMobilePanel(null);
									}}
									className="rounded-lg border border-[#DCCBE8] bg-[#FAF7FF] px-3 py-2.5 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB]"
								>
									+ Parent
								</button>

								<button
									type="button"
									onClick={() => {
										if (selectedNodeId) {
											addChild(selectedNodeId);
										}
									}}
									disabled={!selectedNodeId}
									className="rounded-lg bg-[#9B7EBD] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#6F527F] disabled:opacity-40"
								>
									+ Child
								</button>
							</div>
							<UndoRedoControls />
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto p-3">
							<MapTree />
						</div>
					</aside>
				</div>
			)}
			{/* ========================= */}
			{/* MOBILE PROPERTIES */}
			{/* ========================= */}
			{mobilePanel === "properties" && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						aria-label="Close properties"
						onClick={() => {
							setMobilePanel(null);
						}}
						className="absolute inset-0 bg-[#3F3545]/20"
					/>

					<aside className="absolute inset-y-0 right-0 w-[92%] max-w-sm bg-white shadow-xl">
						<div className="flex items-center justify-between border-b border-[#E7DDF0] px-5 py-4">
							<h2 className="font-semibold text-[#6F527F]">Properties</h2>

							<button
								type="button"
								onClick={() => {
									setMobilePanel(null);
								}}
								className="rounded-lg p-2 text-[#887B91] hover:bg-[#F1EAFB]"
								aria-label="Close properties"
							>
								<X size={18} />
							</button>
						</div>

						<div className="h-[calc(100%-73px)] overflow-y-auto">
							<NodeProperties />
						</div>
					</aside>
				</div>
			)}
		</main>
	);
}
