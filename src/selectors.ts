import { createSelector } from 'reselect';
import type { AppState } from './store';
import { BLUEPRINTS } from './data/blueprints';
import { calculateRecommendedRoute, getAvailableStageResults, getCombinationKey } from './logic/stageRecommendation';
import type { ShortageItem, ShortageMap, BlueprintWithState } from './data/types';

const selectItems = (state: AppState) => state.items;
const selectSelectedRank = (state: AppState) => state.selectedRank;
const selectSelectedAttackType = (state: AppState) => state.selectedAttackType;
const selectMaxWorld = (state: AppState) => state.maxWorld;
const selectMaxStageNum = (state: AppState) => state.maxStageNum;
const selectShowDuplicates = (state: AppState) => state.showDuplicates;

/**
 * ID からアイテムの状態を引ける Map を提供
 */
export const selectItemMap = createSelector(
  [selectItems],
  (items) => new Map(items.map(i => [i.id, i]))
);

export const selectBlueprintStates = createSelector(
  [selectItems],
  (items) =>
    items.map(
      (item) => {
        const req = item.req;
        const held = item.held;
        const shortage = Math.max(0, req - held);
        const isComplete = req > 0 && shortage === 0;
        return { ...item, req, held, shortage, isComplete }
      }
    )
);

/**
 * ID からアイテムの状態(計算済み)を引ける Map を提供
 */
export const selectBlueprintStateMap = createSelector(
  [selectBlueprintStates],
  (states) => new Map(states.map(s => [s.id, s]))
);

/**
 * 不足分のみを計算して Map で返す (ロジック内での高速検索用)
 */
export const selectShortageMap = createSelector(
  [selectItems],
  (items): ShortageMap => {
    const map: ShortageMap = new Map();
    items.forEach(item => {
      const s = Math.max(0, item.req - item.held);
      if (s > 0) map.set(item.id, s);
    });
    return map;
  }
);

/**
 * 不足分リストを配列で返す (UI表示用)
 */
export const selectShortages = createSelector(
  [selectShortageMap],
  (shortageMap): ShortageItem[] => {
    const result: ShortageItem[] = [];
    shortageMap.forEach((amount, id) => {
      result.push({ id, amount });
    });
    return result;
  }
);

export const selectPriorityItems = createSelector(
  [selectShortages],
  (shortages) => {
    return shortages
      .map(s => ({
        ...s,
        name: BLUEPRINTS.find(b => b.id === s.id)?.name || s.id
      }))
      .sort((a, b) => b.amount - a.amount);
  }
);

export const selectAvailableStages = createSelector(
  [selectShortageMap, selectMaxWorld, selectMaxStageNum],
  (shortageMap, maxWorld, maxStageNum) => {
    return getAvailableStageResults(
      shortageMap,
      maxWorld,
      maxStageNum
    );
  }
);

/**
 * UI表示用にスコアや効率でソートされたステージリスト
 */
export const selectSortedAvailableStages = createSelector(
  [selectAvailableStages],
  (allStages) => {
    // スコアと効率でソート (良いステージを前に持ってくる)
    return [...allStages].sort((a, b) => 
      b.matchingItems.length - a.matchingItems.length || 
      b.score - a.score || 
      b.worldLevel - a.worldLevel
    );
  }
);

export const selectAllStages = createSelector(
  [selectSortedAvailableStages, selectShowDuplicates],
  (sortedStages, showDuplicates) => {
    if (showDuplicates) {
      // 重複を表示する場合：何も削らずにそのまま返す
      return sortedStages;
    }

    // 重複を隠す場合：包含関係にある（新しい素材を1つも提供しない）ステージを除外する
    const coveredItems = new Set<string>();
    const seenCombinations = new Set<string>();

    return sortedStages.filter(stage => {
      const combinationKey = getCombinationKey(stage.matchingItems);
      
      // 同一組み合わせの重複を排除
      if (seenCombinations.has(combinationKey)) return false;
      seenCombinations.add(combinationKey);

      // 包含関係の重複を排除（すでにカバーされた素材しか持たないステージを隠す）
      const hasNewItem = stage.matchingItems.some(item => !coveredItems.has(item.id));
      if (!hasNewItem) return false;
      stage.matchingItems.forEach(item => coveredItems.add(item.id));
      
      return true;
    });
  }
);

export const selectRecommendedStage = createSelector(
  [selectSortedAvailableStages],
  (allStages) => {
    return calculateRecommendedRoute(allStages);
  }
);

export const selectFilteredBlueprints = createSelector(
  [selectSelectedRank, selectSelectedAttackType, selectBlueprintStateMap],
  (selectedRank, selectedAttackType, stateMap): BlueprintWithState[] => {
    return BLUEPRINTS.map(b => {
      const state = stateMap.get(b.id) || { req: 0, held: 0, shortage: 0, isComplete: false };
      return { ...b, ...state };
    }).filter(b => {
      const subRank = selectedRank !== 'All' ? String(parseInt(selectedRank) - 1) : null;

      const matchesRank = selectedRank === 'All'
        || b.rank.toString() === selectedRank
        || (b.rank.toString() === subRank && b.req > 0);

      if (!matchesRank) return false;

      if (selectedAttackType !== 'all') {
        return b.attackType === selectedAttackType || b.attackType === 'both';
      }

      return true;
    });
  }
);

export const selectMainItems = createSelector(
  [selectFilteredBlueprints, selectSelectedRank],
  (blueprints, selectedRank) => {
    if (selectedRank === 'All') return blueprints;
    return blueprints.filter(b => b.rank.toString() === selectedRank);
  }
);

export const selectSubItems = createSelector(
  [selectFilteredBlueprints, selectSelectedRank],
  (blueprints, selectedRank) => {
    if (selectedRank === 'All') return [];
    return blueprints.filter(b => b.rank.toString() !== selectedRank);
  }
);
