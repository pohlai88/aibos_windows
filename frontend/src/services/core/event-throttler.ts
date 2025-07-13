export class EventThrottler {
  private timers = new Map<string, number>();
  private lastExecution = new Map<string, number>();

  throttle<T extends (...args: unknown[]) => void>(key: string, fn: T, delay: number): T {
    return ((...args: unknown[]) => {
      const now = Date.now();
      const last = this.lastExecution.get(key) || 0;

      if (now - last >= delay) {
        this.lastExecution.set(key, now);
        fn(...args);
      } else {
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key)!);
        }
        const timer = globalThis.setTimeout(() => {
          this.lastExecution.set(key, Date.now());
          fn(...args);
          this.timers.delete(key);
        }, delay - (now - last));
        this.timers.set(key, timer);
      }
    }) as T;
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.lastExecution.clear();
  }
}