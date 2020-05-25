import { IMemory } from "./interfaces";

interface IRegisterSet {
  /**
   * The accumulator register, this is specially used for logic and arithmetic.
   */
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
  /**
   * While the clock speed of the CPU on the gameboy was ~4MHz, the actual operations were RAM bound
   * which ran at ~1MHz. As such, this value will use 1MHz based cycle speeds to avoid requiring all
   * CPU costs to be divisible by 4.
   */
  private _c: number = 0;

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
    this._c = 0;
  }

  cycle(m: IMemory) {
    const opcode = m.rb(this._r.pc++);
    const op = oMap[opcode];
    if (op) {
      const cycles = op(this._r, m);
      this._c += cycles;
    } else {
      throw new Error(`opcode 0x${opcode.toString(16)} not implemented`);
    }
  }
}

type IOperation = (r: IRegisterSet, m: IMemory) => number;

function createOp(f: (r: IRegisterSet, m: IMemory) => void, cycles: number): IOperation {
  return (r, m) => {
    f(r, m);
    return cycles;
  };
}

function toSigned(v: number): number {
  if (v <= 127) {
    return v;
  }
  return -((~v + 1) & 255);
}

/**
 * All CPU operations, these are mostly based on http://marc.rawer.de/Gameboy/Docs/GBCPUman.pdf with
 * the following name mappings:
 *
 * - (HL) -> HLM
 * - # -> n
 * - ($FF00+x) -> FFx
 */
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

  ADD_A: createOp((r) => { add(r, r.a); }, 1),
  ADD_B: createOp((r) => { add(r, r.b); }, 1),
  ADD_C: createOp((r) => { add(r, r.c); }, 1),
  ADD_D: createOp((r) => { add(r, r.d); }, 1),
  ADD_E: createOp((r) => { add(r, r.e); }, 1),
  ADD_H: createOp((r) => { add(r, r.h); }, 1),
  ADD_L: createOp((r) => { add(r, r.l); }, 1),
  ADD_HLM: createOp((r, m) => { add(r, m.rb(r.h << 8 + r.l)); }, 2),
  ADD_n: createOp((r, m) => { add(r, m.rb(r.pc++)); }, 2),

  ADC_A: createOp((r) => { add(r, r.a + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_B: createOp((r) => { add(r, r.b + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_C: createOp((r) => { add(r, r.c + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_D: createOp((r) => { add(r, r.d + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_E: createOp((r) => { add(r, r.e + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_H: createOp((r) => { add(r, r.h + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_L: createOp((r) => { add(r, r.l + (r.f & Flags.C ? 1 : 0)); }, 1),
  ADC_HLM: createOp((r, m) => { add(r, m.rb(r.h << 8 + r.l) + (r.f & Flags.C ? 1 : 0)); }, 2),
  ADC_n: createOp((r, m) => { add(r, m.rb(r.pc++) + (r.f & Flags.C ? 1 : 0)); }, 2),

  SUB_A: createOp((r) => { sub(r, r.a); }, 1),
  SUB_B: createOp((r) => { sub(r, r.b); }, 1),
  SUB_C: createOp((r) => { sub(r, r.c); }, 1),
  SUB_D: createOp((r) => { sub(r, r.d); }, 1),
  SUB_E: createOp((r) => { sub(r, r.e); }, 1),
  SUB_H: createOp((r) => { sub(r, r.h); }, 1),
  SUB_L: createOp((r) => { sub(r, r.l); }, 1),
  SUB_HLM: createOp((r, m) => { sub(r, m.rb(r.h << 8 + r.l)); }, 2),
  SUB_n: createOp((r, m) => { sub(r, m.rb(r.pc++)); }, 2),

  SBC_A: createOp((r) => { sub(r, r.a + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_B: createOp((r) => { sub(r, r.b + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_C: createOp((r) => { sub(r, r.c + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_D: createOp((r) => { sub(r, r.d + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_E: createOp((r) => { sub(r, r.e + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_H: createOp((r) => { sub(r, r.h + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_L: createOp((r) => { sub(r, r.l + (r.f & Flags.C ? 1 : 0)); }, 1),
  SBC_HLM: createOp((r, m) => { sub(r, m.rb(r.h << 8 + r.l) + (r.f & Flags.C ? 1 : 0)); }, 2),
  // SBC_n not needed?

  AND_A: createOp((r) => { and(r, r.a); }, 1),
  AND_B: createOp((r) => { and(r, r.b); }, 1),
  AND_C: createOp((r) => { and(r, r.c); }, 1),
  AND_D: createOp((r) => { and(r, r.d); }, 1),
  AND_E: createOp((r) => { and(r, r.e); }, 1),
  AND_H: createOp((r) => { and(r, r.h); }, 1),
  AND_L: createOp((r) => { and(r, r.l); }, 1),
  AND_HLM: createOp((r, m) => { and(r, m.rb(r.h << 8 + r.l)); }, 2),
  AND_n: createOp((r, m) => { and(r, m.rb(r.pc++)); }, 2),

  OR_A: createOp((r) => { or(r, r.a); }, 1),
  OR_B: createOp((r) => { or(r, r.b); }, 1),
  OR_C: createOp((r) => { or(r, r.c); }, 1),
  OR_D: createOp((r) => { or(r, r.d); }, 1),
  OR_E: createOp((r) => { or(r, r.e); }, 1),
  OR_H: createOp((r) => { or(r, r.h); }, 1),
  OR_L: createOp((r) => { or(r, r.l); }, 1),
  OR_HLM: createOp((r, m) => { or(r, m.rb(r.h << 8 + r.l)); }, 2),
  OR_n: createOp((r, m) => { or(r, m.rb(r.pc++)); }, 2),

  XOR_A: createOp((r) => { xor(r, r.a); }, 1),
  XOR_B: createOp((r) => { xor(r, r.b); }, 1),
  XOR_C: createOp((r) => { xor(r, r.c); }, 1),
  XOR_D: createOp((r) => { xor(r, r.d); }, 1),
  XOR_E: createOp((r) => { xor(r, r.e); }, 1),
  XOR_H: createOp((r) => { xor(r, r.h); }, 1),
  XOR_L: createOp((r) => { xor(r, r.l); }, 1),
  XOR_HLM: createOp((r, m) => { xor(r, m.rb(r.h << 8 + r.l)); }, 2),
  XOR_n: createOp((r, m) => { xor(r, m.rb(r.pc++)); }, 2),

  CP_A: createOp((r) => { cp(r, r.a); }, 1),
  CP_B: createOp((r) => { cp(r, r.b); }, 1),
  CP_C: createOp((r) => { cp(r, r.c); }, 1),
  CP_D: createOp((r) => { cp(r, r.d); }, 1),
  CP_E: createOp((r) => { cp(r, r.e); }, 1),
  CP_H: createOp((r) => { cp(r, r.h); }, 1),
  CP_L: createOp((r) => { cp(r, r.l); }, 1),
  CP_HLM: createOp((r, m) => { cp(r, m.rb(r.h << 8 + r.l)); }, 2),
  CP_n: createOp((r, m) => { cp(r, m.rb(r.pc++)); }, 2),

  INC_A: createOp((r) => { inc(r, 'a'); }, 1),
  INC_B: createOp((r) => { inc(r, 'b'); }, 1),
  INC_C: createOp((r) => { inc(r, 'c'); }, 1),
  INC_D: createOp((r) => { inc(r, 'd'); }, 1),
  INC_E: createOp((r) => { inc(r, 'e'); }, 1),
  INC_H: createOp((r) => { inc(r, 'h'); }, 1),
  INC_L: createOp((r) => { inc(r, 'l'); }, 1),
  INC_HLM: createOp((r, m) => {
    const i = r.h << 8 + r.l;
    const v = (m.rb(i) + 1) & 255;
    m.wb(i, v);
    resetFlags(r, v);
  }, 3),

  DEC_A: createOp((r) => { dec(r, 'a'); }, 1),
  DEC_B: createOp((r) => { dec(r, 'b'); }, 1),
  DEC_C: createOp((r) => { dec(r, 'c'); }, 1),
  DEC_D: createOp((r) => { dec(r, 'd'); }, 1),
  DEC_E: createOp((r) => { dec(r, 'e'); }, 1),
  DEC_H: createOp((r) => { dec(r, 'h'); }, 1),
  DEC_L: createOp((r) => { dec(r, 'l'); }, 1),
  DEC_HLM: createOp((r, m) => {
    const i = r.h << 8 + r.l;
    const v = (m.rb(i) - 1) & 255;
    m.wb(i, v);
    resetFlags(r, v);
  }, 3),

  ADD_HL_BC: createOp((r) => { addHl(r, r.b << 8 + r.c); }, 2),
  ADD_HL_DE: createOp((r) => { addHl(r, r.d << 8 + r.e); }, 2),
  ADD_HL_HL: createOp((r) => { addHl(r, r.h << 8 + r.l); }, 2),
  ADD_HL_SP: createOp((r) => { addHl(r, r.sp); }, 2),
  ADD_SP_n: createOp((r, m) => {
    r.sp += toSigned(m.rb(r.pc++));
    r.f = 0;
    // TODO: Check overflow and set C?
  }, 4),

  INC_BC: createOp((r) => { inc2(r, 'b', 'c'); }, 2),
  INC_DE: createOp((r) => { inc2(r, 'd', 'e'); }, 2),
  INC_HL: createOp((r) => { inc2(r, 'h', 'l'); }, 2),
  INC_SP: createOp((r) => { inc(r, 'sp', 65535); }, 2),

  DEC_BC: createOp((r) => { dec2(r, 'b', 'c'); }, 2),
  DEC_DE: createOp((r) => { dec2(r, 'd', 'e'); }, 2),
  DEC_HL: createOp((r) => { dec2(r, 'h', 'l'); }, 2),
  DEC_SP: createOp((r) => { dec(r, 'sp', 65535); }, 2),

  // Swap upper and lower nibbles
  SWAP_A: createOp((r) => { swap(r, 'a'); }, 2),
  SWAP_B: createOp((r) => { swap(r, 'b'); }, 2),
  SWAP_C: createOp((r) => { swap(r, 'c'); }, 2),
  SWAP_D: createOp((r) => { swap(r, 'd'); }, 2),
  SWAP_E: createOp((r) => { swap(r, 'e'); }, 2),
  SWAP_H: createOp((r) => { swap(r, 'h'); }, 2),
  SWAP_L: createOp((r) => { swap(r, 'l'); }, 2),
  SWAP_HLM: createOp((r, m) => {
    const i = r.h << 8 + r.l;
    const hlm = m.rb(i);
    const v = (hlm >> 4 | hlm << 4) & 255;
    m.wb(i, v);
    resetFlags(r, v);
  }, 4),

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
  // TODO: Impl H?
}

function inc(r: IRegisterSet, key: keyof IRegisterSet, max: number = 255) {
  r[key] = (r[key] + 1) & max;
  resetFlags(r, r[key]);
}

function inc2(r: IRegisterSet, key1: keyof IRegisterSet, key2: keyof IRegisterSet) {
  r[key2] = (r[key2] + 1) & 255;
  if (r[key2] === 0) {
    r[key1] = (r[key1] + 1) & 255;
  }
}

function dec(r: IRegisterSet, key: keyof IRegisterSet, max: number = 255) {
  r[key] = (r[key] - 1) & max;
  resetFlags(r, r[key]);
}

function dec2(r: IRegisterSet, key1: keyof IRegisterSet, key2: keyof IRegisterSet) {
  r[key2] = (r[key2] - 1) & 255;
  if (r[key2] === 0) {
    r[key1] = (r[key1] - 1) & 255;
  }
}

function addHl(r: IRegisterSet, value: number) {
  const hl = r.h << 8 + r.l + value;
  // TODO: Don't reset Z?
  // TODO: Implement H?
  r.f = 0;
  if (hl > 65535) {
    r.f |= Flags.C;
  }
}

function swap(r: IRegisterSet, key: keyof IRegisterSet) {
  r[key] = (r[key] >> 4 | r[key] << 4) & 255;
  resetFlags(r, r[key]);
}

const oMap: (IOperation | undefined)[] = [
  // 00
  o.NOP,
  o.LD_BC_nn,
  o.LD_BC_A,
  o.INC_BC,
  o.INC_B,
  o.DEC_B,
  o.LD_B_n,
  undefined,
  o.LD_nn_SP,
  o.ADD_HL_BC,
  o.LD_A_BC,
  o.DEC_BC,
  o.INC_C,
  o.DEC_C,
  o.LD_C_n,
  undefined,

  // 10
  undefined,
  o.LD_DE_nn,
  o.LD_DE_A,
  o.INC_DE,
  o.INC_D,
  o.DEC_D,
  o.LD_D_n,
  undefined,
  undefined,
  o.ADD_HL_DE,
  o.LD_A_DE,
  o.DEC_DE,
  o.INC_E,
  o.DEC_E,
  o.LD_E_n,
  undefined,

  // 20
  undefined,
  o.LD_HL_nn,
  o.LD_HLI_A,
  o.INC_HLM,
  o.INC_H,
  o.DEC_H,
  o.LD_H_n,
  undefined,
  undefined,
  o.ADD_HL_HL,
  o.LD_A_HLI,
  o.DEC_HL,
  o.INC_L,
  o.DEC_L,
  o.LD_L_n,
  undefined,

  // 30
  undefined,
  o.LD_SP_nn,
  o.LD_HLD_A,
  o.INC_SP,
  o.INC_HL,
  o.DEC_HLM,
  o.LD_HL_n,
  undefined,
  undefined,
  o.ADD_HL_SP,
  o.LD_A_HLD,
  o.DEC_SP,
  o.INC_A,
  o.DEC_A,
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
  o.ADD_HLM,
  o.ADD_A,
  o.ADC_B,
  o.ADC_C,
  o.ADC_D,
  o.ADC_E,
  o.ADC_H,
  o.ADC_L,
  o.ADC_HLM,
  o.ADC_A,

  // 90
  o.SUB_B,
  o.SUB_C,
  o.SUB_D,
  o.SUB_E,
  o.SUB_H,
  o.SUB_L,
  o.SUB_HLM,
  o.SUB_A,
  o.SBC_B,
  o.SBC_C,
  o.SBC_D,
  o.SBC_E,
  o.SBC_H,
  o.SBC_L,
  o.SBC_HLM,
  o.SBC_A,

  // A0
  o.AND_B,
  o.AND_C,
  o.AND_D,
  o.AND_E,
  o.AND_H,
  o.AND_L,
  o.AND_HLM,
  o.AND_A,
  o.XOR_B,
  o.XOR_C,
  o.XOR_D,
  o.XOR_E,
  o.XOR_H,
  o.XOR_L,
  o.XOR_HLM,
  o.XOR_A,

  // B0
  o.OR_B,
  o.OR_C,
  o.OR_D,
  o.OR_E,
  o.OR_H,
  o.OR_L,
  o.OR_HLM,
  o.OR_A,
  o.CP_B,
  o.CP_C,
  o.CP_D,
  o.CP_E,
  o.CP_H,
  o.CP_L,
  o.CP_HLM,
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
  o.ADD_SP_n,
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
  undefined
];

const oCbMap: (IOperation | undefined)[] = [
  // CB 00
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 10
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 20
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 30
  o.SWAP_B,
  o.SWAP_C,
  o.SWAP_D,
  o.SWAP_E,
  o.SWAP_H,
  o.SWAP_L,
  o.SWAP_HLM,
  o.SWAP_A,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 40
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 50
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 60
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,

  // CB 70
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
]
