import { rangeIterator } from "../data/array";
import { BLUEPRINTS } from "../data/blueprints";
import { STAGES_BY_WORLD } from "../data/stages";
import { type StageResult, type MatchingItem, type ShortageMap, type BlueprintId, type Blueprint, MIN_WORLD, MAX_WORLD, type Stage, type World, type WorldLevel, type RankId } from "../data/types";

// --- 事前計算セクション ---

/**
 * IDからアイテム情報を即座に取得するためのMap
 */
export const BLUEPRINT_MAP = new Map<BlueprintId, Blueprint>(
  BLUEPRINTS.map(b => [b.id, b])
);

/**
 * BlueprintIdからランクを取得する。BLUEPRINT_MAPから直接取得するため、
 * parseSafeIntによる文字列パースを避ける。
 */
function getBlueprintRank(id: BlueprintId): RankId {
  return BLUEPRINT_MAP.get(id)!.rank;
}

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
        const stageIds = itemToStages.get(dropId) ?? [];
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



/**
 * ワールド番号とステージ番号から、比較・ソート用の数値を算出します。
 */
export function calculateWorldLevel(world: number, level: number): number {
  return world * 100 + level;
}

/**
 * ステージ ID ("13-1") を比較可能な数値 (1301) に変換します。
 */
export function getStageSortValue(stage: StageResult): number {
  return calculateWorldLevel(stage.world, stage.level);
}

/**
 * おすすめルート計算用のソート値。ワールドの高さを1000倍に重み付けすることで、
 * 高ワールドのステージを強く優先し、副産物（ゴールド・モカロン等）の効率を最大化します。
 */
function getRouteSortValue(stage: StageResult): number {
  return stage.world * 1000 + stage.level;
}

/**
 * 重複排除の共通ロジック。keyFnでステージからキーを生成し、
 * 同一キーのうち最もワールドレベルが高いものだけを残します。
 */
function deduplicateStages(stages: StageResult[], keyFn: (stage: StageResult) => string): StageResult[] {
  const uniqueMap = new Map<string, StageResult>();
  for (const stage of stages) {
    if (stage.matchingItems.length === 0) continue;

    const key = keyFn(stage);
    const existing = uniqueMap.get(key);
    if (!existing || getStageSortValue(stage) > getStageSortValue(existing)) {
      uniqueMap.set(key, stage);
    }
  }
  return Array.from(uniqueMap.values());
}

/**
 * UI表示用に、必要なアイテムと副産物の組み合わせが全く同じステージのうち、最もレベルが高いものだけを抽出します。
 * 全く同じドロップ構成のステージが重複表示されるのを防ぎつつ、副産物が違うステージは残すために使用します。
 */
export function deduplicateStagesForUI(stages: StageResult[]): StageResult[] {
  return deduplicateStages(stages, stage => {
    const allDrops = STAGE_MAP.get(stage.id)?.drops ?? [];
    return [...allDrops].sort().join(',');
  });
}

/**
 * ルート計算用に、必要なアイテムの組み合わせが同じステージのうち、最もレベルが高いものだけを抽出します。
 * 計算量の爆発を防ぐため、副産物は考慮せずに純粋な探索空間を減らすために使用します。
 */
export function deduplicateStagesForRoute(stages: StageResult[]): StageResult[] {
  return deduplicateStages(stages, stage =>
    stage.matchingItems.map(m => m.id).sort().join(',')
  );
}

/**
 * ステージをワールドレベル（進行度）の降順でソートします。
 */
export function sortStages(stages: StageResult[]): StageResult[] {
  return stages.toSorted((a, b) => getStageSortValue(b) - getStageSortValue(a));
}

/**
 * ステージ内のアイテムから優先アイテムを決定する。
 * 必要数が最も少ないもの → 同数ならランクが低いものを優先する。
 * 中間配列を作らず1パスで完了する。
 */
