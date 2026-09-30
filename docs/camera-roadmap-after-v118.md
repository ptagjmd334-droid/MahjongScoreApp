# MAKI camera roadmap after v118

## Fixed priority
1. v118: manual dora foundation first.
   - ドラ / 赤ドラ / 裏ドラの手動入力
   - 役別翻数・合計翻数・点数表推薦へ接続
   - ドラだけでは役扱いにしない
   - 将来のカメラ結果は同じ state/API へ流す
2. v119: camera dora support. ✅
   - 手牌カメラのYOLO raw class `0m / 0p / 0s` を保持し、通常5へ正規化しつつ赤ドラ数を自動反映
   - 点数画面に「📷 表示牌」カメラを追加
   - ドラ表示牌を認識し、数牌循環・風牌循環・三元牌循環で実ドラへ変換
   - 複数の表示牌を保持し、登録済み14枚からドラ枚数を自動集計
   - v118の +/- 手動修正 fallback は維持
3. v120 next: camera meld/kan support.
   - チー / ポン / 明槓 / 暗槓（可能なら加槓）
   - 横向き牌・4枚組などを手牌本体と別領域として扱う
   - 既存の m8MeldStateV21（pon / minkan / ankan）へ接続
4. Final ideal: shutterless auto-freeze.
   - カメラをかざして、14枚の配置が一定時間安定したら自動で1フレームを凍結
   - 凍結した瞬間にライブ映像を停止/暗転し、その保存フレームだけで認識を続行
   - 暗転後はスマホを牌から離してよい状態にする
   - 安定判定が弱い場合は自動撮影しない
   - 現行の手動シャッターは必ず fallback として残す

## Auto-freeze technical direction
The target behavior is feasible because recognition does not need the camera to stay pointed at the tiles after a source frame has been copied into a canvas/ImageBitmap. The safe implementation is:
- live preview
- geometry/stability watch
- stable trigger
- copy frame to immutable buffer
- stop MediaStream tracks immediately
- dark/frozen UI state
- run detector/classifier on the buffered frame
- show 14-tile review result

This keeps the current precision-first policy: auto-freeze is allowed only when capture readiness is sufficiently reliable; otherwise the user can still press the shutter manually.
