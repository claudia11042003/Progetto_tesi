/*Il file aichat_controller.js è un controller backend che gestisce 
 l’interazione tra il frontend e il modello AI Gemini, 
 principalmente per analizzare file CSV e gestire una chat AI. 
*/

//per leggere file
const fs = require("fs");
//per gestire i path
const path = require("path");
//per leggere i CSV
const { parse } = require("csv-parse/sync");
//per chiamare Gemini
const { GoogleGenAI, createUserContent } = require("@google/genai");
//per generare ID casuali
const crypto = require("crypto");
//per leggere variabili ambiente
const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
const ai = new GoogleGenAI({ apiKey });

//Legge un file locale instruction.txt,
// che contiene l’istruzione di sistema da dare al modello
// (cioè “chi deve essere l’AI e come deve comportarsi”).
const instruction = fs.readFileSync(
  path.resolve(__dirname, "instruction.txt"),
  "utf-8"
);

const CHAT_INSTRUCTION = fs.readFileSync(
  path.resolve(__dirname, "chatinstruction.txt"),
  "utf-8"
);

const modelName = "gemini-2.0-flash";

let cacheName; //terrà il nome della cache creata con l’API Gemini (se il contesto è grande).
let smallContext = null; // se il contesto è “piccolo”, lo teniamo qui per spedirlo inline
const SYSTEM_INSTRUCTION = instruction;

//Funzione che rimuove un eventuale BOM
//  carattere nascosto che può comparire nei file UTF-8 e dare problemi.
function stripBOM(s) {
  return s.replace(/^\uFEFF/, "");
}

//È composto da due funzioni che servono a leggere un CSV caricato via HTTP (multipart)
//  e a trovare automaticamente il separatore.
function robustCsvParse(contentStr) {
  const candidates = [",", ";", "\t", "$", "|"];
  for (const delimiter of candidates) {
    try {
      const rows = parse(contentStr, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        delimiter,
      });
      if (rows?.length) return rows;
    } catch {}
  }
  // fallback: virgola
  return parse(contentStr, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    quote: '"',
    delimiter: ",",
  });
}

//Riceve una richiesta HTTP (req) dove un CSV è stato caricato come multipart/form-data (tipico di upload con multer).
// Controlla se c’è req.file.buffer (contenuto binario del file).
// Se non c’è, solleva un errore HTTP 405.
// Converte il buffer in stringa UTF-8.
// Passa la stringa alla funzione robustCsvParse

function parseCsvFromReq(req) {
  if (!req?.file?.buffer) {
    const err = new Error(
      "Nessun CSV ricevuto: inviare 'file' via multipart/form-data"
    );
    err.status = 405;
    throw err;
  }
  const contentStr = req.file.buffer.toString("utf-8");
  return robustCsvParse(contentStr);
}

//ensureContext è una funzione asincrona che assicura di avere un contesto pronto da fornire al modello AI.
// Evita di ricalcolare se cacheName o smallContext sono già impostati.
// Legge il file file.txt (contenuto testuale da usare come contesto).
// Calcola il numero stimato di token (1 token = 4 caratteri).
// Se il file è grande (≥ 4096 token):
// Crea una cache sul server di Gemini (API ai.caches.create) → il testo non sarà inviato a ogni richiesta, ma richiamato da cache.
// Salva il nome della cache in cacheName.
// Aggiorna il TTL (time-to-live) della cache a 2 ore (2 * 3600s).
// Se il file è piccolo:
// Non crea cache, ma lo tiene in memoria (smallContext) per inviarlo inline con ogni chiamata al modello.

