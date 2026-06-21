"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatInput } from "@/components/chat/ChatInput";
import { deleteChatSession, getChatSessions, updateChatSession } from "@/lib/api/chat";
import { getSession, type Session } from "@/lib/auth";
import type { ChatSession } from "@/lib/types";

function getSessionTitle(session: ChatSession): string {
  if (session.summary) {
    return session.summary;
  }

  return (
    session.messages.find(
      (message) => message.role === "facility_manager" || message.role === "vendor",
    )?.body ?? "New chat"
  );
}

function getAgentCopy(session: Session | null): { description: string; placeholder?: string } {
  if (session?.type === "vendor") {
    return {
      description:
        "Ask Tavi about marketplace work orders, current lowest bids, and what details are needed before you place a bid.",
      placeholder: "Ask about marketplace work orders, current lowest bids, or help making a bid",
    };
  }

  return {
    description:
      "Your command center for trade work orders. Describe what you need and Tavi will find, contact, and compare vendors for you.",
    placeholder: "Describe your work order and Tavi will find matching vendors for your needs",
  };
}

export default function TaviPage() {
  const [session] = useState<Session | null>(() => getSession());
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

  async function handleDeleteChatSession(chatSession: ChatSession) {
    setLoadError(null);
    setOpenChatMenuId(null);
    await deleteChatSession(chatSession.id);
    setChatSessions((sessions) => sessions.filter((item) => item.id !== chatSession.id));
    if (selectedChatSessionId === chatSession.id) {
      setSelectedChatSessionId(null);
    }
    if (editingChatSessionId === chatSession.id) {
      setEditingChatSessionId(null);
      setEditingChatTitle("");
    }
  }

  function startRenamingChatSession(chatSession: ChatSession) {
    setOpenChatMenuId(null);
    setEditingChatSessionId(chatSession.id);
    setEditingChatTitle(getSessionTitle(chatSession));
  }

  async function saveRenamedChatSession(chatSession: ChatSession) {
    const currentTitle = getSessionTitle(chatSession);
    const nextTitle = editingChatTitle.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      setEditingChatSessionId(null);
      setEditingChatTitle("");
      return;
    }

    setLoadError(null);
    const updatedSession = await updateChatSession(chatSession.id, { summary: nextTitle });
    setChatSessions((sessions) =>
      sessions.map((item) => (item.id === chatSession.id ? updatedSession : item)),
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
    () => chatSessions.find((chatSession) => chatSession.id === selectedChatSessionId) ?? null,
    [chatSessions, selectedChatSessionId],
  );
  const agentCopy = getAgentCopy(session);
  const actorType = session?.type ?? "facility_manager";

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
              {chatSessions.map((chatSession) => {
                const isSelected = chatSession.id === selectedChatSessionId;
                const title = getSessionTitle(chatSession);

                return (
                  <div
                    key={chatSession.id}
                    className={
                      "relative flex items-center gap-1 rounded-md " +
                      (isSelected
                        ? "bg-white text-tavi-navy shadow-sm"
                        : "text-tavi-navy/70 hover:bg-white/70 hover:text-tavi-navy")
                    }
                  >
                    {editingChatSessionId === chatSession.id ? (
                      <input
                        aria-label="Rename chat"
                        className="min-w-0 flex-1 rounded border border-tavi-indigo bg-white px-2 py-1.5 text-sm text-tavi-navy outline-none"
                        value={editingChatTitle}
                        onChange={(event) => setEditingChatTitle(event.target.value)}
                        onBlur={() => {
                          void saveRenamedChatSession(chatSession);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveRenamedChatSession(chatSession);
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
                        className={
                          "min-w-0 flex-1 truncate px-3 py-2 text-left text-sm " +
                          (isSelected ? "font-medium" : "")
                        }
                        onClick={() => {
                          setOpenChatMenuId(null);
                          setSelectedChatSessionId(chatSession.id);
                        }}
                      >
                        {title}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Chat options for ${title}`}
                      aria-expanded={openChatMenuId === chatSession.id}
                      className="flex h-7 w-7 items-center justify-center rounded text-sm text-tavi-navy/50 hover:bg-white hover:text-tavi-indigo"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenChatMenuId((openId) => (openId === chatSession.id ? null : chatSession.id));
                      }}
                    >
                      <span aria-hidden="true">...</span>
                    </button>
                    {openChatMenuId === chatSession.id ? (
                      <div className="absolute right-8 top-8 z-10 min-w-28 rounded-md border border-tavi-navy/10 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-tavi-navy hover:bg-tavi-pale-blue/60"
                          onClick={() => {
                            startRenamingChatSession(chatSession);
                          }}
                        >
                          Rename
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Delete ${title}`}
                      className="mr-1 flex h-7 w-7 items-center justify-center rounded text-sm text-tavi-navy/50 hover:bg-red-50 hover:text-red-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteChatSession(chatSession);
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
          <h1 className="text-5xl font-bold tracking-tight text-tavi-navy">Tavi</h1>
          <p className="max-w-xl text-tavi-navy/70">{agentCopy.description}</p>
          <ChatInput
            key={selectedChatSession?.id ?? "new-chat"}
            chatSession={selectedChatSession}
            actorType={actorType}
            actorId={session?.type === "vendor" ? session.id : undefined}
            placeholder={agentCopy.placeholder}
            onSessionChange={(chatSessionId) => {
              void loadChatSessions(chatSessionId);
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
