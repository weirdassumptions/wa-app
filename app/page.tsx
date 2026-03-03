"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Comment = {
  id: string;
  text: string;
  username: string;
  assumption_id: string;
  created_at: string;
};

export default function Home() {
  const [assumptions, setAssumptions] = useState<any[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);

    if (newCount >= 3) {
      setLogoClickCount(0);
      if (isAdmin) {
        setIsAdmin(false);
        alert("🔓 Modalità admin disattivata.");
        return;
      }
      const pwd = prompt("🔐 Password admin:");
      if (pwd === "weirdassumptions") {
        setIsAdmin(true);
        alert("✅ Modalità admin attivata!");
      } else if (pwd !== null) {
        alert("❌ Password errata.");
      }
      return;
    }

    logoClickTimer.current = setTimeout(() => setLogoClickCount(0), 800);
  };

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  };

  const fetchAll = async () => {
    const { data: assumptionsData } = await supabase.from("assumptions").select("*").order("created_at", { ascending: false });
    const { data: commentsData } = await supabase.from("comments").select("*").order("created_at", { ascending: true });
    const { data: likesData } = await supabase.from("likes").select("assumption_id, device_id");

    if (assumptionsData) {
      const deviceId = getDeviceId();
      const enriched = assumptionsData.map((a) => {
        const postLikes = likesData ? likesData.filter((l) => l.assumption_id === a.id) : [];
        return { ...a, likes: postLikes.length, alreadyLiked: postLikes.some((l) => l.device_id === deviceId) };
      });
      setAssumptions(enriched);
    }

    if (commentsData) setComments(commentsData);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addAssumption = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    await supabase.from("assumptions").insert([{ text, username: username || "Anonimo" }]);
    setText("");
    setUsername("");
    await fetchAll();
    setIsPosting(false);
  };

  const likePost = async (postId: string) => {
    const deviceId = getDeviceId();
    const { error } = await supabase.from("likes").insert([{ assumption_id: postId, device_id: deviceId }]);
    if (!error) fetchAll();
  };

  const deletePost = async (id: string) => {
    await supabase.from("likes").delete().eq("assumption_id", id);
    await supabase.from("comments").delete().eq("assumption_id", id);
    await supabase.from("assumptions").delete().eq("id", id);
    fetchAll();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    fetchAll();
  };

  const addComment = async (assumptionId: string, commentText: string, commentUsername: string) => {
    if (!commentText.trim()) return;
    await supabase.from("comments").insert([{ text: commentText, username: commentUsername || "Anonimo", assumption_id: assumptionId }]);
    fetchAll();
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s fa`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
    return d.toLocaleDateString("it-IT");
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const avatarColors = [
    "from-rose-500 to-orange-400",
    "from-violet-500 to-indigo-400",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-yellow-400",
    "from-pink-500 to-rose-400",
    "from-sky-500 to-blue-400",
  ];

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono&display=swap');

        * { box-sizing: border-box; }

        body {
          background: #080808;
          font-family: 'DM Sans', sans-serif;
        }

        .feed-card {
          background: #111111;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .feed-card:hover {
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-1px);
        }

        .glass-form {
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          backdrop-filter: blur(20px);
        }

        .input-field {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          transition: border-color 0.2s, background 0.2s;
          outline: none;
          width: 100%;
          padding: 12px 16px;
        }

        .input-field:focus {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(255,255,255,0.06);
        }

        .input-field::placeholder {
          color: rgba(255,255,255,0.25);
        }

        textarea.input-field {
          resize: none;
          min-height: 100px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          padding: 13px 24px;
          transition: opacity 0.2s, transform 0.15s;
          width: 100%;
          letter-spacing: 0.01em;
        }

        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .like-btn {
          align-items: center;
          border-radius: 999px;
          cursor: pointer;
          display: flex;
          font-size: 13px;
          font-weight: 500;
          gap: 5px;
          padding: 6px 14px;
          transition: all 0.2s;
          border: none;
        }

        .like-btn.liked {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .like-btn.not-liked {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
        }

        .like-btn.not-liked:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .avatar {
          align-items: center;
          border-radius: 50%;
          display: flex;
          flex-shrink: 0;
          font-weight: 600;
          justify-content: center;
          font-size: 13px;
        }

        .comment-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 12px 14px;
          transition: border-color 0.2s;
        }

        .comment-box:hover {
          border-color: rgba(255,255,255,0.09);
        }

        .divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin: 0;
        }

        .tag {
          background: rgba(239, 68, 68, 0.12);
          border-radius: 999px;
          color: #ef4444;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          text-transform: uppercase;
        }

        .send-btn {
          align-items: center;
          background: #ef4444;
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          display: flex;
          flex-shrink: 0;
          font-size: 16px;
          height: 40px;
          justify-content: center;
          transition: opacity 0.2s, transform 0.15s;
          width: 40px;
        }

        .send-btn:hover { opacity: 0.85; transform: scale(1.05); }

        .delete-btn {
          background: none;
          border: none;
          color: rgba(239, 68, 68, 0.4);
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .header-glow {
          background: radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.12) 0%, transparent 70%);
          height: 200px;
          left: 0;
          pointer-events: none;
          position: fixed;
          right: 0;
          top: 0;
          z-index: 0;
        }

        .char-count {
          color: rgba(255,255,255,0.2);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
        }

        .char-count.warning { color: #f59e0b; }
        .char-count.danger { color: #ef4444; }

        .empty-state {
          align-items: center;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 60px 20px;
          text-align: center;
        }

        .loading-dot {
          animation: pulse 1.5s ease-in-out infinite;
          background: rgba(239,68,68,0.5);
          border-radius: 50%;
          display: inline-block;
          height: 8px;
          width: 8px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      <div className="header-glow" />

      <main style={{ minHeight: "100vh", color: "white", position: "relative" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 80px" }}>

          {/* HEADER */}
          <div style={{ padding: "48px 0 32px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ position: "relative" }}>
                <img
                  src="/logo.jpeg"
                  alt="WA"
                  onClick={handleLogoClick}
                  style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover", display: "block", border: "2px solid rgba(239,68,68,0.3)", cursor: "pointer", userSelect: "none" }}
                />
                <div style={{ position: "absolute", inset: -4, borderRadius: 22, background: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)", zIndex: -1 }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
              <span className="tag">Weird Assumptions</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: 0 }}>
              Spill your weirdest thoughts. Anonymously.
            </p>
          </div>

          {/* FORM */}
          <div className="glass-form" style={{ padding: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
              <div
                className="avatar"
                style={{
                  width: 40, height: 40,
                  background: username ? `linear-gradient(135deg, ${avatarColors[username.charCodeAt(0) % avatarColors.length].split(" ")[0].replace("from-","").replace("rose-500","#f43f5e").replace("violet-500","#8b5cf6").replace("emerald-500","#10b981").replace("amber-500","#f59e0b").replace("pink-500","#ec4899").replace("sky-500","#0ea5e9")}, #333)` : "rgba(255,255,255,0.06)",
                  fontSize: 16,
                }}
              >
                {username ? getInitial(username) : "?"}
              </div>
              <input
                className="input-field"
                placeholder="Come ti chiami? (opzionale)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ margin: 0 }}
              />
            </div>

            <div style={{ position: "relative", marginBottom: 16 }}>
              <textarea
                className="input-field"
                placeholder="Scrivi la tua weird assumption…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
              />
              <span
                className={`char-count ${text.length > 250 ? "danger" : text.length > 200 ? "warning" : ""}`}
                style={{ position: "absolute", bottom: 10, right: 12 }}
              >
                {text.length}/280
              </span>
            </div>

            <button
              className="btn-primary"
              onClick={addAssumption}
              disabled={!text.trim() || isPosting}
            >
              {isPosting ? "Pubblicando…" : "Pubblica →"}
            </button>
          </div>

          {/* FEED */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {assumptions.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40 }}>👀</div>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 15, margin: 0 }}>
                  Nessuna assumption ancora.<br />Sii il primo a rompere il ghiaccio.
                </p>
              </div>
            ) : (
              assumptions.map((a) => (
                <PostCard
                  key={a.id}
                  assumption={a}
                  comments={comments.filter((c) => c.assumption_id === a.id)}
                  isAdmin={isAdmin}
                  onLike={likePost}
                  onDelete={deletePost}
                  onDeleteComment={deleteComment}
                  onAddComment={addComment}
                  formatTime={formatTime}
                  getInitial={getInitial}
                  getAvatarColor={getAvatarColor}
                />
              ))
            )}
          </div>

        </div>
      </main>
    </>
  );
}

