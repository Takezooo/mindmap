import type { Node } from "@xyflow/react";

export type NodeShape =
  | "rectangle"
  | "rounded"
  | "circle"
  | "diamond"
  | "pill";

export type NodeColor =
  | "rose"
  | "lavender"
  | "peach"
  | "mint"
  | "blue"
  | "cream";

export type MindMapNodeData = {
  title: string;
  description: string;
  shape: NodeShape;
  color: NodeColor;
  maxChildren: number;
  parentId: string | null;
};

export type MindMapNode = Node<
  MindMapNodeData,
  "mindMap"
>;