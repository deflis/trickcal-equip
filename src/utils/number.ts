/**
 * 文字列を整数に変換します。
 * 変換に失敗した場合（NaN）、または無効な入力の場合は指定されたデフォルト値を返します。
 * 基数は 10 に固定されています。
 */
export const parseSafeInt = (value: string | number | null | undefined, fallback: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? Math.floor(value) : parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};
