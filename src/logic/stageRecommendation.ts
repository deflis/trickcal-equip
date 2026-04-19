import { rangeIterator } from "../data/array";
import { BLUEPRINTS } from "../data/blueprints";
import { STAGES_BY_WORLD } from "../data/stages";
import { type StageResult, type MatchingItem, type OtherDrop, type ShortageMap, type BlueprintId, type Blueprint, MIN_WORLD, MAX_WORLD, type Stage, type World, type WorldLevel } from "../data/types";

// --- 事前計算セクション ---

/**
 * IDからアイテム情報を即座に取得するためのMap
 */
export const BLUEPRINT_MAP = new Map<BlueprintId, Blueprint>(
  BLUEPRINTS.map(b => [b.id, b])
);

/**
 * ステージ情報を最適化したメタデータとインデックス
 */
export const { STAGE_METADATA, STAGE_MAP, ITEM_TO_STAGES } = (() => {
  const metadata: (Stage & { 
    id: `${World}-${WorldLevel}`, world: World, level: WorldLevel, dropSet: Set<BlueprintId> 
  })[] = [];
  const stageMap = new Map<`${World}-${WorldLevel}`, typeof metadata[number]>();
  const itemToStages = new Map<BlueprintId, `${World}-${WorldLevel}`[]>();

  for (const world of rangeIterator(MIN_WORLD, MAX_WORLD)) {
    for (const level of rangeIterator(1, 10)) {
      const id = `${world}-${level}` as const;
      const stageData = STAGES_BY_WORLD[world][level];

      const stage = {
        ...stageData,
        id,
        world,
        level,
        dropSet: new Set(stageData.drops)
      };

      metadata.push(stage);
      stageMap.set(id, stage);

      stageData.drops.forEach(dropId => {
        const stageIds = itemToStages.get(dropId) || [];
        stageIds.push(id);
        itemToStages.set(dropId, stageIds);
      });
    }
  }

  return { 
    STAGE_METADATA: metadata, 
    STAGE_MAP: stageMap, 
    ITEM_TO_STAGES: itemToStages 
  };
})();

export function getCombinationKey(items: MatchingItem[]): string {
  return items.map(m => m.id).sort().join(',');
}

/**
 * ワールド番号とステージ番号から、比較・ソート用の数値を算出します。
 */
export function calculateWorldLevel(world: number, level: number): number {
  return world * 100 + level;
}

/**
 * ステージ ID ("13-1") を比較可能な数値 (1301) に変換します。
 */
export function getStageSortValue(id: `${number}-${number}`): number {
  const [world, level] = id.split('-').map(Number);
  return calculateWorldLevel(world, level);
}

/**
 * 同じ素材の組み合わせを持つステージ群から、最もワールドレベルが高いものだけを残します。
 */
export function deduplicateStages(stages: StageResult[]): StageResult[] {
  const uniqueMap = new Map<string, StageResult>();
  stages.forEach(stage => {
    const key = getCombinationKey(stage.matchingItems);
    if (key === "") return;

    const existing = uniqueMap.get(key);
    if (!existing || getStageSortValue(stage.id) > getStageSortValue(existing.id)) {
      uniqueMap.set(key, stage);
    }
  });
  return Array.from(uniqueMap.values());
}

/**
 * ステージをワールドレベル（進行度）の降順でソートします。
 */
export function sortStages(stages: StageResult[]): StageResult[] {
  return stages.toSorted((a, b) => getStageSortValue(b.id) - getStageSortValue(a.id));
}

function addPriorityInfo(result: Omit<StageResult, 'priorityItemId'>): StageResult {
  if (result.matchingItems.length === 0) return result;

  // 1. 最高ランクを特定
  const maxRank = Math.max(...result.matchingItems.map(mi => parseInt(mi.id.charAt(0))));

  // 2. 最高ランクのアイテム群の中で、最小の必要数を特定
  const maxRankItems = result.matchingItems.filter(mi => parseInt(mi.id.charAt(0)) === maxRank);
  const minNeededOfMaxRank = Math.min(...maxRankItems.map(mi => mi.needed));

  // 3. 優先アイテム（そのステージで集めるべきターゲット）を特定
  const priorityItems = maxRankItems.filter(mi => mi.needed === minNeededOfMaxRank);

  return {
    ...result,
    priorityItemId: priorityItems.length === 1 ? priorityItems[0].id : undefined
  };
}

