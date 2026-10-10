"use client";

import { useState, type SubmitEvent } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
	const router = useRouter();

	const supabase = createClient();

	const [mode, setMode] = useState<"login" | "signup">("login");

	const [email, setEmail] = useState("");

	const [password, setPassword] = useState("");

	const [loading, setLoading] = useState(false);

	const [message, setMessage] = useState("");

	const [error, setError] = useState("");

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();

		setLoading(true);
		setError("");
		setMessage("");

		try {
			if (mode === "login") {
				const { error: loginError } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (loginError) {
					setError(loginError.message);

					return;
				}

				router.push("/editor");
				router.refresh();

				return;
			}

			const { data, error: signupError } = await supabase.auth.signUp({
				email,
				password,
			});

			if (signupError) {
				setError(signupError.message);

				return;
			}

			if (data.session) {
				router.push("/editor");
				router.refresh();

				return;
			}

			setMessage("Account created successfully.");
		} catch (err) {
			console.error(err);

			setError("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF] px-5 py-10">
			<div className="w-full max-w-md">
				<div className="rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm sm:p-8">
					{/* HEADER */}

					<div className="text-center">
						<Link href="/" className="text-3xl font-bold text-[#6F527F]">
							Riri's MindMap
						</Link>

						<p className="mt-2 text-sm text-[#887B91]">
							LOCKIN!
						</p>
					</div>

					{/* MODE SWITCH */}

					<div className="mt-7 grid grid-cols-2 rounded-xl bg-[#F1EAFB] p-1">
						<button
							type="button"
							onClick={() => {
								setMode("login");
								setError("");
								setMessage("");
							}}
							className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
								mode === "login"
									? "bg-white text-[#6F527F] shadow-sm"
									: "text-[#887B91]"
							}`}
						>
							Log in
						</button>

						<button
							type="button"
							onClick={() => {
								setMode("signup");
								setError("");
								setMessage("");
							}}
							className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
								mode === "signup"
									? "bg-white text-[#6F527F] shadow-sm"
									: "text-[#887B91]"
							}`}
						>
							Create account
						</button>
					</div>

					{/* FORM */}

					<form onSubmit={handleSubmit} className="mt-6 space-y-4">
						<div>
							<label
								htmlFor="email"
								className="mb-1.5 block text-sm font-medium text-[#3F3545]"
							>
								Email
							</label>

							<input
								id="email"
								type="email"
								value={email}
								onChange={(event) => {
									setEmail(event.target.value);
								}}
								required
								autoComplete="email"
								placeholder="you@example.com"
								className="w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-3 py-3 text-sm text-[#3F3545] outline-none transition focus:border-[#9B7EBD] focus:ring-2 focus:ring-[#E9DDF2]"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="mb-1.5 block text-sm font-medium text-[#3F3545]"
							>
								Password
							</label>

							<input
								id="password"
								type="password"
								value={password}
								onChange={(event) => {
									setPassword(event.target.value);
								}}
								required
								minLength={6}
								autoComplete={
									mode === "login" ? "current-password" : "new-password"
								}
								placeholder="Your password"
								className="w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-3 py-3 text-sm text-[#3F3545] outline-none transition focus:border-[#9B7EBD] focus:ring-2 focus:ring-[#E9DDF2]"
							/>
						</div>

						{/* ERROR */}

						{error && (
							<div className="rounded-xl border border-[#E8C5D5] bg-[#FCEFF4] px-3 py-3 text-sm text-[#A95F7D]">
								{error}
							</div>
						)}

						{/* MESSAGE */}

						{message && (
							<div className="rounded-xl border border-[#DCCBE8] bg-[#F1EAFB] px-3 py-3 text-sm text-[#6F527F]">
								{message}
							</div>
						)}

						{/* SUBMIT */}

						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-xl bg-[#9B7EBD] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6F527F] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading
								? "Please wait..."
								: mode === "login"
									? "Log in"
									: "Create account"}
						</button>
					</form>

					<p className="mt-6 text-center text-xs leading-5 text-[#887B91]">
						{mode === "signup"
							? "You will need to verify your email before signing in."
							: "Use the email and password associated with your account."}
					</p>
				</div>
			</div>
		</main>
	);
}
