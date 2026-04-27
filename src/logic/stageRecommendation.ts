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
 * 最高ランク → 同ランクなら必要数が最も少ないものを優先する。
 * 中間配列を作らず1パスで完了する。
 */
function addPriorityInfo(result: Omit<StageResult, 'priorityItemId'>): StageResult {
  if (result.matchingItems.length === 0) return result;

  let priorityId: BlueprintId | undefined;
  let bestRank = -1;
  let bestNeeded = Infinity;
  let tieBreak = false;

  for (const mi of result.matchingItems) {
    const rank = getBlueprintRank(mi.id);
    if (rank > bestRank || (rank === bestRank && mi.needed < bestNeeded)) {
      bestRank = rank;
      bestNeeded = mi.needed;
      priorityId = mi.id;
      tieBreak = false;
    } else if (rank === bestRank && mi.needed === bestNeeded) {
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

// --- ビットマスクDP の型定義とコアロジック ---

type DPNode = {
  count: number;           // 使用した合計ステージ数
  totalLevelValue: number; // ワールドレベル数値の合計
  parentMask: number;      // 遷移前のビットマスク
  parentPathIndex: number; // 遷移前のパスのインデックス
  stage: StageResult | null;
};

type StageDataEntry = {
  stage: StageResult;
  mask: number;
  levelValue: number;
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
 * ビットマスクDPのコア処理。
 * 与えられたステージデータを使って、既存のDPテーブルの上に遷移を追加します。
 *
 * @param dp 既存のDPテーブル（破壊的に更新される）
 * @param stageEntries DP遷移に使用するステージデータ
 * @param totalStates DPテーブルの要素数 (2^n)
 * @param K 各マスクごとに保持する候補数の上限
 */
function runBitmaskDP(
  dp: (DPNode[] | undefined)[],
  stageEntries: StageDataEntry[],
  totalStates: number,
  K: number,
): void {
  for (let mask = 0; mask < totalStates; mask++) {
    const nodes = dp[mask];
    if (!nodes) continue;

    for (const { stage, mask: sMask, levelValue } of stageEntries) {
      const nextMask = mask | sMask;
      if (nextMask === mask) continue; // 新たにカバーできる素材がなければスキップ

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nextCount = node.count + 1;
        const nextLevelValue = node.totalLevelValue + levelValue;

        const nextNodes = dp[nextMask];

        if (nextNodes) {
          // 挿入位置を探す（ソート済み配列上で線形スキャン）
          // 優先度: 1. ステージ数が少ない, 2. ワールドレベル合計が高い
          let insertPos = nextNodes.length;
          for (let j = 0; j < nextNodes.length; j++) {
            const existing = nextNodes[j];
            // 同一の(count, totalLevelValue)は重複排除
            if (existing.count === nextCount && existing.totalLevelValue === nextLevelValue) {
              insertPos = -1; // 重複マーカー
              break;
            }
            if (nextCount < existing.count || (nextCount === existing.count && nextLevelValue > existing.totalLevelValue)) {
              insertPos = j;
              break;
            }
          }

          if (insertPos === -1) continue; // 重複のためスキップ
          if (insertPos >= K) continue; // K件以下の候補より劣るためスキップ

          // 挿入ソート: 挿入位置にノードを差し込む
          const newNode: DPNode = {
            count: nextCount,
            totalLevelValue: nextLevelValue,
            parentMask: mask,
            parentPathIndex: i,
            stage
          };
          nextNodes.splice(insertPos, 0, newNode);

          // K件を超えた分を切り捨て
          if (nextNodes.length > K) nextNodes.length = K;
        } else {
          // このマスクに初めて到達
          dp[nextMask] = [{
            count: nextCount,
            totalLevelValue: nextLevelValue,
            parentMask: mask,
            parentPathIndex: i,
            stage
          }];
        }
      }
    }
  }
}

/**
 * DPテーブルからルートを復元する。
 */
function reconstructPath(dp: (DPNode[] | undefined)[], mask: number, index: number): StageResult[] {
  const path: StageResult[] = [];
  let currMask = mask;
  let currIdx = index;
  while (currMask > 0) {
    const node = dp[currMask]?.[currIdx];
    if (!node || !node.stage) break;
    path.push(node.stage);
    const prevMask = node.parentMask;
    const prevIdx = node.parentPathIndex;
    currMask = prevMask;
    currIdx = prevIdx;
  }
  return path;
}

/**
 * 与えられた候補ステージの中から、すべての不足素材を最小限のステージ数でカバーする最適なルートを計算します。
 *
 * アルゴリズム: 階層的ビットマスクDP（集合被覆問題） または 貪欲法（Greedy）
 *
 * 階層的最適化:
 *   各ランクの「同一ランク2個セット」ステージで先に最適解を確定し、
 *   カバーされた素材を除外してから、次の下位ランクの探索に移ります。
 *   例: ランク5素材 → World 15-16（ランク5×2）で3ステージで確定
 *       ランク4素材 → World 11-12（ランク4×2）で3ステージで確定
 *   混合ランクのステージ（World 13-14 のランク4+5）は、同一ランクペアで
 *   カバーしきれなかった残りの素材に対してのみ使用されます。
 *
 *   - 素材の種類数が少ない場合（16種類以下）:
 *     ビットマスクDPを用いて最適解を計算します。
 *   - 素材の種類数が多い場合（17種類以上）:
 *     貪欲法に切り替えます。
 *
 * 優先基準（同じカバー状態へ複数の経路がある場合）:
 *   1. ステージ数が少ない方（スタミナ効率）
 *   2. 同数ならワールドレベル合計が高い方（高難度ステージ優先 = 効率が良い傾向）
 */
export function calculateRecommendedRoute(
  availableStages: StageResult[]
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
    return [calculateGreedyRoute(filteredStages, targetItems)];
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

  // 同一ランクペアステージをランク別にグループ化
  const sameRankPairGroups = new Map<RankId, StageDataEntry[]>();
  for (const entry of allStageData) {
    if (!entry.isSameRankPair) continue;
    const group = sameRankPairGroups.get(entry.minRank) ?? [];
    group.push(entry);
    sameRankPairGroups.set(entry.minRank, group);
  }

  // 各ランクに属する素材のビットマスクを計算
  const rankItemMasks = new Map<RankId, number>();
  for (const [itemId, idx] of targetMap) {
    const rank = getBlueprintRank(itemId as BlueprintId);
    rankItemMasks.set(rank, (rankItemMasks.get(rank) ?? 0) | (1 << idx));
  }

  // 素材のランクを降順ソート
  const sortedItemRanks = Array.from(rankItemMasks.keys()).sort((a, b) => b - a);

  // --- Phase 1: 各ランクの同一ペアステージで独立に最適解を確定する ---
  // 上位ランクから順に処理し、そのランクの素材を全カバーできた場合のみコミットする。
  // 上位ランクが未カバーの場合、下位ランクもコミットしない（Phase 2で一括処理）。
  let currentRoutes: { stages: StageResult[], totalLevelValue: number }[] = [
    { stages: [], totalLevelValue: 0 }
  ];
  let coveredMask = 0;
  let allHigherRanksCovered = true; // 上位ランクがすべてカバーされているか
  const K = 10; // 保持するルート候補の最大数

  for (const rank of sortedItemRanks) {
    if (!allHigherRanksCovered) break; // 上位が未カバーなら以降もPhase 2に回す

    const group = sameRankPairGroups.get(rank);
    if (!group || group.length === 0) {
      allHigherRanksCovered = false;
      continue;
    }

    const rankMask = rankItemMasks.get(rank) ?? 0;
    const uncoveredRankMask = rankMask & ~coveredMask;
    if (uncoveredRankMask === 0) continue;

    // このランクの素材のみを対象にした小さいDPを実行
    const rankBits: number[] = [];
    for (let i = 0; i < n; i++) {
      if (uncoveredRankMask & (1 << i)) rankBits.push(i);
    }
    const m = rankBits.length;
    const remapToSmall = new Map(rankBits.map((origBit, newIdx) => [origBit, newIdx]));

    const smallGroupData: StageDataEntry[] = group.map(entry => {
      let smallMask = 0;
      for (const origBit of rankBits) {
        if (entry.mask & (1 << origBit)) {
          smallMask |= (1 << remapToSmall.get(origBit)!);
        }
      }
      return { stage: entry.stage, mask: smallMask, levelValue: entry.levelValue };
    }).filter(s => s.mask > 0);

    if (smallGroupData.length === 0) {
      allHigherRanksCovered = false;
      continue;
    }

    const smallAllMask = (1 << m) - 1;
    const smallTotalStates = smallAllMask + 1;

    const dp: (DPNode[] | undefined)[] = new Array(smallTotalStates);
    dp[0] = [{ count: 0, totalLevelValue: 0, parentMask: -1, parentPathIndex: -1, stage: null }];

    runBitmaskDP(dp, smallGroupData, smallTotalStates, K);

    // 全素材カバーできたか確認
    if (!dp[smallAllMask] || dp[smallAllMask]!.length === 0) {
      allHigherRanksCovered = false;
      continue;
    }

    // 各ベースルートに対して、今回見つかった全ての経路を繋げて候補を更新
    const nextRoutes: typeof currentRoutes = [];
    const endNodes = dp[smallAllMask]!;
    for (const base of currentRoutes) {
      for (let i = 0; i < endNodes.length; i++) {
        const route = reconstructPath(dp, smallAllMask, i);
        nextRoutes.push({
          stages: [...base.stages, ...route],
          totalLevelValue: base.totalLevelValue + endNodes[i].totalLevelValue
        });
      }
    }

    // ステージ数が少ない順、同数ならワールドレベル合計が高い順にソートして上位K件を保持
    nextRoutes.sort((a, b) => {
      if (a.stages.length !== b.stages.length) return a.stages.length - b.stages.length;
      return b.totalLevelValue - a.totalLevelValue;
    });
    currentRoutes = nextRoutes.slice(0, K);

    for (const origBit of rankBits) {
      coveredMask |= (1 << origBit);
    }
  }

  // --- Phase 2: 残りの素材を全ステージでDP ---
  const allMask = (1 << n) - 1;
  const remainingMask = allMask & ~coveredMask;

  if (remainingMask > 0) {
    // 残りの素材用に再マッピング
    const remainingBits: number[] = [];
    for (let i = 0; i < n; i++) {
      if (remainingMask & (1 << i)) remainingBits.push(i);
    }
    const m = remainingBits.length;
    const remapToSmall = new Map(remainingBits.map((origBit, newIdx) => [origBit, newIdx]));

    // 全ステージを使用（同一ペア・混合問わず）
    const smallStageData: StageDataEntry[] = allStageData.map(entry => {
      let smallMask = 0;
      for (const origBit of remainingBits) {
        if (entry.mask & (1 << origBit)) {
          smallMask |= (1 << remapToSmall.get(origBit)!);
        }
      }
      return { stage: entry.stage, mask: smallMask, levelValue: entry.levelValue };
    }).filter(s => s.mask > 0);

    const smallAllMask = (1 << m) - 1;
    const smallTotalStates = smallAllMask + 1;

    const dp: (DPNode[] | undefined)[] = new Array(smallTotalStates);
    dp[0] = [{ count: 0, totalLevelValue: 0, parentMask: -1, parentPathIndex: -1, stage: null }];

    runBitmaskDP(dp, smallStageData, smallTotalStates, K);

    if (dp[smallAllMask] && dp[smallAllMask]!.length > 0) {
      const nextRoutes: typeof currentRoutes = [];
      const endNodes = dp[smallAllMask]!;
      for (const base of currentRoutes) {
        for (let i = 0; i < endNodes.length; i++) {
          const route = reconstructPath(dp, smallAllMask, i);
          nextRoutes.push({
            stages: [...base.stages, ...route],
            totalLevelValue: base.totalLevelValue + endNodes[i].totalLevelValue
          });
        }
      }

      nextRoutes.sort((a, b) => {
        if (a.stages.length !== b.stages.length) return a.stages.length - b.stages.length;
        return b.totalLevelValue - a.totalLevelValue;
      });
      currentRoutes = nextRoutes.slice(0, K);
    } else {
      currentRoutes = [];
    }
  }

  // ルートが見つからなかった、または最初から[]だった場合
  if (currentRoutes.length === 0 || currentRoutes[0].stages.length === 0) return [];

  return currentRoutes.map(r => finalizeRoute(r.stages, filteredStages));
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

  return finalizeRoute(route, availableStages);
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
      minNeeded = m.needed;
    } else if (rank === maxRank && m.needed < minNeeded) {
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
  availableStages: StageResult[]
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

  stagesWithMetrics.sort((a, b) =>
    b.metrics.maxRank - a.metrics.maxRank ||
    a.metrics.minNeeded - b.metrics.minNeeded ||
    b.metrics.levelValue - a.metrics.levelValue
  );

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
