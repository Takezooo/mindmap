"use client";

import { useStore } from "zustand";
import { Undo2, Redo2 } from "lucide-react";
import { useMindMapStore } from "@/stores/mindmap-store";

export default function UndoRedoControls() {
  const temporalStore = useMindMapStore.temporal;

  const canUndo = useStore(
    temporalStore,
    (state) => state.pastStates.length > 0,
  );

  const canRedo = useStore(
    temporalStore,
    (state) => state.futureStates.length > 0,
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => temporalStore.getState().undo()}
        disabled={!canUndo}
        title="Undo (Ctrl+Z / Cmd+Z)"
        aria-label="Undo"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7DDF0] bg-white text-[#6F527F] transition hover:bg-[#F1EAFB] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Undo2 size={17} />
      </button>

      <button
        type="button"
        onClick={() => temporalStore.getState().redo()}
        disabled={!canRedo}
        title="Redo (Ctrl+Y / Cmd+Y)"
        aria-label="Redo"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7DDF0] bg-white text-[#6F527F] transition hover:bg-[#F1EAFB] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Redo2 size={17} />
      </button>
    </div>
  );
}