export function addPriorityInfo(result: Omit<StageResult, 'priorityItemId'>): StageResult {
  if (result.matchingItems.length === 0) return result;

  let priorityId: BlueprintId | undefined;
  let bestRank = Infinity;
  let bestNeeded = Infinity;
  let tieBreak = false;

  for (const mi of result.matchingItems) {
    const rank = getBlueprintRank(mi.id);
    if (mi.needed < bestNeeded || (mi.needed === bestNeeded && rank < bestRank)) {
      bestNeeded = mi.needed;
      bestRank = rank;
      priorityId = mi.id;
      tieBreak = false;
    } else if (mi.needed === bestNeeded && rank === bestRank) {
      tieBreak = true;
    }
  }

  return {
    ...result,
    priorityItemId: tieBreak ? undefined : priorityId
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
      let score = 0;

      stage.drops.forEach(dropId => {
        const needed = shortages.get(dropId);
        if (needed) {
          score += needed;
          matchingItems.push({
            id: dropId,
            needed
          });
        }
      });

      return addPriorityInfo({
        id: stage.id,
        world: stage.world,
        level: stage.level,
        score,
        matchingItems
      });
    });
}

// --- 階層的・再帰的なルート探索アルゴリズム ---

type StageDataEntry = {
  stage: StageResult;
  mask: number;
  levelValue: number;
  minRank: RankId;
  maxRank: RankId;
  isSameRankPair: boolean;
};

/**
 * ステージの全ドロップアイテム（不足リストに無いものも含む）のランク範囲を返す。
 * matchingItemsではなくステージの実際のドロップを使用することで、
 * 不足素材が1つだけの混合ステージが誤って同一ランクペアと判定されることを防ぐ。
 */
function getStageDropRankRange(stage: StageResult): { minRank: RankId, maxRank: RankId } {
  const stageInfo = STAGE_MAP.get(stage.id);
  if (!stageInfo) return { minRank: 2, maxRank: 8 };

  let minRank: RankId = 8;
  let maxRank: RankId = 2;
  for (const dropId of stageInfo.drops) {
    const bp = BLUEPRINT_MAP.get(dropId);
    if (!bp) continue;
    if (bp.rank < minRank) minRank = bp.rank;
    if (bp.rank > maxRank) maxRank = bp.rank;
  }
  return { minRank, maxRank };
}

/**
 * ポップカウント（立っているビットの数）を計算する
 */
function popcount32(n: number): number {
  let count = 0;
  let temp = n;
  while (temp > 0) {
    count += temp & 1;
    temp >>= 1;
  }
  return count;
}

/**
 * 与えられた候補ステージの中から、すべての不足素材を最小限のステージ数でカバーする最適なルートを計算します。
 *
 * アルゴリズム: 階層的再帰探索（DFS） + メモ化 または 貪欲法（Greedy）
 *
 * 階層的最適化:
 *   上位のアイテムから順に、2つ以上を同時に満たせるステージ（上位ペアや上位＋下位混合）を優先して探索します。
 *   もし上位アイテムに対して2つ満たせるステージがない場合、無理に単体でカバーするのではなく、
 *   アイテムを未カバーのまま下位のルート計算へフォールバックします。
 *   すべてのランクを探索し終えた後（ランク制限無制限モード）、残ったアイテムは単体カバーでもよいので最適なステージで収集します。
 *
 *   - 素材の種類数が少ない場合（16種類以下）:
 *     DFSを用いて最適解を計算します。
 *   - 素材の種類数が多い場合（17種類以上）:
 *     貪欲法に切り替えます。
 *
 * 優先基準:
 *   1. ステージ数が少ない方（スタミナ効率）
 *   2. 同数ならワールドレベル合計が高い方（高難度ステージ優先 = 効率が良い傾向）
 */
