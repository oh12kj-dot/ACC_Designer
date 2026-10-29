export const physicalFields = [
  ['depthMm','奥行（mm）'],['weightG','重量（g）'],['wireDiameterMm','線径（mm）'],
  ['pinDiameterMm','ピン径（mm）'],['innerDiameterMm','内径（mm）'],['outerDiameterMm','外径（mm）'],
  ['openingWidthMm','開口幅（mm）'],['thicknessMm','厚み（mm）'],
] as const;
export type PhysicalField = typeof physicalFields[number][0];
export function parsePhysicalFields(values:Partial<Record<PhysicalField,string>>):Partial<Record<PhysicalField,number>> {
  const result:Partial<Record<PhysicalField,number>>={};
  for(const [key,label] of physicalFields){const text=values[key]?.trim();if(!text)continue;const value=Number(text);if(!Number.isFinite(value)||value<0)throw new Error(`${label}は0以上の数値を入力してください`);result[key]=value;}
  return result;
}
