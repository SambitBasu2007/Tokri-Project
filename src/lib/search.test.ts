import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { searchScore } from './search';

function product(name: string, category = 'dairy', weight = ''): Product {
  return {
    id: 1,
    name,
    category,
    weight,
    mrp: 100,
    imageUrl: null,
    imageCreditUrl: null,
    barcode: null,
    unitQty: null,
    unit: null,
    prices: {},
  };
}

describe('searchScore', () => {
  it('matches Indian and English names for curd', () => {
    const amulDahi = product('Amul Masti Dahi');
    const motherCurd = product('Mother Dairy Classic Curd');

    expect(searchScore(amulDahi, 'curd')).toBeGreaterThan(0);
    expect(searchScore(motherCurd, 'curd')).toBeGreaterThan(0);
  });

  it('ranks a literal name match above a synonym match', () => {
    const amulDahi = product('Amul Masti Dahi');
    const motherCurd = product('Mother Dairy Classic Curd');

    expect(searchScore(motherCurd, 'curd')).toBeGreaterThan(searchScore(amulDahi, 'curd'));
  });

  it('matches yogurt and dahi across brands', () => {
    expect(searchScore(product('Epigamia Greek Yogurt Blueberry'), 'curd')).toBeGreaterThan(0);
    expect(searchScore(product('Amul Masti Dahi'), 'yogurt')).toBeGreaterThan(0);
    expect(searchScore(product('Mother Dairy Classic Curd'), 'dahi')).toBeGreaterThan(0);
  });

  it('does not match an unrelated token', () => {
    expect(searchScore(product('Amul Masti Dahi'), 'mother')).toBe(0);
  });

  it('handles plurals and common grocery synonyms', () => {
    expect(searchScore(product('Shimla Apples', 'fruits'), 'apple')).toBeGreaterThan(0);
    expect(searchScore(product('Alphonso Mangoes', 'fruits'), 'mangoes')).toBeGreaterThan(0);
    expect(searchScore(product('Green Chillies', 'vegetables'), 'chilli')).toBeGreaterThan(0);
    expect(searchScore(product('Tata Sampann Besan', 'atta'), 'gram flour')).toBeGreaterThan(0);
    expect(searchScore(product('India Gate Poha', 'atta'), 'flattened rice')).toBeGreaterThan(0);
  });
});
