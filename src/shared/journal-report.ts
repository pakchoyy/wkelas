export function escapeReportText(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
}
export function compareJournalRows(a: any, b: any) {
  return String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.jam_ke || '').localeCompare(String(b.jam_ke || ''),'id',{numeric:true})
}
export function journalReportBody(identity: {sekolah:string;kelas:string;semester:string;tahun:string;guru:string}, month: string, rows: any[]) {
  const text = (value: unknown) => escapeReportText(value).replace(/\r?\n/g,'<br>')
  const headers = ['No.','Tanggal','Jam','Mata Pelajaran','Materi','Kegiatan Pembelajaran','Kendala','Refleksi']
  return `<h1>JURNAL HARIAN MENGAJAR GURU</h1><p><b>Sekolah:</b> ${text(identity.sekolah)}<br><b>Kelas:</b> ${text(identity.kelas)} · Semester ${text(identity.semester)} · ${text(identity.tahun)}<br><b>Guru:</b> ${text(identity.guru)}<br><b>Bulan:</b> ${text(month)}</p><table border="1" cellspacing="0" cellpadding="5"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${[...rows].sort(compareJournalRows).map((row,index)=>`<tr>${[index+1,row.tanggal,row.jam_ke,row.mata_pelajaran,row.materi,row.kegiatan,row.kendala,row.refleksi].map(value=>`<td>${text(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}
export function journalWordHtml(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Jurnal Harian</title><style>body{font-family:Arial,sans-serif;font-size:10pt}h1{font-size:16pt}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{vertical-align:top;overflow-wrap:anywhere}thead{display:table-header-group}</style></head><body>${body}</body></html>`
}
