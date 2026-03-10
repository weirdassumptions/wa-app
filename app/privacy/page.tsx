"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 14, marginBottom: 24, textDecoration: "none" }}>
          ← Torna all&apos;app
        </Link>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
          Informativa sulla privacy
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>
          Ultimo aggiornamento: marzo 2026. Questa informativa è resa ai sensi del Regolamento (UE) 2016/679 (GDPR) e del d.lgs. 196/2003 (Codice privacy).
        </p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>1. Titolare del trattamento</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            Il titolare del trattamento dei dati personali è il gestore del servizio Weird Assumptions (&quot;WA&quot;). Per esercitare i tuoi diritti puoi contattarci all&apos;indirizzo{" "}
            <a href="mailto:wa@weirdassumptions.com" style={{ color: "var(--red)", textDecoration: "none" }}>wa@weirdassumptions.com</a>.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>2. Dati raccolti</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)", marginBottom: 10 }}>
            Trattiamo in particolare:
          </p>
          <ul style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", paddingLeft: 20, marginBottom: 10 }}>
            <li><strong>Dati di account:</strong> email, username, nome visualizzato, biografia, colore avatar, immagine del profilo (se caricata), password (in forma crittografata).</li>
            <li><strong>Contenuti pubblici:</strong> testi dei post (WA), commenti, like e interazioni che generi sul servizio. Post, commenti e interazioni possono essere visibili pubblicamente agli altri utenti della piattaforma.</li>
            <li><strong>Dati tecnici e di utilizzo:</strong> indirizzo IP, tipo di browser, dati di log di accesso e utilizzo del sito, necessari per il funzionamento e la sicurezza del servizio.</li>
          </ul>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            La registrazione e l&apos;uso del servizio sono volontari; puoi consultare parte del contenuto senza account. L&apos;invio di email per conferma account e recupero password è gestito tramite il nostro fornitore di autenticazione (Supabase).
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>3. Base giuridica e finalità</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)", marginBottom: 10 }}>
            I dati sono trattati per:
          </p>
          <ul style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", paddingLeft: 20, marginBottom: 10 }}>
            <li><strong>Esecuzione del contratto</strong> (art. 6.1.b GDPR): creazione e gestione dell&apos;account, erogazione del servizio (post, commenti, like, challenge, profili).</li>
            <li><strong>Obblighi di legge</strong> (art. 6.1.c GDPR): adempimenti fiscali, contabili e di legge.</li>
            <li><strong>Legittimo interesse</strong> (art. 6.1.f GDPR): sicurezza del sito, prevenzione abusi, miglioramento tecnico del servizio.</li>
          </ul>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            Dove richiesto dalla legge (es. marketing o cookie non strettamente necessari) chiederemo il tuo consenso esplicito.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>4. Conservazione</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            I dati dell&apos;account e i contenuti sono conservati per tutta la durata del rapporto. Dopo la cancellazione dell&apos;account possiamo conservare copie o log per il tempo strettamente necessario a obblighi di legge o per far valere o difendere diritti (es. in caso di controversie). I log di accesso e sicurezza sono conservati per periodi limitati secondo le prassi tecniche e di legge.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>5. Diritti dell&apos;interessato</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)", marginBottom: 10 }}>
            In base al GDPR hai diritto a:
          </p>
          <ul style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", paddingLeft: 20, marginBottom: 10 }}>
            <li><strong>Accesso</strong> (art. 15): ottenere conferma che i tuoi dati siano trattati e una copia.</li>
            <li><strong>Rettifica</strong> (art. 16): far correggere dati inesatti o incompleti (anche dal profilo in app).</li>
            <li><strong>Cancellazione</strong> (art. 17): far cancellare i dati quando non siano più necessari o in altri casi di legge.</li>
            <li><strong>Limitazione</strong> (art. 18): limitare il trattamento in determinate circostanze.</li>
            <li><strong>Portabilità</strong> (art. 20): ricevere i dati in formato strutturato e di uso comune.</li>
            <li><strong>Opposizione</strong> (art. 21): opporti al trattamento fondato su legittimo interesse.</li>
            <li><strong>Reclamo</strong> (art. 77): proporre reclamo al Garante per la protezione dei dati personali ({"garanteprivacy.it"}).</li>
          </ul>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            Per esercitare i diritti scrivere a{" "}
            <a href="mailto:wa@weirdassumptions.com" style={{ color: "var(--red)", textDecoration: "none" }}>wa@weirdassumptions.com</a>.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>6. Destinatari e trasferimenti</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            I dati sono trattati tramite infrastrutture e servizi (hosting, database, autenticazione) che possono essere forniti da soggetti terzi (es. Supabase, Vercel). Tali fornitori agiscono come responsabili del trattamento o sub-responsabili e sono scelti in modo da rispettare il GDPR; i dati possono essere ospitati nell&apos;Unione europea. Non vendiamo i tuoi dati a terzi per scopi di marketing.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>7. Sicurezza</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            Adottiamo misure tecniche e organizzative adeguate (accessi riservati, crittografia, buone prassi di sviluppo) per proteggere i dati da accessi non autorizzati, perdita o uso illecito.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>8. Modifiche</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)" }}>
            Questa informativa può essere aggiornata. La data &quot;Ultimo aggiornamento&quot; in testa indica l&apos;ultima revisione. Ti invitiamo a consultarla periodicamente.
          </p>
        </section>
      </div>
    </div>
  );
}