/**
 * 到達可能なステージの中から、不足素材をドロップするステージをすべて抽出して返します。
 * ソートは行いません。呼び出し側で必要に応じてソートしてください。
 */
export function getAvailableStageResults(
  shortages: ShortageMap,
  maxWorld: number,
  maxStageNum: number
): StageResult[] {
  // 不足素材をドロップする「可能性がある」ステージIDを収集
  const candidateStageIds = new Set<string>();
  for (const itemId of shortages.keys()) {
    const stages = ITEM_TO_STAGES.get(itemId);
    if (stages) {
      stages.forEach(id => candidateStageIds.add(id));
    }
  }

  const maxWorldLevel = calculateWorldLevel(maxWorld, maxStageNum);

  // 候補ステージに対してのみ詳細な計算を行う
  return Array.from(candidateStageIds)
    .map(id => STAGE_MAP.get(id as StageResult['id'])!)
    .filter(stage => calculateWorldLevel(stage.world, stage.level) <= maxWorldLevel)
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
            name: BLUEPRINT_MAP.get(dropId)?.name,
            needed
          });
        } else {
          otherDrops.push({
            id: dropId,
            name: BLUEPRINT_MAP.get(dropId)?.name
          });
        }
      });

      return addPriorityInfo({
        id: stage.id,
        score,
        matchingItems,
        otherDrops
      });
    });
}

/**
 * 与えられた候補ステージの中から、すべての不足素材を最小限のステージ数でカバーする最適なルートを計算します。
 *
 * アルゴリズム: ビットマスクDP（集合被覆問題） または 貪欲法（Greedy）
 *   - 素材の種類数が少ない場合（16種類以下）:
 *     ビットマスクDPを用いて、全素材をカバーする「理論上の最短（最小ステージ数）かつ最高効率」のルートを計算します。
 *     各素材にビット位置を割り当て、「どの素材がカバーできたか」を整数1つで表現します。
 *   - 素材の種類数が多い場合（17種類以上）:
 *     計算量が指数関数的に増大（2^n）するため、貪欲法に切り替えて、実用的な時間で近似解を求めます。
 *
 * 優先基準（同じカバー状態へ複数の経路がある場合）:
 *   1. ステージ数が少ない方（スタミナ効率）
 *   2. 同数ならワールドレベル合計が高い方（高難度ステージ優先 = 効率が良い傾向）
 */
