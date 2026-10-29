// @vitest-environment jsdom
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
const mocks=vi.hoisted(()=>({local:false,get:vi.fn(),save:vi.fn(),partGet:vi.fn(),partMany:vi.fn(),write:vi.fn(),clear:vi.fn(),read:vi.fn(),rpc:vi.fn(),authCallback:undefined as undefined|((event:string,session:{user:{id:string}}|null)=>void)}));
vi.mock('../../services/designRepository',()=>({SupabaseDesignRepository:class{get=mocks.get;save=mocks.save;}}));
vi.mock('../../services/partRepository',()=>({SupabasePartRepository:class{get=mocks.partGet;getMany=mocks.partMany;}}));
vi.mock('../../services/assetService',()=>({AssetService:class{signedUrl=async()=>'/asset.png';}}));
vi.mock('../../services/recovery',()=>({writeRecovery:mocks.write,readRecovery:mocks.read,clearRecovery:mocks.clear,recoverable:()=>false}));
vi.mock('../../lib/supabase/client',()=>({isLocalWorkspace:()=>mocks.local,getWorkspaceClient:()=>({auth:{onAuthStateChange:(cb:typeof mocks.authCallback)=>{mocks.authCallback=cb;return{data:{subscription:{unsubscribe:vi.fn()}}};},getSession:async()=>({data:{session:{user:{id:'user'}}},error:null})},rpc:mocks.rpc,from:(table:string)=>({select:()=>table==='parts'?{eq:async()=>({data:[{id:'bead'}],error:null})}:{in:async()=>({data:[{id:'a',thumbnail_path:'thumbnail'}],error:null}),eq:()=>({single:async()=>({data:{normalized_high_path:'asset'},error:null})})}})})}));
import DesignEditor from './DesignEditor';
import { act } from '@testing-library/react';
// Domain-command tests exercise controls inside folded groups; visibility has its own check below.
function getControl(...[role,options]:Parameters<typeof screen.getByRole>){return screen.getByRole(role,{hidden:true,...options});}
function queryControl(...[role,options]:Parameters<typeof screen.queryByRole>){return screen.queryByRole(role,{hidden:true,...options});}
function place(button:HTMLElement){fireEvent.click(button);fireEvent.click(getControl('button',{name:'この位置に配置'}));}
beforeEach(()=>{mocks.local=false;localStorage.clear();HTMLElement.prototype.scrollIntoView=vi.fn();vi.clearAllMocks();mocks.partMany.mockImplementation(async(ids:string[],current:()=>boolean=()=>true)=>current()?Promise.all(ids.map(id=>mocks.partGet(id))):[]);vi.stubGlobal('Image',class{crossOrigin='';onload?:()=>void;onerror?:()=>void;set src(_value:string){queueMicrotask(()=>this.onload?.());}});mocks.get.mockResolvedValue({design:{id:'d',name:'Necklace',type:'necklace',revision:0,updatedAt:'2026-10-05T00:00:00Z'},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]});mocks.partGet.mockResolvedValue({id:'bead',name:'Glass bead',mirrorPolicy:'mirror_image',geometryKind:'node',widthMm:10,heightMm:8,isArchived:false,imageAssetId:'a',connectionPoints:[],throughHoles:[]});mocks.save.mockResolvedValue({revision:1,savedAt:'2026-10-05T12:00:00Z'});mocks.read.mockResolvedValue(undefined);mocks.clear.mockResolvedValue(undefined);mocks.write.mockResolvedValue(undefined);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({},{get:(_target,key)=>key==='getImageData'?()=>({data:new Uint8ClampedArray([255,255,255,255])}):vi.fn()}) as unknown as CanvasRenderingContext2D);});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('rechecks the current diameter at preview and commit, while glue remains a warning-only layout',async()=>{
 const base=await mocks.partGet('bead');mocks.partGet.mockResolvedValue({...base,holeDiameterMm:.8});render(<DesignEditor designId="mounting"/>);await screen.findByRole('button',{name:'Glass bead'});
 fireEvent.change(screen.getByLabelText('取り付け方'),{target:{value:'through'}});fireEvent.change(screen.getByLabelText('紐の太さ（mm）'),{target:{value:'.5'}});fireEvent.click(getControl('button',{name:'Glass bead'}));
 fireEvent.change(screen.getByLabelText('紐の太さ（mm）'),{target:{value:'1'}});expect((getControl('button',{name:'この位置に配置'})as HTMLButtonElement).disabled).toBe(true);fireEvent.click(getControl('button',{name:'この位置に配置'}));expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('取り付け方'),{target:{value:'glue'}});expect((getControl('button',{name:'この位置に配置'})as HTMLButtonElement).disabled).toBe(false);fireEvent.click(getControl('button',{name:'この位置に配置'}));fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(mocks.save.mock.calls[0][0].throughAttachments).toEqual([]);expect(mocks.save.mock.calls[0][0].pointAttachments).toEqual([]);
});
it('restores guide length per design without carrying it into another design or saving design data',async()=>{
 const view=render(<DesignEditor designId="one"/>);await screen.findByRole('button',{name:'Glass bead'});fireEvent.change(screen.getByLabelText('紐の長さ（ガイド沿い・mm）'),{target:{value:'400'}});fireEvent.click(getControl('button',{name:'紐の長さを適用'}));expect((screen.getByLabelText('紐の長さ（ガイド沿い・mm）')as HTMLInputElement).value).toBe('400');
 view.rerender(<DesignEditor designId="two"/>);await waitFor(()=>expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe('180'));
 view.rerender(<DesignEditor designId="one"/>);await waitFor(()=>expect((screen.getByLabelText('紐の長さ（ガイド沿い・mm）')as HTMLInputElement).value).toBe('400'));expect(mocks.save).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
});
it('places a batch in one undo step and deletes the selected copies together',async()=>{
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));fireEvent.change(screen.getByLabelText('配置する個数'),{target:{value:'5'}});fireEvent.change(screen.getByLabelText('間隔の決め方'),{target:{value:'manual'}});fireEvent.change(screen.getByLabelText('中心間隔（mm）'),{target:{value:'12'}});expect(mocks.rpc).not.toHaveBeenCalled();fireEvent.click(getControl('button',{name:'この位置に配置'}));
 fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));const a=mocks.save.mock.calls[0][0];expect(a.nodes).toHaveLength(5);expect(a.nodes[1].xMm-a.nodes[0].xMm).toBe(12);expect(mocks.rpc).toHaveBeenCalledTimes(1);
 fireEvent.click(getControl('button',{name:'元に戻す'}));expect(queryControl('button',{name:'Glass bead #1'})).toBeNull();fireEvent.click(getControl('button',{name:'やり直す'}));fireEvent.click(getControl('button',{name:'配置済みを全選択'}));fireEvent.click(getControl('button',{name:'選択した5個をまとめて削除'}));expect(queryControl('button',{name:'Glass bead #1'})).toBeNull();fireEvent.click(getControl('button',{name:'元に戻す'}));expect(getControl('button',{name:'Glass bead #5'})).toBeTruthy();
});
it('shows mirrored batch copies in the preview and commits exactly that count',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));fireEvent.click(getControl('button',{name:'選択した構造を左右に複製'}));const destination=screen.getByLabelText('追加先') as HTMLSelectElement;fireEvent.change(destination,{target:{value:destination.options[1].value}});
 fireEvent.click(getControl('button',{name:'Glass bead'}));fireEvent.change(screen.getByLabelText('配置する個数'),{target:{value:'2'}});expect(screen.getByText('左右連動分を含めて4個を配置します。')).toBeTruthy();fireEvent.click(getControl('button',{name:'この位置に配置'}));fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(mocks.save.mock.calls[0][0].nodes).toHaveLength(6);expect(mocks.save.mock.calls[0][0].mirrorLinks).toHaveLength(3);
});
it('keeps a real connection candidate ahead of guide projection for batch placement',async()=>{
 const base=await mocks.partGet('bead');mocks.partGet.mockResolvedValue({...base,connectionPoints:[{id:'ring',name:'上',type:'ring',xNorm:.5,yNorm:0,directionDeg:270,maxConnections:3,localInnerDiameterMm:4,localThicknessMm:.5}]});const a=await mocks.get();a.nodes=[{id:'existing',partId:'bead',xMm:100,yMm:350/3-25,rotationDeg:0,scaleX:1,scaleY:1,zIndex:1,locked:false}];mocks.get.mockResolvedValue(a);
 render(<DesignEditor designId="d"/>);await screen.findByRole('button',{name:'Glass bead'});fireEvent.change(screen.getByLabelText('ガイドの形'),{target:{value:'v'}});fireEvent.change(screen.getByLabelText('ガイドの幅（mm）'),{target:{value:'100'}});fireEvent.change(screen.getByLabelText('ガイドの下がり（mm）'),{target:{value:'50'}});expect((screen.getByLabelText('近くでガイドに吸着') as HTMLInputElement).checked).toBe(true);expect((screen.getByLabelText('向きも自動調整') as HTMLInputElement).checked).toBe(true);fireEvent.click(getControl('button',{name:'Glass bead'}));fireEvent.change(screen.getByLabelText('配置する個数'),{target:{value:'2'}});
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);fireEvent.pointerDown(canvas,{clientX:300,clientY:285});fireEvent.pointerUp(canvas,{clientX:300,clientY:285});fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());const added=mocks.save.mock.calls[0][0].nodes[1];expect(added).toMatchObject({xMm:100,yMm:95,rotationDeg:0});
});
it('does not reinterpret a tap at a different world position if the canvas layout moves mid-tap',async()=>{
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();let top=0;vi.spyOn(canvas,'getBoundingClientRect').mockImplementation(()=>({left:0,top,width:900,height:700} as DOMRect));
 fireEvent.pointerDown(canvas,{clientX:300,clientY:300});top=64;fireEvent.pointerUp(canvas,{clientX:300,clientY:300});fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());expect(mocks.save.mock.calls[0][0].nodes[0]).toMatchObject({xMm:100,yMm:100});
});
it('keeps placement preview out of history, recovery and saved data and cancels it with Escape',async()=>{
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));
 expect(getControl('region',{name:'配置プレビュー'})).toBeTruthy();expect(queryControl('button',{name:'Glass bead #1'})).toBeNull();expect(getControl('button',{name:'元に戻す'}).hasAttribute('disabled')).toBe(true);
 fireEvent(window,new Event('pagehide'));await new Promise(resolve=>setTimeout(resolve,1600));expect(mocks.write).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
 fireEvent.keyDown(screen.getByLabelText('デザインキャンバス'),{key:'Escape'});expect(queryControl('region',{name:'配置プレビュー'})).toBeNull();expect(mocks.write).not.toHaveBeenCalled();
});
it('places at the tapped world position, nudges and rotates via existing commands and undoes once',async()=>{
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:450,height:350} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:120,clientY:90});fireEvent.pointerUp(canvas,{clientX:120,clientY:90});
 expect(queryControl('region',{name:'配置プレビュー'})).toBeNull();expect(getControl('region',{name:'選択パーツの操作'})).toBeTruthy();
 fireEvent.click(getControl('button',{name:'右へ1mm'}));fireEvent.click(getControl('button',{name:'右に15°回転'}));fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());expect(mocks.save.mock.calls[0][0].nodes[0]).toMatchObject({xMm:81,yMm:60,rotationDeg:15});
 fireEvent.click(getControl('button',{name:'元に戻す'}));expect((screen.getByLabelText('回転（°）') as HTMLInputElement).value).toBe('0');
});
it('does not place on a drag-like gesture or pointer cancel',async()=>{
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:120,clientY:90});fireEvent.pointerMove(canvas,{clientX:150,clientY:120});fireEvent.pointerUp(canvas,{clientX:150,clientY:120});expect(queryControl('button',{name:'Glass bead #1'})).toBeNull();expect(getControl('region',{name:'配置プレビュー'})).toBeTruthy();
 fireEvent.pointerCancel(canvas);expect(queryControl('region',{name:'配置プレビュー'})).toBeNull();expect(mocks.rpc).not.toHaveBeenCalled();
});
it('offers registered connections after placement but creates no attachment until explicit confirmation',async()=>{
 const base=await mocks.partGet('bead');mocks.partGet.mockResolvedValue({...base,connectionPoints:[{id:'ring',name:'上',type:'ring',xNorm:.5,yNorm:0,directionDeg:270,maxConnections:3,localInnerDiameterMm:4,localThicknessMm:.5}]});
 const aggregate=await mocks.get();aggregate.nodes=[{id:'existing',partId:'bead',xMm:100,yMm:100,rotationDeg:0,scaleX:1,scaleY:1,zIndex:1,locked:false}];mocks.get.mockResolvedValue(aggregate);
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:300,clientY:300});fireEvent.pointerUp(canvas,{clientX:300,clientY:300});expect(getControl('button',{name:'候補へ接続を確定'})).toBeTruthy();
 fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(mocks.save.mock.calls[0][0].pointAttachments).toEqual([]);
 fireEvent.click(getControl('button',{name:'候補へ接続を確定'}));fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(2));expect(mocks.save.mock.calls[1][0].pointAttachments).toHaveLength(1);
});
it('uses a physical selection name and shows minimum sale price separately while preserving stored definitions',async()=>{
 mocks.partGet.mockResolvedValue({id:'bead',name:'丸カン / 金 / 3mm / 50g（中袋）',mirrorPolicy:'keep_orientation',geometryKind:'node',widthMm:3,heightMm:3,isArchived:false,imageAssetId:'a',connectionPoints:[],throughHoles:[],selectionReference:{displayName:'丸カン / 金 / 3mm',offerDraftId:'kiwa:1:1',sourceUrl:'https://example.com/minimum',purchaseText:'2g（約71ヶ）',price:154,currency:'JPY',available:true,sourceFetchedAt:'2026-10-19',retainedSourceDraftId:'kiwa:1:2',status:'minimum-sale-unit-reference',approximateCount:71}});
 render(<DesignEditor designId="d"/>);const button=await screen.findByRole('button',{name:'丸カン / 金 / 3mm'});expect(queryControl('button',{name:'丸カン / 金 / 3mm / 50g（中袋）'})).toBeNull();
 place(button);expect(await screen.findByText(/最小販売単位の参考価格: ¥154/)).toBeTruthy();expect(screen.getByText(/確定入数・1個価格ではありません/)).toBeTruthy();
});
it('loads images only after a part is placed and shows nominal connection uncertainty',async()=>{
 const imageLoaded=vi.fn();vi.stubGlobal('Image',class{crossOrigin='';onload?:()=>void;onerror?:()=>void;set src(value:string){imageLoaded(value);queueMicrotask(()=>this.onload?.());}});
 mocks.partGet.mockResolvedValue({id:'bead',name:'Published pearl',mirrorPolicy:'keep_orientation',geometryKind:'node',widthMm:4,heightMm:4,isArchived:false,imageAssetId:'a',connectionPoints:[],throughHoles:[],metadata:{nominalPlacement:{imageScaleVerified:false,connectionReady:false}}});
 render(<DesignEditor designId="d"/>);const button=await screen.findByRole('button',{name:'Published pearl'});expect(imageLoaded).not.toHaveBeenCalled();
 place(button);await waitFor(()=>expect(imageLoaded).toHaveBeenCalledTimes(1));
 fireEvent.click(getControl('button',{name:/^保存$/}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));
 expect(mocks.save.mock.calls[0][0].nodes[0]).toMatchObject({partId:'bead',scaleX:1,scaleY:1});
 expect(mocks.save.mock.calls[0][0].throughAttachments).toEqual([]);
});
it('flushes the latest committed edits on pagehide before the recovery debounce',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));
 expect(mocks.write).not.toHaveBeenCalled();
 fireEvent(window,new Event('pagehide'));
 expect(mocks.write).toHaveBeenCalledTimes(1);
 expect(mocks.write.mock.calls[0][0]).toMatchObject({userId:'user',expectedRevision:0,aggregate:{nodes:[{partId:'bead'}]}});
});
it('flushes recovery when hidden but never writes an old account snapshot after sign-out',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
 fireEvent(document,new Event('visibilitychange'));
 expect(mocks.write).toHaveBeenCalledTimes(1);
 act(()=>mocks.authCallback?.('SIGNED_OUT',null));
 fireEvent(window,new Event('pagehide'));
 expect(mocks.write).toHaveBeenCalledTimes(1);
});
it('adds an actual Part definition, undoes/redoes it and saves the complete aggregate with expected revision',async()=>{render(<DesignEditor designId="d"/>);await screen.findByRole('button',{name:'Glass bead'});place(getControl('button',{name:'Glass bead'}));fireEvent.click(getControl('button',{name:'元に戻す'}));fireEvent.click(getControl('button',{name:'やり直す'}));fireEvent.click(getControl('button',{name:/^保存$/}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));const [aggregate,revision]=mocks.save.mock.calls[0];expect(revision).toBe(0);expect(aggregate.nodes).toHaveLength(1);expect(aggregate.nodes[0]).toMatchObject({partId:'bead',scaleX:1,scaleY:1});expect(aggregate.pointAttachments).toEqual([]);await waitFor(()=>expect(mocks.clear).toHaveBeenCalledWith('user','d',1));});
it('keeps failed save edits recoverable and never claims a conflict was saved',async()=>{mocks.save.mockRejectedValue(new Error('REVISION_CONFLICT'));render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));fireEvent.click(getControl('button',{name:/^保存$/}));await screen.findByText(/別の画面で更新されています/);expect(mocks.clear).not.toHaveBeenCalled();await waitFor(()=>expect(mocks.write).toHaveBeenCalled(),{timeout:2000});expect(mocks.write.mock.calls[0][0].aggregate.nodes).toHaveLength(1);});

