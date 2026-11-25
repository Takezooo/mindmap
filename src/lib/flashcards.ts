import { createClient } from "@/lib/supabase/client";

import type { Node } from "@xyflow/react";

import type { MindMapNodeData } from "@/types/mindmap";

import type {
	CreateFlashcardDeckInput,
	CreateFlashcardInput,
	Flashcard,
	FlashcardDeck,
	FlashcardReview,
	FlashcardSession,
	FlashcardSessionSummary,
} from "@/types/flashcard";

/* =========================================
   AUTHENTICATION
========================================= */

async function getAuthenticatedUser() {
	const supabase = createClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) throw error;

	if (!user) {
		throw new Error("You must be logged in to access flashcards.");
	}

	return { supabase, user };
}

/* =========================================
   DECK OPERATIONS
========================================= */

export async function getFlashcardDecks() {
	const { supabase, user } = await getAuthenticatedUser();

	const { data, error } = await supabase
		.from("flashcard_decks")
		.select("*")
		.eq("user_id", user.id)
		.order("updated_at", { ascending: false });

	if (error) throw error;

	return (data ?? []) as FlashcardDeck[];
}

export async function getFlashcardDeck(deckId: string) {
	const { supabase, user } = await getAuthenticatedUser();

	const { data, error } = await supabase
		.from("flashcard_decks")
		.select("*")
		.eq("id", deckId)
		.eq("user_id", user.id)
		.single();

	if (error) throw error;

	return data as FlashcardDeck;
}

export async function createFlashcardDeck(input: CreateFlashcardDeckInput) {
	const { supabase, user } = await getAuthenticatedUser();

	const { data, error } = await supabase
		.from("flashcard_decks")
		.insert({
			user_id: user.id,
			title: input.title.trim(),
			description: input.description?.trim() ?? "",
			map_id: input.map_id ?? null,
			folder_id: input.folder_id ?? null,
		})
		.select()
		.single();

	if (error) throw error;

	return data as FlashcardDeck;
}

export async function updateFlashcardDeck(
	deckId: string,
	updates: Partial<Pick<FlashcardDeck, "title" | "description" | "folder_id">>,
) {
	const { supabase, user } = await getAuthenticatedUser();

	const payload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};

	if (updates.title !== undefined) {
		payload.title = updates.title.trim();
	}

	if (updates.description !== undefined) {
		payload.description = updates.description.trim();
	}

	if (updates.folder_id !== undefined) {
		payload.folder_id = updates.folder_id;
	}

	const { data, error } = await supabase
		.from("flashcard_decks")
		.update(payload)
		.eq("id", deckId)
		.eq("user_id", user.id)
		.select()
		.single();

	if (error) throw error;

	return data as FlashcardDeck;
}

export async function deleteFlashcardDeck(deckId: string) {
	const { supabase, user } = await getAuthenticatedUser();

	const { error } = await supabase
		.from("flashcard_decks")
		.delete()
		.eq("id", deckId)
		.eq("user_id", user.id);

	if (error) throw error;
}

/* =========================================
   FLASHCARD OPERATIONS
========================================= */

export async function getFlashcards(deckId: string) {
	const { supabase } = await getAuthenticatedUser();

	const { data, error } = await supabase
		.from("flashcards")
		.select("*")
		.eq("deck_id", deckId)
		.order("position", { ascending: true })
		.order("created_at", { ascending: true });

	if (error) throw error;

	return (data ?? []) as Flashcard[];
}

export async function createFlashcard(input: CreateFlashcardInput) {
	const { supabase } = await getAuthenticatedUser();

	const { data, error } = await supabase
		.from("flashcards")
		.insert({
			deck_id: input.deck_id,
			source_map_id: input.source_map_id ?? null,
			source_node_id: input.source_node_id ?? null,
			type: input.type,
			front: input.front.trim(),
			back: input.back.trim(),
			options: input.options ?? [],
			position: input.position ?? 0,
		})
		.select()
		.single();

	if (error) throw error;

	return data as Flashcard;
}

export async function updateFlashcard(
	cardId: string,
	updates: Partial<
		Pick<Flashcard, "type" | "front" | "back" | "options" | "position">
	>,
) {
	const { supabase } = await getAuthenticatedUser();

	const payload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};

	if (updates.type !== undefined) payload.type = updates.type;
	if (updates.front !== undefined) payload.front = updates.front.trim();
	if (updates.back !== undefined) payload.back = updates.back.trim();
	if (updates.options !== undefined) payload.options = updates.options;
	if (updates.position !== undefined) payload.position = updates.position;

	const { data, error } = await supabase
		.from("flashcards")
		.update(payload)
		.eq("id", cardId)
		.select()
		.single();

	if (error) throw error;

	return data as Flashcard;
}

