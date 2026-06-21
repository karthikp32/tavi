"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatInput } from "@/components/chat/ChatInput";
import { deleteChatSession, getChatSessions, updateChatSession } from "@/lib/api/chat";
import type { ChatSession } from "@/lib/types";

function getSessionTitle(session: ChatSession): string {
  if (session.summary) {
    return session.summary;
  }

  return (
    session.messages.find((message) => message.role === "facility_manager")?.body ??
    "New chat"
  );
}

export default function HomePage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChatSessionId, setSelectedChatSessionId] = useState<string | null>(null);
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [editingChatSessionId, setEditingChatSessionId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadChatSessions(nextSelectedId?: string) {
    setLoadError(null);
    const sessions = await getChatSessions();
    setChatSessions(sessions);
    if (nextSelectedId) {
      setSelectedChatSessionId(nextSelectedId);
    }
  }

  async function handleDeleteChatSession(session: ChatSession) {
    setLoadError(null);
    setOpenChatMenuId(null);
    await deleteChatSession(session.id);
    setChatSessions((sessions) => sessions.filter((item) => item.id !== session.id));
    if (selectedChatSessionId === session.id) {
      setSelectedChatSessionId(null);
    }
    if (editingChatSessionId === session.id) {
      setEditingChatSessionId(null);
      setEditingChatTitle("");
    }
  }

  function startRenamingChatSession(session: ChatSession) {
    setOpenChatMenuId(null);
    setEditingChatSessionId(session.id);
    setEditingChatTitle(getSessionTitle(session));
  }

  async function saveRenamedChatSession(session: ChatSession) {
    const currentTitle = getSessionTitle(session);
    const nextTitle = editingChatTitle.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      setEditingChatSessionId(null);
      setEditingChatTitle("");
      return;
    }

    setLoadError(null);
    const updatedSession = await updateChatSession(session.id, { summary: nextTitle });
    setChatSessions((sessions) =>
      sessions.map((item) => (item.id === session.id ? updatedSession : item)),
    );
    setEditingChatSessionId(null);
    setEditingChatTitle("");
  }

  useEffect(() => {
    let isMounted = true;

    getChatSessions()
      .then((sessions) => {
        if (!isMounted) return;
        setChatSessions(sessions);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError("Chat history could not be loaded.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedChatSession = useMemo(
    () => chatSessions.find((session) => session.id === selectedChatSessionId) ?? null,
    [chatSessions, selectedChatSessionId],
  );

  return (
    <AppShell>
      <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b border-tavi-navy/10 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-tavi-navy">Chats</h2>
            <button
              type="button"
              className="rounded-md border border-tavi-navy/20 px-3 py-1.5 text-sm font-medium text-tavi-navy hover:border-tavi-indigo hover:text-tavi-indigo"
              onClick={() => setSelectedChatSessionId(null)}
            >
              New
            </button>
          </div>

          {isLoadingSessions ? (
            <p className="text-sm text-tavi-navy/50">Loading chats...</p>
          ) : loadError ? (
            <p className="text-sm text-red-700">{loadError}</p>
          ) : chatSessions.length === 0 ? (
            <p className="text-sm text-tavi-navy/50">No previous chats yet.</p>
          ) : (
            <nav aria-label="Previous chats" className="flex flex-col gap-1">
              {chatSessions.map((session) => {
                const isSelected = session.id === selectedChatSessionId;

                return (
                  <div
                    key={session.id}
                    className={
                      "relative flex items-center gap-1 rounded-md " +
                      (isSelected
                        ? "bg-white text-tavi-navy shadow-sm"
                        : "text-tavi-navy/70 hover:bg-white/70 hover:text-tavi-navy")
                    }
                  >
                    {editingChatSessionId === session.id ? (
                      <input
                        aria-label="Rename chat"
                        className="min-w-0 flex-1 rounded border border-tavi-indigo bg-white px-2 py-1.5 text-sm text-tavi-navy outline-none"
                        value={editingChatTitle}
                        onChange={(event) => setEditingChatTitle(event.target.value)}
                        onBlur={() => {
                          void saveRenamedChatSession(session);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveRenamedChatSession(session);
                          }
                          if (event.key === "Escape") {
                            setEditingChatSessionId(null);
                            setEditingChatTitle("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className={"min-w-0 flex-1 truncate px-3 py-2 text-left text-sm " + (isSelected ? "font-medium" : "")}
                        onClick={() => {
                          setOpenChatMenuId(null);
                          setSelectedChatSessionId(session.id);
                        }}
                      >
                        {getSessionTitle(session)}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Chat options for ${getSessionTitle(session)}`}
                      aria-expanded={openChatMenuId === session.id}
                      className="flex h-7 w-7 items-center justify-center rounded text-sm text-tavi-navy/50 hover:bg-white hover:text-tavi-indigo"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenChatMenuId((openId) => (openId === session.id ? null : session.id));
                      }}
                    >
                      <span aria-hidden="true">...</span>
                    </button>
                    {openChatMenuId === session.id ? (
                      <div className="absolute right-8 top-8 z-10 min-w-28 rounded-md border border-tavi-navy/10 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-tavi-navy hover:bg-tavi-pale-blue/60"
                          onClick={() => {
                            startRenamingChatSession(session);
                          }}
                        >
                          Rename
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Delete ${getSessionTitle(session)}`}
                      className="mr-1 flex h-7 w-7 items-center justify-center rounded text-sm text-tavi-navy/50 hover:bg-red-50 hover:text-red-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteChatSession(session);
                      }}
                    >
                      <span aria-hidden="true">x</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          )}
        </aside>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
          <h1 className="text-3xl font-semibold text-tavi-navy">Tavi</h1>
          <p className="max-w-xl text-tavi-navy/70">
            Your command center for trade work orders. Describe what you need and Tavi will find,
            contact, and compare vendors for you.
          </p>
          <ChatInput
            key={selectedChatSession?.id ?? "new-chat"}
            chatSession={selectedChatSession}
            onSessionChange={(chatSessionId) => {
              void loadChatSessions(chatSessionId);
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
