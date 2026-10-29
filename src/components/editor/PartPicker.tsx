'use client';
import PartEvidence from './PartEvidence';
import PartGlossary from './PartGlossary';
import {discovery,matchesFacets,facetLabels,type FacetAxis} from '../../domain/part/discovery';
import {mountingAssessment,defaultMounting,type MountingSettings} from '../../domain/editor/mounting';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import type {Part} from '../../types/domain';
import {pickerIdentity,comparePickerEntries,comparePickerLabels} from '../../domain/part/picker';
import {colorFamilies,type ColorFamily} from '../../domain/part/colorFamilies';
import {partCategories} from '../../domain/part/categories';
import {getWorkspaceClient} from '../../lib/supabase/client';
import {AssetService} from '../../services/assetService';
import {minimumOfferPrice,partSelectionName} from '../parts/SaleUnitReference';
import ColorSwatch from './ColorSwatch';
import {pickerKind} from '../../domain/part/pickerKinds';
import {reviewedGuideAxis} from '../../domain/editor/reviewedGuideAxis';

const categoryLabel=(part:Part)=>partCategories.find(([id])=>id===part.category)?.[1]??'その他';
const button='min-h-11 rounded-lg border border-stone-300 bg-white px-3 disabled:opacity-50';

function Thumbnail({url,onFailure}:{url?:string;onFailure:()=>void}){
 const [failed,setFailed]=useState(false);
 return <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-stone-200 bg-stone-50 text-center text-xs text-stone-500">
  {url&&!failed?<img src={url} alt="" width={64} height={64} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={()=>{setFailed(true);onFailure();}}/>: '画像なし'}
 </span>;
}

