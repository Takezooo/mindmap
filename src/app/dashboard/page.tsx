"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import {
	ArrowLeft,
	ArrowRight,
	BookOpen,
	ChevronRight,
	Eye,
	EyeOff,
	Folder,
	FolderPlus,
	LayoutDashboard,
	LogOut,
	MoreHorizontal,
	Network,
	Pencil,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

/* =========================================
   TYPES
========================================= */

type FolderRecord = {
	id: string;
	user_id: string;
	parent_id: string | null;
	name: string;
	is_hidden: boolean;
	created_at: string;
	updated_at: string;
};

type MapRecord = {
	id: string;
	user_id: string;
	folder_id: string | null;
	title: string;
	nodes: unknown;
	edges: unknown;
	theme: string;
	is_hidden: boolean;
	created_at: string;
	updated_at: string;
};

type Section = "overview" | "maps" | "subjects" | "hidden";

type ModalType = "folder" | "map" | null;

/* =========================================
   HELPERS
========================================= */

function getErrorMessage(error: unknown) {
	if (typeof error === "object" && error !== null && "message" in error) {
		return String(error.message);
	}

	return "Something went wrong. Please try again.";
}

function formatDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/* =========================================
   MAIN DASHBOARD
========================================= */

export default function DashboardPage() {
	const router = useRouter();

	const [userId, setUserId] = useState<string | null>(null);

	const [userEmail, setUserEmail] = useState("");

	const [folders, setFolders] = useState<FolderRecord[]>([]);

	const [maps, setMaps] = useState<MapRecord[]>([]);

	const [loading, setLoading] = useState(true);

	const [working, setWorking] = useState(false);

	const [section, setSection] = useState<Section>("overview");

	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const [modal, setModal] = useState<ModalType>(null);

	const [folderName, setFolderName] = useState("");

	const [folderParentId, setFolderParentId] = useState("");

	const [mapTitle, setMapTitle] = useState("");

	const [mapFolderId, setMapFolderId] = useState("");

	const [searchTerm, setSearchTerm] = useState("");

	const [errorMessage, setErrorMessage] = useState("");

	const [notice, setNotice] = useState("");

	/* =========================================
     LOAD DATABASE
  ========================================= */

	const loadDashboard = useCallback(async () => {
		setLoading(true);
		setErrorMessage("");

		try {
			const supabase = createClient();

			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError) throw userError;

			if (!user) {
				router.replace("/login");
				return;
			}

			setUserId(user.id);
			setUserEmail(user.email ?? "");

			const [folderResult, mapResult] = await Promise.all([
				supabase
					.from("folders")
					.select("*")
					.eq("user_id", user.id)
					.order("name"),

				supabase
					.from("mind_maps")
					.select("*")
					.eq("user_id", user.id)
					.order("updated_at", {
						ascending: false,
					}),
			]);

			if (folderResult.error) {
				throw folderResult.error;
			}

			if (mapResult.error) {
				throw mapResult.error;
			}

			setFolders((folderResult.data ?? []) as FolderRecord[]);

			setMaps((mapResult.data ?? []) as MapRecord[]);
		} catch (error) {
			console.error(error);

			setErrorMessage(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, [router]);

	useEffect(() => {
		void loadDashboard();
	}, [loadDashboard]);

	/* =========================================
     HIDDEN FOLDER CALCULATION

     A hidden parent also hides its descendants
     from the normal folder navigation.
  ========================================= */

	const hiddenFolderIds = useMemo(() => {
		const hidden = new Set(
			folders.filter((folder) => folder.is_hidden).map((folder) => folder.id),
		);

		let changed = true;

		while (changed) {
			changed = false;

			for (const folder of folders) {
				if (
					folder.parent_id &&
					hidden.has(folder.parent_id) &&
					!hidden.has(folder.id)
				) {
					hidden.add(folder.id);
					changed = true;
				}
			}
		}

		return hidden;
	}, [folders]);

	const activeFolders = folders.filter(
		(folder) => !hiddenFolderIds.has(folder.id),
	);

	const activeMaps = maps.filter(
		(map) =>
			!map.is_hidden && (!map.folder_id || !hiddenFolderIds.has(map.folder_id)),
	);

	const hiddenMaps = maps.filter((map) => map.is_hidden);

	const explicitlyHiddenFolders = folders.filter((folder) => folder.is_hidden);

	const selectedFolder = folders.find(
		(folder) => folder.id === selectedFolderId,
	);

	/* =========================================
     FOLDER HELPERS
  ========================================= */

	function getFolderPath(folderId: string) {
		const path: FolderRecord[] = [];

		let current = folders.find((folder) => folder.id === folderId);

		const visited = new Set<string>();

		while (current && !visited.has(current.id)) {
			visited.add(current.id);
			path.unshift(current);

			current = current.parent_id
				? folders.find((folder) => folder.id === current?.parent_id)
				: undefined;
		}

		return path;
	}

	function getFolderName(folderId: string | null) {
		if (!folderId) return "Uncategorized";

		return (
			getFolderPath(folderId)
				.map((folder) => folder.name)
				.join(" / ") || "Unknown folder"
		);
	}

	function getChildFolders(parentId: string | null) {
		return activeFolders.filter((folder) => folder.parent_id === parentId);
	}

	function getMapsInFolder(folderId: string | null) {
		return activeMaps.filter((map) => map.folder_id === folderId);
	}

	/* =========================================
     NAVIGATION
  ========================================= */

	function navigateTo(nextSection: Section) {
		setSection(nextSection);

		if (nextSection !== "subjects") {
			setSelectedFolderId(null);
		}

		setMobileMenuOpen(false);
		setSearchTerm("");
	}

	function openFolder(folderId: string) {
		setSelectedFolderId(folderId);
		setSection("subjects");
		setMobileMenuOpen(false);
	}

	/* =========================================
     CREATE FOLDER
  ========================================= */

	async function createFolder(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!userId || working) return;

		const name = folderName.trim();

		if (!name) return;

		setWorking(true);
		setErrorMessage("");
		setNotice("");

		try {
			const supabase = createClient();

			const { data, error } = await supabase
				.from("folders")
				.insert({
					user_id: userId,
					name,
					parent_id: folderParentId || null,
					is_hidden: false,
				})
				.select()
				.single();

			if (error) throw error;

			setFolders((current) =>
				[...current, data as FolderRecord].sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			);

			setFolderName("");
			setFolderParentId("");
			setModal(null);

			setNotice(`Subject "${name}" created.`);
		} catch (error) {
			console.error(error);
			setErrorMessage(getErrorMessage(error));
		} finally {
			setWorking(false);
		}
	}

	/* =========================================
     CREATE MAP
  ========================================= */

	async function createMap(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!userId || working) return;

		const title = mapTitle.trim() || "Untitled Mind Map";

		setWorking(true);
		setErrorMessage("");

		try {
			const supabase = createClient();

			const rootNodeId = crypto.randomUUID();

			const starterNodes = [
				{
					id: rootNodeId,
					type: "mindMap",
					position: {
						x: 300,
						y: 250,
					},
					data: {
						title,
						description: "",
						shape: "rounded",
						color: "lavender",
						maxChildren: 3,
						parentId: null,
					},
				},
			];

			const { data, error } = await supabase
				.from("mind_maps")
				.insert({
					user_id: userId,
					folder_id: mapFolderId || null,
					title,
					nodes: starterNodes,
					edges: [],
					viewport: {
						x: 0,
						y: 0,
						zoom: 1,
					},
					theme: "purple",
					is_hidden: false,
				})
				.select()
				.single();

			if (error) throw error;

			const newMap = data as MapRecord;

			setMaps((current) => [newMap, ...current]);

			window.localStorage.setItem(`mindmap-active-map:${userId}`, newMap.id);

			setMapTitle("");
			setMapFolderId("");
			setModal(null);

			router.push("/editor");
		} catch (error) {
			console.error(error);
			setErrorMessage(getErrorMessage(error));
		} finally {
			setWorking(false);
		}
	}

	/* =========================================
     OPEN MAP
  ========================================= */

	function openMap(map: MapRecord) {
		if (!userId) return;

		window.localStorage.setItem(`mindmap-active-map:${userId}`, map.id);

		router.push("/editor");
	}

	/* =========================================
     RENAME MAP
  ========================================= */

	async function renameMap(map: MapRecord) {
		const nextTitle = window
			.prompt("Enter the new map title:", map.title)
			?.trim();

		if (!nextTitle || nextTitle === map.title || !userId) {
			return;
		}

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("mind_maps")
				.update({ title: nextTitle })
				.eq("id", map.id)
				.eq("user_id", userId);

			if (error) throw error;

			setMaps((current) =>
				current.map((item) =>
					item.id === map.id ? { ...item, title: nextTitle } : item,
				),
			);

			setNotice("Mind map renamed.");
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	/* =========================================
     MOVE MAP
  ========================================= */

	async function moveMap(map: MapRecord, folderId: string) {
		if (!userId) return;

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("mind_maps")
				.update({
					folder_id: folderId || null,
				})
				.eq("id", map.id)
				.eq("user_id", userId);

			if (error) throw error;

			setMaps((current) =>
				current.map((item) =>
					item.id === map.id
						? {
								...item,
								folder_id: folderId || null,
							}
						: item,
				),
			);

			setNotice("Mind map moved.");
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	/* =========================================
     HIDE / UNHIDE MAP
  ========================================= */

	async function toggleMapHidden(map: MapRecord) {
		if (!userId) return;

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("mind_maps")
				.update({
					is_hidden: !map.is_hidden,
				})
				.eq("id", map.id)
				.eq("user_id", userId);

			if (error) throw error;

			setMaps((current) =>
				current.map((item) =>
					item.id === map.id
						? {
								...item,
								is_hidden: !map.is_hidden,
							}
						: item,
				),
			);

			setNotice(map.is_hidden ? "Mind map restored." : "Mind map hidden.");
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	/* =========================================
     DELETE MAP
  ========================================= */

	async function deleteMap(map: MapRecord) {
		if (!userId) return;

		const confirmed = window.confirm(
			`Permanently delete "${map.title}"? This cannot be undone.`,
		);

		if (!confirmed) return;

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("mind_maps")
				.delete()
				.eq("id", map.id)
				.eq("user_id", userId);

			if (error) throw error;

			setMaps((current) => current.filter((item) => item.id !== map.id));

			const activeKey = `mindmap-active-map:${userId}`;

			if (localStorage.getItem(activeKey) === map.id) {
				localStorage.removeItem(activeKey);
			}

			setNotice("Mind map deleted.");
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	/* =========================================
     FOLDER ACTIONS
  ========================================= */

	async function renameFolder(folder: FolderRecord) {
		const nextName = window
			.prompt("Enter the new subject name:", folder.name)
			?.trim();

		if (!nextName || nextName === folder.name || !userId) {
			return;
		}

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("folders")
				.update({ name: nextName })
				.eq("id", folder.id)
				.eq("user_id", userId);

			if (error) throw error;

			setFolders((current) =>
				current.map((item) =>
					item.id === folder.id ? { ...item, name: nextName } : item,
				),
			);

			setNotice("Subject renamed.");
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	async function toggleFolderHidden(folder: FolderRecord) {
		if (!userId) return;

		try {
			const supabase = createClient();

			const { error } = await supabase
				.from("folders")
				.update({
					is_hidden: !folder.is_hidden,
				})
				.eq("id", folder.id)
				.eq("user_id", userId);

			if (error) throw error;

			setFolders((current) =>
				current.map((item) =>
					item.id === folder.id
						? {
								...item,
								is_hidden: !folder.is_hidden,
							}
						: item,
				),
			);

			setNotice(folder.is_hidden ? "Subject restored." : "Subject hidden.");
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	/* =========================================
     LOGOUT
  ========================================= */

	async function logout() {
		const supabase = createClient();

		const { error } = await supabase.auth.signOut();

		if (error) {
			setErrorMessage(error.message);
			return;
		}

		router.replace("/login");
		router.refresh();
	}

	/* =========================================
     FILTERED DATA
  ========================================= */

	const recentMaps = activeMaps.slice(0, 4);

	const filteredMaps = activeMaps.filter((map) =>
		map.title.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const folderBreadcrumbs = selectedFolderId
		? getFolderPath(selectedFolderId)
		: [];

	const currentFolders = getChildFolders(selectedFolderId);

	const currentMaps = getMapsInFolder(selectedFolderId);

	/* =========================================
     NAVIGATION ITEM
  ========================================= */

	function navigationItem(
		id: Section,
		label: string,
		Icon: typeof LayoutDashboard,
	) {
		const selected = section === id;

		return (
			<button
				key={id}
				type="button"
				onClick={() => navigateTo(id)}
				className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
					selected
						? "bg-[#F1EAFB] text-[#6F527F]"
						: "text-[#776B83] hover:bg-[#FAF7FF]"
				}`}
			>
				<Icon size={19} />
				<span>{label}</span>
			</button>
		);
	}

	/* =========================================
     MAP CARD
  ========================================= */

	function renderMapCard(map: MapRecord) {
		const isHidden = map.is_hidden;

		return (
			<article
				key={map.id}
				className="rounded-2xl border border-[#E7DDF0] bg-white p-4 transition hover:border-[#CDB9DF] hover:shadow-sm sm:p-5"
			>
				<div className="flex min-w-0 items-start gap-3">
					<div className="rounded-xl bg-[#F1EAFB] p-3 text-[#795F9B]">
						<Network size={21} />
					</div>

					<div className="min-w-0 flex-1">
						<h3 className="break-words font-semibold text-[#493C55]">
							{map.title}
						</h3>

						<p className="mt-1 truncate text-xs text-[#887B91]">
							{getFolderName(map.folder_id)}
						</p>

						<p className="mt-2 text-xs text-[#A299AA]">
							Last updated {formatDate(map.updated_at)}
						</p>

						{isHidden && (
							<span className="mt-2 inline-block rounded-full bg-[#F1EAFB] px-2.5 py-1 text-xs text-[#6F527F]">
								Hidden
							</span>
						)}
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => openMap(map)}
						className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#9B7EBD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6F527F]"
					>
						Open map
						<ArrowRight size={15} />
					</button>

					<details className="group relative">
						<summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-[#E7DDF0] px-3 py-2 text-sm font-medium text-[#6F527F] hover:bg-[#F8F4FC]">
							<MoreHorizontal size={17} />
							More
						</summary>

						<div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-[#E7DDF0] bg-white p-2 shadow-xl">
							<button
								type="button"
								onClick={() => void renameMap(map)}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#493C55] hover:bg-[#F8F4FC]"
							>
								<Pencil size={16} />
								Rename map
							</button>

							<div className="px-3 py-2">
								<label
									htmlFor={`move-${map.id}`}
									className="mb-2 block text-xs font-medium text-[#887B91]"
								>
									Move to subject
								</label>

								<select
									id={`move-${map.id}`}
									value={map.folder_id ?? ""}
									onChange={(event) => void moveMap(map, event.target.value)}
									className="w-full rounded-lg border border-[#E7DDF0] bg-[#FAF7FF] px-2 py-2 text-sm text-[#493C55]"
								>
									<option value="">Uncategorized</option>

									{activeFolders.map((folder) => (
										<option key={folder.id} value={folder.id}>
											{getFolderName(folder.id)}
										</option>
									))}
								</select>
							</div>

							<button
								type="button"
								onClick={() => void toggleMapHidden(map)}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#493C55] hover:bg-[#F8F4FC]"
							>
								{isHidden ? <Eye size={16} /> : <EyeOff size={16} />}

								{isHidden ? "Restore map" : "Hide map"}
							</button>

							<div className="my-1 border-t border-[#E7DDF0]" />

							<button
								type="button"
								onClick={() => void deleteMap(map)}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#A95F7D] hover:bg-[#FCEFF4]"
							>
								<Trash2 size={16} />
								Delete permanently
							</button>
						</div>
					</details>
				</div>
			</article>
		);
	}

	/* =========================================
     FOLDER CARD
  ========================================= */

	function renderFolderCard(folder: FolderRecord) {
		const childCount = getChildFolders(folder.id).length;

		const mapCount = getMapsInFolder(folder.id).length;

		return (
			<article
				key={folder.id}
				className="rounded-2xl border border-[#E7DDF0] bg-white p-4 transition hover:border-[#CDB9DF] hover:shadow-sm"
			>
				<div className="flex items-center gap-3">
					<div className="rounded-xl bg-[#F1EAFB] p-3 text-[#795F9B]">
						<Folder size={23} />
					</div>

					<div className="min-w-0 flex-1">
						<h3 className="break-words font-semibold text-[#493C55]">
							{folder.name}
						</h3>

						<p className="mt-1 text-xs text-[#887B91]">
							{childCount} folders · {mapCount} maps
						</p>
					</div>

					<details className="group relative">
						<summary
							aria-label={`Manage ${folder.name}`}
							className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-[#887B91] hover:bg-[#F1EAFB]"
						>
							<MoreHorizontal size={19} />
						</summary>

						<div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-[#E7DDF0] bg-white p-2 shadow-xl">
							<button
								type="button"
								onClick={() => void renameFolder(folder)}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F8F4FC]"
							>
								<Pencil size={15} />
								Rename
							</button>

							<button
								type="button"
								onClick={() => void toggleFolderHidden(folder)}
								className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F8F4FC]"
							>
								<EyeOff size={15} />
								Hide subject
							</button>
						</div>
					</details>
				</div>

				<button
					type="button"
					onClick={() => openFolder(folder.id)}
					className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#DCCBE8] text-sm font-medium text-[#795F9B] hover:bg-[#F8F4FC]"
				>
					Open subject
					<ChevronRight size={16} />
				</button>
			</article>
		);
	}

	/* =========================================
     CREATE MODAL
  ========================================= */

	function openCreateModal(type: ModalType) {
		setErrorMessage("");
		setModal(type);

		if (type === "folder") {
			setFolderName("");
			setFolderParentId(section === "subjects" ? (selectedFolderId ?? "") : "");
		}

		if (type === "map") {
			setMapTitle("");
			setMapFolderId(section === "subjects" ? (selectedFolderId ?? "") : "");
		}
	}

	function closeModal() {
		if (working) return;

		setModal(null);
		setErrorMessage("");
	}

	/* =========================================
     LOADING
  ========================================= */

	if (loading) {
		return (
			<main className="dashboard-page flex items-center justify-center min-h-[100dvh] bg-[#FAF7FF] text-[#3F3545]">
				<div className="text-center">
					<div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#E7DDF0] border-t-[#9B7EBD]" />

					<p className="mt-4 text-sm text-[#6F527F]">
						Loading your study space...
					</p>
				</div>
			</main>
		);
	}

	/* =========================================
     SECTION CONTENT
  ========================================= */

	function renderPageContent() {
		if (section === "overview") {
			return (
				<>
					{/* Quick Actions */}

					<section className="mb-10">
						<h2 className="mb-4 text-base font-semibold text-[#493C55]">
							What would you like to do?
						</h2>

						<div className="grid gap-3 sm:grid-cols-2">
							<button
								type="button"
								onClick={() => openCreateModal("map")}
								className="flex min-h-28 items-center gap-4 rounded-2xl border border-[#DCCBE8] bg-white p-5 text-left transition hover:border-[#9B7EBD] hover:bg-[#FAF7FF]"
							>
								<div className="rounded-xl bg-[#F1EAFB] p-3 text-[#795F9B]">
									<Network size={24} />
								</div>

								<div>
									<h3 className="font-semibold text-[#493C55]">
										Create a mind map
									</h3>

									<p className="mt-1 text-sm text-[#887B91]">
										Organize your ideas visually.
									</p>
								</div>

								<Plus size={19} className="ml-auto text-[#9B7EBD]" />
							</button>

							<button
								type="button"
								onClick={() => openCreateModal("folder")}
								className="flex min-h-28 items-center gap-4 rounded-2xl border border-[#DCCBE8] bg-white p-5 text-left transition hover:border-[#9B7EBD] hover:bg-[#FAF7FF]"
							>
								<div className="rounded-xl bg-[#F1EAFB] p-3 text-[#795F9B]">
									<FolderPlus size={24} />
								</div>

								<div>
									<h3 className="font-semibold text-[#493C55]">
										Create a subject
									</h3>

									<p className="mt-1 text-sm text-[#887B91]">
										Organize maps into folders.
									</p>
								</div>

								<Plus size={19} className="ml-auto text-[#9B7EBD]" />
							</button>
						</div>
					</section>

					{/* Recent Maps */}

					<section>
						<div className="mb-4 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-bold text-[#6F527F]">
									Recently opened
								</h2>

								<p className="mt-1 text-xs text-[#887B91]">
									Continue where you left off.
								</p>
							</div>

							<button
								type="button"
								onClick={() => navigateTo("maps")}
								className="flex items-center gap-1 text-sm font-medium text-[#795F9B] hover:underline"
							>
								View all
								<ArrowRight size={15} />
							</button>
						</div>

						{recentMaps.length > 0 ? (
							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{recentMaps.map(renderMapCard)}
							</div>
						) : (
							<div className="rounded-2xl border border-dashed border-[#DCCBE8] bg-white/70 px-5 py-10 text-center">
								<BookOpen size={32} className="mx-auto text-[#9B7EBD]" />

								<h3 className="mt-3 font-semibold text-[#6F527F]">
									No mind maps yet
								</h3>

								<p className="mt-1 text-sm text-[#887B91]">
									Create your first map to get started.
								</p>

								<button
									type="button"
									onClick={() => openCreateModal("map")}
									className="mt-5 rounded-xl bg-[#9B7EBD] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6F527F]"
								>
									Create first mind map
								</button>
							</div>
						)}
					</section>

					{/* Subject shortcut */}

					<section className="mt-10">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-bold text-[#6F527F]">My subjects</h2>

							<button
								type="button"
								onClick={() => navigateTo("subjects")}
								className="text-sm font-medium text-[#795F9B] hover:underline"
							>
								Browse subjects
							</button>
						</div>

						{getChildFolders(null).length > 0 ? (
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{getChildFolders(null).slice(0, 3).map(renderFolderCard)}
							</div>
						) : (
							<p className="rounded-xl bg-white p-4 text-sm text-[#887B91]">
								No subjects yet. Create one to organize your maps.
							</p>
						)}
					</section>
				</>
			);
		}

		if (section === "maps") {
			return (
				<>
					<div className="mb-6">
						<h1 className="text-2xl font-bold text-[#6F527F] sm:text-3xl">
							All mind maps
						</h1>

						<p className="mt-2 text-sm text-[#887B91]">
							Browse and manage all your saved mind maps.
						</p>
					</div>

					<div className="relative mb-5 max-w-lg">
						<Search
							size={18}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A299AA]"
						/>

						<input
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							placeholder="Search mind maps..."
							className="w-full rounded-xl border border-[#E7DDF0] bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#9B7EBD]"
						/>
					</div>

					{filteredMaps.length > 0 ? (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{filteredMaps.map(renderMapCard)}
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-[#DCCBE8] bg-white p-8 text-center">
							<Network size={30} className="mx-auto text-[#9B7EBD]" />

							<p className="mt-3 font-semibold text-[#6F527F]">No maps found</p>

							<p className="mt-1 text-sm text-[#887B91]">
								Try another search or create a new map.
							</p>
						</div>
					)}
				</>
			);
		}

		if (section === "subjects") {
			return (
				<>
					{/* Breadcrumbs */}

					<div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
						<button
							type="button"
							onClick={() => setSelectedFolderId(null)}
							className="text-[#795F9B] hover:underline"
						>
							My subjects
						</button>

						{folderBreadcrumbs.map((folder) => (
							<span key={folder.id} className="flex items-center gap-2">
								<ChevronRight size={14} className="text-[#B7A9C4]" />

								<button
									type="button"
									onClick={() => setSelectedFolderId(folder.id)}
									className={`max-w-40 truncate ${
										folder.id === selectedFolderId
											? "font-semibold text-[#493C55]"
											: "text-[#795F9B] hover:underline"
									}`}
								>
									{folder.name}
								</button>
							</span>
						))}
					</div>

					<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
						<div className="min-w-0">
							<h1 className="break-words text-2xl font-bold text-[#6F527F] sm:text-3xl">
								{selectedFolder?.name ?? "My subjects"}
							</h1>

							<p className="mt-2 text-sm text-[#887B91]">
								{selectedFolder
									? "Manage the folders and mind maps in this subject."
									: "Choose a subject to view its study materials."}
							</p>
						</div>

						{selectedFolderId && (
							<button
								type="button"
								onClick={() => setSelectedFolderId(null)}
								className="flex items-center gap-2 rounded-lg border border-[#E7DDF0] bg-white px-3 py-2 text-sm text-[#795F9B] hover:bg-[#F8F4FC]"
							>
								<ArrowLeft size={15} />
								All subjects
							</button>
						)}
					</div>

					{/* Subfolders */}

					{currentFolders.length > 0 && (
						<section className="mb-8">
							<h2 className="mb-4 text-sm font-semibold text-[#493C55]">
								Folders
							</h2>

							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{currentFolders.map(renderFolderCard)}
							</div>
						</section>
					)}

					{/* Maps in current folder */}

					<section>
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-[#493C55]">
								Mind maps
							</h2>

							<span className="text-xs text-[#887B91]">
								{currentMaps.length} maps
							</span>
						</div>

						{currentMaps.length > 0 ? (
							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{currentMaps.map(renderMapCard)}
							</div>
						) : (
							<div className="rounded-2xl border border-dashed border-[#DCCBE8] bg-white p-8 text-center">
								<BookOpen size={30} className="mx-auto text-[#9B7EBD]" />

								<h3 className="mt-3 font-semibold text-[#6F527F]">
									No mind maps in this folder
								</h3>

								<p className="mt-1 text-sm text-[#887B91]">
									Create a mind map and assign it to this subject.
								</p>

								<button
									type="button"
									onClick={() => openCreateModal("map")}
									className="mt-5 rounded-xl bg-[#9B7EBD] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6F527F]"
								>
									Create mind map
								</button>
							</div>
						)}
					</section>

					{/* Root-level uncategorized maps */}

					{!selectedFolderId && getMapsInFolder(null).length > 0 && (
						<section className="mt-8">
							<h2 className="mb-4 text-sm font-semibold text-[#493C55]">
								Uncategorized maps
							</h2>

							<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{getMapsInFolder(null).map(renderMapCard)}
							</div>
						</section>
					)}

					{currentFolders.length === 0 &&
						currentMaps.length === 0 &&
						!(!selectedFolderId && getMapsInFolder(null).length > 0) && (
							<p className="mt-4 text-sm text-[#887B91]">
								There is nothing here yet.
							</p>
						)}
				</>
			);
		}

		/* Hidden items */

		return (
			<>
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-[#6F527F] sm:text-3xl">
						Hidden items
					</h1>

					<p className="mt-2 text-sm text-[#887B91]">
						Hidden items are kept safely in your database. Restore them whenever
						you need them.
					</p>
				</div>

				{/* Hidden folders */}

				<section className="mb-8">
					<h2 className="mb-4 text-sm font-semibold text-[#493C55]">
						Hidden subjects
					</h2>

					{explicitlyHiddenFolders.length > 0 ? (
						<div className="space-y-3">
							{explicitlyHiddenFolders.map((folder) => (
								<article
									key={folder.id}
									className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7DDF0] bg-white p-4"
								>
									<div className="flex min-w-0 items-center gap-3">
										<div className="rounded-lg bg-[#F1EAFB] p-2 text-[#795F9B]">
											<Folder size={20} />
										</div>

										<div className="min-w-0">
											<p className="break-words font-medium text-[#493C55]">
												{folder.name}
											</p>

											<p className="text-xs text-[#887B91]">
												{getFolderName(folder.parent_id)}
											</p>
										</div>
									</div>

									<button
										type="button"
										onClick={() => void toggleFolderHidden(folder)}
										className="rounded-lg border border-[#DCCBE8] px-3 py-2 text-sm font-medium text-[#795F9B] hover:bg-[#F1EAFB]"
									>
										Restore subject
									</button>
								</article>
							))}
						</div>
					) : (
						<p className="rounded-xl bg-white p-4 text-sm text-[#887B91]">
							No hidden subjects.
						</p>
					)}
				</section>

				{/* Hidden maps */}

				<section>
					<h2 className="mb-4 text-sm font-semibold text-[#493C55]">
						Hidden mind maps
					</h2>

					{hiddenMaps.length > 0 ? (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{hiddenMaps.map(renderMapCard)}
						</div>
					) : (
						<p className="rounded-xl bg-white p-4 text-sm text-[#887B91]">
							No hidden mind maps.
						</p>
					)}
				</section>
			</>
		);
	}

	/* =========================================
     NAVIGATION
  ========================================= */

	function renderNavigation() {
		return (
			<div className="flex h-full flex-col">
				<div className="border-b border-[#E7DDF0] px-5 py-5">
					<h2 className="text-xl font-bold text-[#6F527F]">Riri's MindMap</h2>

					<p className="mt-1 text-xs text-[#887B91]">
						Your personal study space
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-3">
					<p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-[#A299AA]">
						Workspace
					</p>

					<div className="space-y-1">
						{navigationItem("overview", "Overview", LayoutDashboard)}

						{navigationItem("maps", "All mind maps", Network)}

						{navigationItem("subjects", "My subjects", Folder)}

						{navigationItem("hidden", "Hidden items", EyeOff)}
					</div>

					<div className="mb-3 mt-8 flex items-center justify-between px-3">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-[#A299AA]">
							Subjects
						</p>

						<button
							type="button"
							onClick={() => openCreateModal("folder")}
							title="Create subject"
							aria-label="Create subject"
							className="rounded-md p-1 text-[#795F9B] hover:bg-[#F1EAFB]"
						>
							<Plus size={17} />
						</button>
					</div>

					<div className="space-y-1">
						{getChildFolders(null)
							.slice(0, 8)
							.map((folder) => (
								<button
									key={folder.id}
									type="button"
									onClick={() => openFolder(folder.id)}
									className={`flex w-full items-center gap-3 truncate rounded-lg px-3 py-2.5 text-left text-sm ${
										selectedFolderId === folder.id
											? "bg-[#F1EAFB] text-[#6F527F]"
											: "text-[#776B83] hover:bg-[#FAF7FF]"
									}`}
								>
									<Folder size={17} />
									<span className="truncate">{folder.name}</span>
								</button>
							))}

						{getChildFolders(null).length === 0 && (
							<p className="px-3 py-2 text-xs text-[#A299AA]">
								No subjects yet.
							</p>
						)}

						{getChildFolders(null).length > 8 && (
							<button
								type="button"
								onClick={() => navigateTo("subjects")}
								className="px-3 py-2 text-xs font-medium text-[#795F9B] hover:underline"
							>
								View all subjects
							</button>
						)}
					</div>
				</div>

				<div className="border-t border-[#E7DDF0] p-4">
					{userEmail && (
						<p className="mb-3 truncate text-xs text-[#887B91]">{userEmail}</p>
					)}

					<button
						type="button"
						onClick={() => void logout()}
						className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#887B91] hover:bg-[#F8F4FC]"
					>
						<LogOut size={17} />
						Log out
					</button>
				</div>
			</div>
		);
	}

	/* =========================================
     PAGE TITLE
  ========================================= */

	const pageTitle: Record<Section, string> = {
		overview: "Overview",
		maps: "All mind maps",
		subjects: selectedFolder?.name ?? "My subjects",
		hidden: "Hidden items",
	};

	/* =========================================
     MAIN RENDER
  ========================================= */

	return (
		<main className="dashboard-page min-h-[100dvh] bg-[#FAF7FF] text-[#3F3545]">
			{" "}
			<div className="flex min-h-[100dvh]">
				{/* DESKTOP SIDEBAR */}

				<aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 border-r border-[#E7DDF0] bg-white lg:block">
					{renderNavigation()}
				</aside>

				{/* MAIN CONTENT */}

				<div className="min-w-0 flex-1">
					{/* MOBILE / TABLET HEADER */}

					<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E7DDF0] bg-white px-4 lg:hidden">
						<button
							type="button"
							onClick={() => setMobileMenuOpen(true)}
							className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6F527F] hover:bg-[#F1EAFB]"
							aria-label="Open navigation"
						>
							<span className="text-xl">☰</span>
						</button>

						<div className="text-center">
							<h1 className="font-semibold text-[#6F527F]">MindMap</h1>

							<p className="text-[11px] text-[#887B91]">{pageTitle[section]}</p>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => openCreateModal("map")}
								className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9B7EBD] text-white hover:bg-[#6F527F]"
								aria-label="Create a mind map"
							>
								<Plus size={20} />
							</button>
							<ThemeToggle />
						</div>
					</header>

					<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
						{/* PAGE ACTIONS */}

						<div className="mb-6 hidden justify-end items-center gap-2 lg:flex">
							<button
								type="button"
								onClick={() => openCreateModal("folder")}
								className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DCCBE8] bg-white px-4 py-2 text-sm font-medium text-[#795F9B] hover:bg-[#F8F4FC]"
							>
								<FolderPlus size={17} />
								New subject
							</button>

							<button
								type="button"
								onClick={() => openCreateModal("map")}
								className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#9B7EBD] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6F527F]"
							>
								<Plus size={17} />
								New mind map
							</button>
							<ThemeToggle />
						</div>

						{/* FEEDBACK */}

						{errorMessage && (
							<div
								role="alert"
								className="mb-5 rounded-xl border border-[#E8C5D5] bg-[#FCEFF4] p-4 text-sm text-[#A95F7D]"
							>
								{errorMessage}

								<button
									type="button"
									onClick={() => setErrorMessage("")}
									className="ml-3 font-semibold underline"
								>
									Dismiss
								</button>
							</div>
						)}

						{notice && (
							<div
								role="status"
								className="mb-5 flex items-center justify-between rounded-xl border border-[#DCCBE8] bg-[#F1EAFB] p-4 text-sm text-[#6F527F]"
							>
								{notice}

								<button
									type="button"
									onClick={() => setNotice("")}
									aria-label="Dismiss notification"
								>
									<X size={17} />
								</button>
							</div>
						)}

						{/* CONTENT */}

						{renderPageContent()}
					</div>
				</div>
			</div>
			{/* MOBILE NAVIGATION DRAWER */}
			{mobileMenuOpen && (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						type="button"
						aria-label="Close navigation"
						onClick={() => setMobileMenuOpen(false)}
						className="absolute inset-0 bg-[#3F3545]/30"
					/>

					<aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-[#E7DDF0] px-5 py-4">
							<span className="font-semibold text-[#6F527F]">Navigation</span>

							<button
								type="button"
								onClick={() => setMobileMenuOpen(false)}
								className="rounded-lg p-2 text-[#887B91] hover:bg-[#F1EAFB]"
								aria-label="Close navigation"
							>
								<X size={20} />
							</button>
						</div>

						{renderNavigation()}
					</aside>
				</div>
			)}
			{/* CREATE MODAL */}
			{modal && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#3F3545]/30 p-4">
					<button
						type="button"
						className="absolute inset-0 cursor-default"
						aria-label="Close dialog"
						onClick={closeModal}
					/>

					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby="create-dialog-title"
						className="relative z-10 w-full max-w-md rounded-2xl border border-[#E7DDF0] bg-white p-6 shadow-2xl sm:p-7"
					>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<div className="mb-3 inline-flex rounded-xl bg-[#F1EAFB] p-3 text-[#795F9B]">
									{modal === "folder" ? (
										<FolderPlus size={23} />
									) : (
										<Network size={23} />
									)}
								</div>

								<h2
									id="create-dialog-title"
									className="text-xl font-bold text-[#6F527F]"
								>
									{modal === "folder"
										? "Create a subject"
										: "Create a mind map"}
								</h2>

								<p className="mt-1 text-sm text-[#887B91]">
									{modal === "folder"
										? "Give your study materials a place to belong."
										: "Start with a name. You can add your nodes in the editor."}
								</p>
							</div>

							<button
								type="button"
								onClick={closeModal}
								disabled={working}
								className="rounded-lg p-2 text-[#887B91] hover:bg-[#F1EAFB]"
								aria-label="Close dialog"
							>
								<X size={19} />
							</button>
						</div>

						{modal === "folder" ? (
							<form
								onSubmit={(event) => void createFolder(event)}
								className="space-y-4"
							>
								<div>
									<label
										htmlFor="new-folder-name"
										className="mb-2 block text-sm font-medium text-[#493C55]"
									>
										Subject name
									</label>

									<input
										id="new-folder-name"
										value={folderName}
										onChange={(event) => setFolderName(event.target.value)}
										required
										maxLength={100}
										autoFocus
										placeholder="e.g. Biology"
										className="w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-4 py-3 text-sm outline-none focus:border-[#9B7EBD] focus:ring-2 focus:ring-[#F1EAFB]"
									/>
								</div>

								<div>
									<label
										htmlFor="folder-parent"
										className="mb-2 block text-sm font-medium text-[#493C55]"
									>
										Inside another subject (optional)
									</label>

									<select
										id="folder-parent"
										value={folderParentId}
										onChange={(event) => setFolderParentId(event.target.value)}
										className="w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-4 py-3 text-sm outline-none focus:border-[#9B7EBD]"
									>
										<option value="">No parent subject</option>

										{activeFolders.map((folder) => (
											<option key={folder.id} value={folder.id}>
												{getFolderName(folder.id)}
											</option>
										))}
									</select>
								</div>

								<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
									<button
										type="button"
										onClick={closeModal}
										disabled={working}
										className="rounded-xl border border-[#E7DDF0] px-5 py-3 text-sm font-medium text-[#887B91] hover:bg-[#FAF7FF]"
									>
										Cancel
									</button>

									<button
										type="submit"
										disabled={working || !folderName.trim()}
										className="rounded-xl bg-[#9B7EBD] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6F527F] disabled:opacity-50"
									>
										{working ? "Creating..." : "Create subject"}
									</button>
								</div>
							</form>
						) : (
							<form
								onSubmit={(event) => void createMap(event)}
								className="space-y-4"
							>
								<div>
									<label
										htmlFor="new-map-title"
										className="mb-2 block text-sm font-medium text-[#493C55]"
									>
										Mind map name
									</label>

									<input
										id="new-map-title"
										value={mapTitle}
										onChange={(event) => setMapTitle(event.target.value)}
										maxLength={150}
										autoFocus
										placeholder="e.g. Cell Structure"
										className="w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-4 py-3 text-sm outline-none focus:border-[#9B7EBD] focus:ring-2 focus:ring-[#F1EAFB]"
									/>
								</div>

								<div>
									<label
										htmlFor="new-map-folder"
										className="mb-2 block text-sm font-medium text-[#493C55]"
									>
										Save inside
									</label>

									<select
										id="new-map-folder"
										value={mapFolderId}
										onChange={(event) => setMapFolderId(event.target.value)}
										className="w-full rounded-xl border border-[#E7DDF0] bg-[#FAF7FF] px-4 py-3 text-sm outline-none focus:border-[#9B7EBD]"
									>
										<option value="">Uncategorized</option>

										{activeFolders.map((folder) => (
											<option key={folder.id} value={folder.id}>
												{getFolderName(folder.id)}
											</option>
										))}
									</select>
								</div>

								<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
									<button
										type="button"
										onClick={closeModal}
										disabled={working}
										className="rounded-xl border border-[#E7DDF0] px-5 py-3 text-sm font-medium text-[#887B91] hover:bg-[#FAF7FF]"
									>
										Cancel
									</button>

									<button
										type="submit"
										disabled={working}
										className="rounded-xl bg-[#9B7EBD] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6F527F] disabled:opacity-50"
									>
										{working ? "Creating..." : "Create mind map"}
									</button>
								</div>
							</form>
						)}
					</section>
				</div>
			)}
		</main>
	);
}
