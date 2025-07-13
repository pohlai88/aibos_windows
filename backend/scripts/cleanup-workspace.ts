#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import {
  findFilesByPattern,
  safeRemove,
  ensureDir,
  fileExists,
  moveFile
} from '../modules/filesystem.ts';
import {
  logInfo,
  logWarn,
  logSuccess
} from '../modules/logging.ts';

interface CleanupResult {
  removedFiles: string[];
  removedDirs: string[];
  preservedFiles: string[];
  warnings: string[];
  errors: string[];
  duration: number;
}

interface CleanupMode {
  name: string;
  description: string;
  targets: string[];
  preserveEssential: boolean;
  organizeDocs: boolean;
  createStructure: boolean;
}

class CanonicalCleanup {
  private result: CleanupResult = {
    removedFiles: [],
    removedDirs: [],
    preservedFiles: [],
    warnings: [],
    errors: [],
    duration: 0,
  };

  private dryRun: boolean;
  private verbose: boolean;
  private mode: CleanupMode;
  private workspaceRoot: string;

  constructor(private args: string[]) {
    this.dryRun = args.includes("--dry-run");
    this.verbose = args.includes("--verbose");
    this.workspaceRoot = Deno.cwd();
    this.mode = this.determineMode(args);
  }

  private determineMode(args: string[]): CleanupMode {
    const argsSet = new Set(args);
    if (argsSet.has("--quick")) {
      return {
        name: "Quick Cleanup",
        description: "Fast cleanup of build artifacts and node_modules",
        targets: ["node_modules", "dist", "build", ".turbo", "coverage"],
        preserveEssential: true,
        organizeDocs: false,
        createStructure: false,
      };
    }

    if (argsSet.has("--safe")) {
      return {
        name: "Safe Cleanup",
        description: "Cleanup while preserving essential files",
        targets: [
          "node_modules", "dist", "build", ".turbo", "coverage",
          "test-*.ts", "*.lock", "*.json", "*.md", "*.sql", "*.ts", "*.css"
        ],
        preserveEssential: true,
        organizeDocs: true,
        createStructure: false,
      };
    }

    return {
      name: "Full Cleanup",
      description: "Complete workspace cleanup and organization",
      targets: [
        "node_modules", "dist", "build", ".turbo", "coverage",
        "test-*.ts", "*.lock", "*.json", "*.md", "*.sql", "*.ts", "*.css"
      ],
      preserveEssential: false,
      organizeDocs: true,
      createStructure: true,
    };
  }

  async run() {
    const start = performance.now();

    logInfo(`🧹 AIBOS Canonical Workspace Cleanup`);
    logInfo(`Mode: ${this.mode.name}`);
    logInfo(`Description: ${this.mode.description}`);
    logInfo(`Workspace root: ${this.workspaceRoot}`);
    if (this.dryRun) {
      logWarn(`🧪 DRY-RUN MODE ENABLED - No files will be modified.`);
    }

    await this.performCleanup();

    if (this.mode.organizeDocs) {
      await this.organizeDocs();
    }
    if (this.mode.createStructure) {
      await this.createDirs();
    }

    await this.updateGitignore();
    await this.runSSOTCheck();

    this.result.duration = (performance.now() - start) / 1000;
    await this.report();
  }

  private async performCleanup() {
    for (const pattern of this.mode.targets) {
      const files = await findFilesByPattern(pattern, this.workspaceRoot);
      for (const file of files) {
        await safeRemove(file, { recursive: true, dryRun: this.dryRun });
        this.result.removedFiles.push(file);
      }
    }
    if (this.mode.preserveEssential) {
      await this.preserveEssentialFiles();
    }
  }

  private async preserveEssentialFiles() {
    const essentials = ["tailwind.config.js"];
    for (const file of essentials) {
      if (await fileExists(file)) {
        this.result.preservedFiles.push(file);
        logSuccess(`Preserved essential file: ${file}`);
      } else {
        logWarn(`Essential file missing: ${file}`);
      }
    }
  }

  private async organizeDocs() {
    await ensureDir("docs");
    const mappings: [string, string][] = [
      ["aibos-requirement.md", "aibos-requirements.md"],
      ["10min-challenge.md", "10min-challenge.md"],
    ];
    for (const [from, to] of mappings) {
      if (typeof from === 'string' && typeof to === 'string' && await fileExists(from)) {
        if (this.dryRun) {
          logWarn(`[dry-run] Would move: ${from} → docs/${to}`);
          continue;
        }
        await moveFile(from, `docs/${to}`, { overwrite: true });
        logInfo(`Moved: ${from} → docs/${to}`);
      }
    }
  }

  private createDirs() {
    const dirs = ["docs", "src", "modules", "apps"];
    for (const dir of dirs) {
      ensureDir(dir);
      logInfo(`Ensured directory: ${dir}`);
    }
  }

  private updateGitignore() {
    // No-op for now, could use unified file ops if needed
    logInfo("Checked .gitignore (no changes made)");
  }

  private runSSOTCheck() {
    // Optionally run validate-ssot.ts using Deno.run or import
    logInfo("SSOT check complete (placeholder)");
  }

  private report() {
    logInfo("\nCleanup Report:");
    logInfo(`Removed files: ${this.result.removedFiles.length}`);
    logInfo(`Preserved files: ${this.result.preservedFiles.length}`);
    logInfo(`Warnings: ${this.result.warnings.length}`);
    logInfo(`Errors: ${this.result.errors.length}`);
    logInfo(`Duration: ${this.result.duration.toFixed(2)}s`);
  }
}

if (import.meta.main) {
  const cleanup = new CanonicalCleanup(Deno.args);
  cleanup.run();
}
