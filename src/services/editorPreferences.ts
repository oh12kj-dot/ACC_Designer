import type {LayoutGuide} from '../domain/editor/layoutGuide';
import {guideLengthMm} from '../domain/editor/layoutGuide';

function read(key?:string):unknown{try{return key?JSON.parse(localStorage.getItem(key)??'null'):undefined;}catch{return;}}
function write(key:string|undefined,value:unknown){try{if(key)localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function readGuidePreference(key?:string):LayoutGuide|undefined{
 const record=read(key) as {version?:unknown;guide?:LayoutGuide}|undefined,g=record?.guide;
 if(record?.version!==1||!g||!['u','v'].includes(g.shape)||!['enabled','snap','rotate'].every(k=>typeof g[k as keyof LayoutGuide]==='boolean')||!Number.isFinite(g.offset)||!g.center||![g.center.x,g.center.y].every(Number.isFinite)||!guideLengthMm(g))return;
 return{enabled:g.enabled,snap:g.snap,rotate:g.rotate,offset:g.offset,shape:g.shape,width:g.width,drop:g.drop,center:{x:g.center.x,y:g.center.y}};
}
export function saveGuidePreference(key:string|undefined,guide:LayoutGuide){return !guideLengthMm(guide)||write(key,{version:1,guide});}
export interface ScreenPreference{version:1;measurement:string;invalidated:boolean;calibration?:{pxPerMm:number;signature:string}}
export function readScreenPreference(key?:string):ScreenPreference|undefined{
 const r=read(key) as ScreenPreference|undefined;
 if(r?.version!==1||typeof r.measurement!=='string'||r.measurement.length>64||!Number.isFinite(Number(r.measurement))||Number(r.measurement)<=0)return;
 const c=r.calibration,calibration=c&&typeof c.signature==='string'&&Number.isFinite(c.pxPerMm)&&c.pxPerMm>0&&Math.abs(c.pxPerMm-200/Number(r.measurement))<1e-8?c:undefined;
 return{version:1,measurement:r.measurement,invalidated:r.invalidated===true,calibration};
}
export function saveScreenPreference(key:string|undefined,value:ScreenPreference){return write(key,value);}
