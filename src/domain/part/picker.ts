import {pickerColorFamilies} from './colorFamilies';
import type {Part} from '../../types/domain';

const natural=new Intl.Collator('ja',{numeric:true,sensitivity:'base'});
const normalized=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ');
const positive=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:undefined;

// These are search groups, not equivalence rules for Part identity or purchasing.
const finishSuffixes=new Set(['G','S','RC','MG','SV','RG','AG','AR','AS','F','unf','B','F・unf','unf・F','ゴールド','シルバー','銀古美','金古美']);
const metalLabels:Record<string,string>={G:'ゴールド',S:'シルバー',SV:'シルバー',RC:'ロジウムカラー',MG:'マットゴールド',AG:'金古美（アンティークゴールド）',AR:'銀古美（アンティークシルバー）',金古美:'金古美（アンティークゴールド）',銀古美:'銀古美（アンティークシルバー）'};
export function pickerColorGroup(raw:string){
 const value=normalized(raw).replace(/【アウトレット】/g,'').trim();
 const base=value.split('/').map(s=>s.trim()).filter((s,i)=>i===0||!finishSuffixes.has(s)).join('/').replace(/^Lt\.\s*/,'ライト');
 return metalLabels[base]??base;
}

/** Read-only presentation of the published Kiwa title; never changes stored Part data. */
export function pickerIdentity(part:Part){
 const name=part.selectionReference?.displayName??part.name;
 const title=name.split(' / ')[0];
 // Kiwa imports keep the product name and published colour separated by a full-width space.
 // Restrict this convention to the known source; arbitrary manual names remain intact.
 const kiwa=!!part.sourceUrl&&/^https:\/\/kiwaseisakujo\.jp\/products\//.test(part.sourceUrl);
 const split=kiwa?title.indexOf('　'):-1;
 const family=split>0?title.slice(0,split):title;
 const color=part.color?.trim()||(split>0?title.slice(split+1).trim():'');
 const dimensions=[positive(part.widthMm),positive(part.heightMm)].filter((v):v is number=>v!==undefined).sort((a,b)=>b-a);
 const groupedColor=pickerColorGroup(color);
 return {part,name,family:normalized(family),color:groupedColor,colorFamilies:pickerColorFamilies(groupedColor),publishedColor:normalized(color),dimensions};
}
export type PickerEntry=ReturnType<typeof pickerIdentity>;
export function comparePickerEntries(a:PickerEntry,b:PickerEntry){
 const family=natural.compare(a.family,b.family);if(family)return family;
 // Longest body axis, then shorter axis. Packaging counts and hole diameters are never sizes.
 for(let i=0;i<2;i++){
  const left=a.dimensions[i]??Infinity,right=b.dimensions[i]??Infinity;
  if(left!==right)return left<right?-1:1;
 }
 return natural.compare(a.color,b.color)||natural.compare(a.name,b.name)||a.part.id.localeCompare(b.part.id);
}
export const comparePickerLabels=(a:string,b:string)=>natural.compare(a,b);