it('connects a selected off-center hole to a Path only after occupancy validation',async()=>{
 const aggregate=await mocks.get();aggregate.nodes=[{id:'n',partId:'bead',xMm:20,yMm:20,rotationDeg:0,scaleX:1,scaleY:1,zIndex:1,locked:false}];aggregate.paths=[{id:'path',partId:'wire',start:{x:0,y:0},end:{x:100,y:0},physicalLengthMm:100,shape:'straight',zIndex:0,locked:false}];mocks.get.mockResolvedValue(aggregate);
 mocks.partGet.mockImplementation(async(id:string)=>id==='wire'?{id:'wire',name:'Wire',geometryKind:'path',isArchived:false,imageAssetId:'wire-image',wireDiameterMm:.5,connectionPoints:[],throughHoles:[],pathRenderSpec:{renderMode:'solid_stroke',nominalDiameterMm:.5,opacity:1,startMaxConnections:0,endMaxConnections:0}}:{id:'bead',name:'Glass bead',mirrorPolicy:'mirror_image',geometryKind:'node',widthMm:10,heightMm:4,isArchived:false,imageAssetId:'a',connectionPoints:[],throughHoles:[{id:'hole',name:'Offset hole',entryXNorm:.2,exitXNorm:.4,entryYNorm:.5,exitYNorm:.5,diameterMm:1,axisDeg:0}]});
 render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead #1'}));
 fireEvent.change(screen.getByLabelText('通し配置の距離（mm）'),{target:{value:'1'}});fireEvent.click(getControl('button',{name:'穴にチェーン・ひもを通す'}));await screen.findByText(/Pathの長さが不足/);expect(screen.queryByText('チェーン・ひもに通して配置中')).toBeNull();
 fireEvent.change(screen.getByLabelText('通し配置の距離（mm）'),{target:{value:'20'}});fireEvent.click(getControl('button',{name:'穴にチェーン・ひもを通す'}));await screen.findByText('チェーン・ひもに通して配置中');
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:66,clientY:0});fireEvent.pointerMove(canvas,{clientX:180,clientY:30});fireEvent.pointerUp(canvas);
 fireEvent.click(getControl('button',{name:/^保存$/}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());const saved=mocks.save.mock.calls[0][0];expect(saved.throughAttachments[0]).toMatchObject({nodeId:'n',holeId:'hole',distanceMm:60});expect(saved.nodes[0].xMm).toBe(62);
});

