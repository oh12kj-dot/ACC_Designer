import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImageAssetInput, PartSaveInput } from '../types/aggregate';
import { checkError, RepositoryError } from './designRepository';
import { SupabasePartRepository } from './partRepository';

export interface PreparedImages {
  original: Blob;
  high: Blob;
  medium: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  mmPerPx: number;
  transform: Record<string,unknown>;
}
export class AssetService {
  private readonly urls=new Map<string,{url:string;expiresAt:number}>();
  constructor(private readonly client:SupabaseClient) {}

  async signedUrl(path:string):Promise<string> {
    const cached=this.urls.get(path);
    if(cached && cached.expiresAt>Date.now()+60000)return cached.url;
    const {data,error}=await this.client.storage.from('part-images').createSignedUrl(path,3600);
    checkError(error);
    if(!data)throw new RepositoryError('INVALID_RESPONSE','画像URLを取得できません');
    this.urls.set(path,{url:data.signedUrl,expiresAt:Date.now()+3600000});
    return data.signedUrl;
  }

  async cleanup(id:string):Promise<void> {
    const {data:paths,error}=await this.client.rpc('claim_asset_cleanup',{asset_id:id});
    checkError(error);
    if(!Array.isArray(paths))throw new Error('Cleanup応答が不正です');
    if(paths.length===0)return; // A DB commit whose response was lost must never lose its images.
    const removed=await this.client.storage.from('part-images').remove(paths);checkError(removed.error);
    const finished=await this.client.rpc('finish_asset_cleanup',{asset_id:id});checkError(finished.error);
  }

  async retryPendingCleanup():Promise<void> {
    const {data,error}=await this.client.from('asset_uploads').select('id,state,created_at').in('state',['pending','cleaning']);checkError(error);
    // Avoid reclaiming another tab's active upload. User can also explicitly retry a failed batch.
    for(const row of data??[]) {
      if(row.state==='cleaning' || Date.parse(row.created_at)<Date.now()-24*3600000)await this.cleanup(row.id);
    }
  }

  async savePart(images:PreparedImages,input:PartSaveInput,partId:string|null=null,segmentImages?:PreparedImages) {
    if(segmentImages&&!input.pathSpec)throw new Error('短区間画像にはPath描画設定が必要です');
    const {data:reservation,error}=await this.client.rpc('reserve_asset_upload');checkError(error);
    if(!reservation || !Array.isArray(reservation.paths) || reservation.paths.length!==4)throw new Error('Upload予約が不正です');
    const [originalPath,normalizedHighPath,normalizedMediumPath,thumbnailPath]=reservation.paths as string[];
    const contentHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await images.high.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
    const asset:ImageAssetInput={id:reservation.id,assetKind:'part_main',contentHash,originalPath,normalizedHighPath,normalizedMediumPath,thumbnailPath,pixelWidth:images.width,pixelHeight:images.height,calibrationMmPerPx:images.mmPerPx,sourceTransform:images.transform};
    let segmentAsset:ImageAssetInput|undefined;
    let segmentReservationId:string|undefined;
    try {
      const blobs=[images.original,images.high,images.medium,images.thumbnail];
      for(let index=0;index<blobs.length;index++) {
        const result=await this.client.storage.from('part-images').upload(reservation.paths[index],blobs[index],{upsert:false,contentType:blobs[index].type});checkError(result.error);
      }
      if(segmentImages){
        const {data:segmentReservation,error}=await this.client.rpc('reserve_asset_upload');checkError(error);
        if(!segmentReservation||!Array.isArray(segmentReservation.paths)||segmentReservation.paths.length!==4)throw new Error('短区間画像のUpload予約が不正です');
        segmentReservationId=segmentReservation.id;
        const [originalPath,normalizedHighPath,normalizedMediumPath,thumbnailPath]=segmentReservation.paths as string[];
        const contentHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await segmentImages.high.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
        segmentAsset={id:segmentReservation.id,assetKind:'path_segment',contentHash,originalPath,normalizedHighPath,normalizedMediumPath,thumbnailPath,pixelWidth:segmentImages.width,pixelHeight:segmentImages.height,calibrationMmPerPx:segmentImages.mmPerPx,sourceTransform:segmentImages.transform};
        const segmentBlobs=[segmentImages.original,segmentImages.high,segmentImages.medium,segmentImages.thumbnail];
        for(let i=0;i<4;i++){const result=await this.client.storage.from('part-images').upload(segmentReservation.paths[i],segmentBlobs[i],{upsert:false,contentType:segmentBlobs[i].type});checkError(result.error);}
      }
      return await new SupabasePartRepository(this.client).save(partId,{...input,part:{...input.part,imageAssetId:asset.id},imageAsset:asset,segmentAsset,pathSpec:segmentAsset&&input.pathSpec?{...input.pathSpec,segmentAssetId:segmentAsset.id}:input.pathSpec});
    } catch(error) {
      try {if(segmentReservationId)await this.cleanup(segmentReservationId);}catch {}
      try {await this.cleanup(asset.id);}catch { /* Reservation remains durable in DB for cleanup retry. */ }
      throw error;
    }
  }
}
