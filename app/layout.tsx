import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weird Assumptions",
  description: "Weird Assumptions — il social delle teorie strane",
};

function GlobalStyles() {
  return (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --bg:#f5f0e8; --bg2:#ede8df; --surface:#fdfaf5;
          --border:#d8d0c2; --border2:#ddd5c8;
          --text:#1a1510; --muted:#8a7f72; --muted2:#b0a898;
          --red:#b83232; --red-h:#9c2020; --red-pale:#f5ebe8; --red-ring:rgba(184,50,50,0.12);
        }
        [data-theme="dark"] {
          --bg:#111009; --bg2:#1e1a14; --surface:#19160f;
          --border:#3a3228; --border2:#2d2820;
          --text:#ede5d8; --muted:#7a7060; --muted2:#5a5248;
          --red:#d04545; --red-h:#b83232; --red-pale:#221410; --red-ring:rgba(208,69,69,0.15);
        }
        [data-theme="dark"] .x-header{background:rgba(20,18,16,0.92);}
        [data-theme="dark"] .sidebar{background:var(--bg);}
        [data-theme="dark"] .right-col{background:var(--bg);}
        [data-theme="dark"] .tweet-row:hover{background:#211d16;}
        [data-theme="dark"] .comment-item:hover{background:rgba(40,34,26,0.8);}
        [data-theme="dark"] .modal{background:#1e1a14;}
        [data-theme="dark"] .f-inp{background:#111009;}
        [data-theme="dark"] .overlay{background:rgba(0,0,0,0.7);}
        
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
        /* ── layout desktop ── */
        .page-layout{display:grid;grid-template-columns:240px minmax(0,600px) 1fr;min-height:100vh;max-width:1200px;margin:0 auto;}
        .sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--border);}
        .sidebar-logo{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:20px;cursor:pointer;border-radius:12px;transition:background 0.15s;text-decoration:none;}
        .sidebar-logo:hover{background:var(--bg2);}
        .sidebar-logo img{flex-shrink:0;display:block;}.logo-img{transition:filter 0.2s;}
        
        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;cursor:pointer;font-size:15px;font-weight:500;color:var(--text);text-decoration:none;transition:background 0.15s;border:none;background:none;font-family:inherit;width:100%;}
        .nav-item:hover{background:var(--bg2);}
        .nav-item svg{width:22px;height:22px;flex-shrink:0;}
        .nav-item.active{font-weight:700;}
        .sidebar-bottom{margin-top:auto;display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:1px solid var(--border2);}
        .sidebar-user{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:background 0.15s;text-decoration:none;}
        .sidebar-user:hover{background:var(--bg2);}
        .sidebar-user-info{flex:1;min-width:0;}
        .sidebar-user-name{font-size:14px;font-weight:600;color:var(--text);}
        .sidebar-user-handle{font-size:12px;color:var(--muted);}
        .right-col{padding:20px 20px;}
        .right-widget{background:var(--bg2);border-radius:16px;padding:16px;margin-bottom:16px;}
        .right-widget-title{font-family:'Playfair Display',serif;font-weight:700;font-size:15px;margin-bottom:10px;color:var(--text);}

        /* ── feed wrap ── */
        .wrap{min-height:100vh;background:var(--surface);border-left:1px solid var(--border);border-right:1px solid var(--border);}

        /* ── mobile header (fisso in alto) ── */
        .x-header{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(253,250,245,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);padding:0 14px;height:56px;display:flex;align-items:center;gap:8px;}
        .header-logo{cursor:pointer;border-radius:8px;object-fit:cover;user-select:none;border:1.5px solid var(--border);flex-shrink:0;transition:opacity 0.15s,border-color 0.15s;}
        .header-logo:hover{opacity:0.75;border-color:var(--red);}
        .header-title{font-family:'Playfair Display',serif;font-weight:700;font-size:17px;line-height:1.1;letter-spacing:-0.01em;}
        .header-sub{font-size:11px;color:var(--muted);margin-top:1px;}
        .admin-pill{background:var(--red-pale);border:1px solid rgba(184,50,50,0.3);border-radius:999px;color:var(--red);font-size:10px;font-weight:600;letter-spacing:0.1em;padding:3px 10px;text-transform:uppercase;}
        .user-btn{display:flex;align-items:center;gap:8px;background:none;border:1px solid var(--border);border-radius:999px;cursor:pointer;padding:5px 12px 5px 6px;transition:border-color 0.15s,background 0.15s;font-family:inherit;}
        .user-btn:hover{border-color:var(--red);background:var(--red-pale);}
        .login-btn{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;padding:7px 16px;transition:background 0.15s;white-space:nowrap;}
        .login-btn:hover{background:var(--red-h);}

        /* ── mobile menu dropdown ── */
        .mob-menu{position:absolute;top:56px;right:12px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:8px;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:100;display:flex;flex-direction:column;gap:2px;}
        .mob-menu-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text);border:none;background:none;font-family:inherit;width:100%;text-align:left;text-decoration:none;transition:background 0.15s;}
        .mob-menu-item:hover{background:var(--bg2);}
        .mob-menu-item.danger{color:var(--red);}
        .mob-menu-item svg{width:18px;height:18px;flex-shrink:0;}
        [data-theme="dark"] .mob-menu{background:var(--surface);}

        /* ── responsive ── */
        @media(max-width:900px){.page-layout{grid-template-columns:1fr;}.sidebar{display:none;}.right-col{display:none;}.mobile-only{display:flex !important;}.wrap{padding-top:56px;}}
        @media(min-width:901px){.x-header{display:none;}}
        .av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;}
        .compose{display:flex;gap:14px;padding:16px 20px 0;border-bottom:6px solid var(--bg2);background:var(--surface);}
        .compose-col{flex:1;min-width:0;}
        .compose-who{display:flex;align-items:center;gap:5px;padding:4px 0 10px;border-bottom:1px solid var(--border2);margin-bottom:10px;font-size:14px;font-weight:600;color:var(--text);}
        .compose-anon{font-size:13px;color:var(--muted);padding:10px 14px;border-radius:12px;background:var(--bg2);border:1px solid var(--border2);margin-bottom:12px;line-height:1.5;}
        .compose-anon-cta{display:inline-flex;align-items:center;gap:6px;background:var(--red);color:#fff;border:none;border-radius:999px;font-family:inherit;font-size:12px;font-weight:600;padding:6px 14px;cursor:pointer;margin-top:8px;transition:background 0.15s,transform 0.05s;}
        .compose-anon-cta:hover{background:var(--red-h);transform:scale(1.02);}
        .compose-ta{width:100%;background:transparent;border:none;outline:none;color:var(--text);font-size:19px;font-family:'DM Sans',sans-serif;font-weight:300;line-height:1.5;resize:none;overflow:hidden;padding-bottom:12px;}
        .compose-ta::placeholder{color:var(--muted2);font-style:italic;}
        .compose-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 0 14px;border-top:1px solid var(--border2);}
        .cring{position:relative;display:flex;align-items:center;justify-content:center;}
        .cring-n{position:absolute;font-size:11px;font-weight:600;pointer-events:none;}
        .btn-post{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;padding:9px 22px;transition:background 0.15s,transform 0.1s;}
        .btn-post:hover:not(:disabled){background:var(--red-h);}
        .btn-post:active:not(:disabled){transform:scale(0.97);}
        .btn-post:disabled{opacity:0.35;cursor:not-allowed;}
        .tweet-row{display:flex;gap:14px;padding:16px 20px 0;border-bottom:1px solid var(--border2);cursor:pointer;transition:background 0.12s;background:var(--surface);}
        .tweet-row:hover{background:#faf5ee;}
        .tweet-col{flex:1;min-width:0;padding-bottom:14px;}
        .tweet-meta{display:flex;align-items:flex-start;gap:5px;margin-bottom:4px;}
        .tw-name{font-weight:600;font-size:14px;color:var(--text);}
        .tw-handle{font-size:13px;color:var(--muted);}
        .tw-dot{color:var(--muted2);}
        .tw-time{font-size:13px;color:var(--muted);}
        .tweet-body{font-size:16px;line-height:1.6;color:var(--text);white-space:pre-wrap;word-break:break-word;margin-bottom:14px;}
        .badge-official{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--red);flex-shrink:0;}
        .badge-official svg{width:60%;height:60%;}
        .abar{display:flex;align-items:center;gap:2px;margin:0 -8px;}
        .act{display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:7px 9px;border-radius:999px;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;color:var(--muted);transition:color 0.15s,background 0.15s;min-width:42px;user-select:none;}
        .act svg{width:17px;height:17px;flex-shrink:0;transition:transform 0.15s;}
        .act.cmt:hover{color:#4a7aaa;background:rgba(74,122,170,0.1);}
        .act.cmt:hover svg{transform:scale(1.1);}
        .act.lk:hover{color:var(--red);background:var(--red-ring);}
        .act.lk:hover svg{transform:scale(1.15);}
        .act.lk.on{color:var(--red);}
        .act.lk.on svg{fill:var(--red);stroke:var(--red);}
        .act.del:hover{color:var(--red);background:var(--red-ring);}
        .act.pin:hover{color:#8a6a3a;background:rgba(138,106,58,0.1);}
        .act.pin.on{color:#8a6a3a;}
        .act.pin.on svg{fill:#8a6a3a;stroke:#8a6a3a;}
        .mobile-only{display:none;}
        [data-theme="dark"] .post-highlighted{animation:postHighlightDark 2.5s ease-out forwards;}
        @keyframes postHighlight{0%{background:rgba(212,90,74,0.22);}100%{background:rgba(212,90,74,0);}}
        @keyframes postHighlightDark{0%{background:rgba(212,90,74,0.35);}100%{background:rgba(212,90,74,0);}}
        .post-highlighted{animation:postHighlight 2.5s ease-out forwards;}
        .pin-banner{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#8a6a3a;letter-spacing:0.04em;text-transform:uppercase;padding:6px 20px 0;background:var(--surface);}
        .thread-line{width:1px;flex:1;min-height:14px;background:var(--border2);margin:6px auto 0;border-radius:1px;}
        .comments-area{background:var(--surface);border-bottom:1px solid var(--border2);padding-bottom:4px;}
        .comment-root{}
        .comment-root:last-of-type{}
        .comment-item{display:flex;gap:10px;padding:8px 16px 4px;transition:background 0.12s;}
        .comment-item:hover{background:var(--bg2);}
        .comment-children{padding-left:0;border-left:1px solid var(--border2);margin-left:36px;}
        .c-name{font-weight:600;font-size:13px;color:var(--text);}
        .c-time{font-size:12px;color:var(--muted);}
        .c-body{font-size:14px;color:var(--text);line-height:1.55;margin-top:2px;}
        .c-reply-btn{background:none;border:none;cursor:pointer;font-size:11px;font-weight:500;color:var(--muted2);font-family:inherit;padding:2px 0;margin-top:3px;transition:color 0.15s;letter-spacing:0.01em;}
        .c-reply-btn:hover{color:var(--muted);}
        .reply-box{display:flex;align-items:center;gap:10px;padding:8px 16px 10px;border-top:1px solid var(--border2);background:var(--surface);}
        .reply-col{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0;}
        .reply-inp{background:transparent;border:none;outline:none;color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;width:100%;}
        .reply-inp::placeholder{color:var(--muted2);font-style:italic;}
        .reply-send{background:var(--red);border:none;border-radius:999px;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;padding:5px 14px;white-space:nowrap;flex-shrink:0;transition:background 0.15s;}
        .reply-send:hover{background:var(--red-h);}
        .empty{padding:72px 20px;text-align:center;color:var(--muted);}
        .empty-icon{font-size:40px;margin-bottom:14px;}
        .empty-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;}
        .podium-wrap{padding:16px;border-bottom:6px solid var(--bg2);}
        .podium-wrap.sidebar-mode{padding:0;border:none;background:none;}
        .podium-label{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px;}
        .podium-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:end;}
        .podium-grid.sidebar-mode{grid-template-columns:1fr;gap:8px;align-items:stretch;}
        .podium-col{display:flex;flex-direction:column;align-items:center;gap:0;}
        .podium-col.sidebar-mode{flex-direction:row;align-items:flex-start;gap:10px;background:var(--bg2);border-radius:12px;padding:10px 12px;border:1px solid var(--border2);}
        .podium-card{width:100%;background:var(--bg2);border-radius:12px 12px 0 0;padding:10px 8px 8px;border:1px solid var(--border2);border-bottom:none;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;}
        .podium-rank{font-size:18px;margin-bottom:2px;}
        .podium-bar{width:100%;border-radius:0 0 4px 4px;border:1px solid var(--border2);border-top:none;}
        .podium-name{font-size:11px;font-weight:700;color:var(--text);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
        .podium-text{font-size:11px;color:var(--muted);line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-align:center;}
        .podium-text.sidebar-mode{text-align:left;-webkit-line-clamp:2;}
        .podium-likes{font-size:11px;color:var(--muted2);margin-top:2px;}
        @media(min-width:901px){.podium-wrap:not(.sidebar-mode){display:none;}}
        [data-theme="dark"] .podium-card{background:var(--bg2);}
        .overlay{position:fixed;inset:0;z-index:200;background:rgba(26,21,16,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;}
        .modal{background:var(--surface);border:1px solid var(--border2);border-radius:24px;padding:28px;width:100%;max-width:380px;box-shadow:0 24px 64px rgba(0,0,0,0.18);max-height:90vh;overflow-y:auto;}
        .modal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;}
        .tabs{display:flex;background:var(--bg2);border-radius:12px;padding:3px;gap:3px;margin-bottom:20px;}
        .tab{flex:1;background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;padding:9px;border-radius:9px;color:var(--muted);transition:background 0.15s,color 0.15s;}
        .tab.on{background:var(--surface);color:var(--text);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.1);}
        .f-inp{background:var(--bg2);border:1px solid transparent;border-radius:12px;outline:none;padding:11px 14px;font-size:14px;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;transition:border-color 0.2s;}
        .f-inp:focus{border-color:var(--red);background:var(--bg);}
        .f-inp::placeholder{color:var(--muted2);}
        .f-label{font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;letter-spacing:0.04em;text-transform:uppercase;}
        .color-row{display:flex;gap:8px;flex-wrap:wrap;}
        .color-dot{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform 0.15s,border-color 0.15s;}
        .color-dot.sel{border-color:var(--text);transform:scale(1.15);}
        .auth-err{font-size:13px;color:var(--red);font-weight:500;text-align:center;padding:4px 0;}
        .modal-link{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-family:inherit;text-align:center;padding:6px 0;text-decoration:underline;width:100%;display:block;}
        .modal-link:hover{color:var(--text);}
        .av-upload{position:relative;cursor:pointer;display:inline-block;}
        .av-upload-overlay{position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;}
        .av-upload:hover .av-upload-overlay{opacity:1;}
        .av-upload-overlay svg{width:18px;height:18px;color:#fff;}
      
        /* ── profile hero ── */
        .profile-hero{position:relative;background:var(--surface);}
        .profile-cover{height:110px;width:100%;}
        .profile-av-wrap{position:absolute;top:58px;left:20px;}
        .profile-info{padding:56px 20px 20px;}
        .profile-name{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--text);}
        .profile-handle{font-size:14px;color:var(--muted);margin-top:2px;}
        .profile-bio{font-size:14px;color:var(--text);line-height:1.55;margin-top:8px;max-width:440px;}
        .profile-stats{display:flex;gap:20px;margin-top:12px;}
        .profile-stat{display:flex;align-items:baseline;gap:5px;}
        .stat-n{font-weight:700;font-size:16px;color:var(--text);}
        .stat-l{font-size:13px;color:var(--muted);}
        .edit-profile-btn{margin-top:14px;background:none;border:1.5px solid var(--border);border-radius:999px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--text);padding:7px 20px;transition:border-color 0.15s,background 0.15s;}
        .edit-profile-btn:hover{border-color:var(--red);background:var(--red-pale);}
        /* ── footer globale (in fondo alla pagina, non sticky) ── */
        .site-footer{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 16px;background:var(--bg2);border-top:1px solid var(--border);font-size:12px;margin-top:auto;}
        .site-footer a{color:var(--muted);text-decoration:none;transition:color 0.15s;}
        .site-footer a:hover{color:var(--red);}
        [data-theme="dark"] .site-footer{background:var(--bg);border-top-color:var(--border2);}
      `}</style>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <GlobalStyles />
        {children}
        <footer className="site-footer">
          <Link href="/privacy">Privacy</Link>
          <span style={{ color: "var(--muted2)" }}>·</span>
          <Link href="/termini">Termini</Link>
        </footer>
      </body>
    </html>
  );
}