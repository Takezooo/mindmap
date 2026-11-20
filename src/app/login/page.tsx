"use client";

import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function LoginPage() {
	const router = useRouter();
	const supabase = useMemo(() => createClient(), []);
	
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

				router.push("/dashboard");
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

	useEffect(() => {
		let active = true;

		async function checkSession() {
			const { data, error } = await supabase.auth.getUser();

			if (active && !error && data.user) {
				router.replace("/dashboard");
				router.refresh();
			}
		}

		checkSession();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session?.user) {
				router.replace("/dashboard");
				router.refresh();
			}
		});

		return () => {
			active = false;
			subscription.unsubscribe();
		};
	}, [router, supabase]);

	return (
		<main className="login-page relative flex min-h-[100dvh] items-center justify-center bg-[#FAF7FF] px-5 py-10 text-[#3F3545] transition-colors duration-200">
			{/* Theme toggle */}
			<div className="absolute right-5 top-5 sm:right-8 sm:top-8">
				<ThemeToggle />
			</div>

			<div className="w-full max-w-md">
				<div className="login-card rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-sm transition-colors duration-200 sm:p-8">
					{/* HEADER */}
					<div className="text-center">
						<Link
							href="/"
							className="login-title text-3xl font-bold text-[#6F527F]"
						>
							Riri's MindMap
						</Link>

						<p className="login-muted mt-2 text-sm text-[#887B91]">LOCKIN!</p>
					</div>

					{/* MODE SWITCH */}
					<div className="login-tabs mt-7 grid grid-cols-2 rounded-xl bg-[#F1EAFB] p-1">
						<button
							type="button"
							onClick={() => {
								setMode("login");
								setError("");
								setMessage("");
							}}
							className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
								mode === "login"
									? "login-tab-active bg-white text-[#6F527F] shadow-sm"
									: "login-tab-inactive text-[#887B91]"
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
									? "login-tab-active bg-white text-[#6F527F] shadow-sm"
									: "login-tab-inactive text-[#887B91]"
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
								className="login-label mb-1.5 block text-sm font-medium text-[#3F3545]"
							>
								Email
							</label>

							<input
								id="email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
								autoComplete="email"
								placeholder="you@example.com"
								className="login-input w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-3 py-3 text-sm text-[#3F3545] outline-none transition focus:border-[#9B7EBD] focus:ring-2 focus:ring-[#E9DDF2]"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="login-label mb-1.5 block text-sm font-medium text-[#3F3545]"
							>
								Password
							</label>

							<input
								id="password"
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								required
								minLength={6}
								autoComplete={
									mode === "login" ? "current-password" : "new-password"
								}
								placeholder="Your password"
								className="login-input w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-3 py-3 text-sm text-[#3F3545] outline-none transition focus:border-[#9B7EBD] focus:ring-2 focus:ring-[#E9DDF2]"
							/>
						</div>

						{/* ERROR */}
						{error && (
							<div className="login-error rounded-xl border border-[#E8C5D5] bg-[#FCEFF4] px-3 py-3 text-sm text-[#A95F7D]">
								{error}
							</div>
						)}

						{/* MESSAGE */}
						{message && (
							<div className="login-message rounded-xl border border-[#DCCBE8] bg-[#F1EAFB] px-3 py-3 text-sm text-[#6F527F]">
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

					<p className="login-muted mt-6 text-center text-xs leading-5 text-[#887B91]">
						{mode === "signup"
							? "You will need to verify your email before signing in."
							: "Use the email and password associated with your account."}
					</p>
				</div>
			</div>
		</main>
	);
}
