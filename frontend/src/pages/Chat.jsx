import { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  ArrowUp,
  Shield,
  BookOpen,
  TrendingUp,
  Plus,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
  Lock
} from "lucide-react";
import { Link } from "react-router";
import MarkdownRenderer from "../app/components/MarkdownRenderer";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const initialWelcomeMessage = {
  role: "ai",
  text: "Hello, and welcome. I'm here whenever you're ready to talk. How are you feeling today?"
};

const suggestions = [
  "I'm feeling anxious today",
  "I'm feeling overwhelmed",
  "I could use some support"
];

export default function Chat() {
  // Sidebar and UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeTitle, setActiveTitle] = useState("New Conversation");

  // Messaging state
  const [messages, setMessages] = useState([initialWelcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingConversations, setIsFetchingConversations] = useState(false);

  // Rename & Delete state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // Modals state
  const [consentInfoOpen, setConsentInfoOpen] = useState(false);
  const [useWellnessContext, setUseWellnessContext] = useState(false);

  const bottomRef = useRef(null);
  const sendingRef = useRef(false);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch all user conversations from MongoDB
  async function fetchConversations() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsFetchingConversations(true);
    try {
      const response = await fetch(`${API}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) return;

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Could not fetch conversations:", err);
    } finally {
      setIsFetchingConversations(false);
    }
  }

  // Switch or open a conversation
  async function selectConversation(id) {
    if (activeId === id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setActiveId(id);
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/api/chat/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Conversation could not be loaded.");

      const data = await response.json();
      const conv = data.conversation;
      setActiveTitle(conv.title || "Conversation");
      setMessages(
        conv.messages && conv.messages.length > 0
          ? conv.messages
          : [initialWelcomeMessage]
      );
    } catch (err) {
      console.error(err);
      alert("Unable to open conversation.");
    } finally {
      setIsLoading(false);
    }
  }

  // Create a brand new chat
  function handleNewChat() {
    setActiveId(null);
    setActiveTitle("New Conversation");
    setMessages([initialWelcomeMessage]);
    setInput("");
  }

  // Rename a conversation
  async function saveRename(id, e) {
    e?.stopPropagation();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API}/api/chat/conversations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle.trim() })
      });

      if (response.ok) {
        setConversations((prev) =>
          prev.map((c) => (c._id === id ? { ...c, title: editTitle.trim() } : c))
        );
        if (activeId === id) {
          setActiveTitle(editTitle.trim());
        }
      }
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setEditingId(null);
    }
  }

  // Delete a conversation
  async function deleteConversation(id, e) {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API}/api/chat/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c._id !== id));
        if (activeId === id) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  // Send a message
  const send = async (text) => {
    if (!text.trim() || sendingRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please sign in to use Therapify AI.");
      return;
    }

    sendingRef.current = true;
    setIsLoading(true);

    const userMsg = { role: "user", text: text.trim() };

    // Optimistically show user message
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const payload = {
        message: text.trim(),
        conversationId: activeId,
        contextConsent: useWellnessContext
      };

      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to get a response.");
      }

      // If backend returned complete saved messages from conversation, sync them
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: data.reply,
            isCrisis: data.isCrisis
          }
        ]);
      }

      // If new conversation was created on the fly
      if (data.conversationId) {
        setActiveId(data.conversationId);
        setActiveTitle(data.conversationTitle || "Conversation");

        // Update sidebar list
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === data.conversationId);
          if (exists) {
            return prev.map((c) =>
              c._id === data.conversationId
                ? {
                    ...c,
                    title: data.conversationTitle || c.title,
                    updatedAt: new Date().toISOString()
                  }
                : c
            );
          } else {
            return [
              {
                _id: data.conversationId,
                title: data.conversationTitle || "New Conversation",
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              },
              ...prev
            ];
          }
        });
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: error.message || "Therapify AI is temporarily unavailable."
        }
      ]);
    } finally {
      sendingRef.current = false;
      setIsLoading(false);
    }
  };

  // Group conversations by date (Today, Yesterday, Previous 7 Days, Older)
  const groupedConversations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: []
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.updatedAt || conv.createdAt);
      if (date >= today) {
        groups.Today.push(conv);
      } else if (date >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (date >= weekAgo) {
        groups["Previous 7 Days"].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [conversations]);

  return (
    <div className="h-screen pt-16 flex overflow-hidden bg-background">
      {/* ChatGPT-style Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 pt-16 md:static flex flex-col w-72 bg-card border-r border-border transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-full"
        }`}
      >
        {/* Sidebar Header & New Chat button */}
        <div className="p-3.5 space-y-2 border-b border-border/60">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversations
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {isFetchingConversations ? (
            <div className="text-center py-8 text-xs text-muted-foreground animate-pulse">
              Loading chat history...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No past chats yet. Start talking to Therapify AI to save your conversations.
            </div>
          ) : (
            groupedConversations.map(([groupName, convList]) => (
              <div key={groupName} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold text-muted-foreground/70 tracking-wide uppercase">
                  {groupName}
                </p>
                {convList.map((conv) => {
                  const isActive = activeId === conv._id;
                  const isEditing = editingId === conv._id;

                  return (
                    <div
                      key={conv._id}
                      onClick={() => !isEditing && selectConversation(conv._id)}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        isActive
                          ? "bg-secondary text-foreground font-medium border border-border/80 shadow-xs"
                          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? "text-primary" : "text-muted-foreground/60"
                          }`}
                        />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(conv._id, e);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-primary px-1.5 py-0.5 rounded text-xs text-foreground outline-none w-full"
                          />
                        ) : (
                          <span className="truncate">{conv.title || "Conversation"}</span>
                        )}
                      </div>

                      {/* Rename / Delete buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={(e) => saveRename(conv._id, e)}
                            className="p-1 text-primary hover:text-primary/80"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(conv._id);
                                setEditTitle(conv.title || "");
                              }}
                              className="p-1 hover:text-foreground text-muted-foreground"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => deleteConversation(conv._id, e)}
                              className="p-1 hover:text-destructive text-muted-foreground"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/60 bg-card/40 space-y-2">
          <button
            type="button"
            onClick={() => setConsentInfoOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/30 hover:bg-secondary/60 text-[11px] text-muted-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Privacy & Safeguards
            </span>
            <Lock className="w-3 h-3 opacity-60" />
          </button>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Chat Bar */}
        <header className="h-14 border-b border-border/80 px-4 flex items-center justify-between bg-card/40 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight truncate max-w-xs sm:max-w-md">
                  {activeTitle}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Therapify AI Online</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/crisis"
              className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1"
            >
              Crisis Help
            </Link>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg, i) => {
              const isAi = msg.role === "ai";

              return (
                <div
                  key={i}
                  className={`flex flex-col ${isAi ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`flex items-start gap-3 max-w-[85%] sm:max-w-[80%] ${
                      isAi ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    {isAi && (
                      <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
                      </div>
                    )}

                    <div
                      className={`text-sm leading-relaxed px-4 py-3 rounded-2xl shadow-2xs ${
                        isAi
                          ? "bg-card text-foreground rounded-tl-sm border border-border"
                          : "bg-primary text-primary-foreground rounded-tr-sm"
                      }`}
                    >
                      {isAi ? (
                        <MarkdownRenderer content={msg.text} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
                </div>
                <div className="bg-card text-muted-foreground text-xs px-4 py-2.5 rounded-2xl rounded-tl-sm border border-border flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Therapify AI is reflecting...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input & Starter suggestions */}
        <div className="border-t border-border/80 p-4 bg-card/30 backdrop-blur-sm shrink-0">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Show quick starter suggestion pills only if chat has only welcome message */}
            {messages.length <= 1 && (
              <div className="flex flex-nowrap gap-2 justify-center overflow-x-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isLoading}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2 items-end bg-card border border-border rounded-2xl p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Open up, I'm here for you..."
                rows={1}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-32"
              />

              <button
                type="button"
                onClick={() => send(input)}
                disabled={isLoading || !input.trim()}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-40"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>

            <label className="flex items-start gap-2 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useWellnessContext}
                onChange={(event) => setUseWellnessContext(event.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">
                  Personalize with my recent entries
                </span>
                {" "}When on, each message may use selected entries from the past 30 days: mood logs, check-in answers, journals you allowed AI to analyze, and other chats. This data is sent to our AI provider. Off by default.
              </span>
            </label>

            {/* Safety & Crisis Footer */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <Link to="/crisis" className="underline hover:text-primary whitespace-nowrap ml-2">
                Emergency helplines
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Privacy & Safeguards Modal */}
      {consentInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-in fade-in"
          role="dialog"
        >
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-medium">Privacy & Data Safeguards</h3>
              </div>
              <button
                type="button"
                onClick={() => setConsentInfoOpen(false)}
                className="p-1 rounded-full hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                • <strong>User Isolation:</strong> Your conversations and wellness data are strictly linked to your account and never shared with other users.
              </p>
              <p>
                • <strong>Optional personalization:</strong> The checkbox below the message box is off by default. When enabled, recent mood logs, completed check-ins, journals already approved for AI analysis, and other conversations may be sent to our AI provider to personalize replies. Turn it off at any time.
              </p>
              <p>
                • Recent messages and a few earlier details from this conversation help maintain context. Memory is limited, and you may need to repeat older details. Turning personalization off stops new history lookups; it does not erase details already shared in this chat.
              </p>
              <p>
                • <strong>Support boundaries:</strong> Therapify AI can talk with you about emotions, relationships, stress, and mental health, but does not diagnose conditions or replace professional care.
              </p>
              <p>
                • <strong>Crisis Safety:</strong> If you or someone you know is in crisis, emergency contacts (112, 14416 in India) are immediately surfaced.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConsentInfoOpen(false)}
              className="w-full py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
