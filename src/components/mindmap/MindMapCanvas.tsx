"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	ReactFlowProvider,
	applyNodeChanges,
	applyEdgeChanges,
	useReactFlow,
	type Node,
	type Edge,
	type Connection,
	type NodeChange,
	type EdgeChange,
} from "@xyflow/react";

import {
	Grip,
	Undo2,
	Redo2,
	Crosshair,
	MousePointer2,
	Maximize2,
	Trash2,
	MoreHorizontal,
	ArrowUp,
	ArrowDown,
	GitBranch,
	Grid3X3,
	Magnet,
	PanelLeft,
	PanelRight,
	CircleX,
	BookOpen,
} from "lucide-react";

import "@xyflow/react/dist/style.css";

import MindMapNode from "./MindMapNode";
import type { MindMapNodeData } from "@/types/mindmap";
import { useMindMapStore } from "@/stores/mindmap-store";

const nodeTypes = {
	mindMap: MindMapNode,
};

type LayoutRect = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	right: number;
	bottom: number;
};

function rectanglesOverlap(a: LayoutRect, b: LayoutRect, gap = 12) {
	return (
		a.x < b.right + gap &&
		a.right + gap > b.x &&
		a.y < b.bottom + gap &&
		a.bottom + gap > b.y
	);
}

// Prevent the same keyboard event from being processed
// by multiple mounted MindMapFlow instances.
const handledKeyboardEvents = new WeakSet<globalThis.KeyboardEvent>();

type MindMapCanvasProps = {
	onToggleSidebar?: () => void;
	onToggleProperties?: () => void;
	onGenerateFlashcards?: () => void;
};

