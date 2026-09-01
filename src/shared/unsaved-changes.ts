type DraftState = {dirty:boolean;pending:boolean}
const sources = new Map<symbol,()=>DraftState>()
export function registerDraft(source:()=>DraftState) {
  const key=Symbol('draft');sources.set(key,source)
  return () => {sources.delete(key)}
}
export function draftState(): DraftState {
  const states=[...sources.values()].map(read=>read())
  return {dirty:states.some(s=>s.dirty),pending:states.some(s=>s.pending)}
}
export function mayLeave(confirm:(message:string)=>boolean,notify:(message:string)=>void) {
  const state=draftState()
  if(state.pending){notify('Data sedang disimpan. Tunggu sampai selesai sebelum berpindah.');return false}
  return !state.dirty || confirm('Ada isian yang belum tersimpan. Tinggalkan halaman dan buang isian tersebut?')
}
