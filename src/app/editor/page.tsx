"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { Menu, X } from "lucide-react";

import MindMapCanvas from "@/components/mindmap/MindMapCanvas";

import NodeProperties from "@/components/mindmap/NodeProperties";

import MindMapDatabaseSync from "@/components/mindmap/MindMapDatabaseSync";
import UndoRedoControls from "@/components/mindmap/UndoRedoControls";
import MapTree from "@/components/sidebar/MapTree";
import MapBackup from "@/components/mindmap/MapBackup";
import HelpButton from "@/components/help/HelpButton";

import { getFlashcardDecks, generateFlashcardsFromMap } from "@/lib/flashcards";
import type { FlashcardDeck } from "@/types/flashcard";

import { useMindMapStore } from "@/stores/mindmap-store";

type MobilePanel = "map" | "properties" | null;

export default function EditorPage() {
	const router = useRouter();

	const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
	const [desktopLeftOpen, setDesktopLeftOpen] = useState(true);
	const [desktopRightOpen, setDesktopRightOpen] = useState(true);

	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const [activeMapTitle, setActiveMapTitle] = useState("Loading map...");

	const [activeMapId, setActiveMapId] = useState<string | null>(null);
	const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

	const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
	const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);

	const [deckMode, setDeckMode] = useState<"new" | "existing">("new");
	const [selectedDeckId, setSelectedDeckId] = useState("");

	const [generationScope, setGenerationScope] = useState<"selected" | "all">(
		"all",
	);

	const [flashcardLoading, setFlashcardLoading] = useState(false);
	const [flashcardDecksLoading, setFlashcardDecksLoading] = useState(false);

	const [flashcardError, setFlashcardError] = useState("");
	const [flashcardResult, setFlashcardResult] = useState<{
		generatedCount: number;
		skippedCount: number;
		deckTitle: string;
	} | null>(null);

	const addChild = useMindMapStore((state) => state.addChild);
	const addParent = useMindMapStore((state) => state.addParent);

	async function handleOpenFlashcardDialog() {
		setFlashcardDialogOpen(true);
		setFlashcardError("");
		setFlashcardResult(null);

		const nodes = useMindMapStore.getState().nodes;

		const selectedNodes = nodes.filter((node) => node.selected);

		setGenerationScope(
			selectedNodes.length > 0 ||
				(Boolean(selectedNodeId) &&
					nodes.some((node) => node.id === selectedNodeId))
				? "selected"
				: "all",
		);

		setFlashcardDecksLoading(true);

		try {
			const decks = await getFlashcardDecks();
			setFlashcardDecks(decks);
		} catch (error) {
			setFlashcardError(
				error instanceof Error
					? error.message
					: "Failed to load flashcard decks.",
			);
		} finally {
			setFlashcardDecksLoading(false);
		}
	}

	async function handleGenerateFlashcards() {
		if (!activeMapId) {
			setFlashcardError("No active mind map was found.");
			return;
		}

		const currentNodes = useMindMapStore.getState().nodes;

		const selectedNodes = currentNodes.filter((node) => node.selected);

		const nodesToGenerate =
			generationScope === "selected"
				? selectedNodes.length > 0
					? selectedNodes
					: currentNodes.filter((node) => node.id === selectedNodeId)
				: currentNodes;

		const eligibleNodes = nodesToGenerate.filter(
			(node) =>
				node.data.title.trim().length > 0 &&
				node.data.description.trim().length > 0,
		);

		if (eligibleNodes.length === 0) {
			setFlashcardError(
				"No eligible nodes found. Nodes need both a title and description.",
			);
			return;
		}

		if (deckMode === "existing" && !selectedDeckId) {
			setFlashcardError("Please select an existing deck.");
			return;
		}

		setFlashcardLoading(true);
		setFlashcardError("");
		setFlashcardResult(null);

		try {
			const result = await generateFlashcardsFromMap({
				mapId: activeMapId,
				mapTitle: activeMapTitle,
				folderId: activeFolderId,
				nodes: eligibleNodes,
				deckId: deckMode === "existing" ? selectedDeckId : undefined,
			});

			setFlashcardResult({
				generatedCount: result.generatedCount,
				skippedCount: result.skippedCount,
				deckTitle: result.deck.title,
			});

			if (result.generatedCount > 0) {
				const updatedDecks = await getFlashcardDecks();
				setFlashcardDecks(updatedDecks);
			}
		} catch (error) {
			setFlashcardError(
				error instanceof Error
					? error.message
					: "Failed to generate flashcards.",
			);
		} finally {
			setFlashcardLoading(false);
		}
	}

	useEffect(() => {
		function handleMapLoaded(event: Event) {
			const customEvent = event as CustomEvent<{
				title?: string;
				mapId?: string;
				folderId?: string | null;
			}>;

			setActiveMapTitle(customEvent.detail?.title || "Untitled Mind Map");

			setActiveMapId(customEvent.detail?.mapId ?? null);
			setActiveFolderId(customEvent.detail?.folderId ?? null);
		}

		window.addEventListener("mindmap:map-loaded", handleMapLoaded);

		return () => {
			window.removeEventListener("mindmap:map-loaded", handleMapLoaded);
		};
	}, []);

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
							<div className="mb-4 px-2">
								<p
									className="truncate text-sm font-semibold text-[#6F527F]"
									title={activeMapTitle}
								>
									{activeMapTitle}
								</p>

								<p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#887B91]">
									Map Outline
								</p>
							</div>

							<MapTree />
						</div>
					</aside>
				)}

				{/* CANVAS */}

				<section className="relative min-w-0 flex-1 bg-[#F8F4FC]">
					{/* DESKTOP SIDEBAR TOGGLES */}

					<div className="absolute right-4 top-4 z-20 flex gap-2">
						<HelpButton />
					</div>

					<MindMapCanvas
						onToggleSidebar={() => setDesktopLeftOpen((current) => !current)}
						onToggleProperties={() =>
							setDesktopRightOpen((current) => !current)
						}
						onGenerateFlashcards={handleOpenFlashcardDialog}
					/>
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
						<HelpButton />
					</div>
				</header>

				{/* MOBILE CANVAS */}

				<section className="min-h-0 flex-1 bg-[#F8F4FC]">
					<MindMapCanvas
						onToggleSidebar={() =>
							setMobilePanel((current) => (current === "map" ? null : "map"))
						}
						onToggleProperties={() =>
							setMobilePanel((current) =>
								current === "properties" ? null : "properties",
							)
						}
						onGenerateFlashcards={handleOpenFlashcardDialog}
					/>
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
							<div className="min-w-0 flex-1">
								<p
									className="truncate text-sm font-semibold text-[#6F527F]"
									title={activeMapTitle}
								>
									{activeMapTitle}
								</p>

								<h2 className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#887B91]">
									Map Outline
								</h2>
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
			{flashcardDialogOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl border border-[#E7DDF0] bg-white p-5 shadow-xl dark:border-[#51405F] dark:bg-[#241E2D]">
						<div className="mb-5 flex items-center justify-between">
							<div>
								<h2 className="text-lg font-bold text-[#6F527F] dark:text-[#E8D9F5]">
									Generate Flashcards
								</h2>

								<p className="mt-1 text-xs text-[#887B91] dark:text-[#B9A9C8]">
									From {activeMapTitle}
								</p>
							</div>

							<button
								type="button"
								onClick={() => setFlashcardDialogOpen(false)}
								disabled={flashcardLoading}
								className="rounded-lg p-2 text-[#887B91] hover:bg-[#F1EAFB] disabled:opacity-40 dark:hover:bg-[#40334E]"
							>
								<X size={18} />
							</button>
						</div>

						{!flashcardResult && (
							<>
								{/* NODE SCOPE */}

								<div className="mb-5">
									<p className="mb-2 text-sm font-semibold text-[#6F527F] dark:text-[#E8D9F5]">
										Generate from
									</p>

									<div className="space-y-2">
										<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E7DDF0] p-3 text-sm dark:border-[#51405F] dark:text-[#E8D9F5]">
											<input
												type="radio"
												name="generationScope"
												value="all"
												checked={generationScope === "all"}
												onChange={() => setGenerationScope("all")}
												className="accent-[#9B7EBD]"
											/>
											All eligible nodes
										</label>

										<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E7DDF0] p-3 text-sm dark:border-[#51405F] dark:text-[#E8D9F5]">
											<input
												type="radio"
												name="generationScope"
												value="selected"
												checked={generationScope === "selected"}
												onChange={() => setGenerationScope("selected")}
												className="accent-[#9B7EBD]"
											/>
											Selected nodes
										</label>
									</div>

									<p className="mt-2 text-xs text-[#887B91] dark:text-[#B9A9C8]">
										Only nodes with both a title and description are included.
									</p>
								</div>

								{/* DECK DESTINATION */}

								<div className="mb-5">
									<p className="mb-2 text-sm font-semibold text-[#6F527F] dark:text-[#E8D9F5]">
										Save flashcards to
									</p>

									<div className="space-y-2">
										<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E7DDF0] p-3 text-sm dark:border-[#51405F] dark:text-[#E8D9F5]">
											<input
												type="radio"
												name="deckMode"
												checked={deckMode === "new"}
												onChange={() => setDeckMode("new")}
												className="accent-[#9B7EBD]"
											/>
											Create a new deck
										</label>

										<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E7DDF0] p-3 text-sm dark:border-[#51405F] dark:text-[#E8D9F5]">
											<input
												type="radio"
												name="deckMode"
												checked={deckMode === "existing"}
												onChange={() => setDeckMode("existing")}
												className="accent-[#9B7EBD]"
											/>
											Add to an existing deck
										</label>
									</div>

									{deckMode === "existing" && (
										<div className="mt-3">
											{flashcardDecksLoading ? (
												<p className="text-sm text-[#887B91]">
													Loading decks...
												</p>
											) : flashcardDecks.length === 0 ? (
												<p className="text-sm text-[#887B91]">
													No existing decks found. Create a new deck instead.
												</p>
											) : (
												<select
													value={selectedDeckId}
													onChange={(event) =>
														setSelectedDeckId(event.target.value)
													}
													className="w-full rounded-lg border border-[#DCCBE8] bg-white px-3 py-2.5 text-sm text-[#3F3545] outline-none focus:border-[#9B7EBD] dark:border-[#51405F] dark:bg-[#30283C] dark:text-[#E8D9F5]"
												>
													<option value="">Select a deck</option>

													{flashcardDecks.map((deck) => (
														<option key={deck.id} value={deck.id}>
															{deck.title}
														</option>
													))}
												</select>
											)}
										</div>
									)}
								</div>
							</>
						)}

						{/* ERROR */}

						{flashcardError && (
							<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
								{flashcardError}
							</div>
						)}

						{/* RESULT */}

						{flashcardResult && (
							<div className="mb-5 rounded-xl border border-[#DCCBE8] bg-[#FAF7FF] p-4 dark:border-[#51405F] dark:bg-[#30283C]">
								<h3 className="font-semibold text-[#6F527F] dark:text-[#E8D9F5]">
									Generation complete
								</h3>

								<p className="mt-1 text-sm text-[#887B91] dark:text-[#B9A9C8]">
									{flashcardResult.deckTitle}
								</p>

								<div className="mt-4 grid grid-cols-2 gap-3">
									<div className="rounded-lg bg-white p-3 dark:bg-[#241E2D]">
										<p className="text-2xl font-bold text-[#6F527F] dark:text-[#E8D9F5]">
											{flashcardResult.generatedCount}
										</p>
										<p className="text-xs text-[#887B91]">Cards generated</p>
									</div>

									<div className="rounded-lg bg-white p-3 dark:bg-[#241E2D]">
										<p className="text-2xl font-bold text-[#6F527F] dark:text-[#E8D9F5]">
											{flashcardResult.skippedCount}
										</p>
										<p className="text-xs text-[#887B91]">Nodes skipped</p>
									</div>
								</div>
							</div>
						)}

						{/* ACTIONS */}

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									setFlashcardDialogOpen(false);
									setFlashcardError("");
									setFlashcardResult(null);
								}}
								disabled={flashcardLoading}
								className="rounded-lg border border-[#DCCBE8] px-4 py-2 text-sm font-medium text-[#6F527F] hover:bg-[#F1EAFB] disabled:opacity-40 dark:border-[#51405F] dark:text-[#E8D9F5] dark:hover:bg-[#40334E]"
							>
								{flashcardResult ? "Close" : "Cancel"}
							</button>

							{!flashcardResult && (
								<button
									type="button"
									onClick={handleGenerateFlashcards}
									disabled={
										flashcardLoading ||
										flashcardDecksLoading ||
										!activeMapId ||
										(deckMode === "existing" &&
											(!selectedDeckId || flashcardDecks.length === 0))
									}
									className="rounded-lg bg-[#9B7EBD] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6F527F] disabled:cursor-not-allowed disabled:opacity-50"
								>
									{flashcardLoading ? "Generating..." : "Generate"}
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
