
export function objToRadarData(scores = {}) {
  return Object.entries(scores).map(([skill, value]) => ({
    skill,
    value: Number(value)
  }));
}