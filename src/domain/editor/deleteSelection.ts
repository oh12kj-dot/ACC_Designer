import type {DesignAggregate} from '../../types/aggregate';
import {removeNode,removePath} from './throughCommands';
import {mirrorState} from './createMirror';

/** Normalize linked pairs to one existing primary side; syncMirror still owns their propagation. */
export function deleteSelection(a:DesignAggregate,nodeIds:string[],pathIds:string[]):DesignAggregate{
 const nodes=new Set(nodeIds),paths=new Set(pathIds),state=mirrorState(a);
 if(!nodes.size&&!paths.size)throw Error('削除する素材を選択してください');
 for(const [kind,ids] of [['node',nodes],['path',paths]] as const){
  const rows=kind==='node'?a.nodes:a.paths;
  for(const id of ids)if(!rows.some(r=>r.id===id))throw Error('選択した素材が見つかりません');
  const links=a.mirrorLinks.filter(l=>l.entityType===kind&&state.groups[l.mirrorGroupId]?.mode==='linked');
  const affected=new Set(ids);for(const l of links)if(ids.has(l.leftEntityId)||ids.has(l.rightEntityId)){affected.add(l.leftEntityId);affected.add(l.rightEntityId);}
  if(rows.some(r=>affected.has(r.id)&&r.locked))throw Error('固定中の素材が含まれています。固定を解除してからまとめて削除してください');
  for(const l of links)if(ids.has(l.leftEntityId)||ids.has(l.rightEntityId)){ids.delete(l.rightEntityId);ids.add(l.leftEntityId);}
 }
 let next=a;for(const id of nodes)next=removeNode(next,id);for(const id of paths)next=removePath(next,id);return next;
}
