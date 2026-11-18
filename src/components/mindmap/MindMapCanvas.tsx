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
		function handleHistoryShortcut(event: globalThis.KeyboardEvent) {
			const target = event.target;

			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
			) {
				return;
			}

			// Delete the currently selected node.
			if (event.key === "Delete" || event.key === "Backspace") {
				const state = useMindMapStore.getState();

				if (state.selectedNodeId) {
					event.preventDefault();
					state.deleteNode(state.selectedNodeId);
				}

				return;
			}
      
			const modifier = event.ctrlKey || event.metaKey;

			if (!modifier || event.key.toLowerCase() !== "z") {
				return;
			}

			event.preventDefault();

			const history = useMindMapStore.temporal.getState();

			if (event.shiftKey) {
				history.redo();
			} else {
				history.undo();
			}
		}

		function handleRedoShortcut(event: globalThis.KeyboardEvent) {
			const target = event.target;

			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
			) {
				return;
			}

			if (event.ctrlKey && event.key.toLowerCase() === "y") {
				event.preventDefault();
				useMindMapStore.temporal.getState().redo();
			}
		}

		window.addEventListener("keydown", handleHistoryShortcut);
		window.addEventListener("keydown", handleRedoShortcut);

		return () => {
			window.removeEventListener("keydown", handleHistoryShortcut);
			window.removeEventListener("keydown", handleRedoShortcut);
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

		// Capture the graph before movement begins.
		dragStartSnapshot.current = {
			nodes: state.nodes,
			edges: state.edges,
		};

		// Ignore all intermediate drag positions in history.
		useMindMapStore.temporal.getState().pause();
	}

	function handleNodeDragStop() {
		const before = dragStartSnapshot.current;

		const history = useMindMapStore.temporal;

		// Resume normal history tracking.
		history.getState().resume();

		dragStartSnapshot.current = null;

		if (!before) return;

		const current = useMindMapStore.getState();

		// Check whether any node actually changed position.
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

		// Save the original graph as one undo entry.
		history.setState((state) => ({
			pastStates: [...state.pastStates, before].slice(-100),
			futureStates: [],
		}));
	}

	return (
		<div className="h-full w-full touch-none">
			<ReactFlow<Node<MindMapNodeData>>
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				deleteKeyCode={null}
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
