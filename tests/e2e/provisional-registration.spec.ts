import {test,expect} from '@playwright/test';

test('own-product photo reference can be filtered, placed, saved and reopened with explicit review warnings',async({page})=>{
 await page.goto('/parts/new');
 const name='簡易登録の検証 '+Date.now();
 await page.evaluate(async name=>{
  const boot=await fetch('/api/local/workspace').then(r=>r.json());
  const call=async(body:unknown)=>{const r=await fetch('/api/local/workspace',{method:'POST',headers:{'Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}),j=await r.json();if(!r.ok||j.error)throw Error(JSON.stringify(j));return j.data;};
  const rpc=(name:string,args:unknown)=>call({action:'rpc',name,args,key:crypto.randomUUID()});
  const reserved=await rpc('reserve_asset_upload',{}),canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#dbeafe';ctx.fillRect(0,0,64,64);ctx.fillStyle='#78350f';ctx.font='24px sans-serif';ctx.fillText('PHOTO',0,40);const body=canvas.toDataURL('image/png').split(',')[1],bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0)),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  for(const path of reserved.paths)await call({action:'upload',path,body,mime:'image/png'});
  const [original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=reserved.paths;
  await rpc('save_part_successor',{part_id:null,payload:{part:{name,category:'bead',geometry_kind:'node',width_mm:10,height_mm:10,image_asset_id:reserved.id,mirror_policy:'keep_orientation',tags:[],metadata:{provisionalRegistration:{version:1,recipe:'provisional-placeholder-v1',status:'needs_review',photoReference:{recipe:'own-product-photo-reference-v1',url:'https://example.test/photo',sha256:hash,backgroundRemoved:false,contourReviewed:false},layoutSizeSource:'fixed-placeholder-not-physical',physicalDimensionsVerified:false,imageScaleVerified:false,connectionReady:false,sourceImageUrls:[],publishedSizeText:'100cm',pending:[]}}},image_asset:{id:reserved.id,asset_kind:'part_main',content_hash:hash,original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:64,pixel_height:64,calibration_mm_per_px:10/64,source_transform:{synthetic:true,physicalScale:false}},connection_points:[],through_holes:[]}});
 },name);
 await page.goto('/parts');await page.getByRole('combobox',{name:'登録状態',exact:true}).selectOption('provisional');await page.getByLabel('商品名・番号・素材・色・タグで検索').fill(name);await expect(page.getByText('実寸未確認（仮の表示枠）',{exact:true})).toBeVisible();
 await page.goto('/designs?type=necklace#new-design');await page.getByLabel('名前',{exact:true}).fill(name);await page.getByRole('button',{name:'作成して編集をはじめる',exact:true}).click();
 const nav=page.getByRole('navigation',{name:'デザインの作り方'});await nav.getByRole('button',{name:'3 パーツ配置',exact:true}).click();
 if(test.info().project.name.startsWith('mobile'))await page.getByRole('button',{name:'パーツを探す・選択を調整する'}).click();
 const picker=page.getByRole('region',{name:'追加するパーツを探す'});await picker.getByRole('combobox',{name:'登録状態',exact:true}).selectOption('provisional');await picker.getByLabel('パーツ検索',{exact:true}).fill(name);await expect(picker.getByText('商品写真・切抜き／実寸は要精査',{exact:true})).toBeVisible();await picker.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'この位置に配置',exact:true}).click();await page.getByRole('button',{name:'保存',exact:true}).click();await expect(page.getByLabel('保存状態')).toHaveText('保存済み');
 await page.reload();await expect(page.getByLabel('保存状態')).toHaveText('保存済み');await page.getByRole('button',{name:'4 完成確認',exact:true}).click();const check=page.getByRole('region',{name:'完成前チェック'});await expect(check.getByText(name+'：簡易登録パーツの精査が必要です')).toBeVisible();await expect(check.getByText(/10×10mmは実寸ではありません/)).toBeVisible();await page.screenshot({path:test.info().outputPath('provisional-warning.png'),fullPage:true});
});

test('published BODY frames keep representative-photo and physical-scale warnings through placement save and reload',async({page})=>{
 await page.goto('/parts/new');const prefix='掲載仮枠の検証 '+Date.now();
 const names=await page.evaluate(async prefix=>{
  const boot=await fetch('/api/local/workspace').then(r=>r.json());
  const call=async(body:unknown)=>{const r=await fetch('/api/local/workspace',{method:'POST',headers:{'Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}),j=await r.json();if(!r.ok||j.error)throw Error(JSON.stringify(j));return j.data;};
  const rpc=(name:string,args:unknown)=>call({action:'rpc',name,args,key:crypto.randomUUID()});
  const reserve=await rpc('reserve_asset_upload',{}),canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.strokeStyle='#78350f';ctx.lineWidth=8;ctx.beginPath();ctx.arc(32,32,22,0,Math.PI*2);ctx.stroke();const body=canvas.toDataURL('image/png').split(',')[1],bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0)),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  for(const path of reserve.paths)await call({action:'upload',path,body,mime:'image/png'});
  const [original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=reserve.paths;
  const names=[];for(const[i,[kind,widthMm,heightMm,approximate]]of ([['round',3,3,false],['oval',3,4,false],['clasp',10,19,true]] as const).entries()){
   const name=prefix+' '+kind;names.push(name);
   await rpc('save_part_successor',{part_id:null,payload:{part:{name,category:kind==='clasp'?'clasp':'jump_ring',geometry_kind:'node',width_mm:widthMm,height_mm:heightMm,image_asset_id:reserve.id,mirror_policy:'keep_orientation',tags:[],metadata:{nominalPlacement:{recipe:'published-body-single-product-photo-finite-v1',layoutSizeChoice:'published-body-frame-representative-photo-only',widthMm,heightMm,approximate,representativePhoto:true,imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false}}},...(i===0?{image_asset:{id:reserve.id,asset_kind:'part_main',content_hash:hash,original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:64,pixel_height:64,calibration_mm_per_px:1,source_transform:{synthetic:true}}}:{}),connection_points:[],through_holes:[]}});
  }return names;
 },prefix);
 await page.goto('/designs?type=necklace#new-design');await page.getByLabel('名前',{exact:true}).fill(prefix);await page.getByRole('button',{name:'作成して編集をはじめる',exact:true}).click();await page.getByRole('navigation',{name:'デザインの作り方'}).getByRole('button',{name:'3 パーツ配置',exact:true}).click();
 for(const name of names){
  const picker=page.getByRole('region',{name:'追加するパーツを探す'});if(!await picker.isVisible())await page.getByRole('button',{name:'パーツを探す・選択を調整する'}).click();
  await picker.getByLabel('パーツ検索',{exact:true}).fill(name);await picker.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'この位置に配置',exact:true}).click();
 }
 await page.getByRole('button',{name:'保存',exact:true}).click();await expect(page.getByLabel('保存状態')).toHaveText('保存済み');await page.reload();await expect(page.getByLabel('保存状態')).toHaveText('保存済み');await page.getByRole('button',{name:'4 完成確認',exact:true}).click();const check=page.getByRole('region',{name:'完成前チェック'});
 for(const name of names)await expect(check.getByText('要確認 · '+name+'：画像の実寸は未確認です',{exact:true})).toBeVisible();
 await expect(check.getByText(/同一商品の代表写真を掲載寸法の仮配置枠で表示しています/)).toHaveCount(3);await expect(check.getByText(/幅約10mm・高さ約19mm/)).toBeVisible();
 await page.screenshot({path:test.info().outputPath('published-body-frame-warning.png'),fullPage:true});
});
