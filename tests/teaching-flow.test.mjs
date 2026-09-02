import test from 'node:test'
import assert from 'node:assert/strict'
import { teachingSlots, planJournalDraft } from '../src/shared/teaching-flow.ts'

test('teaching rows follow school days, breaks and lesson limit without deleting schedules', () => {
  const slots = [{hari:1,jam_ke:1},{hari:1,jam_ke:2},{hari:6,jam_ke:1},{hari:7,jam_ke:1},{hari:1,jam_ke:11}]
  assert.deepEqual(teachingSlots(slots,5,{istirahat:[2]}),[slots[0]])
  assert.deepEqual(teachingSlots(slots,6,{jumlahJam:1}),[slots[0],slots[2]])
  assert.equal(slots.length,5)
})
test('journal draft carries plan date, content and selected subject, not stale schedule subject', () => {
  const plan = {tanggal:'2026-09-02',topik:'Pecahan',kegiatan:'Diskusi',mata_pelajaran_id:2}
  assert.deepEqual(planJournalDraft(3,plan,{jam_ke:4,mata_pelajaran_id:1},[{id:1,nama:'Bahasa Indonesia'},{id:2,nama:'Matematika'}]), {
    kelas_id:3,tanggal:'2026-09-02',jam_ke:'4',mata_pelajaran:'Matematika',materi:'Pecahan',kegiatan:'Diskusi',kendala:'',refleksi:''
  })
})
test('custom activities are named, missing subjects are not silently relabeled', () => {
  const plan={tanggal:'2026-09-02'}
  assert.equal(planJournalDraft(1,plan,{jam_ke:1,nama_mapel_custom:'Upacara'},[]).mata_pelajaran,'Upacara')
  assert.equal(planJournalDraft(1,plan,{jam_ke:1,mata_pelajaran_id:1},[]).mata_pelajaran,'Umum')
  assert.throws(()=>planJournalDraft(1,{...plan,mata_pelajaran_id:99},{jam_ke:1},[]),/tidak ditemukan/)
})