export function calculateRecommendedRoute(
  availableStages: StageResult[]
): StageResult[] {
  // 1. 重複を解除 (計算量を減らすため、各組み合わせで最もワールドレベルが高いものだけを残す)
  const filteredStages = deduplicateStages(availableStages);

  // 候補ステージから入手可能な素材IDを列挙する
  const attainableItems = new Set<string>();
  filteredStages.forEach(s => s.matchingItems.forEach(m => attainableItems.add(m.id)));

  if (attainableItems.size === 0) return [];

  // 素材IDに 0..n-1 のインデックスを割り当てる（ビット位置として使用）
  const targetItems = Array.from(attainableItems);
  const n = targetItems.length;
  
  // 素材数が多い場合は計算時間の増大を防ぐため貪欲法に切り替える（2^16 = 65536 通りの状態までを許容）
  if (n > 16) {
    return calculateGreedyRoute(filteredStages, targetItems);
  }

  // 全素材がカバーされた状態を表すビットマスク（n ビットすべて1）
  const allMask = (1 << n) - 1;

  /**
   * dp[mask] = そのビットマスクに対応する素材をカバーするための最適ノード
   * メモリ効率（GC負荷軽減）のため、ルート全体の配列を保持するのではなく、
   * 1つ前の状態（parentMask）とその時に使用したステージ（stage）のみを保持し、後で復元する
   */
  type DPNode = {
    count: number;           // 使用した合計ステージ数
    totalLevelValue: number; // ワールドレベル数値の合計（優先順位の判定に使用）
    parentMask: number;      // 遷移前のビットマスク
    stage: StageResult | null;  // この遷移（エッジ）で使用したステージ
  };
  const dp = new Map<number, DPNode>();

  // 各ステージが「どの素材をカバーするか」をビットマスクで事前計算する
  const targetMap = new Map(targetItems.map((id, i) => [id, i]));
  const stageData = filteredStages.map(stage => {
    let mask = 0;
    stage.matchingItems.forEach(m => {
      const idx = targetMap.get(m.id);
      if (idx !== undefined) mask |= (1 << idx); // 対応する素材のビットを立てる
    });
    return { stage, mask };
  }).filter(s => s.mask > 0);

  // 初期状態: 何もカバーしていない（マスク0）
  dp.set(0, { count: 0, totalLevelValue: 0, parentMask: -1, stage: null });

  // ステージを1つずつ考慮してDPテーブルを更新する
  for (const { stage, mask: sMask } of stageData) {
    // マップを反復しながら追加すると無限ループになるため、現在のエントリのスナップショットを取る
    const currentEntries = Array.from(dp.entries());

    for (const [mask, node] of currentEntries) {
      const nextMask = mask | sMask; // 現在の状態にこのステージを追加した後のカバー状態
      if (nextMask === mask) continue; // 新たにカバーできる素材がなければ計算をスキップ

      const nextCount = node.count + 1;
      const nextLevelValue = node.totalLevelValue + getStageSortValue(stage.id);
      const existing = dp.get(nextMask);

      // より良い経路（1. ステージ数が少ない、2. ワールドレベル合計が高い）が見つかれば更新する
      if (!existing ||
          nextCount < existing.count ||
          (nextCount === existing.count && nextLevelValue > existing.totalLevelValue)) {
        dp.set(nextMask, {
          count: nextCount,
          totalLevelValue: nextLevelValue,
          parentMask: mask,
          stage
        });
      }
    }
  }

  // 最適ルートの復元: 全カバー状態（allMask）から parentMask を辿って逆順にステージを取り出す
  const bestRoute: StageResult[] = [];
  let curr = allMask;
  while (curr > 0) {
    const node = dp.get(curr);
    if (!node || !node.stage) break;
    bestRoute.push(node.stage);
    curr = node.parentMask;
  }

  // 抽出したステージ群を整形して返す
  return finalizeRoute(bestRoute, filteredStages);
}

/**
 * 貪欲法（Greedy Algorithm）による近似解の計算
 *
 * 素材数が多くDP（全探索）が困難な場合に、以下の基準で1ステージずつ選択します：
 * 1. まだカバーされていない素材を最も多く含むステージを優先
 * 2. カバー数が同じなら、より高難度（ワールドレベルが高い）ステージを優先
 *
 * これにより、厳密な最短ではないものの、実用上十分な効率のルートを高速に構築し、UIのフリーズを防ぎます。
 */
