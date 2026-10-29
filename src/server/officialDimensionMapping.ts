import {load} from 'cheerio';
import type {PublishedMeasure} from '../types/registeredPart';
const axes:Record<string,PublishedMeasure['meaning']>={'線径':'wire_diameter','ピン径':'pin_diameter','穴径':'hole_diameter','内径':'inner_diameter','外径':'outer_diameter','厚み':'thickness','厚さ':'thickness','長さ':'length','幅':'width','高さ':'height','縦':'height','横':'width'};
export interface DimensionMapping {status:'explicit-axis-order'|'unresolved';measurements:PublishedMeasure[];evidenceText?:string;reason?:string}
/** Only an explicit statement about the size notation applies to every variant.
 * Other dimensions in prose may refer to compatible accessories, not this part. */
export function mapOfficialSize(sizeText:string,bodyHtml:string):DimensionMapping{
 const plain=load(bodyHtml).text().normalize('NFKC').replace(/\s+/g,'');
 const size=sizeText.normalize('NFKC').replace(/\s+/g,'').replace(/[×✕]/g,'x');
 const order=[...plain.matchAll(/サイズ(?:表記|表示)?(?:は|:|：)(線径|ピン径|穴径|内径|外径|厚み|厚さ|長さ|幅|高さ|縦|横)[×x✕](線径|ピン径|穴径|内径|外径|厚み|厚さ|長さ|幅|高さ|縦|横)(?:[×x✕](線径|ピン径|穴径|内径|外径|厚み|厚さ|長さ|幅|高さ|縦|横))?(?:です|になります|となります|の順|。)/g)];
 if(!order.length)return{status:'unresolved',measurements:[],reason:'NO_EXPLICIT_SIZE_AXIS_ORDER'};
 const signatures=new Set(order.map(m=>m.slice(1,4).filter(Boolean).join(',')));
 if(signatures.size!==1)return{status:'unresolved',measurements:[],reason:'CONFLICTING_SIZE_AXIS_ORDERS'};
 const notation=size.match(/^(約)?(\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?){1,2})(mm|cm)(?:\((?:洋白|鉄)\))?$/);
 if(!notation)return{status:'unresolved',measurements:[],reason:'SIZE_NOTATION_NOT_EXACT'};
 const names=order[0].slice(1,4).filter(Boolean),values=notation[2].split('x').map(Number).map(n=>n*(notation[3]==='cm'?10:1));
 if(names.length!==values.length||values.some(v=>v<=0||!Number.isFinite(v)))return{status:'unresolved',measurements:[],reason:'AXIS_COUNT_MISMATCH'};
 return{status:'explicit-axis-order',evidenceText:order[0][0],measurements:names.map((name,i)=>({sourceText:sizeText,meaning:axes[name],valuesMm:[values[i]],approximate:!!notation[1]}))};
}
