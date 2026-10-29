import { it,expect } from 'vitest';
import { createHistory,commit,undo,redo } from './history';
import type { DesignAggregate } from '../../types/aggregate';
const aggregate={design:{id:'d',name:'first',revision:0},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
it('round trips a full 100-command history without losing the aggregate',()=>{
 let h=createHistory(aggregate);for(let i=0;i<100;i++)h=commit(h,{...h.present,design:{...h.present.design,name:String(i)}});
 const final=structuredClone(h.present);for(let i=0;i<100;i++)h=undo(h);expect(h.present).toEqual(aggregate);for(let i=0;i<100;i++)h=redo(h);expect(h.present).toEqual(final);expect(h.future).toEqual([]);
});
it('commits one snapshot, restores all structures, discards redo on a new branch and caps history',()=>{let h=createHistory(aggregate);const next=structuredClone(aggregate);next.design.name='second';h=commit(h,next);next.design.name='mutated';expect(h.present.design.name).toBe('second');h=undo(h);expect(h.present.design.name).toBe('first');h=redo(h);expect(h.present.design.name).toBe('second');h=undo(h);h=commit(h,{...h.present,design:{...h.present.design,name:'branch'}});expect(h.future).toHaveLength(0);for(let i=0;i<110;i++)h=commit(h,{...h.present,design:{...h.present.design,name:String(i)}});expect(h.past).toHaveLength(100);});
