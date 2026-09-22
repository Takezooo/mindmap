"use client";

import { useMindMapStore } from "@/stores/mindmap-store";
import type { NodeColor, NodeShape } from "@/types/mindmap";

const shapes: NodeShape[] = [
	"rectangle",
	"rounded",
	"circle",
	"diamond",
	"pill",
];

const colors: NodeColor[] = [
	"rose",
	"lavender",
	"peach",
	"mint",
	"blue",
	"cream",
];

const colorClasses: Record<NodeColor, string> = {
	rose: "bg-[#fde8f0] border-[#e8b4c7]",
	lavender: "bg-[#eee9f7] border-[#c9bce0]",
	peach: "bg-[#fff0e6] border-[#edc6ad]",
	mint: "bg-[#e8f5ef] border-[#b9dccb]",
	blue: "bg-[#eaf2fb] border-[#bdd2e8]",
	cream: "bg-[#fff8df] border-[#ead9a5]",
};

export default function NodeProperties() {
	const nodes = useMindMapStore((state) => state.nodes);

	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const updateNode = useMindMapStore((state) => state.updateNode);

	const deleteNode = useMindMapStore((state) => state.deleteNode);

	const node = nodes.find((item) => item.id === selectedNodeId);

	if (!node) {
		return (
			<aside className="h-full w-full bg-white md:w-80 md:shrink-0 md:border-l md:border-[#eadde4]">
				{" "}
				<div className="p-5">
					<p className="text-sm text-[#9b8993]">
						Select a node to edit its properties.
					</p>
				</div>
			</aside>
		);
	}

	return (
		<aside className="h-full w-full bg-white md:w-80 md:shrink-0 md:border-l md:border-[#eadde4]">
			{" "}
			<div className="border-b border-[#eadde4] px-5 py-4">
				<h2 className="font-semibold text-[#8f5f76]">Node Properties</h2>

				<p className="mt-1 text-xs text-[#a99aa3]">Edit the selected node</p>
			</div>
			<div className="space-y-5 p-5">
				{/* TITLE */}
				<div>
					<label
						htmlFor="node-title"
						className="mb-1.5 block text-sm font-medium"
					>
						Title
					</label>

					<input
						id="node-title"
						type="text"
						value={node.data.title}
						onChange={(event) => {
							updateNode(node.id, {
								title: event.target.value,
							});
						}}
						className="w-full rounded-lg border border-[#eadde4] bg-[#fffafc] px-3 py-2 text-sm outline-none transition focus:border-[#c77d9b] focus:ring-2 focus:ring-[#f6dce7]"
					/>
				</div>

				{/* DESCRIPTION */}
				<div>
					<label
						htmlFor="node-description"
						className="mb-1.5 block text-sm font-medium"
					>
						Description
					</label>

					<textarea
						id="node-description"
						value={node.data.description}
						onChange={(event) => {
							updateNode(node.id, {
								description: event.target.value,
							});
						}}
						rows={7}
						placeholder="Add notes or explanation..."
						className="w-full resize-none rounded-lg border border-[#eadde4] bg-[#fffafc] px-3 py-2 text-sm outline-none transition focus:border-[#c77d9b] focus:ring-2 focus:ring-[#f6dce7]"
					/>
				</div>

				{/* SHAPE */}
				<div>
					<label
						htmlFor="node-shape"
						className="mb-1.5 block text-sm font-medium"
					>
						Shape
					</label>

					<select
						id="node-shape"
						value={node.data.shape}
						onChange={(event) => {
							updateNode(node.id, {
								shape: event.target.value as NodeShape,
							});
						}}
						className="w-full rounded-lg border border-[#eadde4] bg-[#fffafc] px-3 py-2 text-sm outline-none focus:border-[#c77d9b]"
					>
						{shapes.map((shape) => (
							<option key={shape} value={shape}>
								{shape}
							</option>
						))}
					</select>
				</div>

				{/* COLOR */}
				<div>
					<label className="mb-2 block text-sm font-medium">Color</label>

					<div className="grid grid-cols-3 gap-2">
						{colors.map((color) => {
							const isSelected = node.data.color === color;

							return (
								<button
									key={color}
									type="button"
									onClick={() => {
										updateNode(node.id, {
											color,
										});
									}}
									aria-label={`Use ${color} color`}
									title={color}
									className={`h-10 rounded-lg border-2 transition ${
										colorClasses[color]
									} ${
										isSelected
											? "ring-2 ring-[#c77d9b] ring-offset-2"
											: "hover:scale-105"
									}`}
								/>
							);
						})}
					</div>
				</div>

				{/* MAX CHILDREN */}
				<div>
					<label
						htmlFor="node-max-children"
						className="mb-1.5 block text-sm font-medium"
					>
						Maximum Children
					</label>

					<input
						id="node-max-children"
						type="number"
						min={0}
						value={node.data.maxChildren}
						onChange={(event) => {
							const value = Number(event.target.value);

							updateNode(node.id, {
								maxChildren: Math.max(0, value),
							});
						}}
						className="w-full rounded-lg border border-[#eadde4] bg-[#fffafc] px-3 py-2 text-sm outline-none focus:border-[#c77d9b] focus:ring-2 focus:ring-[#f6dce7]"
					/>
				</div>

				{/* DELETE */}
				<div className="border-t border-[#eadde4] pt-5">
					<button
						type="button"
						onClick={() => {
							deleteNode(node.id);
						}}
						className="w-full rounded-lg border border-[#efc5d0] px-3 py-2 text-sm font-medium text-[#c05f78] transition hover:bg-[#fff1f4]"
					>
						Delete Node
					</button>
				</div>
			</div>
		</aside>
	);
}