it('debounces automatic save after image loading and clears recovery only after success',async()=>{render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1),{timeout:3000});await waitFor(()=>expect(mocks.clear).toHaveBeenCalledWith('user','d',1));expect(mocks.write).toHaveBeenCalled();});

it('reloads the latest revision only after preserving local edits and can restore their original expected revision',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));
 const latest={design:{id:'d',name:'Cloud latest',type:'necklace',revision:5,updatedAt:'2026-10-05T15:00:00Z'},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]};mocks.get.mockResolvedValue(latest);
 fireEvent.click(getControl('button',{name:'最新版を読み込む'}));await screen.findByRole('heading',{name:'Cloud latest'});
 expect(mocks.write.mock.calls[0][0]).toMatchObject({expectedRevision:0,aggregate:{nodes:[{partId:'bead'}]}});expect(mocks.clear).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
 fireEvent.click(getControl('button',{name:'復旧する'}));await screen.findByRole('heading',{name:'Necklace'});
 fireEvent.click(getControl('button',{name:/^保存$/}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());expect(mocks.save.mock.calls[0][1]).toBe(0);
});
it('keeps the current editor unchanged when preserving recovery fails before reload',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));mocks.write.mockRejectedValue(new Error('Recovery unavailable'));
 fireEvent.click(getControl('button',{name:'最新版を読み込む'}));await screen.findByText('Recovery unavailable');expect(mocks.get).toHaveBeenCalledTimes(1);expect(getControl('button',{name:'Glass bead #1'})).toBeTruthy();
});
it('keeps the original recovery revision if pagehide occurs during replacement by newer cloud content',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));
 const latest={design:{id:'d',name:'Cloud latest',type:'necklace',revision:5,updatedAt:'2026-10-05T15:00:00Z'},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]};
 mocks.get.mockResolvedValue(latest);
 const clone=globalThis.structuredClone;
 // createHistory clones the incoming aggregate after the cloud revision ref advances,
 // before the old effect listener is cleaned up. Inject lifecycle suspension at that boundary.
 vi.spyOn(globalThis,'structuredClone').mockImplementation(value=>{
  if(value===latest)window.dispatchEvent(new Event('pagehide'));
  return clone(value);
 });
 fireEvent.click(getControl('button',{name:'最新版を読み込む'}));
 await screen.findByRole('heading',{name:'Cloud latest'});
 expect(mocks.write).toHaveBeenCalledTimes(2);
 expect(mocks.write.mock.calls[1][0]).toMatchObject({expectedRevision:0,aggregate:{design:{name:'Necklace'},nodes:[{partId:'bead'}]}});
});

