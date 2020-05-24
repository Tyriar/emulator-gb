export interface IMemory {
  /** Read byte */
  rb(address: number): number;
  /** Read 16-bit word */
  rw(address: number): number;
  /** Write byte*/
  wb(address: number, value: number): void;
  /** Write 16-bit word */
  ww(address: number, value: number): void;
}
