"use client";

import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	ReactFlowProvider,
	applyNodeChanges,
	applyEdgeChanges,
	useReactFlow,
	type NodeChange,
	type EdgeChange,
} from "@xyflow/react";

import { useEffect } from "react";

import "@xyflow/react/dist/style.css";

import MindMapNode from "./MindMapNode";
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

	const { setCenter } = useReactFlow();

	useEffect(() => {
		if (!selectedNodeId) {
			return;
		}

		const node = nodes.find((node) => node.id === selectedNodeId);

		if (!node) {
			return;
		}

		setCenter(node.position.x + 75, node.position.y + 40, {
			zoom: 1.2,
			duration: 400,
		});
	}, [selectedNodeId, nodes, setCenter]);

	const handleNodesChange = (changes: NodeChange[]) => {
		const updatedNodes = applyNodeChanges(changes, nodes);

		setNodes(updatedNodes);
	};

	const handleEdgesChange = (changes: EdgeChange[]) => {
		const updatedEdges = applyEdgeChanges(changes, edges);

		setEdges(updatedEdges);
	};

	return (
		<div className="h-full w-full touch-none">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={handleNodesChange}
				onEdgesChange={handleEdgesChange}
				onNodeClick={(_, node) => {
					selectNode(node.id);
				}}
				onPaneClick={() => {
					selectNode(null);
				}}
				fitView
				deleteKeyCode={null}
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
