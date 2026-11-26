"use client";

import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";

import {
	Handle,
	NodeResizer,
	Position,
	useReactFlow,
	type NodeProps,
	type Node,
} from "@xyflow/react";

import type { MindMapNodeData } from "@/types/mindmap";
import { useMindMapStore } from "@/stores/mindmap-store";

export const MindMapModeContext = createContext(false);

function getShapeClass(shape: MindMapNodeData["shape"]) {
	switch (shape) {
		case "circle":
			return "min-h-32 min-w-32 rounded-full flex items-center justify-center";

		case "diamond":
			return "min-h-32 min-w-32 rounded-sm rotate-45 flex items-center justify-center";

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
	id,
	data,
	selected,
	width,
	height,
}: NodeProps<Node<MindMapNodeData>>) {
	const { updateNodeData, getViewport } = useReactFlow();
	const resizeMode = useContext(MindMapModeContext);
	const resizeSnapshotRef = useRef<{
		nodes: Node<MindMapNodeData>[];
		edges: ReturnType<typeof useMindMapStore.getState>["edges"];
	} | null>(null);

	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [draftTitle, setDraftTitle] = useState(data.title ?? "");
	const [draftDescription, setDraftDescription] = useState(
		data.description ?? "",
	);

	const titleRef = useRef<HTMLTextAreaElement>(null);
	const descriptionRef = useRef<HTMLTextAreaElement>(null);
	const cancelBlurRef = useRef(false);
	const nodeContentRef = useRef<HTMLDivElement>(null);

	const shapeClass = getShapeClass(data.shape);
	const colorClass = getColorClass(data.color);

	const isDiamond = data.shape === "diamond";
	const descriptionVisible = data.descriptionVisible ?? false;

	const previousDescriptionVisibleRef = useRef(descriptionVisible);

	// Measure the rendered DOM after the description has expanded. React Flow's
	// measured dimensions can still be stale on the first render after expansion.
	// Only this node is repositioned; every other node keeps its exact position.
	useLayoutEffect(() => {
		const wasVisible = previousDescriptionVisibleRef.current;
		previousDescriptionVisibleRef.current = descriptionVisible;
		if (!descriptionVisible || wasVisible) return;

		let firstFrame = 0;
		let secondFrame = 0;
		firstFrame = window.requestAnimationFrame(() => {
			secondFrame = window.requestAnimationFrame(() => {
				const ownElement = nodeContentRef.current;
				if (!ownElement) return;

				const ownRect = ownElement.getBoundingClientRect();
				if (!ownRect.width || !ownRect.height) return;

				const flowNodes = useMindMapStore.getState().nodes;
				const visibleIds = new Set(
					flowNodes.filter((node) => !node.hidden).map((node) => node.id),
				);
				const obstacles = Array.from(
					document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"),
				)
					.filter(
						(element) =>
							element.dataset.id !== id &&
							visibleIds.has(element.dataset.id ?? ""),
					)
					.map((element) => element.getBoundingClientRect())
					.filter((rect) => rect.width > 0 && rect.height > 0);

				const gap = 16;
				const overlaps = (left: number, top: number) =>
					obstacles.some(
						(rect) =>
							left < rect.right + gap &&
							left + ownRect.width + gap > rect.left &&
							top < rect.bottom + gap &&
							top + ownRect.height + gap > rect.top,
					);

				if (!overlaps(ownRect.left, ownRect.top)) return;

				const xCandidates = new Set<number>([ownRect.left]);
				const yCandidates = new Set<number>([ownRect.top]);
				for (const rect of obstacles) {
					xCandidates.add(rect.left - ownRect.width - gap);
					xCandidates.add(rect.right + gap);
					yCandidates.add(rect.top - ownRect.height - gap);
					yCandidates.add(rect.bottom + gap);
				}

				let best: { left: number; top: number; distance: number } | null = null;
				for (const left of xCandidates) {
					for (const top of yCandidates) {
						if (overlaps(left, top)) continue;
						const distance = Math.hypot(left - ownRect.left, top - ownRect.top);
						if (distance > 0 && (!best || distance < best.distance)) {
							best = { left, top, distance };
						}
					}
				}

				if (!best) return;
				const zoom = getViewport().zoom || 1;
				const deltaX = (best.left - ownRect.left) / zoom;
				const deltaY = (best.top - ownRect.top) / zoom;
				const latest = useMindMapStore.getState();
				latest.setNodes(
					latest.nodes.map((node) =>
						node.id === id
							? {
									...node,
									position: {
										x: node.position.x + deltaX,
										y: node.position.y + deltaY,
									},
								}
							: node,
					),
				);
			});
		});

		return () => {
			if (firstFrame) window.cancelAnimationFrame(firstFrame);
			if (secondFrame) window.cancelAnimationFrame(secondFrame);
		};
	}, [descriptionVisible, getViewport, id]);

	useEffect(() => {
		setDraftTitle(data.title ?? "");
	}, [data.title]);

	useEffect(() => {
		setDraftDescription(data.description ?? "");
	}, [data.description]);

	// Automatically resize the title textarea to fit its content.
	useLayoutEffect(() => {
		const textarea = titleRef.current;
		if (!textarea) return;

		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, [draftTitle, isEditingTitle]);

	// Automatically resize the description textarea to fit its content.
	useLayoutEffect(() => {
		const textarea = descriptionRef.current;
		if (!textarea) return;

		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, [draftDescription, descriptionVisible]);

	useEffect(() => {
		if (isEditingTitle) {
			titleRef.current?.focus();
			titleRef.current?.select();
		}
	}, [isEditingTitle]);

	function saveTitle() {
		const nextTitle = draftTitle.trim();

		if (!nextTitle) {
			setDraftTitle(data.title ?? "");
			setIsEditingTitle(false);
			return;
		}

		if (nextTitle !== data.title) {
			updateNodeData(id, {
				title: nextTitle,
			});
		}

		setIsEditingTitle(false);
	}

	function cancelTitleEditing() {
		cancelBlurRef.current = true;

		setDraftTitle(data.title ?? "");
		setIsEditingTitle(false);

		titleRef.current?.blur();
	}

	function handleTitleBlur() {
		if (cancelBlurRef.current) {
			cancelBlurRef.current = false;
			return;
		}

		saveTitle();
	}

	function handleTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		event.stopPropagation();

		// Shift + Enter inserts a new line.
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			saveTitle();
		}

		if (event.key === "Escape") {
			event.preventDefault();
			cancelTitleEditing();
		}
	}

	function toggleDescription() {
		updateNodeData(id, {
			descriptionVisible: !descriptionVisible,
		});
	}

	function handleDescriptionChange(value: string) {
		setDraftDescription(value);

		// Update immediately so local persistence captures the latest description.
		updateNodeData(id, {
			description: value,
		});
	}

	function handleResizeStart() {
		const state = useMindMapStore.getState();

		resizeSnapshotRef.current = {
			nodes: state.nodes,
			edges: state.edges,
		};

		useMindMapStore.temporal.getState().pause();
	}

	function handleResizeEnd() {
		const before = resizeSnapshotRef.current;
		const history = useMindMapStore.temporal;

		history.getState().resume();
		resizeSnapshotRef.current = null;

		if (!before) return;

		const current = useMindMapStore.getState();
		const hasResized = before.nodes.some((previousNode) => {
			const currentNode = current.nodes.find(
				(node) => node.id === previousNode.id,
			);

			return (
				currentNode &&
				(currentNode.width !== previousNode.width ||
					currentNode.height !== previousNode.height)
			);
		});

		if (!hasResized) return;

		history.setState((state) => ({
			pastStates: [...state.pastStates, before].slice(-100),
			futureStates: [],
		}));
	}

	return (
		<div ref={nodeContentRef} className="relative">
			<NodeResizer
				isVisible={selected && resizeMode}
				minWidth={140}
				minHeight={80}
				maxWidth={500}
				maxHeight={400}
				keepAspectRatio={["circle", "diamond", "pill"].includes(data.shape)}
				onResizeStart={handleResizeStart}
				onResizeEnd={handleResizeEnd}
			/>
			<Handle
				type="target"
				position={Position.Left}
				className="!h-3 !w-3 !border-2 !border-white !bg-[#c77d9b]"
			/>

			<div
				data-node-color={data.color}
				className={`mindmap-node-card box-border min-w-[140px] min-h-[80px] max-w-none border px-5 py-3 shadow-sm transition ${shapeClass} ${colorClass} ${
					selected ? "is-selected border-2 border-[#a85f7d] shadow-lg" : ""
				}`}
				style={{
					width: width ? "100%" : "fit-content",
					height: height ? "100%" : "auto",
				}}
			>
				<div
					className={`${
						isDiamond ? "-rotate-45 " : ""
					}w-full min-w-0 text-center font-medium`}
				>
					{isEditingTitle ? (
						<textarea
							ref={titleRef}
							rows={1}
							value={draftTitle}
							onChange={(event) => setDraftTitle(event.target.value)}
							onBlur={handleTitleBlur}
							onKeyDown={handleTitleKeyDown}
							onClick={(event) => event.stopPropagation()}
							onPointerDown={(event) => event.stopPropagation()}
							placeholder="Node title"
							className="nodrag nopan mindmap-node-title block w-full min-w-0 resize-none overflow-hidden bg-transparent text-center font-medium leading-snug text-[#4b3d46] outline-none"
							aria-label="Edit node title"
						/>
					) : (
						<button
							type="button"
							onClick={() => setIsEditingTitle(true)}
							className="nodrag nopan mindmap-node-title block w-full min-w-0 cursor-text whitespace-pre-wrap break-words bg-transparent text-center font-medium leading-snug text-[#4b3d46] outline-none"
							aria-label="Click to edit node title"
							title="Click to edit"
						>
							{data.title || "Untitled node"}
						</button>
					)}

					<button
						type="button"
						onPointerDown={(event) => event.stopPropagation()}
						onClick={(event) => {
							event.stopPropagation();
							toggleDescription();
						}}
						className="nodrag nopan mindmap-node-toggle mt-2 rounded-md px-2 py-1 text-[10px] font-medium text-[#795F9B] transition hover:bg-black/5"
					>
						{descriptionVisible ? "Hide description" : "+ Add description"}
					</button>

					{descriptionVisible && (
						<textarea
							ref={descriptionRef}
							value={draftDescription}
							onChange={(event) => handleDescriptionChange(event.target.value)}
							onKeyDown={(event) => event.stopPropagation()}
							onPointerDown={(event) => event.stopPropagation()}
							placeholder="Write your notes here..."
							rows={3}
							className="nodrag nopan mindmap-node-description mt-2 block min-h-16 w-full min-w-0 resize-none overflow-hidden rounded-md border border-black/10 bg-white/50 px-2 py-1.5 text-left text-xs leading-relaxed text-[#4b3d46] outline-none focus:border-[#9B7EBD]"
							aria-label="Node description"
						/>
					)}
				</div>
			</div>

			<Handle
				type="source"
				position={Position.Right}
				className="!h-3 !w-3 !border-2 !border-white !bg-[#c77d9b]"
			/>
		</div>
	);
}
