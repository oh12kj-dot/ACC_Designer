'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {calibratedZoom,screenScalePercent} from '../../domain/editor/screenScale';
import {readScreenPreference,saveScreenPreference,type ScreenPreference} from '../../services/editorPreferences';
const button='min-h-11 rounded border border-stone-300 bg-white px-3 disabled:opacity-50';
export default function ScreenScaleControls({canvasRef,zoom,onZoom,storageKey}:{canvasRef:RefObject<HTMLCanvasElement|null>;zoom:number;onZoom:(zoom:number)=>void;storageKey?:string}){
 const calibrationDetails=useRef<HTMLDetailsElement>(null),measurementInput=useRef<HTMLInputElement>(null);
 const [width,setWidth]=useState(0),[measurement,setMeasurement]=useState(''),[calibration,setCalibration]=useState<{pxPerMm:number;signature:string}>(),[signature,setSignature]=useState(''),[error,setError]=useState(''),[invalidated,setInvalidated]=useState(false),[storageError,setStorageError]=useState(false);const previousSignature=useRef(''),hasCalibration=useRef(false),measurementRef=useRef('');
 function remember(value:Omit<ScreenPreference,'version'>){setStorageError(!saveScreenPreference(storageKey,{version:1,...value}));}
 useEffect(()=>{
  let resolution:MediaQueryList|undefined,initialized=false;previousSignature.current='';hasCalibration.current=false;setCalibration(undefined);setInvalidated(false);setMeasurement('');measurementRef.current='';
  const measure=()=>{const w=canvasRef.current?.getBoundingClientRect().width??0;const next=JSON.stringify([w,canvasRef.current?.width??900,window.innerWidth,window.innerHeight,window.devicePixelRatio,window.visualViewport?.scale??1]);
   if(!initialized){initialized=true;const saved=readScreenPreference(storageKey);if(saved){measurementRef.current=saved.measurement;setMeasurement(saved.measurement);if(saved.calibration&&saved.calibration.signature===next){try{const actual=calibratedZoom(200/saved.calibration.pxPerMm,w,canvasRef.current?.width??900);hasCalibration.current=true;setCalibration(saved.calibration);onZoom(actual.zoom);}catch{setInvalidated(true);remember({measurement:saved.measurement,invalidated:true});}}else if(saved.calibration||saved.invalidated){setInvalidated(true);remember({measurement:saved.measurement,invalidated:true});}}}
   else if(previousSignature.current&&previousSignature.current!==next){if(hasCalibration.current){setInvalidated(true);remember({measurement:measurementRef.current,invalidated:true});}hasCalibration.current=false;setCalibration(undefined);}
   previousSignature.current=next;setWidth(w);setSignature(next);resolution?.removeEventListener('change',measure);resolution=window.matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`);resolution?.addEventListener('change',measure);};
  measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):undefined;if(canvasRef.current)observer?.observe(canvasRef.current);
  window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure);resolution?.removeEventListener('change',measure);};
 },[canvasRef,storageKey]);
 const valid=!!calibration&&calibration.signature===signature,percent=valid?screenScalePercent(zoom,width,calibration.pxPerMm,canvasRef.current?.width??900):undefined;
 function calibrate(){try{const result=calibratedZoom(Number(measurement),width,canvasRef.current?.width??900),next={pxPerMm:result.pxPerMm,signature};setCalibration(next);hasCalibration.current=true;setInvalidated(false);setError('');remember({measurement,calibration:next,invalidated:false});onZoom(result.zoom);}catch(e){setError((e as Error).message);}}
 function changeMeasurement(value:string){setMeasurement(value);measurementRef.current=value;setCalibration(undefined);hasCalibration.current=false;setInvalidated(false);setError('');if(value.trim()&&Number.isFinite(Number(value))&&Number(value)>0)remember({measurement:value,invalidated:false});}
 return <section aria-label="画面の実寸表示" className="canvas-view-controls">
  <div className="canvas-view-actions" role="group" aria-label="表示サイズの操作"><button className={button} type="button" aria-label="縮小" title="表示を小さくする" disabled={zoom<=.25} onClick={()=>onZoom(Math.max(.25,zoom/1.25))}>−</button><span aria-label="編集倍率" data-zoom={zoom} data-display-scale={valid?percent!/100:undefined} className="canvas-zoom-value">{valid?`${Number((percent!/100).toFixed(2))}倍`:'未調整'}<span>{valid?'表示倍率（実寸基準）':'表示倍率'}</span></span><button className={button} type="button" aria-label="拡大" title="表示を大きくする" disabled={zoom>=20} onClick={()=>onZoom(Math.min(20,zoom*1.25))}>＋</button><button className={`${button} actual-size-return`} disabled={!valid} title={valid?'定規で調整した実寸100%（表示倍率1倍）に戻す':'先に実物の定規で画面を調整してください'} onClick={()=>{if(valid){try{onZoom(calibratedZoom(200/calibration.pxPerMm,width,canvasRef.current?.width??900).zoom);}catch(e){setError((e as Error).message);}}}}>実寸100%に戻す</button><button className={button} type="button" onClick={()=>{if(calibrationDetails.current)calibrationDetails.current.open=!calibrationDetails.current.open;if(calibrationDetails.current?.open)measurementInput.current?.focus();}}>実寸を調整</button></div>
  <p className="canvas-scale-status" aria-live="polite">{valid?Math.abs(percent!-100)<.5?'実寸100%（定規で調整済み）':`実寸に対して ${percent!.toFixed(1)}%`:invalidated?'画面条件が変わりました。実寸表示を再調整してください。':'実寸表示は未調整です。現在の倍率は実物大を表しません。'}</p>
  <details ref={calibrationDetails} className="mt-1"><summary className="min-h-11 cursor-pointer content-center">定規で実寸表示を調整する</summary>
   <p className="text-sm">下の線を実物の定規で測り、その長さを入力してください。</p>
   <div className="my-3 max-w-full overflow-auto"><div aria-label="実寸調整の基準線" style={{width:200,height:14,borderBottom:'2px solid',borderLeft:'2px solid',borderRight:'2px solid',boxSizing:'border-box'}}/></div>
   <label>定規で測った線の長さ（mm）<input ref={measurementInput} className="ml-2 min-h-11 w-24 border px-2" type="number" min="0.1" step="0.1" value={measurement} onChange={e=>changeMeasurement(e.target.value)}/></label>
   <button className={`${button} ml-2`} onClick={calibrate}>計測値を適用して100%表示</button>
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   {storageError?<p role="status" className="text-sm text-amber-900">このブラウザーでは計測値を記憶できません。</p>:<p className="mt-2 text-xs text-stone-600">計測値をこのブラウザーに記憶します。同じ画面条件なら、開き直すと実寸100%（表示倍率1倍）で開始します。</p>}
   <p className="mt-2 text-xs text-stone-600">画面サイズ・ブラウザー倍率・使用モニターを変えたら再調整してください。パーツ画像の寸法が未確認の場合、画面倍率を調整しても画像そのものの実寸は保証できません。</p>
  </details>
  <span className="ml-3 text-xs text-stone-600">グリッドは10mm間隔</span>
 </section>;
}
