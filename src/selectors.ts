import { createSelector } from 'reselect';
import type { AppState } from './store';
import { BLUEPRINTS, RANK_CONFIG } from './data/blueprints';
import { calculateRecommendedRoute, getAvailableStageResults, deduplicateStagesForUI, sortStages } from './logic/stageRecommendation';
import type { ShortageItem, ShortageMap, BlueprintWithState } from './data/types';

const selectItems = (state: AppState) => state.items;
const selectSelectedRank = (state: AppState) => state.selectedRank;
const selectSelectedAttackType = (state: AppState) => state.selectedAttackType;
const selectMaxWorld = (state: AppState) => state.maxWorld;
const selectMaxStageNum = (state: AppState) => state.maxStageNum;
const selectShowDuplicates = (state: AppState) => state.showDuplicates;
const selectSelectedRouteIndex = (state: AppState) => state.selectedRouteIndex;
const selectRouteSortOrder = (state: AppState) => state.routeSortOrder;

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

/**
 * 不足分を補うために必要な「定石」の合計数を計算する
 */
export const selectTotalJoseki = createSelector(
  [selectShortages],
  (shortages) => {
    return shortages.reduce((total, s) => {
      const bp = BLUEPRINTS.find(b => b.id === s.id);
      if (!bp) return total;
      const config = RANK_CONFIG[bp.rank];
      return total + (s.amount * config.josekiPerBlueprint);
    }, 0);
  }
);

export const selectPriorityItems = createSelector(
  [selectShortages],
  (shortages) => {
    return shortages
      .map(s => ({
        ...s,
        name: BLUEPRINTS.find(b => b.id === s.id)?.name ?? s.id
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
 * UI表示用にスコアや効率でソートされたステージリスト（このアイテムが取得できるすべてのステージを確認する）
 * 重複するステージもすべて表示するモードと、同一構成のステージでワールドレベルが最も高いものだけを表示するモードを切り替えられるようにする
 */
export const selectAllStages = createSelector(
  [selectAvailableStages, selectShowDuplicates],
  (allStages, showDuplicates) => {
    if (showDuplicates) {
      // 重複を表示する場合：全件ソート
      return sortStages(allStages);
    }

    // 重複（同一構成）を隠す場合：
    // 1. まず同一ドロップ構成の重複を解除 (最善のワールドレベルのみ抽出)
    const unique = deduplicateStagesForUI(allStages);

    // 2. 抽出されたユニークなステージのみをソート
    return sortStages(unique);
  }
);

export const selectRecommendedRoutes = createSelector(
  [selectAvailableStages, selectRouteSortOrder],
  (allStages, routeSortOrder) => {
    return calculateRecommendedRoute(allStages, routeSortOrder);
  }
);

export const selectRecommendedStage = createSelector(
  [selectRecommendedRoutes, selectSelectedRouteIndex],
  (routes, index) => {
    return routes[index] ?? routes[0] ?? [];
  }
);

export const selectFilteredBlueprints = createSelector(
  [selectSelectedRank, selectSelectedAttackType, selectBlueprintStateMap],
  (selectedRank, selectedAttackType, stateMap): BlueprintWithState[] => {
    return BLUEPRINTS.map(b => {
      const state = stateMap.get(b.id) ?? { req: 0, held: 0, shortage: 0, isComplete: false };
      return { ...b, ...state };
    }).filter(b => {
      const subRank = selectedRank !== 'All' ? selectedRank - 1 : null;

      const matchesRank = selectedRank === 'All'
        || b.rank === selectedRank
        || (subRank !== null && b.rank === subRank && b.req > 0);

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
  (blueprints: BlueprintWithState[], selectedRank) => {
    if (selectedRank === 'All') return blueprints;
    return blueprints.filter(b => b.rank === selectedRank);
  }
);

export const selectSubItems = createSelector(
  [selectFilteredBlueprints, selectSelectedRank],
  (blueprints: BlueprintWithState[], selectedRank) => {
    if (selectedRank === 'All') return [];
    return blueprints.filter(b => b.rank !== selectedRank);
  }
);
