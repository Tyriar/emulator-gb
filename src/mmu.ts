import { IMemory as IMmu } from './interfaces';

/**
 * The memory management unit.
 *
 * Memory regions:
 * - 0x0000 - 0x3FFF: ROM Bank 0
 *   - 0x0000 - 0x00FF: BIOS
 *   - 0x0100 - 0x014F: Cartridge header
 * - 0x4000 - 0x7FFF: ROM Bank 1
 * - 0x8000 - 0x9FFF: Graphics RAM
 * - 0xA000 - 0x:BFFF: Cartridge (External) RAM
 * - 0xC000 - 0x:DFFF: Working RAM
 * - 0xE000 - 0x:FDFF: Working RAM (shadow)
 * - 0xFE00 - 0x:FE9F: Graphics sprite information
 * - 0xFF00 - 0x:FF7F: Memory-mapped I/O
 * - 0xFF80 - 0x:FFFF: Zero-page RAM
 */
export class Mmu implements IMmu {
  private _memory: Uint8Array = new Uint8Array(65536);

  /** Read byte */
  rb(address: number) {
    return this._memory[address];
  }

  /** Read 16-bit word */
  rw(address: number) {
    return this._memory[address] + (this._memory[address] << 8);
  }

  /** Write byte*/
  wb(address: number, value: number) {
    // TODO: Disallow writing to certain regions
    this._memory[address] = value;
  }

  /** Write 16-bit word */
  ww(address: number, value: number) {
    this.wb(address, value & 255);
    this.wb(address + 1, value >> 8);
  }
}