export async function deleteFlashcard(cardId: string) {
	const { supabase } = await getAuthenticatedUser();

	const { error } = await supabase.from("flashcards").delete().eq("id", cardId);

	if (error) throw error;
}

/* =========================================
   STUDY SESSION OPERATIONS
========================================= */

export async function createFlashcardSession(deckId: string) {
	const { supabase, user } = await getAuthenticatedUser();

	// Verify that the deck belongs to the authenticated user.
	await getFlashcardDeck(deckId);

	const { count, error: countError } = await supabase
		.from("flashcards")
		.select("*", { count: "exact", head: true })
		.eq("deck_id", deckId);

	if (countError) throw countError;

	if (!count || count < 1) {
		throw new Error("This deck has no flashcards to study.");
	}

	const { data, error } = await supabase
		.from("flashcard_sessions")
		.insert({
			user_id: user.id,
			deck_id: deckId,
			total_cards: count,
			correct_answers: 0,
			incorrect_answers: 0,
			score: 0,
			duration_seconds: 0,
			started_at: new Date().toISOString(),
			completed_at: null,
		})
		.select()
		.single();

	if (error) throw error;

	return data as FlashcardSession;
}

export async function recordFlashcardReview({
	cardId,
	sessionId,
	isCorrect,
	userAnswer,
	responseTimeMs,
}: {
	cardId: string;
	sessionId: string;
	isCorrect: boolean;
	userAnswer?: string | null;
	responseTimeMs: number;
}) {
	const { supabase, user } = await getAuthenticatedUser();

	if (!Number.isFinite(responseTimeMs) || responseTimeMs < 0) {
		throw new Error("Response time must be a non-negative number.");
	}

	// Verify session ownership and ensure it is still active.
	const { data: session, error: sessionError } = await supabase
		.from("flashcard_sessions")
		.select("id, deck_id, completed_at")
		.eq("id", sessionId)
		.eq("user_id", user.id)
		.single();

	if (sessionError) throw sessionError;

	if (session.completed_at) {
		throw new Error("This study session has already been completed.");
	}

	// Ensure the card belongs to the deck being studied.
	const { data: card, error: cardError } = await supabase
		.from("flashcards")
		.select("id")
		.eq("id", cardId)
		.eq("deck_id", session.deck_id)
		.single();

	if (cardError) throw cardError;

	const { data, error } = await supabase
		.from("flashcard_reviews")
		.insert({
			user_id: user.id,
			card_id: card.id,
			session_id: sessionId,
			is_correct: isCorrect,
			user_answer: userAnswer ?? null,
			response_time_ms: Math.round(responseTimeMs),
			reviewed_at: new Date().toISOString(),
		})
		.select()
		.single();

	if (error) throw error;

	return data as FlashcardReview;
}

export async function completeFlashcardSession(sessionId: string) {
	const { supabase, user } = await getAuthenticatedUser();

	const { data: session, error: sessionError } = await supabase
		.from("flashcard_sessions")
		.select("*")
		.eq("id", sessionId)
		.eq("user_id", user.id)
		.single();

	if (sessionError) throw sessionError;

	if (session.completed_at) {
		throw new Error("This study session has already been completed.");
	}

	const { data: reviews, error: reviewsError } = await supabase
		.from("flashcard_reviews")
		.select("is_correct, response_time_ms")
		.eq("session_id", sessionId)
		.eq("user_id", user.id);

	if (reviewsError) throw reviewsError;

	const correctAnswers = (reviews ?? []).filter(
		(review) => review.is_correct,
	).length;

	const incorrectAnswers = (reviews ?? []).length - correctAnswers;

	const score =
		session.total_cards > 0
			? Math.round((correctAnswers / session.total_cards) * 100)
			: 0;

	const completedAt = new Date();
	const startedAt = new Date(session.started_at);

	const durationSeconds = Math.max(
		0,
		Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000),
	);

	const { data, error } = await supabase
		.from("flashcard_sessions")
		.update({
			correct_answers: correctAnswers,
			incorrect_answers: incorrectAnswers,
			score,
			duration_seconds: durationSeconds,
			completed_at: completedAt.toISOString(),
		})
		.eq("id", sessionId)
		.eq("user_id", user.id)
		.is("completed_at", null)
		.select()
		.single();

	if (error) throw error;

	return data as FlashcardSession;
}

