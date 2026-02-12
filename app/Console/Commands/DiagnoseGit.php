<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class DiagnoseGit extends Command
{
    protected $signature = 'diagnose:git';
    protected $description = 'Diagnose Git installation and environment';

    public function handle()
    {
        $this->info('=== Git Environment Diagnostics ===');
        $this->newLine();

        // 1. Check if git command exists
        $this->info('1. Checking if Git is in PATH...');
        $this->checkGitCommand();
        $this->newLine();

        // 2. Check Git version
        $this->info('2. Checking Git version...');
        $this->checkGitVersion();
        $this->newLine();

        // 3. Check where Git is located
        $this->info('3. Locating Git executable...');
        $this->locateGit();
        $this->newLine();

        // 4. Check PHP PATH environment
        $this->info('4. Checking PHP PATH environment...');
        $this->checkPhpPath();
        $this->newLine();

        // 5. Test Git in workspace
        $this->info('5. Testing Git in workspace directory...');
        $this->testGitInWorkspace();
        $this->newLine();

        // 6. Check Git configuration
        $this->info('6. Checking Git global configuration...');
        $this->checkGitConfig();
        $this->newLine();

        $this->info('=== Diagnostics Complete ===');

        return 0;
    }

    private function checkGitCommand()
    {
        try {
            $process = new Process(['git', '--version']);
            $process->run();

            if ($process->isSuccessful()) {
                $this->line('✅ Git command is available');
                $this->line('   Output: ' . trim($process->getOutput()));
            } else {
                $this->error('❌ Git command failed');
                $this->error('   Error: ' . $process->getErrorOutput());
            }
        } catch (\Exception $e) {
            $this->error('❌ Git is NOT found in PATH');
            $this->error('   Exception: ' . $e->getMessage());
            $this->newLine();
            $this->warn('📝 Action Required:');
            $this->warn('   1. Install Git for Windows from https://git-scm.com/download/win');
            $this->warn('   2. Add Git to System PATH: C:\\Program Files\\Git\\cmd');
            $this->warn('   3. Restart your web server (IIS/Apache)');
            $this->warn('   4. Run this command again');
        }
    }

    private function checkGitVersion()
    {
        $process = Process::fromShellCommandline('git --version 2>&1');
        $process->run();

        if ($process->isSuccessful()) {
            $version = trim($process->getOutput());
            $this->line('✅ Git version: ' . $version);

            // Check if version is recent enough
            if (preg_match('/(\d+\.\d+\.\d+)/', $version, $matches)) {
                $versionNumber = $matches[1];
                if (version_compare($versionNumber, '2.30.0', '>=')) {
                    $this->line('   Version is up to date ✓');
                } else {
                    $this->warn('   ⚠️  Consider upgrading to Git 2.30.0 or later');
                }
            }
        } else {
            $this->error('❌ Could not determine Git version');
        }
    }

    private function locateGit()
    {
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';

        if ($isWindows) {
            $process = Process::fromShellCommandline('where git 2>&1');
        } else {
            $process = Process::fromShellCommandline('which git 2>&1');
        }

        $process->run();

        if ($process->isSuccessful()) {
            $location = trim($process->getOutput());
            $this->line('✅ Git found at:');
            foreach (explode("\n", $location) as $path) {
                if (!empty(trim($path))) {
                    $this->line('   📍 ' . trim($path));
                }
            }
        } else {
            $this->error('❌ Could not locate Git executable');
        }
    }

    private function checkPhpPath()
    {
        $path = getenv('PATH');
        $this->line('📂 PHP PATH environment:');

        $paths = explode(PATH_SEPARATOR, $path);
        $gitPaths = array_filter($paths, function($p) {
            return stripos($p, 'git') !== false;
        });

        if (empty($gitPaths)) {
            $this->warn('   ⚠️  No Git paths found in PHP PATH');
            $this->warn('   This might cause issues with Git execution');
        } else {
            foreach ($gitPaths as $gitPath) {
                $this->line('   ✅ ' . $gitPath);
            }
        }

        $this->newLine();
        $this->line('   Total PATH entries: ' . count($paths));
    }

    private function testGitInWorkspace()
    {
        $workspacesPath = storage_path('workspaces');

        if (!is_dir($workspacesPath)) {
            $this->warn('⚠️  Workspaces directory does not exist: ' . $workspacesPath);
            return;
        }

        // Create a test workspace if it doesn't exist
        $testWorkspace = $workspacesPath . '/test-git-workspace';
        if (!is_dir($testWorkspace)) {
            mkdir($testWorkspace, 0755, true);
            $this->line('   Created test workspace: ' . $testWorkspace);
        }

        // Try to initialize a git repo in test workspace
        $process = new Process(['git', 'init'], $testWorkspace);
        $process->run();

        if ($process->isSuccessful()) {
            $this->line('✅ Git init successful in workspace');
            $this->line('   Working directory: ' . $testWorkspace);

            // Check git status
            $statusProcess = new Process(['git', 'status', '--short'], $testWorkspace);
            $statusProcess->run();

            if ($statusProcess->isSuccessful()) {
                $this->line('✅ Git status command works in workspace');
            }
        } else {
            $this->error('❌ Git init failed in workspace');
            $this->error('   Error: ' . $process->getErrorOutput());
        }
    }

    private function checkGitConfig()
    {
        $configs = [
            'user.name' => 'User name',
            'user.email' => 'User email',
            'init.defaultBranch' => 'Default branch',
            'core.autocrlf' => 'Line ending handling',
        ];

        foreach ($configs as $key => $description) {
            $process = new Process(['git', 'config', '--global', $key]);
            $process->run();

            if ($process->isSuccessful() && !empty(trim($process->getOutput()))) {
                $value = trim($process->getOutput());
                $this->line("✅ {$description}: {$value}");
            } else {
                $this->warn("⚠️  {$description} not configured");
                $this->line("   Set with: git config --global {$key} \"value\"");
            }
        }
    }
}
