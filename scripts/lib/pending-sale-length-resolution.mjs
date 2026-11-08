import assert from 'node:assert/strict';
import {sha256,stable,compareAmount,parseSaleAmount} from '../minimum-sale-units.mjs';

export function exactSaleLength(raw) {
  const text=raw.normalize('NFKC').trim().replace(/【取寄商品】$/,'');
  const number='([0-9]+(?:\\.[0-9]+)?)';
  let m=new RegExp(`^${number}(cm|m)(?:\\(リール巻\\))?$`).exec(text),wrapped=false;
  if(!m){m=new RegExp(`^1(?:ヶ|本)\\(${number}(cm|m)\\)$`).exec(text);wrapped=true;}
  if(!m)return null;
  const decimals=m[1].split('.')[1]?.length??0;
  const numerator=BigInt(m[1].replace('.',''))*(m[2]==='m'?1000n:10n),denominator=10n**BigInt(decimals);
  if(numerator<=0n)return null;
  return {ok:true,unit:'length-mm',numerator:String(numerator),denominator:String(denominator),raw,refinementRule:'finite-exact-pending-length-v1',wrappedSinglePackage:wrapped,guaranteedCount:false};
}

export function resolvePendingLengthGroups(policy,registry,catalog,pending,liveSourceIds=new Set()) {
  return resolvePendingGroups(policy,registry,catalog,pending,liveSourceIds,'length');
}

export function exactFunctionalSet(raw){
  const m=/^([1-9][0-9]*)セット(?:\((?:中袋|大袋)\))?(?:【取寄商品】)?$/.exec(raw.normalize('NFKC').trim());
  return m?{ok:true,unit:'functional-clasp-set',numerator:m[1],denominator:'1',raw,refinementRule:'finite-pending-functional-clasp-set-v1',guaranteedCount:false}:null;
}

export function resolvePendingFunctionalSets(policy,registry,catalog,pending,liveSourceIds=new Set()){
  return resolvePendingGroups(policy,registry,catalog,pending,liveSourceIds,'functional-set');
}

export function nominalChainSaleClass(raw){
  const t=raw.normalize('NFKC').trim();
  if(t==='1m')return{ok:true,unit:'published-nominal-length-pack-class',numerator:'10',denominator:'1',raw,refinementRule:'finite-nominal-10cm-before-1m-v1',approximate:false,nominalLengthMm:1000,guaranteedPhysicalLengthComparison:false};
  const m=/^約10cm(?:\((約?[1-9][0-9]*(?:コマ|パターン))\))?$/.exec(t);
  return m?{ok:true,unit:'published-nominal-length-pack-class',numerator:'1',denominator:'1',raw,refinementRule:'finite-nominal-10cm-before-1m-v1',approximate:true,nominalLengthMm:100,auxiliaryPublishedAnnotation:m[1]??null,guaranteedPhysicalLengthComparison:false}:null;
}

export function resolvePendingNominalChains(policy,registry,catalog,pending,liveSourceIds=new Set()){
  return resolvePendingGroups(policy,registry,catalog,pending,liveSourceIds,'nominal-chain');
}

