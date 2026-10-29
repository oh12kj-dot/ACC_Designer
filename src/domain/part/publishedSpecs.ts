import type { PartCategory } from '../../types/domain';
import type { PublishedMeasure,PublishedPurchase } from '../../types/registeredPart';
const normalize=(s:string)=>s.normalize('NFKC').replace(/\s+/g,'').replace(/×|✕/g,'x');
export function publishedPurchase(sourceText:string):PublishedPurchase{
 const s=normalize(sourceText),approximate=/約|目安|前後/.test(s),result:PublishedPurchase={sourceText,unit:'unknown',approximate};
 const strip=s.replace(/(?:\([^)]*\)|【[^】]*】|_移動|\[.*?\])/g,'');
 const exact=strip.match(/^(\d+)(ヶ|個|粒|本|ペア|セット)$/);
 if(exact){const count=Number(exact[1]);if(count>0&&Number.isSafeInteger(count)){result.unit=exact[2]==='ペア'?'pair':exact[2]==='セット'?'set':exact[2]==='本'?'unknown':'piece';if(!approximate)result.quantity=count;}}
 const length=strip.match(/^(\d+(?:\.\d+)?)(mm|cm|m)$/);if(length&&Number(length[1])>0){result.unit='length';if(!approximate)result.lengthMm=Number(length[1])*({mm:1,cm:10,m:1000}[length[2]]!);}
 const weight=strip.match(/^(\d+(?:\.\d+)?)g$/);if(weight&&Number(weight[1])>0){result.unit='weight';result.weightG=Number(weight[1]);}
 const estimate=s.match(/約(\d+)(?:ヶ|個|粒|本)/);if(estimate)result.estimatedCount=Number(estimate[1]);return result;
}
export function publishedMeasurements(sourceText:string):PublishedMeasure[]{
 const s=normalize(sourceText),out:PublishedMeasure[]=[];
 const pattern=/(線径|ピン径|穴径|内径|外径|厚み|厚さ|長さ|幅|高さ)?(約)?(\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)*)(mm|cm)(?![A-Za-z])/g;
 const meanings:Record<string,PublishedMeasure['meaning']>={線径:'wire_diameter',ピン径:'pin_diameter',穴径:'hole_diameter',内径:'inner_diameter',外径:'outer_diameter',厚み:'thickness',厚さ:'thickness',長さ:'length',幅:'width',高さ:'height'};
 for(const m of s.matchAll(pattern)){const values=m[3].split('x').map(Number).map(n=>n*(m[4]==='cm'?10:1));if(values.some(n=>!Number.isFinite(n)||n<=0))continue;out.push({sourceText:m[0],valuesMm:values,approximate:!!m[2]||/約/.test(sourceText),meaning:values.length===1&&m[1]?meanings[m[1]]:'unassigned'});}return out;
}
export function publishedCategory(name:string):{category:PartCategory;basis:string}{
 const rules:[RegExp,PartCategory][]=[[/丸カン|Cカン/,'jump_ring'],[/9ピン/,'eye_pin'],[/Tピン/,'head_pin'],[/カニカン|ヒキワ/,'clasp'],[/ピアス.*(?:フック|U字)|U字ピアス/,'earring_hook'],[/ピアス.*(?:丸皿|ポスト|芯立)|チタンピアス/,'earring_post'],[/チェーン/,'chain'],[/ワイヤー/,'wire'],[/テグス/,'string'],[/コード|革ヒモ/,'cord'],[/パール/,'pearl'],[/ビーズ/,'bead'],[/チャーム/,'charm']];
 const rule=rules.find(([pattern])=>pattern.test(name));return{category:rule?.[1]??'other',basis:rule?'商品名による分類（形状の保証なし）':'分類未確定'};
}
