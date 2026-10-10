export interface MindMapRecord {
	id: string;
	user_id: string;
	folder_id: string | null;

	title: string;

	nodes: unknown[];
	edges: unknown[];

	viewport: {
		x: number;
		y: number;
		zoom: number;
	};

	theme: string;

	is_hidden: boolean;

	created_at: string;
	updated_at: string;
}
