import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import {
	LogOut,
	Moon,
	Sun,
	Menu,
	X,
	Plus,
	ChevronRight,
	FolderOpen,
	Settings,
} from "lucide-react";
import logo from "../assets/logo.png";
import { ChangePasswordModal } from "../features/auth/pages/ChangePasswordModal";

interface Subject {
	id: string;
	name: string;
	color?: string;
}

export const DashboardLayout: React.FC = () => {
	const { user, loading, signOut } = useAuth();
	const navigate = useNavigate();
	const { subjectId } = useParams<{ subjectId?: string }>();

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
	const [isDark, setIsDark] = useState(() => {
		// Default to light mode
		const saved = localStorage.getItem("theme");
		return saved ? saved === "dark" : false;
	});

	// Toggle Dark Mode
	useEffect(() => {
		if (isDark) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	}, [isDark]);

	// Auth Protection guard
	useEffect(() => {
		if (!loading && !user) {
			navigate("/login");
		}
	}, [user, loading, navigate]);

	// Fetch subjects for sidebar navigation list
	const { data: subjects, refetch: refetchSubjects } = useQuery<Subject[]>({
		queryKey: ["subjects"],
		queryFn: async () => {
			const response = await api.get("/subjects");
			return response.data.data;
		},
		enabled: !!user,
	});

	const [newSubjectName, setNewSubjectName] = useState("");
	const [showAddSubject, setShowAddSubject] = useState(false);

	const handleCreateSubject = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newSubjectName.trim()) return;

		try {
			// Pick a random hex color for the new subject tagging
			const colors = [
				"#8B5CF6",
				"#EC4899",
				"#3B82F6",
				"#10B981",
				"#F59E0B",
				"#EF4444",
			];
			const randomColor = colors[Math.floor(Math.random() * colors.length)];

			await api.post("/subjects", {
				name: newSubjectName.trim(),
				color: randomColor,
			});

			setNewSubjectName("");
			setShowAddSubject(false);
			refetchSubjects();
		} catch (err) {
			console.error("Error creating subject:", err);
		}
	};

	if (loading || !user) {
		return (
			<div className="min-h-screen bg-background text-foreground flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
					<p className="text-muted-foreground text-sm font-medium animate-pulse">
						Loading MindForge...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground flex overflow-hidden">
			{/* Sidebar for desktop */}
			<aside
				className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card/60 backdrop-blur-md transition-transform duration-300 md:translate-x-0 md:static md:flex md:flex-col ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Sidebar Header */}
				<div className="h-16 flex items-center justify-between px-4 border-b border-border">
					<Link
						to="/"
						className="flex items-center gap-2.5"
						onClick={() => setSidebarOpen(false)}
					>
						<img
							src={logo}
							alt="MindForge Logo"
							className="h-10 w-auto object-contain"
						/>
						<span className="font-extrabold text-3xl tracking-tight bg-linear-to-r from-primary to-purple-400 bg-clip-text text-transparent">
							MindForge
						</span>
					</Link>
					<button
						className="p-1 md:hidden hover:bg-muted rounded-md"
						onClick={() => setSidebarOpen(false)}
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Subjects list */}
				<div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
					<div>
						<div className="flex items-center justify-between px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							<span>Study Subjects</span>
							<button
								onClick={() => setShowAddSubject(!showAddSubject)}
								className="p-1 hover:bg-secondary hover:text-foreground rounded transition-colors"
								title="Create Subject"
							>
								<Plus className="w-4 h-4" />
							</button>
						</div>

						{/* Quick add inline form */}
						{showAddSubject && (
							<form
								onSubmit={handleCreateSubject}
								className="px-3 mb-3 flex items-center gap-2"
							>
								<input
									type="text"
									placeholder="Subject name..."
									value={newSubjectName}
									onChange={(e) => setNewSubjectName(e.target.value)}
									className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-background/50 focus:outline-none focus:border-primary text-foreground"
									autoFocus
								/>
								<button
									type="submit"
									className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
								>
									<Plus className="w-3.5 h-3.5" />
								</button>
							</form>
						)}

						<div className="space-y-1">
							{subjects && subjects.length > 0 ? (
								subjects.map((sub) => {
									const isActive = subjectId === sub.id;
									return (
										<Link
											key={sub.id}
											to={`/subjects/${sub.id}`}
											onClick={() => setSidebarOpen(false)}
											className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
												isActive
													? "bg-primary/10 text-primary border-l-2 border-primary"
													: "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
											}`}
										>
											<div
												className="w-2.5 h-2.5 rounded-full shrink-0"
												style={{ backgroundColor: sub.color || "#a855f7" }}
											/>
											<span className="truncate flex-1">{sub.name}</span>
											<ChevronRight
												className={`w-4 h-4 opacity-0 transition-opacity ${
													isActive ? "opacity-100" : "group-hover:opacity-60"
												}`}
											/>
										</Link>
									);
								})
							) : (
								<div className="px-3 py-4 text-xs text-muted-foreground flex flex-col items-center gap-2 border border-dashed border-border rounded-lg bg-background/20">
									<FolderOpen className="w-6 h-6 stroke-1" />
									<span>No subjects yet</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sidebar Footer User profile */}
				<div className="p-4 border-t border-border bg-card/40 flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-sm uppercase">
							{user.email?.[0] || "S"}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold truncate text-foreground">
								{user.user_metadata?.full_name || "Student"}
							</p>
							<p className="text-xs text-muted-foreground truncate">
								{user.email}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 pt-2 border-t border-border/60">
						<button
							onClick={() => setIsDark(!isDark)}
							className="flex-1 p-2 flex items-center justify-center hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
							title="Toggle Theme"
						>
							{isDark ? (
								<Sun className="w-4.5 h-4.5" />
							) : (
								<Moon className="w-4.5 h-4.5" />
							)}
						</button>
						<button
							onClick={() => setIsChangePasswordOpen(true)}
							className="flex-1 p-2 flex items-center justify-center hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
							title="Change Password"
						>
							<Settings className="w-4.5 h-4.5" />
						</button>
						<button
							onClick={signOut}
							className="flex-1 p-2 flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
							title="Sign Out"
						>
							<LogOut className="w-4.5 h-4.5" />
						</button>
					</div>
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-w-0 h-screen relative">
				{/* Mobile Header Bar */}
				<header className="h-16 flex items-center justify-between px-4 border-b border-border bg-card/30 backdrop-blur-md md:hidden shrink-0">
					<button
						onClick={() => setSidebarOpen(true)}
						className="p-2 -ml-2 hover:bg-secondary rounded-lg"
					>
						<Menu className="w-6 h-6" />
					</button>
					<span className="font-extrabold text-xl bg-linear-to-r from-primary to-purple-400 bg-clip-text text-transparent">
						MindForge
					</span>
					<div className="w-6"></div> {/* Spacer to center name */}
				</header>

				{/* Scrollable Panel */}
				<main className="flex-1 overflow-y-auto bg-background/95">
					<Outlet />
				</main>
			</div>

			{/* Mobile Sidebar overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<ChangePasswordModal
				isOpen={isChangePasswordOpen}
				onClose={() => setIsChangePasswordOpen(false)}
			/>
		</div>
	);
};
