import type {RegisteredPartDraft} from '../types/registeredPart';
export function nominalRoundBead(draft:Pick<RegisteredPartDraft,'name'|'description'|'sizeText'>){
 const name=draft.name.normalize('NFKC');
 if(!/^(チェコ|天然石) ラウンド\s/.test(name)||!draft.description.includes('丸玉ビーズです。'))return undefined;
 const m=/^(約)?(\d+(?:\.\d+)?)mm$/.exec(draft.sizeText.normalize('NFKC').replace(/\s/g,''));
 const diameterMm=m?Number(m[2]):0;if(!Number.isFinite(diameterMm)||diameterMm<=0||diameterMm>40)return undefined;
 return{recipe:'kiwa-round-bead-nominal-v1',diameterMm,sizeLabel:draft.sizeText,approximate:!!m?.[1],shapeBasis:'official-product-description:丸玉ビーズです。'};
}
