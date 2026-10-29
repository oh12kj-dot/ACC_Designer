import type {PickerEntry} from './picker';
/** Presentation filters only. These never change category, identity or purchase data. */
const rules:readonly [string,string,RegExp][]=[
 ['czech-fire','チェコ・ファイヤーポリッシュ',/チェコ.*ファイヤー|ファイアーポリッシュ/],
 ['czech-press','チェコ・プレスビーズ',/チェコ.*(?:プレス|ダガー|ドロップ|フラワー|リーフ)/],
 ['czech','チェコ・その他',/チェコ/],
 ['crystal-pearl','クリスタルパール',/クリスタル.*(?:パール|#58[0-9]+)/],
 ['crystal-top','クリスタル・ペンダント',/クリスタル.*(?:#6[0-9]{3}|ペンダント)/],
 ['crystal-cut','クリスタル・ソロバン',/クリスタル.*(?:#5328|ソロバン)/],
 ['crystal','クリスタル・その他',/クリスタル/],
 ['seed','シード・丸小・丸大ビーズ',/丸小|丸大|特小|デリカ|シード|TOHO|MIYUKI/i],
 ['cotton-pearl','コットンパール',/コットンパール/],
 ['resin-pearl','樹脂パール',/樹脂パール/],
 ['pearl','パール・その他',/パール|真珠/],
 ['acrylic','アクリル・樹脂',/アクリル|樹脂/],
 ['glass','ガラス',/ガラス/],
 ['letters','イニシャル・数字',/イニシャル|ナンバー|アルファベット/],
 ['flower','花・植物モチーフ',/フラワー|リーフ|花|葉|ローズ/],
 ['heart','ハートモチーフ',/ハート/],
 ['star','星・月モチーフ',/スター|星|ムーン|月/],
];
export function pickerKind(entry:PickerEntry){
 const name=entry.family.normalize('NFKC'),found=rules.find(([, ,pattern])=>pattern.test(name));
 if(found)return{id:found[0],label:found[1]};
 const category=entry.part.category;
 const fallback:Record<string,string>={chain:'チェーン',wire:'ワイヤー',string:'テグス',cord:'コード',thread:'糸',gem:'天然石・その他の石',bead:'その他のビーズ',charm:'その他のチャーム',pendant:'その他のトップ',jump_ring:'丸カン',eye_pin:'9ピン',head_pin:'Tピン',earring_hook:'ピアスフック',earring_post:'ピアスポスト',clasp:'留め具',connector:'つなぎ金具',cap:'キャップ',spacer:'スペーサー'};
 return{id:fallback[category??'']?`category:${category}`:'unclassified',label:fallback[category??'']??'その他・未分類'};
}
