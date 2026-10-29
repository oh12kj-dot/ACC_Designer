import type {Part} from '../../types/domain';
import {pickerIdentity} from './picker';
export const facetLabels={material:{glass:'ガラス',crystal:'クリスタル',stone:'天然石',resin:'樹脂',metal:'金属',pearl:'パール',unknown:'記載から分類できない'},shape:{round:'丸',drop:'しずく',heart:'ハート',flower:'花・葉',star:'星・月',bicone:'ソロバン',unknown:'未分類'},use:{beads:'並べるビーズ',decorate:'飾り・トップ',connect:'部品をつなぐ',clasp:'留め具',ear:'耳飾り',base:'貼り付け用台座',unknown:'未分類'}};
export type FacetAxis=keyof typeof facetLabels;
/** Published-name discovery hints only. Never supplies material or hole compatibility. */
export function discovery(part:Part){const name=pickerIdentity(part).family.normalize('NFKC'),result:Record<FacetAxis,string[]>={material:[],shape:[],use:[]};
 const match=(axis:FacetAxis,patterns:Record<string,RegExp>)=>{for(const [key,re]of Object.entries(patterns))if(re.test(name))result[axis].push(key);};
 match('material',{glass:/ガラス|チェコ|シード|丸小|丸大|デリカ/,crystal:/クリスタル/,stone:/天然石|アメジスト|オニキス|クォーツ|アゲート|ジャスパー|ラピス|ターコイズ/,resin:/樹脂|アクリル/,metal:/メタル|銅玉|丸カン|丸かん|ステンレス|真鍮|合金/,pearl:/パール|真珠/});
 match('shape',{round:/ラウンド|丸玉|銅玉|パール|丸小|丸大/,drop:/しずく|ドロップ/,heart:/ハート/,flower:/フラワー|花|葉|リーフ/,star:/スター|ムーン|星|月/,bicone:/ソロバン|#5328/});
 match('use',{connect:/丸カン|丸かん|9ピン|Tピン|つなぎ|コネクター/,clasp:/クラスプ|留め具|カニカン|引き輪|引輪/,base:/台座|貼付|貼り付け|貼付け|セッティング/,ear:/ピアス|イヤリング/});
 if(['bead','gem','pearl'].includes(part.category))result.use.push('beads');if(['charm','pendant'].includes(part.category)||/チャーム|ペンダント/.test(name))result.use.push('decorate');
 for(const axis of Object.keys(result)as FacetAxis[])if(!result[axis].length)result[axis].push('unknown');return result;
}
export function matchesFacets(value:ReturnType<typeof discovery>,selection:Record<FacetAxis,string[]>){return(Object.keys(selection)as FacetAxis[]).every(axis=>!selection[axis].length||selection[axis].some(v=>value[axis].includes(v)));}
