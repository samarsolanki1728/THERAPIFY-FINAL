import { API_BASE_URL } from "../lib/api";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  ChevronRight,
  Lock,
  Pencil,
  Trash2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Award,
  ArrowRight
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

const API_URL = `${API_BASE_URL}/api/journals`;

export default function Journal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState(() => searchParams.get("new") === "1" ? "editor" : "list");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // AI Analysis state
  const [allowAnalysisInEditor, setAllowAnalysisInEditor] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [detailConsent, setDetailConsent] = useState(true);

  const token = localStorage.getItem("token");

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  useEffect(() => {
    const loadEntries = async () => {
      const savedToken = localStorage.getItem("token");

      if (!savedToken) {
        setError("Please sign in to access your journal.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(API_URL, {
          headers: {
            Authorization: "Bearer " + savedToken,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load entries.");
        }

        setEntries(data.entries || []);
        const linkedEntry = (data.entries || []).find(entry => entry._id === searchParams.get("entry"));
        if (linkedEntry) {
          setSelectedEntry(linkedEntry);
          setTitle(linkedEntry.title || "");
          setBody(linkedEntry.body || "");
          setView("detail");
        }
      } catch (err) {
        setError(err.message || "Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  const startNewEntry = () => {
    setSelectedEntry(null);
    setTitle("");
    setBody("");
    setAllowAnalysisInEditor(false);
    setEditing(false);
    setError("");
    setAnalysisError("");
    setView("editor");
  };

  const openEntry = (entry) => {
    setSelectedEntry(entry);
    setTitle(entry.title || "");
    setBody(entry.body || "");
    setEditing(false);
    setError("");
    setAnalysisError("");
    setView("detail");
  };

  const handleSave = async () => {
    if (!body.trim()) {
      setError("Please write something before saving.");
      return;
    }

    if (!token) {
      setError("Please sign in again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(selectedEntry);
      const url = isEditing
        ? `${API_URL}/${selectedEntry._id}`
        : API_URL;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          title: title.trim() || "Untitled entry",
          body: body.trim(),
          mood: selectedEntry?.mood || "Not specified",
          tag: selectedEntry?.tag || "Personal",
          allowAIAnalysis: allowAnalysisInEditor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save the entry.");
      }

      if (isEditing) {
        setEntries((previous) =>
          previous.map((entry) =>
            entry._id === data.entry._id ? data.entry : entry
          )
        );
        setSelectedEntry(data.entry);
        setEditing(false);
        setView("detail");
      } else {
        setEntries((previous) => [data.entry, ...previous]);
        setSelectedEntry(data.entry);
        setView("detail");
      }
    } catch (err) {
      setError(err.message || "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this journal entry?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/${selectedEntry._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete the entry.");
      }

      setEntries((previous) =>
        previous.filter((entry) => entry._id !== selectedEntry._id)
      );

      setSelectedEntry(null);
      setView("list");
    } catch (err) {
      setError(err.message || "Could not delete the entry.");
    }
  };

  const runAIAnalysis = async (forceRefresh = false) => {
    if (!selectedEntry) return;

    if (!detailConsent) {
      setAnalysisError("Please confirm your consent to analyze this journal entry.");
      return;
    }

    setAnalyzing(true);
    setAnalysisError("");

    try {
      const response = await fetch(`${API_URL}/${selectedEntry._id}/analyze`, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          consent: true,
          forceRefresh,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to analyze entry.");
      }

      const updated = {
        ...selectedEntry,
        aiAnalysis: data.analysis,
        allowAIAnalysis: true,
      };

      setSelectedEntry(updated);
      setEntries((prev) =>
        prev.map((e) => (e._id === updated._id ? updated : e))
      );
    } catch (err) {
      setAnalysisError(err.message || "Could not analyze journal entry.");
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const aiAnalysis = selectedEntry?.aiAnalysis;

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        {view === "list" && (
          <>
            <div className="flex items-center justify-between mb-10">
              <div>
                <span className="text-xs font-medium text-primary uppercase tracking-widest">
                  Your journal
                </span>
                <h1 className="font-display text-4xl font-medium text-foreground mt-2">
                  A private space
                  <br />
                  <em className="font-normal">just for you.</em>
                </h1>
              </div>

              <button
                onClick={startNewEntry}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                New entry
              </button>
            </div>

            <div className="flex items-center gap-2 p-3.5 bg-muted/60 rounded-2xl mb-8 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Your entries are strictly private to your account. Optional Therapify AI emotional insights are available only with your consent.
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-5">{error}</p>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading your journal...
              </p>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <BookOpen className="w-10 h-10 text-primary mx-auto mb-4" />
                <h2 className="text-lg font-medium text-foreground mb-2">
                  Your journal starts here
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Write down your thoughts and reflect on your day.
                </p>
                <button
                  onClick={startNewEntry}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm"
                >
                  Write your first entry
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {entries.map((entry) => (
                  <button
                    key={entry._id}
                    onClick={() => openEntry(entry)}
                    className="text-left w-full bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">📝</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">
                          {entry.tag || "Personal"}
                        </span>
                        {entry.aiAnalysis?.emotionalPatterns && (
                          <span className="text-[11px] px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Analyzed
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <h3 className="text-sm font-medium text-foreground mb-1">
                      {entry.title || "Untitled entry"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
                      {entry.body}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {view === "detail" && selectedEntry && (
          <>
            <div className="flex items-center justify-between gap-3 mb-8">
              <button
                onClick={() => {
                  setView("list");
                  setError("");
                  setAnalysisError("");
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to journal
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(true);
                    setTitle(selectedEntry.title || "");
                    setBody(selectedEntry.body || "");
                    setAllowAnalysisInEditor(Boolean(selectedEntry.allowAIAnalysis));
                    setError("");
                    setView("editor");
                  }}
                  className="flex items-center gap-2 border border-border px-4 py-2 rounded-full text-sm hover:bg-secondary/60 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-full text-sm hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {formatDate(selectedEntry.createdAt)} · {selectedEntry.tag || "Personal"}
            </p>

            <h1 className="font-display text-3xl font-medium text-foreground mb-6">
              {selectedEntry.title || "Untitled entry"}
            </h1>

            <p className="text-sm text-foreground leading-8 whitespace-pre-wrap break-words bg-card/40 p-6 rounded-2xl border border-border/60">
              {selectedEntry.body}
            </p>

            {/* Task 1: Therapify AI Emotional Analysis Section */}
            <div className="mt-8 bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <h2 className="text-sm font-medium text-foreground">
                    Therapify AI Emotional Analysis
                  </h2>
                </div>
                {aiAnalysis?.emotionalPatterns && (
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => runAIAnalysis(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                    Re-analyze
                  </button>
                )}
              </div>

              {aiAnalysis?.emotionalPatterns ? (
                <div className="space-y-4 pt-1">
                  {/* Emotional Patterns */}
                  <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      Emotional Patterns & Tone
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {aiAnalysis.emotionalPatterns}
                    </p>
                  </div>

                  {/* Stress Triggers & Recurring Concerns */}
                  {Array.isArray(aiAnalysis.stressTriggers) && aiAnalysis.stressTriggers.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Identified Stress Triggers
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.stressTriggers.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs border border-destructive/20"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positive Developments & Resilience */}
                  {Array.isArray(aiAnalysis.positiveDevelopments) && aiAnalysis.positiveDevelopments.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Positive Developments & Resilience
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.positiveDevelopments.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 flex items-center gap-1"
                          >
                            <Award className="w-3 h-3" />
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Wellness Exercise */}
                  {aiAnalysis.recommendedExercise?.id && (
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block mb-1">
                          Tailored Practice
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {aiAnalysis.recommendedExercise.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {aiAnalysis.recommendedExercise.reason}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/wellness?activity=${encodeURIComponent(aiAnalysis.recommendedExercise.id)}`)
                        }
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5 shrink-0"
                      >
                        Start practice <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Therapify AI can review this entry to help identify stress triggers, emotional shifts, and moments of resilience. Analysis requires your explicit opt-in.
                  </p>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detailConsent}
                      onChange={(e) => setDetailConsent(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>I consent to analyzing this private entry with Therapify AI</span>
                  </label>

                  <button
                    type="button"
                    disabled={analyzing || !detailConsent}
                    onClick={() => runAIAnalysis(false)}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                    {analyzing ? "Analyzing emotional tone..." : "Analyze with Therapify AI"}
                  </button>
                </div>
              )}

              {analysisError && (
                <p className="text-xs text-destructive flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {analysisError}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-5">{error}</p>
            )}
          </>
        )}

        {view === "editor" && (
          <>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => {
                  setError("");
                  setView(selectedEntry ? "detail" : "list");
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Cancel
              </button>

              <span className="text-xs text-muted-foreground">
                {editing ? "Edit journal entry" : "New journal entry"}
              </span>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this entry a title…"
              maxLength={200}
              className="w-full font-display text-2xl font-medium bg-transparent outline-none text-foreground placeholder:text-muted-foreground mb-4 border-b border-border pb-4"
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind? Write freely — this is just for you…"
              rows={14}
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm leading-[1.75] resize-none mb-4"
            />

            {/* Opt-in toggle in editor */}
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowAnalysisInEditor}
                  onChange={(e) => setAllowAnalysisInEditor(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Generate AI emotional analysis upon saving</span>
              </label>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" /> Optional & Private
              </span>
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {body.length} characters
              </p>

              <button
                onClick={handleSave}
                disabled={!body.trim() || saving}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-all"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Save entry"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
