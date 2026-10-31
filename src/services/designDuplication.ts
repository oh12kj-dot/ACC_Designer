import type{DesignAggregate}from'../types/aggregate';
import{duplicateSnapshot,snapshotFingerprint}from'../domain/editor/duplicateDesign';
import{DesignCreationPendingError,RepositoryError,SupabaseDesignRepository}from'./designRepository';
export class PendingDuplicationError extends RepositoryError{
 constructor(public readonly snapshot:DesignAggregate,cause:unknown){super('DUPLICATION_PENDING','複製先は作成済みですが、内容の保存を確認できませんでした。');this.cause=cause;}
}
export class DesignDuplicator{
 constructor(private readonly repository:SupabaseDesignRepository,private readonly current:()=>boolean=()=>true){}
 private assertCurrent(){if(!this.current())throw new RepositoryError('OWNER_CHANGED','保存先のユーザーが変わりました。');}
 async start(sourceId:string):Promise<DesignAggregate>{
  this.assertCurrent();const source=await this.repository.get(sourceId);this.assertCurrent();const name=source.design.name.slice(0,194)+' のコピー';
  let snapshot=duplicateSnapshot(source,{...source.design,id:crypto.randomUUID(),name,revision:0});
  try{this.assertCurrent();const empty=await this.repository.create({name,type:source.design.type});snapshot={...snapshot,design:{...empty.design,canvasConfig:snapshot.design.canvasConfig,editorConfig:snapshot.design.editorConfig}};}
  catch(error){if(error instanceof DesignCreationPendingError)throw new PendingDuplicationError({...snapshot,design:{...snapshot.design,id:error.pending.id}},error);throw error;}
  return this.resume(snapshot);
 }
 async resume(snapshot:DesignAggregate):Promise<DesignAggregate>{
  try{
   this.assertCurrent();const current=await this.repository.get(snapshot.design.id);this.assertCurrent();
   if(snapshotFingerprint(current)===snapshotFingerprint(snapshot))return current;
   if(current.design.name!==snapshot.design.name||current.design.type!==snapshot.design.type||current.design.revision!==0||[current.nodes,current.paths,current.pointAttachments,current.throughAttachments,current.pathAttachments,current.mirrorLinks].some(rows=>rows.length)||Object.keys(current.design.editorConfig??{}).length)throw new RepositoryError('REVISION_CONFLICT','複製先が更新されています。内容を確認してください。');
   const next={...structuredClone(snapshot),design:{...current.design,canvasConfig:snapshot.design.canvasConfig,editorConfig:snapshot.design.editorConfig}};
   const saved=await this.repository.save(next,0);return{...next,design:{...next.design,revision:saved.revision,updatedAt:saved.savedAt}};
  }catch(error){throw new PendingDuplicationError(snapshot,error);}
 }
}
