import { IMemory } from "./interfaces";

interface IClock {
  m: number;
  t: number;
}

interface IRegisterSet {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;
  /**
   * The flags register, consisting of the following bits:
   *
   * | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
   * |---|---|---|---|---|---|---|---|
   * | Z | N | H | C | 0 | 0 | 0 | 0 |
   *
   * - Z = Zero flag: This bit is set when the result of a math operation is zero or two values
   *   match when using the CP instruction.
   * - N = Subtract flag: This bit is set if a subtraction was performed in the last math
   *   instruction.
   * - H = Half Carry Flag: This bit is set if a carry occurred from the lower nibble in the last
   *   math operation.
   * - C = Carry flag: This bit is set if a carry occurred from the last math operation or if
   *   register A is the smaller value when executing the CP instruction.
   */
  f: number;
  /** Program counter */
  pc: number;
  /** Stack pointer */
  sp: number;
}

const enum Flags {
  /**
   * Zero flag: This bit is set when the result of a math operation is zero or two values match when
   * using the CP instruction.
   */
  Z = 0b10000000,
  /**
   * Subtract flag: This bit is set if a subtraction was performed in the last math instruction.
   */
  N = 0b01000000,
  /**
   * Half Carry Flag: This bit is set if a carry occurred from the lower nibble in the last math
   * operation.
   */
  H = 0b00100000,
  /**
   * C = Carry flag: This bit is set if a carry occurred from the last math operation or if register
   * A is the smaller value when executing the CP instruction.
   */
  C = 0b00010000
}

/**
 * Emulates a Z80 CPU
 */
export class Cpu {
  private _c: IClock = {
    m: 0,
    t: 0
  };

  private _r: IRegisterSet = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    h: 0,
    l: 0,
    f: 0,
    pc: 0,
    sp: 0
  };

  private _reset() {
    this._r.a = 0;
    this._r.a = 0;
    this._r.b = 0;
    this._r.c = 0;
    this._r.d = 0;
    this._r.e = 0;
    this._r.h = 0;
    this._r.l = 0;
    this._r.f = 0;
    this._r.pc = 0;
    this._r.sp = 0;
    this._c.m = 0;
    this._c.t = 0;
  }

  private _createOp(op: () => void, cost: number) {
    return () => {
      op();
      this._c.m += cost;
      this._c.t += cost * 4;
    };
  }
}

type IOperation = (r: IRegisterSet, m: IMemory) => number;

function createOp(f: (r: IRegisterSet, m: IMemory) => void, cost: number): IOperation {
  return (r, m) => {
    f(r, m);
    return cost;
  };
}

function toSigned(v: number): number {
  if (v <= 127) {
    return v;
  }
  return -((~v + 1) & 255);
}

