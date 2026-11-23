"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Download, Upload, X } from "lucide-react";

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
	folder_id: string | null;
	theme: string;
};

const SELECT_COLUMNS = "id,title,nodes,edges,folder_id,theme";

function getLocalDraftKey(userId: string, mapId: string) {
	return `mindmap-local-draft:${userId}:${mapId}`;
}

function isEmptyMap(map: MindMapRow) {
	const nodes = Array.isArray(map.nodes) ? map.nodes : [];
	const edges = Array.isArray(map.edges) ? map.edges : [];

	// A genuinely empty map.
	if (nodes.length === 0 && edges.length === 0) {
		return true;
	}

	// A newly created map has one untouched starter root node.
	if (nodes.length !== 1 || edges.length !== 0) {
		return false;
	}

	const node = nodes[0] as {
		data?: {
			title?: string;
			description?: string;
			parentId?: string | null;
		};
	};

	return (
		node.data?.title === map.title &&
		(node.data?.description ?? "") === "" &&
		node.data?.parentId == null
	);
}

function getFileTitle(fileName: string) {
	const title = fileName.replace(/\.json$/i, "").trim();

	return title || "Imported Mind Map";
}

export default function MapBackup() {
	const nodes = useMindMapStore((state) => state.nodes);
	const edges = useMindMapStore((state) => state.edges);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	/* EXPORT */

	const exportMap = () => {
		const backup = {
			version: 1,
			createdAt: new Date().toISOString(),
			nodes,
			edges,
		};

		const blob = new Blob([JSON.stringify(backup, null, 2)], {
			type: "application/json",
		});

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = "mind-map-backup.json";

		document.body.appendChild(link);
		link.click();
		link.remove();

		URL.revokeObjectURL(url);
	};

	/* IMPORT */

	const importMap = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (!file) return;

		try {
			const text = await file.text();
			const backup = JSON.parse(text);

			if (
				!backup ||
				!Array.isArray(backup.nodes) ||
				!Array.isArray(backup.edges)
			) {
				throw new Error("Invalid backup format.");
			}

			const importedNodes = backup.nodes as MindMapNodes;
			const importedEdges = backup.edges as MindMapEdges;

			const supabase = createClient();

			/* GET AUTHENTICATED USER */

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError) throw userError;

			if (!user) {
				throw new Error("You must be logged in to import a mind map.");
			}

			const userId = user.id;
			const storageKey = `mindmap-active-map:${userId}`;

			/* FIND ACTIVE MAP */

			let activeMap: MindMapRow | null = null;

			const activeMapId = localStorage.getItem(storageKey);

			if (activeMapId) {
				const { data, error } = await supabase
					.from("mind_maps")
					.select(SELECT_COLUMNS)
					.eq("id", activeMapId)
					.eq("user_id", userId)
					.maybeSingle();

				if (error) throw error;

				if (data) {
					activeMap = data as MindMapRow;
				}
			}

			/* FALLBACK TO LATEST MAP */

			if (!activeMap) {
				const { data, error } = await supabase
					.from("mind_maps")
					.select(SELECT_COLUMNS)
					.eq("user_id", userId)
					.order("updated_at", { ascending: false })
					.limit(1)
					.maybeSingle();

				if (error) throw error;

				if (data) {
					activeMap = data as MindMapRow;
				}
			}

			const importTitle = getFileTitle(file.name);

			/* IMPORT INTO EMPTY MAP */

			if (activeMap && isEmptyMap(activeMap)) {
				const { error } = await supabase
					.from("mind_maps")
					.update({
						nodes: importedNodes,
						edges: importedEdges,
					})
					.eq("id", activeMap.id)
					.eq("user_id", userId);

				if (error) throw error;

				// Mark the imported graph as already synchronized.
				// This prevents an older local draft from replacing it.
				localStorage.setItem(
					getLocalDraftKey(userId, activeMap.id),
					JSON.stringify({
						version: 1,
						mapId: activeMap.id,
						revision: 1,
						syncedRevision: 1,
						nodes: importedNodes,
						edges: importedEdges,
					}),
				);

				localStorage.setItem(storageKey, activeMap.id);

				setFeedback({
					type: "success",
					message: "Mind map imported successfully.",
				});

				// Reload from the database to initialize synchronization.
				window.location.assign("/editor");

				return;
			}

			/* CREATE A NEW MAP IF CURRENT MAP HAS CONTENT */

			const newMapId = crypto.randomUUID();

			const { data: newMap, error: createError } = await supabase
				.from("mind_maps")
				.insert({
					id: newMapId,
					user_id: userId,
					folder_id: activeMap?.folder_id ?? null,
					title: importTitle,
					nodes: importedNodes,
					edges: importedEdges,
					viewport: {
						x: 0,
						y: 0,
						zoom: 1,
					},
					theme: activeMap?.theme ?? "purple",
					is_hidden: false,
				})
				.select("id")
				.single();

			if (createError) throw createError;

			/* SWITCH TO THE NEW MAP */

			localStorage.setItem(storageKey, newMap.id);

			setFeedback({
				type: "success",
				message: `Imported "${importTitle}" into a new map.`,
			});

			// Force MindMapDatabaseSync to load the new database record.
			window.location.assign("/editor");
		} catch (error) {
			console.error("Import failed:", error);

			const message =
				typeof error === "object" && error !== null && "message" in error
					? String(error.message)
					: "Invalid mind map backup file.";

			setFeedback({
				type: "error",
				message: `Import failed: ${message}`,
			});
		} finally {
			// Allow the same file to be imported again.
			event.target.value = "";
		}
	};

	return (
		<div className="grid grid-cols-2 gap-2">
			{/* EXPORT */}

			<button
				type="button"
				onClick={exportMap}
				className="flex items-center justify-center gap-2 rounded-lg border border-[#eadde4] bg-white px-3 py-2 text-sm font-medium text-[#8f5f76] transition hover:bg-[#fdeef3]"
			>
				<Download size={15} />
				<span>Export</span>
			</button>

			{/* IMPORT */}

			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				className="flex items-center justify-center gap-2 rounded-lg border border-[#eadde4] bg-white px-3 py-2 text-sm font-medium text-[#8f5f76] transition hover:bg-[#fdeef3]"
			>
				<Upload size={15} />
				<span>Import</span>
			</button>

			{/* FILE INPUT */}

			<input
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				onChange={importMap}
				className="hidden"
			/>
			{feedback && (
				<div
					role={feedback.type === "error" ? "alert" : "status"}
					className={`mt-3 flex items-start justify-between gap-3 rounded-xl border p-3 text-xs ${
						feedback.type === "success"
							? "border-[#DCCBE8] bg-[#F1EAFB] text-[#6F527F]"
							: "border-[#E8C5D5] bg-[#FCEFF4] text-[#A95F7D]"
					}`}
				>
					<p>{feedback.message}</p>

					<button
						type="button"
						onClick={() => setFeedback(null)}
						aria-label="Dismiss notification"
						className="shrink-0"
					>
						<X size={15} />
					</button>
				</div>
			)}
		</div>
	);
}
