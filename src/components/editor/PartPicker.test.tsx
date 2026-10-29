// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {Part} from '../../types/domain';
const mocks=vi.hoisted(()=>({query:vi.fn(),signed:vi.fn()}));
vi.mock('../../lib/supabase/client',()=>({getWorkspaceClient:()=>({from:()=>({select:()=>({in:mocks.query})})})}));
vi.mock('../../services/assetService',()=>({AssetService:class{signedUrl=mocks.signed;}}));
import PartPicker from './PartPicker';
const part=(id:string,category:Part['category']='bead',extra={})=>({id,name:`赤 ${id}`,category,imageAssetId:id,isArchived:false,tags:[],geometryKind:'node',mirrorPolicy:'keep_orientation',connectionPoints:[],throughHoles:[],...extra}) as Part;
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockImplementation(async(_key,ids:string[])=>({data:ids.map(id=>({id,thumbnail_path:`${id}/thumb`})),error:null}));mocks.signed.mockImplementation(async(path:string)=>`/${path}`);});
afterEach(cleanup);
it('disables diameter-insufficient parts in through mode but permits the same part for glue and unknown parts with notice',()=>{
 const add=vi.fn(),small=part('small','bead',{holeDiameterMm:.4}),unknown=part('unknown');const props={parts:[small,unknown],busy:false,onAdd:add};const v=render(<PartPicker {...props} mounting={{mode:'through',diameter:'.8'}}/>);
 expect((screen.getByRole('button',{name:'赤 small'})as HTMLButtonElement).disabled).toBe(true);const card=screen.getByRole('button',{name:'赤 unknown'});expect(card.textContent).toContain('通せるか未確認');fireEvent.click(card);expect(add).toHaveBeenCalledWith(unknown);
 v.rerender(<PartPicker {...props} mounting={{mode:'glue',diameter:'.8'}}/>);expect((screen.getByRole('button',{name:'赤 small'})as HTMLButtonElement).disabled).toBe(false);fireEvent.click(screen.getByRole('button',{name:'赤 small'}));expect(add).toHaveBeenLastCalledWith(small);
});
it('drills down by published kind and series, with swatches and actual-photo shade choices',async()=>{
 const add=vi.fn(),fp=part('fp','gem',{name:'チェコ ファイヤーポリッシュ　サファイヤ / 4mm',sourceUrl:'https://kiwaseisakujo.jp/products/fp',widthMm:4,heightMm:4}),round=part('round','gem',{name:'チェコ ラウンド　ローズ / 4mm',sourceUrl:'https://kiwaseisakujo.jp/products/round'});
 render(<PartPicker parts={[fp,round,part('wire','wire')]} busy={false} onAdd={add}/>);
 fireEvent.change(screen.getByLabelText('種類で絞る'),{target:{value:'czech-fire'}});expect(screen.getByRole('button',{name:fp.name})).toBeTruthy();expect(screen.queryByRole('button',{name:round.name})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'色系統：青系'}));expect(screen.getByRole('button',{name:'色系統：青系'}).getAttribute('aria-pressed')).toBe('true');
 const details=screen.getByText('細かい色を指定する',{exact:true}).closest('details')!;details.open=true;fireEvent(details,new Event('toggle'));const shade=await screen.findByRole('button',{name:'色を選択：サファイヤ'});await waitFor(()=>expect(shade.querySelector('img')?.getAttribute('src')).toBe('/fp/thumb'));fireEvent.click(shade);fireEvent.click(screen.getByRole('button',{name:fp.name}));expect(add).toHaveBeenCalledWith(fp);
 fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'wire'}});expect((screen.getByLabelText('種類で絞る')as HTMLSelectElement).value).toBe('all');expect(screen.getByText(/該当するパーツがありません/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'絞り込みをリセット'}));expect(screen.getByRole('button',{name:round.name})).toBeTruthy();
});
it('labels confirmed no-through-hole parts on their cards without labelling unknown or stale records',()=>{
 const metadata={sourceDraftId:'d',nominalPlacement:{photoSha256:'photo',imageScaleVerified:false,connectionReady:false},guideOrientation:{version:1,status:'no-through-hole',imageAssetId:'none',sourceDraftId:'d',photoSha256:'photo',descriptionSha256:'text',evidenceText:'通し穴が開いていないパーツです',reviewedAt:'2026-10-23'}};
 const noHole=part('none','gem',{metadata}),add=vi.fn();render(<PartPicker parts={[noHole,part('unknown'),part('stale','gem',{metadata})]} busy={false} onAdd={add}/>);
 const card=screen.getByRole('button',{name:'赤 none'});expect(card.textContent).toContain('通し穴なし');expect(screen.getAllByText('通し穴なし')).toHaveLength(1);expect(document.getElementById(card.getAttribute('aria-describedby')!)?.textContent).toBe('通し穴なし');fireEvent.click(card);expect(add).toHaveBeenCalledWith(noHole);
});
it('combines category and text search, omits archived parts and keeps the selected definition',async()=>{
 const add=vi.fn(),bead=part('bead');render(<PartPicker parts={[bead,part('wire','wire'),part('old','bead',{isArchived:true})]} busy={false} onAdd={add}/>);
 fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'wire'}});expect(screen.queryByRole('button',{name:'赤 bead'})).toBeNull();
 fireEvent.change(screen.getByLabelText('パーツ検索'),{target:{value:'bead'}});expect(screen.getByText(/該当するパーツがありません/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'all'}});fireEvent.click(screen.getByRole('button',{name:'赤 bead'}));expect(add).toHaveBeenCalledWith(bead);expect(screen.queryByRole('button',{name:'赤 old'})).toBeNull();
});
it('loads only page thumbnails in batches, reuses previews and searches beyond the first page',async()=>{
 render(<PartPicker parts={Array.from({length:201},(_,i)=>part(`item${i}`))} busy={false} onAdd={()=>{}}/>);
 await waitFor(()=>expect(document.querySelectorAll('img')).toHaveLength(100));expect(mocks.query).toHaveBeenCalledTimes(1);expect(mocks.query.mock.calls[0][1]).toHaveLength(100);
 expect([...document.querySelectorAll('img')].every(img=>img.getAttribute('loading')==='lazy'&&img.src.endsWith('/thumb'))).toBe(true);
 fireEvent.change(screen.getByLabelText('パーツ検索'),{target:{value:'item200'}});await waitFor(()=>expect(document.querySelector('img')?.getAttribute('src')).toBe('/item200/thumb'));
 fireEvent.change(screen.getByLabelText('パーツ検索'),{target:{value:''}});await waitFor(()=>expect(document.querySelectorAll('img')).toHaveLength(100));expect(mocks.query).toHaveBeenCalledTimes(2);
});
it('keeps names usable on thumbnail failures and allows metadata retry',async()=>{
 mocks.query.mockResolvedValueOnce({data:null,error:new Error('offline')});const add=vi.fn();render(<PartPicker parts={[part('one')]} busy={false} onAdd={add}/>);
 fireEvent.click(await screen.findByRole('button',{name:'写真を再取得'}));await waitFor(()=>expect(document.querySelector('img')).toBeTruthy());
 fireEvent.error(document.querySelector('img')!);expect(screen.getByText('画像なし')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'赤 one'}));expect(add).toHaveBeenCalledTimes(1);
});

