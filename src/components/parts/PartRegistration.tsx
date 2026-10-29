'use client';

import Link from 'next/link';
import SegmentPreview from './SegmentPreview';
import { useEffect,useRef,useState } from 'react';
import { publishedPurchase,publishedMeasurements,publishedCategory } from '../../domain/part/publishedSpecs';
import { partCategories,inferredGeometry } from '../../domain/part/categories';
import { physicalFields,parsePhysicalFields,type PhysicalField } from '../../domain/part/physicalFields';
import type { CatalogProduct } from '../../types/catalog';
import type { Part,PartCategory,SaleMode,PartGeometryKind,PathRenderMode,PurchaseSpec } from '../../types/domain';
import { SupabasePartRepository } from '../../services/partRepository';
import { calibration,type Crop,type PixelPoint } from '../../domain/part/imageGeometry';
import { normalizeAnnotations,type PointAnnotation,type HoleAnnotation } from '../../domain/part/annotations';
import { validatePerspective,type Quad } from '../../domain/part/perspective';
import { loadImage,prepareImages,renderEdited,type ImageEdit,type MaskStroke } from '../../services/imageService';
import { prepareSegmentImages } from '../../services/segmentImages';
import { AssetService } from '../../services/assetService';
import { getWorkspaceClient as getBrowserSupabase,isLocalWorkspace } from '../../lib/supabase/client';
import ImportCandidatePanel from './ImportCandidatePanel';
import { candidateSnapshot,type ImportedPartCandidate } from '../../domain/part/importCandidate';

const categories=partCategories;
const field='mt-2 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3';
const button='min-h-11 rounded-lg border border-stone-300 bg-white px-4 disabled:opacity-50';

