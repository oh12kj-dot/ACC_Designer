import type { SupabaseClient } from '@supabase/supabase-js';
import type { Part } from '../types/domain';
import type { PartSaveInput } from '../types/aggregate';
import { fromRow, toRow, type Row } from './databaseMapping';
import { checkError, RepositoryError } from './designRepository';
import { localPartReader } from './localWorkspaceClient';

function decodePart(data:any):Part{
 return {...fromRow(data.part as Row),supplierListingReview:data.supplier_listing_review,selectionReference:data.selection_reference,holeReference:data.hole_reference,purchaseSpec:data.purchase_spec?fromRow(data.purchase_spec):undefined,pathRenderSpec:data.path_spec?fromRow(data.path_spec):undefined,connectionPoints:data.connection_points.map(fromRow),throughHoles:data.through_holes.map(fromRow)} as unknown as Part;
}

export class SupabasePartRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(id: string): Promise<Part> {
    const { data, error } = await this.client.rpc('get_part_aggregate',{part_id:id});
    checkError(error);
    if (!data) throw new RepositoryError('NOT_FOUND','Partが見つかりません');
    return decodePart(data);
  }

  async getMany(ids:string[],current:()=>boolean=()=>true):Promise<Part[]>{
    const unique=[...new Set(ids)],result:Part[]=[],read=localPartReader(this.client);
    for(let start=0;start<unique.length;start+=read?256:8){
      if(!current())return [];
      const batch=unique.slice(start,start+(read?256:8));
      if(read){const {data,error}=await read(batch);checkError(error);if(!Array.isArray(data)||data.length!==batch.length)throw new RepositoryError('INVALID_RESPONSE','Partの取得応答が不正です');result.push(...data.map(decodePart));}
      else result.push(...await Promise.all(batch.map(id=>this.get(id))));
    }
    return result;
  }

  async save(id: string | null, input: PartSaveInput): Promise<{ partId:string; createdSuccessor:boolean }> {
    const {supplierListingReview:_listingReview,...writablePart}=input.part as typeof input.part & {supplierListingReview?:unknown};
    const payload: Row = {part:toRow(writablePart)};
    if (input.segmentAsset !== undefined) payload.segment_asset=toRow(input.segmentAsset);
    if (input.imageAsset !== undefined) payload.image_asset=toRow(input.imageAsset);
    if (input.purchaseSpec !== undefined) payload.purchase_spec=input.purchaseSpec === null ? null : toRow(input.purchaseSpec);
    if (input.pathSpec !== undefined) payload.path_spec=input.pathSpec === null ? null : toRow(input.pathSpec);
    if (input.connectionPoints !== undefined) payload.connection_points=input.connectionPoints.map(toRow);
    if (input.throughHoles !== undefined) payload.through_holes=input.throughHoles.map(toRow);
    if (input.sourceSnapshots !== undefined) payload.source_snapshots=input.sourceSnapshots.map(toRow);
    const { data, error } = await this.client.rpc('save_part_successor',{part_id:id,payload});
    checkError(error);
    if (!data || typeof data.part_id !== 'string' || typeof data.created_successor !== 'boolean') throw new RepositoryError('INVALID_RESPONSE','Part保存応答が不正です');
    return {partId:data.part_id,createdSuccessor:data.created_successor};
  }

  async archive(id: string): Promise<void> {
    const {error}=await this.client.rpc('archive_part',{part_id:id}); checkError(error);
  }
  async removeIfUnreferenced(id: string): Promise<void> {
    const {error}=await this.client.rpc('remove_unreferenced_part',{part_id:id}); checkError(error);
  }
}