const contentWeightProducts=new Set(['8715134271780','8715134140708','8715171299620','8715172413732','8715172544804']);
export function finiteMiscSaleAmount(raw,product){
 const s=raw.normalize('NFKC').trim();let result;
 if(product.id==='8714833920292'&&product.description.includes('ゴムのようにのびるテグスです。'))result=exactSaleLength(raw);
 else if(product.id==='8710175752484'&&product.tags.includes('チェコシードファルファーレ')){
  const m=/^([1-9][0-9]*(?:\.[0-9]+)?)g\/約([1-9][0-9]*)ヶ\(大袋\)$/.exec(s);
  const p=parseSaleAmount(m?`${m[1]}g(約${m[2]}ヶ)(大袋)`:raw);if(p.ok&&p.unit==='weight')result={...p,raw,auxiliaryEstimatedCount:m?.[2]??p.auxiliaryEstimatedCount};
 }else if(contentWeightProducts.has(product.id)&&/樹脂液|コーティング剤|コート剤/.test(product.description)){
  const m=/^1ヶ\(([1-9][0-9]*(?:\.[0-9]+)?)g\)$/.exec(s);if(m)result={...parseSaleAmount(m[1]+'g'),raw,comparisonBasis:'declared-single-container-content-weight-not-container-count'};
 }else if(product.id==='8713066447140'&&product.name.startsWith('ワイヤーブレス細 1連')&&product.description.includes('先端にキャッチを接着剤で接着')){
  const m=/^([1-9][0-9]*)(?:ヶ|本)(?:\(中袋\))?$/.exec(s);if(m)result={ok:true,unit:'finished-single-wire-bracelet',numerator:m[1],denominator:'1',raw,comparisonBasis:'counters-refer-to-same-complete-bracelet-not-wire-length'};
 }else if(product.id==='8712218771748'&&product.description.includes('10mm、12mm用は入り数が4ヶから2ヶに変更になりました。')){
  const m=/^(2ヶ|4ヶ\(old\))$/.exec(s);if(m)result={...parseSaleAmount(s.replace('(old)','')),raw,comparisonBasis:'explicit-description-proves-pack-count-revision-not-body-size',bodyQuote:'10mm、12mm用は入り数が4ヶから2ヶに変更になりました。'};
 }else if(product.name.startsWith('貴和クリスタル')&&product.variants.some(v=>v.options.some(o=>/\(大袋\)_移動(?:【取寄商品】)?$/.test(o.normalize('NFKC'))))){
  const p=parseSaleAmount(raw,{relocated:true});if(p.ok)result={...p,raw,comparisonBasis:'existing-stage2-relocation-marker-within-same-product'};
 }else if(product.name.includes('チェーン')&&product.description.includes('こちらの商品は量り売りです。')){
  const m=/^10cm\(([1-9][0-9]*(?:コマ|パターン))\)$/.exec(s);const p=exactSaleLength(m?'10cm':raw);if(p)result={...p,raw,...(m?{auxiliaryPublishedAnnotation:m[1]}:{})};
 }
 return result?.ok?{...result,refinementRule:'finite-pending-misc-sale-v1'}:null;
}
export function resolvePendingMiscSales(policy,registry,catalog,pending,liveSourceIds=new Set()){
 return resolvePendingGroups(policy,registry,catalog,pending,liveSourceIds,'misc');
}

