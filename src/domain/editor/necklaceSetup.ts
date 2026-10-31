import type {Design} from '../../types/aggregate';
import {defaultLayoutGuide,resizeGuideLength} from './layoutGuide';
export interface NecklaceSetup{version:1;lengthBasis:'finished-target'|'layout';targetLengthMm:number}
export function validNecklaceSetup(value:unknown):value is NecklaceSetup{
 const v=value as NecklaceSetup|undefined;
 return !!v&&v.version===1&&['finished-target','layout'].includes(v.lengthBasis)&&Number.isSafeInteger(v.targetLengthMm)&&v.targetLengthMm>0&&v.targetLengthMm<=10000;
}
export function makeNecklaceSetup(cm:string,basis:NecklaceSetup['lengthBasis']):NecklaceSetup{
 const n=Number(cm),mm=Math.round(n*10),value={version:1 as const,lengthBasis:basis,targetLengthMm:mm};
 if(!cm.trim()||!Number.isFinite(n)||Math.abs(n*10-mm)>1e-6||!validNecklaceSetup(value))throw Error('長さは0より大きい1000cm以下の数を、0.1cm刻みで入力してください。');
 return value;
}
export function necklaceSetup(design:Pick<Design,'type'|'editorConfig'>){
 const value=design.editorConfig?.necklaceSetupV1;return design.type==='necklace'&&validNecklaceSetup(value)?value:undefined;
}
export function initialDesignGuide(design:Pick<Design,'type'|'editorConfig'>){
 const guide={...defaultLayoutGuide(),enabled:design.type==='necklace'},setup=necklaceSetup(design);
 return setup?resizeGuideLength(guide,setup.targetLengthMm):guide;
}
export function lengthCaption(setup:NecklaceSetup){return `${setup.lengthBasis==='finished-target'?'仕上がりの目標':'配置する長さ'} ${(setup.targetLengthMm/10).toLocaleString('ja-JP')} cm`;}
