"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
	ArrowLeft,
	ArrowRight,
	BookOpen,
	Check,
	CheckCircle2,
	Clock3,
	RotateCcw,
	X,
	XCircle,
} from "lucide-react";

import {
	completeFlashcardSession,
	createFlashcardSession,
	getFlashcardDeck,
	getFlashcards,
	getFlashcardSessionSummary,
	recordFlashcardReview,
} from "@/lib/flashcards";

import type {
	Flashcard,
	FlashcardDeck,
	FlashcardSessionSummary,
} from "@/types/flashcard";

type StudyPhase = "ready" | "studying" | "completed";

export default function FlashcardDeckPage() {
	const router = useRouter();
	const params = useParams<{ deckId: string }>();

	const [deck, setDeck] = useState<FlashcardDeck | null>(null);
	const [cards, setCards] = useState<Flashcard[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [phase, setPhase] = useState<StudyPhase>("ready");
	const [sessionId, setSessionId] = useState<string | null>(null);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [reviewedCount, setReviewedCount] = useState(0);
	const [correctCount, setCorrectCount] = useState(0);
	const [incorrectCount, setIncorrectCount] = useState(0);

	const [summary, setSummary] = useState<FlashcardSessionSummary | null>(null);

	const [cardStartedAt, setCardStartedAt] = useState<number | null>(null);

	const loadDeck = useCallback(async () => {
		try {
			setLoading(true);
			setError("");

			const [deckData, cardData] = await Promise.all([
				getFlashcardDeck(params.deckId),
				getFlashcards(params.deckId),
			]);

			setDeck(deckData);
			setCards(cardData);
		} catch (error) {
			console.error(error);

			if (
				error instanceof Error &&
				error.message.toLowerCase().includes("logged in")
			) {
				router.replace("/login");
				return;
			}

			setError("Unable to load this flashcard deck.");
		} finally {
			setLoading(false);
		}
	}, [params.deckId, router]);

	useEffect(() => {
		void loadDeck();
	}, [loadDeck]);

	const currentCard = cards[currentIndex];

	const startStudySession = async () => {
		try {
			setSubmitting(true);
			setError("");

			if (cards.length === 0) {
				throw new Error("This deck has no flashcards to study.");
			}

			const session = await createFlashcardSession(params.deckId);

			setSessionId(session.id);
			setCurrentIndex(0);
			setReviewedCount(0);
			setCorrectCount(0);
			setIncorrectCount(0);
			setRevealed(false);
			setSummary(null);
			setCardStartedAt(Date.now());

			setPhase("studying");
		} catch (error) {
			console.error(error);

			setError(
				error instanceof Error
					? error.message
					: "Unable to start the study session.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const submitAnswer = async (isCorrect: boolean) => {
		if (!sessionId || !currentCard || !revealed || submitting) {
			return;
		}

		try {
			setSubmitting(true);
			setError("");

			const responseTimeMs = cardStartedAt ? Date.now() - cardStartedAt : 0;

			await recordFlashcardReview({
				cardId: currentCard.id,
				sessionId,
				isCorrect,
				userAnswer: null,
				responseTimeMs,
			});

			setReviewedCount((previous) => previous + 1);

			if (isCorrect) {
				setCorrectCount((previous) => previous + 1);
			} else {
				setIncorrectCount((previous) => previous + 1);
			}

			if (currentIndex + 1 < cards.length) {
				setCurrentIndex((previous) => previous + 1);
				setRevealed(false);
				setCardStartedAt(Date.now());
			} else {
				const completed = await completeFlashcardSession(sessionId);

				const sessionSummary = await getFlashcardSessionSummary(completed.id);

				setSummary(sessionSummary);
				setPhase("completed");
			}
		} catch (error) {
			console.error(error);

			setError(
				error instanceof Error ? error.message : "Unable to save your answer.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const returnToDeck = () => {
		if (
			phase === "studying" &&
			!window.confirm(
				"Are you sure you want to leave? Your current session will remain incomplete.",
			)
		) {
			return;
		}

		router.push("/dashboard");
	};

	if (loading) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E7DDF0] border-t-[#9B7EBD]" />
			</main>
		);
	}

	if (error && !deck) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF] p-5">
				<div className="text-center">
					<p className="text-sm text-[#A95F7D]">{error}</p>

					<button
						type="button"
						onClick={() => router.push("/dashboard")}
						className="mt-4 text-sm font-semibold text-[#795F9B] hover:underline"
					>
						Return to dashboard
					</button>
				</div>
			</main>
		);
	}

	if (!deck) return null;

	const progress = cards.length > 0 ? (reviewedCount / cards.length) * 100 : 0;

	return (
		<main className="min-h-[100dvh] bg-[#FAF7FF] px-4 py-6 text-[#3F3545] sm:px-8 sm:py-10">
			<div className="mx-auto max-w-4xl">
				<button
					type="button"
					onClick={returnToDeck}
					className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#795F9B] hover:underline"
				>
					<ArrowLeft size={17} />
					Back to dashboard
				</button>

				{phase === "ready" && (
					<section className="rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm sm:p-10">
						<div className="inline-flex rounded-xl bg-[#F1EAFB] p-4 text-[#795F9B]">
							<BookOpen size={28} />
						</div>

						<h1 className="mt-5 break-words text-2xl font-bold text-[#6F527F] sm:text-3xl">
							{deck.title}
						</h1>

						{deck.description && (
							<p className="mt-3 text-sm leading-relaxed text-[#887B91]">
								{deck.description}
							</p>
						)}

						<div className="mt-6 border-t border-[#E7DDF0] pt-5">
							<p className="text-sm text-[#887B91]">
								{cards.length} flashcard
								{cards.length === 1 ? "" : "s"}
							</p>

							{cards.length === 0 ? (
								<div className="mt-8 rounded-xl border border-dashed border-[#DCCBE8] bg-[#FAF7FF] p-8 text-center">
									<BookOpen size={30} className="mx-auto text-[#9B7EBD]" />

									<h2 className="mt-3 font-semibold text-[#6F527F]">
										No flashcards available
									</h2>

									<p className="mt-2 text-sm text-[#887B91]">
										Add flashcards to this deck before studying.
									</p>
								</div>
							) : (
								<div className="mt-8 rounded-xl border border-dashed border-[#DCCBE8] bg-[#FAF7FF] p-8 text-center">
									<BookOpen size={30} className="mx-auto text-[#9B7EBD]" />

									<h2 className="mt-3 font-semibold text-[#6F527F]">
										Your study space
									</h2>

									<p className="mt-2 text-sm text-[#887B91]">
										Review each question, reveal its answer, and evaluate your
										understanding.
									</p>

									<button
										type="button"
										onClick={startStudySession}
										disabled={submitting}
										className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#795F9B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#684D89] disabled:cursor-not-allowed disabled:opacity-50"
									>
										<BookOpen size={17} />
										{submitting ? "Starting..." : "Start studying"}
									</button>
								</div>
							)}
						</div>
					</section>
				)}

				{phase === "studying" && currentCard && (
					<section>
						<div className="mb-6 flex items-center justify-between gap-4">
							<div className="min-w-0">
								<h1 className="truncate text-lg font-bold text-[#6F527F]">
									{deck.title}
								</h1>

								<p className="mt-1 text-xs text-[#887B91]">
									Card {currentIndex + 1} of {cards.length}
								</p>
							</div>

							<div className="shrink-0 text-right text-xs text-[#887B91]">
								{reviewedCount} reviewed
							</div>
						</div>

						<div className="h-2 overflow-hidden rounded-full bg-[#E7DDF0]">
							<div
								className="h-full rounded-full bg-[#9B7EBD] transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
						</div>

						<div className="mt-8 rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm sm:p-10">
							<div className="flex items-center justify-between">
								<span className="rounded-full bg-[#F1EAFB] px-3 py-1 text-xs font-semibold text-[#795F9B]">
									{revealed ? "ANSWER" : "QUESTION"}
								</span>

								<span className="text-xs text-[#A397AC]">
									{currentCard.type.replace("_", " ")}
								</span>
							</div>

							<div className="flex min-h-[260px] flex-col items-center justify-center py-10 text-center">
								<p className="whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed text-[#6F527F] sm:text-2xl">
									{revealed ? currentCard.back : currentCard.front}
								</p>

								{revealed && (
									<p className="mt-5 text-xs text-[#A397AC]">Answer revealed</p>
								)}
							</div>

							{!revealed ? (
								<button
									type="button"
									onClick={() => setRevealed(true)}
									className="w-full rounded-xl bg-[#795F9B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#684D89]"
								>
									Reveal answer
								</button>
							) : (
								<div>
									<p className="mb-4 text-center text-sm font-medium text-[#887B91]">
										Did you get it right?
									</p>

									<div className="grid grid-cols-2 gap-3">
										<button
											type="button"
											onClick={() => submitAnswer(false)}
											disabled={submitting}
											className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8C9D2] bg-[#FFF5F7] px-4 py-3.5 text-sm font-semibold text-[#A95F7D] transition hover:bg-[#FCE8ED] disabled:opacity-50"
										>
											<X size={18} />
											Incorrect
										</button>

										<button
											type="button"
											onClick={() => submitAnswer(true)}
											disabled={submitting}
											className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C8E4D5] bg-[#F1FAF5] px-4 py-3.5 text-sm font-semibold text-[#4C916B] transition hover:bg-[#E4F5EB] disabled:opacity-50"
										>
											<Check size={18} />
											Correct
										</button>
									</div>
								</div>
							)}

							{error && (
								<p className="mt-4 text-center text-sm text-[#A95F7D]">
									{error}
								</p>
							)}

							{submitting && (
								<p className="mt-4 text-center text-xs text-[#887B91]">
									Saving your answer...
								</p>
							)}
						</div>

						<div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#887B91]">
							<span className="inline-flex items-center gap-1.5">
								<CheckCircle2 size={15} className="text-[#4C916B]" />
								{correctCount} correct
							</span>

							<span className="inline-flex items-center gap-1.5">
								<XCircle size={15} className="text-[#A95F7D]" />
								{incorrectCount} incorrect
							</span>
						</div>
					</section>
				)}

				{phase === "completed" && summary && (
					<section className="rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm sm:p-10">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1EAFB] text-[#795F9B]">
							<CheckCircle2 size={34} />
						</div>

						<div className="mt-5 text-center">
							<h1 className="text-2xl font-bold text-[#6F527F] sm:text-3xl">
								Study session completed
							</h1>

							<p className="mt-2 text-sm text-[#887B91]">
								You have reviewed all {summary.total_cards} cards.
							</p>
						</div>

						<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div className="rounded-xl bg-[#FAF7FF] p-4 text-center">
								<p className="text-2xl font-bold text-[#795F9B]">
									{summary.score}%
								</p>
								<p className="mt-1 text-xs text-[#887B91]">Score</p>
							</div>

							<div className="rounded-xl bg-[#FAF7FF] p-4 text-center">
								<p className="text-2xl font-bold text-[#795F9B]">
									{summary.accuracy}%
								</p>
								<p className="mt-1 text-xs text-[#887B91]">Accuracy</p>
							</div>

							<div className="rounded-xl bg-[#F1FAF5] p-4 text-center">
								<p className="text-2xl font-bold text-[#4C916B]">
									{summary.correct_answers}
								</p>
								<p className="mt-1 text-xs text-[#887B91]">Correct</p>
							</div>

							<div className="rounded-xl bg-[#FFF5F7] p-4 text-center">
								<p className="text-2xl font-bold text-[#A95F7D]">
									{summary.incorrect_answers}
								</p>
								<p className="mt-1 text-xs text-[#887B91]">Incorrect</p>
							</div>
						</div>

						<div className="mt-5 flex items-center justify-center gap-2 text-sm text-[#887B91]">
							<Clock3 size={16} />
							{Math.floor(summary.duration_seconds / 60)}m{" "}
							{summary.duration_seconds % 60}s
						</div>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onClick={startStudySession}
								disabled={submitting}
								className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#795F9B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#684D89] disabled:opacity-50"
							>
								<RotateCcw size={17} />
								Study again
							</button>

							<button
								type="button"
								onClick={() => router.push("/dashboard")}
								className="flex-1 rounded-xl border border-[#E7DDF0] px-5 py-3 text-sm font-semibold text-[#795F9B] transition hover:bg-[#FAF7FF]"
							>
								Back to dashboard
							</button>
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
