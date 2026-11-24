export type FlashcardType =
	| "standard"
	| "fill_blank"
	| "multiple_choice"
	| "custom";

export interface FlashcardOption {
	id: string;
	text: string;
}

export interface FlashcardDeck {
	id: string;
	user_id: string;
	map_id: string | null;
	folder_id: string | null;
	title: string;
	description: string;
	created_at: string;
	updated_at: string;
}

export interface Flashcard {
	id: string;
	deck_id: string;
	source_map_id: string | null;
	source_node_id: string | null;
	type: FlashcardType;
	front: string;
	back: string;
	options: FlashcardOption[];
	position: number;
	created_at: string;
	updated_at: string;
}

export interface FlashcardSession {
	id: string;
	user_id: string;
	deck_id: string;
	total_cards: number;
	correct_answers: number;
	incorrect_answers: number;
	score: number;
	duration_seconds: number;
	started_at: string;
	completed_at: string | null;
}

export interface FlashcardReview {
	id: string;
	user_id: string;
	card_id: string;
	session_id: string | null;
	is_correct: boolean;
	user_answer: string | null;
	response_time_ms: number;
	reviewed_at: string;
}

export interface CreateFlashcardInput {
	deck_id: string;
	source_map_id?: string | null;
	source_node_id?: string | null;
	type: FlashcardType;
	front: string;
	back: string;
	options?: FlashcardOption[];
	position?: number;
}

export interface CreateFlashcardDeckInput {
	title: string;
	description?: string;
	map_id?: string | null;
	folder_id?: string | null;
}

export interface FlashcardSessionSummary {
	total_cards: number;
	correct_answers: number;
	incorrect_answers: number;
	score: number;
	accuracy: number;
	duration_seconds: number;
}
