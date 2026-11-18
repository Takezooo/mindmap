"use client";

import { useEffect, useRef } from "react";

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

import "@xyflow/react/dist/style.css";

import MindMapNode from "./MindMapNode";
import type { MindMapNodeData } from "@/types/mindmap";
import { useMindMapStore } from "@/stores/mindmap-store";

const nodeTypes = {
	mindMap: MindMapNode,
};

// Prevent the same keyboard event from being processed
// by multiple mounted MindMapFlow instances.
const handledKeyboardEvents = new WeakSet<globalThis.KeyboardEvent>();

function MindMapFlow() {
	const nodes = useMindMapStore((state) => state.nodes);
	const edges = useMindMapStore((state) => state.edges);
	const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

	const setNodes = useMindMapStore((state) => state.setNodes);
	const setEdges = useMindMapStore((state) => state.setEdges);
	const selectNode = useMindMapStore((state) => state.selectNode);

	const { setCenter, getNode } = useReactFlow();

	const dragStartSnapshot = useRef<{
		nodes: Node<MindMapNodeData>[];
		edges: Edge[];
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
				if (!state.selectedNodeId) return;

				event.preventDefault();
				event.stopPropagation();

				state.deleteNode(state.selectedNodeId);
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
	}, []);

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
		if (!newConnection.source || !newConnection.target) return;

		if (newConnection.target !== oldEdge.target) return;

		if (newConnection.source === oldEdge.source) return;

		useMindMapStore
			.getState()
			.reparentNode(oldEdge.target, newConnection.source);
	}

	return (
		<div className="h-full w-full touch-none">
			<ReactFlow<Node<MindMapNodeData>>
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				deleteKeyCode={null}
				edgesReconnectable={true}
				onReconnect={handleReconnect}
				onNodesChange={handleNodesChange}
				onEdgesChange={handleEdgesChange}
				onNodeDragStart={handleNodeDragStart}
				onNodeDragStop={handleNodeDragStop}
				onNodeClick={(_, node) => {
					selectNode(node.id);
				}}
				onPaneClick={() => {
					selectNode(null);
				}}
				fitView
			>
				<Background gap={24} size={1} color="#eadde4" />
				<Controls />
				<MiniMap nodeColor="#c77d9b" />
			</ReactFlow>
		</div>
	);
}

export default function MindMapCanvas() {
	return (
		<ReactFlowProvider>
			<MindMapFlow />
		</ReactFlowProvider>
	);
}
