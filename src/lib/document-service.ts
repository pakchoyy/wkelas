import type { SupabaseClient } from '@supabase/supabase-js'
import { documentExtension, validateDocumentDetails, type ChoyDocument, type DocumentDetails } from '../shared/pak-choy-documents'
import { validateFolderName, validateLinkUrl, type ChoyFolder } from '../shared/pak-choy-folders'

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
export async function uploadChoyDocument(client:SupabaseClient,details:DocumentDetails,file:File,folderId:string|null=null):Promise<ChoyDocument> {
  const fields=validateDocumentDetails(details)
  const extension=documentExtension(file)
  const id=crypto.randomUUID()
  const file_path=`${id}.${extension}`
  const storage=client.storage.from(DOCUMENT_BUCKET)
  const uploaded=await storage.upload(file_path,file,{upsert:false,cacheControl:'0'})
  if(uploaded.error) throw new Error('Berkas gagal diunggah. Periksa koneksi, izin admin, dan batas penyimpanan, lalu coba lagi.')
  const record={...fields,id,file_path,file_name:file.name,file_size:file.size,published:true,...(folderId?{folder_id:folderId}:{})}
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
export async function updateChoyDocument(client:SupabaseClient,doc:ChoyDocument,details:DocumentDetails,folderId:string|null=doc.folder_id) {
  const {data,error}=await client.from('pak_choy_documents').update({...validateDocumentDetails(details),...((folderId??null)!==(doc.folder_id??null)?{folder_id:folderId}:{})}).eq('id',doc.id).eq('updated_at',doc.updated_at).select().single()
  if(error) throw new Error('Perubahan belum tersimpan. Muat ulang jika dokumen telah diubah di tempat lain, lalu coba lagi.')
  return data as ChoyDocument
}
export async function publishChoyDocument(client:SupabaseClient,doc:ChoyDocument,published:boolean) {
  const {data,error}=await client.from('pak_choy_documents').update({published}).eq('id',doc.id).eq('updated_at',doc.updated_at).select().single()
  if(error) throw new Error('Status belum berubah. Muat ulang daftar dan coba lagi; pastikan berkas masih tersedia.')
  return data as ChoyDocument
}
export async function deleteChoyDocument(client:SupabaseClient,doc:ChoyDocument) {
  if(!doc.file_path) {
    const {error:linkError}=await client.from('pak_choy_documents').delete().eq('id',doc.id)
    if(linkError) throw new Error('Link belum terhapus. Muat ulang daftar dan coba lagi.')
    return
  }
  const draft=await publishChoyDocument(client,doc,false)
  const removed=await client.storage.from(DOCUMENT_BUCKET).remove([draft.file_path as string])
  if(removed.error) throw new Error('Dokumen sudah menjadi draf, tetapi berkas gagal dihapus. Muat ulang dan coba hapus lagi.')
  const {error}=await client.from('pak_choy_documents').delete().eq('id',doc.id)
  if(error) throw new Error('Berkas sudah dihapus, tetapi data draf belum terhapus. Muat ulang dan coba hapus lagi.')
}
export async function downloadChoyDocument(client:SupabaseClient,doc:ChoyDocument) {
  if(!doc.file_path) throw new Error('Item ini berupa link, bukan berkas.')
  const {data,error}=await client.storage.from(DOCUMENT_BUCKET).download(doc.file_path)
  if(error) throw new Error('Berkas gagal diunduh. Periksa koneksi atau muat ulang daftar dokumen.')
  const url=URL.createObjectURL(data)
  const anchor=document.createElement('a');anchor.href=url;anchor.download=(doc.file_name||'dokumen').replace(/[<>:"/\\|?*]/g,'_')
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}

// ---------- Folder & link ----------
export async function listChoyFolders(client:SupabaseClient):Promise<ChoyFolder[]> {
  const {data,error}=await client.from('pak_choy_folders').select('*').order('sort_order').order('name').limit(2000)
  if(error) throw new Error('Folder gagal dimuat. Pastikan SQL folder sudah dijalankan di Supabase, lalu muat ulang.')
  return data as ChoyFolder[]
}
const folderError=(error:{code?:string;message?:string}|null,fallback:string)=>{
  const msg=`${error?.code||''} ${error?.message||''}`
  if(/23505|duplicate|unique/i.test(msg)) return new Error('Sudah ada folder dengan nama itu di sini.')
  if(/23503|foreign key/i.test(msg)) return new Error('Folder masih berisi file, link, atau subfolder. Kosongkan dulu.')
  if(/terlalu dalam/i.test(msg)) return new Error('Folder terlalu dalam (maksimal 6 tingkat).')
  return new Error(fallback)
}
export async function createChoyFolder(client:SupabaseClient,parentId:string|null,name:string):Promise<ChoyFolder> {
  const {data,error}=await client.from('pak_choy_folders').insert({parent_id:parentId,name:validateFolderName(name)}).select().single()
  if(error) throw folderError(error,'Folder belum tersimpan. Periksa koneksi lalu coba lagi.')
  return data as ChoyFolder
}
export async function renameChoyFolder(client:SupabaseClient,id:string,name:string) {
  const {error}=await client.from('pak_choy_folders').update({name:validateFolderName(name)}).eq('id',id)
  if(error) throw folderError(error,'Nama folder belum berubah. Coba lagi.')
}
export async function deleteChoyFolder(client:SupabaseClient,id:string) {
  const {error}=await client.from('pak_choy_folders').delete().eq('id',id)
  if(error) throw folderError(error,'Folder belum terhapus. Coba lagi.')
}
export async function addChoyLink(client:SupabaseClient,input:{title:string;description:string;url:string;folderId:string|null}):Promise<ChoyDocument> {
  const title=input.title.trim()
  if(!title||title.length>160) throw new Error('Isi judul link, maksimal 160 karakter.')
  if(input.description.length>2000) throw new Error('Deskripsi maksimal 2.000 karakter.')
  const record={title,category:'Lainnya',description:input.description.trim(),target_grades:[] as number[],link_url:validateLinkUrl(input.url),...(input.folderId?{folder_id:input.folderId}:{}),published:true}
  const {data,error}=await client.from('pak_choy_documents').insert(record).select().single()
  if(error) throw new Error('Link belum tersimpan. Pastikan SQL folder sudah dijalankan, lalu coba lagi.')
  return data as ChoyDocument
}
export function openChoyLink(doc:Pick<ChoyDocument,'link_url'>) {
  if(!doc.link_url||!/^https:\/\//.test(doc.link_url)) throw new Error('Link tidak valid.')
  window.open(doc.link_url,'_blank','noopener,noreferrer')
}
export async function updateChoyLinkUrl(client:SupabaseClient,doc:ChoyDocument,url:string) {
  const {error}=await client.from('pak_choy_documents').update({link_url:validateLinkUrl(url)}).eq('id',doc.id)
  if(error) throw new Error('Alamat link belum berubah. Coba lagi.')
}