export function calculateRecommendedRoute(
  availableStages: StageResult[],
  routeSortOrder: 'efficiency' | 'rank' = 'efficiency'
): StageResult[][] {
  // 1. 重複を解除 (計算量を減らすため、各組み合わせで最もワールドレベルが高いものだけを残す)
  const filteredStages = deduplicateStagesForRoute(availableStages);

  // 候補ステージから入手可能な素材IDを列挙する
  const attainableItems = new Set<string>();
  filteredStages.forEach(s => s.matchingItems.forEach(m => attainableItems.add(m.id)));

  if (attainableItems.size === 0) return [];

  const targetItems = Array.from(attainableItems);
  const n = targetItems.length;

  // 素材数が多い場合は貪欲法に切り替える
  if (n > 16) {
    return [calculateGreedyRoute(filteredStages, targetItems, routeSortOrder)];
  }

  // 各ステージのビットマスクとランク情報を事前計算
  const targetMap = new Map(targetItems.map((id, i) => [id, i]));
  const allStageData = filteredStages.map(stage => {
    let mask = 0;
    stage.matchingItems.forEach(m => {
      const idx = targetMap.get(m.id);
      if (idx !== undefined) mask |= (1 << idx);
    });
    const { minRank, maxRank } = getStageDropRankRange(stage);
    return { stage, mask, levelValue: getRouteSortValue(stage), minRank, maxRank, isSameRankPair: minRank === maxRank };
  }).filter(s => s.mask > 0);

  // 各ランクに属する素材のビットマスクを計算
  const rankItemMasks = new Map<RankId, number>();
  for (const [itemId, idx] of targetMap) {
    const rank = getBlueprintRank(itemId as BlueprintId);
    rankItemMasks.set(rank, (rankItemMasks.get(rank) ?? 0) | (1 << idx));
  }

  // 探索用の状態型
  type RouteResult = { stages: StageResult[], count: number, totalLevelValue: number };

  /**
   * 複数のルート候補をマージし、優秀なものを残す
   */
  function mergeResults(a: RouteResult[], b: RouteResult[]): RouteResult[] {
    const combined = [...a, ...b];
    if (combined.length === 0) return [];

    // ステージ数（昇順） > ワールドレベル合計（降順）でソート
    combined.sort((x, y) => x.count - y.count || y.totalLevelValue - x.totalLevelValue);

    const minCount = combined[0].count;
    // 最小ステージ数のものだけに限定する（効率重視のため）
    const candidates = combined.filter(c => c.count === minCount);

    // 重複除去（ステージの組み合わせが同じもの）
    const unique = new Map<string, RouteResult>();
    for (const res of candidates) {
      const key = res.stages.map(s => s.id).sort().join(',');
      if (!unique.has(key)) {
        unique.set(key, res);
      }
    }

    // 上位5つまでを候補とする
    return Array.from(unique.values()).slice(0, 5);
  }

  const memo = new Map<number, RouteResult[]>();

  /**
   * メモ化付きの再帰的深さ優先探索（DFS）
   * @param uncoveredMask 現在の未カバーアイテムのビットマスク
   */
  function dfs(uncoveredMask: number): RouteResult[] {
    if (uncoveredMask === 0) {
      return [{ stages: [], count: 0, totalLevelValue: 0 }];
    }

    if (memo.has(uncoveredMask)) return memo.get(uncoveredMask)!;

    // 現在の未カバーアイテムの中で、最大のランクを見つける
    let topRank = 0;
    for (const [rank, mask] of rankItemMasks.entries()) {
      if ((uncoveredMask & mask) > 0) {
        if (rank > topRank) topRank = rank;
      }
    }

    const topRankMask = rankItemMasks.get(topRank as RankId)!;
    let candidates: StageDataEntry[] = [];

    // 【戦略1】 上位のルート: topRank のアイテムを "2つ以上" カバーするステージ（同一ランクペア等）
    const strat1 = new Map<number, StageDataEntry>();
    for (const entry of allStageData) {
      const cover = entry.mask & uncoveredMask;
      if (popcount32(cover & topRankMask) >= 2) {
        const existing = strat1.get(cover);
        if (!existing || entry.levelValue > existing.levelValue) {
          strat1.set(cover, entry);
        }
      }
    }

    if (strat1.size > 0) {
      candidates = Array.from(strat1.values());
    } else {
      // 上位のルートの時2つを満たせないなら下位のルート計算へ
      // 【戦略2】 下位ルートとの混合: topRank のアイテムを "1つ以上" 含み、かつ全体で "2つ以上" カバーするステージ
      const strat2 = new Map<number, StageDataEntry>();
      for (const entry of allStageData) {
        const cover = entry.mask & uncoveredMask;
        if ((cover & topRankMask) > 0 && popcount32(cover) >= 2) {
          const existing = strat2.get(cover);
          if (!existing || entry.levelValue > existing.levelValue) {
            strat2.set(cover, entry);
          }
        }
      }

      if (strat2.size > 0) {
        candidates = Array.from(strat2.values());
      } else {
        // 混合ステージでも2つカバーできない場合は単独カバーへ
        // 【戦略3】 単一カバー: topRank のアイテムをカバーするステージ
        const strat3 = new Map<number, StageDataEntry>();
        for (const entry of allStageData) {
          const cover = entry.mask & uncoveredMask;
          if ((cover & topRankMask) > 0) {
            const existing = strat3.get(cover);
            if (!existing || entry.levelValue > existing.levelValue) {
              strat3.set(cover, entry);
            }
          }
        }
        candidates = Array.from(strat3.values());
      }
    }

    let currentBestResults: RouteResult[] = [];

    // 抽出された候補ステージを使用して再帰的に探索
    for (const entry of candidates) {
      const cover = entry.mask & uncoveredMask;
      const nextMask = uncoveredMask & ~cover;

      const subResults = dfs(nextMask);
      const branchResults = subResults.map(sub => ({
        stages: [entry.stage, ...sub.stages],
        count: 1 + sub.count,
        totalLevelValue: entry.levelValue + sub.totalLevelValue
      }));

      currentBestResults = mergeResults(currentBestResults, branchResults);
    }

    memo.set(uncoveredMask, currentBestResults);
    return currentBestResults;
  }

  // 探索開始
  const allMask = (1 << n) - 1;
  const bestResults = dfs(allMask);

  return bestResults.map(res => finalizeRoute(res.stages, filteredStages, routeSortOrder));
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
  targetItems: string[],
  routeSortOrder: 'efficiency' | 'rank'
): StageResult[] {
  const route: StageResult[] = [];
  const remaining = new Set(targetItems); // まだカバーされていない素材のセット

  // 各ステージが持つ素材のIDセットとワールドレベル値を事前計算
  const stageData = availableStages.map(stage => ({
    stage,
    itemIds: new Set(stage.matchingItems.map(m => m.id)),
    levelValue: getRouteSortValue(stage)
  }));

  // すべての素材がカバーされるまで繰り返す
  while (remaining.size > 0) {
    let bestStage: StageResult | null = null;
    let maxCover = 0;
    let maxWorldLevelValue = -1;

    for (const { stage, itemIds, levelValue } of stageData) {
      // このステージを追加することで、未カバーの素材がいくつ解決されるか
      let coverCount = 0;
      itemIds.forEach(id => {
        if (remaining.has(id)) coverCount++;
      });

      // 最も多く素材をカバーし、かつ難易度が高いステージを選ぶ
      if (coverCount > maxCover || (coverCount === maxCover && levelValue > maxWorldLevelValue)) {
        maxCover = coverCount;
        maxWorldLevelValue = levelValue;
        bestStage = stage;
      }
    }

    if (!bestStage || maxCover === 0) break;

    route.push(bestStage);
    // 解決された素材を残りリストから削除
    bestStage.matchingItems.forEach(m => remaining.delete(m.id));
  }

  return finalizeRoute(route, availableStages, routeSortOrder);
}