it('generates linked geometry, synchronizes a rotation in one history entry, and preserves independent reflection',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));fireEvent.click(getControl('button',{name:'Glass bead #1'}));
 fireEvent.change(screen.getByLabelText('左右の対称軸 X（mm）'),{target:{value:'150'}});fireEvent.click(getControl('button',{name:'選択した構造を左右に複製'}));await screen.findByRole('button',{name:'Glass bead #2'});
 fireEvent.change(screen.getByLabelText('回転（°）'),{target:{value:'30'}});fireEvent.click(getControl('button',{name:'元に戻す'}));expect((screen.getByLabelText('回転（°）') as HTMLInputElement).value).toBe('0');fireEvent.click(getControl('button',{name:'やり直す'}));
 fireEvent.click(getControl('button',{name:/^保存$/}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());const linked=mocks.save.mock.calls[0][0];expect(linked.nodes).toHaveLength(2);expect(linked.nodes[0].rotationDeg).toBe(30);expect(linked.nodes[1]).toMatchObject({xMm:150,yMm:350/3,rotationDeg:330});expect(linked.mirrorLinks).toHaveLength(1);
 fireEvent.click(getControl('button',{name:'左右の連動を解除'}));fireEvent.change(screen.getByLabelText('回転（°）'),{target:{value:'45'}});fireEvent.click(getControl('button',{name:/^保存$/}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(2));const independent=mocks.save.mock.calls[1][0];expect(independent.nodes[1].rotationDeg).toBe(330);expect(independent.mirrorLinks).toEqual([]);expect(independent.design.editorConfig.mirror.nodeFlipX[independent.nodes[1].id]).toBe(true);
});

