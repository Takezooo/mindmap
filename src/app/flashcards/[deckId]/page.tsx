"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { FlashcardDeck } from "@/types/flashcard";

import { testFlashcardSession } from "@/lib/test-flashcards";
export default function FlashcardDeckPage() {
	const router = useRouter();
	const params = useParams<{ deckId: string }>();

	const [deck, setDeck] = useState<FlashcardDeck | null>(null);
	const [cardCount, setCardCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		async function loadDeck() {
			try {
				const supabase = createClient();

				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();

				if (authError) throw authError;

				if (!user) {
					router.replace("/login");
					return;
				}

				const { data, error: deckError } = await supabase
					.from("flashcard_decks")
					.select("*")
					.eq("id", params.deckId)
					.eq("user_id", user.id)
					.single();

				if (deckError) throw deckError;

				setDeck(data as FlashcardDeck);

				const { count, error: countError } = await supabase
					.from("flashcards")
					.select("*", { count: "exact", head: true })
					.eq("deck_id", params.deckId);

				if (countError) throw countError;

				setCardCount(count ?? 0);
			} catch (error) {
				console.error(error);
				setError("Unable to load this flashcard deck.");
			} finally {
				setLoading(false);
			}
		}

		void loadDeck();
	}, [params.deckId, router]);

	if (loading) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF]">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E7DDF0] border-t-[#9B7EBD]" />
			</main>
		);
	}

	if (error || !deck) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF] p-5">
				<div className="text-center">
					<p className="text-sm text-[#A95F7D]">
						{error || "Flashcard deck not found."}
					</p>

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

	return (
		<main className="min-h-[100dvh] bg-[#FAF7FF] px-4 py-6 text-[#3F3545] sm:px-8 sm:py-10">
			<div className="mx-auto max-w-4xl">
				<button
					type="button"
					onClick={() => router.push("/dashboard")}
					className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#795F9B] hover:underline"
				>
					<ArrowLeft size={17} />
					Back to dashboard
				</button>

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
							{cardCount} flashcard{cardCount === 1 ? "" : "s"}
						</p>

						<div className="mt-8 rounded-xl border border-dashed border-[#DCCBE8] bg-[#FAF7FF] p-8 text-center">
							<BookOpen size={30} className="mx-auto text-[#9B7EBD]" />

							<h2 className="mt-3 font-semibold text-[#6F527F]">
								Your study space
							</h2>
							<button
								onClick={async () => {
									try {
										const result = await testFlashcardSession(deck.id);
										console.log("FULL TEST RESULT:", result);
										alert("Flashcard session test passed. Check the console.");
									} catch (error) {
										console.error(error);
										alert(
											error instanceof Error ? error.message : "Test failed.",
										);
									}
								}}
							>
								Run Flashcard Test
							</button>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
