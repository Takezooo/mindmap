"use client";

import { useState } from "react";
import type { Node } from "@xyflow/react";
import { useMindMapStore } from "@/stores/mindmap-store";

import type { MindMapNode } from "@/types/mindmap";

interface Props {
	node: MindMapNode;
	level: number;
}

export default function MapTreeItem({ node, level }: Props) {
	const [expanded, setExpanded] = useState(true);

	const nodes = useMindMapStore((state) => state.nodes);

	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const selectNode = useMindMapStore((state) => state.selectNode);

	const children = nodes.filter((child) => child.data.parentId === node.id);

	const hasChildren = children.length > 0;

	const isSelected = selectedNodeId === node.id;

	return (
		<div>
			<div
				className={`flex items-center gap-1 rounded px-2 py-1 ${
					isSelected ? "bg-gray-100" : "hover:bg-gray-50"
				}`}
				style={{
					paddingLeft: `${level * 16 + 8}px`,
				}}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="h-5 w-5 text-xs"
					>
						{expanded ? "▼" : "▶"}
					</button>
				) : (
					<span className="h-5 w-5" />
				)}

				<button
					type="button"
					onClick={() => {
						selectNode(node.id);
					}}
					className="flex-1 truncate text-left text-sm"
				>
					{node.data.title}
				</button>
			</div>

			{expanded &&
				children.map((child) => (
					<MapTreeItem key={child.id} node={child} level={level + 1} />
				))}
		</div>
	);
}