it('combines exact colour, category and text; colour-name search only narrows choices',async()=>{
 const add=vi.fn();const red=part('red','bead',{name:'同じビーズ / 2mm',color:'赤',widthMm:2,heightMm:2});
 render(<PartPicker parts={[part('pink','bead',{name:'同じビーズ / 10mm',color:'ピンク',widthMm:10,heightMm:10}),red,part('wire','wire',{color:'赤'}),part('gold','bead',{color:'ゴールド'}),part('pinkgold','bead',{color:'ピンクゴールド'})]} busy={false} onAdd={add}/>);
 fireEvent.click(screen.getByText('細かい色を指定する',{exact:true}));
 const choices=screen.getByLabelText('パーツの候補');expect([...choices.querySelectorAll('button')].filter(b=>b.textContent?.includes('同じビーズ')).map(b=>b.getAttribute('aria-label'))).toEqual(['同じビーズ / 2mm','同じビーズ / 10mm']);
 fireEvent.change(screen.getByLabelText('色名を絞り込む'),{target:{value:'ゴールド'}});expect(screen.queryByRole('option',{name:'赤（2件）'})).toBeNull();
 fireEvent.change(screen.getByLabelText('色'),{target:{value:'ゴールド'}});expect(screen.getByRole('button',{name:'赤 gold'})).toBeTruthy();expect(screen.queryByRole('button',{name:'赤 pinkgold'})).toBeNull();
 fireEvent.change(screen.getByLabelText('色名を絞り込む'),{target:{value:''}});fireEvent.change(screen.getByLabelText('色'),{target:{value:'赤'}});fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'bead'}});fireEvent.change(screen.getByLabelText('パーツ検索'),{target:{value:'同じ'}});
 fireEvent.click(screen.getByRole('button',{name:'同じビーズ / 2mm'}));expect(add).toHaveBeenCalledWith(red);expect(choices.querySelectorAll('button')).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'wire'}});expect(screen.getByText(/該当するパーツがありません/)).toBeTruthy();expect((screen.getByLabelText('色') as HTMLSelectElement).value).toBe('赤');
});
it('resets pagination on colour change and includes missing colours explicitly',async()=>{
 render(<PartPicker parts={Array.from({length:201},(_,i)=>part(`item${i}`,'bead',i===200?{}:{color:'赤'}))} busy={false} onAdd={()=>{}}/>);
 fireEvent.click(screen.getByText('細かい色を指定する',{exact:true}));
 fireEvent.click(screen.getByRole('button',{name:/さらに100件/}));expect(screen.getByLabelText('パーツの候補').querySelectorAll('button')).toHaveLength(200);
 fireEvent.change(screen.getByLabelText('色'),{target:{value:'赤'}});expect(screen.getByLabelText('パーツの候補').querySelectorAll('button')).toHaveLength(100);
 fireEvent.change(screen.getByLabelText('色'),{target:{value:''}});expect(screen.getByRole('button',{name:'赤 item200'})).toBeTruthy();
});

