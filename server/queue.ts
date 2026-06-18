/**
 * Queue system to avoid Google API 429 Rate Limit errors.
 * Serializes Sheets access and ensures a minimum of 250ms spacing between writes/reads.
 */

type QueueTask = {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

class SheetsQueue {
  private queue: QueueTask[] = [];
  private running = false;
  private delayMs = 250;

  /**
   * Pushes a Sheets task to the queue and returns a promise that resolves when the task completes.
   */
  public enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Math.random().toString(36).substring(2, 11),
        execute,
        resolve,
        reject,
      });
      this.process();
    });
  }

  private async process() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        const result = await task.execute();
        task.resolve(result);
      } catch (err) {
        console.error(`[Queue Error] Error executing task ${task.id}:`, err);
        task.reject(err);
      }

      // Respect Google's Rate Limit
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    this.running = false;
  }
}

export const sheetsQueue = new SheetsQueue();
