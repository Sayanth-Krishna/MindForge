import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import {
	BookOpen,
	Folder,
	FileText,
	HelpCircle,
	Plus,
	ChevronRight,
} from "lucide-react";

interface Subject {
	id: string;
	name: string;
	description?: string;
	color?: string;
	createdAt: string;
	_count?: {
		documents: number;
		quizzes: number;
		flashcards: number;
	};
}

export const DashboardPage: React.FC = () => {
	const queryClient = useQueryClient();
	const [showModal, setShowModal] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	// Fetch subjects with stats counts
	const { data: subjects, isLoading } = useQuery<Subject[]>({
		queryKey: ["subjects"],
		queryFn: async () => {
			const response = await api.get("/subjects");
			// For each subject, fetch documents count so we can display stats
			const rawSubjects = response.data.data;
			const subjectsWithStats = await Promise.all(
				rawSubjects.map(async (sub: Subject) => {
					try {
						const docsRes = await api.get(`/documents/subject/${sub.id}`);
						const cardsRes = await api.get(`/flashcards/subject/${sub.id}`);
						const quizRes = await api.get(`/quizzes/subject/${sub.id}`);
						return {
							...sub,
							_count: {
								documents: docsRes.data.data.length,
								flashcards: cardsRes.data.data.length,
								quizzes: quizRes.data.data.length,
							},
						};
					} catch {
						return {
							...sub,
							_count: { documents: 0, flashcards: 0, quizzes: 0 },
						};
					}
				}),
			);
			return subjectsWithStats;
		},
	});

	// Create Subject mutation
	const createSubjectMutation = useMutation({
		mutationFn: async (payload: {
			name: string;
			description?: string;
			color: string;
		}) => {
			const response = await api.post("/subjects", payload);
			return response.data.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subjects"] });
			setName("");
			setDescription("");
			setShowModal(false);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const colors = [
			"#8B5CF6",
			"#EC4899",
			"#3B82F6",
			"#10B981",
			"#F59E0B",
			"#EF4444",
		];
		const color = colors[Math.floor(Math.random() * colors.length)];

		createSubjectMutation.mutate({
			name: name.trim(),
			description: description.trim() || undefined,
			color,
		});
	};

	// Calculate cumulative stats
	const totalSubjects = subjects?.length || 0;
	const totalDocuments =
		subjects?.reduce((sum, s) => sum + (s._count?.documents || 0), 0) || 0;
	const totalQuizzes =
		subjects?.reduce((sum, s) => sum + (s._count?.quizzes || 0), 0) || 0;
	const totalCards =
		subjects?.reduce((sum, s) => sum + (s._count?.flashcards || 0), 0) || 0;

	return (
		<div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
			<title>Study Dashboard | MindForge</title>
			<meta name="description" content="Manage your subjects, upload course handouts or notes, and interact with your files through RAG chat, dynamic flashcards, and quizzes." />
			{/* Header Welcome banner */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
				<div>
					<h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
						Study Dashboard
					</h1>
					<p className="text-muted-foreground text-sm mt-1.5">
						Manage your subjects, upload course notes, and generate RAG study
						companions.
					</p>
				</div>
				<button
					onClick={() => setShowModal(true)}
					className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm transition-all self-start md:self-auto shadow-lg shadow-primary/10 active:scale-[0.98]"
				>
					<Plus className="w-4 h-4" />
					<span>New Subject</span>
				</button>
			</div>

			{/* Stats Board */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{[
					{
						label: "Total Subjects",
						value: totalSubjects,
						icon: Folder,
						color: "text-violet-500 bg-violet-500/10",
					},
					{
						label: "PDF Documents",
						value: totalDocuments,
						icon: FileText,
						color: "text-blue-500 bg-blue-500/10",
					},
					{
						label: "AI Flashcards",
						value: totalCards,
						icon: BookOpen,
						color: "text-pink-500 bg-pink-500/10",
					},
					{
						label: "AI Quizzes",
						value: totalQuizzes,
						icon: HelpCircle,
						color: "text-amber-500 bg-amber-500/10",
					},
				].map((stat, i) => (
					<div
						key={i}
						className="glass p-5 rounded-xl flex items-center justify-between"
					>
						<div>
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{stat.label}
							</p>
							<h3 className="text-2xl font-bold mt-1 text-foreground">
								{isLoading ? "..." : stat.value}
							</h3>
						</div>
						<div className={`p-3 rounded-lg ${stat.color}`}>
							<stat.icon className="w-5 h-5" />
						</div>
					</div>
				))}
			</div>

			{/* Subjects section */}
			<div>
				<h2 className="text-lg font-bold mb-4 flex items-center gap-2">
					<span>Your Subjects</span>
					<span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
						{totalSubjects}
					</span>
				</h2>

				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3].map((n) => (
							<div
								key={n}
								className="h-44 rounded-xl border border-border bg-card/40 animate-pulse-slow"
							></div>
						))}
					</div>
				) : subjects && subjects.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{subjects.map((sub) => (
							<Link
								key={sub.id}
								to={`/subjects/${sub.id}`}
								className="group border border-border bg-card/40 hover:bg-secondary/40 hover:border-primary/40 rounded-xl p-5 transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden"
							>
								{/* Visual decoration color band */}
								<div
									className="absolute top-0 left-0 right-0 h-1"
									style={{ backgroundColor: sub.color || "#8B5CF6" }}
								/>

								<div className="space-y-2">
									<h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
										{sub.name}
									</h3>
									<p className="text-muted-foreground text-xs line-clamp-2">
										{sub.description || "No description provided."}
									</p>
								</div>

								<div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
									<div className="flex gap-3">
										<span>{sub._count?.documents || 0} docs</span>
										<span>•</span>
										<span>{sub._count?.flashcards || 0} cards</span>
										<span>•</span>
										<span>{sub._count?.quizzes || 0} quizzes</span>
									</div>
									<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform group-hover:text-primary" />
								</div>
							</Link>
						))}
					</div>
				) : (
					<div className="text-center border border-dashed border-border py-16 px-4 rounded-xl max-w-md mx-auto flex flex-col items-center gap-4 bg-card/25 mt-4">
						<div className="p-4 rounded-full bg-secondary text-muted-foreground">
							<Folder className="w-8 h-8 stroke-1" />
						</div>
						<div>
							<h3 className="font-bold text-lg text-foreground">
								Create your first subject
							</h3>
							<p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
								Begin by creating a subject space like "Computer Science" or
								"Biology" to organize your documents.
							</p>
						</div>
						<button
							onClick={() => setShowModal(true)}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 font-semibold text-sm transition-all"
						>
							<Plus className="w-4 h-4" />
							<span>Get Started</span>
						</button>
					</div>
				)}
			</div>

			{/* Create Subject Modal */}
			{showModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
					<div className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl animate-scale-up">
						<h3 className="text-lg font-bold text-foreground">
							Create New Subject
						</h3>
						<p className="text-muted-foreground text-xs mt-1">
							Group your syllabus resources in a dedicated workspace
						</p>

						<form onSubmit={handleSubmit} className="mt-4 space-y-4">
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
									Subject Name
								</label>
								<input
									type="text"
									required
									placeholder="e.g. Organic Chemistry, Algorithms"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-3 py-2 rounded-lg border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground text-sm"
								/>
							</div>

							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
									Description (Optional)
								</label>
								<textarea
									placeholder="Summarize course topics, class codes, or exam dates..."
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={3}
									className="w-full px-3 py-2 rounded-lg border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground text-sm resize-none"
								/>
							</div>

							<div className="flex gap-3 justify-end pt-2">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={createSubjectMutation.isPending}
									className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-2"
								>
									{createSubjectMutation.isPending
										? "Saving..."
										: "Create Subject"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
