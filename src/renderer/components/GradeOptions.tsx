import { GRADE_GROUPS } from '../../shared/mapelRecommendations'

// Isi <select> tingkat kelas 1–12, dikelompokkan SD / SMP / SMA.
export default function GradeOptions() {
  return <>{GRADE_GROUPS.map(g => <optgroup key={g.jenjang} label={g.label}>{g.grades.map(n => <option key={n} value={n}>Kelas {n}</option>)}</optgroup>)}</>
}
