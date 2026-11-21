"use client";

import { useState } from "react";
import { useMindMapStore } from "@/stores/mindmap-store";

import type { Node } from "@xyflow/react";
import type { MindMapNodeData } from "@/types/mindmap";

interface Props {
	node: Node<MindMapNodeData>;
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
				className={`map-tree-item flex items-center gap-1 rounded-md px-2 py-1 ${
					isSelected ? "map-tree-item-selected" : ""
				}`}
				style={{
					paddingLeft: `${level * 16 + 8}px`,
				}}
			>
				{hasChildren ? (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="map-tree-expand h-5 w-5 shrink-0 rounded text-xs"
						aria-label={expanded ? "Collapse node" : "Expand node"}
					>
						{expanded ? "▼" : "▶"}
					</button>
				) : (
					<span className="h-5 w-5 shrink-0" />
				)}

				<button
					type="button"
					onClick={() => selectNode(node.id)}
					className="map-tree-label min-w-0 flex-1 truncate text-left text-sm"
					aria-current={isSelected ? "true" : undefined}
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