function PostCard({
  assumption: a,
  comments,
  isAdmin,
  onLike,
  onDelete,
  onDeleteComment,
  onAddComment,
  formatTime,
  getInitial,
  getAvatarColor,
}: any) {
  const [showComments, setShowComments] = useState(false);

  const gradMap: Record<string, string> = {
    "from-rose-500": "#f43f5e",
    "from-violet-500": "#8b5cf6",
    "from-emerald-500": "#10b981",
    "from-amber-500": "#f59e0b",
    "from-pink-500": "#ec4899",
    "from-sky-500": "#0ea5e9",
  };

  const toGradient = (cls: string) => {
    const [from, to] = cls.split(" ");
    const toMap: Record<string, string> = {
      "to-orange-400": "#fb923c", "to-indigo-400": "#818cf8",
      "to-teal-400": "#34d399", "to-yellow-400": "#facc15",
      "to-rose-400": "#fb7185", "to-blue-400": "#60a5fa",
    };
    return `linear-gradient(135deg, ${gradMap[from] || "#888"}, ${toMap[to] || "#555"})`;
  };

  const colorClass = getAvatarColor(a.username);

  return (
    <div className="feed-card">
      <div style={{ padding: "20px 20px 0" }}>

        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="avatar"
              style={{ width: 38, height: 38, background: toGradient(colorClass), fontSize: 14, color: "white" }}
            >
              {getInitial(a.username)}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                {a.username}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
                {formatTime(a.created_at)}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button className="delete-btn" onClick={() => onDelete(a.id)}>✕</button>
          )}
        </div>

        {/* Content */}
        <p style={{ margin: "0 0 18px", fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.88)", fontWeight: 400 }}>
          {a.text}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 16 }}>
          <button
            className={`like-btn ${a.alreadyLiked ? "liked" : "not-liked"}`}
            onClick={() => !a.alreadyLiked && onLike(a.id)}
          >
            <span>{a.alreadyLiked ? "❤️" : "🤍"}</span>
            <span>{a.likes}</span>
          </button>

          <button
            className="like-btn not-liked"
            onClick={() => setShowComments(!showComments)}
            style={{ gap: 6 }}
          >
            <span>💬</span>
            <span>{comments.length}</span>
          </button>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <>
          <hr className="divider" />
          <div style={{ padding: "14px 20px 0" }}>
            {comments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {comments.map((c: any) => (
                  <div key={c.id} className="comment-box">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div
                          className="avatar"
                          style={{ width: 26, height: 26, background: toGradient(getAvatarColor(c.username)), fontSize: 10, color: "white", marginTop: 1, flexShrink: 0 }}
                        >
                          {getInitial(c.username)}
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginRight: 6 }}>
                            {c.username}
                          </span>
                          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{c.text}</span>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>
                            {formatTime(c.created_at)}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button className="delete-btn" onClick={() => onDeleteComment(c.id)}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <CommentForm assumptionId={a.id} addComment={onAddComment} />
          </div>
        </>
      )}
    </div>
  );
}

function CommentForm({ assumptionId, addComment }: { assumptionId: string; addComment: (id: string, text: string, username: string) => void }) {
  const [commentText, setCommentText] = useState("");
  const [commentUsername, setCommentUsername] = useState("");

  const submit = () => {
    if (!commentText.trim()) return;
    addComment(assumptionId, commentText, commentUsername);
    setCommentText("");
    setCommentUsername("");
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          className="input-field"
          placeholder="Username"
          value={commentUsername}
          onChange={(e) => setCommentUsername(e.target.value)}
          style={{ width: 130, flexShrink: 0 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input-field"
          placeholder="Scrivi un commento…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="send-btn" onClick={submit}>→</button>
      </div>
    </div>
  );
}