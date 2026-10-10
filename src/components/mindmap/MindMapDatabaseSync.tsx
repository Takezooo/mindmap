"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useMindMapStore } from "@/stores/mindmap-store";

type StoreState = ReturnType<typeof useMindMapStore.getState>;

type MindMapNodes = StoreState["nodes"];
type MindMapEdges = StoreState["edges"];

type MindMapRow = {
	id: string;
	title: string;
	nodes: unknown;
	edges: unknown;
};

type SyncStatus = "loading" | "saving" | "saved" | "error";

const SELECT_COLUMNS = "id,title,nodes,edges";

function getErrorMessage(error: unknown) {
	if (typeof error === "object" && error !== null && "message" in error) {
		return String(error.message);
	}

	return "An unexpected error occurred.";
}

export default function MindMapDatabaseSync() {
	const nodes = useMindMapStore((state) => state.nodes);

	const edges = useMindMapStore((state) => state.edges);

	const setNodes = useMindMapStore((state) => state.setNodes);

	const setEdges = useMindMapStore((state) => state.setEdges);

	const [mapId, setMapId] = useState<string | null>(null);

	const [ready, setReady] = useState(false);

	const [status, setStatus] = useState<SyncStatus>("loading");

	const [errorMessage, setErrorMessage] = useState("");

	// Serialize saves so an older request cannot
	// finish after a newer request and overwrite it.
	const saveQueue = useRef<Promise<void>>(Promise.resolve());

	const saveRevision = useRef(0);

	/*
	 * INITIAL LOAD
	 *
	 * 1. Identify the authenticated user.
	 * 2. Find their active database map.
	 * 3. Create a map if none exists.
	 * 4. Load the saved graph, or seed an empty
	 *    database map from the existing local graph.
	 */
	useEffect(() => {
		let cancelled = false;

		async function initialize() {
			try {
				setStatus("loading");

				const supabase = createClient();

				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError) {
					throw userError;
				}

				if (!user) {
					throw new Error("No authenticated user was found.");
				}

				const storageKey = `mindmap-active-map:${user.id}`;

				const localState = useMindMapStore.getState();

				const localNodes = localState.nodes;

				const localEdges = localState.edges;

				// Use a stable candidate ID. This also
				// prevents duplicate map creation when
				// React Strict Mode runs initialization twice.
				let candidateId = window.localStorage.getItem(storageKey);

				if (!candidateId) {
					candidateId = crypto.randomUUID();

					window.localStorage.setItem(storageKey, candidateId);
				}

				let row: MindMapRow | null = null;

				// First, find the previously selected map.
				const { data: activeMap, error: activeMapError } = await supabase
					.from("mind_maps")
					.select(SELECT_COLUMNS)
					.eq("id", candidateId)
					.eq("user_id", user.id)
					.maybeSingle();

				if (activeMapError) {
					throw activeMapError;
				}

				if (activeMap) {
					row = activeMap as MindMapRow;
				}

				// If there is no remembered map, use the
				// most recently updated map belonging to
				// the current user.
				if (!row) {
					const { data: latestMap, error: latestMapError } = await supabase
						.from("mind_maps")
						.select(SELECT_COLUMNS)
						.eq("user_id", user.id)
						.order("updated_at", {
							ascending: false,
						})
						.limit(1)
						.maybeSingle();

					if (latestMapError) {
						throw latestMapError;
					}

					if (latestMap) {
						row = latestMap as MindMapRow;
					}
				}

				// If the user has no maps, create the first
				// one using the existing editor state.
				if (!row) {
					const { data: newMap, error: createError } = await supabase
						.from("mind_maps")
						.insert({
							id: candidateId,
							user_id: user.id,
							title: "My First Mind Map",
							nodes: localNodes,
							edges: localEdges,
							viewport: {
								x: 0,
								y: 0,
								zoom: 1,
							},
							theme: "purple",
							is_hidden: false,
						})
						.select(SELECT_COLUMNS)
						.single();

					if (createError) {
						// Another initialization may already
						// have created this same map ID.
						if (createError.code === "23505") {
							const { data: existingMap, error: existingError } = await supabase
								.from("mind_maps")
								.select(SELECT_COLUMNS)
								.eq("id", candidateId)
								.eq("user_id", user.id)
								.maybeSingle();

							if (existingError) {
								throw existingError;
							}

							if (!existingMap) {
								throw createError;
							}

							row = existingMap as MindMapRow;
						} else {
							throw createError;
						}
					} else {
						row = newMap as MindMapRow;
					}
				}

				if (!row) {
					throw new Error("A mind map could not be loaded or created.");
				}

				const databaseNodes = Array.isArray(row.nodes) ? row.nodes : [];

				const databaseEdges = Array.isArray(row.edges) ? row.edges : [];

				if (databaseNodes.length > 0) {
					// Existing database content takes priority.
					if (!cancelled) {
						setNodes(databaseNodes as MindMapNodes);

						setEdges(databaseEdges as MindMapEdges);
					}
				} else if (localNodes.length > 0) {
					// Protect existing work if the database
					// row was empty or was created for testing.
					const { error: seedError } = await supabase
						.from("mind_maps")
						.update({
							nodes: localNodes,
							edges: localEdges,
						})
						.eq("id", row.id)
						.eq("user_id", user.id);

					if (seedError) {
						throw seedError;
					}
				} else {
					if (!cancelled) {
						setNodes(databaseNodes as MindMapNodes);

						setEdges(databaseEdges as MindMapEdges);
					}
				}

				window.localStorage.setItem(storageKey, row.id);

				if (!cancelled) {
					setMapId(row.id);
					setReady(true);
					setStatus("saved");
					setErrorMessage("");
				}
			} catch (error) {
				console.error("Mind map database initialization failed:", error);

				if (!cancelled) {
					setStatus("error");

					setErrorMessage(getErrorMessage(error));
				}
			}
		}

		void initialize();

		return () => {
			cancelled = true;
		};
	}, [setNodes, setEdges]);

	/*
	 * AUTOMATIC DATABASE SAVE
	 *
	 * Wait briefly after changes so dragging or
	 * typing doesn't generate a database request
	 * for every individual movement or keystroke.
	 */
	useEffect(() => {
		if (!ready || !mapId) {
			return;
		}

		const nodesSnapshot = nodes;
		const edgesSnapshot = edges;

		const timer = window.setTimeout(() => {
			const revision = ++saveRevision.current;

			setStatus("saving");
			setErrorMessage("");

			const saveOperation = saveQueue.current
				.catch(() => undefined)
				.then(async () => {
					const supabase = createClient();

					const { error: saveError } = await supabase
						.from("mind_maps")
						.update({
							nodes: nodesSnapshot,
							edges: edgesSnapshot,
						})
						.eq("id", mapId);

					if (saveError) {
						throw saveError;
					}
				});

			saveQueue.current = saveOperation;

			void saveOperation
				.then(() => {
					if (revision === saveRevision.current) {
						setStatus("saved");
						setErrorMessage("");
					}
				})
				.catch((error: unknown) => {
					console.error("Mind map save failed:", error);

					if (revision === saveRevision.current) {
						setStatus("error");

						setErrorMessage(getErrorMessage(error));
					}
				});
		}, 800);

		return () => {
			window.clearTimeout(timer);
		};
	}, [nodes, edges, ready, mapId]);

	const statusLabel = {
		loading: "Loading your map...",
		saving: "Saving to cloud...",
		saved: "Saved to cloud",
		error: "Database save failed",
	}[status];

	return (
		<>
			{/* Cloud save indicator */}
			<div
				title={errorMessage || statusLabel}
				aria-live="polite"
				className={`fixed bottom-3 right-3 z-[60] rounded-full px-3 py-2 text-xs font-medium shadow-sm ${
					status === "error"
						? "bg-[#FCEFF4] text-[#A95F7D]"
						: status === "saved"
							? "bg-[#EAF5EF] text-[#386B50]"
							: "bg-[#F1EAFB] text-[#6F527F]"
				}`}
			>
				{statusLabel}
			</div>

			{/* Avoid editing before the saved map loads. */}
			{!ready && status === "loading" && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF7FF]/95 px-6">
					<div className="text-center">
						<p className="font-semibold text-[#6F527F]">
							Loading your mind map
						</p>

						<p className="mt-2 text-sm text-[#887B91]">
							Connecting to your saved data...
						</p>
					</div>
				</div>
			)}
		</>
	);
}
