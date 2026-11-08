# 全Part精査・数値取得計画（2026-11-07）

対象は有効19,611件。全Part19,647／Asset20,585／Design3、登録対象未登録0。正本 `.local/setup/all-parts-review-20261106/review-ledger.json` / `current-verification.json`。旧部分集合7,424や旧20,066を未登録件数へ転用しない。

更新したPartは重複を除いて1,744件。工程別（工程間の重複あり）: 訂正75、メーカー寸法545、仕入先寸法185、穴サイズ参考値311、接続材料案内215、意味未確定のチェーン原文ラベル415。各first/rerun0/読戻し/保全済み。全19,611の掲載束縛一致、952警告/833購入計算保留。過去写真審査483全出力/94highのみは今回の目視158と別管理。

1. 原/加工写真の未実施19,453件を精査。過去審査と現在source/Asset/変換/bytesが一致する工程は再利用し、集合写真・比較写真・単体外形・背景・variant/サイズ・向きを区別する。
2. メーカー寸法表/品番別図面・本文明示値を商品群単位に取得。外径/軸長/線径/幅/厚み/穴/適合推奨/販売長を区別し、選択variantの行を採用する。チェーン415件は意味未確定を維持し、ラベルだけで線材径や玉径へ昇格しない。
3. TOHO3件の矛盾は2026-11-07公式API再取得でも継続。正しいproduct/variant/SKUを固定した証拠は `.local/setup/toho-conflicts-20261107/review.json`。SKUに結び付く独立根拠なしに自動解消しない。
4. 掲載差分/購入意味/穴・接続不足を種類別に確認する。SKU/入数変更で旧Part/Designを置換せず、404を販売終了と断定しない。物理計測なしでphysical verifiedにしない。
5. 全19,611の必要評価/目視の未実施0・根拠失効0・残課題分類済みとなるまで全件精査完了と報告しない。取得可能な公表数値調査を、独立実測がないことを理由に止めない。

掲載sidecarのportable backup自動同梱は実装・隔離検証済み。v3/v2/v1と限界はPORTABLE_SUPPLIER_REVIEW_CONTRACT.md。公式DBに対する元registry/catalog/販売方針の要件は維持する。

現在baseline/new scope、単一writer/正規RPC/CAS/first/rerun0/readback/対象外行・旧Asset・全Design保全。旧writer再起動禁止。3000既存devを保持、別processで実DBを開かない。旧worker/自動監視PAUSED、Supabase0、旧negative/意味hold/失敗crop保持。時間・任意件数で停止/続行確認しない。
