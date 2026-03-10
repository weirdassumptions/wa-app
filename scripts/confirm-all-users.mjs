/**
 * One-off script: marca come "email confermata" tutti gli utenti che non lo sono.
 * Così tutti i registrati possono accedere anche con "Confirm email" attivo.
 *
 * Usa la Service Role Key (mai esporla nel frontend).
 *
 * Esegui dalla root del progetto:
 *   node --env-file=.env.local scripts/confirm-all-users.mjs
 * oppure:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/confirm-all-users.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath) && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Mancano le variabili d'ambiente.");
  console.error("In .env.local (nella root del progetto) aggiungi:");
  console.error("  SUPABASE_URL=https://TUO_PROJECT.supabase.co");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=eyJ... (la chiave 'service_role' da Dashboard → Project Settings → API)");
  console.error("");
  console.error("Se usi già NEXT_PUBLIC_SUPABASE_URL, va bene; serve in più SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const perPage = 100;
let page = 1;
let totalConfirmed = 0;
let totalSkipped = 0;

while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error("Errore listUsers:", error.message);
    process.exit(1);
  }
  const users = data?.users ?? [];
  if (users.length === 0) break;

  for (const user of users) {
    if (user.email_confirmed_at) {
      totalSkipped++;
      continue;
    }
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (updateError) {
      console.error(`Errore per ${user.email ?? user.id}:`, updateError.message);
      continue;
    }
    console.log("Confermato:", user.email ?? user.id);
    totalConfirmed++;
  }

  if (users.length < perPage) break;
  page++;
}

console.log("\nFatto. Confermati:", totalConfirmed, "– Già ok:", totalSkipped);
