"use client";

import { Download, Upload } from "lucide-react";
import { useRef } from "react";

import type { Edge } from "@xyflow/react";

import type { MindMapNode } from "@/types/mindmap";

import { useMindMapStore } from "@/stores/mindmap-store";

export default function MapBackup() {
	const nodes = useMindMapStore((state) => state.nodes);

	const edges = useMindMapStore((state) => state.edges);

	const setNodes = useMindMapStore((state) => state.setNodes);

	const setEdges = useMindMapStore((state) => state.setEdges);

	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const importMap = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (!file) {
			return;
		}

		try {
			const text = await file.text();

			const backup = JSON.parse(text);

			if (!Array.isArray(backup.nodes) || !Array.isArray(backup.edges)) {
				throw new Error("Invalid backup");
			}

			setNodes(backup.nodes as MindMapNode[]);

			setEdges(backup.edges as Edge[]);
		} catch (error) {
			console.error(error);

			alert("Invalid mind map backup file.");
		}

		event.target.value = "";
	};

	return (
		<div className="grid grid-cols-2 gap-2">
			<button
				type="button"
				onClick={exportMap}
				className="flex items-center justify-center gap-2 rounded-lg border border-[#eadde4] bg-white px-3 py-2 text-sm font-medium text-[#8f5f76] hover:bg-[#fdeef3]"
			>
				<Download size={15} />
				Export
			</button>

			<button
				type="button"
				onClick={() => {
					fileInputRef.current?.click();
				}}
				className="flex items-center justify-center gap-2 rounded-lg border border-[#eadde4] bg-white px-3 py-2 text-sm font-medium text-[#8f5f76] hover:bg-[#fdeef3]"
			>
				<Upload size={15} />
				Import
			</button>

			<input
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				onChange={importMap}
				className="hidden"
			/>
		</div>
	);
}
