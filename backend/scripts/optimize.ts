#!/usr/bin/env -S deno run --allow-read --allow-run

import { walk } from 'https://deno.land/std@0.208.0/fs/walk.ts';
import { writeJsonFile } from '../modules/filesystem.ts';
import { logInfo, logWarn, logError, logSuccess } from '../modules/logging.ts';

interface OptimizationResult {
  file: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  optimizations?: string[];
}

interface OptimizationReport {
  timestamp: string;
  durationMs: number;
  results: OptimizationResult[];
}

class PerformanceOptimizer {
  private readonly results: OptimizationResult[] = [];
  private readonly startTime = Date.now();

  async run(): Promise<void> {
    logInfo('🚀 Starting AIBOS Performance Optimization');

    try {
      await this.typeCheck();
      await this.optimizeFiles();
      await this.analyzePerformance();
      await this.generateReports();

      this.finish(true);
    } catch (error) {
      logError(`❌ Optimization failed: ${error instanceof Error ? error.message : String(error)}`);
      this.finish(false);
    }
  }

  private async typeCheck(): Promise<void> {
    logInfo('Step 1: Type Checking');

    const process = new Deno.Command('deno', {
      args: ['check', '--all'],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await process.output();
    const _output = new TextDecoder().decode(stdout);
    const errors = new TextDecoder().decode(stderr);

    if (code === 0) {
      this.record({
        file: 'TypeScript Check',
        status: 'success',
        message: 'All TypeScript files passed type checking',
        optimizations: ['Type safety verified'],
      });
      logSuccess('✅ Type checking passed.');
    } else {
      this.record({
        file: 'TypeScript Check',
        status: 'error',
        message: 'TypeScript errors found',
        optimizations: ['Resolve errors to proceed'],
      });
      logError('❌ Type checking failed:\n' + errors);
    }
  }

  private async optimizeFiles(): Promise<void> {
    logInfo('Step 2: File Optimization');

    const tsFiles = await this.findTypeScriptFiles();

    for (const file of tsFiles) {
      try {
        const optimizations = await this.analyzeFile(file);
        this.record({
          file,
          status: 'success',
          message: `Optimizations completed for ${file}`,
          optimizations,
        });
      } catch (e) {
        this.record({
          file,
          status: 'error',
          message: `Failed to optimize ${file}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
  }

  private async analyzeFile(path: string): Promise<string[]> {
    const optimizations: string[] = [];
    const code = await Deno.readTextFile(path);

    if (code.includes('React.memo')) {
      optimizations.push('React.memo already used');
    } else if (code.includes('export const') && code.includes('React.FC')) {
      optimizations.push('Consider adding React.memo for performance');
    }

    if (code.includes('useEffect') && !code.includes('useCallback')) {
      optimizations.push('Consider using useCallback to avoid unnecessary re-renders');
    }

    if (code.includes('useState') && code.includes('useMemo')) {
      optimizations.push('useMemo already used for expensive calculations');
    }

    if (code.includes('console.log')) {
      optimizations.push('Consider removing console.log statements in production');
    }

    return optimizations;
  }

  private async analyzePerformance(): Promise<void> {
    logInfo('Step 3: Performance Analysis');

    const bundleSizeKB = await this.estimateBundleSize();

    this.record({
      file: 'Bundle Size Estimate',
      status: 'success',
      message: `Estimated bundle size: ${bundleSizeKB}KB`,
      optimizations: [
        'Consider code splitting for large components',
        'Use dynamic imports for lazy loading',
        'Optimize images and static assets',
      ],
    });

    // Simulated memory usage check (browser-specific; skip in Deno runtime)
    const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (memoryInfo) {
      this.record({
        file: 'Memory Usage',
        status: 'success',
        message: `Memory usage: ${memoryInfo.usedJSHeapSize / (1024 * 1024)} MB`,
        optimizations: [
          'Monitor memory leaks in React components',
          'Clean up side effects in useEffect hooks',
        ],
      });
    }
  }

  private async estimateBundleSize(): Promise<number> {
    let sizeBytes = 0;
    const files = await this.findTypeScriptFiles();

    for (const file of files) {
      const stat = await Deno.stat(file);
      sizeBytes += stat.size;
    }

    // Rough estimate: compiled bundles grow 3-5x
    return Math.round((sizeBytes * 4) / 1024);
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];

    for await (const entry of walk('.', {
      exts: ['.ts', '.tsx'],
      skip: [/node_modules/, /\.git/, /dist/, /build/],
    })) {
      if (entry.isFile) {
        files.push(entry.path);
      }
    }

    return files;
  }

  private async generateReports(): Promise<void> {
    logInfo('Step 4: Generating Reports');

    const duration = Date.now() - this.startTime;

    const report: OptimizationReport = {
      timestamp: new Date().toISOString(),
      durationMs: duration,
      results: this.results,
    };

    const jsonPath = 'optimization-report.json';
    await writeJsonFile(jsonPath, report);

    logSuccess(`JSON report saved: ${jsonPath}`);
    this.displaySummary();
  }

  private displaySummary(): void {
    const errors = this.results.filter((r) => r.status === 'error');
    const warnings = this.results.filter((r) => r.status === 'warning');
    const successes = this.results.filter((r) => r.status === 'success');

    logInfo('📊 Optimization Summary');
    logInfo('='.repeat(50));
    logInfo(`✅ Successes: ${successes.length}`);
    logInfo(`⚠️  Warnings: ${warnings.length}`);
    logInfo(`❌ Errors: ${errors.length}`);
    logInfo(`📁 Total Files: ${this.results.length}`);
    logInfo('='.repeat(50));

    if (errors.length > 0) {
      logError('Errors found:');
      errors.forEach((error) => {
        logError(`  - ${error.file}: ${error.message}`);
      });
    }

    if (warnings.length > 0) {
      logWarn('Warnings:');
      warnings.forEach((warning) => {
        logWarn(`  - ${warning.file}: ${warning.message}`);
      });
    }
  }

  private finish(success: boolean): void {
    const duration = Date.now() - this.startTime;
    
    if (success) {
      logSuccess(`🎉 Optimization completed in ${duration}ms`);
    } else {
      logError(`❌ Optimization failed after ${duration}ms`);
      Deno.exit(1);
    }
  }

  private record(result: OptimizationResult) {
    this.results.push(result);
  }
}

async function main() {
  const optimizer = new PerformanceOptimizer();
  await optimizer.run();
}

if (import.meta.main) {
  await main();
}
