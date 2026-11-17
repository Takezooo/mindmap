
"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useMindMapStore } from "@/stores/mindmap-store";

type StoreState = ReturnType<typeof useMindMapStore.getState>;

type MindMapNodes = StoreState["nodes"];
type MindMapEdges = StoreState["edges"];

type MindMapRow = {
  id: string;
  title: string;
  nodes: unknown;
  edges: unknown;
};

type SyncStatus = "loading" | "saving" | "saved" | "error";

type LocalDraft = {
  version: 1;
  mapId: string;
  revision: number;
  syncedRevision: number;
  nodes: MindMapNodes;
  edges: MindMapEdges;
};

const SELECT_COLUMNS = "id,title,nodes,edges";

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }

  return "An unexpected error occurred.";
}

function getLocalDraftKey(userId: string, mapId: string) {
  return `mindmap-local-draft:${userId}:${mapId}`;
}

function readLocalDraft(key: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalDraft>;

    if (
      parsed.version !== 1 ||
      typeof parsed.mapId !== "string" ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.edges)
    ) {
      return null;
    }

    const revision = Number.isFinite(parsed.revision)
      ? Math.max(0, Number(parsed.revision))
      : 0;

    const syncedRevision = Number.isFinite(parsed.syncedRevision)
      ? Math.max(0, Number(parsed.syncedRevision))
      : 0;

    return {
      version: 1,
      mapId: parsed.mapId,
      revision,
      syncedRevision: Math.min(revision, syncedRevision),
      nodes: parsed.nodes as MindMapNodes,
      edges: parsed.edges as MindMapEdges,
    };
  } catch (error) {
    console.error("Could not read local mind map draft:", error);
    return null;
  }
}

function writeLocalDraft(key: string, draft: LocalDraft) {
  window.localStorage.setItem(key, JSON.stringify(draft));
}

