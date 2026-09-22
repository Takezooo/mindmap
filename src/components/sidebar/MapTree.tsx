"use client";

import { useMindMapStore } from "@/stores/mindmap-store";
import MapTreeItem from "./MapTreeItem";

export default function MapTree() {
	const nodes = useMindMapStore((state) => state.nodes);

	const rootNodes = nodes.filter((node) => node.data.parentId === null);

	return (
		<div className="space-y-1">
			{rootNodes.map((node) => (
				<MapTreeItem key={node.id} node={node} level={0} />
			))}
		</div>
	);
}