function MindMapFlow({
	onToggleSidebar,
	onToggleProperties,
	onGenerateFlashcards,
}: MindMapCanvasProps) {
	const nodes = useMindMapStore((state) => state.nodes);
	const edges = useMindMapStore((state) => state.edges);
	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const [gridVisible, setGridVisible] = useState(true);
	const [snapEnabled, setSnapEnabled] = useState(true);

	const [selectionMode, setSelectionMode] = useState(false);

	const [toolbarOffset, setToolbarOffset] = useState({ x: 0, y: 0 });
	const [toolbarMoreOpen, setToolbarMoreOpen] = useState(false);

	const toolbarDragStart = useRef<{
		pointerX: number;
		pointerY: number;
		offsetX: number;
		offsetY: number;
	} | null>(null);

	const gridSize: [number, number] = [24, 24];

	const setNodes = useMindMapStore((state) => state.setNodes);
	const setEdges = useMindMapStore((state) => state.setEdges);
	//const selectNode = useMindMapStore((state) => state.selectNode);
	const setActiveNodeId = useMindMapStore((state) => state.setActiveNodeId);

	const { setCenter, getNode, fitView: fitViewToCanvas } = useReactFlow();

	const dragStartSnapshot = useRef<{
		nodes: Node<MindMapNodeData>[];
		edges: Edge[];
	} | null>(null);

	const descriptionLayoutRef = useRef<{
		originalPositions: Map<string, { x: number; y: number }>;
		expandedOrder: string[];
	} | null>(null);

	useEffect(() => {
		function handleKeyboardShortcuts(event: globalThis.KeyboardEvent) {
			const target = event.target;

			// Do not intercept shortcuts while editing text.
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
			) {
				return;
			}

			// Prevent duplicate handling across canvas instances.
			if (handledKeyboardEvents.has(event)) return;
			handledKeyboardEvents.add(event);

			// Ignore operating-system key repeat.
			if (event.repeat) return;

			const state = useMindMapStore.getState();
			const modifier = event.ctrlKey || event.metaKey;
			const key = event.key.toLowerCase();

			// SHIFT + TAB: Add parent.
			// Without a selection, create an independent root node.
			if (event.key === "Tab" && event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();

				state.addParent(state.selectedNodeId ?? undefined);
				return;
			}

			// TAB: Add child.
			if (event.key === "Tab") {
				if (!state.selectedNodeId) return;

				event.preventDefault();
				event.stopPropagation();

				state.addChild(state.selectedNodeId);
				return;
			}

			// ENTER: Add sibling.
			if (event.key === "Enter") {
				if (!state.selectedNodeId) return;

				event.preventDefault();
				event.stopPropagation();

				state.addSibling(state.selectedNodeId);
				return;
			}

			// 0: Center the entire mind map.
			if (!modifier && !event.altKey && key === "0") {
				event.preventDefault();
				event.stopPropagation();

				fitViewToCanvas({
					padding: 0.2,
					duration: 500,
				});

				return;
			}

			// 1: Focus the first parent/root node.
			if (!modifier && !event.altKey && key === "1") {
				event.preventDefault();
				event.stopPropagation();

				const currentNodes = useMindMapStore.getState().nodes;

				const firstRootNode = currentNodes.find(
					(node) => node.data?.parentId == null,
				);

				if (firstRootNode) {
					requestAnimationFrame(() => {
						fitViewToCanvas({
							nodes: [{ id: firstRootNode.id }],
							padding: 0.25,
							duration: 500,
							maxZoom: 1.2,
						});
					});
				}

				return;
			}

			// G: Toggle grid visibility.
			if (!modifier && !event.altKey && key === "g") {
				event.preventDefault();
				event.stopPropagation();

				if (event.shiftKey) {
					setSnapEnabled((current) => !current);
				} else {
					setGridVisible((current) => !current);
				}

				return;
			}

			// W: Toggle selection mode
			if (!modifier && !event.altKey && key === "w") {
				event.preventDefault();
				event.stopPropagation();

				setSelectionMode((current) => !current);
				return;
			}

			// CTRL + A / CMD + A: Select all nodes.
			if (modifier && key === "a") {
				event.preventDefault();
				event.stopPropagation();

				state.setNodes(
					state.nodes.map((node) => ({
						...node,
						selected: true,
					})),
				);

				return;
			}

			// DELETE / BACKSPACE: Delete selected node.
			if (event.key === "Delete" || event.key === "Backspace") {
				const state = useMindMapStore.getState();

				const selectedNodeIds = state.nodes
					.filter((node) => node.selected)
					.map((node) => node.id);

				const selectedEdgeIds = state.edges
					.filter((edge) => edge.selected)
					.map((edge) => edge.id);

				if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();

				if (selectedNodeIds.length > 0) {
					state.deleteNodes(selectedNodeIds);
				}

				if (selectedEdgeIds.length > 0) {
					const latestState = useMindMapStore.getState();

					latestState.setEdges(
						latestState.edges.filter(
							(edge) => !selectedEdgeIds.includes(edge.id),
						),
					);
				}

				return;
			}

			// CTRL + Z / CMD + Z: Undo.
			// CTRL + SHIFT + Z / CMD + SHIFT + Z: Redo.
			if (modifier && key === "z") {
				event.preventDefault();
				event.stopPropagation();

				const history = useMindMapStore.temporal.getState();

				if (event.shiftKey) {
					history.redo();
				} else {
					history.undo();
				}

				return;
			}

			// CTRL + Y: Redo.
			if (event.ctrlKey && key === "y") {
				event.preventDefault();
				event.stopPropagation();

				useMindMapStore.temporal.getState().redo();
			}
		}

		window.addEventListener("keydown", handleKeyboardShortcuts);

		return () => {
			window.removeEventListener("keydown", handleKeyboardShortcuts);
		};
	}, [fitViewToCanvas, setSelectionMode]);

	useEffect(() => {
		if (!selectedNodeId) return;

		const node = getNode(selectedNodeId);

		if (!node) return;

		const width = node.measured?.width ?? 150;
		const height = node.measured?.height ?? 80;

		setCenter(node.position.x + width / 2, node.position.y + height / 2, {
			zoom: 1.2,
			duration: 400,
		});
	}, [selectedNodeId, getNode, setCenter]);
	useEffect(() => {
		const expandedNodes = nodes.filter(
			(node) => node.data.descriptionVisible && !node.hidden,
		);

		const snapshot = descriptionLayoutRef.current;

		// Restore every node when all descriptions are closed.
		if (expandedNodes.length === 0) {
			if (!snapshot) return;

			descriptionLayoutRef.current = null;

			const history = useMindMapStore.temporal.getState();
			history.pause();

			setNodes(
				useMindMapStore.getState().nodes.map((node) => {
					const original = snapshot.originalPositions.get(node.id);

					if (!original) return node;

					return {
						...node,
						position: { ...original },
					};
				}),
			);

			history.resume();
			return;
		}

		// Save original positions only once.
		if (!descriptionLayoutRef.current) {
			descriptionLayoutRef.current = {
				originalPositions: new Map(
					nodes.map((node) => [node.id, { ...node.position }]),
				),
				expandedOrder: [],
			};
		}

		const layout = descriptionLayoutRef.current;

		// Include nodes created while a description is open.
		for (const node of nodes) {
			if (!layout.originalPositions.has(node.id)) {
				layout.originalPositions.set(node.id, {
					...node.position,
				});
			}
		}

		const expandedIds = new Set(expandedNodes.map((node) => node.id));

		// Preserve opening order. Newly opened descriptions go last.
		layout.expandedOrder = layout.expandedOrder.filter((id) =>
			expandedIds.has(id),
		);

		for (const node of expandedNodes) {
			if (!layout.expandedOrder.includes(node.id)) {
				layout.expandedOrder.push(node.id);
			}
		}

		let firstFrame = 0;
		let secondFrame = 0;

		firstFrame = requestAnimationFrame(() => {
			secondFrame = requestAnimationFrame(() => {
				const gap = 12;

				function getRect(
					node: (typeof nodes)[number],
					position: { x: number; y: number },
				): LayoutRect {
					const measured = getNode(node.id);

					const width = measured?.measured?.width ?? measured?.width ?? 180;

					const height = measured?.measured?.height ?? measured?.height ?? 80;

					return {
						id: node.id,
						x: position.x,
						y: position.y,
						width,
						height,
						right: position.x + width,
						bottom: position.y + height,
					};
				}

				const originalPosition = (id: string) =>
					layout.originalPositions.get(id) ?? { x: 0, y: 0 };

				const nextPositions = new Map<string, { x: number; y: number }>();

				// These are the only nodes allowed to trigger displacement.
				const obstacles: LayoutRect[] = [];

				// First, position expanded descriptions.
				// The earliest opened description keeps its position.
				// Later expanded descriptions move only when necessary.
				for (const id of layout.expandedOrder) {
					const node = nodes.find((item) => item.id === id);

					if (!node || node.hidden) continue;

					const original = originalPosition(id);
					let position = { ...original };
					let rect = getRect(node, position);

					let attempts = 0;

					while (
						obstacles.some((obstacle) =>
							rectanglesOverlap(rect, obstacle, gap),
						) &&
						attempts < 100
					) {
						const collisions = obstacles.filter((obstacle) =>
							rectanglesOverlap(rect, obstacle, gap),
						);

						position = {
							x: original.x,
							y: Math.max(
								position.y + 1,
								...collisions.map((obstacle) => obstacle.bottom + gap),
							),
						};

						rect = getRect(node, position);
						attempts++;
					}

					nextPositions.set(id, position);
					obstacles.push(rect);
				}

				// Process normal nodes from top to bottom.
				// Only expanded or already-displaced nodes can push them.
				const candidates = nodes
					.filter((node) => !node.hidden && !expandedIds.has(node.id))
					.sort((a, b) => {
						const aPosition = originalPosition(a.id);
						const bPosition = originalPosition(b.id);

						return aPosition.y - bPosition.y;
					});

				for (const node of candidates) {
					const original = originalPosition(node.id);

					let position = { ...original };
					let rect = getRect(node, position);

					const initiallyAffected = obstacles.some((obstacle) =>
						rectanglesOverlap(rect, obstacle, gap),
					);

					// Do not move a node unless it actually intersects
					// an expanded or displaced node.
					if (!initiallyAffected) continue;

					let attempts = 0;

					while (
						obstacles.some((obstacle) =>
							rectanglesOverlap(rect, obstacle, gap),
						) &&
						attempts < 100
					) {
						const collisions = obstacles.filter((obstacle) =>
							rectanglesOverlap(rect, obstacle, gap),
						);

						position = {
							x: original.x,
							y: Math.max(
								position.y + 1,
								...collisions.map((obstacle) => obstacle.bottom + gap),
							),
						};

						rect = getRect(node, position);
						attempts++;
					}

					nextPositions.set(node.id, position);

					// This displaced node can now push another node
					// if they intersect.
					obstacles.push(rect);
				}

				// Restore unaffected nodes to their original positions.
				const updatedNodes = useMindMapStore.getState().nodes.map((node) => {
					const position =
						nextPositions.get(node.id) ?? layout.originalPositions.get(node.id);

					if (!position) return node;

					if (
						node.position.x === position.x &&
						node.position.y === position.y
					) {
						return node;
					}

					return {
						...node,
						position: { ...position },
					};
				});

				const hasChanges = updatedNodes.some((node) => {
					const current = useMindMapStore
						.getState()
						.nodes.find((item) => item.id === node.id);

					return (
						current &&
						(current.position.x !== node.position.x ||
							current.position.y !== node.position.y)
					);
				});

				if (hasChanges) {
					const history = useMindMapStore.temporal.getState();

					history.pause();
					setNodes(updatedNodes);
					history.resume();
				}
			});
		});

		return () => {
			cancelAnimationFrame(firstFrame);
			cancelAnimationFrame(secondFrame);
		};
	}, [nodes, getNode, setNodes]);

	useEffect(() => {
		function handleMapLoaded(event: Event) {
			const customEvent = event as CustomEvent<{
				rootNodeId: string | null;
			}>;

			const rootNodeId = customEvent.detail?.rootNodeId;

			if (!rootNodeId) return;

			// Wait for React Flow to receive and measure the loaded nodes.
			window.requestAnimationFrame(() => {
				const node = getNode(rootNodeId);

				const fallbackNode = useMindMapStore
					.getState()
					.nodes.find((item) => item.id === rootNodeId);

				const position = node?.position ?? fallbackNode?.position;

				if (!position) return;

				const width = node?.measured?.width ?? 150;
				const height = node?.measured?.height ?? 80;

				setCenter(position.x + width / 2, position.y + height / 2, {
					zoom: 1.2,
					duration: 500,
				});
			});
		}

		window.addEventListener("mindmap:map-loaded", handleMapLoaded);

		return () => {
			window.removeEventListener("mindmap:map-loaded", handleMapLoaded);
		};
	}, [getNode, setCenter]);

	function handleToolbarPointerDown(event: React.PointerEvent<HTMLDivElement>) {
		event.preventDefault();

		toolbarDragStart.current = {
			pointerX: event.clientX,
			pointerY: event.clientY,
			offsetX: toolbarOffset.x,
			offsetY: toolbarOffset.y,
		};

		event.currentTarget.setPointerCapture(event.pointerId);
	}

	// Toolbar functions =============

	function handleToolbarPointerMove(event: React.PointerEvent<HTMLDivElement>) {
		const start = toolbarDragStart.current;
		if (!start) return;

		setToolbarOffset({
			x: start.offsetX + event.clientX - start.pointerX,
			y: start.offsetY + event.clientY - start.pointerY,
		});
	}

	function handleToolbarPointerUp() {
		toolbarDragStart.current = null;
	}
	// =============

	// for arrow connections
	const handleConnect = useCallback((connection: Connection) => {
		const state = useMindMapStore.getState();

		const newEdge: Edge = {
			...connection,
			id: `connection-${crypto.randomUUID()}`,
			type: "default",
		};

		state.setEdges([...state.edges, newEdge]);
	}, []);

	const handleNodesChange = (changes: NodeChange<Node<MindMapNodeData>>[]) => {
		const updatedNodes = applyNodeChanges<Node<MindMapNodeData>>(
			changes,
			nodes,
		);

		setNodes(updatedNodes);
	};

	const handleEdgesChange = (changes: EdgeChange[]) => {
		const updatedEdges = applyEdgeChanges(changes, edges);

		setEdges(updatedEdges);
	};

	function handleNodeDragStart() {
		const state = useMindMapStore.getState();

		dragStartSnapshot.current = {
			nodes: state.nodes,
			edges: state.edges,
		};

		useMindMapStore.temporal.getState().pause();
	}

	function handleNodeDragStop() {
		const before = dragStartSnapshot.current;
		const history = useMindMapStore.temporal;

		history.getState().resume();

		dragStartSnapshot.current = null;

		if (!before) return;

		const current = useMindMapStore.getState();

		const hasMoved = before.nodes.some((previousNode) => {
			const currentNode = current.nodes.find(
				(node) => node.id === previousNode.id,
			);

			return (
				currentNode &&
				(currentNode.position.x !== previousNode.position.x ||
					currentNode.position.y !== previousNode.position.y)
			);
		});

		if (!hasMoved) return;

		history.setState((state) => ({
			pastStates: [...state.pastStates, before].slice(-100),
			futureStates: [],
		}));
	}

	function handleReconnect(oldEdge: Edge, newConnection: Connection) {
		useMindMapStore.getState().reconnectEdge(oldEdge.id, newConnection);
	}

	return (
		<div className="relative h-full w-full touch-none">
			<div className="mindmap-desktop-canvas-tools absolute left-4 top-4 z-10 flex gap-2">
				<button
					type="button"
					onClick={() => setGridVisible((current) => !current)}
					className={`mindmap-sidebar-toggle rounded-lg border px-3 py-2 text-xs font-medium shadow-sm mindmap-canvas-tool ${
						gridVisible ? "mindmap-canvas-tool-active" : ""
					}`}
				>
					Grid: {gridVisible ? "On" : "Off"}
					<span className="ml-2 opacity-60">G</span>
				</button>

				<button
					type="button"
					onClick={() => setSnapEnabled((current) => !current)}
					className={`mindmap-sidebar-toggle rounded-lg border px-3 py-2 text-xs font-medium shadow-sm mindmap-canvas-tool ${
						snapEnabled ? "mindmap-canvas-tool-active" : ""
					}`}
				>
					Snap: {snapEnabled ? "On" : "Off"}
					<span className="ml-2 opacity-60">Shift+G</span>
				</button>

				<button
					type="button"
					onClick={onGenerateFlashcards}
					className="mindmap-sidebar-toggle rounded-lg border px-3 py-2 text-xs font-medium shadow-sm mindmap-canvas-tool"
				>
					<span className="flex items-center gap-2">
						<BookOpen size={15} />
						Generate Flashcards
					</span>
				</button>
			</div>
			{/* Compact tablet/mobile toolbar */}
			<div
				className="mindmap-floating-toolbar"
				style={{
					transform: `translate(calc(-50% + ${toolbarOffset.x}px), ${toolbarOffset.y}px)`,
				}}
			>
				{/* Primary toolbar */}
				<div className="mindmap-toolbar-primary">
					<div
						className="mindmap-toolbar-drag"
						onPointerDown={handleToolbarPointerDown}
						onPointerMove={handleToolbarPointerMove}
						onPointerUp={handleToolbarPointerUp}
						onPointerCancel={handleToolbarPointerUp}
						title="Drag toolbar"
						aria-label="Drag toolbar"
					>
						<Grip size={19} />
					</div>

					<button
						type="button"
						onClick={() => useMindMapStore.temporal.getState().undo()}
						title="Undo"
						aria-label="Undo"
					>
						<Undo2 size={19} />
					</button>

					<button
						type="button"
						onClick={() => useMindMapStore.temporal.getState().redo()}
						title="Redo"
						aria-label="Redo"
					>
						<Redo2 size={19} />
					</button>

					<span className="mindmap-toolbar-divider" />

					<button
						type="button"
						onClick={() => {
							const firstRootNode = useMindMapStore
								.getState()
								.nodes.find((node) => node.data?.parentId == null);

							if (!firstRootNode) return;

							requestAnimationFrame(() => {
								fitViewToCanvas({
									nodes: [{ id: firstRootNode.id }],
									padding: 0.25,
									duration: 500,
									maxZoom: 1.2,
								});
							});
						}}
						title="Focus root node (1)"
						aria-label="Focus root node"
					>
						<Crosshair size={19} />
					</button>

					<button
						type="button"
						onClick={() => setSelectionMode((current) => !current)}
						className={selectionMode ? "active" : ""}
						aria-pressed={selectionMode}
						title="Selection mode (W)"
						aria-label="Toggle selection mode"
					>
						<MousePointer2 size={19} />
					</button>

					<button
						type="button"
						onClick={() =>
							fitViewToCanvas({
								padding: 0.2,
								duration: 400,
							})
						}
						title="Fit entire mind map"
						aria-label="Fit mind map"
					>
						<Maximize2 size={19} />
					</button>

					<button
						type="button"
						className="mindmap-toolbar-delete"
						onClick={() => {
							const state = useMindMapStore.getState();

							const selectedNodeIds = state.nodes
								.filter((node) => node.selected)
								.map((node) => node.id);

							const selectedEdgeIds = state.edges
								.filter((edge) => edge.selected)
								.map((edge) => edge.id);

							if (selectedNodeIds.length > 0) {
								state.deleteNodes(selectedNodeIds);
							}

							if (selectedEdgeIds.length > 0) {
								const latestState = useMindMapStore.getState();

								latestState.setEdges(
									latestState.edges.filter(
										(edge) => !selectedEdgeIds.includes(edge.id),
									),
								);
							}
						}}
						disabled={
							!nodes.some((node) => node.selected) &&
							!edges.some((edge) => edge.selected)
						}
						title="Delete selected items"
						aria-label="Delete selected items"
					>
						<Trash2 size={19} />
					</button>

					<button
						type="button"
						className={`mindmap-toolbar-more ${toolbarMoreOpen ? "active" : ""}`}
						onClick={() => setToolbarMoreOpen((value) => !value)}
						aria-expanded={toolbarMoreOpen}
						title={toolbarMoreOpen ? "Close more options" : "More options"}
						aria-label="More toolbar options"
					>
						{toolbarMoreOpen ? (
							<CircleX size={19} />
						) : (
							<MoreHorizontal size={19} />
						)}
					</button>
				</div>

				{/* Expandable secondary panel */}
				{toolbarMoreOpen && (
					<div className="mindmap-toolbar-secondary">
						<button
							type="button"
							onClick={() => {
								if (!selectedNodeId) return;
								useMindMapStore.getState().addParent(selectedNodeId);
							}}
							disabled={!selectedNodeId}
						>
							<ArrowUp size={16} />
							Parent
						</button>

						<button
							type="button"
							onClick={() => {
								if (!selectedNodeId) return;
								useMindMapStore.getState().addChild(selectedNodeId);
							}}
							disabled={!selectedNodeId}
						>
							<ArrowDown size={16} />
							Child
						</button>

						<button
							type="button"
							onClick={() => {
								if (!selectedNodeId) return;
								useMindMapStore.getState().addSibling(selectedNodeId);
							}}
							disabled={!selectedNodeId}
						>
							<GitBranch size={16} />
							Sibling
						</button>

						<button
							type="button"
							className={gridVisible ? "active" : ""}
							aria-pressed={gridVisible}
							onClick={() => setGridVisible((value) => !value)}
						>
							<Grid3X3 size={16} />
							Grid {gridVisible ? "On" : "Off"}
						</button>

						<button
							type="button"
							className={snapEnabled ? "active" : ""}
							aria-pressed={snapEnabled}
							onClick={() => setSnapEnabled((value) => !value)}
						>
							<Magnet size={16} />
							Snap {snapEnabled ? "On" : "Off"}
						</button>

						<button type="button" onClick={onToggleSidebar}>
							<PanelLeft size={16} />
							Sidebar
						</button>

						<button type="button" onClick={onToggleProperties}>
							<PanelRight size={16} />
							Properties
						</button>

						<button type="button" onClick={onGenerateFlashcards}>
							<BookOpen size={16} />
							Generate Flashcards
						</button>
					</div>
				)}
			</div>
			<ReactFlow<Node<MindMapNodeData>>
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				deleteKeyCode={null}
				onReconnect={handleReconnect} // reconnection of  arrrows
				edgesReconnectable={true}
				onConnect={handleConnect} // add connection
				onNodesChange={handleNodesChange}
				onEdgesChange={handleEdgesChange}
				onNodeDragStart={handleNodeDragStart}
				snapToGrid={snapEnabled}
				snapGrid={gridSize}
				// for tablet mode ===
				panOnDrag={!selectionMode}
				selectionOnDrag={selectionMode}
				panOnScroll={false}
				zoomOnPinch={true}
				zoomOnDoubleClick={false}
				nodesDraggable={true}
				nodesConnectable={true}
				// ===
				onNodeDragStop={handleNodeDragStop}
				multiSelectionKeyCode="Control"
				onSelectionChange={({ nodes: selectedNodes }) => {
					setActiveNodeId(selectedNodes[selectedNodes.length - 1]?.id ?? null);
				}}
				onPaneClick={() => {
					setActiveNodeId(null);
				}}
				fitView={false}
			>
				{gridVisible && (
					<Background gap={gridSize[0]} size={1} color="#be45ff" />
				)}
				<Controls />
				<MiniMap nodeColor="#c77d9b" />
			</ReactFlow>
		</div>
	);
}

export default function MindMapCanvas(props: MindMapCanvasProps) {
	return (
		<ReactFlowProvider>
			<MindMapFlow {...props} />
		</ReactFlowProvider>
	);
}
