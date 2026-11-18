import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { temporal } from "zundo";
import type { Node, Edge } from "@xyflow/react";

import type { MindMapNodeData } from "@/types/mindmap";

interface MindMapState {
	nodes: Node<MindMapNodeData>[];
	edges: Edge[];

	selectedNodeId: string | null;
	descriptionNodeId: string | null;

	hasHydrated: boolean;

	setNodes: (nodes: Node<MindMapNodeData>[]) => void;

	setEdges: (edges: Edge[]) => void;

	selectNode: (nodeId: string | null) => void;

	openDescription: (nodeId: string) => void;

	closeDescription: () => void;

	setHasHydrated: (value: boolean) => void;

	addChild: (parentId: string) => void;

	addParent: (nodeId: string) => void;

	updateNode: (nodeId: string, data: Partial<MindMapNodeData>) => void;

	deleteNode: (nodeId: string) => void;

	replaceMap: (nodes: Node<MindMapNodeData>[], edges: Edge[]) => void;
}

type MindMapHistoryState = {
	nodes: Node<MindMapNodeData>[];
	edges: Edge[];
};

function areHistoryStatesEqual(
	previous: MindMapHistoryState,
	current: MindMapHistoryState,
) {
	const getNodeSnapshot = (nodes: Node<MindMapNodeData>[]) =>
		nodes.map((node) => ({
			id: node.id,
			type: node.type,
			position: node.position,
			data: node.data,
			parentId: node.parentId,
			hidden: node.hidden,
			style: node.style,
		}));

	const getEdgeSnapshot = (edges: Edge[]) =>
		edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle,
			type: edge.type,
			label: edge.label,
			style: edge.style,
			animated: edge.animated,
			hidden: edge.hidden,
		}));

	return (
		JSON.stringify(getNodeSnapshot(previous.nodes)) ===
			JSON.stringify(getNodeSnapshot(current.nodes)) &&
		JSON.stringify(getEdgeSnapshot(previous.edges)) ===
			JSON.stringify(getEdgeSnapshot(current.edges))
	);
}

