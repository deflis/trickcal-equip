import { range } from "./array";
import { MAX_RANK, type Blueprint, type BlueprintId, type EquipType, type EquipTypeId, type ItemConfig, type RankId } from "./types";

export const RANK_CONFIG = {
  8: { main: 46, sub: 18, josekiPerBlueprint: 24 },
  7: { main: 42, sub: 0, josekiPerBlueprint: 22 },
  6: { main: 36, sub: 14, josekiPerBlueprint: 14 },
  5: { main: 30, sub: 12, josekiPerBlueprint: 12 },
  4: { main: 24, sub: 0, josekiPerBlueprint: 10 },
  3: { main: 18, sub: 0, josekiPerBlueprint: 6 },
  2: { main: 12, sub: 0, josekiPerBlueprint: 5 },
  // ランク1は扱わない
} as const satisfies Record<RankId, ItemConfig>;

export const EQUIP_TYPES = [
  { id: 1, name: '鎧', attackType: 'both' },
  { id: 2, name: '帽子', attackType: 'both' },
  { id: 6, name: '物理武器', attackType: 'physical' },
  { id: 7, name: '魔法武器', attackType: 'magic' },
  { id: 3, name: '煌めく装飾品', attackType: 'both' }, // アイコンは指輪
  { id: 5, name: '華麗な装飾品', attackType: 'both' }, // アイコンはイヤーマフ？
  { id: 4, name: 'ブーツ', attackType: 'both' },
] as const satisfies EquipType[];

export const EQUIPS = {
  'armor': 1,
  'hat': 2,
  'ring': 3,
  'boot': 4,
  'accessory': 5,
  'sword': 6,
  'wand': 7,
} as const satisfies Record<string, EquipTypeId>;

export const BLUEPRINTS: Blueprint[] = range(2, MAX_RANK).reverse()
  .flatMap(r =>
    EQUIP_TYPES.map(type => ({
      id: `${r}${type.id}` as BlueprintId,
      name: `ランク${r} ${type.name}`,
      rank: r,
      type: type.name,
      typeId: type.id,
      attackType: type.attackType,
    }))
  );

export type BlueprintMap = {
  [key in RankId]: {
    armor: `${key}1`;
    hat: `${key}2`;
    ring: `${key}3`;
    boot: `${key}4`;
    accessory: `${key}5`;
    sword: `${key}6`;
    wand: `${key}7`;
  }
}

// 逆引き用
export const blueprints: BlueprintMap = range(2, MAX_RANK).reverse()
  .reduce<BlueprintMap>((acc, rank) => {
    return {
      ...acc,
      [rank]: {
        armor: `${rank}1` as const,
        hat: `${rank}2` as const,
        ring: `${rank}3` as const,
        boot: `${rank}4` as const,
        accessory: `${rank}5` as const,
        sword: `${rank}6` as const,
        wand: `${rank}7` as const,
      }
    };
  }, {} as BlueprintMap);


export const getBlueprintIcon = ({ id }: Blueprint) => `/assets/blueprints/${id}.webp`;