const o = {
  LD_A_A: createOp((r) => { r.a = r.a; }, 1),
  LD_A_B: createOp((r) => { r.a = r.b; }, 1),
  LD_A_C: createOp((r) => { r.a = r.c; }, 1),
  LD_A_D: createOp((r) => { r.a = r.d; }, 1),
  LD_A_E: createOp((r) => { r.a = r.e; }, 1),
  LD_A_H: createOp((r) => { r.a = r.h; }, 1),
  LD_A_L: createOp((r) => { r.a = r.l; }, 1),
  LD_A_BC: createOp((r, m) => { r.a = m.rb(r.b << 8 + r.c); }, 2),
  LD_A_DE: createOp((r, m) => { r.a = m.rb(r.d << 8 + r.e); }, 2),
  LD_A_HL: createOp((r, m) => { r.a = m.rb(r.h << 8 + r.l); }, 2),
  LD_A_nn: createOp((r, m) => { r.a = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_A_n: createOp((r, m) => { r.a = m.rb(r.pc++); }, 2),
  LD_B_A: createOp((r) => { r.b = r.a; }, 1),
  LD_B_B: createOp((r) => { r.b = r.b; }, 1),
  LD_B_C: createOp((r) => { r.b = r.c; }, 1),
  LD_B_D: createOp((r) => { r.b = r.d; }, 1),
  LD_B_E: createOp((r) => { r.b = r.e; }, 1),
  LD_B_H: createOp((r) => { r.b = r.h; }, 1),
  LD_B_L: createOp((r) => { r.b = r.l; }, 1),
  LD_B_BC: createOp((r, m) => { r.b = m.rb(r.b << 8 + r.c); }, 2),
  LD_B_DE: createOp((r, m) => { r.b = m.rb(r.d << 8 + r.e); }, 2),
  LD_B_HL: createOp((r, m) => { r.b = m.rb(r.h << 8 + r.l); }, 2),
  LD_B_nn: createOp((r, m) => { r.b = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_B_n: createOp((r, m) => { r.b = m.rb(r.pc++); }, 2),
  LD_C_A: createOp((r) => { r.c = r.a; }, 1),
  LD_C_B: createOp((r) => { r.c = r.b; }, 1),
  LD_C_C: createOp((r) => { r.c = r.c; }, 1),
  LD_C_D: createOp((r) => { r.c = r.d; }, 1),
  LD_C_E: createOp((r) => { r.c = r.e; }, 1),
  LD_C_H: createOp((r) => { r.c = r.h; }, 1),
  LD_C_L: createOp((r) => { r.c = r.l; }, 1),
  LD_C_BC: createOp((r, m) => { r.c = m.rb(r.b << 8 + r.c); }, 2),
  LD_C_DE: createOp((r, m) => { r.c = m.rb(r.d << 8 + r.e); }, 2),
  LD_C_HL: createOp((r, m) => { r.c = m.rb(r.h << 8 + r.l); }, 2),
  LD_C_nn: createOp((r, m) => { r.c = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_C_n: createOp((r, m) => { r.c = m.rb(r.pc++); }, 2),
  LD_D_A: createOp((r) => { r.d = r.a; }, 1),
  LD_D_B: createOp((r) => { r.d = r.b; }, 1),
  LD_D_C: createOp((r) => { r.d = r.c; }, 1),
  LD_D_D: createOp((r) => { r.d = r.d; }, 1),
  LD_D_E: createOp((r) => { r.d = r.e; }, 1),
  LD_D_H: createOp((r) => { r.d = r.h; }, 1),
  LD_D_L: createOp((r) => { r.d = r.l; }, 1),
  LD_D_BC: createOp((r, m) => { r.d = m.rb(r.b << 8 + r.c); }, 2),
  LD_D_DE: createOp((r, m) => { r.d = m.rb(r.d << 8 + r.e); }, 2),
  LD_D_HL: createOp((r, m) => { r.d = m.rb(r.h << 8 + r.l); }, 2),
  LD_D_nn: createOp((r, m) => { r.d = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_D_n: createOp((r, m) => { r.d = m.rb(r.pc++); }, 2),
  LD_E_A: createOp((r) => { r.e = r.a; }, 1),
  LD_E_B: createOp((r) => { r.e = r.b; }, 1),
  LD_E_C: createOp((r) => { r.e = r.c; }, 1),
  LD_E_D: createOp((r) => { r.e = r.d; }, 1),
  LD_E_E: createOp((r) => { r.e = r.e; }, 1),
  LD_E_H: createOp((r) => { r.e = r.h; }, 1),
  LD_E_L: createOp((r) => { r.e = r.l; }, 1),
  LD_E_BC: createOp((r, m) => { r.e = m.rb(r.b << 8 + r.c); }, 2),
  LD_E_DE: createOp((r, m) => { r.e = m.rb(r.d << 8 + r.e); }, 2),
  LD_E_HL: createOp((r, m) => { r.e = m.rb(r.h << 8 + r.l); }, 2),
  LD_E_nn: createOp((r, m) => { r.e = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_E_n: createOp((r, m) => { r.e = m.rb(r.pc++); }, 2),
  LD_H_A: createOp((r) => { r.h = r.a; }, 1),
  LD_H_B: createOp((r) => { r.h = r.b; }, 1),
  LD_H_C: createOp((r) => { r.h = r.c; }, 1),
  LD_H_D: createOp((r) => { r.h = r.d; }, 1),
  LD_H_E: createOp((r) => { r.h = r.e; }, 1),
  LD_H_H: createOp((r) => { r.h = r.h; }, 1),
  LD_H_L: createOp((r) => { r.h = r.l; }, 1),
  LD_H_BC: createOp((r, m) => { r.h = m.rb(r.b << 8 + r.c); }, 2),
  LD_H_DE: createOp((r, m) => { r.h = m.rb(r.d << 8 + r.e); }, 2),
  LD_H_HL: createOp((r, m) => { r.h = m.rb(r.h << 8 + r.l); }, 2),
  LD_H_nn: createOp((r, m) => { r.h = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_H_n: createOp((r, m) => { r.h = m.rb(r.pc++); }, 2),
  LD_L_A: createOp((r) => { r.l = r.a; }, 1),
  LD_L_B: createOp((r) => { r.l = r.b; }, 1),
  LD_L_C: createOp((r) => { r.l = r.c; }, 1),
  LD_L_D: createOp((r) => { r.l = r.d; }, 1),
  LD_L_E: createOp((r) => { r.l = r.e; }, 1),
  LD_L_H: createOp((r) => { r.l = r.h; }, 1),
  LD_L_L: createOp((r) => { r.l = r.l; }, 1),
  LD_L_BC: createOp((r, m) => { r.l = m.rb(r.b << 8 + r.c); }, 2),
  LD_L_DE: createOp((r, m) => { r.l = m.rb(r.d << 8 + r.e); }, 2),
  LD_L_HL: createOp((r, m) => { r.l = m.rb(r.h << 8 + r.l); }, 2),
  LD_L_nn: createOp((r, m) => { r.l = m.rb(m.rw(r.pc)); r.pc += 2; }, 4),
  LD_L_n: createOp((r, m) => { r.l = m.rb(r.pc++); }, 2),
  LD_HL_B: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.b); }, 2),
  LD_HL_C: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.c); }, 2),
  LD_HL_D: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.d); }, 2),
  LD_HL_E: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.e); }, 2),
  LD_HL_H: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.h); }, 2),
  LD_HL_L: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.l); }, 2),
  LD_HL_n: createOp((r, m) => { m.wb(r.h << 8 + r.l, m.rb(r.pc++)); }, 3),

  LD_BC_A: createOp((r, m) => { m.wb(r.b << 8 + r.c, r.a); }, 2),
  LD_DE_A: createOp((r, m) => { m.wb(r.d << 8 + r.e, r.a); }, 2),
  LD_HL_A: createOp((r, m) => { m.wb(r.h << 8 + r.l, r.a); }, 2),
  LD_nn_A: createOp((r, m) => { m.wb(m.rw(r.pc), r.a); r.pc += 2; }, 4),

  LD_A_FFC: createOp((r, m) => { r.a = m.rb(0xFF00 + r.c); }, 2),
  LD_FFC_A: createOp((r, m) => { m.wb(0xFF00 + r.c, r.a); }, 2),
  LD_A_HLD: createOp((r, m) => {
    o.LD_A_HL(r, m);
    r.l = (r.l - 1) & 255;
    if (r.l === 255) {
      r.h = (r.h - 1) & 255;
    }
  }, 2),
  LD_HLD_A: createOp((r, m) => {
    o.LD_HL_A(r, m);
    r.l = (r.l - 1) & 255;
    if (r.l === 255) {
      r.h = (r.h - 1) & 255;
    }
  }, 2),
  LD_A_HLI: createOp((r, m) => {
    o.LD_A_HL(r, m);
    r.l = (r.l + 1) & 255;
    if (r.l === 0) {
      r.h = (r.h + 1) & 255;
    }
  }, 2),
  LD_HLI_A: createOp((r, m) => {
    o.LD_HL_A(r, m);
    r.l = (r.l + 1) & 255;
    if (r.l === 0) {
      r.h = (r.h + 1) & 255;
    }
  }, 2),
  LD_FFn_A: createOp((r, m) => { m.wb(0xFF00 + m.rb(r.pc++), r.a); }, 3),
  LD_A_FFn: createOp((r, m) => { r.a = m.rb(0xFF00 + m.rb(r.pc++)); }, 3),

  LD_BC_nn: createOp((r, m) => { r.c = m.rb(r.pc++); r.b = m.rb(r.pc++); }, 3),
  LD_DE_nn: createOp((r, m) => { r.e = m.rb(r.pc++); r.d = m.rb(r.pc++); }, 3),
  LD_HL_nn: createOp((r, m) => { r.l = m.rb(r.pc++); r.h = m.rb(r.pc++); }, 3),
  LD_SP_nn: createOp((r, m) => { r.sp = m.rw(r.pc); r.pc += 2; }, 3),
  LD_SP_HL: createOp((r, m) => { r.sp = m.rb(r.h) << 8 | m.rb(r.l); }, 2),
  LD_HL_SPn: createOp((r, m) => {
    // TODO: Respect flags http://marc.rawer.de/Gameboy/Docs/GBCPUman.pdf
    const v = toSigned(m.rb(r.pc++)) + r.sp;
    r.h = v >> 8 & 255;
    r.l = v & 255;
  }, 3),
  // TODO: Verify this is correct
  LD_nn_SP: createOp((r, m) => { m.ww(m.rw(r.pc), r.sp); r.pc += 2; }, 5),

  // TODO: Verify push cost
  // - http://imrannazar.com/content/files/jsgb.z80.js says 3
  // - http://marc.rawer.de/Gameboy/Docs/GBCPUman.pdf says 4
  PUSH_AF: createOp((r, m) => { m.wb(--r.sp, r.a); m.wb(--r.sp, r.f); }, 4),
  PUSH_BC: createOp((r, m) => { m.wb(--r.sp, r.b); m.wb(--r.sp, r.c); }, 4),
  PUSH_DE: createOp((r, m) => { m.wb(--r.sp, r.d); m.wb(--r.sp, r.e); }, 4),
  PUSH_HL: createOp((r, m) => { m.wb(--r.sp, r.h); m.wb(--r.sp, r.l); }, 4),

  POP_AF: createOp((r, m) => { r.f = m.rb(r.sp++); r.a = m.rb(r.sp++); }, 3),
  POP_BC: createOp((r, m) => { r.c = m.rb(r.sp++); r.b = m.rb(r.sp++); }, 3),
  POP_DE: createOp((r, m) => { r.e = m.rb(r.sp++); r.d = m.rb(r.sp++); }, 3),
  POP_HL: createOp((r, m) => { r.l = m.rb(r.sp++); r.h = m.rb(r.sp++); }, 3),

  ADD_A: createOp((r, m) => { add(r, r.a); }, 1),
  ADD_B: createOp((r, m) => { add(r, r.b); }, 1),
  ADD_C: createOp((r, m) => { add(r, r.c); }, 1),
  ADD_D: createOp((r, m) => { add(r, r.d); }, 1),
  ADD_E: createOp((r, m) => { add(r, r.e); }, 1),
  ADD_H: createOp((r, m) => { add(r, r.h); }, 1),
  ADD_L: createOp((r, m) => { add(r, r.l); }, 1),
  ADD_HL: createOp((r, m) => { add(r, m.rb(r.h << 8 + r.l)); }, 2),
  ADD_n: createOp((r, m) => { add(r, m.rb(r.pc++)); }, 2),

  ADC_A: createOp((r, m) => { add(r, r.a + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_B: createOp((r, m) => { add(r, r.b + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_C: createOp((r, m) => { add(r, r.c + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_D: createOp((r, m) => { add(r, r.d + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_E: createOp((r, m) => { add(r, r.e + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_H: createOp((r, m) => { add(r, r.h + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_L: createOp((r, m) => { add(r, r.l + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_HL: createOp((r, m) => { add(r, m.rb(r.h << 8 + r.l) + (r.f & Flags.C ? 1 : 0)); }, 2),
  ADC_n: createOp((r, m) => { add(r, m.rb(r.pc++) + (r.f & Flags.C ? 1 : 0)); }, 2),

  SUB_A: createOp((r, m) => { sub(r, r.a); }, 1),
  SUB_B: createOp((r, m) => { sub(r, r.b); }, 1),
  SUB_C: createOp((r, m) => { sub(r, r.c); }, 1),
  SUB_D: createOp((r, m) => { sub(r, r.d); }, 1),
  SUB_E: createOp((r, m) => { sub(r, r.e); }, 1),
  SUB_H: createOp((r, m) => { sub(r, r.h); }, 1),
  SUB_L: createOp((r, m) => { sub(r, r.l); }, 1),
  SUB_HL: createOp((r, m) => { sub(r, m.rb(r.h << 8 + r.l)); }, 2),
  SUB_n: createOp((r, m) => { sub(r, m.rb(r.pc++)); }, 2),

  SBC_A: createOp((r, m) => { sub(r, r.a + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_B: createOp((r, m) => { sub(r, r.b + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_C: createOp((r, m) => { sub(r, r.c + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_D: createOp((r, m) => { sub(r, r.d + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_E: createOp((r, m) => { sub(r, r.e + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_H: createOp((r, m) => { sub(r, r.h + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_L: createOp((r, m) => { sub(r, r.l + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_HL: createOp((r, m) => { sub(r, m.rb(r.h << 8 + r.l) + (r.f & Flags.C ? 1 : 0)); }, 2),
  // SBC_n not needed?

  AND_A: createOp((r, m) => { and(r, r.a); }, 1),
  AND_B: createOp((r, m) => { and(r, r.b); }, 1),
  AND_C: createOp((r, m) => { and(r, r.c); }, 1),
  AND_D: createOp((r, m) => { and(r, r.d); }, 1),
  AND_E: createOp((r, m) => { and(r, r.e); }, 1),
  AND_H: createOp((r, m) => { and(r, r.h); }, 1),
  AND_L: createOp((r, m) => { and(r, r.l); }, 1),
  AND_HL: createOp((r, m) => { and(r, m.rb(r.h << 8 + r.l)); }, 1),
  AND_n: createOp((r, m) => { and(r, m.rb(r.pc++)); }, 1),

  OR_A: createOp((r, m) => { or(r, r.a); }, 1),
  OR_B: createOp((r, m) => { or(r, r.b); }, 1),
  OR_C: createOp((r, m) => { or(r, r.c); }, 1),
  OR_D: createOp((r, m) => { or(r, r.d); }, 1),
  OR_E: createOp((r, m) => { or(r, r.e); }, 1),
  OR_H: createOp((r, m) => { or(r, r.h); }, 1),
  OR_L: createOp((r, m) => { or(r, r.l); }, 1),
  OR_HL: createOp((r, m) => { or(r, m.rb(r.h << 8 + r.l)); }, 1),
  OR_n: createOp((r, m) => { or(r, m.rb(r.pc++)); }, 1),

  XOR_A: createOp((r, m) => { xor(r, r.a); }, 1),
  XOR_B: createOp((r, m) => { xor(r, r.b); }, 1),
  XOR_C: createOp((r, m) => { xor(r, r.c); }, 1),
  XOR_D: createOp((r, m) => { xor(r, r.d); }, 1),
  XOR_E: createOp((r, m) => { xor(r, r.e); }, 1),
  XOR_H: createOp((r, m) => { xor(r, r.h); }, 1),
  XOR_L: createOp((r, m) => { xor(r, r.l); }, 1),
  XOR_HL: createOp((r, m) => { xor(r, m.rb(r.h << 8 + r.l)); }, 1),
  XOR_n: createOp((r, m) => { xor(r, m.rb(r.pc++)); }, 1),

  CP_A: createOp((r, m) => { cp(r, r.a); }, 1),
  CP_B: createOp((r, m) => { cp(r, r.b); }, 1),
  CP_C: createOp((r, m) => { cp(r, r.c); }, 1),
  CP_D: createOp((r, m) => { cp(r, r.d); }, 1),
  CP_E: createOp((r, m) => { cp(r, r.e); }, 1),
  CP_H: createOp((r, m) => { cp(r, r.h); }, 1),
  CP_L: createOp((r, m) => { cp(r, r.l); }, 1),
  CP_HL: createOp((r, m) => { cp(r, m.rb(r.h << 8 + r.l)); }, 1),
  CP_n: createOp((r, m) => { cp(r, m.rb(r.pc++)); }, 1),

  NOP: createOp(() => {}, 1)
}

/**
 * Resets flags after an operation, setting Z appropriately.
 */
function resetFlags(r: IRegisterSet, result: number) {
  r.f = 0;
  // Set Z if the resulting value was 0
  if ((result & 255) === 0) {
    r.f |= Flags.Z;
  }
}

// TODO: This is meant to set H if carry from bit 3
function add(r: IRegisterSet, value: number) {
  r.a += value;
  resetFlags(r, r.a);
  if (r.a > 255) {
    r.f |= Flags.C;
  }
  r.a &= 255;
}

// TODO: This is meant to set H no borrow from bit 4
function sub(r: IRegisterSet, value: number) {
  r.a -= value;
  resetFlags(r, r.a);
  r.f |= Flags.N;
  if (r.a < 0) {
    r.f |= Flags.C;
  }
  r.a &= 255;
}

function and(r: IRegisterSet, value: number) {
  r.a &= value;
  resetFlags(r, r.a);
  if (r.a > 255) {
    r.f |= Flags.C;
  }
  r.f |= Flags.H
  r.a &= 255;
}

function or(r: IRegisterSet, value: number) {
  r.a |= value;
  resetFlags(r, r.a);
  r.a &= 255;
}

function xor(r: IRegisterSet, value: number) {
  r.a ^= value;
  resetFlags(r, r.a);
  r.a &= 255;
}

function cp(r: IRegisterSet, value: number) {
  const v = r.a - value;
  resetFlags(r, v);
  r.f |= Flags.N;
  if (v < 0) {
    r.f |= Flags.C;
  }
}

const oMap: (IOperation | undefined)[] = [
  // 00
  o.NOP,
  o.LD_BC_nn,
  o.LD_BC_A,
  undefined,
  undefined,
  undefined,
  o.LD_B_n,
  undefined,
  o.LD_nn_SP,
  undefined,
  o.LD_A_BC,
  undefined,
  undefined,
  undefined,
  o.LD_C_n,
  undefined,

  // 10
  undefined,
  o.LD_DE_nn,
  o.LD_DE_A,
  undefined,
  undefined,
  undefined,
  o.LD_D_n,
  undefined,
  undefined,
  undefined,
  o.LD_A_DE,
  undefined,
  undefined,
  undefined,
  o.LD_E_n,
  undefined,

  // 20
  undefined,
  o.LD_HL_nn,
  o.LD_HLI_A,
  undefined,
  undefined,
  undefined,
  o.LD_H_n,
  undefined,
  undefined,
  undefined,
  o.LD_A_HLI,
  undefined,
  undefined,
  undefined,
  o.LD_L_n,
  undefined,

  // 30
  undefined,
  o.LD_SP_nn,
  o.LD_HLD_A,
  undefined,
  undefined,
  undefined,
  o.LD_HL_n,
  undefined,
  undefined,
  undefined,
  o.LD_A_HLD,
  undefined,
  undefined,
  undefined,
  o.LD_A_n,
  undefined,

  // 40
  o.LD_B_B,
  o.LD_B_C,
  o.LD_B_D,
  o.LD_B_E,
  o.LD_B_H,
  o.LD_B_L,
  o.LD_B_HL,
  o.LD_B_A,
  o.LD_C_B,
  o.LD_C_C,
  o.LD_C_D,
  o.LD_C_E,
  o.LD_C_H,
  o.LD_C_L,
  o.LD_C_HL,
  o.LD_C_A,

  // 50
  o.LD_D_B,
  o.LD_D_C,
  o.LD_D_D,
  o.LD_D_E,
  o.LD_D_H,
  o.LD_D_L,
  o.LD_D_HL,
  o.LD_D_A,
  o.LD_E_B,
  o.LD_E_C,
  o.LD_E_D,
  o.LD_E_E,
  o.LD_E_H,
  o.LD_E_L,
  o.LD_E_HL,
  o.LD_E_A,

  // 60
  o.LD_H_B,
  o.LD_H_C,
  o.LD_H_D,
  o.LD_H_E,
  o.LD_H_H,
  o.LD_H_L,
  o.LD_H_HL,
  o.LD_H_A,
  o.LD_L_B,
  o.LD_L_C,
  o.LD_L_D,
  o.LD_L_E,
  o.LD_L_H,
  o.LD_L_L,
  o.LD_L_HL,
  o.LD_L_A,

  // 70
  o.LD_HL_B,
  o.LD_HL_C,
  o.LD_HL_D,
  o.LD_HL_E,
  o.LD_HL_H,
  o.LD_HL_L,
  o.LD_HL_A,
  undefined,
  o.LD_A_B,
  o.LD_A_C,
  o.LD_A_D,
  o.LD_A_E,
  o.LD_A_H,
  o.LD_A_L,
  o.LD_A_HL,
  o.LD_A_A,

  // 80
  o.ADD_B,
  o.ADD_C,
  o.ADD_D,
  o.ADD_E,
  o.ADD_H,
  o.ADD_L,
  o.ADD_HL,
  o.ADD_A,
  o.ADC_B,
  o.ADC_C,
  o.ADC_D,
  o.ADC_E,
  o.ADC_H,
  o.ADC_L,
  o.ADC_HL,
  o.ADC_A,

  // 90
  o.SUB_B,
  o.SUB_C,
  o.SUB_D,
  o.SUB_E,
  o.SUB_H,
  o.SUB_L,
  o.SUB_HL,
  o.SUB_A,
  o.SBC_B,
  o.SBC_C,
  o.SBC_D,
  o.SBC_E,
  o.SBC_H,
  o.SBC_L,
  o.SBC_HL,
  o.SBC_A,

  // A0
  o.AND_B,
  o.AND_C,
  o.AND_D,
  o.AND_E,
  o.AND_H,
  o.AND_L,
  o.AND_HL,
  o.AND_A,
  o.XOR_B,
  o.XOR_C,
  o.XOR_D,
  o.XOR_E,
  o.XOR_H,
  o.XOR_L,
  o.XOR_HL,
  o.XOR_A,

  // B0
  o.OR_B,
  o.OR_C,
  o.OR_D,
  o.OR_E,
  o.OR_H,
  o.OR_L,
  o.OR_HL,
  o.OR_A,
  o.CP_B,
  o.CP_C,
  o.CP_D,
  o.CP_E,
  o.CP_H,
  o.CP_L,
  o.CP_HL,
  o.CP_A,

  // C0
  undefined,
  o.POP_BC,
  undefined,
  undefined,
  undefined,
  o.PUSH_BC,
  o.ADD_n,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  o.ADC_n,
  undefined,

  // D0
  undefined,
  o.POP_DE,
  undefined,
  undefined,
  undefined,
  o.PUSH_DE,
  o.SUB_n,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // E0
  o.LD_FFn_A,
  o.POP_HL,
  o.LD_FFC_A,
  undefined,
  undefined,
  o.PUSH_HL,
  o.AND_n,
  undefined,
  undefined,
  undefined,
  o.LD_nn_A,
  undefined,
  undefined,
  undefined,
  o.XOR_n,
  undefined,

  // F0
  o.LD_A_FFn,
  o.POP_AF,
  o.LD_A_FFC,
  undefined,
  undefined,
  o.PUSH_AF,
  o.OR_n,
  undefined,
  o.LD_HL_SPn,
  o.LD_SP_HL,
  o.LD_A_nn,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
];
