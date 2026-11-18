
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
  type Node,
} from "@xyflow/react";

import type { MindMapNodeData } from "@/types/mindmap";

function getShapeClass(shape: MindMapNodeData["shape"]) {
  switch (shape) {
    case "circle":
      return "min-h-32 min-w-32 rounded-full flex items-center justify-center";

    case "diamond":
      return "min-h-32 min-w-32 rounded-sm rotate-45 flex items-center justify-center";

    case "pill":
      return "rounded-full";

    case "rounded":
      return "rounded-xl";

    case "rectangle":
    default:
      return "rounded-lg";
  }
}

function getColorClass(color: MindMapNodeData["color"]) {
  switch (color) {
    case "rose":
      return "bg-[#fde8f0] border-[#e8b4c7]";

    case "lavender":
      return "bg-[#eee9f7] border-[#c9bce0]";

    case "peach":
      return "bg-[#fff0e6] border-[#edc6ad]";

    case "mint":
      return "bg-[#e8f5ef] border-[#b9dccb]";

    case "blue":
      return "bg-[#eaf2fb] border-[#bdd2e8]";

    case "cream":
      return "bg-[#fff8df] border-[#ead9a5]";

    default:
      return "bg-white border-[#eadde4]";
  }
}

export default function MindMapNode({
  id,
  data,
  selected,
}: NodeProps<Node<MindMapNodeData>>) {
  const { updateNodeData } = useReactFlow();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(data.title ?? "");
  const [draftDescription, setDraftDescription] = useState(
    data.description ?? "",
  );

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const cancelBlurRef = useRef(false);

  const shapeClass = getShapeClass(data.shape);
  const colorClass = getColorClass(data.color);

  const isDiamond = data.shape === "diamond";
  const descriptionVisible = data.descriptionVisible ?? false;

  useEffect(() => {
    setDraftTitle(data.title ?? "");
  }, [data.title]);

  useEffect(() => {
    setDraftDescription(data.description ?? "");
  }, [data.description]);

  // Automatically resize the title textarea to fit its content.
  useLayoutEffect(() => {
    const textarea = titleRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftTitle, isEditingTitle]);

  // Automatically resize the description textarea to fit its content.
  useLayoutEffect(() => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draftDescription, descriptionVisible]);

  useEffect(() => {
    if (isEditingTitle) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [isEditingTitle]);

  function saveTitle() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(data.title ?? "");
      setIsEditingTitle(false);
      return;
    }

    if (nextTitle !== data.title) {
      updateNodeData(id, {
        title: nextTitle,
      });
    }

    setIsEditingTitle(false);
  }

  function cancelTitleEditing() {
    cancelBlurRef.current = true;

    setDraftTitle(data.title ?? "");
    setIsEditingTitle(false);

    titleRef.current?.blur();
  }

  function handleTitleBlur() {
    if (cancelBlurRef.current) {
      cancelBlurRef.current = false;
      return;
    }

    saveTitle();
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();

    // Shift + Enter inserts a new line.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveTitle();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelTitleEditing();
    }
  }

  function toggleDescription() {
    updateNodeData(id, {
      descriptionVisible: !descriptionVisible,
    });
  }

  function handleDescriptionChange(value: string) {
    setDraftDescription(value);

    // Update immediately so local persistence captures the latest description.
    updateNodeData(id, {
      description: value,
    });
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#c77d9b]"
      />

      <div
        data-node-color={data.color}
        className={`mindmap-node-card box-border w-fit min-w-[140px] max-w-[280px] border px-5 py-3 shadow-sm transition ${shapeClass} ${colorClass} ${
          selected
            ? "is-selected border-2 border-[#a85f7d] shadow-lg scale-[1.02]"
            : ""
        }`}
      >
        <div
          className={`${
            isDiamond ? "-rotate-45 " : ""
          }w-full min-w-0 text-center font-medium`}
        >
          {isEditingTitle ? (
            <textarea
              ref={titleRef}
              rows={1}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="Node title"
              className="nodrag nopan mindmap-node-title block w-full min-w-0 resize-none overflow-hidden bg-transparent text-center font-medium leading-snug text-[#4b3d46] outline-none"
              aria-label="Edit node title"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="nodrag nopan mindmap-node-title block w-full min-w-0 cursor-text whitespace-pre-wrap break-words bg-transparent text-center font-medium leading-snug text-[#4b3d46] outline-none"
              aria-label="Click to edit node title"
              title="Click to edit"
            >
              {data.title || "Untitled node"}
            </button>
          )}

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              toggleDescription();
            }}
            className="nodrag nopan mindmap-node-toggle mt-2 rounded-md px-2 py-1 text-[10px] font-medium text-[#795F9B] transition hover:bg-black/5"
          >
            {descriptionVisible ? "Hide description" : "+ Add description"}
          </button>

          {descriptionVisible && (
            <textarea
              ref={descriptionRef}
              value={draftDescription}
              onChange={(event) =>
                handleDescriptionChange(event.target.value)
              }
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="Write your notes here..."
              rows={3}
              className="nodrag nopan mindmap-node-description mt-2 block min-h-16 w-full min-w-0 resize-none overflow-hidden rounded-md border border-black/10 bg-white/50 px-2 py-1.5 text-left text-xs leading-relaxed text-[#4b3d46] outline-none focus:border-[#9B7EBD]"
              aria-label="Node description"
            />
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#c77d9b]"
      />
    </div>
  );
}
