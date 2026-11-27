"use client";

import { useEffect, useRef, useState } from "react";
import {
	Bold,
	Italic,
	List,
	StickyNote,
	Trash2,
	Underline,
} from "lucide-react";
import {
	NodeResizer,
	useReactFlow,
	type Node,
	type NodeProps,
} from "@xyflow/react";
import type { MindMapNodeData, NoteColor } from "@/types/mindmap";
import { useMindMapStore } from "@/stores/mindmap-store";

const noteColors: {
	value: NoteColor;
	label: string;
	light: string;
	dark: string;
	border: string;
}[] = [
	{
		value: "yellow",
		label: "Yellow",
		light: "bg-[#fff4bd]",
		dark: "dark:bg-[#403448]",
		border: "border-[#e8d58c] dark:border-[#765b79]",
	},
	{
		value: "blue",
		label: "Blue",
		light: "bg-[#e2f0ff]",
		dark: "dark:bg-[#30334d]",
		border: "border-[#b9d5f1] dark:border-[#65658d]",
	},
	{
		value: "pink",
		label: "Pink",
		light: "bg-[#ffe5ed]",
		dark: "dark:bg-[#49313f]",
		border: "border-[#edc2d0] dark:border-[#80536c]",
	},
	{
		value: "green",
		label: "Green",
		light: "bg-[#e3f4e7]",
		dark: "dark:bg-[#30413e]",
		border: "border-[#bfdfc6] dark:border-[#58766d]",
	},
];

type NoteFormat = "bold" | "italic" | "underline" | "bullet";
type ActiveFormats = Record<NoteFormat, boolean>;

const emptyFormats: ActiveFormats = {
	bold: false,
	italic: false,
	underline: false,
	bullet: false,
};

function toEditorHtml(value: string) {
	// Preserve contentEditable HTML and already-encoded entities.
	// Escaping these again causes visible strings such as "&amp;nbsp;".
	if (
		/<(p|div|br|ul|ol|li|strong|b|em|i|u)(\s|>|\/)/i.test(value) ||
		/&(?:nbsp|amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/i.test(value)
	) {
		return value;
	}

	// Escape only plain text that has not already been HTML-serialized.
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\n/g, "<br>");
}
function getActiveFormats(): ActiveFormats {
	return {
		bold: document.queryCommandState("bold"),
		italic: document.queryCommandState("italic"),
		underline: document.queryCommandState("underline"),
		bullet: document.queryCommandState("insertUnorderedList"),
	};
}