function calculateGreedyRoute(
  availableStages: StageResult[],
  targetItems: string[]
): StageResult[] {
  const route: StageResult[] = [];
  let remaining = new Set(targetItems); // まだカバーされていない素材のセット

  // 各ステージが持つ素材のIDセットを事前計算
  const stageData = availableStages.map(stage => ({
    stage,
    itemIds: new Set(stage.matchingItems.map(m => m.id))
  }));

  // すべての素材がカバーされるまで繰り返す
  while (remaining.size > 0) {
    let bestStage: StageResult | null = null;
    let maxCover = 0;
    let maxWorldLevelValue = -1;

    for (const { stage, itemIds } of stageData) {
      // このステージを追加することで、未カバーの素材がいくつ解決されるか
      let coverCount = 0;
      itemIds.forEach(id => {
        if (remaining.has(id)) coverCount++;
      });

      // 最も多く素材をカバーし、かつ難易度が高いステージを選ぶ
      const currentLevelValue = getStageSortValue(stage.id);
      if (coverCount > maxCover || (coverCount === maxCover && currentLevelValue > maxWorldLevelValue)) {
        maxCover = coverCount;
        maxWorldLevelValue = currentLevelValue;
        bestStage = stage;
      }
    }

    if (!bestStage || maxCover === 0) break;

    route.push(bestStage);
    // 解決された素材を残りリストから削除
    bestStage.matchingItems.forEach(m => remaining.delete(m.id));
  }

  return finalizeRoute(route, availableStages);
}

/**
 * 決定されたステージ群に対して、周回順序の整理と必要数のシミュレーションを行います。
 *
 * 1. 高難度ステージから順に周回するよう並べる（上位素材のついでに下位が集まる効率を最大化）
 * 2. 周回後に残数を更新することで「過剰周回」を防止するシミュレーションを実行
 *
 * 例: 13-1 は Rank4.boot(必要10) と Rank5.sword(必要2) を同時ドロップする。
 *     優先ターゲット(Rank5.sword)の必要数2を基準に周回するため、Rank4.bootも同時に2個入手できる。
 *     この「ついでに集まった分」を考慮することで、次にRank4.bootを集めるステージでの必要数が8に減り、
 *     トータルの周回数の無駄を省くことができる。
 */
function finalizeRoute(
  bestRoute: StageResult[],
  availableStages: StageResult[]
): StageResult[] {
  // 全素材の初期必要数をマップに保持
  const remainingNeeded = new Map<string, number>();
  availableStages.forEach(s =>
    s.matchingItems.forEach(m => {
      if (!remainingNeeded.has(m.id)) remainingNeeded.set(m.id, m.needed);
    })
  );

  return bestRoute
    // ランクが高い > 必要数が少ない > ワールドレベルが高い 順にソート
    .toSorted((a, b) => {
      const getMetrics = (s: StageResult) => {
        const maxRank = Math.max(...s.matchingItems.map(m => parseInt(m.id.charAt(0))));
        const minNeeded = Math.min(...s.matchingItems.filter(m => parseInt(m.id.charAt(0)) === maxRank).map(m => m.needed));
        return { maxRank, minNeeded };
      };
      const ma = getMetrics(a);
      const mb = getMetrics(b);

      return (
        mb.maxRank - ma.maxRank || 
        ma.minNeeded - mb.minNeeded || 
        getStageSortValue(b.id) - getStageSortValue(a.id)
      );
    })
    .map(s => {
      // 現時点の残数（シミュレーション結果）でアイテムリストを更新し、すでに充足済みのものを除外
      const updatedItems = s.matchingItems
        .map(m => ({ ...m, needed: remainingNeeded.get(m.id) ?? 0 }))
        .filter(m => m.needed > 0);

      // priorityItem（そのステージの主目的）の残数を基準に周回数を決定
      // なければ残数が最小のアイテムを基準にする
      const priorityItem =
        updatedItems.find(m => m.id === s.priorityItemId) ??
        updatedItems.reduce((min, m) => (m.needed < min.needed ? m : min), updatedItems[0]);
      
      const consumeAmount = priorityItem?.needed ?? 0;

      // 周回後に、そのステージでドロップする各アイテムの残数を減らす（過剰周回防止の核）
      updatedItems.forEach(m => {
        remainingNeeded.set(m.id, Math.max(0, (remainingNeeded.get(m.id) ?? 0) - consumeAmount));
      });

      return { ...s, matchingItems: updatedItems };
    })
    // シミュレーションの結果、前のステージで全て集まってしまい、不要になったステージを除外
    .filter(s => s.matchingItems.length > 0);
}
