import type { CompatibilityStatus,ConnectionPoint,Part } from '../../types/domain';
export interface CompatibilityResult {status:CompatibilityStatus;reasons:string[]}
const result=(status:CompatibilityStatus,reason:string):CompatibilityResult=>({status,reasons:[reason]});
export function throughCompatibility(holeDiameterMm:number|undefined,materialDiameterMm:number|undefined,clearanceMm=.05):CompatibilityResult{
 if(!Number.isFinite(clearanceMm)||clearanceMm<0)throw new Error('クリアランスが不正です');
 if(holeDiameterMm===undefined||materialDiameterMm===undefined)return result('unknown','穴径または素材径が不明です');
 if(![holeDiameterMm,materialDiameterMm].every(n=>Number.isFinite(n)&&n>=0))throw new Error('径が不正です');
 return holeDiameterMm>=materialDiameterMm+clearanceMm?result('compatible','穴径と素材径が適合します'):result('incompatible','穴径が素材径とクリアランスの合計より小さいです');
}
export const pointTypeMatrix:Readonly<Record<string,boolean>>={'loop:ring':true,'ring:ring':true,'hook:loop':true,'hole:pin_end':false,'chain_end:clasp':true};
export function pointCompatibility(a:ConnectionPoint,b:ConnectionPoint,clearanceMm=.05):CompatibilityResult{
 const type=pointTypeMatrix[[a.type,b.type].sort().join(':')];
 if(type===false)return result('incompatible','この接続種別はPoint接続できません');
 if(type===undefined)return result('unknown','接続種別の組合せが未登録です');
 const first=throughCompatibility(a.localInnerDiameterMm,b.localThicknessMm,clearanceMm),second=throughCompatibility(b.localInnerDiameterMm,a.localThicknessMm,clearanceMm);
 if(first.status==='incompatible'||second.status==='incompatible')return result('incompatible','接続部の内径と厚みが適合しません');
 if(first.status==='unknown'||second.status==='unknown')return result('unknown','接続部の内径または厚みが不明です');
 return result('compatible','接続種別と寸法が適合します');
}
/** Chain thickness is a necessary lower bound, not a substitute for the link envelope. */
export function pathPositionCompatibility(part:Part,point:ConnectionPoint,material:Part,clearanceMm=.05):CompatibilityResult{
 if(material.category!=='chain'||part.category!=='jump_ring'&&point.type!=='ring')return result('unknown','任意位置接続の種別・寸法情報が不足しています');
 const inner=point.localInnerDiameterMm??part.innerDiameterMm,thickness=material.thicknessMm??material.wireDiameterMm,opening=part.openingWidthMm;
 if(thickness!==undefined){
  if(inner!==undefined&&inner<thickness+clearanceMm)return result('incompatible','丸カン内径がチェーン厚みとクリアランスより小さいです');
  if(opening!==undefined&&opening<thickness+clearanceMm)return result('incompatible','丸カン開口幅がチェーン厚みとクリアランスより小さいです');
 }
 return result('unknown','チェーンリンクの外形・開口を含む全寸法の適合は未確認です');
}