function resolvePendingGroups(policy,registry,catalog,pending,liveSourceIds,kind){
  const drafts=new Map(registry.parts.map(d=>[d.id,d])),products=new Map(catalog.products.map(p=>[p.id,p]));
  const pendingById=new Map(pending.map(r=>[r.draftId,r]));
  const out=structuredClone(policy),resolved=[],held=[];
  for(const g of out.groups){
    const target=g.members.filter(o=>pendingById.has(o.draftId));
    if(!target.length||g.status!=='hold'||!['QUANTITY_TEXT_NOT_EXCLUSIVELY_RECOGNIZED_PACK',...(kind==='misc'?['INCOMPARABLE_SALE_UNITS']:[])].includes(g.holdReason))continue;
    const active=g.members.filter(o=>!o.excludedReason),pids=new Set(active.map(o=>o.productId));
    if(pids.size!==1||active.length<2){held.push({groupId:g.id,reason:'NON_SINGLE_PRODUCT_LENGTH_GROUP'});continue;}
    if(g.members.some(o=>liveSourceIds.has(o.draftId))){held.push({groupId:g.id,reason:'EXISTING_PART_REQUIRES_SEPARATE_PLAN'});continue;}
    const product=products.get(active[0].productId);assert.ok(product);
    const parsed=active.map(o=>kind==='length'?exactSaleLength(o.purchase.sourceText):kind==='functional-set'?exactFunctionalSet(o.purchase.sourceText):kind==='misc'?finiteMiscSaleAmount(o.purchase.sourceText,product):nominalChainSaleClass(o.purchase.sourceText));
    if(parsed.some(x=>!x)){held.push({groupId:g.id,reason:'NONEXACT_OR_UNRECOGNIZED_LENGTH'});continue;}
    if(new Set(parsed.map(x=>x.unit)).size!==1){held.push({groupId:g.id,reason:'INCOMPARABLE_FINITE_UNITS'});continue;}
    if(kind==='length'&&parsed.some(x=>x.wrappedSinglePackage)&&!/テグス|ワイヤー|ヒモ|コード|チェーン|リボン|糸|テープ/.test(product.name)){
      held.push({groupId:g.id,reason:'PACKAGE_CONTENT_LENGTH_NOT_PROVEN'});continue;
    }
    const functionalQuote=kind==='functional-set'?
      ['輪にバーを通して使用します。','輪にフックを通して使用します。','ボタンのように留め合わせて使用する留め金具です。'].find(q=>product.description.includes(q)):undefined;
    if(kind==='functional-set'&&(!functionalQuote||!/マンテル|フック留め|ニューホック/.test(product.name)||!product.description.includes('留め金具'))){held.push({groupId:g.id,reason:'REPEATED_FUNCTIONAL_SET_NOT_PROVEN'});continue;}
    if(kind==='nominal-chain'&&(!product.name.includes('チェーン')||!product.description.includes('こちらの商品は量り売りです。')||active.length!==2||new Set(parsed.map(x=>x.numerator)).size!==2)){
      held.push({groupId:g.id,reason:'FINITE_NOMINAL_CHAIN_CLASSES_NOT_PROVEN'});continue;
    }
    let physicalOptions;
    const evidence=[];
    for(let i=0;i<active.length;i++){
      const o=active[i],d=drafts.get(o.draftId),v=product.variants.find(v=>v.id===o.variantId),pin=pendingById.get(o.draftId);
      assert.ok(d&&v&&pin,'Every active offer must be in the frozen pending scope');
      assert.equal(pin.sourceObjectSha256,sha256(JSON.stringify(d)));assert.deepEqual(pin.draft,d);
      assert.equal(d.productId,product.id);assert.equal(d.variantId,v.id);assert.equal(d.sku,v.sku);
      assert.equal(d.sourceUrl,o.sourceUrl);assert.equal(d.sku,o.sku);assert.deepEqual(o.options,v.options);
      assert.equal(d.purchase.sourceText,o.purchase.sourceText);assert.deepEqual(d.purchase,o.purchase);
      const indices=v.options.flatMap((x,j)=>x===d.purchase.sourceText?[j]:[]);assert.equal(indices.length,1);
      const options=v.options.map((x,j)=>indices[0]===j?null:x);
      if(physicalOptions)assert.deepEqual(options,physicalOptions);else physicalOptions=options;
      evidence.push({draftId:d.id,sourceObjectSha256:pin.sourceObjectSha256,rawPurchase:d.purchase.sourceText,amount:parsed[i]});
      o.parse=parsed[i];
    }
    const ordered=[...active].sort((a,b)=>compareAmount(a.parse,b.parse)||Number(b.available)-Number(a.available)||a.draftId.localeCompare(b.draftId));
    const priorGroup=policy.groups.find(x=>x.id===g.id);
    const resolution={version:1,kind:kind==='length'?'finite-exact-pending-length-v1':kind==='functional-set'?'finite-pending-functional-clasp-set-v1':kind==='misc'?'finite-pending-misc-sale-v1':'finite-nominal-10cm-before-1m-v1',...(functionalQuote?{functionalQuote,unitScope:'repeated-functional-set-not-individual-component'}:{}),...(kind==='nominal-chain'?{comparisonBasis:'smallest-published-nominal-sale-class-not-guaranteed-physical-length',bodyQuote:'こちらの商品は量り売りです。'}:{}),previousGroupSha256:sha256(stable(priorGroup)),previousHoldReason:g.holdReason,productId:product.id,productObjectSha256:sha256(JSON.stringify(product)),nonPurchaseOptions:physicalOptions,offers:evidence};
    g.status='resolved';delete g.holdReason;g.canonicalOfferDraftId=ordered[0].draftId;
    g.cleanup=[];g.saleResolution=resolution;
    resolved.push({groupId:g.id,canonicalOfferDraftId:g.canonicalOfferDraftId,sourceIds:active.map(o=>o.draftId),resolution});
  }
  out.summary.resolvedGroups=out.groups.filter(g=>g.status==='resolved').length;
  out.summary.holdGroups=out.groups.filter(g=>g.status==='hold').length;
  out.summary.noncanonicalVariants=policy.summary.noncanonicalVariants+resolved.reduce((s,g)=>s+g.sourceIds.length-1,0);
  assert.equal(out.groups.length,policy.groups.length);
  const changed=new Set(resolved.map(g=>g.groupId));
  for(let i=0;i<policy.groups.length;i++)if(!changed.has(policy.groups[i].id))assert.deepEqual(out.groups[i],policy.groups[i]);
  return {policy:out,resolved,held};
}