it('requires the explicit conflict action for overwrite and never sets force overwrite during ordinary save',async()=>{
 mocks.save.mockRejectedValueOnce(new Error('REVISION_CONFLICT'));render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));fireEvent.click(getControl('button',{name:/^保存$/}));await screen.findByRole('button',{name:'この端末の内容で上書き'});expect(mocks.save.mock.calls[0][2]).toBeUndefined();expect(mocks.clear).not.toHaveBeenCalled();
 mocks.save.mockResolvedValue({revision:6,savedAt:'2026-10-05T15:00:00Z'});fireEvent.click(getControl('button',{name:'この端末の内容で上書き'}));await screen.findByText('この端末の内容で上書き保存しました');expect(mocks.save.mock.calls[1][2]).toEqual({forceOverwrite:true});expect(mocks.save.mock.calls[1][1]).toBe(0);await waitFor(()=>expect(mocks.clear).toHaveBeenCalledWith('user','d',6));expect(queryControl('button',{name:'この端末の内容で上書き'})).toBeNull();
});
it('does not save a pre-drag snapshot or clear recovery while a gesture is still active',async()=>{
 render(<DesignEditor designId="d"/>);place(await screen.findByRole('button',{name:'Glass bead'}));
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:450,clientY:350});fireEvent.pointerMove(canvas,{clientX:480,clientY:380});fireEvent.keyDown(canvas,{key:'s',ctrlKey:true});
 expect(mocks.save).not.toHaveBeenCalled();expect(mocks.clear).not.toHaveBeenCalled();expect(getControl('status').textContent).toContain('確定してから');
 fireEvent.pointerUp(canvas);fireEvent.keyDown(canvas,{key:'s',ctrlKey:true});await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(mocks.save.mock.calls[0][0].nodes[0]).toMatchObject({xMm:160,yMm:380/3});
});
it('invalidates a pending initial load on logout before any previous-account data can be displayed',async()=>{
 const a=await mocks.get();let complete!:(a:unknown)=>void;mocks.get.mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));render(<DesignEditor designId="d"/>);
 await waitFor(()=>expect(mocks.get).toHaveBeenCalled());act(()=>mocks.authCallback?.('SIGNED_OUT',null));await act(async()=>{complete(a);await Promise.resolve();});
 expect(queryControl('heading',{name:'Necklace'})).toBeNull();expect(screen.queryByLabelText('デザインキャンバス')).toBeNull();
});
it('invalidates a pending cloud reload on account change, even if its response arrives afterward',async()=>{
 render(<DesignEditor designId="d"/>);await screen.findByRole('button',{name:'Glass bead'});const a=await mocks.get();let complete!:(a:unknown)=>void;mocks.get.mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));fireEvent.click(getControl('button',{name:'最新版を読み込む'}));await waitFor(()=>expect(complete).toBeTruthy());
 act(()=>mocks.authCallback?.('SIGNED_IN',{user:{id:'another-user'}}));await act(async()=>{complete(a);await Promise.resolve();});
 expect(queryControl('heading',{name:'Necklace'})).toBeNull();expect(screen.queryByLabelText('デザインキャンバス')).toBeNull();expect(mocks.clear).not.toHaveBeenCalled();
});

