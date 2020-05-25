import { Mmu } from "./mmu";
import { Cpu } from "./cpu";
import { Gpu } from "./gpu";

export class Gameboy {
  private _cpu = new Cpu();
  private _gpu = new Gpu();
  private _mmu = new Mmu();

  load(rom: Uint8Array) {
    this._mmu.load(rom);
  }
}
