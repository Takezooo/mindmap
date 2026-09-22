import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

export const useMindMapStore = create<MindMapState>()(
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
						description: "In all timelines, in all possibilities, only you...",
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
									edge.source === oldParentId && edge.target === currentNode.id
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

					// Never delete the root node.
					if (node.data.parentId === null) {
						return state;
					}

					const nodeIdsToDelete = new Set<string>();

					const collectChildren = (id: string) => {
						nodeIdsToDelete.add(id);

						state.nodes
							.filter((item) => item.data.parentId === id)
							.forEach((child) => {
								collectChildren(child.id);
							});
					};

					collectChildren(nodeId);

					return {
						nodes: state.nodes.filter((item) => !nodeIdsToDelete.has(item.id)),

						edges: state.edges.filter(
							(edge) =>
								!nodeIdsToDelete.has(edge.source) &&
								!nodeIdsToDelete.has(edge.target),
						),

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
);
