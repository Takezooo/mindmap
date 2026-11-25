"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
	ArrowLeft,
	BookOpen,
	Check,
	CheckCircle2,
	Clock3,
	RotateCcw,
	Volume2,
	VolumeX,
	X,
	XCircle,
} from "lucide-react";

import ThemeToggle from "@/components/theme/ThemeToggle";

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
type SoundType = "reveal" | "correct" | "incorrect" | "complete";

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
	const [completionPending, setCompletionPending] = useState(false);

	const [reviewedCount, setReviewedCount] = useState(0);
	const [correctCount, setCorrectCount] = useState(0);
	const [incorrectCount, setIncorrectCount] = useState(0);

	const [summary, setSummary] = useState<FlashcardSessionSummary | null>(null);

	const [cardStartedAt, setCardStartedAt] = useState<number | null>(null);
	const [soundEnabled, setSoundEnabled] = useState(true);

	const audioContextRef = useRef<AudioContext | null>(null);

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

	useEffect(() => {
		const savedPreference = window.localStorage.getItem("mindmap-study-sound");

		setSoundEnabled(savedPreference !== "off");
	}, []);

	const playSound = useCallback(
		(type: SoundType) => {
			if (!soundEnabled || typeof window === "undefined") return;

			try {
				const AudioContextConstructor =
					window.AudioContext ||
					(
						window as typeof window & {
							webkitAudioContext?: typeof AudioContext;
						}
					).webkitAudioContext;

				if (!AudioContextConstructor) return;

				const context =
					audioContextRef.current ?? new AudioContextConstructor();

				audioContextRef.current = context;

				if (context.state === "suspended") {
					void context.resume();
				}

				const sounds: Record<
					SoundType,
					{ frequencies: number[]; duration: number }
				> = {
					reveal: {
						frequencies: [440],
						duration: 0.12,
					},
					correct: {
						frequencies: [523, 659, 784],
						duration: 0.13,
					},
					incorrect: {
						frequencies: [220, 165],
						duration: 0.16,
					},
					complete: {
						frequencies: [523, 659, 784, 1046],
						duration: 0.16,
					},
				};

				const sound = sounds[type];
				const startTime = context.currentTime;

				sound.frequencies.forEach((frequency, index) => {
					const oscillator = context.createOscillator();
					const gain = context.createGain();

					const noteStart = startTime + index * 0.09;
					const noteEnd = noteStart + sound.duration;

					oscillator.type = "sine";
					oscillator.frequency.setValueAtTime(frequency, noteStart);

					gain.gain.setValueAtTime(0.0001, noteStart);
					gain.gain.exponentialRampToValueAtTime(0.055, noteStart + 0.025);
					gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

					oscillator.connect(gain);
					gain.connect(context.destination);

					oscillator.start(noteStart);
					oscillator.stop(noteEnd + 0.02);
				});
			} catch (error) {
				console.warn("Unable to play study sound:", error);
			}
		},
		[soundEnabled],
	);

	const toggleSound = () => {
		setSoundEnabled((previous) => {
			const next = !previous;
			window.localStorage.setItem("mindmap-study-sound", next ? "on" : "off");
			return next;
		});
	};

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
			setCompletionPending(false);
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

	const retrySessionCompletion = async () => {
		if (!sessionId || submitting || !completionPending) return;

		try {
			setSubmitting(true);
			setError("");

			const completed = await completeFlashcardSession(sessionId);
			const sessionSummary = await getFlashcardSessionSummary(completed.id);

			setSummary(sessionSummary);
			setCompletionPending(false);
			setPhase("completed");
			playSound("complete");
		} catch (error) {
			console.error(error);
			setError(
				"Your final answer is saved, but the results could not be loaded. Try again.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const submitAnswer = async (isCorrect: boolean) => {
		if (
			!sessionId ||
			!currentCard ||
			!revealed ||
			submitting ||
			completionPending
		) {
			return;
		}

		playSound(isCorrect ? "correct" : "incorrect");

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
				setCompletionPending(true);

				try {
					const completed = await completeFlashcardSession(sessionId);

					const sessionSummary = await getFlashcardSessionSummary(completed.id);

					setSummary(sessionSummary);
					setCompletionPending(false);
					setPhase("completed");
					playSound("complete");
				} catch (completionError) {
					console.error(completionError);
					setError(
						"Your final answer is saved, but the results could not be loaded. Try again.",
					);
				}
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

	const returnToDashboard = () => {
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

	const revealAnswer = () => {
		if (revealed || submitting) return;

		setRevealed(true);
		playSound("reveal");
	};

	const progress = cards.length > 0 ? (reviewedCount / cards.length) * 100 : 0;

	if (loading) {
		return (
			<main className="flashcard-study-page flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF] dark:bg-[#17131F]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E7DDF0] border-t-[#9B7EBD] dark:border-[#51405F] dark:border-t-[#B18BCF]" />
			</main>
		);
	}

	if (error && !deck) {
		return (
			<main className="flashcard-study-page flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF] p-5 text-[#493C55] dark:bg-[#17131F] dark:text-[#EEE7F5]">
				<div className="text-center">
					<p className="text-sm text-[#A95F7D]">{error}</p>

					<button
						type="button"
						onClick={() => router.push("/dashboard")}
						className="study-primary-button mt-5 rounded-xl bg-[#795F9B] px-5 py-3 text-sm font-semibold text-white"
					>
						Return to dashboard
					</button>
				</div>
			</main>
		);
	}

	if (!deck) return null;

	return (
		<main className="flashcard-study-page min-h-[100dvh] bg-[#FAF7FF] px-4 py-6 text-[#493C55] dark:bg-[#17131F] dark:text-[#EEE7F5] sm:px-8 sm:py-10">
			<div className="mx-auto max-w-4xl">
				<header className="mb-8 flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={returnToDashboard}
						className="study-back-button inline-flex items-center gap-2 rounded-xl border border-[#E7DDF0] bg-white px-4 py-2.5 text-sm font-semibold text-[#795F9B] shadow-sm transition hover:border-[#C9B2DE] hover:bg-[#F8F3FC] dark:border-[#51405F] dark:bg-[#241E2D] dark:text-[#DFCAF1] dark:hover:border-[#806A96] dark:hover:bg-[#352B40]"
					>
						<ArrowLeft size={17} />
						<span>Back to dashboard</span>
					</button>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={toggleSound}
							aria-label={
								soundEnabled ? "Mute study sounds" : "Enable study sounds"
							}
							title={soundEnabled ? "Mute study sounds" : "Enable study sounds"}
							className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7DDF0] bg-white text-[#795F9B] shadow-sm transition hover:bg-[#F1EAFB] dark:border-[#51405F] dark:bg-[#241E2D] dark:text-[#DFCAF1] dark:hover:bg-[#352B40]"
						>
							{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
						</button>

						<ThemeToggle />
					</div>
				</header>

				{phase === "ready" && (
					<section className="study-panel rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm dark:border-[#51405F] dark:bg-[#241E2D] sm:p-10">
						<div className="study-icon-glow inline-flex rounded-xl bg-[#F1EAFB] p-4 text-[#795F9B] dark:bg-[#352B40] dark:text-[#DFCAF1]">
							<BookOpen size={28} />
						</div>

						<h1 className="mt-5 break-words text-2xl font-bold text-[#6F527F] dark:text-[#DFCAF4] sm:text-3xl">
							{deck.title}
						</h1>

						{deck.description && (
							<p className="mt-3 text-sm leading-relaxed text-[#887B91] dark:text-[#B8A8C6]">
								{deck.description}
							</p>
						)}

						<div className="mt-6 border-t border-[#E7DDF0] pt-5 dark:border-[#51405F]">
							<p className="text-sm text-[#887B91] dark:text-[#B8A8C6]">
								{cards.length} flashcard
								{cards.length === 1 ? "" : "s"}
							</p>

							{cards.length === 0 ? (
								<div className="mt-8 rounded-xl border border-dashed border-[#DCCBE8] bg-[#FAF7FF] p-8 text-center dark:border-[#51405F] dark:bg-[#211B2A]">
									<BookOpen size={30} className="mx-auto text-[#9B7EBD]" />
									<h2 className="mt-3 font-semibold text-[#6F527F] dark:text-[#DFCAF4]">
										No flashcards available
									</h2>
									<p className="mt-2 text-sm text-[#887B91] dark:text-[#B8A8C6]">
										Add flashcards to this deck before studying.
									</p>
								</div>
							) : (
								<div className="mt-8 rounded-xl border border-dashed border-[#DCCBE8] bg-[#FAF7FF] p-8 text-center dark:border-[#51405F] dark:bg-[#211B2A]">
									<BookOpen size={30} className="mx-auto text-[#9B7EBD]" />
									<h2 className="mt-3 font-semibold text-[#6F527F] dark:text-[#DFCAF4]">
										Your study space
									</h2>
									<p className="mt-2 text-sm text-[#887B91] dark:text-[#B8A8C6]">
										Review each question, reveal its answer, and evaluate your
										understanding.
									</p>

									<button
										type="button"
										onClick={startStudySession}
										disabled={submitting}
										className="study-primary-button mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#795F9B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#684D89] disabled:cursor-not-allowed disabled:opacity-50"
									>
										<BookOpen size={17} />
										{submitting ? "Starting..." : "Start studying"}
									</button>
								</div>
							)}
						</div>

						{error && (
							<p className="mt-4 text-center text-sm text-[#A95F7D]">{error}</p>
						)}
					</section>
				)}

				{phase === "studying" && currentCard && (
					<section>
						<div className="mb-6 flex items-center justify-between gap-4">
							<div className="min-w-0">
								<h1 className="truncate text-lg font-bold text-[#6F527F] dark:text-[#DFCAF4]">
									{deck.title}
								</h1>
								<p className="mt-1 text-xs text-[#887B91] dark:text-[#B8A8C6]">
									Card {currentIndex + 1} of {cards.length}
								</p>
							</div>

							<div className="shrink-0 text-right text-xs text-[#887B91] dark:text-[#B8A8C6]">
								{reviewedCount} reviewed
							</div>
						</div>

						<div
							className="h-2 overflow-hidden rounded-full bg-[#E7DDF0] dark:bg-[#352B40]"
							role="progressbar"
							aria-label="Study progress"
							aria-valuenow={reviewedCount}
							aria-valuemin={0}
							aria-valuemax={cards.length}
						>
							<div
								className="study-progress-fill h-full rounded-full bg-[#9B7EBD] dark:bg-[#B18BCF]"
								style={{ width: `${progress}%` }}
							/>
						</div>

						<div
							key={currentCard.id}
							className="study-card study-panel mt-8 rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm dark:border-[#51405F] dark:bg-[#241E2D] sm:p-10"
						>
							<div className="flex items-center justify-between">
								<span className="rounded-full bg-[#F1EAFB] px-3 py-1 text-xs font-semibold text-[#795F9B] dark:bg-[#352B40] dark:text-[#DFCAF4]">
									{revealed ? "ANSWER" : "QUESTION"}
								</span>

								<span className="text-xs text-[#A397AC] dark:text-[#A99BB5]">
									{currentCard.type.replace("_", " ")}
								</span>
							</div>

							<div className="flex min-h-[260px] flex-col items-center justify-center py-10 text-center">
								<p
									key={revealed ? "answer" : "question"}
									className="study-reveal whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed text-[#6F527F] dark:text-[#DFCAF4] sm:text-2xl"
								>
									{revealed ? currentCard.back : currentCard.front}
								</p>

								{revealed && (
									<p className="mt-5 text-xs text-[#A397AC] dark:text-[#A99BB5]">
										Answer revealed
									</p>
								)}
							</div>

							{!revealed ? (
								<button
									type="button"
									onClick={revealAnswer}
									className="study-primary-button w-full rounded-xl bg-[#795F9B] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#684D89]"
								>
									Reveal answer
								</button>
							) : completionPending ? (
								<div className="rounded-xl border border-[#DCCBE8] bg-[#FAF7FF] p-5 text-center dark:border-[#51405F] dark:bg-[#211B2A]">
									<CheckCircle2 size={25} className="mx-auto text-[#4C916B]" />
									<p className="mt-2 text-sm font-semibold text-[#6F527F] dark:text-[#DFCAF4]">
										Your final answer has been saved.
									</p>
									<p className="mt-1 text-xs text-[#887B91] dark:text-[#B8A8C6]">
										We just need to finish preparing your results.
									</p>
									<button
										type="button"
										onClick={retrySessionCompletion}
										disabled={submitting}
										className="study-primary-button mt-4 rounded-xl bg-[#795F9B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
									>
										{submitting ? "Preparing results..." : "Retry results"}
									</button>
								</div>
							) : (
								<div>
									<p className="mb-4 text-center text-sm font-medium text-[#887B91] dark:text-[#B8A8C6]">
										Did you get it right?
									</p>

									<div className="grid grid-cols-2 gap-3">
										<button
											type="button"
											onClick={() => submitAnswer(false)}
											disabled={submitting}
											className="study-answer-button study-incorrect-button inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8C9D2] bg-[#FFF5F7] px-4 py-3.5 text-sm font-semibold text-[#A95F7D] transition hover:bg-[#FCE8ED] disabled:opacity-50 dark:border-[#754452] dark:bg-[#3B2633] dark:text-[#F0B6C7] dark:hover:bg-[#452A36]"
										>
											<X size={18} />
											Incorrect
										</button>

										<button
											type="button"
											onClick={() => submitAnswer(true)}
											disabled={submitting}
											className="study-answer-button study-correct-button inline-flex items-center justify-center gap-2 rounded-xl border border-[#C8E4D5] bg-[#F1FAF5] px-4 py-3.5 text-sm font-semibold text-[#4C916B] transition hover:bg-[#E4F5EB] disabled:opacity-50 dark:border-[#426B54] dark:bg-[#243A30] dark:text-[#9DD5B2] dark:hover:bg-[#2B4738]"
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

							{submitting && !completionPending && (
								<p className="mt-4 text-center text-xs text-[#887B91] dark:text-[#B8A8C6]">
									Saving your answer...
								</p>
							)}
						</div>

						<div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#887B91] dark:text-[#B8A8C6]">
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
					<section className="study-panel rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm dark:border-[#51405F] dark:bg-[#241E2D] sm:p-10">
						<div className="study-result-icon mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1EAFB] text-[#795F9B] dark:bg-[#352B40] dark:text-[#DFCAF4]">
							<CheckCircle2 size={34} />
						</div>

						<div className="mt-5 text-center">
							<h1 className="text-2xl font-bold text-[#6F527F] dark:text-[#DFCAF4] sm:text-3xl">
								Study session completed
							</h1>
							<p className="mt-2 text-sm text-[#887B91] dark:text-[#B8A8C6]">
								You have reviewed all {summary.total_cards} cards.
							</p>
						</div>

						<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div className="study-stat-card rounded-xl bg-[#FAF7FF] p-4 text-center dark:bg-[#211B2A]">
								<p className="text-2xl font-bold text-[#795F9B] dark:text-[#D9C3EC]">
									{summary.score}%
								</p>
								<p className="mt-1 text-xs text-[#887B91] dark:text-[#B8A8C6]">
									Score
								</p>
							</div>

							<div className="study-stat-card rounded-xl bg-[#FAF7FF] p-4 text-center dark:bg-[#211B2A]">
								<p className="text-2xl font-bold text-[#795F9B] dark:text-[#D9C3EC]">
									{summary.accuracy}%
								</p>
								<p className="mt-1 text-xs text-[#887B91] dark:text-[#B8A8C6]">
									Accuracy
								</p>
							</div>

							<div className="study-stat-card rounded-xl bg-[#F1FAF5] p-4 text-center dark:bg-[#243A30]">
								<p className="text-2xl font-bold text-[#4C916B] dark:text-[#9DD5B2]">
									{summary.correct_answers}
								</p>
								<p className="mt-1 text-xs text-[#887B91] dark:text-[#B8A8C6]">
									Correct
								</p>
							</div>

							<div className="study-stat-card rounded-xl bg-[#FFF5F7] p-4 text-center dark:bg-[#3B2633]">
								<p className="text-2xl font-bold text-[#A95F7D] dark:text-[#F0B6C7]">
									{summary.incorrect_answers}
								</p>
								<p className="mt-1 text-xs text-[#887B91] dark:text-[#B8A8C6]">
									Incorrect
								</p>
							</div>
						</div>

						<div className="mt-5 flex items-center justify-center gap-2 text-sm text-[#887B91] dark:text-[#B8A8C6]">
							<Clock3 size={16} />
							{Math.floor(summary.duration_seconds / 60)}m{" "}
							{summary.duration_seconds % 60}s
						</div>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onClick={startStudySession}
								disabled={submitting}
								className="study-primary-button inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#795F9B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#684D89] disabled:opacity-50"
							>
								<RotateCcw size={17} />
								Study again
							</button>

							<button
								type="button"
								onClick={() => router.push("/dashboard")}
								className="study-back-button flex-1 rounded-xl border border-[#E7DDF0] bg-white px-5 py-3 text-sm font-semibold text-[#795F9B] transition hover:bg-[#FAF7FF] dark:border-[#51405F] dark:bg-[#241E2D] dark:text-[#DFCAF1] dark:hover:bg-[#352B40]"
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