export default function PartPicker({parts,busy,onAdd,children,mounting=defaultMounting(),clearance=.05,mountingControls,onPatternAdd}:{parts:Part[];busy:boolean;onAdd:(part:Part)=>void;children?:ReactNode;mounting?:MountingSettings;clearance?:number;mountingControls?:ReactNode;onPatternAdd?:(p:Part,center?:boolean)=>void}){
 const [facets,setFacets]=useState<Record<FacetAxis,string[]>>({material:[],shape:[],use:[]}),[patternPicking,setPatternPicking]=useState(false),[patternTarget,setPatternTarget]=useState('sequence'),[glossaryOpen,setGlossaryOpen]=useState(false);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[colorFamily,setColorFamily]=useState<ColorFamily|'all'>('all'),[color,setColor]=useState('all'),[colorQuery,setColorQuery]=useState(''),[limit,setLimit]=useState(100);
 const [kind,setKind]=useState('all'),[series,setSeries]=useState('all'),[seriesQuery,setSeriesQuery]=useState(''),[seriesOpen,setSeriesOpen]=useState(false),[shadesOpen,setShadesOpen]=useState(false),[shadeLimit,setShadeLimit]=useState(24);
 const [urls,setUrls]=useState<Record<string,string>>({}),[imageError,setImageError]=useState(false),[retry,setRetry]=useState(0);
 const cache=useRef(new Map<string,{url:string;expires:number}>());
 const active=useMemo(()=>parts.filter(p=>!p.isArchived),[parts]);
 const counts=useMemo(()=>{const result=new Map<string,number>();for(const p of active){const key=partCategories.some(([id])=>id===p.category)?p.category:'other';result.set(key,(result.get(key)??0)+1);}return result;},[active]);
 const indexed=useMemo(()=>active.map(p=>{const entry=pickerIdentity(p);return{...entry,kind:pickerKind(entry),discovery:discovery(p)};}).sort(comparePickerEntries),[active]);
 const baseCandidates=useMemo(()=>indexed.filter(({part:p,color:c,discovery:d})=>matchesFacets(d,facets)&&(category==='all'||(partCategories.some(([id])=>id===p.category)?p.category:'other')===category)&&`${p.name} ${p.selectionReference?.displayName??''} ${p.sku??''} ${c} ${p.tags?.join(' ')??''} ${categoryLabel(p)}`.toLowerCase().includes(query.trim().toLowerCase())),[indexed,category,query,facets]);
 const kinds=useMemo(()=>{const result=new Map<string,{label:string;count:number}>();for(const e of baseCandidates){const row=result.get(e.kind.id)??{label:e.kind.label,count:0};row.count++;result.set(e.kind.id,row);}if(kind!=='all'&&!result.has(kind))result.set(kind,{label:indexed.find(e=>e.kind.id===kind)?.kind.label??'選択中の種類',count:0});return [...result].sort((a,b)=>comparePickerLabels(a[1].label,b[1].label));},[baseCandidates,kind,indexed]);
 const typedCandidates=useMemo(()=>baseCandidates.filter(e=>kind==='all'||e.kind.id===kind),[baseCandidates,kind]);
 const seriesCounts=useMemo(()=>{const result=new Map<string,number>();for(const e of typedCandidates)result.set(e.family,(result.get(e.family)??0)+1);return result;},[typedCandidates]);
 const seriesOptions=useMemo(()=>[...new Set([...seriesCounts.keys(),...(series==='all'?[]:[series])])].filter(s=>s===series||s.toLowerCase().includes(seriesQuery.normalize('NFKC').trim().toLowerCase())).sort(comparePickerLabels),[seriesCounts,series,seriesQuery]);
 const candidates=useMemo(()=>typedCandidates.filter(e=>series==='all'||e.family===series),[typedCandidates,series]);
 const familyCounts=useMemo(()=>{const result=new Map<string,number>();for(const entry of candidates)for(const family of entry.colorFamilies)result.set(family,(result.get(family)??0)+1);return result;},[candidates]);
 const familyCandidates=useMemo(()=>candidates.filter(entry=>colorFamily==='all'||entry.colorFamilies.includes(colorFamily)),[candidates,colorFamily]);
 const colors=useMemo(()=>{const result=new Map<string,number>();for(const entry of familyCandidates)result.set(entry.color,(result.get(entry.color)??0)+1);return result;},[familyCandidates]);
 const colorOptions=useMemo(()=>[...new Set([...colors.keys(),...(color==='all'?[]:[color])])].filter(c=>c===color||c.toLowerCase().includes(colorQuery.trim().toLowerCase())).sort(comparePickerLabels),[colors,color,colorQuery]);
 const matching=useMemo(()=>familyCandidates.filter(entry=>color==='all'||entry.color===color).map(entry=>entry.part),[familyCandidates,color]);
 const visible=matching.slice(0,limit);
 const shadeSamples=shadesOpen?colorOptions.slice(0,shadeLimit).map(c=>({color:c,part:familyCandidates.find(e=>e.color===c)?.part})):[];
 const assetIds=[...new Set([...(glossaryOpen?['丸カン|丸かん','9ピン','Tピン','クラスプ|カニカン|留め具','つぶし玉','台座|セッティング|貼付'].map(re=>active.find(p=>new RegExp(re).test(p.name))?.imageAssetId):[]),...visible.map(p=>p.imageAssetId),...shadeSamples.map(s=>s.part?.imageAssetId)].filter(Boolean))].sort().join(',');
 function chooseFamily(value:ColorFamily|'all'){setColorFamily(value);setColor('all');setColorQuery('');setLimit(100);setShadeLimit(24);}
 function resetFilters(){setFacets({material:[],shape:[],use:[]});setQuery('');setCategory('all');setKind('all');setSeries('all');setSeriesQuery('');chooseFamily('all');}
 useEffect(()=>{
  let current=true;
  void(async()=>{
   const ids=assetIds.split(',').filter(Boolean),missing=ids.filter(id=>(cache.current.get(id)?.expires??0)<Date.now());
   let failed=false;
   try{
    if(missing.length){
     const client=getWorkspaceClient(),service=new AssetService(client);
     // Only fetch metadata for the current page. Never load original or canvas images here.
     for(let offset=0;offset<missing.length;offset+=100){
      const batch=missing.slice(offset,offset+100);
      const {data,error}=await client.from('part_image_assets').select('id,thumbnail_path').in('id',batch);
      if(error)throw error;
      const found=new Set<string>();
      await Promise.all((data??[]).map(async row=>{found.add(row.id);try{if(!row.thumbnail_path)throw new Error('missing thumbnail');const url=await service.signedUrl(row.thumbnail_path);if(current)cache.current.set(row.id,{url,expires:Date.now()+50*60*1000});}catch{failed=true;}}));
      if(batch.some(id=>!found.has(id)))failed=true;
      if(!current)return;
     }
    }
   }catch{failed=true;}
   if(current){setUrls(Object.fromEntries(ids.flatMap(id=>{const value=cache.current.get(id);return value?[[id,value.url]]:[];})));setImageError(failed);}
  })();
  return()=>{current=false;};
 },[assetIds,retry]);
 return <section aria-label="追加するパーツを探す" className="studio-picker">
  <label className="mt-3 block">パーツ検索<input className="min-h-11 w-full border px-2" placeholder="名前・品番・色など" value={query} onChange={e=>{setQuery(e.target.value);setLimit(100);}}/></label>
<div className="picker-category-row">  <label className="mt-3 block">カテゴリ<select className="min-h-11 w-full border px-2" value={category} onChange={e=>{setCategory(e.target.value);setKind('all');setSeries('all');setSeriesQuery('');setLimit(100);}}>
   <option value="all">すべて（{active.length}件）</option>{partCategories.filter(([id])=>counts.has(id)).map(([id,label])=><option key={id} value={id}>{label}（{counts.get(id)}件）</option>)}
  </select></label>
  <label className="mt-3 block">種類で絞る<select className="min-h-11 w-full border px-2" value={kind} onChange={e=>{setKind(e.target.value);setSeries('all');setSeriesQuery('');setLimit(100);}}><option value="all">すべての種類</option>{kinds.map(([id,row])=><option key={id} value={id}>{row.label}（{row.count}件）</option>)}</select></label>
</div>  <details className="picker-color-details mt-2"><summary className="min-h-11 cursor-pointer">絞り込み：色・商品シリーズ{colorFamily!=='all'||series!=='all'||color!=='all'?'（選択中）':''}</summary>  <details className="picker-series mt-2" onToggle={e=>setSeriesOpen(e.currentTarget.open)}><summary className="min-h-11 cursor-pointer content-center text-xs">商品シリーズで絞る{series!=='all'&&`：${series}`}</summary>
   <label className="block text-xs">シリーズ名を検索<input className="min-h-11 w-full border px-2" value={seriesQuery} onChange={e=>setSeriesQuery(e.target.value)} placeholder="例：ファイヤー、ラウンド、5328"/></label>
   <label className="mt-2 block text-xs">商品シリーズ<select aria-label="商品シリーズ" className="min-h-11 w-full border px-2" value={series} onChange={e=>{setSeries(e.target.value);setLimit(100);}}><option value="all">すべてのシリーズ</option>{seriesOpen&&[...new Set([...seriesOptions.slice(0,100),...(series==='all'?[]:[series])])].map(s=><option key={s} value={s}>{s}（{seriesCounts.get(s)??0}件）</option>)}</select></label>
   {seriesOptions.length>100&&<p className="text-xs">候補を100シリーズまで表示しています。シリーズ名で絞り込めます。</p>}
  </details>
  <fieldset className="picker-families mt-3"><legend className="text-xs">色から探す</legend><div className="picker-swatch-grid">{([['all','すべて'],...colorFamilies.filter(([id])=>familyCounts.has(id)||id===colorFamily)] as readonly (readonly [ColorFamily|'all',string])[]).map(([id,label])=><button key={id} type="button" aria-label={`色系統：${label}`} aria-pressed={colorFamily===id} title={`${label}（${id==='all'?candidates.length:familyCounts.get(id)??0}件）`} className="picker-family" onClick={()=>chooseFamily(id)}><ColorSwatch family={id}/><span>{({clear:'白・透明',red:'赤・桃',orange:'黄・橙',dark:'黒・灰',brown:'茶・ベージュ',gold:'金色',silver:'銀色',multi:'多色',other:'その他',unspecified:'記載なし'} as Record<string,string>)[id]??label.replace('系','')}</span></button>)}</div></fieldset>
  <label className="sr-only">色のグループ<select tabIndex={-1} aria-label="色のグループ" value={colorFamily} onChange={e=>chooseFamily(e.target.value as ColorFamily|'all')}><option value="all">すべての色</option>{colorFamilies.filter(([id])=>familyCounts.has(id)||id===colorFamily).map(([id,label])=><option key={id} value={id}>{label}（{familyCounts.get(id)??0}件）</option>)}</select></label>
  <details className="picker-color-details mt-2" onToggle={e=>{setShadesOpen(e.currentTarget.open);setShadeLimit(24);}}><summary className="min-h-11 cursor-pointer content-center text-xs">細かい色を指定する{color!=='all'&&`：${color||'色の記載なし'}`}</summary>
  <label className="mt-2 block">色名を絞り込む<input className="min-h-11 w-full border px-2" placeholder="ローズ・ゴールドなど" value={colorQuery} onChange={e=>setColorQuery(e.target.value)}/></label>
  <label className="mt-2 block">色<select aria-label="色" className="min-h-11 w-full border px-2" value={color} onChange={e=>{setColor(e.target.value);setLimit(100);}}>
   <option value="all">すべての色</option>{colorOptions.map(c=><option key={c} value={c}>{c||'色の記載なし'}（{colors.get(c)??0}件）</option>)}
  </select></label>
  <p className="mt-2 text-xs text-stone-500">商品写真の色見本です。同じ色名でも素材・仕上げで見え方が異なります。</p>
  <div className="picker-shade-grid">{shadeSamples.map(sample=><button type="button" key={sample.color} className="picker-shade" aria-label={`色を選択：${sample.color||'色の記載なし'}`} aria-pressed={color===sample.color} onClick={()=>{setColor(sample.color);setLimit(100);}}><Thumbnail key={`${sample.part?.imageAssetId}:${sample.part?urls[sample.part.imageAssetId]:''}:${retry}`} url={sample.part?urls[sample.part.imageAssetId]:undefined} onFailure={()=>setImageError(true)}/><span>{sample.color||'色の記載なし'}<small>{colors.get(sample.color)??0}件</small></span></button>)}</div>
  {shadesOpen&&colorOptions.length>shadeLimit&&<button className="min-h-11 text-xs underline" onClick={()=>setShadeLimit(n=>n+24)}>色見本をさらに表示</button>}
  </details>
  <p className="mt-1 text-xs text-stone-500">色系統は目安です。実際の色は商品写真で確認できます。</p>
  <button type="button" className="mt-2 min-h-11 text-xs underline" onClick={resetFilters}>絞り込みをリセット</button>
</details>
  <p className="mt-1 text-sm text-stone-600">{matching.length}件 · 写真を選び、キャンバスで置く位置を指定</p>
  {imageError&&<p className="mt-2 text-xs text-stone-600">一部の写真を取得できませんでした。<button className="min-h-11 underline" onClick={()=>setRetry(n=>n+1)}>写真を再取得</button></p>}
  <div className="mt-2 flex max-h-[28rem] flex-col gap-2 overflow-auto" aria-label="パーツの候補">
   {visible.map(part=>{const assessment=mountingAssessment(part,mounting,clearance);return <div key={part.id}><button className={`${button} studio-part-card flex shrink-0 items-center gap-3 py-2 text-left`} aria-label={patternPicking?'配列に追加：'+partSelectionName(part):partSelectionName(part)} aria-describedby={[reviewedGuideAxis(part)==='none'?`part-no-hole-${part.id}`:'',assessment.text?`mounting-${part.id}`:''].filter(Boolean).join(' ')||undefined} disabled={busy||assessment.blocked} key={part.id} onClick={()=>{if(!mountingAssessment(part,mounting,clearance).blocked)patternPicking&&onPatternAdd?onPatternAdd(part,patternTarget==='center'):onAdd(part);}}>
    <Thumbnail key={`${part.imageAssetId}:${urls[part.imageAssetId]??''}:${retry}`} url={urls[part.imageAssetId]} onFailure={()=>setImageError(true)}/>
    <span className="min-w-0 break-words"><span className="block text-xs text-stone-500">{pickerKind(pickerIdentity(part)).label}</span><span className="block text-sm">{partSelectionName(part)}</span>
     {reviewedGuideAxis(part)==='none'&&<span id={`part-no-hole-${part.id}`} className="mt-1 inline-block rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">通し穴なし</span>}
     {assessment.text&&<span id={`mounting-${part.id}`} className={`mt-1 block text-xs ${assessment.blocked?'text-red-800':'text-amber-900'}`}>{assessment.text}</span>}
     {part.selectionReference&&<span className="mt-1 block text-xs text-stone-500">参考 {minimumOfferPrice(part.selectionReference)} / {part.selectionReference.purchaseText}</span>}
    </span>
   </button><PartEvidence part={part}/></div>;})}
   {!matching.length&&<p className="py-4 text-sm">該当するパーツがありません。カテゴリ・色・検索語を変えてください。</p>}
  </div>
  {matching.length>limit&&<button className={`${button} mt-2`} onClick={()=>setLimit(n=>n+100)}>さらに100件表示（全{matching.length}件）</button>}  <details className="mt-2 text-xs text-stone-600"><summary className="min-h-11 cursor-pointer content-center">AG・ARなどの表記について</summary>
   <p>AGは金古美（アンティーク調の金色）、ARは銀古美（アンティーク調の銀色）です。金属の表面仕上げを表す記号です。</p>
   <p className="mt-2">色名の後ろのG・Sなどは、金属部分や表面加工などの違いです。色の検索ではまとめ、各商品の正式な名前はそのまま表示しています。</p>
   <a className="inline-flex min-h-11 items-center underline" href="https://kiwaseisakujo.biz/collections/g-charm" target="_blank" rel="noreferrer">公式ストアのメッキカラー分類</a>
  </details>
<details className="picker-color-details picker-setup mt-2" data-editor-details><summary className="min-h-11 cursor-pointer content-center text-xs">紐・配列・取り付けを設定する</summary>{mountingControls}</details>
  <details className="picker-color-details mt-2"><summary className="min-h-11 cursor-pointer content-center text-xs">素材・形・用途で探す{Object.values(facets).flat().length?`（${Object.values(facets).flat().length}条件）`:''}</summary><p className="text-xs">掲載名による検索補助です。素材・接続の適合を保証しません。同じ項目内は「いずれか」、項目間は「すべて」に一致する商品を探します。</p>{(Object.keys(facetLabels)as FacetAxis[]).map(axis=><fieldset className="mt-2" key={axis}><legend className="text-xs font-medium">{{material:'素材',shape:'形',use:'用途'}[axis]}</legend><div className="flex flex-wrap gap-1">{Object.entries(facetLabels[axis]).map(([id,label])=><label key={id} className="flex min-h-11 items-center gap-1 rounded border px-2 text-xs"><input type="checkbox" checked={facets[axis].includes(id)} onChange={e=>{setFacets(v=>({...v,[axis]:e.target.checked?[...v[axis],id]:v[axis].filter(x=>x!==id)}));setLimit(100);}}/>{label}</label>)}</div></fieldset>)}</details>
  <PartGlossary parts={active} urls={urls} onOpenChange={setGlossaryOpen} onSearch={q=>{resetFilters();setQuery(q);}}/>
  {onPatternAdd&&<label className="mt-2 flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={patternPicking} onChange={e=>setPatternPicking(e.target.checked)}/>配列に使うパーツを選ぶ（同じ商品も繰り返し追加可）</label>}
{onPatternAdd&&patternPicking&&<label className="block text-xs">配列への追加先<select className="min-h-11 w-full border px-2" value={patternTarget} onChange={e=>setPatternTarget(e.target.value)}><option value="sequence">繰り返す配列の末尾</option><option value="center">中央のパーツ（1個）</option></select></label>}

  {children}

 </section>;
}
