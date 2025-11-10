import { Loading } from "../../components/Loading/Loading";
import { ChatHistory } from "../../components/ChatHistory/ChatHistory";
import requestApi from '../../requestApi';
import { useState,useEffect,useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import{faTrashCan}from '@fortawesome/free-solid-svg-icons'
import{faPaperPlane}from '@fortawesome/free-solid-svg-icons'

import './Home.css'
import { AiResultsPanel } from "../../components/AiResultsPanel/AiResultsPanel";

export function Home(){


    const hasRun = useRef(false);
 const [userInput,setUserInput]=useState("");
 const[chatHistory,setChatHistory]=useState([]);
 const[isLoading,setIsLoading]=useState(false);
 const [aiResults, setAiResults] = useState([]);
 const [chatOpen, setChatOpen] = useState(false);
const [selectedFile, setSelectedFile] = useState(null);
const fileInputRef = useRef(null);
const [isCsvReady, setIsCsvReady] = useState(false); // abilita bottone

const[aiPayload,setAiPayload]=useState(null);

// NEW: id del dataset
const [datasetId, setDatasetId] = useState(null);

const pickCsv = () => {
  if (fileInputRef.current) fileInputRef.current.value = null; // reset
  fileInputRef.current?.click();
};
const onFileSelected = (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (!/\.csv$/i.test(f.name)) {
    alert("Seleziona un file .csv");
    e.target.value = "";
    return;
  }
  setSelectedFile(f);

  uploadCsvAndSummarize(f);
  e.target.value = null;
};



    
    
       
 
const mapHistoryToBE = (historyFE) =>
  historyFE.map((h) => ({
    role: h.type === "bot" ? "model" : "user",
    text: h.message ?? "",
  }));

    const sendMessage = async () => {
  const message = userInput.trim();
  if (!message) return;
  

  setIsLoading(true);
  
  try {
        const id = datasetId || localStorage.getItem("dataset_id") || null;

    const { data } = await requestApi.post("/Home", {
      message,
      
      history: mapHistoryToBE(chatHistory), // niente storage extra: solo contesto volatìle
         dataset_id: id,       
    });
   
    const botText = data?.text ?? "";
    

    
    setChatHistory((prev) => [
      ...prev,
      { type: "user", message },
      { type: "bot", message: botText },
    ]);
    setUserInput("");
  } catch (err) {
    console.error("Errore /Home:", err); 
         // utile: messaggio dal server
  
  
  }

  finally {
    setIsLoading(false);
  }
};



 //funzione per l'inputbar
 const HandleUserInput=(e)=>{
    setUserInput(e.target.value);
 };



    
  



 
   

 //funzione per pulire la cronologia della chat
 const clearChat =()=>{
    setChatHistory([]);
 };

const handleEnterPress = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();          // evita submit/bling
    sendMessage();
  }
};


 const uploadCsvAndSummarize = async (fileArg) => {
   const file = fileArg ?? selectedFile;     // usa l’argomento se c’è, altrimenti lo stato
  if (!file) { alert("Seleziona un CSV"); return; }
  setIsLoading(true);
  try {
    const form = new FormData();
    form.append("file", file);

    const { data } = await requestApi.post("/Home/upload", form,{
      headers: { "Content-Type": undefined }
    });
  


    let payload = data?.payload;
    if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch {} }
    const arr = Array.isArray(payload) ? payload : (payload ? [payload] : []);
    setAiResults(arr);


    // NEW: prendi dataset_id dal backend e salvalo
const dsid = data?.dataset_id || null;
if (dsid) {
  setDatasetId(dsid);
  localStorage.setItem("dataset_id", dsid);
  setIsCsvReady(true);
}



    setChatHistory(prev => [
      ...prev,
      { type: "bot", message: data?.question || data?.text || "Analisi completata." },
    ]);
  } catch (err) {
    console.error("Errore /upload", err);
    setChatHistory(prev => [...prev, { type: "bot", message: "Errore durante il caricamento del CSV." }]);
  } finally {
    setIsLoading(false);
    setIsCsvReady(true);
  }
};

 /* useEffect(() => {
    const fetchCsvSummary = async () => {
        setIsLoading(true);
      try {
        const { data } = await requestApi.get("/Home/csvsummary");
        let payload = data?.payload;
if (typeof payload === "string") {
  try { payload = JSON.parse(payload); } catch { payload = null; }
}
const arr = Array.isArray(payload) ? payload : (payload ? [payload] : []);
setAiResults(arr);    
       // if(data.payload){
         //  setAiPayload(data.payload);
         // Mostra il JSON (come stringa formattata)
       // const pretty = JSON.stringify(data.payload, null, 2);
       // setChatHistory([
       //   { type: "bot", message: pretty },
        //  { type: "bot", message: data.question || "" },

        setChatHistory(prev => [
        ...prev,
        { type: "bot", message: data?.question || "Nessuna domanda disponibile." }
      ]);
        
      } //else  {
       // setChatHistory([{ type: "bot", message: data.question || "Nessuna risposta" }]);
    //  }
       // }
        catch (err) {
      console.error("Errore Lettura :", err);
      setChatHistory([{ type: "bot", message: "Errore durante la lettura del CSV." }]);
    } finally {
      setIsLoading(false);
    }
  };
    fetchCsvSummary();
  }, []);*/


  return (
   
    <div className="chatbox">
    <h2><div className="titoloHR">HR Assistant</div></h2>
     <Loading  isLoading={isLoading} />
    {/* area principale con gli accordion */}
    <main className={`content-main ${chatOpen ? "with-chat" : ""}`}>
      {aiResults.length > 0 && <AiResultsPanel payload={aiResults} />}
    </main>
     <input
  ref={fileInputRef}
  type="file"
  accept=".csv"
  style={{ display: "none" }}
  onChange={onFileSelected}
/>

{/* NUOVO: bottone floating CSV, sopra "Forma i Team!" */}
<button
  className="csv-fab"
  type="button"
  onClick={pickCsv}
  aria-label="Carica CSV"
  title={selectedFile ? `Selezionato: ${selectedFile.name}` : "Carica CSV"}
>
  Carica CSV
</button>
    {/* pulsante flottante per aprire la chat */}
    <button className="chat-fab" onClick={() => setChatOpen(true)} disabled={!isCsvReady}    aria-disabled={!isCsvReady } aria-label="Apri chat AI">
      Forma i Team!
    </button>

    {/* pannello laterale slide-in */}
    <aside className={`chat-panel ${chatOpen ? "open" : ""}`} role="dialog" aria-label="Chat AI">
      <header className="panel-header">
        <strong>HR Assistant</strong>
        <button className="panel-close" onClick={() => setChatOpen(false)} aria-label="Chiudi">✕</button>
      </header>

      <div className="panel-content">
        <ChatHistory chatHistory={chatHistory} />
        <Loading isLoading={isLoading} />
      </div>

      <footer className="panel-footer">
        <input
          type="text"
          className="inputchatbar"
          placeholder="Chiedi pure..."
          value={userInput}
          onChange={HandleUserInput}
          onKeyDown={handleEnterPress}
        />
        <button
          className="sendbottom"
          type="button"
          onClick={sendMessage}
          disabled={isLoading}
        >
          Invia <FontAwesomeIcon icon={faPaperPlane} style={{color:"#f9f9f9ff",backgroundColor:"transparent"}}/>
        </button>
      </footer>
    </aside>
  </div>
  );
}


