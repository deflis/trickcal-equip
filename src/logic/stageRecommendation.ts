import { BLUEPRINTS } from "../blueprints";
import { STAGES } from "../stages";
import type { StageResult, MatchingItem, OtherDrop, ShortageMap } from "../types";

const blueprintMap = new Map(BLUEPRINTS.map(b => [b.id, b]));

export function getCombinationKey(items: MatchingItem[]): string {
  return items.map(m => m.id).sort().join(',');
}

function addPriorityInfo(result: StageResult): StageResult {
  if (result.matchingItems.length === 0 || result.priorityItemId) return result;

  // 1. 最高ランクを特定
  const maxRank = Math.max(...result.matchingItems.map(mi => parseInt(mi.id.charAt(0))));

  // 2. 最高ランクのアイテム群の中で、最小の必要数を特定
  const maxRankItems = result.matchingItems.filter(mi => parseInt(mi.id.charAt(0)) === maxRank);
  const minNeededOfMaxRank = Math.min(...maxRankItems.map(mi => mi.needed));

  // 3. 優先アイテム（そのステージで集めるべきターゲット）を特定（タイの場合は先頭を採用）
  const priorityItems = maxRankItems.filter(mi => mi.needed === minNeededOfMaxRank);

  return {
    ...result,
    priorityItemId: priorityItems.length === 1 ? priorityItems[0].id : undefined,
    minNeededOfMaxRank
  };
}

/**
 * 到達可能なステージの中から、不足素材をドロップするステージをすべて抽出し、スコア順にソートして返します。
 */
export function getAvailableStageResults(
  shortages: ShortageMap,
  maxWorld: number,
  maxStageNum: number
): StageResult[] {

  return STAGES
    .filter(stage => {
      const [world, num] = stage.id.split('-').map(Number);
      return world < maxWorld || (world === maxWorld && num <= maxStageNum);
    })
    .map(stage => {
      const matchingItems: MatchingItem[] = [];
      const otherDrops: OtherDrop[] = [];
      let score = 0;

      stage.drops.forEach(dropId => {
        const needed = shortages.get(dropId);
        if (needed) {
          score += needed;
          matchingItems.push({
            id: dropId,
            name: blueprintMap.get(dropId)?.name,
            needed
          });
        } else {
          otherDrops.push({
            id: dropId,
            name: blueprintMap.get(dropId)?.name
          });
        }
      });

      if (matchingItems.length === 0) return null;

      const [w, n] = stage.id.split('-').map(Number);
      return addPriorityInfo({
        id: stage.id,
        score,
        matchingItems,
        otherDrops,
        worldLevel: w * 100 + n
      } as StageResult);
    })
    .filter((s): s is StageResult => s !== null)
    .sort((a, b) => 
      b.matchingItems.length - a.matchingItems.length || 
      b.score - a.score || 
      (b.worldLevel ?? 0) - (a.worldLevel ?? 0)
    );
}

/**
 * 与えられた候補ステージの中から、すべての不足素材を最小限のステージ数でカバーする最適なルートを計算します。
 *
 * アルゴリズム: ビットマスクDP（集合被覆問題）
 *   各素材にビット位置を割り当て、「どの素材がカバーできたか」を整数1つで表現する。
 *   dp[mask] = maskのビットに対応する素材をすべてカバーできるステージの最小リスト
 *   全素材がカバーできた状態（allMask）の dp エントリが最終解となる。
 *
 * 優先基準（同じmaskへ複数の経路がある場合）:
 *   1. ステージ数が少ない方
 *   2. 同数ならワールドレベル合計が高い方（高難度ステージ優先 = 効率が良い傾向）
 */
export function calculateRecommendedRoute(
  availableStages: StageResult[]
): StageResult[] {
  // 候補ステージから入手可能な素材IDを列挙する
  const attainableItems = new Set<string>();
  availableStages.forEach(s => s.matchingItems.forEach(m => attainableItems.add(m.id)));

  if (attainableItems.size === 0) return [];

  // 素材IDに 0..n-1 のインデックスを割り当てる（ビット位置として使用）
  const targetItems = Array.from(attainableItems);
  const n = targetItems.length;
  // 全素材がカバーされた状態を表すビットマスク（n ビットすべて1）
  const allMask = (1 << n) - 1;

  // dp[mask] = そのビットマスクに対応する素材をカバーする最小ステージリスト
  const dp = new Map<number, StageResult[]>();
  dp.set(0, []); // 初期状態: 何もカバーしていない

  // 各ステージが「どの素材をカバーするか」をビットマスクで事前計算する
  const stageData = availableStages.map(stage => {
    let mask = 0;
    stage.matchingItems.forEach(m => {
      const idx = targetItems.indexOf(m.id);
      if (idx !== -1) mask |= (1 << idx); // 対応ビットを立てる
    });
    return { stage, mask };
  }).filter(s => s.mask > 0);

  // ステージを1つずつ考慮してDPテーブルを更新する
  for (const { stage, mask: sMask } of stageData) {
    // イテレーション中に dp を変更すると無限ループになるためスナップショットを取る
    const currentEntries = Array.from(dp.entries());

    for (const [mask, route] of currentEntries) {
      const nextMask = mask | sMask; // このステージを追加した場合の新しいカバー状態
      if (nextMask === mask) continue; // 新たにカバーできる素材がなければスキップ

      const nextRoute = [...route, stage];
      const existingRoute = dp.get(nextMask);

      // より良い経路（ステージ数少 > ワールドレベル合計高）であれば更新する
      if (!existingRoute ||
          nextRoute.length < existingRoute.length ||
          (nextRoute.length === existingRoute.length &&
           getRouteWorldLevel(nextRoute) > getRouteWorldLevel(existingRoute))) {
        dp.set(nextMask, nextRoute);
      }
    }
  }

  // 全素材をカバーする最適ルートを取得（到達不能なら空配列）
  const bestRoute = dp.get(allMask) || [];

  return bestRoute
    // farmAmount: そのステージで最も必要数が多いアイテムの数 = 最低限の周回数の目安
    .map(s => ({
      ...s,
      farmAmount: Math.max(...s.matchingItems.map(m => m.needed))
    }))
    .sort((a, b) => (b.worldLevel ?? 0) - (a.worldLevel ?? 0));
}

function getRouteWorldLevel(route: StageResult[]): number {
  return route.reduce((sum, s) => sum + (s.worldLevel ?? 0), 0);
}
