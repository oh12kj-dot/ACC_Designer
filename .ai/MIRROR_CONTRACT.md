# Mirror 最小 Design Contract（v1.4 §15 補足案）

状態: **実装契約（Geometry Adapterから着手）**。基本・詳細設計 v1.4 §15 の公開型と Mirror Policy を維持する。ここでの設計判断は実装承認や製品上の例外承認を意味しない。既存 `.ai/PATH_CONTRACT.md` の非垂直 Path 規約を前提とし、垂直 U/V の判断は pending のままとする。

## 欠落している正データと保存先

`DesignNode` に反転 flag はなく、`scaleX/Y` は実寸補正であり DB は `>0` を要求する。右側であること、MirrorLink の存在、現在の Part policy から画像・局所点・穴の反転を推定してはならない。Linked → Independent で Link が消え、Part が後継化されても、既存 Node の見た目と接続幾何を保つためである。

公開型と表を増やさず、`design.editorConfig` / `designs.editor_config` の versioned namespace を Design 単位の正データとする。保存時の最小形は次の通り。

```json
{
  "mirror": {
    "version": 1,
    "nodeFlipX": { "node-uuid": true },
    "groups": {
      "group-uuid": {
        "axisX": 50,
        "mode": "linked",
        "left": { "nodeIds": ["node-uuid"], "pathIds": ["path-uuid"] },
        "right": { "nodeIds": ["node-uuid"], "pathIds": ["path-uuid"] }
      }
    }
  }
}
```

- `nodeFlipX[id] === true` のときだけ、その Node の**画像と Part ローカル Geometry を一緒に**水平反転する。未記載は `false`。値は boolean のみ、存在する Node ID のみを許す。削除時に消し、Part 変更時には既存 Node の反転を維持する。Part データや画像 asset、接続点・穴の ID / 順序は変更しない。
- `groups[groupId].axisX` は有限 mm、`mode` は `linked | independent`。`left/right` はその側を構成する Node/Path の ID 集合で、片側再生成時に削除する範囲も決める。Attachment は両端の Node/Path から所属側を導く。跨側接続や所属不明は自動 Mirror / 再生成の対象にせず、検証失敗とする。集合は対応ペアではない。**Entity の左右対応の正データは引き続き MirrorLink のみ**とする。
- Linked の group ID は `mirror_group_id` と一致し、各 Link の left/right Entity は対応する側に所属する。Independent では当該 Link はゼロだが group・側集合・`nodeFlipX` は残る。group/Node/Path の削除・追加・ID 置換はこれらを同一 Command 内で更新し、孤児 ID や二重所属を拒否する。非 Mirror の Design は `mirror` namespace 欠落を空状態として読める。Link があるのに group/axis が欠落した既存データは推定修復せず保存・同期を拒否する。
- `manualMirrorPolicy` は Linked 中の Node Link にだけ置く現行仕様を維持する。Independent 後の見た目は `nodeFlipX` が保持する。再 Linked 化では基準側を選んで反対側を再生成し、manual Part には新しい選択を求めて新 Link に記録する。旧 Link の方針を座標や現在の Part から逆推定しない。

## Geometry Adapter と接続解決

局所反転 `F(x,y)=(-x,y)` を画像・Port・穴・外形計算の共通 Adapter に一度だけ適用する。Node 中心 `c`、回転 `θ`、正の補正 scale `S`、Part 局所点 `p` の world 位置は `c + R(θ) S F^flip(p)`。正規化座標なら flip 時 `xNorm'=1-xNorm`、`yNorm'=yNorm`、局所方向・穴軸は `normalizeDeg(180-angle)`、entry/exit はそれぞれ反転して ID と役割を保つ。画像 renderer、`normalizedPointToWorld` / `connectionPointWorld` / `throughHoleWorld`、`pointSnapPose`、`throughPose`、`pathAnchorPose`、占有投影、`resolvePoses` が同じ effective Geometry を用いる。Part の原定義をその場で書き換えない。

