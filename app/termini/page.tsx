"use client";

import Link from "next/link";

const sectionTitle = { fontFamily: "'Playfair Display', serif" as const, fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" };
const para = { fontSize: 14, lineHeight: 1.65, color: "var(--text)" };
const paraMb = { ...para, marginBottom: 10 };
const ul = { fontSize: 14, lineHeight: 1.7, color: "var(--text)", paddingLeft: 20, marginBottom: 10 };

export default function TerminiPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 14, marginBottom: 24, textDecoration: "none" }}>
          ← Torna all&apos;app
        </Link>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
          Termini del Servizio
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>
          Ultimo aggiornamento: marzo 2026. Utilizzando Weird Assumptions accetti i presenti Termini.
        </p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>1. Accettazione</h2>
          <p style={paraMb}>
            L&apos;accesso e l&apos;uso del servizio Weird Assumptions (&quot;WA&quot;, &quot;il Servizio&quot;) sono regolati dai presenti Termini.
          </p>
          <p style={paraMb}>
            La piattaforma è utilizzabile solo da utenti che abbiano almeno 14 anni o l&apos;età minima richiesta dalla normativa applicabile nel paese di residenza dell&apos;utente.
          </p>
          <p style={paraMb}>
            Registrandoti o utilizzando il Servizio dichiari di aver letto, compreso e accettato questi Termini e la nostra Informativa sulla privacy. Se non accetti i presenti Termini, non utilizzare il Servizio.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>2. Descrizione del servizio</h2>
          <p style={paraMb}>
            Weird Assumptions (WA) è una piattaforma sociale che permette agli utenti di:
          </p>
          <ul style={ul}>
            <li>pubblicare brevi testi (&quot;assunzioni&quot; o post)</li>
            <li>commentare i contenuti</li>
            <li>mettere like</li>
            <li>osservare altri utenti</li>
            <li>partecipare a eventuali challenge o iniziative della community</li>
          </ul>
          <p style={paraMb}>
            Parte dei contenuti può essere visibile anche senza account; per pubblicare o interagire è richiesta la registrazione.
          </p>
          <p style={para}>
            Il Servizio può essere modificato o aggiornato nel tempo per migliorarne funzionalità e sicurezza.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>3. Account e responsabilità</h2>
          <p style={paraMb}>
            Sei responsabile della riservatezza delle credenziali del tuo account e di tutte le attività che avvengono tramite il tuo account.
          </p>
          <p style={paraMb}>
            Devi fornire informazioni veritiere in fase di registrazione e aggiornare tali informazioni se cambiano.
          </p>
          <p style={paraMb}>
            Un account è personale e non trasferibile.
          </p>
          <p style={paraMb}>
            Non è consentito impersonare altre persone, inclusi personaggi pubblici, marchi o organizzazioni, in modo ingannevole o tale da far credere che il contenuto provenga da tali soggetti.
          </p>
          <p style={para}>
            La piattaforma può inoltre richiedere informazioni o effettuare verifiche ragionevoli sull&apos;identità degli utenti al fine di garantire la sicurezza del servizio e il rispetto delle regole della piattaforma.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>4. Contenuti generati dagli utenti e moderazione</h2>
          <p style={paraMb}>
            La piattaforma Weird Assumptions consente agli utenti di pubblicare contenuti generati direttamente dagli utenti stessi, tra cui:
          </p>
          <ul style={ul}>
            <li>post</li>
            <li>commenti</li>
            <li>interazioni</li>
          </ul>
          <p style={paraMb}>
            Gli utenti sono gli unici responsabili dei contenuti che pubblicano e si impegnano a non pubblicare contenuti:
          </p>
          <ul style={ul}>
            <li>illegali</li>
            <li>diffamatori</li>
            <li>offensivi</li>
            <li>ingannevoli</li>
            <li>che violino diritti di terzi</li>
            <li>che incitino all&apos;odio, alla violenza o alla discriminazione</li>
          </ul>
          <p style={paraMb}>
            Pubblicando contenuti sulla piattaforma, l&apos;utente concede a WA una licenza non esclusiva, gratuita e utilizzabile a livello mondiale per ospitare, visualizzare, riprodurre e distribuire tali contenuti all&apos;interno del servizio e per il funzionamento della piattaforma.
          </p>
          <p style={paraMb}>
            I contenuti restano comunque di proprietà dell&apos;utente.
          </p>
          <p style={paraMb}>
            WA non è responsabile delle opinioni o delle dichiarazioni pubblicate dagli utenti e non garantisce l&apos;accuratezza o l&apos;affidabilità dei contenuti generati dagli utenti.
          </p>
          <p style={paraMb}>
            Per garantire la sicurezza della piattaforma e il rispetto della legge, WA si riserva il diritto di:
          </p>
          <ul style={ul}>
            <li>moderare i contenuti</li>
            <li>limitare la visibilità dei contenuti</li>
            <li>rimuovere contenuti</li>
            <li>sospendere o chiudere account</li>
          </ul>
          <p style={para}>
            Il titolare può rimuovere contenuti o limitare account anche senza preavviso quando necessario per garantire il rispetto della legge, la sicurezza della piattaforma o la tutela di altri utenti.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>5. Natura satirica della piattaforma</h2>
          <p style={paraMb}>
            La piattaforma Weird Assumptions è orientata alla satira, all&apos;umorismo e alla creatività degli utenti.
          </p>
          <p style={paraMb}>
            Eventuali riferimenti a persone reali, personaggi pubblici o eventi reali presenti nei contenuti degli utenti devono essere interpretati in chiave ironica, satirica o di discussione.
          </p>
          <p style={paraMb}>
            I contenuti pubblicati sulla piattaforma non devono essere considerati fatti verificati, ma opinioni o interpretazioni degli utenti.
          </p>
          <p style={para}>
            Le opinioni espresse nei contenuti non riflettono necessariamente la posizione del gestore della piattaforma.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>6. Regole di utilizzo</h2>
          <p style={paraMb}>
            Utilizzando il Servizio ti impegni a:
          </p>
          <p style={paraMb}>
            <strong>Rispettare le persone.</strong> Non diffamare, insultare, minacciare o molestare altri utenti e non incitare all&apos;odio o alla discriminazione.
          </p>
          <p style={paraMb}>
            <strong>Non usare il Servizio per spam o abusi.</strong> Non inviare messaggi massivi non richiesti, non creare account multipli per aggirare limiti o sanzioni e non usare bot o sistemi automatizzati non autorizzati.
          </p>
          <p style={paraMb}>
            <strong>Rispettare la legge.</strong> Non pubblicare contenuti illeciti o che violino diritti di terzi.
          </p>
          <p style={paraMb}>
            <strong>Rispettare la privacy.</strong> Non pubblicare dati personali di terzi senza consenso se ciò può ledere la loro privacy.
          </p>
          <p style={paraMb}>
            <strong>Contenuti appropriati.</strong> I contenuti devono essere coerenti con lo spirito della piattaforma (assunzioni, idee, discussioni).
          </p>
          <p style={paraMb}>
            La violazione delle regole può comportare:
          </p>
          <ul style={ul}>
            <li>avvisi</li>
            <li>rimozione dei contenuti</li>
            <li>sospensione dell&apos;account</li>
            <li>chiusura dell&apos;account</li>
          </ul>
          <p style={para}>
            senza esclusione di eventuali azioni legali ove applicabile.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>7. Sistema di segnalazione contenuti</h2>
          <p style={paraMb}>
            Gli utenti devono poter segnalare contenuti offensivi o problematici.
          </p>
          <p style={para}>
            Le segnalazioni verranno valutate dal sistema o da moderatori.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>8. Proprietà intellettuale e licenza sui contenuti</h2>
          <p style={paraMb}>
            Il Servizio, il marchio Weird Assumptions e i relativi elementi (grafica, loghi, software) sono di proprietà del titolare o concessi in licenza.
          </p>
          <p style={paraMb}>
            Gli utenti conservano la titolarità dei contenuti pubblicati.
          </p>
          <p style={paraMb}>
            Con la pubblicazione dei contenuti l&apos;utente concede al titolare una licenza non esclusiva, mondiale e royalty-free per utilizzare, mostrare, riprodurre e distribuire tali contenuti nell&apos;ambito del Servizio.
          </p>
          <p style={para}>
            Questa licenza può includere l&apos;utilizzo dei contenuti su canali ufficiali della piattaforma per scopi promozionali.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>9. Modifiche al servizio e ai termini</h2>
          <p style={paraMb}>
            Il titolare può modificare, sospendere o interrompere in tutto o in parte il Servizio quando necessario.
          </p>
          <p style={paraMb}>
            I Termini possono essere aggiornati nel tempo. La data &quot;Ultimo aggiornamento&quot; indica la versione più recente.
          </p>
          <p style={paraMb}>
            La prosecuzione dell&apos;uso del Servizio dopo eventuali modifiche costituisce accettazione dei nuovi Termini.
          </p>
          <p style={para}>
            In caso di modifiche rilevanti gli utenti potranno essere informati tramite notifiche nel servizio o tramite email.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>10. Limitazione di responsabilità</h2>
          <p style={paraMb}>
            Il Servizio è fornito &quot;così com&apos;è&quot;.
          </p>
          <p style={paraMb}>
            Nei limiti consentiti dalla legge, il titolare non è responsabile per:
          </p>
          <ul style={ul}>
            <li>danni indiretti o consequenziali</li>
            <li>perdita di dati</li>
            <li>contenuti pubblicati dagli utenti</li>
            <li>errori o inesattezze nei contenuti generati dagli utenti</li>
          </ul>
          <p style={para}>
            La responsabilità del titolare è limitata, ove consentito dalla legge, all&apos;importo eventualmente pagato dall&apos;utente per il Servizio negli ultimi dodici mesi.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>11. Risoluzione</h2>
          <p style={paraMb}>
            Gli utenti possono chiudere il proprio account in qualsiasi momento, ove previsto dalla piattaforma o contattando il titolare.
          </p>
          <p style={paraMb}>
            Il titolare può sospendere o chiudere account in caso di violazione dei Termini o per esigenze di gestione del Servizio.
          </p>
          <p style={para}>
            Le disposizioni che per natura devono continuare a produrre effetti (come limitazioni di responsabilità e legge applicabile) restano valide anche dopo la cessazione del rapporto.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>12. Legge applicabile</h2>
          <p style={paraMb}>
            I presenti Termini sono regolati dalla legge italiana.
          </p>
          <p style={para}>
            Per qualsiasi controversia relativa ai Termini o al Servizio sarà competente il foro del luogo di residenza o domicilio del titolare, salvo diversa disposizione inderogabile di legge.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={sectionTitle}>13. Contatti</h2>
          <p style={para}>
            Per domande relative ai presenti Termini o alla privacy è possibile contattare il titolare all&apos;indirizzo:{" "}
            <a href="mailto:wa@weirdassumptions.com" style={{ color: "var(--red)", textDecoration: "none" }}>wa@weirdassumptions.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
