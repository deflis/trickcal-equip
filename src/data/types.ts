import type { IntClosedRange } from "type-fest";

// --- Wiki準拠のデータ定義 ---
export const MIN_RANK = 2;
export const MAX_RANK = 8;
export type RankId = IntClosedRange<typeof MIN_RANK, typeof MAX_RANK>;
export type RankKey = `${RankId}`;

export type ItemConfig = {
  main: number; // ランクごとの必要枚数
  sub: number;  // 1ランク下の装備の必要枚数
};
export type EquipTypeId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type AttackType = 'physical' | 'magic' | 'both';

export type EquipType = {
  id: EquipTypeId;
  name: string;
  attackType: AttackType;
};

export type BlueprintId = `${RankId}${EquipTypeId}`;

export interface Blueprint {
  id: BlueprintId;
  name: string;
  rank: RankId;
  type: string;
  typeId: EquipTypeId;
  attackType: AttackType;
}

export type BlueprintWithState = Blueprint & {
  req: number;
  held: number;
  shortage: number;
  isComplete: boolean;
};


// World2まではランク1の装備がドロップするため、ランク2以上の装備のみを対象とする
export const MIN_WORLD = 3;
export const MAX_WORLD = 28;
export type World = IntClosedRange<typeof MIN_WORLD, typeof MAX_WORLD>;
export type WorldLevel = IntClosedRange<1, 10>;

export type DropId = BlueprintId;

export type ItemState = {
  id: BlueprintId;
  req: number;
  held: number;
};

export type ShortageItem = {
  id: BlueprintId;
  amount: number;
};

export type ShortageMap = Map<BlueprintId, number>;

export type Stage = {
  id: `${World}-${WorldLevel}`;
  drops: DropId[];
};

export type Worlds = {
  [key in World]: {
    [key in WorldLevel]: Omit<Stage, "id">;
  }
}

export type MatchingItem = {
  id: DropId;
  name: string | undefined;
  needed: number;
};

export type OtherDrop = {
  id: DropId;
  name: string | undefined;
};

export type StageResult = {
  id: `${World}-${WorldLevel}`;
  score: number;
  matchingItems: MatchingItem[];
  otherDrops?: OtherDrop[];
  priorityItemId?: DropId;
};
