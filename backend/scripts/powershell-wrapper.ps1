# AIBOS PowerShell Wrapper - Handles all syntax issues
# Usage: .\powershell-wrapper.ps1 [command] [args]

param(
    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]$Command,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$ErrorActionPreference = "Stop"

function Invoke-DenoCommand {
    param([string]$DenoCommand, [string[]]$DenoArgs)
    try {
        $quotedArgs = $DenoArgs | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
        $fullCommand = "deno $DenoCommand $quotedArgs"
        Write-Host "Executing: $fullCommand" -ForegroundColor Cyan
        Invoke-Expression $fullCommand
    } catch {
        Write-Error "Error executing Deno command: $_"
        exit 1
    }
}

function Move-FileSafely {
    param([string]$Source, [string]$Destination)
    try {
        if (Test-Path $Source) {
            $destPath = $Destination
            if ((Test-Path $Destination) -and (Get-Item $Destination).PSIsContainer) {
                $destPath = Join-Path $Destination (Split-Path $Source -Leaf)
            }
            if (Test-Path $destPath) {
                Write-Host "Destination exists, removing: $destPath" -ForegroundColor Yellow
                Remove-Item $destPath -Force
            }
            Move-Item $Source $destPath
            Write-Host "Moved: $Source -> $destPath" -ForegroundColor Green
        } else {
            Write-Host "Source not found: $Source" -ForegroundColor Yellow
        }
    } catch {
        Write-Error "Error moving file: $_"
    }
}

function Remove-DirectorySafely {
    param([string]$Path)
    try {
        if (Test-Path $Path) {
            Remove-Item $Path -Recurse -Force
            Write-Host "Removed directory: $Path" -ForegroundColor Green
        } else {
            Write-Host "Directory not found: $Path" -ForegroundColor Yellow
        }
    } catch {
        Write-Error "Error removing directory: $_"
    }
}

switch ($Command.ToLower()) {
    "dev" {
        Invoke-DenoCommand "run" "--allow-all --watch main.ts"
    }
    "build" {
        Invoke-DenoCommand "run" "--allow-all main.ts"
    }
    "cleanup" {
        Invoke-DenoCommand "run" "--allow-read --allow-write --allow-run scripts/cleanup-workspace.ts" $Arguments
    }
    "validate" {
        Invoke-DenoCommand "run" "--allow-read scripts/validate-ssot.ts"
    }
    "setup" {
        Invoke-DenoCommand "run" "--allow-net --allow-read --allow-write --allow-env scripts/setup-supabase.ts"
    }
    "clean-legacy" {
        Write-Host "Cleaning legacy files from root..." -ForegroundColor Yellow
        $legacyFiles = @(
            "main.ts", "config.ts", "index.css", "setup-database.ts", "os-metadata.json",
            "package.json", "package-lock.json", "turbo.json", "tsconfig.json", "deno.json", "deno.lock"
        )
        $legacyDirs = @("node_modules")
        foreach ($file in $legacyFiles) {
            if (Test-Path $file) {
                Remove-Item $file -Force
                Write-Host "Removed legacy file: $file" -ForegroundColor Green
            }
        }
        foreach ($dir in $legacyDirs) {
            Remove-DirectorySafely $dir
        }
        $docsToMove = @(
            @{Source="aibos-requirement.md"; Dest="aibos-hybrid-windows\docs\"},
            @{Source="10min-challenge.md"; Dest="aibos-hybrid-windows\docs\"},
            @{Source="ai-agent-preferences-and-requirements.md"; Dest="aibos-hybrid-windows\docs\"}
        )
        foreach ($doc in $docsToMove) {
            Move-FileSafely $doc.Source $doc.Dest
        }
        Write-Host "Legacy cleanup completed!" -ForegroundColor Green
    }
    "status" {
        Write-Host "Current workspace status:" -ForegroundColor Cyan
        Get-ChildItem | Format-Table Name, Length, LastWriteTime
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host "Available commands: dev, build, cleanup, validate, setup, clean-legacy, status" -ForegroundColor Yellow
        exit 1
    }
} 