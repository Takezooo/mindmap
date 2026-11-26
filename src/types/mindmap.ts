export type NodeShape = "rectangle" | "rounded" | "circle" | "diamond" | "pill";

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
	descriptionVisible?: boolean;
	shape: NodeShape;
	color: NodeColor;
	parentId: string | null;
	noteContent?: string;
	noteColor?: NoteColor;
};

export type NoteColor = "yellow" | "blue" | "pink" | "green";
