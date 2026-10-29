import type{Part}from'../../types/domain';
import{reviewedGuideAxis}from'./reviewedGuideAxis';
export interface MountingSettings{mode:'all'|'through'|'glue';diameter:string}
export const defaultMounting=():MountingSettings=>({mode:'all',diameter:''});
export function mountingAssessment(part:Part,settings:MountingSettings,clearance=.05):{blocked:boolean;warning:boolean;text:string}{
 if(part.geometryKind==='path')return{blocked:false,warning:false,text:''};
 if(settings.mode==='glue')return{blocked:false,warning:true,text:'台座への接着を想定。接着面・材質・接着剤の適合は未確認です。台座は別に選んで配置してください。'};
 if(settings.mode!=='through')return{blocked:false,warning:false,text:''};
 const r=part.holeReference,valid=r&&r.sourceDraftId===part.metadata?.sourceDraftId&&r.sourceUrl===part.sourceUrl&&!!r.descriptionSha256;
 if(reviewedGuideAxis(part)==='none'||valid&&r.presence!=='through')return{blocked:true,warning:false,text:'紐に直接通せません。穴なし・片穴のパーツは「台座へ貼り付ける」で選べます。'};
 let min:number|undefined,max:number|undefined,presence=!!part.throughHoles?.length;
 if(valid){min=r.minMm;max=r.maxMm;presence=true;}
 else if(part.throughHoles?.length){const ds=part.throughHoles.map(h=>h.diameterMm);if(ds.every(d=>typeof d==='number'&&Number.isFinite(d)&&d>0)){min=Math.min(...ds as number[]);max=Math.max(...ds as number[]);}}
 else if(typeof part.holeDiameterMm==='number'&&Number.isFinite(part.holeDiameterMm)&&part.holeDiameterMm>0)min=max=part.holeDiameterMm;
 const known=typeof min==='number'&&typeof max==='number'&&Number.isFinite(min)&&Number.isFinite(max)&&min>0&&max>=min;
 const label=known?`穴${valid&&r.approximate?' 約':''}${min===max?min:`${min}〜${max}`}mm`:'穴径不明';
 const diameter=settings.diameter.trim()?Number(settings.diameter):NaN;
 if(!Number.isFinite(diameter)||diameter<=0)return{blocked:false,warning:true,text:`通せるか未確認：紐の太さを入力してください（${label}）。`};
 if(!known||!Number.isFinite(clearance)||clearance<0)return{blocked:false,warning:true,text:'通せるか未確認：穴径などの情報が不足しています。注意して目安配置できます。'};
 const required=diameter+clearance;
 if(max!+1e-9<required)return{blocked:true,warning:false,text:`掲載寸法上は穴径不足です（${label}／紐${diameter}mm＋余裕${clearance}mm）。`};
 if(min!+1e-9<required||!presence)return{blocked:false,warning:true,text:`通せるか未確認：${label}。穴径の範囲・通し穴の状態を確認してください。`};
 return{blocked:false,warning:!!(valid&&r.approximate),text:`掲載寸法上の候補（${label}／余裕${clearance}mm）。実物の通過は未確認です。`};
}
