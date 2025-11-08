/**
 * Web Workers implementation for heavy computations
 * Free performance optimization for CPU-intensive tasks
 */

import { logger } from './logger';

// Web Worker types
export type WorkerPayload = Record<string, unknown>;

export interface WorkerTask<T = unknown, R = unknown> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export interface WorkerMessage<T = unknown, R = unknown> {
  id: string;
  type: string;
  data: T;
  result?: R;
  error?: string;
}

type ImageProcessingPayload = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray | number[];
  operation?: string;
};

type ImageProcessingResult = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

type DataOperation =
  | 'sort'
  | 'filter'
  | 'map'
  | 'process-products'
  | 'search-optimization';

type DataProcessingPayload<T> = {
  items: T[];
  operation: DataOperation;
  query?: string;
};

type DataProcessingResult<T> = {
  result: T[];
};

type CalculationOperation = 'sum' | 'average' | 'max' | 'min';

type CalculationPayload = {
  operation: CalculationOperation;
  values: number[];
};

type CalculationResult = {
  result: number;
};

type UnknownRecord = Record<string, unknown>;

// Web Worker Manager
export class WebWorkerManager {
  private workers: Map<string, Worker> = new Map();
  private tasks: Map<string, WorkerTask<unknown, unknown>> = new Map();
  private workerCount: number;
  private isSupported: boolean;

  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerCount = workerCount;
    this.isSupported = typeof Worker !== 'undefined';
    
    if (this.isSupported) {
      this.initializeWorkers();
    } else {
      logger.warn('Web Workers not supported in this environment');
    }
  }

  private initializeWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      const workerId = `worker-${i}`;
      const worker = new Worker('/workers/compute-worker.js');
      
      worker.onmessage = (event: MessageEvent<WorkerMessage<unknown, unknown>>) =>
        this.handleWorkerMessage(event.data);
      worker.onerror = (error) => this.handleWorkerError(workerId, error);
      
      this.workers.set(workerId, worker);
    }
    
    logger.info('Web Workers initialized', { workerCount: this.workerCount });
  }

  // Execute task in worker
  async executeTask<T, R>(type: string, data: T): Promise<R> {
    if (!this.isSupported) {
      // Fallback to main thread
      return this.executeOnMainThread(type, data);
    }

    const taskId = this.generateTaskId();
    const workerId = this.getAvailableWorker();
    
    return new Promise<R>((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: taskId,
        type,
        data,
        resolve,
        reject
      };
      this.tasks.set(taskId, task as WorkerTask<unknown, unknown>);
      
      const worker = this.workers.get(workerId);
      if (worker) {
        worker.postMessage({
          id: taskId,
          type,
          data
        });
      } else {
        reject(new Error('No available worker'));
      }
    });
  }

  private handleWorkerMessage(message: WorkerMessage<unknown, unknown>): void {
    const task = this.tasks.get(message.id);
    if (!task) return;

    this.tasks.delete(message.id);

    if (message.error) {
      task.reject(new Error(message.error));
    } else {
      task.resolve(message.result as unknown);
    }
  }

  private handleWorkerError(workerId: string, error: ErrorEvent) {
    logger.error('Worker error', { workerId, error: error.message });
    
    // Restart worker
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      const newWorker = new Worker('/workers/compute-worker.js');
      newWorker.onmessage = (event: MessageEvent<WorkerMessage<unknown, unknown>>) =>
        this.handleWorkerMessage(event.data);
      newWorker.onerror = (error) => this.handleWorkerError(workerId, error);
      this.workers.set(workerId, newWorker);
    }
  }

  private getAvailableWorker(): string {
    // Simple round-robin selection
    const workerIds = Array.from(this.workers.keys());
    const randomIndex = Math.floor(Math.random() * workerIds.length);
    return workerIds[randomIndex];
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  // Fallback execution on main thread
  private async executeOnMainThread<T, R>(type: string, data: T): Promise<R> {
    logger.info('Executing task on main thread', { type });
    
    switch (type) {
      case 'image-processing':
        return this.processImageOnMainThread(data as ImageProcessingPayload) as unknown as R;
      case 'data-processing':
        return this.processDataOnMainThread(data as DataProcessingPayload<unknown>) as unknown as R;
      case 'calculation':
        return this.performCalculationOnMainThread(data as CalculationPayload) as unknown as R;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  private async processImageOnMainThread(
    data: ImageProcessingPayload
  ): Promise<ImageProcessingResult> {
    // Simple image processing simulation
    const { width, height, pixels } = data;
    const sourcePixels = pixels instanceof Uint8ClampedArray ? pixels : Uint8ClampedArray.from(pixels);
    const processedPixels = new Uint8Array(sourcePixels.length);
    
    for (let i = 0; i < sourcePixels.length; i += 4) {
      // Simple grayscale conversion
      const gray = (sourcePixels[i] + sourcePixels[i + 1] + sourcePixels[i + 2]) / 3;
      processedPixels[i] = gray;
      processedPixels[i + 1] = gray;
      processedPixels[i + 2] = gray;
      processedPixels[i + 3] = sourcePixels[i + 3];
    }
    
    return { width, height, pixels: processedPixels };
  }

  private async processDataOnMainThread<T>(
    data: DataProcessingPayload<T>
  ): Promise<DataProcessingResult<T>> {
    // Simple data processing simulation
    const { items, operation } = data;
    const clonedItems = [...items];
    
    switch (operation) {
      case 'sort':
        return {
          result: clonedItems.sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') {
              return a - b;
            }
            return String(a).localeCompare(String(b));
          }),
        };
      case 'filter':
        return {
          result: clonedItems.filter((item): item is T => {
            if (typeof item === 'number') {
              return item > 0;
            }
            return Boolean(item);
          }),
        };
      case 'map':
        return {
          result: clonedItems.map((item) => {
            if (typeof item === 'number') {
              return (item * 2) as unknown as T;
            }
            return item;
          }),
        };
      case 'process-products':
        return {
          result: clonedItems.map((item) =>
            typeof item === 'object' && item !== null ? { ...(item as UnknownRecord) } as T : item
          ),
        };
      case 'search-optimization': {
        const query = (data.query || '').toString().toLowerCase();
        if (!query) {
          return { result: clonedItems };
        }
        return {
          result: clonedItems.filter((item) => {
            if (typeof item === 'string') {
              return item.toLowerCase().includes(query);
            }
            if (typeof item === 'object' && item !== null) {
              const values = Object.values(item as UnknownRecord)
                .filter((val): val is string => typeof val === 'string')
                .join(' ')
                .toLowerCase();
              return values.includes(query);
            }
            return false;
          }),
        };
      }
      default:
        return { result: clonedItems };
    }
  }

  private async performCalculationOnMainThread(
    data: CalculationPayload
  ): Promise<CalculationResult> {
    // Simple calculation simulation
    const { operation, values } = data;
    
    switch (operation) {
      case 'sum':
        return { result: values.reduce((a, b) => a + b, 0) };
      case 'average':
        return { result: values.reduce((a, b) => a + b, 0) / values.length };
      case 'max':
        return { result: Math.max(...values) };
      case 'min':
        return { result: Math.min(...values) };
      default:
        return { result: 0 };
    }
  }

  // Cleanup
  destroy() {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.tasks.clear();
    logger.info('Web Workers destroyed');
  }
}

