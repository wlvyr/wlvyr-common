import { ItemConsolidator, IObjectConsolidator } from "@wlvyr/common";

describe("IObjectConsolidator", () => {
  test("should throw NotImplemented error when consolidate is called", () => {
    const consolidator = new IObjectConsolidator();
    expect(() => consolidator.consolidate({}, {})).toThrow();
  });
});

describe("ItemConsolidator", () => {
  let consolidator;

  beforeEach(() => {
    consolidator = new ItemConsolidator();
  });

  test("should merge two objects correctly when keys do not overlap", () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const result = consolidator.consolidate(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("should override properties from object1 with object2 when keys overlap", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 3, c: 4 };
    const result = consolidator.consolidate(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  test("should return a new object (immutability)", () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const result = consolidator.consolidate(obj1, obj2);
    expect(result).not.toBe(obj1);
    expect(result).not.toBe(obj2);
  });

  test("should handle empty objects correctly", () => {
    expect(consolidator.consolidate({}, {})).toEqual({});
    expect(consolidator.consolidate({ a: 1 }, {})).toEqual({ a: 1 });
    expect(consolidator.consolidate({}, { b: 2 })).toEqual({ b: 2 });
  });
});
