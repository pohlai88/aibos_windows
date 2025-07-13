#!/usr/bin/env -S deno run --allow-all

/**
 * Bundle Analyzer for AIBOS (Refactored)
 *
 * Analyzes bundle sizes and provides performance insights.
 */

import { walk } from 'https://deno.land/std@0.208.0/fs/mod.ts';
import { extname, relative } from 'https://deno.land/std@0.208.0/path/mod.ts';
import { writeJsonFile } from '../modules/filesystem.ts';
import { logInfo, logWarn, logError, logSuccess } from '../modules/logging.ts';

interface BundleStats {
  totalSize: number;
  fileCount: number;
  fileTypes: Record<string, { count: number; size: number }>;
  largestFiles: Array<{ path: string; size: number }>;
  performanceMetrics: {
    estimatedLoadTime: number;
    compressionRatio: number;
    cacheEfficiency: number;
  };
}

class BundleAnalyzer {
  // Constants
  private readonly FILE_EXTENSIONS = ['.js', '.ts', '.tsx', '.css', '.html', '.json'];
  private readonly DEFAULT_COMPRESSION_RATIO = 0.7;
  private readonly DEFAULT_CACHE_EFFICIENCY = 0.8;
  private readonly NETWORK_SPEED_3G = 1.5 * 1024 * 1024; // bytes/sec

  // Internal state
  private stats: BundleStats = {
    totalSize: 0,
    fileCount: 0,
    fileTypes: {},
    largestFiles: [],
    performanceMetrics: {
      estimatedLoadTime: 0,
      compressionRatio: this.DEFAULT_COMPRESSION_RATIO,
      cacheEfficiency: this.DEFAULT_CACHE_EFFICIENCY,
    },
  };

  private recommendations: string[] = [];

  async analyzeBundle(bundlePath: string): Promise<BundleStats> {
    logInfo(`Starting analysis for bundle: ${bundlePath}`);

    try {
      await this.scanDirectory(bundlePath);
      this.calculatePerformanceMetrics();
      this.generateRecommendations();
      this.generateReport();

      return this.stats;
    } catch (error) {
      logError(`Bundle analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async scanDirectory(dirPath: string): Promise<void> {
    for await (const entry of walk(dirPath, {
      skip: [/node_modules/, /\.git/, /dist/, /build/, /scripts/],
    })) {
      if (entry.isFile) {
        const ext = extname(entry.path);
        if (this.FILE_EXTENSIONS.includes(ext)) {
          await this.analyzeFile(entry.path);
        }
      }
    }
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const fileInfo = await Deno.stat(filePath);
      const size = fileInfo.size;
      const ext = extname(filePath);

      this.stats.totalSize += size;
      this.stats.fileCount++;

      if (!this.stats.fileTypes[ext]) {
        this.stats.fileTypes[ext] = { count: 0, size: 0 };
      }
      this.stats.fileTypes[ext].count++;
      this.stats.fileTypes[ext].size += size;

      this.stats.largestFiles.push({ path: filePath, size });
      this.stats.largestFiles.sort((a, b) => b.size - a.size);
      this.stats.largestFiles = this.stats.largestFiles.slice(0, 10);

      logInfo(`Analyzed: ${filePath}`);
    } catch (error) {
      logWarn(`Could not analyze ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculatePerformanceMetrics(): void {
    const compressedSize = this.stats.totalSize * this.stats.performanceMetrics.compressionRatio;
    this.stats.performanceMetrics.estimatedLoadTime =
      compressedSize / this.NETWORK_SPEED_3G;
  }

  private generateRecommendations(): void {
    const { totalSize, performanceMetrics, fileCount, fileTypes } = this.stats;
    const compressedSize = totalSize * performanceMetrics.compressionRatio;

    if (compressedSize > 1024 * 1024) {
      this.addRecommendation('Bundle size exceeds 1MB - implement code splitting.');
    }
    if (fileCount > 50) {
      this.addRecommendation('Too many small files - consider bundling.');
    }
    const jsTotalSize =
      (fileTypes['.js']?.size || 0) +
      (fileTypes['.ts']?.size || 0) +
      (fileTypes['.tsx']?.size || 0);
    if (jsTotalSize > totalSize * 0.8) {
      this.addRecommendation('JavaScript dominates bundle. Consider splitting vendor and app code.');
    }
    if (performanceMetrics.estimatedLoadTime > 3) {
      this.addRecommendation('Load time exceeds 3 seconds - optimize assets and consider CDN.');
    }
  }

  private generateReport(): void {
    logInfo('📊 Bundle Analysis Report');
    logInfo('='.repeat(60));

    logInfo(`📦 Total Bundle Size: ${this.formatBytes(this.stats.totalSize)}`);
    logInfo(`📁 Total Files: ${this.stats.fileCount}`);
    logInfo(`⏱️  Estimated Load Time: ${this.stats.performanceMetrics.estimatedLoadTime.toFixed(2)}s`);
    logInfo(`🗜️  Compressed Size: ${this.formatBytes(this.stats.totalSize * this.stats.performanceMetrics.compressionRatio)}`);

    logInfo('📋 File Type Breakdown:');
    Object.entries(this.stats.fileTypes)
      .sort(([, a], [, b]) => b.size - a.size)
      .forEach(([ext, stats]) => {
        logInfo(`  ${ext}: ${stats.count} files, ${this.formatBytes(stats.size)}`);
      });

    logInfo('🔝 Largest Files:');
    this.stats.largestFiles.slice(0, 5).forEach((file, index) => {
      const relativePath = relative(Deno.cwd(), file.path);
      logInfo(`  ${index + 1}. ${relativePath} (${this.formatBytes(file.size)})`);
    });

    if (this.recommendations.length > 0) {
      logWarn('💡 Recommendations:');
      this.recommendations.forEach((r) => {
        logWarn(`  • ${r}`);
      });
    } else {
      logSuccess('✅ No critical issues detected.');
    }

    logInfo('='.repeat(60));
  }

  private addRecommendation(msg: string) {
    this.recommendations.push(msg);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  async generateJsonReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      stats: {
        ...this.stats,
        largestFiles: this.stats.largestFiles.map((file) => ({
          path: relative(Deno.cwd(), file.path),
          size: file.size,
        })),
      },
      recommendations: this.recommendations,
    };

    try {
      await writeJsonFile(outputPath, report);
      logSuccess(`JSON report saved to: ${outputPath}`);
    } catch (error) {
      logError(`Failed to save JSON report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function main() {
  const analyzer = new BundleAnalyzer();
  const bundlePath = Deno.args[0] || '.';
  
  try {
    await analyzer.analyzeBundle(bundlePath);
    await analyzer.generateJsonReport('bundle-analysis.json');
    logSuccess('Bundle analysis completed successfully!');
  } catch (error) {
    logError(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