export default function NoteNode({
	id,
	data,
	selected,
}: NodeProps<Node<MindMapNodeData>>) {
	const { updateNodeData } = useReactFlow();
	const editorRef = useRef<HTMLDivElement>(null);
	const [activeFormats, setActiveFormats] =
		useState<ActiveFormats>(emptyFormats);

	const storedContent = data.noteContent ?? "";
	// Remove the legacy auto-inserted bullet from notes created by the earlier version.
	const content = storedContent === "• " ? "" : storedContent;

	const color =
		noteColors.find((item) => item.value === data.noteColor) ?? noteColors[0];

	useEffect(() => {
		if (storedContent !== content) {
			updateNodeData(id, { noteContent: content });
		}
	}, [content, id, storedContent, updateNodeData]);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;

		const nextHtml = toEditorHtml(content);
		if (editor.innerHTML !== nextHtml) {
			editor.innerHTML = nextHtml;
		}
	}, [content]);

	useEffect(() => {
		function syncActiveFormat() {
			const editor = editorRef.current;
			const selection = window.getSelection();
			if (
				!editor ||
				!selection?.anchorNode ||
				!editor.contains(selection.anchorNode)
			) {
				return;
			}
			setActiveFormats(getActiveFormats());
		}

		document.addEventListener("selectionchange", syncActiveFormat);
		return () =>
			document.removeEventListener("selectionchange", syncActiveFormat);
	}, []);

	function saveEditorContent() {
		const editor = editorRef.current;
		if (!editor) return;
		updateNodeData(id, { noteContent: editor.innerHTML });
		setActiveFormats(getActiveFormats());
	}

	function toggleFormat(format: NoteFormat) {
		const editor = editorRef.current;
		if (!editor) return;

		// Keep the current text selection in the editor when a toolbar button is clicked.
		editor.focus();
		const command = format === "bullet" ? "insertUnorderedList" : format;
		document.execCommand(command);
		setActiveFormats(getActiveFormats());
		saveEditorContent();
	}

	function deleteNote() {
		const state = useMindMapStore.getState();
		state.setNodes(state.nodes.filter((node) => node.id !== id));
	}

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={220}
				minHeight={150}
				lineClassName="!border-fuchsia-400 dark:!border-fuchsia-300"
				handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-fuchsia-500 !bg-white dark:!border-fuchsia-300 dark:!bg-[#49364d]"
			/>

			<div
				className={`flex h-full w-full flex-col overflow-hidden rounded-xl border shadow-md transition-shadow ${color.light} ${color.dark} ${color.border} ${
					selected
						? "ring-2 ring-[#c078a0] ring-offset-2 dark:ring-[#d99bc0] dark:ring-offset-[#17121b]"
						: "hover:shadow-lg"
				}`}
			>
				<div
					className={`note-drag-handle flex min-h-10 shrink-0 cursor-grab items-center justify-between gap-2 border-b px-3 active:cursor-grabbing ${color.border} dark:bg-black/10`}
				>
					<div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-stone-700 dark:text-[#f3ddec]">
						<StickyNote size={14} />
						NOTE
					</div>

					<div className="flex min-w-0 items-center gap-1">
						<div className="flex shrink-0 items-center gap-1">
							{noteColors.map((item) => (
								<button
									key={item.value}
									type="button"
									title={`${item.label} note`}
									aria-label={`Change note color to ${item.label}`}
									aria-pressed={data.noteColor === item.value}
									className={`nodrag nopan h-3.5 w-3.5 rounded-full border ${item.value === "yellow" ? "bg-[#fff4bd] dark:bg-[#403448]" : ""} ${item.value === "blue" ? "bg-[#e2f0ff] dark:bg-[#30334d]" : ""} ${item.value === "pink" ? "bg-[#ffe5ed] dark:bg-[#49313f]" : ""} ${item.value === "green" ? "bg-[#e3f4e7] dark:bg-[#30413e]" : ""} ${item.border} ${data.noteColor === item.value ? "ring-2 ring-fuchsia-500 ring-offset-1 dark:ring-fuchsia-300 dark:ring-offset-[#302337]" : ""}`}
									onPointerDown={(event) => event.stopPropagation()}
									onClick={(event) => {
										event.stopPropagation();
										updateNodeData(id, { noteColor: item.value });
									}}
								/>
							))}
						</div>

						<div className="flex shrink-0 items-center gap-0.5 border-r border-stone-400/30 pr-1.5 dark:border-[#b88da9]/30">
							{(
								[
									{ format: "bold", label: "Bold", Icon: Bold },
									{ format: "italic", label: "Italic", Icon: Italic },
									{ format: "underline", label: "Underline", Icon: Underline },
									{ format: "bullet", label: "Bullet list", Icon: List },
								] as const
							).map(({ format, label, Icon }) => (
								<button
									key={format}
									type="button"
									title={label}
									aria-label={label}
									aria-pressed={activeFormats[format]}
									className={`nodrag nopan rounded-md p-1.5 transition ${activeFormats[format] ? "bg-[#c078a0]/25 text-[#914d73] ring-1 ring-inset ring-[#c078a0]/50 dark:bg-[#d99bc0]/20 dark:text-[#ffd9ed] dark:ring-[#d99bc0]/50" : "text-stone-600 hover:bg-black/5 dark:text-[#e8c6dc] dark:hover:bg-white/10"}`}
									onPointerDown={(event) => {
										event.preventDefault();
										event.stopPropagation();
									}}
									onClick={(event) => {
										event.stopPropagation();
										toggleFormat(format);
									}}
								>
									<Icon size={13} strokeWidth={2.2} />
								</button>
							))}
						</div>

						<button
							type="button"
							className="nodrag nopan ml-1 rounded p-1 text-stone-600 transition hover:bg-black/5 hover:text-red-600 dark:text-[#e8c6dc] dark:hover:bg-white/10 dark:hover:text-rose-300"
							title="Delete note"
							aria-label="Delete note"
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => {
								event.stopPropagation();
								deleteNote();
							}}
						>
							<Trash2 size={14} />
						</button>
					</div>
				</div>

				<div
					ref={editorRef}
					className="nodrag nopan note-editor min-h-0 flex-1 overflow-y-auto whitespace-normal break-words px-4 py-3 text-sm leading-6 text-stone-800 outline-none dark:text-[#fff0f8] [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:pl-0 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline"
					contentEditable
					suppressContentEditableWarning
					onInput={saveEditorContent}
					onKeyDown={(event) => event.stopPropagation()}
					onPointerDown={(event) => event.stopPropagation()}
					onKeyUp={() => {
						const editor = editorRef.current;
						if (editor) setActiveFormats(getActiveFormats());
					}}
					onMouseUp={() => {
						const editor = editorRef.current;
						if (editor) setActiveFormats(getActiveFormats());
					}}
					onFocus={() => {
						const editor = editorRef.current;
						if (editor) setActiveFormats(getActiveFormats());
					}}
					data-placeholder="Write a note..."
					role="textbox"
					aria-label="Canvas note content"
					aria-multiline="true"
					spellCheck
				/>
			</div>

			<style jsx>{`
				.note-editor:empty::before {
					content: attr(data-placeholder);
					color: #9b8d7b;
					pointer-events: none;
				}
				:global(.dark) .note-editor:empty::before {
					color: #c2a9bd;
				}
				.note-editor {
					scrollbar-width: thin;
					scrollbar-color: rgba(160, 111, 145, 0.55) transparent;
				}
				:global(.dark) .note-editor {
					scrollbar-color: rgba(205, 157, 190, 0.55) transparent;
				}
				.note-editor::-webkit-scrollbar {
					width: 5px;
				}
				.note-editor::-webkit-scrollbar-track {
					background: transparent;
				}
				.note-editor::-webkit-scrollbar-thumb {
					background: rgba(160, 111, 145, 0.45);
					border-radius: 999px;
				}
				:global(.dark) .note-editor::-webkit-scrollbar-thumb {
					background: rgba(205, 157, 190, 0.48);
				}
			`}</style>
		</>
	);
}