/**
 * ステージのソートメトリクスを事前計算する。
 * ランク情報はBLUEPRINT_MAPから取得し、parseSafeIntを回避する。
 */
function getStageMetrics(stage: StageResult): { maxRank: number, minNeeded: number, levelValue: number } {
  let maxRank = -1;
  let minNeeded = Infinity;

  for (const m of stage.matchingItems) {
    const rank = getBlueprintRank(m.id);
    if (rank > maxRank) {
      maxRank = rank;
    }
    if (m.needed < minNeeded) {
      minNeeded = m.needed;
    }
  }

  return { maxRank, minNeeded, levelValue: getRouteSortValue(stage) };
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
  availableStages: StageResult[],
  routeSortOrder: 'efficiency' | 'rank'
): StageResult[] {
  // 全素材の初期必要数をマップに保持
  const remainingNeeded = new Map<string, number>();
  availableStages.forEach(s =>
    s.matchingItems.forEach(m => {
      if (!remainingNeeded.has(m.id)) remainingNeeded.set(m.id, m.needed);
    })
  );

  // メトリクスを事前計算してソートする（比較関数内での重複計算を回避）
  const stagesWithMetrics = bestRoute.map(s => ({
    stage: s,
    metrics: getStageMetrics(s)
  }));

  if (routeSortOrder === 'rank') {
    stagesWithMetrics.sort((a, b) =>
      b.metrics.maxRank - a.metrics.maxRank ||
      a.metrics.minNeeded - b.metrics.minNeeded ||
      b.metrics.levelValue - a.metrics.levelValue
    );
  } else {
    stagesWithMetrics.sort((a, b) =>
      a.metrics.minNeeded - b.metrics.minNeeded ||
      b.metrics.maxRank - a.metrics.maxRank ||
      b.metrics.levelValue - a.metrics.levelValue
    );
  }

  return stagesWithMetrics
    .map(({ stage: s }) => {
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
