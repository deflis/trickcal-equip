import { describe, it, expect } from 'vitest';
import { getAvailableStageResults, calculateRecommendedRoute, deduplicateStagesForUI, deduplicateStagesForRoute, sortStages } from './stageRecommendation';
import { blueprints } from '../data/blueprints';
import { MAX_WORLD, type StageResult } from '../data/types';
import { range } from '../data/array';

describe('stageRecommendation Utility Functions', () => {
  const mockStages: StageResult[] = [
    { id: '3-1', world: 3, level: 1, score: 10, matchingItems: [{ id: '21', needed: 10 }] },
    { id: '3-2', world: 3, level: 2, score: 10, matchingItems: [{ id: '21', needed: 10 }] },
    { id: '4-1', world: 4, level: 1, score: 20, matchingItems: [{ id: '21', needed: 10 }, { id: '22', needed: 10 }] },
    { id: '5-1', world: 5, level: 1, score: 5, matchingItems: [{ id: '23', needed: 5 }] },
  ];

  describe('deduplicateStagesForRoute', () => {
    it('同一の素材組み合わせを持つステージから、最もワールドレベルが高いものだけを残す', () => {
      // 3-1 と 3-2 は同じ素材セット (ItemA) かつ副産物なし
      // 3-2 の方がレベルが高い (302 > 301) ので、3-1 が消えて 3-2 が残るはず
      const result = deduplicateStagesForRoute(mockStages);

      const ids = result.map(s => s.id);
      expect(ids).toContain('3-2');
      expect(ids).not.toContain('3-1');
      expect(ids).toContain('4-1');
      expect(ids).toContain('5-1');
      expect(result.length).toBe(3);
    });
  });

  describe('deduplicateStagesForUI', () => {
    it('不足素材が同じでも副産物が異なる場合は別のステージとして扱う', () => {
      // 3-1 と 3-2 は STAGES_BY_WORLD 上で異なるドロップを持つ
      const stagesWithDifferentByproducts: StageResult[] = [
        {
          id: '3-1',
          world: 3,
          level: 1,
          score: 10,
          matchingItems: [{ id: '21', needed: 10 }]
        },
        {
          id: '3-2',
          world: 3,
          level: 2,
          score: 10,
          matchingItems: [{ id: '21', needed: 10 }]
        },
      ];

      const result = deduplicateStagesForUI(stagesWithDifferentByproducts);

      expect(result.length).toBe(2);
      expect(result.map(s => s.id)).toContain('3-1');
      expect(result.map(s => s.id)).toContain('3-2');
    });

    it('deduplicateStagesForRoute は副産物が異なっても同一とみなす', () => {
      const stagesWithDifferentByproducts: StageResult[] = [
        {
          id: '3-1',
          world: 3,
          level: 1,
          score: 10,
          matchingItems: [{ id: '21', needed: 10 }]
        },
        {
          id: '3-2',
          world: 3,
          level: 2,
          score: 10,
          matchingItems: [{ id: '21', needed: 10 }]
        },
      ];

      const result = deduplicateStagesForRoute(stagesWithDifferentByproducts);

      // 副産物を無視するため、3-2 (高レベル) だけが残る
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('3-2');
    });
  });

  describe('sortStages', () => {
    it('ワールドレベル（進行度）の降順でソートされる', () => {
      const result = sortStages(mockStages);

      // ワールドレベルが高い順に並ぶ
      expect(result[0].id).toBe('5-1');
      expect(result[1].id).toBe('4-1');
      expect(result[2].id).toBe('3-2');
      expect(result[3].id).toBe('3-1');
    });
  });
  describe('おすすめルートの最終的な並び順 (finalizeRoute)', () => {
    it('ランクが高い > 必要数が少ない > ワールドレベルが高い 順にソートされる', () => {
      // ランク8の素材A (必要10)
      // ランク8の素材B (必要2)
      // ランク5の素材C (必要1)
      const mockSelectedStages: StageResult[] = [
        { id: '28-1', world: 28, level: 1, score: 10, matchingItems: [{ id: '81', needed: 10 }] },
        { id: '27-10', world: 27, level: 10, score: 2, matchingItems: [{ id: '82', needed: 2 }] },
        { id: '16-1', world: 16, level: 1, score: 1, matchingItems: [{ id: '51', needed: 1 }] },
      ];

      // calculateRecommendedRoute 内部で行われる deduplicate や finalizeRoute の順序をシミュレート
      // ここでは finalizeRoute (のソート部分) を直接呼び出すために、
      // calculateRecommendedRoute の戻り値を確認する

      const routes = calculateRecommendedRoute(mockSelectedStages);
      const route = routes[0];

      // 期待される順序:
      // 1位: 27-10 (ランク8, 必要数2) -> ランク8の中で最も必要数が少ない
      // 2位: 28-1  (ランク8, 必要数10) -> ランク8
      // 3位: 16-1  (ランク5, 必要数1)  -> ランクが低いので最後

      const ids = route.map(r => r.id);

      expect(ids[0]).toBe('27-10');
      expect(ids[1]).toBe('28-1');
      expect(ids[2]).toBe('16-1');
    });
  });
});

