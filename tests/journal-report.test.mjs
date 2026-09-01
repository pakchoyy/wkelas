import test from 'node:test'
import assert from 'node:assert/strict'
import {escapeReportText,compareJournalRows,journalReportBody,journalWordHtml} from '../src/shared/journal-report.ts'
const identity={sekolah:'Sekolah <A> & B',kelas:'1',semester:'1',tahun:'2026/2027',guru:'Guru'}
test('report escapes markup in identity and every journal field',()=>{
 const attack='<img src=x onerror="alert(1)">'
 const body=journalReportBody(identity,'September',[{tanggal:'2026-09-02',jam_ke:'1',mata_pelajaran:attack,materi:attack,kegiatan:attack,kendala:attack,refleksi:attack}])
 assert.ok(!body.includes('<img'));assert.ok(body.includes('&lt;img'));assert.ok(body.includes('Sekolah &lt;A&gt; &amp; B'))
 assert.equal(escapeReportText(`"'&<>`),'&quot;&#39;&amp;&lt;&gt;')
})
test('report keeps line breaks, zero and long text without truncation',()=>{
 const long='Kegiatan panjang '.repeat(500)
 const html=journalWordHtml(journalReportBody(identity,'September',[{tanggal:'2026-09-02',jam_ke:0,materi:'Baris 1\nBaris 2',kegiatan:long}]))
 assert.ok(html.includes('Baris 1<br>Baris 2'));assert.ok(html.includes('<td>0</td>'));assert.ok(html.includes(long));assert.ok(html.includes('<meta charset="utf-8">'))
})
test('rows sort by date then numeric lesson including ranges',()=>{
 const rows=['10','2','1–2'].map(jam_ke=>({tanggal:'2026-09-02',jam_ke}))
 assert.deepEqual([...rows].sort(compareJournalRows).map(r=>r.jam_ke),['1–2','2','10'])
 const body=journalReportBody(identity,'September',rows)
 assert.ok(body.indexOf('<td>2</td><td></td>')<body.indexOf('<td>10</td>'))
 assert.equal(rows[0].jam_ke,'10')
})
