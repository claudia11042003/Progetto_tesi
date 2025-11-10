import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";
import { objToRadarData } from "../../utils/radarData";

import "./CandidateRadarPair.css"

export function CandidateRadarPair({ candidate , showTitle = true }) {
  const hardData = objToRadarData(candidate["hard skills"]);
  const softData = objToRadarData(candidate["soft skills"]);

  
  return (
  <section className="cand-flex">
    {/* Titolo */}
    {showTitle && <h3 className="cand-title">Candidato {candidate.candidato}</h3>}
{

    <div className="radars-row">
      {/* HARD */}
      <div className="radar-card">
        <h4 className="radar-sub">Hard skills</h4>
        <div className="chart-box">
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={hardData}
                outerRadius="85%"
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 10]} tickCount={8}  />
                <Tooltip />
                <Radar dataKey="value" fillOpacity={0.6} fill="rgba(83, 58, 153, 1)"  />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SOFT */}
      <div className="radar-card">
        <h4 className="radar-sub">Soft skills</h4>
        <div className="chart-box">
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={softData}
                outerRadius="85%"
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 10]} tickCount={8} />
                <Tooltip />
                <Radar dataKey="value" fillOpacity={0.6} fill="rgba(83, 58, 153, 1)"  />
                
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
       {/* RISULTATI SOTTO */}
    {candidate.commenti && (
      <div className="results-wide">
        <h4 className="radar-sub">Risultati & raccomandazioni</h4>
        <p className="results-text">{(candidate.commenti || "").replace(/\n+/g, " ").trim()}</p>
      </div>
    )}
    </div>}

   
  </section>
);

  
}