async function ensureContext() {
  if (cacheName || smallContext !== null) return;

  const filePath = path.resolve(__dirname, "file.txt");

  let text = "";

  if (fs.existsSync(filePath)) {
    text = fs.readFileSync(filePath, "utf-8") ?? "";
  }
  if (!text.trim()) {
    console.warn("Attenzione: file.txt è vuoto.");
  }

  // Stima molto grezza: 4 caratteri per token
  const estimatedTokens = Math.ceil(text.length / 4);

  if (estimatedTokens >= 4096) {
    //  abbastanza grande : usiamo la Cache API
    const cache = await ai.caches.create({
      model: modelName,
      config: {
        contents: createUserContent(text),
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    cacheName = cache.name;

    await ai.caches.update({
      name: cacheName,
      config: { ttl: `${2 * 3600}s` }, // 2 ore
    });
  } else {
    //  troppo piccolo per la cache : lo spediremo inline ad ogni richiesta

    smallContext = text; // accetta stringa vuota
  }
}

//DATASETS: è una mappa in memoria
//  che associa un dataset_id a un oggetto
//  che contiene:scoredJson: i dati elaborati in JSON,
// cioè risultati dell’AI.
const DATASETS = new Map(); // dataset_id -> { scoredJson, createdAt }
const DATA_TTL_MS = 2 * 60 * 60 * 1000; // 2 ore

//Salva un dataset nella mappa con la data di creazione.
function setDataset(datasetId, scoredJson) {
  DATASETS.set(datasetId, { scoredJson, createdAt: Date.now() });
}

//getDataset recupera un dataset dalla mappa.
// se non esiste : ritorna null.
// se è scaduto : lo cancella e ritorna null.
// altrimenti : ritorna l’oggetto { scoredJson, createdAt }.
// in pratica: è una cache in memoria temporanea
//  per evitare di ricalcolare i risultati dell’AI ogni volta.
function getDataset(datasetId) {
  const v = DATASETS.get(datasetId);
  if (!v) return null;
  if (Date.now() - v.createdAt > DATA_TTL_MS) {
    DATASETS.delete(datasetId);
    return null;
  }
  return v;
}

//Esporta due funzioni:
// sendCsvSummary: gestisce l’upload di un CSV,
// lo analizza, crea un sommario e lo invia
//  al modello AI per ottenere un’analisi iniziale.
// Restituisce un JSON con i dati strutturati (se il modello li fornisce)
// Imposta anche un dataset_id univoco per il CSV caricato,
//  che può essere usato nelle richieste successive.

exports.sendCsvSummary = async (req, res) => {
  try {
    if (!apiKey) throw new Error("GEMINI_API_KEY non impostata");

    await ensureContext();
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ error: "Nessun CSV ricevuto (chiave 'file' mancante)" });
    }

    // Stringa UTF-8 + rimozione BOM
    const contentStr = stripBOM(req.file.buffer.toString("utf-8"));

    // Parse robusto (prova , ; \t $ |)
    const rows = robustCsvParse(contentStr);
    const numRows = rows.length;
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const preview = rows.slice(0, numRows);

    const csvSummary = `
         Il CSV contiene ${numRows} righe.
        Colonne: ${headers.join(", ")}
        Prime righe di esempio:
          ${JSON.stringify(preview, null, numRows)} `.trim();

    // Prompt iniziale
    const contents = [
      ...(smallContext
        ? [{ role: "user", parts: [{ text: smallContext }] }]
        : []),
      {
        role: "user",
        parts: [{ text: "Ecco i dati del CSV:\n" + csvSummary }],
      },
    ];

    const resp = await ai.models.generateContent({
      model: modelName,
      contents,
      config: cacheName
        ? { cachedContent: cacheName }
        : { systemInstruction: SYSTEM_INSTRUCTION },
    });

    const raw = typeof resp.text === "function" ? await resp.text() : resp.text;
    let payload = null;
    let question = "Ciao!Sono la tua HR Assistant.\n Per iniziare, indica semplicemente il numero di persone che vuoi in ogni team.";

    const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        payload = JSON.parse(match[0]);
      } catch (e) {
        console.warn("JSON non valido:", e.message);
      }

      
      //question = raw.replace(match[0], "").trim();
    } else {
      
      //question = raw.trim();
    }

    let scoredJson;
    if (payload) {
      scoredJson = JSON.stringify(payload);
    } else {
      const candidates = rows.map((r, i) => ({
        id: r.id ?? `cand_${i + 1}`,
        name: r.name ?? r.nome ?? `Candidato ${i + 1}`,

        ...r,
      }));
      scoredJson = JSON.stringify({ candidates });
    }

    const dataset_id = crypto.randomUUID();
    setDataset(dataset_id, scoredJson);
    return res.json({
      ok: true,
      dataset_id,
      payload, // dati strutturati per le skill
      question, // testo finale rivolto all’utente
      raw, // opzionale, per debug
    });
  } catch (err) {
    console.error("Errore /AiChat-csv:", err);
    return res.status(500).json({ error: err.message });
  }
};

// sendMessage: gestisce messaggi di chat,
// costruisce il contesto con la cronologia,
// invia tutto al modello AI e restituisce la risposta testuale.
exports.sendMessage = async (req, res) => {
  try {
    if (!apiKey) throw new Error("GEMINI_API_KEY non impostata nel backend");
    if (!req.body)
      throw new Error(
        "Body mancante: assicurati di avere app.use(express.json())"
      );

    const { message, history = [], dataset_id } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "messaggio mancante" });
    }
    if (!dataset_id) {
      return res
        .status(400)
        .json({ error: "dataset_id mancante: invialo insieme al messaggio" });
    }

    await ensureContext();
    // NEW: recupera i punteggi salvati (quelli che già usi per ReactRadar)
    const ds = getDataset(dataset_id);
    if (!ds) {
      return res
        .status(410)
        .json({ error: "Dataset scaduto o mancante. Ricarica il CSV." });
    }

    // Costruzione dei contents multi-turno
    const contents = [
      // Se non abbiamo cache, includiamo il “context piccolo” all’inizio
      ...(smallContext
        ? [{ role: "user", parts: [{ text: smallContext }] }]
        : []),

      {
        role: "user",
        parts: [{ text: `SCORED_CANDIDATES_JSON:\n${ds.scoredJson}` }],
      },

      ...history.map((t) => ({
        role: t.role === "model" ? "model" : "user",
        parts: [{ text: String(t.text ?? "") }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    // Se abbiamo cache la usiamo; altrimenti passiamo solo la systemInstruction
    const resp = await ai.models.generateContent({
      model: modelName,
      contents,
      config: cacheName
        ? { cachedContent: cacheName } // cache con TTL
        : { systemInstruction: CHAT_INSTRUCTION }, // niente cache : systemInstruction inline
    });

    const text =
      typeof resp.text === "function" ? await resp.text() : resp.text;
    return res.json({ text });
  } catch (err) {
    console.error("Errore /AiChat:", err);
    return res.status(500).json({ error: err.message });
  }
};
