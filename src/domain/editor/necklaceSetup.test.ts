import{it,expect}from'vitest';import{initialDesignGuide,makeNecklaceSetup,necklaceSetup}from'./necklaceSetup';import{guideLengthMm}from'./layoutGuide';
it('converts explicit cm to mm and rejects empty, nonfinite, oversized and ambiguous precision',()=>{
 expect(makeNecklaceSetup('42.5','finished-target').targetLengthMm).toBe(425);
 for(const value of['','0','-3','Infinity','1e309','1000.1','42.55','42cm'])expect(()=>makeNecklaceSetup(value,'layout')).toThrow();
});
it('seeds only valid necklace settings without changing a legacy or earrings design',()=>{
 const design={type:'necklace' as const,editorConfig:{necklaceSetupV1:makeNecklaceSetup('45','finished-target')}};
 expect(guideLengthMm(initialDesignGuide(design))).toBeCloseTo(450,7);expect(design.editorConfig.necklaceSetupV1.targetLengthMm).toBe(450);
 expect(necklaceSetup({type:'earrings',editorConfig:design.editorConfig})).toBeUndefined();expect(initialDesignGuide({type:'earrings',editorConfig:{}}).enabled).toBe(false);
 expect(initialDesignGuide({type:'necklace',editorConfig:{}}).width).toBe(180);expect(necklaceSetup({type:'necklace',editorConfig:{necklaceSetupV1:{version:1,targetLengthMm:NaN}}})).toBeUndefined();
});
