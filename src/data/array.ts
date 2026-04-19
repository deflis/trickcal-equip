import type { IntClosedRange } from "type-fest";

function* rangeIterator(start: number, end: number): Generator<number, void, unknown> {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}


export function range<TStart extends number, TEnd extends number>(start: TStart, end: TEnd): IntClosedRange<TStart, TEnd>[];

export function range(start: number, end: number): number[] {
  return Array.from(rangeIterator(start, end));
}