describe('stageRecommendation Logic with Real Data', () => {
  describe('World 3 シナリオ (ランク2素材)', () => {
    it('複数のランク2素材に対して、最も少ないステージ数でカバーできるルートを選択する', () => {
      // 不足素材: ランク2 剣(26), ランク2 鎧(21), ランク2 杖(27)
      const shortages = new Map([
        [blueprints[2].sword, 10],
        [blueprints[2].armor, 5],
        [blueprints[2].wand, 8],
      ]);

      const results = getAvailableStageResults(shortages, 3, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // 3-10 は 鎧(21) と 剣(26) をドロップする
      // 3-2, 3-5, 3-9 は 杖(27) をドロップする
      // 合計2ステージですべてカバーできるはず
      expect(route.length).toBe(2);

      const ids = route.map(r => r.id);
      expect(ids).toContain('3-10'); // 鎧 + 剣を1つでカバーできる唯一のステージ

      // 実際にすべての素材がカバーされているか確認
      const coveredItems = new Set();
      route.forEach(r => r.matchingItems.forEach(m => coveredItems.add(m.id)));
      expect(coveredItems.has(blueprints[2].sword)).toBe(true);
      expect(coveredItems.has(blueprints[2].armor)).toBe(true);
      expect(coveredItems.has(blueprints[2].wand)).toBe(true);
    });

    it('ステージ数が同じ場合、より高レベル（後半）のステージを優先する', () => {
      // 不足素材: ランク2 鎧(21) のみ
      const shortages = new Map([
        [blueprints[2].armor, 1],
      ]);

      const results = getAvailableStageResults(shortages, 3, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // 鎧(21) は 3-6 と 3-10 でドロップする
      // タイブレークにより、よりワールドレベルが高い 3-10 が選ばれるべき
      expect(route.length).toBe(1);
      expect(route[0].id).toBe('3-10');
    });
  });

  describe('World 13 シナリオ (複数ランク混合ドロップ)', () => {
    it('ランク4とランク5が混在するステージで、効率的な組み合わせを選択できる', () => {
      // 13-1: ランク4ブーツ(44), ランク5剣(56)
      const shortages = new Map([
        [blueprints[4].boot, 1],
        [blueprints[5].sword, 1],
      ]);

      const results = getAvailableStageResults(shortages, 13, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // 13-1 が両方の不足素材をドロップするため、これ1つで済む
      expect(route.length).toBe(1);
      expect(route[0].id).toBe('13-1');
    });
  });

  describe('高レベルステージの優先順位', () => {
    it('同じ素材をドロップする複数のステージがある場合、到達可能な範囲で最も高いレベルのステージを選ぶ', () => {
      // ランク6の素材などは複数のワールド(19, 20)にまたがってドロップする
      const shortages = new Map([
        [blueprints[6].armor, 1],
      ]);

      const results = getAvailableStageResults(shortages, 20, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // ランク6鎧(61) は 19-1, 19-3, 19-4, 20-1, 20-2, 20-8 など多数にある
      // その中で最もレベルが高い 20-8 が選ばれるべき
      expect(route.length).toBe(1);
      expect(route[0].id).toBe('20-8');
    });
  });

  describe('獲得不能なケース', () => {
    it('現在の到達度（maxWorld）では取得できない素材が含まれていても、取得可能な範囲で最適化する', () => {
      const shortages = new Map([
        [blueprints[2].sword, 1], // ワールド3で取得可能
        [blueprints[8].sword, 1], // ワールド28で取得可能
      ]);

      const results = getAvailableStageResults(shortages, 3, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // ワールド3までしか行けないので、ランク2の剣だけが対象になる
      expect(route.length).toBe(1);
      expect(route[0].id).toBe('3-10'); // (3-1, 3-4, 3-8, 3-10 のうち最高レベル)

      const covered = route[0].matchingItems.map(m => m.id);
      expect(covered).toContain(blueprints[2].sword);
      expect(covered).not.toContain(blueprints[8].sword);
    });
  });

  describe('ランク6素材の網羅シナリオ (World 19-20)', () => {
    it('全7種類のランク6素材を、最小限の4ステージで網羅できるルートを選択する', () => {
      // ランク6の全7種を不足させる
      const shortages = new Map([
        [blueprints[6].sword, 10],
        [blueprints[6].wand, 10],
        [blueprints[6].armor, 10],
        [blueprints[6].hat, 10],
        [blueprints[6].boot, 10],
        [blueprints[6].ring, 10],
        [blueprints[6].accessory, 10],
      ]);

      const results = getAvailableStageResults(shortages, 20, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // ワールド20のドロップ例:
      // 20-10: 剣 + ブーツ
      // 20-8: 鎧 + 杖
      // 20-9: 帽子 + アクセサリ
      // 20-4: 指環 + ブーツ
      // これら4つの組み合わせで全7種をカバー可能（ブーツが重複するが、他の組み合わせより効率的）
      expect(route.length).toBe(4);

      // すべての素材がカバーされているか
      const coveredItems = new Set();
      route.forEach(r => r.matchingItems.forEach(m => coveredItems.add(m.id)));
      expect(coveredItems.size).toBe(7);
    });

    it('同じ素材構成でも、よりワールドレベルが高い（後半の）ステージを優先する', () => {
      // 鎧(61) と 杖(67) の組み合わせ
      // 19-4 と 20-1 と 20-8 がこのペアをドロップする
      const shortages = new Map([
        [blueprints[6].armor, 1],
        [blueprints[6].wand, 1],
      ]);

      const results = getAvailableStageResults(shortages, 20, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      expect(route.length).toBe(1);
      expect(route[0].id).toBe('20-8'); // 最も後半のステージ
    });

    it('不足数に偏りがある場合、最も不足している素材をドロップするステージを優先しつつ網羅する', () => {
      // 剣(66)が大量に必要、アクセサリ(65)は1つだけ
      const shortages = new Map([
        [blueprints[6].sword, 100],
        [blueprints[6].accessory, 1],
      ]);

      const results = getAvailableStageResults(shortages, 20, 10);

      const routes = calculateRecommendedRoute(results);
      const route = routes[0];

      // 20-6 (アクセサリ+剣) が 20-7(杖+アクセサリ)+20-10(ブーツ+剣) などの組み合わせより優先されるはず
      // なぜなら20-6は1ステージで両方をカバーし、かつ剣(100)のドロップを最大化（スコア化）できるから
      expect(route.length).toBe(1);
      expect(route[0].id).toBe('20-6');
    });
  });

  // ランク3以外の装備では必ず全装備をカバーできるルートがあるらしい
  describe.each([2, ...range(4, 8)] as const)('ランク%dの', (rank) => {
    describe.each(['物理', '魔法'] as const)('%s装備一式は', (type) => {
      it('3ステージで全装備をカバーできるルートが必ず存在する', () => {
        const weaponId = type === '魔法' ? blueprints[rank].wand : blueprints[rank].sword;

        const shortages = new Map([
          [weaponId, 42],
          [blueprints[rank].hat, 42],
          [blueprints[rank].ring, 42],
          [blueprints[rank].accessory, 42],
          [blueprints[rank].boot, 42],
          [blueprints[rank].armor, 42],
        ]);


        const results = getAvailableStageResults(shortages, MAX_WORLD, 10);
        const routes = calculateRecommendedRoute(results);
        const route = routes[0];

        // どのランク・タイプでも3ステージで網羅可能
        expect(route.length).toBe(3);

        const coveredItems = new Set();
        route.forEach(r => r.matchingItems.forEach(m => coveredItems.add(m.id)));
        expect(coveredItems.size).toBe(6);
      });
    });
  });
});
