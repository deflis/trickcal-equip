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
    priorityItemId: priorityItems[0]?.id,
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

      // 高ランク副産物を持つステージを優先するために小さなボーナスを加算
      // 係数は必要アイテムscoreを超えないよう十分小さく設定
      const BY_PRODUCT_WEIGHT = 0.01;
      const maxByProductRank = otherDrops.length > 0
        ? Math.max(...otherDrops.map(d => parseInt(d.id.charAt(0))))
        : 0;
      score += maxByProductRank * BY_PRODUCT_WEIGHT;

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
 * ビットマスクDPを使用して、最小ステージ数かつ高ワールドレベルの解を効率的に見つけます。
 */
export function calculateRecommendedRoute(
  availableStages: StageResult[]
): StageResult[] {
  const attainableItems = new Set<string>();
  availableStages.forEach(s => s.matchingItems.forEach(m => attainableItems.add(m.id)));

  if (attainableItems.size === 0) return [];

  const targetItems = Array.from(attainableItems);
  const n = targetItems.length;
  const allMask = (1 << n) - 1;

  // dp[mask] = そのアイテムの組み合わせをカバーする最小のステージリスト
  const dp = new Map<number, StageResult[]>();
  dp.set(0, []);

  // ステージごとにビットマスクを計算
  const stageData = availableStages.map(stage => {
    let mask = 0;
    stage.matchingItems.forEach(m => {
      const idx = targetItems.indexOf(m.id);
      if (idx !== -1) mask |= (1 << idx);
    });
    return { stage, mask };
  }).filter(s => s.mask > 0);

  // ステージを1つずつ考慮してDPテーブルを更新
  for (const { stage, mask: sMask } of stageData) {
    const currentEntries = Array.from(dp.entries());
    
    for (const [mask, route] of currentEntries) {
      const nextMask = mask | sMask;
      if (nextMask === mask) continue;

      const nextRoute = [...route, stage];
      const existingRoute = dp.get(nextMask);

      // 1. ステージ数が少ない
      // 2. ステージ数が同じならワールドレベルの合計が高い
      // 方を採用する
      if (!existingRoute || 
          nextRoute.length < existingRoute.length ||
          (nextRoute.length === existingRoute.length && 
           getRouteWorldLevel(nextRoute) > getRouteWorldLevel(existingRoute))) {
        dp.set(nextMask, nextRoute);
      }
    }
  }

  const bestRoute = dp.get(allMask) || [];

  return bestRoute
    .map(s => ({
      ...s,
      farmAmount: Math.max(...s.matchingItems.map(m => m.needed))
    }))
    .sort((a, b) => (b.worldLevel ?? 0) - (a.worldLevel ?? 0));
}

function getRouteWorldLevel(route: StageResult[]): number {
  return route.reduce((sum, s) => sum + (s.worldLevel ?? 0), 0);
}
