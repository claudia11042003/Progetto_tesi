// components/AiResultsPanel.jsx
import { CandidateAccordion } from "../CandidateAccordion/CandidateAccordion";

export function AiResultsPanel({ payload =[]}) {
 
  return (
    <div className="space-y-10">
      {payload.map((c, idx) => (
        <CandidateAccordion key={idx} candidate={c} />
      ))}
    </div>
  );
}