export default function PartRegistration({editPartId}:{editPartId?:string}){
 const [existingPart,setExistingPart]=useState<Part>();const [baseAssetId,setBaseAssetId]=useState<string>();
 const [baseRepresentation,setBaseRepresentation]=useState('normalized_high');
 const authOwner=useRef<string|undefined>(undefined),authEpoch=useRef(0);
 const sourceOriginal=useRef<File|undefined>(undefined);
 const annotationDrag=useRef<{kind:'point'|'entry'|'exit';id:string}|undefined>(undefined);
  const geometryExplicit=useRef(false);
 const [segmentPreviewUrl,setSegmentPreview]=useState('');
 const [segmentCrop,setSegmentCrop]=useState<Crop>({x:0,y:0,width:1,height:1});const [segmentPoints,setSegmentPoints]=useState<PixelPoint[]>([]);const [segmentLength,setSegmentLength]=useState('');
 const [geometryKind,setGeometryKind]=useState<PartGeometryKind>('node');const [renderMode,setRenderMode]=useState<PathRenderMode>('solid_stroke');const [nominalDiameter,setNominalDiameter]=useState('');const [strokeColor,setStrokeColor]=useState('#a8a29e');const [opacity,setOpacity]=useState('1');const [overlap,setOverlap]=useState('0');const [startPort,setStartPort]=useState('');const [endPort,setEndPort]=useState('');const [startLimit,setStartLimit]=useState('0');const [endLimit,setEndLimit]=useState('0');const [saleLength,setSaleLength]=useState('');const [weightBasis,setWeightBasis]=useState<PurchaseSpec['weightBasis']>();const [weightBasisLength,setWeightBasisLength]=useState('');
  const [name,setName]=useState('');const [category,setCategory]=useState<PartCategory>('bead');
  const [material,setMaterial]=useState('');const [color,setColor]=useState('');const [sourceName,setSourceName]=useState('');
  const [sku,setSku]=useState('');const [sourceUrl,setSourceUrl]=useState('');const [tags,setTags]=useState('');const [notes,setNotes]=useState('');
  const [file,setFile]=useState<File>();const [image,setImage]=useState<ImageBitmap>();
  const [edit,setEdit]=useState<ImageEdit>();const [cropDraft,setCropDraft]=useState({x:0,y:0,width:0,height:0});
  const [mode,setMode]=useState<'calibrate'|'erase'|'restore'|'perspective'|'point'|'hole'|'segment'>('calibrate');const [radius,setRadius]=useState(20);
  const [corners,setCorners]=useState<PixelPoint[]>([]);const [perspectiveWidth,setPerspectiveWidth]=useState('');const [perspectiveHeight,setPerspectiveHeight]=useState('');const [angle,setAngle]=useState('0');
  const [connectionPoints,setConnectionPoints]=useState<PointAnnotation[]>([]);const [throughHoles,setThroughHoles]=useState<HoleAnnotation[]>([]);const [holePoints,setHolePoints]=useState<PixelPoint[]>([]);
  const [pointDirection,setPointDirection]=useState('270');const [pointType,setPointType]=useState('loop');const [pointLimit,setPointLimit]=useState('1');
  const [previewSize,setPreviewSize]=useState({width:1,height:1});
  const [points,setPoints]=useState<PixelPoint[]>([]);const [knownMm,setKnownMm]=useState('');
  const [saleMode,setSaleMode]=useState<SaleMode>('piece');const [unitPrice,setUnitPrice]=useState('');const [packQuantity,setPackQuantity]=useState('');
  const [holeDiameter,setHoleDiameter]=useState('');
  const [physical,setPhysical]=useState<Partial<Record<PhysicalField,string>>>({});
  const [appliedCandidate,setAppliedCandidate]=useState<ImportedPartCandidate>();
  const [status,setStatus]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [canSave,setCanSave]=useState(false);
  const canvasRef=useRef<HTMLCanvasElement>(null);const strokeRef=useRef<MaskStroke|null>(null);const restoreRef=useRef<HTMLCanvasElement|null>(null);const currentImage=useRef<ImageBitmap|undefined>(undefined);
  const requestId=useRef(0);
  let mmPerPx:number|undefined;
  try{if(points.length===2)mmPerPx=calibration(points[0],points[1],Number(knownMm));}catch{}

  useEffect(()=>{if(editPartId)return;const params=new URLSearchParams(window.location.search),catalogId=params.get('catalogId'),variantId=params.get('variantId');if(!catalogId)return;let active=true;void(async()=>{try{setBusy(true);const response=await fetch(`/api/catalog?id=${encodeURIComponent(catalogId)}`);if(!response.ok)throw new Error('ライブラリの商品が見つかりません');const product:CatalogProduct=await response.json(),variant=variantId?product.variants.find(v=>v.id===variantId):product.variants[0];if(variantId&&!variant)throw new Error('指定したサイズ・販売単位は現在の商品一覧にありません。登録内容を確認してください');if(variant?.registrationEligibility?.allowed===false)throw Error(variant.registrationEligibility.message);if(!active)return;setName(`${product.name}${variant?.title?' / '+variant.title:''}`);setSku(variant?.sku??'');setSourceName('貴和製作所');setSourceUrl(variant?`${product.sourceUrl}?variant=${variant.id}`:product.sourceUrl);setTags(product.tags.join(','));const classification=publishedCategory(product.name);setCategory(classification.category);setGeometryKind(inferredGeometry(classification.category));const purchase=publishedPurchase(variant?.options[1]??'');if(purchase.unit==='piece'&&purchase.quantity!==undefined){setSaleMode(purchase.quantity===1?'piece':'pack');setPackQuantity(purchase.quantity===1?'':String(purchase.quantity));}else if(purchase.unit==='length'&&purchase.lengthMm!==undefined){setSaleMode('length');setSaleLength(String(purchase.lengthMm));}else{setSaleMode('pack');setPackQuantity('');}const labeled=publishedMeasurements(variant?.options[0]??'').filter((m,_i,all)=>!m.approximate&&m.valuesMm.length===1&&new Set(all.filter(other=>other.meaning===m.meaning).flatMap(other=>other.valuesMm)).size===1);const keys:Record<string,PhysicalField>={outer_diameter:'outerDiameterMm',inner_diameter:'innerDiameterMm',wire_diameter:'wireDiameterMm',pin_diameter:'pinDiameterMm',thickness:'thicknessMm'};setPhysical(Object.fromEntries(labeled.filter(m=>keys[m.meaning]).map(m=>[keys[m.meaning],String(m.valuesMm[0])])));const hole=labeled.find(m=>m.meaning==='hole_diameter');setHoleDiameter(hole?String(hole.valuesMm[0]):'');setNotes([product.description,`サイズ・入数: ${variant?.options.join(' / ')??'不明'}`].join('\n'));const listing=await fetch('/api/catalog').then(r=>r.json());if(!active)return;if(listing.state.currency==='JPY'&&variant?.price!==undefined)setUnitPrice(String(variant.price));if(product.imageUrls.length){const image=await fetch(`/api/catalog/image?id=${catalogId}&variant=${variant?.id??''}`);if(!image.ok)throw new Error('商品情報は取り込み済みですが画像を取得できません');const blob=await image.blob();if(active)await selectFile(new File([blob],`${product.handle}.jpg`,{type:blob.type}));}if(active)setStatus('商品画像・情報を取り込みました。掲載のサイズ・入数を確認し、画像の実寸と接続点を指定してください。');}catch(e){if(active)setError((e as Error).message);}finally{if(active)setBusy(false);}})();return()=>{active=false;};},[editPartId]);

  useEffect(()=>{if(!editPartId)return;let active=true;const epoch=authEpoch.current;void(async()=>{setBusy(true);try{
   const client=getBrowserSupabase(),auth=await client.auth.getSession();if(auth.error||!auth.data.session)throw new Error('画像編集にはログインしてください');if(epoch!==authEpoch.current)return;authOwner.current=auth.data.session.user.id;const part=await new SupabasePartRepository(client).get(editPartId);
   const {data:asset,error}=await client.from('part_image_assets').select('original_path,normalized_high_path,pixel_width,pixel_height,calibration_mm_per_px').eq('id',part.imageAssetId).single();if(error)throw error;
   const {data:blob,error:downloadError}=await client.storage.from('part-images').download(asset.normalized_high_path);if(downloadError||!blob)throw downloadError??new Error('画像を取得できません');
   const original=await client.storage.from('part-images').download(asset.original_path);if(original.error||!original.data)throw original.error??new Error('元画像を取得できません');
   if(!active||epoch!==authEpoch.current)return;await selectFile(new File([blob],'existing-normalized.png',{type:'image/png'}));if(!active||epoch!==authEpoch.current)return;
   sourceOriginal.current=new File([original.data],'source-original',{type:original.data.type});setExistingPart(part);setBaseRepresentation('normalized_high');setBaseAssetId(part.imageAssetId);setName(part.name);setGeometryKind(part.geometryKind);
   setPoints([{x:0,y:0},{x:asset.pixel_width,y:0}]);setKnownMm(String(asset.pixel_width*asset.calibration_mm_per_px));
   setConnectionPoints(part.connectionPoints.map(p=>({...p,position:{x:p.xNorm*asset.pixel_width,y:p.yNorm*asset.pixel_height}})));
   setThroughHoles(part.throughHoles.map(h=>({...h,entry:{x:h.entryXNorm*asset.pixel_width,y:h.entryYNorm*asset.pixel_height},exit:{x:h.exitXNorm*asset.pixel_width,y:h.exitYNorm*asset.pixel_height}})));
   setStatus('保存済みの正規化画像から再編集します。画像の切抜き・回転後は実寸と接続点を再指定してください。');
  }catch(e){if(active&&epoch===authEpoch.current)setError(e instanceof Error?e.message:'画像を読み込めません');}finally{if(active&&epoch===authEpoch.current)setBusy(false);}})();return()=>{active=false;requestId.current++;};},[editPartId]);

  useEffect(()=>()=>{if(segmentPreviewUrl)URL.revokeObjectURL(segmentPreviewUrl);},[segmentPreviewUrl]);
  useEffect(()=>{
    let active=true;let cleanup=()=>{};
    try{const client=getBrowserSupabase();const {data}=client.auth.onAuthStateChange((_event,session)=>{if(!active)return;const id=session?.user.id;if(_event==='SIGNED_OUT'||authOwner.current&&id!==authOwner.current){authEpoch.current++;requestId.current++;if(editPartId){currentImage.current?.close();currentImage.current=undefined;sourceOriginal.current=undefined;setExistingPart(undefined);setImage(undefined);setEdit(undefined);setFile(undefined);resetMeasurements();setName('');setStatus('ログインユーザーが変わりました。パーツ一覧から開き直してください。');}setBusy(false);}authOwner.current=id;setCanSave(!!session);});cleanup=()=>data.subscription.unsubscribe();const epoch=authEpoch.current;void client.auth.getSession().then(({data})=>{if(active&&epoch===authEpoch.current){authOwner.current=data.session?.user.id;setCanSave(!!data.session);}});}catch{}
    return()=>{active=false;cleanup();currentImage.current?.close();requestId.current++;};
  },[]);

  useEffect(()=>{
    if(!image||!edit||!canvasRef.current)return;
    try{
      const base=renderEdited(image,{...edit,strokes:[]});restoreRef.current=base;
      const result=renderEdited(image,edit),canvas=canvasRef.current;
      canvas.width=result.width;canvas.height=result.height;canvas.getContext('2d')!.drawImage(result,0,0);
      setPreviewSize({width:result.width,height:result.height});
    }catch(e){setError(e instanceof Error?e.message:'画像処理に失敗しました');}
  },[image,edit]);

  async function selectFile(selected?:File){
    if(!selected)return;setError('');setStatus('');setBusy(true);const request=++requestId.current;
    try{const next=await loadImage(selected);if(request!==requestId.current){next.close();return;}currentImage.current?.close();currentImage.current=next;setFile(selected);sourceOriginal.current=selected;setImage(next);setBaseRepresentation('new_upload');const crop={x:0,y:0,width:next.width,height:next.height};setCropDraft(crop);setEdit({crop,quarterTurns:0,strokes:[]});resetMeasurements();setAngle('0');setMode('calibrate');}catch(e){if(request===requestId.current)setError(e instanceof Error?e.message:'画像を読み込めません');}finally{if(request===requestId.current)setBusy(false);}
  }
  async function restartOriginal(){if(!existingPart)return;setBusy(true);setError('');try{
   const client=getBrowserSupabase();const {data:asset,error}=await client.from('part_image_assets').select('original_path').eq('id',existingPart.imageAssetId).single();if(error)throw error;
   const {data:blob,error:downloadError}=await client.storage.from('part-images').download(asset.original_path);if(downloadError||!blob)throw downloadError??new Error('元画像を取得できません');
   await selectFile(new File([blob],'original-image',{type:blob.type}));setBaseRepresentation('original');setStatus('元画像からやり直します。実寸と接続定義を再指定してください。');
  }catch(e){setError(e instanceof Error?e.message:'元画像を読み込めません');}finally{setBusy(false);}}
  function resetMeasurements(){setSegmentPreview('');setSegmentPoints([]);setPoints([]);setConnectionPoints([]);setThroughHoles([]);setHolePoints([]);setCorners([]);setStatus('');setError('');}
  function beginPerspective(){if(!edit)return;setEdit({...edit,quarterTurns:0,rotationDeg:0,perspective:undefined,strokes:[]});resetMeasurements();setAngle('0');setMode('perspective');setPerspectiveWidth(String(edit.crop.width));setPerspectiveHeight(String(edit.crop.height));setError('');}
  function applyPerspective(){if(!edit)return;try{const spec={corners:corners as Quad,width:Number(perspectiveWidth),height:Number(perspectiveHeight)};validatePerspective(spec,edit.crop.width,edit.crop.height);setEdit({...edit,perspective:spec,strokes:[]});resetMeasurements();setMode('calibrate');setError('');}catch(e){setError((e as Error).message);}}
  function pointerPosition(event:React.PointerEvent<HTMLCanvasElement>):PixelPoint{
    const canvas=event.currentTarget,rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  }
  function dab(point:PixelPoint,restore:boolean){
    const canvas=canvasRef.current!,ctx=canvas.getContext('2d')!;ctx.save();ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);
    if(restore){ctx.clip();ctx.clearRect(point.x-radius,point.y-radius,radius*2,radius*2);ctx.drawImage(restoreRef.current!,0,0);}else{ctx.globalCompositeOperation='destination-out';ctx.fill();}ctx.restore();
  }
  function pointerDown(event:React.PointerEvent<HTMLCanvasElement>){
    if(busy||!edit)return;const point=pointerPosition(event);
    if(mode==='segment'){setSegmentPreview('');setSegmentPoints(previous=>previous.length>=2?[point]:[...previous,point]);return;}
    if(mode==='calibrate'){setPoints(previous=>previous.length>=2?[point]:[...previous,point]);return;}
    if(mode==='perspective'){setCorners(previous=>previous.length>=4?[point]:[...previous,point]);return;}
    if(mode==='point'||mode==='hole'){
      const rect=event.currentTarget.getBoundingClientRect(),threshold=14*event.currentTarget.width/rect.width;
      const handles=mode==='point'?connectionPoints.map(p=>({id:p.id,kind:'point' as const,position:p.position})):throughHoles.flatMap(h=>[{id:h.id,kind:'entry' as const,position:h.entry},{id:h.id,kind:'exit' as const,position:h.exit}]);
      const hit=handles.find(h=>Math.hypot(h.position.x-point.x,h.position.y-point.y)<threshold);
      if(hit){annotationDrag.current=hit;event.currentTarget.setPointerCapture(event.pointerId);return;}
    }
    if(mode==='point'){
      const direction=Number(pointDirection),limit=Number(pointLimit);if(!pointDirection.trim()||!Number.isFinite(direction)||!Number.isInteger(limit)||limit<0){setError('接続方向と接続上限を確認してください');return;}
      setConnectionPoints(previous=>[...previous,{id:crypto.randomUUID(),name:`接続点 ${previous.length+1}`,type:pointType,position:point,directionDeg:direction,maxConnections:limit}]);return;
    }
    if(mode==='hole'){
      if(!holePoints.length){setHolePoints([point]);return;}
      if(Math.hypot(holePoints[0].x-point.x,holePoints[0].y-point.y)<1){setError('入口と出口は離れた2点にしてください');return;}
      const diameter=holeDiameter.trim()===''?undefined:Number(holeDiameter);if(diameter!==undefined&&(!Number.isFinite(diameter)||diameter<0)){setError('穴径を確認してください');return;}
      setThroughHoles(previous=>[...previous,{id:crypto.randomUUID(),name:`貫通穴 ${previous.length+1}`,entry:holePoints[0],exit:point,diameterMm:diameter}]);setHolePoints([]);return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);strokeRef.current={points:[point],radius,restore:mode==='restore'};dab(point,mode==='restore');
  }
  function pointerMove(event:React.PointerEvent<HTMLCanvasElement>){
    if(annotationDrag.current){const handle=annotationDrag.current,p=pointerPosition(event),point={x:Math.max(0,Math.min(previewSize.width,p.x)),y:Math.max(0,Math.min(previewSize.height,p.y))};
      if(handle.kind==='point')setConnectionPoints(previous=>previous.map(h=>h.id===handle.id?{...h,position:point}:h));
      else setThroughHoles(previous=>previous.map(h=>h.id===handle.id?{...h,[handle.kind]:point}:h));return;
    }
    if(!strokeRef.current)return;const point=pointerPosition(event);strokeRef.current.points.push(point);dab(point,strokeRef.current.restore);
  }
  function pointerEnd(){
    annotationDrag.current=undefined;const stroke=strokeRef.current;if(!stroke)return;strokeRef.current=null;setEdit(previous=>previous?{...previous,strokes:[...previous.strokes,stroke]}:previous);
  }
  async function prepared(){
    if(!file||!image||!edit||!mmPerPx)throw new Error('画像を選び、2点と実距離で実寸を指定してください');
    if(holePoints.length)throw new Error('貫通穴の出口も指定してください');
    return prepareImages(sourceOriginal.current??file,renderEdited(image,edit),mmPerPx,{...(baseAssetId?{baseAssetId,baseRepresentation}:{}),crop:edit.crop,quarterTurns:edit.quarterTurns,rotationDeg:edit.rotationDeg??0,perspective:edit.perspective?{applied:true,...edit.perspective}:{applied:false},strokes:edit.strokes,annotations:{connectionPoints,throughHoles},calibration:{points,knownDistanceMm:Number(knownMm)}});
  }
  async function segmentPreview(){if(!file||!image||!edit||segmentPoints.length!==2)return;setBusy(true);setError('');try{const segment=await prepareSegmentImages(file,renderEdited(image,edit),segmentCrop,segmentPoints[0],segmentPoints[1],Number(segmentLength));const url=URL.createObjectURL(segment.high);setSegmentPreview(url);}catch(e){setError(e instanceof Error?e.message:'短区間を生成できません');}finally{setBusy(false);}}
  async function downloadDefinitions(){setBusy(true);setError('');try{const images=await prepared();const definitions=normalizeAnnotations(connectionPoints,throughHoles,images.transform.trim as Crop);const blob=new Blob([JSON.stringify({...definitions,physical:parsePhysicalFields(physical),widthMm:images.width*images.mmPerPx,heightMm:images.height*images.mmPerPx,sourceTransform:images.transform},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='part-definition.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function download(){setBusy(true);setError('');try{const result=await prepared();const url=URL.createObjectURL(result.high),anchor=document.createElement('a');anchor.href=url;anchor.download='normalized-part.png';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus(`正規化画像: ${(result.width*result.mmPerPx).toFixed(2)} × ${(result.height*result.mmPerPx).toFixed(2)} mm`);}catch(e){setError(e instanceof Error?e.message:'画像を生成できません');}finally{setBusy(false);}}
  async function save(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setStatus('');
    try{
      if(!name.trim())throw new Error('商品名を入力してください');
      if(editPartId){
       if(!existingPart)throw new Error('元のパーツを読み込んでください');
       const images=await prepared(),definitions=normalizeAnnotations(connectionPoints,throughHoles,images.transform.trim as Crop);
       const result=await new AssetService(getBrowserSupabase()).savePart(images,{part:existingPart.geometryKind==='node'?{widthMm:images.width*images.mmPerPx,heightMm:images.height*images.mmPerPx}:{},...(existingPart.geometryKind==='node'?definitions:{}),...(existingPart.pathRenderSpec?.renderMode==='stroke_texture'?{pathSpec:existingPart.pathRenderSpec}:{})},existingPart.id,existingPart.pathRenderSpec?.renderMode==='stroke_texture'?images:undefined);
       const saved=await new SupabasePartRepository(getBrowserSupabase()).get(result.partId);setExistingPart(saved);
       setStatus(result.createdSuccessor?'画像を後継パーツとして保存しました。保存済みデザインの元画像は維持されます。':'画像を保存しました。');return;
      }
      const price=unitPrice.trim()===''?undefined:Number(unitPrice);const diameter=holeDiameter.trim()===''?undefined:Number(holeDiameter);
      if(price!==undefined&&(!Number.isFinite(price)||price<0))throw new Error('価格が不正です');
      if(diameter!==undefined&&(!Number.isFinite(diameter)||diameter<0))throw new Error('穴径が不正です');
      if(saleMode==='pack'&&(!Number.isInteger(Number(packQuantity))||Number(packQuantity)<=0))throw new Error('パック入数を入力してください');
      if(sourceUrl.trim()&&!/^https:\/\//i.test(sourceUrl.trim()))throw new Error('商品URLはhttpsで入力してください');
      if(saleMode==='length'&&(!saleLength.trim()||!Number.isFinite(Number(saleLength))||Number(saleLength)<=0))throw new Error('販売長を入力してください');
      if(weightBasis==='per_sale_length'&&(!weightBasisLength.trim()||!Number.isFinite(Number(weightBasisLength))||Number(weightBasisLength)<=0))throw new Error('重量の基準長を入力してください');
      if(geometryKind==='path'&&renderMode==='segment_texture'&&(segmentPoints.length!==2||!segmentLength.trim()||!Number.isFinite(Number(segmentLength))||Number(segmentLength)<=0||!overlap.trim()||!Number.isFinite(Number(overlap))||Number(overlap)<0||Number(overlap)>=Number(segmentLength)))throw new Error('短区間の2点・実物長・重なりを確認してください');
      if(geometryKind==='path'&&(!nominalDiameter.trim()||!Number.isFinite(Number(nominalDiameter))||Number(nominalDiameter)<=0||!Number.isFinite(Number(opacity))||Number(opacity)<0||Number(opacity)>1||![startLimit,endLimit].every(n=>n.trim()&&Number.isInteger(Number(n))&&Number(n)>=0)))throw new Error('Pathの径・透明度・接続上限を確認してください');
      const physicalValues=parsePhysicalFields(physical);
      const images=await prepared();const service=new AssetService(getBrowserSupabase());
      const definitions=normalizeAnnotations(connectionPoints,throughHoles,images.transform.trim as Crop);
      await service.savePart(images,{part:{name:name.trim(),material,color,sourceName,sku:sku||undefined,sourceUrl:sourceUrl||undefined,sourceCheckedAt:appliedCandidate?.fetchedAt,category,geometryKind,widthMm:geometryKind==='node'?images.width*images.mmPerPx:undefined,heightMm:geometryKind==='node'?images.height*images.mmPerPx:undefined,holeDiameterMm:diameter,...physicalValues,mirrorPolicy:'keep_orientation',tags:tags.split(',').map(t=>t.trim()).filter(Boolean),notes,importSource:appliedCandidate?'kiwa_url':'manual',importStatus:appliedCandidate?(appliedCandidate.status==='success'?'imported':'partial'):'manual'},purchaseSpec:{saleMode,packQuantity:saleMode==='pack'?Number(packQuantity):undefined,saleLengthMm:saleMode==='length'?Number(saleLength):undefined,weightBasis,weightBasisLengthMm:weightBasis==='per_sale_length'?Number(weightBasisLength):undefined,minimumUnits:1,unitPrice:price,currency:'JPY'},pathSpec:geometryKind==='path'?{renderMode,nominalDiameterMm:Number(nominalDiameter),segmentPhysicalLengthMm:renderMode==='segment_texture'?Number(segmentLength):undefined,strokeColor,opacity:Number(opacity),textureOverlapMm:Number(overlap),startPortType:startPort||undefined,endPortType:endPort||undefined,startMaxConnections:Number(startLimit),endMaxConnections:Number(endLimit)}:undefined,sourceSnapshots:appliedCandidate?[candidateSnapshot(appliedCandidate)]:undefined,...(geometryKind==='node'?definitions:{connectionPoints:[],throughHoles:[]})},null,geometryKind==='path'&&renderMode==='stroke_texture'?images:geometryKind==='path'&&renderMode==='segment_texture'?await prepareSegmentImages(file!,renderEdited(image!,edit!),segmentCrop,segmentPoints[0],segmentPoints[1],Number(segmentLength)):undefined);
      setStatus('パーツを保存しました。パーツ一覧で確認できます。');
    }catch(e){setError(e instanceof Error?e.message:'保存に失敗しました');}finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-6xl px-5 py-10">
    <Link className="inline-flex min-h-11 items-center" href="/parts">← パーツ一覧</Link><h1 className="mt-4 text-3xl font-semibold">{editPartId?'パーツ画像の再編集':'パーツ登録'}</h1>
    <p className="mt-4 leading-7 text-stone-600">ビーズ・チャーム・金具の画像を補正し、実寸・接続点・貫通穴を登録します。ワイヤー・コード等はPath素材として径・描画方式・販売長を設定します。</p>
    {isLocalWorkspace()&&<p className="mt-4">保存先: この端末（校正後に保存できます）</p>}
    {!canSave&&<p className="mt-4 rounded-lg bg-amber-50 p-4">画像編集とPNGの確認はこの端末で試せます。クラウド保存には接続設定と<Link className="underline" href="/designs">ログイン</Link>が必要です。</p>}
    {error&&<p className="mt-4 rounded-lg bg-red-50 p-4 text-red-800" role="alert">{error}</p>}{status&&<p className="mt-4 rounded-lg bg-green-50 p-4 text-green-900" role="status">{status}</p>}
    {!editPartId&&<ImportCandidatePanel disabled={busy} current={{name,sku,unitPrice:unitPrice.trim()?Number(unitPrice):undefined,currency:'JPY'}} onImage={selectFile} onApply={candidate=>{if(candidate.name!==undefined)setName(candidate.name);if(candidate.sku!==undefined)setSku(candidate.sku);if(candidate.unitPrice!==undefined&&candidate.currency==='JPY')setUnitPrice(String(candidate.unitPrice));setSourceUrl(candidate.sourceUrl);setAppliedCandidate(candidate);setStatus('候補をフォームに反映しました。入数・実寸・価格を確認してから保存してください。');}}/>}
    <form onSubmit={save} className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-xl">画像と実寸</h2>
        <label className="mt-4 block">商品画像<input aria-label="商品画像" className="mt-2 block w-full" disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void selectFile(e.target.files?.[0])}/></label>
        {editPartId&&existingPart&&<button type="button" className={`${button} mt-3`} disabled={busy} onClick={()=>void restartOriginal()}>元画像からやり直す</button>}
        {image&&edit&&<>
          <fieldset disabled={busy} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><legend>Crop範囲（px）</legend>{(['x','y','width','height'] as const).map(key=><label key={key}>{({x:'左',y:'上',width:'幅',height:'高さ'})[key]}<input className={field} type="number" min={key==='width'||key==='height'?1:0} step="1" value={cropDraft[key]} onChange={e=>setCropDraft({...cropDraft,[key]:Number(e.target.value)})}/></label>)}</fieldset>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} className={button} onClick={()=>{try{renderEdited(image,{crop:cropDraft,quarterTurns:edit.quarterTurns,rotationDeg:edit.rotationDeg,strokes:[]});setEdit({...edit,crop:cropDraft,perspective:undefined,strokes:[]});resetMeasurements();setMode('calibrate');setError('');}catch(e){setError((e as Error).message);}}}>Crop適用</button><button type="button" disabled={busy} className={button} onClick={()=>{setEdit({...edit,quarterTurns:edit.quarterTurns+1,strokes:[]});resetMeasurements();setMode('calibrate');}}>90°回転</button><button type="button" disabled={busy} className={button} onClick={beginPerspective}>遠近補正の4点</button></div>
          <div className="mt-4 flex flex-wrap items-end gap-2"><label>回転の微調整（°）<input className={field} type="number" step="any" value={angle} onChange={e=>setAngle(e.target.value)}/></label><button type="button" className={button} disabled={busy} onClick={()=>{if(!angle.trim()||!Number.isFinite(Number(angle))){setError('回転角を入力してください');return;}setEdit({...edit,rotationDeg:Number(angle),strokes:[]});resetMeasurements();setMode('calibrate');}}>角度を適用</button></div>
          <p className="mt-2 text-sm text-stone-500">Crop・回転・遠近補正を変えるとマスク・実寸の2点・接続点・貫通穴はリセットされます。</p>
          {mode==='perspective'&&<fieldset className="mt-4 rounded-lg bg-stone-50 p-4"><legend>遠近補正</legend><p className="text-sm">左上 → 右上 → 右下 → 左下をタップ（{corners.length}/4）。補正後の幅・高さはパーツの縦横比に合わせて指定し、適用後に実寸を校正してください。</p><label className="mt-2 block">補正後の幅（px）<input className={field} type="number" min="2" max="4096" value={perspectiveWidth} onChange={e=>setPerspectiveWidth(e.target.value)}/></label><label className="mt-2 block">補正後の高さ（px）<input className={field} type="number" min="2" max="4096" value={perspectiveHeight} onChange={e=>setPerspectiveHeight(e.target.value)}/></label><button type="button" className={`${button} mt-3`} disabled={busy||corners.length!==4} onClick={applyPerspective}>遠近補正を適用</button></fieldset>}
          <div className="mt-5 flex flex-wrap gap-2">{(['calibrate','erase','restore','point','hole'] as const).map(tool=><button key={tool} type="button" disabled={busy} aria-pressed={mode===tool} className={`${button} ${mode===tool?'border-stone-800 bg-stone-100':''}`} onClick={()=>{setMode(tool);setHolePoints([]);}}>{({calibrate:'実寸の2点',erase:'背景を消す',restore:'復元',point:'接続点を追加',hole:'貫通穴を追加'})[tool]}</button>)}<button className={button} disabled={busy||edit.strokes.length===0} type="button" onClick={()=>setEdit({...edit,strokes:edit.strokes.slice(0,-1)})}>マスクを1つ戻す</button></div>
          {(mode==='erase'||mode==='restore')&&<label className="mt-3 block">ブラシ半径（px）<input type="range" min="1" max="100" value={radius} onChange={e=>setRadius(Number(e.target.value))}/><span>{radius}</span></label>}
          {mode==='point'&&<fieldset className="mt-3 grid gap-3 sm:grid-cols-3"><legend>接続点の設定</legend><label>接続の種別<select className={field} value={pointType} onChange={e=>setPointType(e.target.value)}>{['loop','ring','hook','pin'].map(type=><option key={type}>{type}</option>)}</select></label><label>外向き方向（°）<input className={field} type="number" step="any" value={pointDirection} onChange={e=>setPointDirection(e.target.value)}/></label><label>接続上限<input className={field} type="number" min="0" step="1" value={pointLimit} onChange={e=>setPointLimit(e.target.value)}/></label><p className="text-sm sm:col-span-3">画像をタップして追加。0°は右、90°は下、270°は上です。</p></fieldset>}
          {mode==='hole'&&<p className="mt-3 text-sm">入口 → 出口の順にタップ（{holePoints.length}/2）。穴径は商品情報の入力値を引き継ぎます。</p>}
          <div className="relative mt-5 overflow-hidden border border-stone-200" style={{background:'repeating-conic-gradient(#eee 0% 25%, white 0% 50%) 0 / 20px 20px'}}>
            <canvas aria-label="画像編集キャンバス" ref={canvasRef} style={{width:'100%',height:'auto',display:'block',touchAction:'none'}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}/>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${previewSize.width} ${previewSize.height}`}>
              {[...points.map((p,index)=>({...p,label:index===0?'A':'B',color:'#dc2626'})),...segmentPoints.map((p,index)=>({...p,label:index===0?'S':'E',color:'#d97706'})),...corners.map((p,index)=>({...p,label:String(index+1),color:'#7c3aed'})),...connectionPoints.map((p,index)=>({...p.position,label:`P${index+1}`,color:'#0284c7'})),...holePoints.map(p=>({...p,label:'入口',color:'#15803d'}))].map((p,index)=>{const size=Math.max(previewSize.width,previewSize.height);return <g key={index}><circle cx={p.x} cy={p.y} r={size/60} fill={p.color} stroke="white" strokeWidth={size/240}/><text x={Math.min(previewSize.width-size/18,p.x+size/35)} y={Math.max(size/18,p.y-size/35)} fontSize={size/18} fill={p.color} stroke="white" strokeWidth={size/150} paintOrder="stroke">{p.label}</text></g>;})}
              {throughHoles.map(hole=><g key={hole.id}><line x1={hole.entry.x} y1={hole.entry.y} x2={hole.exit.x} y2={hole.exit.y} stroke="#15803d" strokeWidth={Math.max(previewSize.width,previewSize.height)/150}/><circle cx={hole.entry.x} cy={hole.entry.y} r={Math.max(previewSize.width,previewSize.height)/70} fill="#15803d"/><circle cx={hole.exit.x} cy={hole.exit.y} r={Math.max(previewSize.width,previewSize.height)/70} fill="#15803d"/></g>)}
            </svg>
          </div>
          <p className="mt-3 text-sm text-stone-600">「実寸の2点」を選び、画像上の距離が分かる2点をタップしてください。現在 {points.length}/2 点</p>
          <label className="mt-3 block">A–Bの実距離（mm）<input aria-label="A–Bの実距離（mm）" disabled={busy} className={field} type="number" min="0.001" step="any" value={knownMm} onChange={e=>setKnownMm(e.target.value)}/></label>
          {mmPerPx&&<p className="mt-2 text-sm">1px = {mmPerPx.toFixed(5)} mm</p>}
          <button type="button" className={`${button} mt-4`} disabled={busy||!mmPerPx} onClick={()=>void download()}>正規化PNGを確認</button>
          <button type="button" className={`${button} mt-4 ml-2`} disabled={busy||!mmPerPx} onClick={()=>void downloadDefinitions()}>接続定義JSONを確認</button>
          <section className="mt-6"><h3 className="font-semibold">接続点・貫通穴</h3><p className="mt-2 text-sm">接続点 {connectionPoints.length}件 / 貫通穴 {throughHoles.length}件</p>{connectionPoints.map(point=><div key={point.id} className="mt-3 flex flex-wrap items-center gap-2"><input aria-label={`${point.name}の名前`} disabled={busy} className={`${field} flex-1`} value={point.name} onChange={e=>setConnectionPoints(connectionPoints.map(p=>p.id===point.id?{...p,name:e.target.value}:p))}/><label>種別<input className={field} value={point.type} onChange={e=>setConnectionPoints(connectionPoints.map(p=>p.id===point.id?{...p,type:e.target.value}:p))}/></label>{([['directionDeg','方向（度）'],['maxConnections','上限']] as const).map(([key,label])=><label key={key}>{label}<input className={field} type="number" step="any" value={point[key]} onChange={e=>setConnectionPoints(connectionPoints.map(p=>p.id===point.id?{...p,[key]:e.target.value.trim()?Number(e.target.value):NaN}:p))}/></label>)}{([['localInnerDiameterMm','接続部内径'],['localThicknessMm','接続部厚み']] as const).map(([key,label])=><label key={key} className="w-full sm:w-40">{label}（mm）<input aria-label={`${point.name}の${label}（mm）`} disabled={busy} className={field} type="number" min="0" step="any" value={point[key]??''} onChange={e=>setConnectionPoints(connectionPoints.map(p=>p.id===point.id?{...p,[key]:e.target.value.trim()===''?undefined:Number(e.target.value)}:p))}/></label>)}<button type="button" disabled={busy} className={button} onClick={()=>setConnectionPoints(connectionPoints.filter(p=>p.id!==point.id))}>接続点を削除</button></div>)}{throughHoles.map(hole=><div key={hole.id} className="mt-3 flex flex-wrap items-center gap-2"><input aria-label={`${hole.name}の名前`} disabled={busy} className={`${field} flex-1`} value={hole.name} onChange={e=>setThroughHoles(throughHoles.map(h=>h.id===hole.id?{...h,name:e.target.value}:h))}/><label>穴径（mm）<input className={field} type="number" min="0" step="any" value={hole.diameterMm??''} onChange={e=>setThroughHoles(throughHoles.map(h=>h.id===hole.id?{...h,diameterMm:e.target.value.trim()?Number(e.target.value):undefined}:h))}/></label><button type="button" disabled={busy} className={button} onClick={()=>setThroughHoles(throughHoles.filter(h=>h.id!==hole.id))}>貫通穴を削除</button></div>)}</section>
        </>}
      </section>
      <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-xl">{editPartId?existingPart?.name:'商品情報'}</h2>
        {!editPartId&&<fieldset disabled={busy}>
          <label className="mt-4 block">商品名<input className={field} required value={name} onChange={e=>setName(e.target.value)}/></label>
          <label className="mt-4 block">形状の扱い<select className={field} value={geometryKind} onChange={e=>{geometryExplicit.current=true;setGeometryKind(e.target.value as PartGeometryKind);}}><option value="node">ビーズ・金具（Node）</option><option value="path">線状素材（Path）</option></select></label><label className="mt-4 block">カテゴリ<select className={field} value={category} onChange={e=>{const next=e.target.value as PartCategory;setCategory(next);if(!geometryExplicit.current)setGeometryKind(inferredGeometry(next));}}>{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <label className="mt-4 block">素材<input className={field} value={material} onChange={e=>setMaterial(e.target.value)}/></label><label className="mt-4 block">色<input className={field} value={color} onChange={e=>setColor(e.target.value)}/></label><label className="mt-4 block">購入元<input className={field} value={sourceName} onChange={e=>setSourceName(e.target.value)}/></label><label className="mt-4 block">商品番号<input className={field} value={sku} onChange={e=>setSku(e.target.value)}/></label>
          <label className="mt-4 block">商品URL<input className={field} type="url" value={sourceUrl} onChange={e=>{setSourceUrl(e.target.value);setAppliedCandidate(undefined);}}/></label>
          <label className="mt-4 block">穴径（mm・不明なら空欄）<input className={field} type="number" min="0" step="any" value={holeDiameter} onChange={e=>setHoleDiameter(e.target.value)}/></label>
          <h3 className="mt-6 font-semibold">実物の寸法・重量</h3><p className="mt-2 text-sm text-stone-600">不明な値は空欄にしてください。0は実測値として保存します。</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{physicalFields.map(([key,label])=><label key={key}>{label}<input className={field} type="number" min="0" step="any" value={physical[key]??''} onChange={e=>setPhysical({...physical,[key]:e.target.value})}/></label>)}</div>
          {geometryKind==='path'&&<section className="mt-5"><h3 className="font-semibold">Path描画設定</h3><label className="mt-3 block">描画方式<select className={field} value={renderMode} onChange={e=>setRenderMode(e.target.value as PathRenderMode)}><option value="solid_stroke">実寸の線</option><option value="stroke_texture">画像パターンの線</option><option value="segment_texture">短区間画像の反復</option></select></label><label className="mt-3 block">素材径（mm）<input className={field} type="number" min="0.001" step="any" value={nominalDiameter} onChange={e=>setNominalDiameter(e.target.value)}/></label><label className="mt-3 block">線の色<input className={field} type="color" value={strokeColor} onChange={e=>setStrokeColor(e.target.value)}/></label><label className="mt-3 block">不透明度<input className={field} type="number" min="0" max="1" step="0.01" value={opacity} onChange={e=>setOpacity(e.target.value)}/></label>{([['始点',startPort,setStartPort,startLimit,setStartLimit],['終点',endPort,setEndPort,endLimit,setEndLimit]] as const).map(([label,port,setPort,limit,setLimit])=><div key={label} className="mt-3 grid grid-cols-2 gap-2"><label>{label}の接続種別<input className={field} value={port} onChange={e=>setPort(e.target.value)}/></label><label>{label}の接続上限<input className={field} type="number" min="0" step="1" value={limit} onChange={e=>setLimit(e.target.value)}/></label></div>)}{renderMode==='segment_texture'&&<fieldset className="mt-4 border-t pt-3"><legend>繰り返す短区間</legend><button type="button" className={button} disabled={!image} onClick={()=>{setMode('segment');setSegmentPoints([]);setSegmentCrop({x:0,y:0,width:previewSize.width,height:previewSize.height});}}>区間の始点・終点を指定</button><p className="mt-2 text-sm">補正済み画像の短区間を囲む矩形と、区間の始点→終点を指定してください（{segmentPoints.length}/2点）。画像は接線に合わせて反復します。</p><div className="mt-2 grid grid-cols-2 gap-2">{(['x','y','width','height'] as const).map(key=><label key={key}>区間 {key}<input className={field} type="number" min={key==='width'||key==='height'?1:0} step="1" value={segmentCrop[key]} onChange={e=>setSegmentCrop({...segmentCrop,[key]:Number(e.target.value)})}/></label>)}</div><label className="mt-2 block">短区間の実物長（mm）<input className={field} type="number" min="0.001" step="any" value={segmentLength} onChange={e=>setSegmentLength(e.target.value)}/></label><label className="mt-2 block">継ぎ目の重なり（mm）<input className={field} type="number" min="0" step="any" value={overlap} onChange={e=>setOverlap(e.target.value)}/></label><button type="button" className={`${button} mt-3`} disabled={busy||segmentPoints.length!==2} onClick={()=>void segmentPreview()}>U字の継ぎ目を確認</button></fieldset>}{segmentPreviewUrl&&<SegmentPreview url={segmentPreviewUrl} physicalLengthMm={Number(segmentLength)} overlapMm={Number(overlap)}/>}</section>}
          <h3 className="mt-6 font-semibold">購入条件</h3>
          <label className="mt-3 block">販売方式<select className={field} value={saleMode} onChange={e=>setSaleMode(e.target.value as SaleMode)}><option value="piece">1個単位</option><option value="pack">パック単位</option><option value="length">長さ単位</option></select></label>
          {saleMode==='length'&&<label className="mt-3 block">1販売単位の長さ（mm）<input className={field} type="number" min="0.001" step="any" value={saleLength} onChange={e=>setSaleLength(e.target.value)}/></label>}<label className="mt-3 block">重量の基準<select className={field} value={weightBasis??''} onChange={e=>setWeightBasis(e.target.value?e.target.value as PurchaseSpec['weightBasis']:undefined)}><option value="">不明</option><option value="per_piece">1個あたり</option><option value="per_sale_length">指定長あたり</option></select></label>{weightBasis==='per_sale_length'&&<label className="mt-3 block">重量の基準長（mm）<input className={field} type="number" min="0.001" step="any" value={weightBasisLength} onChange={e=>setWeightBasisLength(e.target.value)}/></label>}{saleMode==='pack'&&<label className="mt-3 block">1パックの入数<input className={field} type="number" min="1" step="1" required value={packQuantity} onChange={e=>setPackQuantity(e.target.value)}/></label>}
          <label className="mt-3 block">販売単位の価格（円・不明なら空欄）<input className={field} type="number" min="0" step="any" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/></label>
          <label className="mt-4 block">タグ（カンマ区切り）<input className={field} value={tags} onChange={e=>setTags(e.target.value)}/></label>
          <label className="mt-4 block">メモ<textarea className={`${field} min-h-24 py-3`} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        </fieldset>}
        {editPartId&&<p className="mt-4">画像と実寸・接続定義を更新します。商品情報・購入条件・Path短区間画像は保持されます。参照済みの場合は後継を作成します。</p>}
        <button disabled={busy||!canSave||!mmPerPx||!name.trim()} className="mt-6 min-h-11 rounded-lg bg-stone-800 px-6 text-white disabled:opacity-50">{busy?'処理中…':'パーツを保存'}</button>
      </section>
    </form>
  </main>;
}

