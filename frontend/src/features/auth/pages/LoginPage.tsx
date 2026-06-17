import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import {
	AlertCircle,
	MessageSquare,
	Layers,
	FileText,
	Award,
	FolderOpen,
	Sparkles,
} from "lucide-react";
import logo from "../../../assets/logo.png";

export const LoginPage: React.FC = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// If already logged in, redirect to dashboard
	useEffect(() => {
		if (user) {
			navigate("/");
		}
	}, [user, navigate]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);
		setLoading(true);

		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password,
			});

			if (error) {
				throw error;
			}

			navigate("/");
		} catch (err) {
			const error = err as Error;
			console.error("Login error:", error);
			setErrorMsg(
				error.message || "Failed to sign in. Please verify your credentials.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen lg:h-screen bg-background text-foreground grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
			{/* Left Column: Branding and Product Feature Explanations (Desktop only) */}
			<div className="hidden lg:flex lg:col-span-7 bg-card border-r border-border relative flex-col justify-between p-8 xl:p-12 overflow-hidden h-full">
				{/* Dynamic Background Blurs */}
				<div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
				<div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>

				{/* Modern grid background pattern */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

				{/* Brand Header */}
				<div className="flex items-center gap-2.5 z-10">
					<img
						src={logo}
						alt="MindForge Logo"
						className="h-11 w-auto object-contain"
					/>
					<span className="font-extrabold text-3xl tracking-tight bg-linear-to-r from-primary to-purple-400 bg-clip-text text-transparent">
						MindForge
					</span>
				</div>

				{/* Feature Lists Content */}
				<div className="z-10 my-auto max-w-xl">
					<div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
						<Sparkles className="w-3 h-3 text-primary animate-pulse" />
						<span>Powering Next-Gen Learning</span>
					</div>

					<h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-transparent leading-tight mb-2 bg-linear-to-br from-foreground via-foreground to-muted-foreground bg-clip-text ">
						Study smarter, learn faster.
					</h2>
					<p className="text-muted-foreground text-xs xl:text-sm mb-5 leading-relaxed">
						MindForge combines artificial intelligence with cognitive learning
						tools to create your ultimate study workspace. Here is what you can
						do:
					</p>

					{/* Feature Cards Stack (no scroll, compact design) */}
					<div className="space-y-2.5">
						{/* Feature 1 */}
						<div className="p-3 rounded-xl border border-border/40 bg-card/45 backdrop-blur-sm flex items-start gap-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/70 hover:translate-x-1">
							<div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
								<MessageSquare className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-xs font-semibold text-foreground">
									AI Chat Companion
								</h3>
								<p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
									Converse directly with study materials. Our AI locates
									relevant references across your uploads to answer questions
									instantly.
								</p>
							</div>
						</div>

						{/* Feature 2 */}
						<div className="p-3 rounded-xl border border-border/40 bg-card/45 backdrop-blur-sm flex items-start gap-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/70 hover:translate-x-1">
							<div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
								<Layers className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-xs font-semibold text-foreground">
									Interactive Flashcards
								</h3>
								<p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
									Automatically convert dense textbook chapters and lecture
									notes into smart flashcards to test your recall.
								</p>
							</div>
						</div>

						{/* Feature 3 */}
						<div className="p-3 rounded-xl border border-border/40 bg-card/45 backdrop-blur-sm flex items-start gap-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/70 hover:translate-x-1">
							<div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
								<Award className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-xs font-semibold text-foreground">
									Practice Quizzes
								</h3>
								<p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
									Assess understanding with AI-generated multiple-choice
									questions accompanied by thorough explanations.
								</p>
							</div>
						</div>

						{/* Feature 4 */}
						<div className="p-3 rounded-xl border border-border/40 bg-card/45 backdrop-blur-sm flex items-start gap-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/70 hover:translate-x-1">
							<div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
								<FileText className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-xs font-semibold text-foreground">
									Instant Note Summarizer
								</h3>
								<p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
									Upload PDF handouts or textbooks. MindForge generates clean,
									structured summaries automatically upon upload.
								</p>
							</div>
						</div>

						{/* Feature 5 */}
						<div className="p-3 rounded-xl border border-border/40 bg-card/45 backdrop-blur-sm flex items-start gap-3 transition-all duration-300 hover:border-primary/30 hover:bg-card/70 hover:translate-x-1">
							<div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
								<FolderOpen className="w-4 h-4" />
							</div>
							<div>
								<h3 className="text-xs font-semibold text-foreground">
									Multi-Subject Workspaces
								</h3>
								<p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
									Organize your study resources by subjects with custom color
									tags to keep notes segmentations clean.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Footer info */}
				<div className="z-10 text-xs text-muted-foreground flex items-center gap-2">
					<span>MindForge</span>
					<span className="w-1.5 h-1.5 rounded-full bg-border"></span>
					<span>© 2026</span>
				</div>
			</div>

			{/* Right Column: Authentication Form */}
			<div className="lg:col-span-5 flex items-center justify-center p-8 lg:p-12 relative flex-col h-full lg:overflow-hidden">
				{/* Glowing Background Glows for Mobile */}
				<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl lg:hidden"></div>

				{/* Mobile Header (Hidden on Desktop) */}
				<div className="w-full max-w-md lg:hidden flex flex-col items-center mb-8 text-center z-10">
					<img
						src={logo}
						alt="MindForge Logo"
						className="h-16 w-auto object-contain mb-3"
					/>
					<h1 className="text-3xl font-extrabold tracking-tight text-foreground">
						MindForge
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Forge knowledge with AI
					</p>
				</div>

				{/* Form Wrap */}
				<div className="w-full max-w-md z-10">
					{/* Desktop Heading (Hidden on Mobile) */}
					<div className="hidden lg:block mb-8">
						<h1 className="text-3xl font-bold tracking-tight text-foreground">
							Sign In
						</h1>
						<p className="text-muted-foreground text-sm mt-2">
							Enter your credentials to access your study room.
						</p>
					</div>

					{errorMsg && (
						<div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
							<AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
							<div>
								<p className="font-semibold">Sign in failed</p>
								<p className="opacity-90">{errorMsg}</p>
							</div>
						</div>
					)}

					<form onSubmit={handleLogin} className="space-y-4">
						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
								Email Address
							</label>
							<input
								type="email"
								required
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground text-sm transition-colors"
							/>
						</div>

						<div>
							<label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
								Password
							</label>
							<input
								type="password"
								required
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground text-sm transition-colors"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full mt-2 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
						>
							{loading ? (
								<div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
							) : (
								"Sign In"
							)}
						</button>

						<div className="text-center mt-4">
							<Link
								to="/forgot-password"
								className="text-xs text-primary hover:underline font-semibold"
							>
								Forgot password?
							</Link>
						</div>
					</form>

					<div className="mt-8 text-center text-sm text-muted-foreground border-t border-border/60 pt-6">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="text-primary hover:underline font-semibold"
						>
							Create account
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};
