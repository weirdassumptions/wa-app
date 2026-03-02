"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Assumption = {
  id: string;
  text: string;
  username: string;
  created_at: string;
  likes?: number;
  alreadyLiked?: boolean;
};

type Comment = {
  id: string;
  text: string;
  username: string;
  assumption_id: string;
  created_at: string;
};

export default function Home() {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);

  /* ---------------- DATE FORMAT ---------------- */

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);

    if (diff < 60) return "adesso";
    if (minutes < 60) return `${minutes} min fa`;
    if (hours < 24) return `${hours} ore fa`;
    if (days === 1) return "ieri";
    if (days < 7) return `${days} giorni fa`;

    return date.toLocaleDateString("it-IT");
  };

  /* ---------------- DEVICE ID ---------------- */

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  };

  /* ---------------- ADMIN ---------------- */

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const { data: adminData } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminData) setIsAdmin(true);
  };

  const hiddenLogin = async () => {
    const email = prompt("Admin email:");
    const password = prompt("Password:");
    if (!email || !password) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) checkAdmin();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  /* ---------------- FETCH ---------------- */

  const fetchAll = async () => {
    const { data: posts } = await supabase
      .from("assumptions")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: comms } = await supabase.from("comments").select("*");

    const { data: likes } = await supabase
      .from("likes")
      .select("assumption_id, device_id");

    if (posts) {
      const deviceId = getDeviceId();

      const enriched = posts.map((p) => {
        const postLikes =
          likes?.filter((l) => l.assumption_id === p.id) ?? [];

        return {
          ...p,
          likes: postLikes.length,
          alreadyLiked: postLikes.some(
            (l) => l.device_id === deviceId
          ),
        };
      });

      setAssumptions(enriched);
    }

    if (comms) setComments(comms);
  };

  useEffect(() => {
    fetchAll();
    checkAdmin();
  }, []);

  /* ---------------- CREATE POST ---------------- */

  const addPost = async () => {
    if (!text.trim()) return;

    await supabase.from("assumptions").insert([
      {
        text,
        username: username || "Anonimo",
      },
    ]);

    setText("");
    setUsername("");
    fetchAll();
  };

  /* ---------------- LIKE ---------------- */

  const likePost = async (postId: string) => {
    const deviceId = getDeviceId();

    const { error } = await supabase.from("likes").insert([
      {
        assumption_id: postId,
        device_id: deviceId,
      },
    ]);

    if (!error) fetchAll();
  };

  /* ---------------- DELETE POST ---------------- */

  const deletePost = async (postId: string) => {
    await supabase.from("likes").delete().eq("assumption_id", postId);
    await supabase.from("comments").delete().eq("assumption_id", postId);
    await supabase.from("assumptions").delete().eq("id", postId);

    fetchAll();
  };

  /* ---------------- ADD COMMENT ---------------- */

  const addComment = async (
    assumptionId: string,
    commentText: string,
    commentUsername: string
  ) => {
    if (!commentText.trim()) return;

    await supabase.from("comments").insert([
      {
        text: commentText,
        username: commentUsername || "Anonimo",
        assumption_id: assumptionId,
      },
    ]);

    fetchAll();
  };

  return (
    <main className="min-h-screen bg-[#0f1115] text-white">

      {/* HEADER */}
      <div className="flex flex-col items-center justify-center py-20 relative">
        <img
          src="/logo.jpeg"
          alt="WA"
          className="w-56 md:w-64 object-contain cursor-pointer transition hover:scale-105"
          onClick={() => {
            const c = secretClicks + 1;
            setSecretClicks(c);

            if (c === 3) {
              hiddenLogin();
              setSecretClicks(0);
            }

            setTimeout(() => setSecretClicks(0), 1500);
          }}
        />

        {isAdmin && (
          <div
            onDoubleClick={logout}
            className="absolute top-6 right-6 text-xs text-[#e10600] cursor-pointer"
          >
            ADMIN
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 space-y-10 pb-20">

        {/* FORM */}
        <div className="bg-[#181b21] p-6 rounded-2xl border border-zinc-800 space-y-4">
          <input
            className="w-full p-3 rounded-lg bg-[#121418] border border-zinc-700"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <textarea
            className="w-full p-3 rounded-lg bg-[#121418] border border-zinc-700"
            placeholder="Scrivi la tua weird assumption..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            onClick={addPost}
            className="w-full bg-[#e10600] p-3 rounded-lg hover:opacity-90"
          >
            Pubblica
          </button>
        </div>

        {/* POSTS */}
        {assumptions.map((a) => {
          const postComments = comments.filter(
            (c) => c.assumption_id === a.id
          );

          return (
            <PostCard
              key={a.id}
              assumption={a}
              comments={postComments}
              addComment={addComment}
              likePost={likePost}
              deletePost={deletePost}
              isAdmin={isAdmin}
              formatDate={formatDate}
            />
          );
        })}
      </div>
    </main>
  );
}

/* ---------------- POST CARD ---------------- */

function PostCard({
  assumption,
  comments,
  addComment,
  likePost,
  deletePost,
  isAdmin,
  formatDate,
}: any) {
  const [commentText, setCommentText] = useState("");
  const [commentUsername, setCommentUsername] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setTimeout(async () => {
      await deletePost(assumption.id);
    }, 300);
  };

  return (
    <div
      className={`bg-[#181b21] p-6 rounded-2xl border border-zinc-800 space-y-6 transition-all duration-300 ${
        isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            {assumption.username} • {formatDate(assumption.created_at)}
          </p>
          <p className="text-lg mt-2 text-zinc-200">
            {assumption.text}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-400"
          >
            🗑 elimina
          </button>
        )}
      </div>

      <div className="flex gap-6 text-zinc-400 border-t border-zinc-800 pt-4">
        <button
          onClick={() =>
            !assumption.alreadyLiked && likePost(assumption.id)
          }
          className={
            assumption.alreadyLiked
              ? "text-[#e10600]"
              : "hover:text-white"
          }
        >
          👍 {assumption.likes}
        </button>

        <span>💬 {comments.length}</span>
      </div>

      {comments.length > 0 && (
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          {comments.map((c: any) => (
            <div
              key={c.id}
              className="bg-[#121418] p-4 rounded-xl"
            >
              <div className="flex justify-between text-xs text-zinc-400">
                <span className="font-semibold">
                  {c.username}
                </span>
                <span>
                  {formatDate(c.created_at)}
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-200">
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-t border-zinc-800 pt-4">
        <input
          className="w-32 p-2 rounded bg-[#121418] border border-zinc-700 text-sm"
          placeholder="Username"
          value={commentUsername}
          onChange={(e) =>
            setCommentUsername(e.target.value)
          }
        />

        <input
          className="flex-1 p-2 rounded bg-[#121418] border border-zinc-700 text-sm"
          placeholder="Scrivi un commento..."
          value={commentText}
          onChange={(e) =>
            setCommentText(e.target.value)
          }
        />

        <button
          onClick={() => {
            addComment(
              assumption.id,
              commentText,
              commentUsername
            );
            setCommentText("");
            setCommentUsername("");
          }}
          className="bg-[#e10600] px-4 rounded text-sm"
        >
          →
        </button>
      </div>
    </div>
  );
}