export async function getFlashcardSessionHistory(deckId: string) {
	const { supabase, user } = await getAuthenticatedUser();

	// Verify deck ownership.
	await getFlashcardDeck(deckId);

	const { data, error } = await supabase
		.from("flashcard_sessions")
		.select("*")
		.eq("deck_id", deckId)
		.eq("user_id", user.id)
		.order("started_at", { ascending: false });

	if (error) throw error;

	return (data ?? []) as FlashcardSession[];
}

export async function getFlashcardSessionSummary(
	sessionId: string,
): Promise<FlashcardSessionSummary> {
	const { supabase, user } = await getAuthenticatedUser();

	const { data: session, error: sessionError } = await supabase
		.from("flashcard_sessions")
		.select("*")
		.eq("id", sessionId)
		.eq("user_id", user.id)
		.single();

	if (sessionError) throw sessionError;

	const reviewedCards = session.correct_answers + session.incorrect_answers;
	
	const accuracy =
		reviewedCards > 0
			? Math.round((session.correct_answers / reviewedCards) * 100)
			: 0;

	return {
		total_cards: session.total_cards,
		correct_answers: session.correct_answers,
		incorrect_answers: session.incorrect_answers,
		score: session.score,
		accuracy,
		duration_seconds: session.duration_seconds,
	};
}

/* =========================================
   GENERATE FLASHCARDS FROM MIND MAP
========================================= */

export async function generateFlashcardsFromMap({
	mapId,
	mapTitle,
	folderId,
	nodes,
	deckId,
}: {
	mapId: string;
	mapTitle: string;
	folderId?: string | null;
	nodes: Node<MindMapNodeData>[];
	deckId?: string;
}) {
	const validNodes = Array.from(
		new Map(
			nodes
				.filter(
					(node) =>
						node.data.title.trim().length > 0 &&
						node.data.description.trim().length > 0,
				)
				.map((node) => [node.id, node]),
		).values(),
	);

	if (validNodes.length === 0) {
		throw new Error("No nodes with both a title and description were found.");
	}

	const { supabase } = await getAuthenticatedUser();

	let deck: FlashcardDeck;
	let createdNewDeck = false;

	if (deckId) {
		deck = await getFlashcardDeck(deckId);
	} else {
		deck = await createFlashcardDeck({
			title: `${mapTitle} Flashcards`,
			description: `Generated from the mind map "${mapTitle}".`,
			map_id: mapId,
			folder_id: folderId ?? null,
		});

		createdNewDeck = true;
	}

	try {
		const { data: existingCards, error: existingError } = await supabase
			.from("flashcards")
			.select("source_node_id, position")
			.eq("deck_id", deck.id)
			.eq("source_map_id", mapId);

		if (existingError) throw existingError;

		const existingNodeIds = new Set(
			(existingCards ?? [])
				.map((card) => card.source_node_id)
				.filter((id): id is string => Boolean(id)),
		);

		const newNodes = validNodes.filter((node) => !existingNodeIds.has(node.id));

		if (newNodes.length === 0) {
			return {
				deck,
				cards: [] as Flashcard[],
				generatedCount: 0,
				skippedCount: validNodes.length,
			};
		}

		const nextPosition =
			Math.max(
				-1,
				...(existingCards ?? []).map((card) => card.position ?? -1),
			) + 1;

		const cards: CreateFlashcardInput[] = newNodes.map((node, index) => ({
			deck_id: deck.id,
			source_map_id: mapId,
			source_node_id: node.id,
			type: "standard",
			front: node.data.description.trim(),
			back: node.data.title.trim(),
			position: nextPosition + index,
		}));

		const { data, error } = await supabase
			.from("flashcards")
			.insert(cards)
			.select();

		if (error) throw error;

		return {
			deck,
			cards: (data ?? []) as Flashcard[],
			generatedCount: data?.length ?? 0,
			skippedCount: validNodes.length - newNodes.length,
		};
	} catch (error) {
		if (createdNewDeck) {
			try {
				await deleteFlashcardDeck(deck.id);
			} catch (cleanupError) {
				console.error("Flashcard deck cleanup failed:", cleanupError);
			}
		}

		throw error;
	}
}