// Create singleton instance
export const webWorkerManager = new WebWorkerManager();

// Utility functions for common tasks
export class WorkerUtils {
  // Image processing
  static async processImage(imageData: ImageData, operation: string): Promise<ImageData> {
    const result = await webWorkerManager.executeTask<ImageProcessingPayload, ImageProcessingResult>('image-processing', {
      width: imageData.width,
      height: imageData.height,
      pixels: Array.from(imageData.data),
      operation
    });
    return new ImageData(
      new Uint8ClampedArray(result.pixels),
      result.width,
      result.height
    );
  }

  // Data processing
  static async processData<T>(data: T[], operation: DataOperation): Promise<T[]> {
    const result = await webWorkerManager.executeTask<DataProcessingPayload<T>, DataProcessingResult<T>>('data-processing', {
      items: data,
      operation
    });
    return result.result;
  }

  // Mathematical calculations
  static async calculate(values: number[], operation: CalculationOperation): Promise<number> {
    const result = await webWorkerManager.executeTask<CalculationPayload, CalculationResult>('calculation', {
      values,
      operation
    });
    return result.result;
  }

  // Product data processing
  static async processProductData(products: UnknownRecord[]): Promise<UnknownRecord[]> {
    const result = await webWorkerManager.executeTask<
      DataProcessingPayload<UnknownRecord>,
      DataProcessingResult<UnknownRecord>
    >('data-processing', {
      items: products,
      operation: 'process-products'
    });
    return result.result;
  }

  // Search optimization
  static async optimizeSearch(query: string, products: UnknownRecord[]): Promise<UnknownRecord[]> {
    const result = await webWorkerManager.executeTask<
      DataProcessingPayload<UnknownRecord>,
      DataProcessingResult<UnknownRecord>
    >('data-processing', {
      items: products,
      operation: 'search-optimization',
      query
    });
    return result.result;
  }
}

// React hook for Web Workers
export function useWebWorker() {
  return {
    processImage: WorkerUtils.processImage,
    processData: WorkerUtils.processData,
    calculate: WorkerUtils.calculate,
    processProductData: WorkerUtils.processProductData,
    optimizeSearch: WorkerUtils.optimizeSearch
  };
}

export default webWorkerManager;
