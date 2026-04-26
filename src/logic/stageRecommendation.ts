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

  for (const mi of result.matchingItems) {
    const rank = getBlueprintRank(mi.id);
    if (rank > bestRank || (rank === bestRank && mi.needed < bestNeeded)) {
      bestRank = rank;
      bestNeeded = mi.needed;
      priorityId = mi.id;
    }
  }

  return {
    ...result,
    priorityItemId: priorityId
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
): StageResult[][] {
  // 1. 重複を解除 (計算量を減らすため、各組み合わせで最もワールドレベルが高いものだけを残す)
  // ルート計算では副産物は考慮しない（効率を優先）
  const filteredStages = deduplicateStagesForRoute(availableStages);

  // 候補ステージから入手可能な素材IDを列挙する
  const attainableItems = new Set<string>();
  filteredStages.forEach(s => s.matchingItems.forEach(m => attainableItems.add(m.id)));

  if (attainableItems.size === 0) return [];

  // 素材IDに 0..n-1 のインデックスを割り当てる（ビット位置として使用）
  const targetItems = Array.from(attainableItems);
  const n = targetItems.length;

  // 素材数が多い場合は計算時間の増大を防ぐため貪欲法に切り替える（2^16 = 65536 通りの状態までを許容）
  if (n > 16) {
    return [calculateGreedyRoute(filteredStages, targetItems)];
  }

  // 全素材がカバーされた状態を表すビットマスク（n ビットすべて1）
  const allMask = (1 << n) - 1;

  /**
   * dp[mask] = そのビットマスクに対応する素材をカバーするための最適ノード（複数保持）
   */
  type DPNode = {
    count: number;           // 使用した合計ステージ数
    totalLevelValue: number; // ワールドレベル数値の合計
    parentMask: number;      // 遷移前のビットマスク
    parentPathIndex: number; // 遷移前のパスのインデックス
    stage: StageResult | null;
  };
  const dp = new Map<number, DPNode[]>();

  // 各ステージが「どの素材をカバーするか」をビットマスクで事前計算する
  // ワールドレベル値も事前計算してキャッシュする
  const targetMap = new Map(targetItems.map((id, i) => [id, i]));
  const stageData = filteredStages.map(stage => {
    let mask = 0;
    stage.matchingItems.forEach(m => {
      const idx = targetMap.get(m.id);
      if (idx !== undefined) mask |= (1 << idx); // 対応する素材のビットを立てる
    });
    return { stage, mask, levelValue: getStageSortValue(stage) };
  }).filter(s => s.mask > 0);

  // 初期状態: 何もカバーしていない（マスク0）
  dp.set(0, [{ count: 0, totalLevelValue: 0, parentMask: -1, parentPathIndex: -1, stage: null }]);

  // ステージを1つずつ考慮してDPテーブルを更新する
  for (const { stage, mask: sMask, levelValue } of stageData) {
    // マップを反復しながら追加すると無限ループになるため、現在のエントリのスナップショットを取る
    const currentEntries = Array.from(dp.entries());

    for (const [mask, nodes] of currentEntries) {
      const nextMask = mask | sMask; // 現在の状態にこのステージを追加した後のカバー状態
      if (nextMask === mask) continue; // 新たにカバーできる素材がなければ計算をスキップ

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nextCount = node.count + 1;
        const nextLevelValue = node.totalLevelValue + levelValue;

        const nextNodes = dp.get(nextMask) ?? [];

        // すでに同じ「ステージ数」と「合計レベル」の経路があれば追加しない（簡易的な重複排除）
        if (nextNodes.some(n => n.count === nextCount && n.totalLevelValue === nextLevelValue)) {
          continue;
        }

        nextNodes.push({
          count: nextCount,
          totalLevelValue: nextLevelValue,
          parentMask: mask,
          parentPathIndex: i,
          stage
        });

        // 優先度でソート: 1. ステージ数が少ない, 2. ワールドレベル合計が高い
        nextNodes.sort((a, b) => a.count - b.count || b.totalLevelValue - a.totalLevelValue);

        // 各マスクごとに上位10件を保持する
        dp.set(nextMask, nextNodes.slice(0, 10));
      }
    }
  }

  // ルートの復元関数
  const reconstructPath = (mask: number, index: number): StageResult[] => {
    const path: StageResult[] = [];
    let currMask = mask;
    let currIdx = index;
    while (currMask > 0) {
      const node = dp.get(currMask)?.[currIdx];
      if (!node || !node.stage) break;
      path.push(node.stage);
      const prevMask = node.parentMask;
      const prevIdx = node.parentPathIndex;
      currMask = prevMask;
      currIdx = prevIdx;
    }
    return path;
  };

  const finalNodes = dp.get(allMask) ?? [];

  // 上位5件のルートを返す
  return finalNodes.slice(0, 5).map(node => {
    const route = reconstructPath(allMask, finalNodes.indexOf(node));
    return finalizeRoute(route, filteredStages);
  });
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
    levelValue: getStageSortValue(stage)
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

  return { maxRank, minNeeded, levelValue: getStageSortValue(stage) };
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