it('offers one colour for G and S finishes but preserves both original selectable definitions',()=>{
 const add=vi.fn(),gold=part('g','bead',{name:'花　アメジスト/G / 4mm',sourceUrl:'https://kiwaseisakujo.jp/products/flower',widthMm:4,heightMm:4}),silver=part('s','bead',{name:'花　アメジスト/S / 6mm',sourceUrl:'https://kiwaseisakujo.jp/products/flower',widthMm:6,heightMm:6});
 render(<PartPicker parts={[silver,gold,part('ag','charm',{color:'AG'}),part('ar','charm',{color:'AR'})]} busy={false} onAdd={add}/>);
 fireEvent.click(screen.getByText('細かい色を指定する',{exact:true}));
 expect(screen.getByRole('option',{name:'アメジスト（2件）'})).toBeTruthy();expect(screen.queryByRole('option',{name:/アメジスト\/(G|S)/})).toBeNull();
 expect(screen.getByRole('option',{name:'金古美（アンティークゴールド）（1件）'})).toBeTruthy();expect(screen.getByRole('option',{name:'銀古美（アンティークシルバー）（1件）'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('色'),{target:{value:'アメジスト'}});fireEvent.click(screen.getByRole('button',{name:gold.name}));fireEvent.click(screen.getByRole('button',{name:silver.name}));expect(add.mock.calls.map(c=>c[0])).toEqual([gold,silver]);
 expect(screen.getByText(/AGは金古美/)).toBeTruthy();
});

it('starts with broad families and reveals optional shades, clearing stale detail on a family change',()=>{
 render(<PartPicker parts={[part('amethyst','bead',{color:'アメジスト'}),part('light','bead',{color:'Lt.アメジスト/G'}),part('blue','bead',{color:'サファイヤ'}),part('unknown','bead',{color:'独自色123'}),part('none')]} busy={false} onAdd={()=>{}}/>);
 const details=screen.getByText('細かい色を指定する',{exact:true}).closest('details')!;expect(details.open).toBe(false);expect(screen.getByRole('combobox',{name:'色のグループ'}).querySelectorAll('option').length).toBeLessThanOrEqual(14);
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'purple'}});expect(screen.getByLabelText('パーツの候補').querySelectorAll('button')).toHaveLength(2);
 fireEvent.click(screen.getByText('細かい色を指定する',{exact:true}));expect(screen.queryByRole('option',{name:'サファイヤ（1件）'})).toBeNull();fireEvent.change(screen.getByLabelText('色'),{target:{value:'アメジスト'}});expect(screen.getByLabelText('パーツの候補').querySelectorAll('button')).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'blue'}});expect((screen.getByLabelText('色') as HTMLSelectElement).value).toBe('all');expect(screen.getByRole('button',{name:'赤 blue'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'wire'}});expect(screen.getByText(/該当するパーツがありません/)).toBeTruthy();expect((screen.getByLabelText('色のグループ') as HTMLSelectElement).value).toBe('blue');
 fireEvent.change(screen.getByLabelText('カテゴリ'),{target:{value:'all'}});fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'other'}});expect(screen.getByRole('button',{name:'赤 unknown'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'unspecified'}});expect(screen.getByRole('button',{name:'赤 none'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'all'}});expect(screen.getByLabelText('パーツの候補').querySelectorAll('button')).toHaveLength(5);
});

it('excludes tinted transparent parts from clear while keeping them in their visible hue families',()=>{
 const emerald=part('emerald','bead',{color:'クリアエメラルド'}),blue=part('blue','bead',{color:'クリアブルー'}),clear=part('clear','bead',{color:'クリア'}),white=part('white','bead',{color:'ホワイト'});
 render(<PartPicker parts={[emerald,blue,clear,white]} busy={false} onAdd={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'clear'}});expect([...screen.getByLabelText('パーツの候補').querySelectorAll('button')].map(b=>b.getAttribute('aria-label')).sort()).toEqual(['赤 clear','赤 white']);
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'green'}});expect(screen.getByRole('button',{name:'赤 emerald'})).toBeTruthy();expect(screen.getByLabelText('パーツの候補').querySelectorAll('button')).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('色のグループ'),{target:{value:'blue'}});expect(screen.getByRole('button',{name:'赤 blue'})).toBeTruthy();
});
