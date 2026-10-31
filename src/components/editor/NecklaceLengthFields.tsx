'use client';
import{useState}from'react';import type{NecklaceSetup}from'../../domain/editor/necklaceSetup';
const presets=['35','40','45','50','60'];
export default function NecklaceLengthFields({cm,basis,onLength,onBasis,disabled=false}:{cm:string;basis:NecklaceSetup['lengthBasis'];onLength:(value:string)=>void;onBasis:(value:NecklaceSetup['lengthBasis'])=>void;disabled?:boolean}){
 const[custom,setCustom]=useState(!presets.includes(cm));
 return <fieldset disabled={disabled} className="necklace-length-fields"><legend>ネックレスの長さ</legend>
  <div className="length-field-grid"><label>長さを選ぶ<select value={custom?'custom':cm} onChange={e=>{const v=e.target.value;setCustom(v==='custom');if(v!=='custom')onLength(v);}}>{presets.map(value=><option key={value} value={value}>{value} cm</option>)}<option value="custom">自由入力</option></select></label>
   {custom&&<label>長さ（cm）<input type="number" inputMode="decimal" min="0.1" max="1000" step="0.1" required value={cm} onChange={e=>onLength(e.target.value)}/></label>}
   <label>長さの基準<select value={basis} onChange={e=>onBasis(e.target.value as NecklaceSetup['lengthBasis'])}><option value="finished-target">仕上がりの目標</option><option value="layout">パーツを並べる長さ</option></select></label></div>
  <p className="length-help">{basis==='finished-target'?'仕上がりの目標です。留め具や結び代を含む実際の寸法は、材料と組み方を確認してください。':'留め具・結び代を除く、ガイドに沿ってパーツを並べる長さです。'}</p>
 </fieldset>;
}