it('opens the empty canvas before a slow library and discards late library results after sign-out',async()=>{
 let finish!:(value:unknown)=>void;const delayed=new Promise(resolve=>{finish=resolve;});
 mocks.partMany.mockImplementation((ids:string[])=>ids.length?delayed:Promise.resolve([]));
 render(<DesignEditor designId="d"/>);await screen.findByLabelText('デザインキャンバス');
 expect(await screen.findByText(/追加パーツを読み込み中/)).toBeTruthy();
 act(()=>mocks.authCallback?.('SIGNED_OUT',null));
 await act(async()=>{finish([await mocks.partGet('bead')]);});
 expect(queryControl('button',{name:'Glass bead'})).toBeNull();
 expect(screen.queryByLabelText('デザインキャンバス')).toBeNull();
});
it('keeps the library DOM bounded while searching all loaded parts',async()=>{
 const base=await mocks.partGet('bead');
 mocks.partMany.mockImplementation(async(ids:string[])=>ids.length?Array.from({length:301},(_,i)=>({...base,id:'part'+i,name:'Library part '+i})):[]);
 render(<DesignEditor designId="d"/>);await screen.findByRole('button',{name:'Library part 0'});
 expect(screen.getAllByRole('button',{name:/^Library part /})).toHaveLength(100);
 fireEvent.click(getControl('button',{name:/さらに100件表示/}));
 expect(screen.getAllByRole('button',{name:/^Library part /})).toHaveLength(200);
 fireEvent.change(screen.getByLabelText('パーツ検索'),{target:{value:'Library part 300'}});
 expect(getControl('button',{name:'Library part 300'})).toBeTruthy();
});