export const useMindMapStore = create<MindMapState>()(
	temporal(
		persist(
			(set) => ({
				nodes: [
					{
						id: "1",
						type: "mindMap",
						position: {
							x: 300,
							y: 250,
						},
						data: {
							title: "Viktor",
							description:
								"In all timelines, in all possibilities, only you...",
							shape: "rounded",
							color: "rose",
							maxChildren: 3,
							parentId: null,
						},
					},
					{
						id: "2",
						type: "mindMap",
						position: {
							x: 600,
							y: 250,
						},
						data: {
							title: "Sorry",
							description: "if late na...",
							shape: "rectangle",
							color: "lavender",
							maxChildren: 3,
							parentId: "1",
						},
					},
				],

				edges: [
					{
						id: "1-2",
						source: "1",
						target: "2",
					},
				],

				selectedNodeId: null,
				descriptionNodeId: null,
				hasHydrated: false,

				setNodes: (nodes) => {
					set({ nodes });
				},

				setEdges: (edges) => {
					set({ edges });
				},

				selectNode: (nodeId) => {
					set({
						selectedNodeId: nodeId,
						descriptionNodeId: null,
					});
				},

				openDescription: (nodeId) => {
					set({
						selectedNodeId: nodeId,
						descriptionNodeId: nodeId,
					});
				},

				closeDescription: () => {
					set({
						descriptionNodeId: null,
					});
				},

				setHasHydrated: (value) => {
					set({
						hasHydrated: value,
					});
				},

				addChild: (parentId) =>
					set((state) => {
						const parent = state.nodes.find((node) => node.id === parentId);

						if (!parent) {
							return state;
						}

						const children = state.nodes.filter(
							(node) => node.data.parentId === parentId,
						);

						if (children.length >= parent.data.maxChildren) {
							return state;
						}

						const id = crypto.randomUUID();

						const child: Node<MindMapNodeData> = {
							id,
							type: "mindMap",
							position: {
								x: parent.position.x + 300,
								y: parent.position.y + children.length * 140,
							},
							data: {
								title: "New Node",
								description: "",
								shape: "rectangle",
								color: "peach",
								maxChildren: 3,
								parentId,
							},
						};

						const edge: Edge = {
							id: `${parentId}-${id}`,
							source: parentId,
							target: id,
						};

						return {
							nodes: [...state.nodes, child],

							edges: [...state.edges, edge],

							selectedNodeId: id,
							descriptionNodeId: null,
						};
					}),

				addParent: (nodeId) =>
					set((state) => {
						const currentNode = state.nodes.find((node) => node.id === nodeId);

						if (!currentNode) {
							return state;
						}

						const oldParentId = currentNode.data.parentId;

						const oldParent = oldParentId
							? state.nodes.find((node) => node.id === oldParentId)
							: null;

						const newParentId = crypto.randomUUID();

						const newParent: Node<MindMapNodeData> = {
							id: newParentId,
							type: "mindMap",
							position: oldParent
								? {
										x: (oldParent.position.x + currentNode.position.x) / 2,

										y: (oldParent.position.y + currentNode.position.y) / 2,
									}
								: {
										x: currentNode.position.x - 300,

										y: currentNode.position.y,
									},

							data: {
								title: "New Parent",
								description: "",
								shape: "rounded",
								color: "rose",
								maxChildren: 3,
								parentId: oldParentId,
							},
						};

						const updatedCurrentNode: Node<MindMapNodeData> = {
							...currentNode,

							data: {
								...currentNode.data,
								parentId: newParentId,
							},
						};

						let updatedEdges = [...state.edges];

						if (oldParentId) {
							updatedEdges = updatedEdges.filter(
								(edge) =>
									!(
										edge.source === oldParentId &&
										edge.target === currentNode.id
									),
							);
						}

						if (oldParentId) {
							updatedEdges.push({
								id: `${oldParentId}-${newParentId}`,
								source: oldParentId,
								target: newParentId,
							});
						}

						updatedEdges.push({
							id: `${newParentId}-${currentNode.id}`,
							source: newParentId,
							target: currentNode.id,
						});

						return {
							nodes: [
								...state.nodes.map((node) =>
									node.id === currentNode.id ? updatedCurrentNode : node,
								),

								newParent,
							],

							edges: updatedEdges,

							selectedNodeId: newParentId,

							descriptionNodeId: null,
						};
					}),

				updateNode: (nodeId, data) =>
					set((state) => ({
						nodes: state.nodes.map((node) => {
							if (node.id !== nodeId) {
								return node;
							}

							return {
								...node,

								data: {
									...node.data,
									...data,
								},
							};
						}),
					})),

				deleteNode: (nodeId) =>
					set((state) => {
						const node = state.nodes.find((item) => item.id === nodeId);

						if (!node) {
							return state;
						}

						const newParentId = node.data.parentId;

						// Find only the direct children of the selected node.
						const directChildren = state.nodes.filter(
							(item) => item.data.parentId === nodeId,
						);

						// Remove the selected node and reassign its direct children.
						const updatedNodes = state.nodes
							.filter((item) => item.id !== nodeId)
							.map((item) => {
								if (item.data.parentId !== nodeId) {
									return item;
								}

								return {
									...item,
									data: {
										...item.data,
										parentId: newParentId,
									},
								};
							});

						// Remove connections involving the deleted node.
						const updatedEdges = state.edges.filter(
							(edge) => edge.source !== nodeId && edge.target !== nodeId,
						);

						// Reconnect direct children to the deleted node's parent.
						if (newParentId) {
							directChildren.forEach((child) => {
								updatedEdges.push({
									id: `${newParentId}-${child.id}`,
									source: newParentId,
									target: child.id,
								});
							});
						}

						return {
							nodes: updatedNodes,
							edges: updatedEdges,
							selectedNodeId: null,
							descriptionNodeId: null,
						};
					}),

				replaceMap: (nodes, edges) => {
					set({
						nodes,
						edges,
						selectedNodeId: null,
						descriptionNodeId: null,
					});
				},
			}),

			{
				name: "mindmap-storage-v1",
				storage: createJSONStorage(() => localStorage),
				version: 1,
				partialize: (state) => ({
					nodes: state.nodes,
					edges: state.edges,
				}),
			},
		),
		{
			limit: 100,
			partialize: (state) => ({
				nodes: state.nodes,
				edges: state.edges,
			}),
			equality: areHistoryStatesEqual,
		},
	),
);
