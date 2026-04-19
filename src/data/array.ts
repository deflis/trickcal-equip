import type { IntClosedRange } from "type-fest";

export function* rangeIterator<TStart extends number, TEnd extends number>(start: TStart, end: TEnd): Generator<IntClosedRange<TStart, TEnd>, void, unknown> {
  type RangeType = IntClosedRange<TStart, TEnd>;
  for (let i = start; i <= end; i++) {
    yield i as unknown as RangeType;
  }
}


export function range<TStart extends number, TEnd extends number>(start: TStart, end: TEnd): IntClosedRange<TStart, TEnd>[];

export function range(start: number, end: number): number[] {
  return Array.from(rangeIterator(start, end));
}