鏡映 `M(x,y)=(2 axisX-x,y)` は中心・Path 端点に適用し、Node 回転は `normalizeDeg(360-θ)`。`mirror_image` は対象 Node の `flip` を反転し、`keep_orientation` は同じ `flip` を維持する。これで `mirror_image` は `M(c+R(θ)SF^flip(p)) = M(c)+R(-θ)SF^(not flip)(p)` が成り立つ（S は各軸正値）。`keep_orientation` は非対称 Part の厳密鏡像ではない。左右いずれを起点にしても同じ policy を使い、二度の変換で Node 値と flip が戻る。

Attachment は同じ Part point/hole ID と対応 Node/Path ID で clone する。`mirror_image` の局所点・穴・方向には effective Geometry を使い、世界位置・方向の鏡映、Through の穴中心・占有区間、Path anchor を再解決する。`keep_orientation` で非対称な点・穴が鏡映済み中心/回転と一致しない場合、反対側の Node だけをずらす・回す、接続 ID を勝手に変える、残差を黙認する、という補正はしない。Composite 全体を検証失敗として元に戻す。接続を外すか別 Part/Policy を選ぶ操作は明示的なユーザー操作とする。接続互換性、上限、複数拘束、穴占有も左右それぞれで検証する。

## Command、保存、受入条件

- 初回生成: 軸・側所属を作成し、deep clone の ID map、effective policy、Node flip、全 Entity Link を一つの Composite に確定する。`manual` は選択が揃うまで確定しない。
- 双方向編集: 操作対象の所属側を確定し、Link で相手を探し、同一論理操作を鏡映する。Add/Delete/ChangePart/Attachment/Path/Z 順も、Link と側集合・flip を同時更新する。Link の無い Entity、重複対応、同時に両側を直接編集する操作、軸をまたぐ所属変更は拒否または明示的な group 操作とする。反射で生じた Command は再度 Mirror 発火させない。
- Linked → Independent: 現在の左右 Node/Path/Attachment と `nodeFlipX`・axis・側所属を残し、対象 Link を同じ履歴スナップショットから全削除して mode を変更する。以降は片側だけ編集する。Independent → Linked は選択した基準側を残し、反対側所属の Attachment → Node/Path を削除し、再 clone・新 Link・新 flip を一つの Composite にする。自動マージしない。
- `resolvePoses` は鏡映済みの全拘束を解決後、Mirror invariant と幾何残差を再検証する。Linked の完全 snapshot、Undo/Redo、auto save、recovery、reload は `editorConfig.mirror` と Link を常に一体で扱う。Save RPC は現在非空 Mirror を拒否するので、解除時には JSON 構造・ID 整合・Link 対応と flip/axis/group の必須性を原子的に検証する。JSON のみの孤児状態や revision 競合は失敗させる。
- 最小検証: 非対称画像・偏心 Port/穴で `mirror_image` の画像/Port/穴 world 鏡像と二重変換の復元、`keep_orientation` の画像維持と接続不整合時の全体拒否、左右両起点の Add/Move/Part変更/Delete、Path/Through/Point/PathAttachment と占有、単一 Undo/Redo、Independent 切替後の保存・再読込・個別編集、再 Linked 時の選択側からの再生成、欠落/孤児/重複 JSON と Link の拒否を確認する。非垂直 Path の法線・距離規約は `.ai/PATH_CONTRACT.md` を参照し、垂直 U/V は別判断を待つ。

製品判断が必要になる境界: `keep_orientation` の非対称 Part を接続したまま、左右の中心/回転も維持して常に同期可能にする要件は両立しない。上記は「不整合なら拒否」を推奨する最小契約であり、Port 自動再割当や Node pose の逸脱を望むなら §15 の仕様変更と独立した承認が必要である。

依頼されたモデル/effort: spawn callで `gpt-6-sol` / `medium` を明示指定。実際の runtime model/effort: 確認手段がないため未確認。
