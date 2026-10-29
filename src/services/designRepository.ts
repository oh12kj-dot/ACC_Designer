import type { SupabaseClient } from '@supabase/supabase-js';
import type { Design, DesignAggregate } from '../types/aggregate';
import { fromRow, safeRevision, toRow, type Row } from './databaseMapping';

export class RepositoryError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'RepositoryError'; }
}
export function checkError(error: { code?: string; message: string } | null) {
  if (error) throw new RepositoryError(error.code ?? 'DATABASE_ERROR',error.message);
}

interface DbAggregate {
  design: Row;
  nodes: Row[];
  paths: Row[];
  point_attachments: Row[];
  through_attachments: Row[];
  path_attachments: Row[];
  mirror_links: Row[];
}

function decodeDesign(row: Row): Design {
  return { ...fromRow(row), revision: safeRevision(row.revision) } as unknown as Design;
}
function decodeAggregate(data: DbAggregate): DesignAggregate {
  return {
    design: decodeDesign(data.design),
    nodes: data.nodes.map(fromRow) as unknown as DesignAggregate['nodes'],
    paths: data.paths.map(p=>({ ...fromRow(p), start: { x: Number(p.start_x_mm), y: Number(p.start_y_mm) }, end: { x: Number(p.end_x_mm), y: Number(p.end_y_mm) } })) as unknown as DesignAggregate['paths'],
    pointAttachments: data.point_attachments.map(a=>({...fromRow(a),kind:'point'})) as unknown as DesignAggregate['pointAttachments'],
    throughAttachments: data.through_attachments.map(a=>({...fromRow(a),kind:'through'})) as unknown as DesignAggregate['throughAttachments'],
    pathAttachments: data.path_attachments.map(a=>({...fromRow(a),kind:'path'})) as unknown as DesignAggregate['pathAttachments'],
    mirrorLinks: data.mirror_links.map(fromRow) as unknown as DesignAggregate['mirrorLinks'],
  };
}

export class SupabaseDesignRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: { name: string; type: Design['type'] }): Promise<DesignAggregate> {
    const { data, error } = await this.client.rpc('create_design',{ input_name: input.name, input_type: input.type });
    checkError(error);
    if (!data) throw new RepositoryError('INVALID_RESPONSE','新規Designの応答がありません');
    return this.get(data.id);
  }

  async get(id: string): Promise<DesignAggregate> {
    const { data, error } = await this.client.rpc('get_design_aggregate',{ design_id: id });
    checkError(error);
    if (!data) throw new RepositoryError('NOT_FOUND','Designが見つかりません');
    return decodeAggregate(data as DbAggregate);
  }

  async list(): Promise<Design[]> {
    const { data, error } = await this.client.from('designs').select('*').order('updated_at',{ ascending:false });
    checkError(error);
    return (data ?? []).map(decodeDesign);
  }

  async remove(id:string,expectedRevision:number):Promise<void>{
    safeRevision(expectedRevision);
    const {data,error}=await this.client.rpc('delete_design',{design_id:id,expected_revision:expectedRevision});
    checkError(error);
    if(data!==true)throw new RepositoryError('INVALID_RESPONSE','削除を確認できませんでした');
  }

  async rename(id:string,name:string,expectedRevision:number):Promise<Design>{
    safeRevision(expectedRevision);const trimmed=name.trim();
    if(!trimmed||trimmed.length>200)throw new RepositoryError('INVALID_NAME','名前は1〜200文字で入力してください');
    const aggregate=await this.get(id);
    if(aggregate.design.revision!==expectedRevision)throw new RepositoryError('REVISION_CONFLICT','REVISION_CONFLICT');
    const result=await this.save({...aggregate,design:{...aggregate.design,name:trimmed}},expectedRevision);
    return {...aggregate.design,name:trimmed,revision:result.revision,updatedAt:result.savedAt};
  }

  async save(aggregate: DesignAggregate, expectedRevision: number, options?:{forceOverwrite:true}): Promise<{ revision: number; savedAt: string }> {
    safeRevision(expectedRevision);
    const { data, error } = await this.client.rpc('save_design_aggregate',{
      design_id: aggregate.design.id,
      expected_revision: expectedRevision,
      force_overwrite: options?.forceOverwrite===true,
      payload: {
        design: toRow(aggregate.design),
        nodes: aggregate.nodes.map(toRow),
        paths: aggregate.paths.map(p=>{ const { start,end,...rest }=p; return { ...toRow(rest),start_x_mm:start.x,start_y_mm:start.y,end_x_mm:end.x,end_y_mm:end.y }; }),
        point_attachments: aggregate.pointAttachments.map(toRow),
        through_attachments: aggregate.throughAttachments.map(toRow),
        path_attachments: aggregate.pathAttachments.map(toRow),
        mirror_links: aggregate.mirrorLinks.map(toRow),
      },
    });
    checkError(error);
    if (!data || typeof data.saved_at !== 'string') throw new RepositoryError('INVALID_RESPONSE','保存応答が不正です');
    return { revision:safeRevision(data.revision), savedAt:data.saved_at };
  }
}
