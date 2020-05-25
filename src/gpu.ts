declare const console: any;

const width = 160;
const height = 144;
const backgroundBits = width * height * 2;
const backgroundBytes = backgroundBits / 8;

const enum Modes {
  HBlank = 0,
  VBlank = 1,
  OamRead = 2,
  VramRead = 3
}

export class Gpu {
  private _background = new Uint8Array(backgroundBytes);
  private _mode = 0;
  private _modeclock = 0;
  private _line = 0;

  step(cycles: number) {
    this._modeclock += cycles;
    switch (this._mode) {
      case Modes.OamRead:
        if (this._modeclock >= 80) {
          this._modeclock = 0;
          this._mode = Modes.VramRead;
        }
        break;
      case Modes.VramRead:
        if (this._modeclock >= 172) {
          this._modeclock = 0;
          this._mode = Modes.HBlank;
          this._renderScan();
        }
        break;
      case Modes.HBlank:
        if (this._modeclock >= 204) {
          this._modeclock = 0;
          this._line++;

          if (this._line == 143) {
            this._mode = Modes.VBlank;
            // TODO: Put image data
          }
          else {
            this._mode = Modes.OamRead;
          }
        }
        break;
      case Modes.VBlank:
        if (this._modeclock >= 456) {
          this._modeclock = 0;
          this._line++;

          if (this._line > 153) {
            this._mode = Modes.OamRead;
            this._line = 0;
          }
        }
        break;
    }
  }

  reset() {
    // TODO: Init canvas
  }

  updateTile(address: number, value: number) {
    // TODO: Implement tile updates
  }

  private _renderScan() {
    // TODO: Implement
    console.log('Gpu._renderScan');
  }
}
