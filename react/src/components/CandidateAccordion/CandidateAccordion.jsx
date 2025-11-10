import { useEffect, useRef, useState } from "react";
import { CandidateRadarPair } from "../CandidateRadarPair/CandidateRadarPair";
import "./candidateAccordion.css";

export function CandidateAccordion({ candidate, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelRef = useRef(null);
  const [maxH, setMaxH] = useState(0);

  // anima l'altezza in base al contenuto
  useEffect(() => {
    if (!panelRef.current) return;
    setMaxH(open ? panelRef.current.scrollHeight : 0);
  }, [open, candidate]);

  return (
    <section className="cand-acc">
      <button
        className="cand-acc__header"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span className="cand-acc__title">Candidato {candidate.candidato}</span>
        <svg className={`cand-acc__chev ${open ? "is-open" : ""}`} viewBox="0 0 20 20" width="18" height="18">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </button>

     
        <div className={`cand-acc__panel ${open ? "is-open" : ""}`}>
        <div className="cand-acc__inner">
        {/* nascondo il titolo interno: lo mostriamo nell'header */}
        <CandidateRadarPair candidate={candidate} showTitle={false} />
      </div>
      </div>
    </section>
  );
}