it('retains an archived Part loaded by refresh when the earlier library finishes later',async()=>{
 let finish!:(value:unknown)=>void;const delayed=new Promise(resolve=>{finish=resolve;});
 mocks.partMany.mockImplementation((ids:string[])=>ids.length?delayed:Promise.resolve([]));
 render(<DesignEditor designId="d"/>);await screen.findByLabelText('デザインキャンバス');
 const latest=structuredClone(await mocks.get());latest.nodes=[{id:'latest-node',partId:'archived',xMm:20,yMm:20,rotationDeg:0,scaleX:1,scaleY:1,zIndex:1,locked:false}];latest.design.revision=2;mocks.get.mockResolvedValue(latest);
 const archived={...(await mocks.partGet('bead')),id:'archived',name:'Archived bead',isArchived:true};mocks.partGet.mockResolvedValue(archived);
 fireEvent.click(getControl('button',{name:'最新版を読み込む'}));
 await screen.findByRole('button',{name:'Archived bead #1'});
 await act(async()=>{finish([{...archived,id:'active',name:'Active bead',isArchived:false}]);});
 expect(getControl('button',{name:'Archived bead #1'})).toBeTruthy();
});

it('defaults guide snap and rotation on, spaces small beads automatically, and re-drags one auto-selected copy',async()=>{
 const base=await mocks.partGet('bead');mocks.partGet.mockResolvedValue({...base,widthMm:3,heightMm:3});render(<DesignEditor designId="d"/>);await screen.findByRole('button',{name:'Glass bead'});
 expect((screen.getByLabelText('近くでガイドに吸着') as HTMLInputElement).checked).toBe(true);expect((screen.getByLabelText('向きも自動調整') as HTMLInputElement).checked).toBe(true);
 fireEvent.change(screen.getByLabelText('ガイドの形'),{target:{value:'v'}});fireEvent.change(screen.getByLabelText('ガイドの幅（mm）'),{target:{value:'100'}});fireEvent.change(screen.getByLabelText('ガイドの下がり（mm）'),{target:{value:'50'}});
 fireEvent.click(getControl('button',{name:'Glass bead'}));expect((screen.getByLabelText('間隔の決め方') as HTMLSelectElement).value).toBe('auto');fireEvent.change(screen.getByLabelText('配置する個数'),{target:{value:'2'}});
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:300,clientY:300});fireEvent.pointerUp(canvas,{clientX:300,clientY:300});expect(getControl('button',{name:'選択した2個をまとめて削除'})).toBeTruthy();
 fireEvent.pointerDown(canvas,{clientX:300,clientY:300});fireEvent.pointerMove(canvas,{clientX:375,clientY:350});fireEvent.pointerUp(canvas,{clientX:375,clientY:350});fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());const nodes=mocks.save.mock.calls[0][0].nodes;
 expect(nodes[0].xMm).toBeCloseTo(125);expect(nodes[0].yMm).toBeCloseTo(350/3);expect(nodes[0].rotationDeg).toBe(315);expect(nodes[1]).toMatchObject({xMm:103,yMm:100,rotationDeg:0});expect(nodes).toHaveLength(2);
});
it('preserves the layout when explicitly selecting several copies for a group drag',async()=>{
 const base=await mocks.partGet('bead');mocks.partGet.mockResolvedValue({...base,widthMm:3,heightMm:3});render(<DesignEditor designId="d"/>);fireEvent.click(await screen.findByRole('button',{name:'Glass bead'}));fireEvent.change(screen.getByLabelText('配置する個数'),{target:{value:'2'}});fireEvent.click(getControl('button',{name:'この位置に配置'}));fireEvent.click(getControl('button',{name:'配置済みを全選択'}));
 vi.stubGlobal('PointerEvent',MouseEvent);const canvas=screen.getByLabelText('デザインキャンバス') as HTMLCanvasElement;canvas.setPointerCapture=vi.fn();vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:900,height:700} as DOMRect);
 fireEvent.pointerDown(canvas,{clientX:450,clientY:350});fireEvent.pointerMove(canvas,{clientX:480,clientY:380});fireEvent.pointerUp(canvas,{clientX:480,clientY:380});fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());const nodes=mocks.save.mock.calls[0][0].nodes;
 expect(nodes[1].xMm-nodes[0].xMm).toBeCloseTo(3);expect(nodes[1].yMm-nodes[0].yMm).toBe(0);expect(nodes.every((n:{rotationDeg:number})=>n.rotationDeg===0)).toBe(true);
});

