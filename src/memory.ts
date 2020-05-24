import { IMemory } from './interfaces';

export class Memory implements IMemory {
  /** Read byte */
  rb(address: number) {
    return 0;
  }

  /** Read 16-bit word */
  rw(address: number) {
    return 0;
  }

  /** Write byte*/
  wb(address: number, value: number) {
  }

  /** Write 16-bit word */
  ww(address: number, value: number) {
  }
}
