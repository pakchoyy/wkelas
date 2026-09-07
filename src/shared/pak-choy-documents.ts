export const DOCUMENT_CATEGORIES = ['CP','ATP','Prota','Promes','RPM','Modul Ajar','LKPD','Lainnya'] as const
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024
export const DOCUMENT_EXTENSIONS = ['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','png','jpg','jpeg','webp']
export type ChoyDocument = {
  id:string; title:string; category:string; description:string; target_grades:number[];
  file_path:string; file_name:string; file_size:number; published:boolean; created_at:string; updated_at:string
}
export type DocumentDetails = Pick<ChoyDocument,'title'|'category'|'description'|'target_grades'>
export function validateDocumentDetails(details:DocumentDetails):DocumentDetails {
  if (!details.title.trim() || details.title.trim().length>160) throw new Error('Isi judul dokumen, maksimal 160 karakter.')
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(details.category)) throw new Error('Pilih kategori dokumen.')
  if (details.description.length>2000) throw new Error('Deskripsi maksimal 2.000 karakter.')
  if (!Array.isArray(details.target_grades) || details.target_grades.some(grade=>!Number.isInteger(grade)||grade<1||grade>6)) throw new Error('Pilih kelas 1 sampai 6.')
  return {...details,title:details.title.trim(),description:details.description.trim(),target_grades:[...new Set(details.target_grades)].sort()}
}
export function documentExtension(file:{name:string;size:number}) {
  const extension=file.name.split('.').pop()?.toLowerCase() || ''
  if (!DOCUMENT_EXTENSIONS.includes(extension)) throw new Error('Gunakan PDF, Word, Excel, PowerPoint, gambar, atau ZIP.')
  if (file.size<=0 || file.size>DOCUMENT_MAX_BYTES) throw new Error('Ukuran berkas harus lebih dari 0 dan maksimal 20 MB.')
  return extension
}
export function documentForGrade(doc:Pick<ChoyDocument,'published'|'target_grades'>,grade:number) {
  return doc.published && Number.isInteger(grade) && grade>=1 && grade<=6 && (!doc.target_grades.length || doc.target_grades.includes(grade))
}
export const documentAudience = (grades:number[])=>grades.length ? `Kelas ${grades.join(', ')}` : 'Semua kelas SD'
export const documentSize = (bytes:number)=>bytes<1024*1024 ? `${Math.max(1,Math.ceil(bytes/1024))} KB` : `${(bytes/(1024*1024)).toFixed(1)} MB`