it('starts with advanced tools and placed-part lists folded, while Save stays visible',async()=>{
 render(<DesignEditor designId="compact"/>);await screen.findByRole('button',{name:'Glass bead'});expect(screen.getByRole('button',{name:'保存'})).toBeTruthy();expect((screen.getByText('保存・詳細操作').closest('details')as HTMLDetailsElement).open).toBe(false);expect((screen.getByText('ガイド・実寸設定').closest('details')as HTMLDetailsElement).open).toBe(false);fireEvent.click(screen.getByText('保存・詳細操作',{exact:true}));expect(screen.getByRole('button',{name:'最新版を読み込む'})).toBeTruthy();fireEvent.click(screen.getByText('ガイド・実寸設定',{exact:true}));expect(screen.getByRole('button',{name:'紐の長さを適用'})).toBeTruthy();expect(mocks.save).not.toHaveBeenCalled();
});

it('keeps selected cord diameter bound to product and records usage through save and undo',async()=>{
 mocks.local=true;
 const product={sourceDraftId:'kiwa:1:2',title:'Test cord / 0.7mm',sizeText:'0.7mm',sourceUrl:'https://kiwaseisakujo.jp/products/test',sourceFetchedAt:'2026-10-24',sourceSha256:'hash',diameterMm:.7,purchaseText:'10m',available:true};
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({products:[product]})})));
 const a=await mocks.get();a.design.editorConfig={compatibility:{clearanceMm:.1},other:{preserve:true}};mocks.get.mockResolvedValue(a);
 render(<DesignEditor designId="cord"/>);await screen.findByRole('option',{name:product.title});
 fireEvent.change(screen.getByLabelText('紐の商品・サイズ'),{target:{value:product.sourceDraftId}});
 fireEvent.change(screen.getByLabelText('紐の使用長さ'),{target:{value:'450'}});fireEvent.click(getControl('button',{name:'この紐・長さを使う'}));
 fireEvent.change(screen.getByLabelText('取り付け方'),{target:{value:'through'}});expect((screen.getByLabelText('紐の太さ（mm）') as HTMLInputElement).readOnly).toBe(true);expect((screen.getByLabelText('紐の太さ（mm）') as HTMLInputElement).value).toBe('0.7');
 fireEvent.click(getControl('button',{name:'保存'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalled());
 expect(mocks.save.mock.calls[0][0].design.editorConfig).toEqual({...a.design.editorConfig,cordSpecification:{...product,version:1,usedLengthMm:450}});
 fireEvent.click(getControl('button',{name:'元に戻す'}));expect(queryControl('button',{name:'この長さを配置ガイドに反映'})).toBeNull();
 fireEvent.click(getControl('button',{name:'やり直す'}));expect(getControl('button',{name:'この長さを配置ガイドに反映'})).toBeTruthy();
});
