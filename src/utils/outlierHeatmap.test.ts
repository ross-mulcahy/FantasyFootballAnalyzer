import { expect, it } from 'vitest';
import { outlierHeatmap } from './outlierHeatmap';
it('marks the strict top and bottom 15% without coloring ordinary values', () => {
  const heat = outlierHeatmap(Array.from({ length: 20 }, (_, index) => index));
  expect([0, 1, 2].map(heat)).toEqual(Array(3).fill('outlier-low'));
  expect([17, 18, 19].map(heat)).toEqual(Array(3).fill('outlier-high'));
  expect(heat(10)).toBe('');
});
it('preserves missing values and does not manufacture outliers from ties or tiny samples', () => {
  expect(outlierHeatmap([null, undefined, NaN, 0])(null)).toBe('');
  expect(outlierHeatmap(Array(12).fill(3))(3)).toBe('');
  expect(outlierHeatmap([1, 2, 3])(3)).toBe('');
  expect(outlierHeatmap([1, 1, 1, 2, 2, 2, 3, 3, 3, 3])(3)).toBe('');
});