export default function MindMapDatabaseSync() {
  const nodes = useMindMapStore((state) => state.nodes);
  const edges = useMindMapStore((state) => state.edges);

  const setNodes = useMindMapStore((state) => state.setNodes);
  const setEdges = useMindMapStore((state) => state.setEdges);

  const [mapId, setMapId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Holds the latest local version, including changes that
  // have not yet reached Supabase.
  const localDraftRef = useRef<LocalDraft | null>(null);

  // Serialize cloud saves so older requests cannot overwrite newer ones.
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);

  /*
   * INITIAL LOAD
   *
   * 1. Identify the authenticated user.
   * 2. Find their active database map.
   * 3. Read the map-specific local draft.
   * 4. Restore unsynchronized local changes when available.
   * 5. Otherwise load the latest cloud version.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setStatus("loading");

        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("No authenticated user was found.");
        }

        const storageKey = `mindmap-active-map:${user.id}`;

        // Existing Zustand localStorage persistence.
        const localState = useMindMapStore.getState();

        const localNodes = localState.nodes;
        const localEdges = localState.edges;

        // Reuse the active map ID when possible.
        let candidateId = window.localStorage.getItem(storageKey);

        if (!candidateId) {
          candidateId = crypto.randomUUID();
          window.localStorage.setItem(storageKey, candidateId);
        }

        let row: MindMapRow | null = null;

        // Find the previously selected map.
        const { data: activeMap, error: activeMapError } = await supabase
          .from("mind_maps")
          .select(SELECT_COLUMNS)
          .eq("id", candidateId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (activeMapError) {
          throw activeMapError;
        }

        if (activeMap) {
          row = activeMap as MindMapRow;
        }

        // If no remembered map exists, use the latest map.
        if (!row) {
          const { data: latestMap, error: latestMapError } = await supabase
            .from("mind_maps")
            .select(SELECT_COLUMNS)
            .eq("user_id", user.id)
            .order("updated_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle();

          if (latestMapError) {
            throw latestMapError;
          }

          if (latestMap) {
            row = latestMap as MindMapRow;
          }
        }

        // Create the first map if the user has none.
        if (!row) {
          const { data: newMap, error: createError } = await supabase
            .from("mind_maps")
            .insert({
              id: candidateId,
              user_id: user.id,
              title: "My First Mind Map",
              nodes: localNodes,
              edges: localEdges,
              viewport: {
                x: 0,
                y: 0,
                zoom: 1,
              },
              theme: "purple",
              is_hidden: false,
            })
            .select(SELECT_COLUMNS)
            .single();

          if (createError) {
            // Handle duplicate creation from React Strict Mode.
            if (createError.code === "23505") {
              const { data: existingMap, error: existingError } =
                await supabase
                  .from("mind_maps")
                  .select(SELECT_COLUMNS)
                  .eq("id", candidateId)
                  .eq("user_id", user.id)
                  .maybeSingle();

              if (existingError) {
                throw existingError;
              }

              if (!existingMap) {
                throw createError;
              }

              row = existingMap as MindMapRow;
            } else {
              throw createError;
            }
          } else {
            row = newMap as MindMapRow;
          }
        }

        if (!row) {
          throw new Error("A mind map could not be loaded or created.");
        }

        if (cancelled) {
          return;
        }

        const databaseNodes = Array.isArray(row.nodes)
          ? (row.nodes as MindMapNodes)
          : [];

        const databaseEdges = Array.isArray(row.edges)
          ? (row.edges as MindMapEdges)
          : [];

        // Read the draft belonging specifically to this user and map.
        const draftKey = getLocalDraftKey(user.id, row.id);
        const existingDraft = readLocalDraft(draftKey);

        const matchingDraft =
          existingDraft?.mapId === row.id ? existingDraft : null;

        const hasUnsynchronizedDraft =
          matchingDraft !== null &&
          matchingDraft.revision > matchingDraft.syncedRevision;

        let selectedNodes: MindMapNodes;
        let selectedEdges: MindMapEdges;

        if (hasUnsynchronizedDraft && matchingDraft) {
          // Local version is newer than the last cloud save.
          // Restore it instead of overwriting it with Supabase data.
          selectedNodes = matchingDraft.nodes;
          selectedEdges = matchingDraft.edges;

        } else if (databaseNodes.length > 0) {
          // No pending local changes: use the cloud version.
          selectedNodes = databaseNodes;
          selectedEdges = databaseEdges;

        } else if (localNodes.length > 0) {
          // Preserve the original first-map initialization behavior.
          selectedNodes = localNodes;
          selectedEdges = localEdges;

          const { error: seedError } = await supabase
            .from("mind_maps")
            .update({
              nodes: selectedNodes,
              edges: selectedEdges,
            })
            .eq("id", row.id)
            .eq("user_id", user.id);

          if (seedError) {
            throw seedError;
          }

        } else {
          selectedNodes = databaseNodes;
          selectedEdges = databaseEdges;
        }

        if (cancelled) {
          return;
        }

 	    const revision = matchingDraft?.revision ?? 0;

        const syncedRevision = hasUnsynchronizedDraft
          ? matchingDraft.syncedRevision
          : revision;

        const initialDraft: LocalDraft = {
          version: 1,
          mapId: row.id,
          revision,
          syncedRevision,
          nodes: selectedNodes,
          edges: selectedEdges,
        };

        localDraftRef.current = initialDraft;

        try {
          writeLocalDraft(draftKey, initialDraft);
        } catch (storageError) {
          // Cloud saving can still continue if local storage is unavailable.
          console.error("Could not initialize local draft:", storageError);
        }

        window.localStorage.setItem(storageKey, row.id);

        // Load the selected graph into Zustand.
        setNodes(selectedNodes);
        setEdges(selectedEdges);

        setUserId(user.id);
        setMapId(row.id);
        setReady(true);

        setStatus(hasUnsynchronizedDraft ? "saving" : "saved");
        setErrorMessage("");

      } catch (error) {
        console.error("Mind map database initialization failed:", error);

        if (!cancelled) {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [setNodes, setEdges]);

  /*
   * IMMEDIATE LOCAL DRAFT
   *
   */
  useEffect(() => {
    if (!ready || !mapId || !userId) {
      return;
    }

    const draftKey = getLocalDraftKey(userId, mapId);

    const unsubscribe = useMindMapStore.subscribe(
      (state, previousState) => {
        const nodesChanged = state.nodes !== previousState.nodes;
        const edgesChanged = state.edges !== previousState.edges;

        if (!nodesChanged && !edgesChanged) {
          return;
        }

        const currentDraft = localDraftRef.current;

        if (!currentDraft || currentDraft.mapId !== mapId) {
          return;
        }

        const nextDraft: LocalDraft = {
          ...currentDraft,
          revision: currentDraft.revision + 1,
          nodes: state.nodes,
          edges: state.edges,
        };

        // Update the in-memory reference first.
        localDraftRef.current = nextDraft;

        // Synchronous browser storage write.
        try {
          writeLocalDraft(draftKey, nextDraft);
        } catch (error) {
          console.error("Local mind map recovery save failed:", error);
          setErrorMessage(
            "Local recovery storage failed. Cloud saving will continue."
          );
        }
      }
    );

    return unsubscribe;
  }, [ready, mapId, userId]);

  /*
   * AUTOMATIC CLOUD SAVE
   *
   * Wait 800 ms after the most recent change.
   * Local recovery does not depend on this timer.
   */
  useEffect(() => {
    if (!ready || !mapId || !userId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const draft = localDraftRef.current;

      if (!draft || draft.mapId !== mapId) {
        return;
      }

      // Snapshot both the graph and its matching revision.
      const nodesSnapshot = draft.nodes;
      const edgesSnapshot = draft.edges;
      const snapshotRevision = draft.revision;

      const revision = ++saveRevision.current;

      setStatus("saving");
      setErrorMessage("");

      const saveOperation = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const supabase = createClient();

          const { error: saveError } = await supabase
            .from("mind_maps")
            .update({
              nodes: nodesSnapshot,
              edges: edgesSnapshot,
            })
            .eq("id", mapId)
            .eq("user_id", userId);

          if (saveError) {
            throw saveError;
          }
        });

      saveQueue.current = saveOperation;

      void saveOperation
        .then(() => {
          const currentDraft = localDraftRef.current;

          if (currentDraft && currentDraft.mapId === mapId) {
            // Mark only the revision that was actually uploaded.
            // Newer edits remain marked as unsynchronized.
            const updatedDraft: LocalDraft = {
              ...currentDraft,
              syncedRevision: Math.max(
                currentDraft.syncedRevision,
                snapshotRevision
              ),
            };

            localDraftRef.current = updatedDraft;

            try {
              writeLocalDraft(
                getLocalDraftKey(userId, mapId),
                updatedDraft
              );
            } catch (storageError) {
              console.error(
                "Could not update local synchronization status:",
                storageError
              );
            }
          }

          if (revision === saveRevision.current) {
            setStatus("saved");
            setErrorMessage("");
          }
        })
        .catch((error: unknown) => {
          console.error("Mind map cloud save failed:", error);

          if (revision === saveRevision.current) {
            setStatus("error");
            setErrorMessage(getErrorMessage(error));
          }
        });
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [nodes, edges, ready, mapId, userId]);

  const statusLabel = {
    loading: "Loading your map...",
    saving: "Saving to cloud...",
    saved: "Saved to cloud",
    error: "Database save failed",
  }[status];

  return (
    <>
      {/* Cloud save indicator */}
      <div
        title={errorMessage || statusLabel}
        aria-live="polite"
        className={`fixed bottom-3 right-3 z-[60] rounded-full px-3 py-2 text-xs font-medium shadow-sm ${
          status === "error"
            ? "bg-[#FCEFF4] text-[#A95F7D]"
            : status === "saved"
              ? "bg-[#EAF5EF] text-[#386B50]"
              : "bg-[#F1EAFB] text-[#6F527F]"
        }`}
      >
        {statusLabel}
      </div>

      {/* Prevent editing before the saved map loads */}
      {!ready && status === "loading" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF7FF]/95 px-6">
          <div className="text-center">
            <p className="font-semibold text-[#6F527F]">
              Loading your mind map
            </p>

            <p className="mt-2 text-sm text-[#887B91]">
              Connecting to your saved data...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
