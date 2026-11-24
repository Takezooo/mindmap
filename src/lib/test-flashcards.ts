import {
	createFlashcardSession,
	recordFlashcardReview,
	completeFlashcardSession,
	getFlashcardSessionHistory,
	getFlashcardSessionSummary,
	getFlashcards,
} from "@/lib/flashcards";

export async function testFlashcardSession(deckId: string) {
	try {
		// 1. Get cards from the selected deck.
		const cards = await getFlashcards(deckId);

		if (cards.length < 2) {
			throw new Error("The deck needs at least two flashcards.");
		}

		// 2. Create a study session.
		const session = await createFlashcardSession(deckId);

		console.log("Session created:", session);

		// 3. Record one correct answer.
		const correctReview = await recordFlashcardReview({
			cardId: cards[0].id,
			sessionId: session.id,
			isCorrect: true,
			userAnswer: cards[0].back,
			responseTimeMs: 2000,
		});

		console.log("Correct answer recorded:", correctReview);

		// 4. Record one incorrect answer.
		const incorrectReview = await recordFlashcardReview({
			cardId: cards[1].id,
			sessionId: session.id,
			isCorrect: false,
			userAnswer: "Incorrect test answer",
			responseTimeMs: 3500,
		});

		console.log("Incorrect answer recorded:", incorrectReview);

		// 5. Complete the session.
		const completedSession = await completeFlashcardSession(session.id);

		console.log("Session completed:", completedSession);

		// 6. Retrieve session history.
		const history = await getFlashcardSessionHistory(deckId);

		console.log("Session history:", history);

		// 7. Retrieve session summary.
		const summary = await getFlashcardSessionSummary(session.id);

		console.log("Session summary:", summary);

		return {
			session,
			correctReview,
			incorrectReview,
			completedSession,
			history,
			summary,
		};
	} catch (error) {
		console.error("Flashcard session test failed:", error);
		throw error;
	}
}
