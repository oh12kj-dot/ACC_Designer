import { createStore } from 'zustand/vanilla';
import type { History } from '../domain/editor/history';
type Update=History|undefined|((previous:History|undefined)=>History|undefined);
/** A store per mounted editor prevents history leaking between designs or accounts. */
export function createEditorStore(){return createStore<{history:History|undefined;setHistory:(update:Update)=>void}>(set=>({history:undefined,setHistory:update=>set(state=>({history:typeof update==='function'?update(state.history):update}))}));}
