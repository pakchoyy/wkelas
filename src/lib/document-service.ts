import type { SupabaseClient } from '@supabase/supabase-js'
import { documentExtension, validateDocumentDetails, type ChoyDocument, type DocumentDetails } from '../shared/pak-choy-documents'

export const DOCUMENT_BUCKET = 'pak-choy-documents'
export async function listChoyDocuments(client:SupabaseClient,grade?:number):Promise<ChoyDocument[]> {
  const result:ChoyDocument[]=[]
  // Paging also handles catalogs beyond Supabase's default 1,000-row limit.
  for(let offset=0;;offset+=100) {
    let query=client.from('pak_choy_documents').select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+99)
    if(grade!==undefined) {
      if(!Number.isInteger(grade)||grade<1||grade>6) return []
      query=query.eq('published',true).or(`target_grades.eq.{},target_grades.cs.{${grade}}`)
    }
    const {data,error}=await query
    if(error) throw new Error('Dokumen gagal dimuat. Periksa koneksi dan konfigurasi Supabase, lalu coba lagi.')
    result.push(...data as ChoyDocument[])
    if(data.length<100) return result
  }
}
export async function uploadChoyDocument(client:SupabaseClient,details:DocumentDetails,file:File):Promise<ChoyDocument> {
  const fields=validateDocumentDetails(details)
  const extension=documentExtension(file)
  const id=crypto.randomUUID()
  const file_path=`${id}.${extension}`
  const storage=client.storage.from(DOCUMENT_BUCKET)
  const uploaded=await storage.upload(file_path,file,{upsert:false,cacheControl:'0'})
  if(uploaded.error) throw new Error('Berkas gagal diunggah. Periksa koneksi, izin admin, dan batas penyimpanan, lalu coba lagi.')
  const record={...fields,id,file_path,file_name:file.name,file_size:file.size,published:false}
  const {data,error}=await client.from('pak_choy_documents').insert(record).select().single()
  if(!error) return data as ChoyDocument
  // A lost response can follow a committed insert. Never remove its file blindly.
  const checked=await client.from('pak_choy_documents').select('*').eq('id',id).maybeSingle()
  if(!checked.error && checked.data) return checked.data as ChoyDocument
  if(!checked.error) {
    const cleanup=await storage.remove([file_path])
    if(!cleanup.error) throw new Error('Draf gagal disimpan. Berkas unggahan dibersihkan; silakan coba lagi.')
  }
  throw new Error(`Status unggahan belum dapat dipastikan. Muat ulang daftar sebelum mencoba lagi. Jika tidak ada draf, periksa berkas ${file_path} di Storage.`)
}
export async function updateChoyDocument(client:SupabaseClient,doc:ChoyDocument,details:DocumentDetails) {
  const {data,error}=await client.from('pak_choy_documents').update(validateDocumentDetails(details)).eq('id',doc.id).eq('updated_at',doc.updated_at).select().single()
  if(error) throw new Error('Perubahan belum tersimpan. Muat ulang jika dokumen telah diubah di tempat lain, lalu coba lagi.')
  return data as ChoyDocument
}
export async function publishChoyDocument(client:SupabaseClient,doc:ChoyDocument,published:boolean) {
  const {data,error}=await client.from('pak_choy_documents').update({published}).eq('id',doc.id).eq('updated_at',doc.updated_at).select().single()
  if(error) throw new Error('Status belum berubah. Muat ulang daftar dan coba lagi; pastikan berkas masih tersedia.')
  return data as ChoyDocument
}
export async function deleteChoyDocument(client:SupabaseClient,doc:ChoyDocument) {
  const draft=await publishChoyDocument(client,doc,false)
  const removed=await client.storage.from(DOCUMENT_BUCKET).remove([draft.file_path])
  if(removed.error) throw new Error('Dokumen sudah menjadi draf, tetapi berkas gagal dihapus. Muat ulang dan coba hapus lagi.')
  const {error}=await client.from('pak_choy_documents').delete().eq('id',doc.id)
  if(error) throw new Error('Berkas sudah dihapus, tetapi data draf belum terhapus. Muat ulang dan coba hapus lagi.')
}
export async function downloadChoyDocument(client:SupabaseClient,doc:ChoyDocument) {
  const {data,error}=await client.storage.from(DOCUMENT_BUCKET).download(doc.file_path)
  if(error) throw new Error('Berkas gagal diunduh. Periksa koneksi atau muat ulang daftar dokumen.')
  const url=URL.createObjectURL(data)
  const anchor=document.createElement('a');anchor.href=url;anchor.download=doc.file_name.replace(/[<>:"/\\|?*]/g,'_')
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
