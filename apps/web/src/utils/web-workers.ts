/**
 * Web Workers implementation for heavy computations
 * Free performance optimization for CPU-intensive tasks
 */

import { logger } from './logger';

// Web Worker types
export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export interface WorkerMessage<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  result?: R;
  error?: string;
}

// Web Worker Manager
export class WebWorkerManager {
  private workers: Map<string, Worker> = new Map();
  private tasks: Map<string, WorkerTask> = new Map();
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
      
      worker.onmessage = (event) => this.handleWorkerMessage(event.data);
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
      
      this.tasks.set(taskId, task);
      
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

  private handleWorkerMessage(message: WorkerMessage) {
    const task = this.tasks.get(message.id);
    if (!task) return;

    this.tasks.delete(message.id);

    if (message.error) {
      task.reject(new Error(message.error));
    } else {
      task.resolve(message.result);
    }
  }

  private handleWorkerError(workerId: string, error: ErrorEvent) {
    logger.error('Worker error', { workerId, error: error.message });
    
    // Restart worker
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      const newWorker = new Worker('/workers/compute-worker.js');
      newWorker.onmessage = (event) => this.handleWorkerMessage(event.data);
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
        return this.processImageOnMainThread(data as any) as R;
      case 'data-processing':
        return this.processDataOnMainThread(data as any) as R;
      case 'calculation':
        return this.performCalculationOnMainThread(data as any) as R;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  private async processImageOnMainThread(data: any): Promise<any> {
    // Simple image processing simulation
    const { width, height, pixels } = data;
    const processedPixels = new Uint8Array(pixels.length);
    
    for (let i = 0; i < pixels.length; i += 4) {
      // Simple grayscale conversion
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      processedPixels[i] = gray;
      processedPixels[i + 1] = gray;
      processedPixels[i + 2] = gray;
      processedPixels[i + 3] = pixels[i + 3];
    }
    
    return { width, height, pixels: processedPixels };
  }

  private async processDataOnMainThread(data: any): Promise<any> {
    // Simple data processing simulation
    const { items, operation } = data;
    
    switch (operation) {
      case 'sort':
        return { result: [...items].sort() };
      case 'filter':
        return { result: items.filter((item: any) => item > 0) };
      case 'map':
        return { result: items.map((item: any) => item * 2) };
      default:
        return { result: items };
    }
  }

  private async performCalculationOnMainThread(data: any): Promise<any> {
    // Simple calculation simulation
    const { operation, values } = data;
    
    switch (operation) {
      case 'sum':
        return { result: values.reduce((a: number, b: number) => a + b, 0) };
      case 'average':
        return { result: values.reduce((a: number, b: number) => a + b, 0) / values.length };
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
    return webWorkerManager.executeTask('image-processing', {
      width: imageData.width,
      height: imageData.height,
      pixels: Array.from(imageData.data),
      operation
    });
  }

  // Data processing
  static async processData<T>(data: T[], operation: string): Promise<T[]> {
    const result = await webWorkerManager.executeTask('data-processing', {
      items: data,
      operation
    });
    return (result as any).result;
  }

  // Mathematical calculations
  static async calculate(values: number[], operation: string): Promise<number> {
    const result = await webWorkerManager.executeTask('calculation', {
      values,
      operation
    });
    return (result as any).result;
  }

  // Product data processing
  static async processProductData(products: any[]): Promise<any[]> {
    return webWorkerManager.executeTask('data-processing', {
      items: products,
      operation: 'process-products'
    });
  }

  // Search optimization
  static async optimizeSearch(query: string, products: any[]): Promise<any[]> {
    return webWorkerManager.executeTask('data-processing', {
      items: products,
      operation: 'search-optimization',
      query
    });
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
