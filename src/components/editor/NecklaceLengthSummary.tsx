'use client';
import{useState}from'react';
import{lengthCaption,makeNecklaceSetup,type NecklaceSetup}from'../../domain/editor/necklaceSetup';
import NecklaceLengthFields from'./NecklaceLengthFields';
export default function NecklaceLengthSummary({setup,guideCm,busy,geometryLocked,onApply}:{setup?:NecklaceSetup;guideCm?:number;busy:boolean;geometryLocked:boolean;onApply:(setup:NecklaceSetup,resize:boolean)=>void}){
 const[editing,setEditing]=useState(false),[cm,setCm]=useState('45'),[basis,setBasis]=useState<NecklaceSetup['lengthBasis']>('finished-target'),[resize,setResize]=useState(true),[error,setError]=useState('');
 function open(){setCm(String((setup?.targetLengthMm??450)/10));setBasis(setup?.lengthBasis??'finished-target');setError('');setEditing(true);}
 return <section aria-label="ネックレスの長さ設定" className="necklace-length-summary">
  <div className="length-summary-row"><p><strong>{setup?lengthCaption(setup):'目標の長さは未設定'}</strong>{guideCm!==undefined&&<span>配置ガイド {Number(guideCm.toFixed(1))} cm</span>}</p><button type="button" disabled={busy} onClick={open}>{setup?'長さを変更':'目標の長さを設定'}</button></div>
  {!editing?<p className="length-help">配置ガイドは参考線です。実際の材料長・留め具・結び代を自動で計算した値ではありません。</p>:<form onSubmit={event=>{event.preventDefault();try{onApply(makeNecklaceSetup(cm,basis),resize&&!geometryLocked);setEditing(false);}catch(e){setError((e as Error).message);}}}>
   <NecklaceLengthFields key={String(editing)+String(setup?.targetLengthMm)} cm={cm} basis={basis} onLength={setCm} onBasis={setBasis} disabled={busy}/>
   {!geometryLocked?<label className="length-resize-option"><input type="checkbox" checked={resize} onChange={e=>setResize(e.target.checked)}/>配置ガイドもこの長さに調整する</label>:<p className="length-help">紐の配置範囲が設定済みのため、ガイドの大きさは変更しません。</p>}
   <p className="length-help">配置済みパーツは動かしません。変更後は「保存」でデザインに記録します。</p>
   {error&&<p role="alert">{error}</p>}<div className="length-actions"><button type="submit" disabled={busy} className="studio-primary">長さを適用</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>キャンセル</button></div>
  </form>}
 </section>;
}
