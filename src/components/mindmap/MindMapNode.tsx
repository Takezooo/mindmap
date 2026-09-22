"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { MindMapNode } from "@/types/mindmap";

function getShapeClass(shape: MindMapNodeData["shape"]) {
	switch (shape) {
		case "circle":
			return "h-32 w-32 rounded-full flex items-center justify-center";

		case "diamond":
			return "h-32 w-32 rotate-45 flex items-center justify-center";

		case "pill":
			return "rounded-full";

		case "rounded":
			return "rounded-xl";

		case "rectangle":
		default:
			return "rounded-lg";
	}
}

function getColorClass(color: MindMapNodeData["color"]) {
	switch (color) {
		case "rose":
			return "bg-[#fde8f0] border-[#e8b4c7]";

		case "lavender":
			return "bg-[#eee9f7] border-[#c9bce0]";

		case "peach":
			return "bg-[#fff0e6] border-[#edc6ad]";

		case "mint":
			return "bg-[#e8f5ef] border-[#b9dccb]";

		case "blue":
			return "bg-[#eaf2fb] border-[#bdd2e8]";

		case "cream":
			return "bg-[#fff8df] border-[#ead9a5]";

		default:
			return "bg-white border-[#eadde4]";
	}
}

export default function MindMapNode({
	data,
	selected,
}: NodeProps<MindMapNode>) {
	const shapeClass = getShapeClass(data.shape);

	const colorClass = getColorClass(data.color);

	const isDiamond = data.shape === "diamond";

	return (
		<div className="relative">
			<Handle
				type="target"
				position={Position.Left}
				className="!bg-[#c77d9b]"
			/>

			<div
				className={`min-w-[140px] border px-5 py-3 shadow-sm transition ${shapeClass} ${colorClass} ${
					selected ? "border-2 border-[#a85f7d] shadow-md" : ""
				}`}
			>
				<div
					className={
						isDiamond
							? "-rotate-45 text-center font-medium text-[#4b3d46]"
							: "text-center font-medium text-[#4b3d46]"
					}
				>
					{data.title}
				</div>
			</div>

			<Handle
				type="source"
				position={Position.Right}
				className="!bg-[#c77d9b]"
			/>
		</div>
	);
}
