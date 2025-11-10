import React from "react";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import{faCopy} from '@fortawesome/free-solid-svg-icons'
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import './ChatHistory.css'

export function ChatHistory({chatHistory}){
  
    const bottomRef = useRef(null);
    const lastUserMessageRef = useRef(null); 
 
     // Autoscroll in fondo ogni volta che arrivano nuovi messaggi
      useEffect(() => {if (lastUserMessageRef.current) {
 const container = bottomRef.current;                 // Div .chat-history (popup scrollabile)
      const lastUserMsg = lastUserMessageRef.current;
      //lastUserMessageRef.current.scrollIntoView({ behavior: "smooth",block:"center" });}
    container.scrollTop = lastUserMsg.offsetTop - container.offsetTop - 10; // -10 è un piccolo margine opzionale
    }
  }, [chatHistory]);

  


    return(
        <div className="chat-history" ref={bottomRef}>
        {chatHistory.map((turn,i)=>{
             const isUser = turn.type === "user";
               const isLastUser = isUser && i === chatHistory.length - 1;
        return (
          <div key={i} className={`msg ${isUser ? "user" : "bot"}`}ref={isUser?lastUserMessageRef:null }  >
            {!isUser && <div className="avatarhr">HR</div>}
            <div className="bubble">
             
              <span>
                <div className="bubble-text"><ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.message}</ReactMarkdown>
                    </div>
                </span>

              
              <button
                className="copy"
                title="Copia"
                onClick={() => navigator.clipboard.writeText(turn.message)}
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
            </div>
            {isUser && <div className="avataruser">🧑Io</div> }
           </div>
            
        );
    })}
     <div ref={bottomRef} />
    
    </div>)}


      