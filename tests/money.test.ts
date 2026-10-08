import { describe, expect, it } from 'vitest';
import { calculateShares, simplifySettlements } from '../src/lib/calculations/money';

describe('expense shares in integer paise', () => {
  it('splits equally and distributes spare paise deterministically', () => {
    expect(calculateShares('100.00', ['a','b','c'].map((userId)=>({userId})), 'equal')).toEqual({a:3334,b:3333,c:3333});
  });
  it('accepts unequal exact shares only when their sum equals the bill', () => {
    expect(calculateShares('12.00', [{userId:'a',value:'1.00'},{userId:'b',value:'3.00'},{userId:'c',value:'8.00'}], 'exact')).toEqual({a:100,b:300,c:800});
    expect(()=>calculateShares('12.00',[{userId:'a',value:'10'},{userId:'b',value:'1'}],'exact')).toThrow(/add up/);
  });
  it('calculates percentage splits with remainder-safe rounding', () => {
    expect(calculateShares('10.00',[{userId:'a',value:33.33},{userId:'b',value:33.33},{userId:'c',value:33.34}],'percentage')).toEqual({a:333,b:333,c:334});
    expect(()=>calculateShares('10',[{userId:'a',value:40},{userId:'b',value:40}],'percentage')).toThrow(/100/);
  });
  it('keeps the total exactly 100.00 for three members', () => {
    const shares=calculateShares('100',[{userId:'a'},{userId:'b'},{userId:'c'}],'equal');
    expect(Object.values(shares).reduce((sum,part)=>sum+part,0)).toBe(10000);
  });
  it('leaves an excluded member out of the split', () => {
    expect(calculateShares('18',[{userId:'a'},{userId:'b'},{userId:'c'}],'equal')).toEqual({a:600,b:600,c:600});
  });
});

describe('settlement simplification',()=>{
  it('matches payers to receivers without intermediate transfers',()=>{
    expect(simplifySettlements([{userId:'a',name:'A',balancePaise:200000},{userId:'b',name:'B',balancePaise:-120000},{userId:'c',name:'C',balancePaise:-80000}])).toEqual([
      {fromUserId:'b',fromName:'B',toUserId:'a',toName:'A',amountPaise:120000},
      {fromUserId:'c',fromName:'C',toUserId:'a',toName:'A',amountPaise:80000},
    ]);
  });
  it('rejects non-zero-sum input balances',()=>expect(()=>simplifySettlements([{userId:'a',name:'A',balancePaise:10}])).toThrow(/net to zero/));
});
