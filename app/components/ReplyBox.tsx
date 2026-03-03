"use client";

import { useState } from "react";
import { Avatar, Badge } from "./Avatar";
import { displayFor } from "./helpers";
import type { Profile } from "./helpers";

export function ReplyBox({
  assumptionId,
  addComment,
  targetUsername,
  profile,
  parentId,
}: {
  assumptionId: string;
  addComment: (aid: string, t: string, pid: string | null) => void;
  targetUsername: string;
  profile: Profile | null;
  parentId: string | null;
}) {
  const [t, setT] = useState("");

  const submit = () => {
    if (!t.trim()) return;
    addComment(assumptionId, t, parentId);
    setT("");
  };

  return (
    <div className="reply-box">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar profile={profile} size={34} />
        <div className="reply-col">
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: profile ? "var(--text)" : "var(--muted)",
              fontStyle: profile ? "normal" : "italic",
              paddingBottom: 3,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {profile ? displayFor(profile.username, profile.display_name) : "Anonimo"}
            {profile?.is_verified && <Badge size={12} />}
          </div>
          <input
            className="reply-inp"
            placeholder={`Rispondi a ${targetUsername}…`}
            value={t}
            onChange={e => setT(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
        </div>
        <button className="reply-send" onClick={submit}>
          Rispondi
        </button>
      </div>
    </div>
  );
}