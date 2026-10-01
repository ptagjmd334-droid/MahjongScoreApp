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
3. v120: red-five field repair. ✅
   - 実機で確認した赤5筒→赤5索の誤分類を、周辺の並びと赤インク量で保守的に補正
   - 普通5と赤5をduplicate見た目比較で混同しないようraw labelを分離
   - 赤5索が普通5索へ落ちるケースも赤インク量でaka metadataへ復元
4. v121: redInkShare runtime hotfix. ✅
   - YOLO crop経路の未定義変数で全14枚fallbackする実機回帰を修正
   - Chromiumで対象helperを直接実行する回帰テストを追加
5. v122 next: camera meld/kan support.
   - チー / ポン / 明槓 / 暗槓（可能なら加槓）
   - 横向き牌・4枚組などを手牌本体と別領域として扱う
   - 既存の m8MeldStateV21（pon / minkan / ankan）へ接続
6. Final ideal: shutterless auto-freeze.
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


## MAKI v123 Recognition Benchmark（2026-10-01）

14枚認識の次段階は、症状ごとの追加thresholdより先に「同じ実写caseで改善前後を比較できる状態」を作る。

### v123
- 認識ロジック自体は原則変更しない。
- シャッター直前の白枠内生フレームを保存。
- detector raw boxes / Top1・Top2 / class margin / cross-view / 15→14・13→14等の選択理由を保存。
- 結果画面の14crop、最終自動判定、赤5raw metadataを保存。
- ユーザー手修正後の14牌をground truthとして同じcaseへ追記。
- IndexedDBへ最大50case保持し、現在caseまたはログ一覧をJSON共有可能にする。

### v124以降
1. v123 case群でv122相当のbaselineを固定する。
2. threshold / sorted-suit guard等を1変更ずつoffline A/B比較する。
3. capture quality（blur / exposure / tile size / geometry）と失敗率の相関を記録する。
4. 同一caseでYOLO11n / 11s、MAKI実機fine-tuneを比較する。
5. 必要なら現行boxを固定したまま専用classifierを追加し、二段階方式を比較する。
6. 固定画像精度が十分高くなった後で temporal stability を使うAuto-freezeへ進む。

主指標はTop3ではなく、14枚exact Top1、自動確定precision/recall、誤自動確定率、平均手修正枚数、複数撮影の再現性とする。


## MAKI v124 Benchmark-driven safety（2026-10-01）

v123の実機9ケースを最初の固定ベンチマークとして利用し、認識モデルを交換する前にsilent false positiveを減らす。

- confirmed 5ケースの手修正をground truthとして利用。
- 4萬→2萬/8萬の再現confusionはrunner/margin/cross-view shareで安全側へabstain。
- 赤5萬→raw 0pはraw detector classを保存したまま、既存context repairで解決できない局面を要確認へ回す。
- v123 loggerの先頭slot null化を修正し、confirmed保存をmaki:verified-handでも補強。
- iPhoneで共有しやすいようbenchmark indexのJSON本文コピーを追加。
- DB名はv123のまま維持し、既存実機caseをv124以降も継続利用する。

次はv124後の同じ牌姿/条件で、silent誤確定率と要確認増加量を比較する。改善が確認できたらcapture quality診断、モデルfine-tune、二段階classifier比較へ進む。
