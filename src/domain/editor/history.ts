import type { DesignAggregate } from '../../types/aggregate';
export interface History {past:DesignAggregate[];present:DesignAggregate;future:DesignAggregate[]}
export const createHistory=(present:DesignAggregate):History=>({past:[],present:structuredClone(present),future:[]});
export function commit(history:History,next:DesignAggregate):History{if(JSON.stringify(next)===JSON.stringify(history.present))return history;return{past:[...history.past,history.present].slice(-100),present:structuredClone(next),future:[]};}
export function undo(history:History):History{if(!history.past.length)return history;return{past:history.past.slice(0,-1),present:history.past.at(-1)!,future:[history.present,...history.future]};}
export function redo(history:History):History{if(!history.future.length)return history;return{past:[...history.past,history.present].slice(-100),present:history.future[0],future:history.future.slice(1)};}
