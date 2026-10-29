import{it,expect}from'vitest';import{nominalCzechCropBox,type CzechCropReview}from'./czechCropNominal';
it('requires the reviewed coffee bean and natsume body scope even for tag aliases',()=>{
 const r:CzechCropReview={reviewed:true,family:'チェコ コーヒービーンズ',sha256:'c'.repeat(64),url:'https://example.invalid/bean.jpg',sourceWidth:800,sourceHeight:800,crop:{left:45,top:140,width:420,height:540},reviewedBy:'fixture',reviewedAt:'2026-10-10',coordinateConvention:'unrotated-decoded-raster-integer-pixels',photoPose:'unverified photographed projection'};
 const d={name:'チェコ コーヒービーンズ　ブラウン / 約11×8mm / 6ヶ',description:'コーヒー豆を象ったプレス加工のビーズです。',tags:['コーヒービーンズ'],sizeText:'約11×8mm',imageUrls:[r.url]};
 expect(nominalCzechCropBox(d,r)).toMatchObject({widthMm:11,heightMm:8,physicalWidthVerified:false,physicalHeightVerified:false});
 expect(nominalCzechCropBox({...d,description:'コーヒー豆に合う適合サイズです。'},r)).toBeUndefined();
 const n={...d,name:'チェコ ファイヤーポリッシュ ナツメ　ブルー / 約9×6mm / 6ヶ',description:'熱加工でカットに丸みを持たせたファイヤーポリッシュです。',tags:['ファイヤーポリッシュナツメ'],sizeText:'約9×6mm'};
 expect(nominalCzechCropBox(n,{...r,family:'チェコ ファイヤーポリッシュ ナツメ'})).toMatchObject({widthMm:9,heightMm:6,photoRotationDegrees:90});
 expect(nominalCzechCropBox({...n,tags:['チェコビーズ']},{...r,family:'チェコ ファイヤーポリッシュ ナツメ'})).toBeUndefined();
});
it('binds reviewed official tag aliases to exact families and own bead context',()=>{
 const r:CzechCropReview={reviewed:true,family:'チェコ プレス 葉5',sha256:'b'.repeat(64),url:'https://example.invalid/leaf.jpg',sourceWidth:450,sourceHeight:450,crop:{left:0,top:0,width:450,height:450},reviewedBy:'fixture',reviewedAt:'2026-10-10',coordinateConvention:'unrotated-decoded-raster-integer-pixels',photoPose:'unverified photographed projection'};
 const d={name:'チェコ プレス 葉5　グリーン / 約6×12mm / 4ヶ',description:'プレスによって成型加工されたビーズです。',tags:['チェコ葉5'],sizeText:'約6×12mm',imageUrls:[r.url]};
 expect(nominalCzechCropBox(d,r)).toMatchObject({widthMm:6,heightMm:12,physicalWidthVerified:false,photoRotationDegrees:0});
 expect(nominalCzechCropBox({...d,name:d.name.replace('葉5','葉6')},r)).toBeUndefined();
 expect(nominalCzechCropBox({...d,tags:['チェコ花葉']},r)).toBeUndefined();
 expect(nominalCzechCropBox({...d,description:'対応する葉のサイズです。'},r)).toBeUndefined();
});
const review:CzechCropReview={reviewed:true,family:'チェコ ダガー',sha256:'a'.repeat(64),url:'https://example.invalid/source.jpg',sourceWidth:450,sourceHeight:450,crop:{left:0,top:0,width:248,height:450},reviewedBy:'fixture',reviewedAt:'2026-10-10',coordinateConvention:'unrotated-decoded-raster-integer-pixels',photoPose:'left photographed view; unverified projection'};
const draft={name:'チェコ ダガー　クリスタル / 11×3mm / 20ヶ',description:'プレスによって成型加工されたビーズです。',tags:['チェコダガー'],sizeText:'11×3mm',imageUrls:[review.url]};
it('retains crop evidence and pair order without creating a diameter or certified projection',()=>{const p=nominalCzechCropBox(draft,review);expect(p).toMatchObject({recipe:'kiwa-czech-own-photo-body-box-v2',widthMm:11,heightMm:3,photoRotationDegrees:90,physicalWidthVerified:false,sourceCrop:{crop:review.crop,sha256:review.sha256}});expect(p).not.toHaveProperty('diameterMm');});
it('requires exact family, own tag/body, reviewed own URL and strict own size',()=>{for(const r of [undefined,{...review,reviewed:false},{...review,family:'チェコ カリ'},{...review,url:'https://example.invalid/other.jpg'}])expect(nominalCzechCropBox(draft,r)).toBeUndefined();for(const d of [{...draft,tags:['チェコビーズ']},{...draft,description:'穴径は0.8mmです。'},{...draft,sizeText:'11mm(new)'},{...draft,sizeText:'約5-8mm'},{...draft,name:'チェコ ダガー別形　クリスタル / 11×3mm / 20ヶ'}])expect(nominalCzechCropBox(d,review)).toBeUndefined();});
it('supports reviewed approximate table-cut pairs and scalar flowers without certifying physical axes',()=>{
 const coin={...draft,name:'チェコ テーブルカット コイン3　ピンク / 約10×9mm / 4ヶ',description:'プレスとカットによって成型加工されたテーブルカット(TC)ビーズです。',tags:['チェコテーブルカットコイン3'],sizeText:'約10×9mm'};
 expect(nominalCzechCropBox(coin,{...review,family:'チェコ テーブルカット コイン3'})).toMatchObject({widthMm:10,heightMm:9,approximate:true,photoRotationDegrees:90,sizeAxisInterpretationVerified:false});
 const flower={...draft,name:'チェコ フラワー2　クリスタル / 約9mm / 4ヶ',tags:['チェコフラワー2'],sizeText:'約9mm'};
 expect(nominalCzechCropBox(flower,{...review,family:'チェコ フラワー2'})).toMatchObject({widthMm:9,heightMm:9,photoRotationDegrees:0,physicalWidthVerified:false});
 expect(nominalCzechCropBox({...flower,sizeText:'穴径約9mm'},{...review,family:'チェコ フラワー2'})).toBeUndefined();
 expect(nominalCzechCropBox({...coin,description:'対応する石のサイズは10×9mmです。'},{...review,family:'チェコ テーブルカット コイン3'})).toBeUndefined();
});
