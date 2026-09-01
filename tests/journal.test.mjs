import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
// Install with: pnpm --dir <temp>/wkelas-grade-tests add fake-indexeddb --ignore-scripts
await import(pathToFileURL(join(process.env.GRADE_TEST_DEPS || join(tmpdir(),'wkelas-grade-tests'), 'node_modules/fake-indexeddb/auto/index.mjs')).href)
registerHooks({resolve(specifier,context,next) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier,context.parentURL)
    if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts')) return next(url.href+'.ts',context)
  }
  return next(specifier,context)
}})
const {BgyDatabase} = await import('../src/lib/db.ts')
const {saveJournalField} = await import('../src/lib/journal-storage.ts')
const slot={kelas_id:1,tanggal:'2026-09-02',jam_ke:'1',mata_pelajaran:'Matematika'}
async function fixture(t) {const db=new BgyDatabase(`journal-${crypto.randomUUID()}`);t.after(()=>db.delete());return db}
test('concurrent first edits create one journal and retain both fields',async t=>{
 const db=await fixture(t)
 await Promise.all([saveJournalField(db,slot,'materi','Pecahan'),saveJournalField(db,slot,'kegiatan','Diskusi')])
 const rows=await db.jurnal_harian.toArray()
 assert.equal(rows.length,1);assert.equal(rows[0].materi,'Pecahan');assert.equal(rows[0].kegiatan,'Diskusi')
})
test('updates patch only the selected field and allow clearing it',async t=>{
 const db=await fixture(t)
 const saved=await saveJournalField(db,slot,'materi','Pecahan')
 await saveJournalField(db,{...slot,id:saved.id},'refleksi','Perlu latihan')
 await saveJournalField(db,{...slot,id:saved.id},'materi','')
 const row=await db.jurnal_harian.get(saved.id)
 assert.equal(row.materi,'');assert.equal(row.refleksi,'Perlu latihan')
 await assert.rejects(saveJournalField(db,{...slot,id:saved.id,kelas_id:2},'materi','Salah kelas'))
})
test('ambiguous legacy slots are rejected without changing either journal',async t=>{
 const db=await fixture(t)
 await db.jurnal_harian.bulkAdd([{...slot,materi:'A'},{...slot,materi:'B'}])
 await assert.rejects(saveJournalField(db,slot,'materi','C'),/beberapa jurnal/)
 assert.deepEqual((await db.jurnal_harian.toArray()).map(r=>r.materi),['A','B'])
})
test('failed write rolls back and retry creates just one row',async t=>{
 const db=await fixture(t)
 const fail=()=>{throw new Error('Storage unavailable')}
 db.jurnal_harian.hook('creating',fail)
 await assert.rejects(saveJournalField(db,slot,'materi','Pecahan'),/Storage unavailable/)
 assert.equal(await db.jurnal_harian.count(),0)
 db.jurnal_harian.hook('creating').unsubscribe(fail)
 await saveJournalField(db,slot,'materi','Pecahan')
 assert.equal(await db.jurnal_harian.count(),1)
})

test('repeated or concurrent draft creation preserves the existing journal',async t=>{
 const {createJournalDraft}=await import('../src/lib/journal-storage.ts')
 const db=await fixture(t)
 const results=await Promise.allSettled([createJournalDraft(db,{...slot,materi:'A'}),createJournalDraft(db,{...slot,materi:'B'})])
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(await db.jurnal_harian.count(),1)
 const original=(await db.jurnal_harian.toArray())[0]
 await assert.rejects(createJournalDraft(db,{...slot,materi:'Replacement'}),/sudah ada/)
 assert.equal((await db.jurnal_harian.get(original.id)).materi,original.materi)
})
