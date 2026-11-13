export class SeededRNG {
  private state: number;

  constructor(seed: number = 123456789) {
    this.state = seed >>> 0;
  }

  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  getSeed(): number {
    return this.state;
  }

  /**
   * Trả về số thực [0, 1) bằng thuật toán Mulberry32
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Trả về số nguyên ngẫu nhiên [0, 99]
   */
  nextInt100(): number {
    return Math.floor(this.next() * 100);
  }

  /**
   * 1RN: Kiểm tra trúng/trượt bằng 1 xúc xắc [0, 99] < rate
   */
  roll1RN(rate: number): boolean {
    if (rate <= 0) return false;
    if (rate >= 100) return true;
    return this.nextInt100() < rate;
  }

  /**
   * 2RN (True Hit): Kiểm tra trúng/trượt bằng trung bình 2 xúc xắc (rn1 + rn2) / 2 < rate
   */
  roll2RN(rate: number): boolean {
    if (rate <= 0) return false;
    if (rate >= 100) return true;
    const rn1 = this.nextInt100();
    const rn2 = this.nextInt100();
    const average = (rn1 + rn2) / 2;
    return average < rate;
  }

  /**
   * Roll theo chế độ cấu hình ('1RN' hoặc '2RN')
   */
  rollHit(rate: number, mode: '1RN' | '2RN' = '2RN'): boolean {
    return mode === '2RN' ? this.roll2RN(rate) : this.roll1RN(rate);
  }

  /**
   * Roll crit (luôn dùng 1RN)
   */
  rollCrit(rate: number): boolean {
    return this.roll1RN(rate);
  }
}

export const defaultRNG = new SeededRNG();
