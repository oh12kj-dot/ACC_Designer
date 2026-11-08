// Interpret only complete, explicitly named source labels. No body/photo scaling.
export function explicitSizeLabel(raw) {
  const s=String(raw??'').normalize('NFKC').replace(/\s/g,'');
  const n='(\\d+(?:\\.\\d+)?)';
  const terms={'線径':'published-wire-diameter','内径':'published-inner-diameter-context-specific','外径':'published-outer-diameter','直径':'published-diameter','幅':'published-width','厚さ':'published-thickness'};
  let m=new RegExp(`^(線径|内径|外径|直径|幅|厚さ)(約)?${n}mm$`).exec(s);
  let measurements;
  if(m) measurements=[{meaning:terms[m[1]],valueMm:Number(m[3]),approximate:!!m[2]}];
  else if((m=new RegExp(`^(?:大|中|小)\\(内径(約)?${n}mm\\)$`).exec(s))) measurements=[{meaning:terms['内径'],valueMm:Number(m[2]),approximate:!!m[1]}];
  else if((m=new RegExp(`^内径(約)?${n}[×x]${n}mm$`).exec(s))) measurements=[{meaning:'published-inner-first-axis-unspecified',valueMm:Number(m[2]),approximate:!!m[1]},{meaning:'published-inner-second-axis-unspecified',valueMm:Number(m[3]),approximate:!!m[1]}];
  else if((m=new RegExp(`^外径${n}mm/内径${n}mm$`).exec(s)) || (m=new RegExp(`^外径${n}/内径${n}mm$`).exec(s))) measurements=[{meaning:terms['外径'],valueMm:Number(m[1]),approximate:false},{meaning:terms['内径'],valueMm:Number(m[2]),approximate:false}];
  else if((m=new RegExp(`^幅(約)?${n}mm/厚さ(約)?${n}mm$`).exec(s))) measurements=[{meaning:terms['幅'],valueMm:Number(m[2]),approximate:!!m[1]},{meaning:terms['厚さ'],valueMm:Number(m[4]),approximate:!!m[3]}];
  else return null;
  if(measurements.some(m=>!Number.isFinite(m.valueMm)||m.valueMm<=0))return null;
  // Only unqualified, exact wire diameter has an unambiguous native field.
  const w=measurements.find(m=>m.meaning==='published-wire-diameter'&&!m.approximate);
  return {rawLabel:raw,measurements,partFields:w?{wire_diameter_mm:w.valueMm}:{}};
}
