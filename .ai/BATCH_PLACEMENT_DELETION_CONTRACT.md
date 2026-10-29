# 複数配置・一括削除の契約

2026-10-23。ユーザー要求: 複数個をまとめて配置/削除。一般登録は停止のまま。

- 同一node Partを1〜100個。初期は登録本体寸法の投影長に合わせたAuto間隔（隣接半幅合計、追加隙間0）、Manualで中心間隔mmを指定可能。写真余白・物理接触/接続/画像軸の保証なし。path素材は1本ずつ。[自動間隔/再ドラッグ](AUTO_SPACING_GUIDE_CONTRACT.md)を参照。
- 一時見本と確定は共通preparePlacement→proposeBatch→syncMirror→validate。primary/左右連動のghost IDは確定まで安定保持し、全追加分を見本表示する。左右連動先があれば合計個数を事前表示。
- ガイド吸着成立時は弧長で等間隔、任意の接線角＋画像補正。実接続候補はガイドより優先。ガイド不足/不正個数/間隔/重複IDは全件拒否し、端へ丸める/折り返す/重ねることはない。非吸着は配置角方向に一列。自動attachmentなし。
- 成功後のみhistory/dirty/復旧/保存へ1段階、mark_usedはPartにつき1回。取消は無書込。UNDOで一括復元。
- 配置済みnode/pathにtouch対応チェック、全選択/解除/選択数/一括削除。canvas Shiftはtoggleで解除したidを再選択しない。node群dragとpath群選択は分離。
- 削除は存在/重複/固定を確認、要求または左右連動相手が固定なら全件拒否。linked pairは既存同期が片側編集だけを受けるため入力をleft primaryへ正規化し、既存removeNode/removePath→syncMirrorに伝播を任せる。独立Mirrorは選択側のみ。参照/添付削除の意味を新設しない。
- 実ユーザーDesignの試験保存0、Part/Asset/source/registry変更0。前後の現在aggregate/metadata hashで保全。
- 独立確認で「鏡像が見本に出ない」「bulk時ガイドが実接続候補を上書き」の2件を修正。左右連動見本/確定個数一致と接続優先の回帰試験を追加。Sol Mediumを明示要求したがruntimeモデル/effortは非公開で確認済みとは扱わない。
- V字ガイドは「トップ構成の目安」と明示。物理シミュレーションではなく、専用トップ/接続部品を足さず普通のチェーンが鋭角で垂れることを保証しない。新規パーツの取り込みは行わない。
