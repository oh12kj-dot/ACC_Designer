import type {Part} from '../../types/domain';
/** Display-only orientation evidence, never a functional ThroughHole. Fail closed on stale asset/source bindings. */
export function reviewedGuideAxis(part:Part):number|'none'|undefined{
 const r=part.metadata?.guideOrientation;
 if(!r||r.version!==1||r.imageAssetId!==part.imageAssetId||r.sourceDraftId!==part.metadata?.sourceDraftId||r.photoSha256!==part.metadata?.nominalPlacement?.photoSha256||!r.descriptionSha256||!r.evidenceText||!r.reviewedAt)return;
 if(r.status==='no-through-hole')return 'none';
 if(r.status==='reviewed-axis'&&Number.isFinite(r.axisDeg)&&r.axisDeg!>=0&&r.axisDeg!<180)return r.axisDeg;
}
export function guideAxisNotice(part:Part){
 const axis=reviewedGuideAxis(part);
 return axis==='none'?'公式情報：通し穴なし。紐に通す向きの自動調整は対象外です。':axis!==undefined?`穴の向き確認済み：写真の${axis===0?'横方向':axis===90?'上下方向':`${axis}°方向`}を紐に合わせます。`:(part.throughHoles?.length?'登録された穴の軸を紐に合わせます。':'穴の向きは未確認です。');
}
