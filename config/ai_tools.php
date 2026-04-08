<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Agent Tools Configuration
    |--------------------------------------------------------------------------
    |
    | Define available tools that the AI agent can use to interact with
    | the workspace filesystem, terminal, and git operations.
    |
    */

    'enabled' => env('AI_TOOLS_ENABLED', true),

    'max_execution_turns' => env('AI_MAX_TOOL_TURNS', 30),

    'tools' => [
        [
            'name' => 'createFile',
            'description' => 'Create a new file or directory in the workspace. IMPORTANT: When creating a file (type=file), you MUST provide the complete, full file content in the `content` parameter. Never create empty files.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'path' => [
                        'type' => 'string',
                        'description' => 'Relative path from workspace root (e.g., "src/app.js" or "components/")'
                    ],
                    'content' => [
                        'type' => 'string',
                        'description' => 'REQUIRED for files: Complete, full file content. Must never be empty for type=file. Use empty string only for type=directory.'
                    ],
                    'type' => [
                        'type' => 'string',
                        'enum' => ['file', 'directory'],
                        'description' => 'Whether to create a file or directory',
                        'default' => 'file'
                    ],
                    'overwrite' => [
                        'type' => 'boolean',
                        'description' => 'If true and file exists, overwrite its content (directories are never overwritten)',
                        'default' => false
                    ]
                ],
                'required' => ['path', 'content', 'type']
            ],
            'permission' => 'write',
            'requires_approval' => false,
            'approval_rules' => [
                'patterns' => [
                    '*.env*' => true,
                    'config/*.php' => true,
                    '.git/*' => true,
                    'vendor/*' => true,
                ]
            ]
        ],

        [
            'name' => 'writeFile',
            'description' => 'Write or update content of an existing file in the workspace',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'path' => [
                        'type' => 'string',
                        'description' => 'Relative path to the file from workspace root'
                    ],
                    'content' => [
                        'type' => 'string',
                        'description' => 'New file content'
                    ],
                    'create_if_missing' => [
                        'type' => 'boolean',
                        'description' => 'If true and the file does not exist, create it (parent directories will be created as needed)',
                        'default' => false
                    ]
                ],
                'required' => ['path', 'content']
            ],
            'permission' => 'write',
            'requires_approval' => false,
            'approval_rules' => [
                'patterns' => [
                    '*.env*' => true,    // Always require approval for env files
                    '.git/*' => true,    // Git internals
                    'vendor/*' => true,  // Composer vendor
                ]
            ]
        ],

        [
            'name' => 'readFile',
            'description' => 'Read the content of a file in the workspace',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'path' => [
                        'type' => 'string',
                        'description' => 'Relative path to the file from workspace root'
                    ]
                ],
                'required' => ['path']
            ],
            'permission' => 'read',
            'requires_approval' => false
        ],

        [
            'name' => 'deleteFile',
            'description' => 'Delete a file or directory from the workspace',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'path' => [
                        'type' => 'string',
                        'description' => 'Relative path to the file or directory'
                    ]
                ],
                'required' => ['path']
            ],
            'permission' => 'delete',
            'requires_approval' => true
        ],

        [
            'name' => 'listFiles',
            'description' => 'List all files and directories in a workspace directory',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'path' => [
                        'type' => 'string',
                        'description' => 'Directory path (default: workspace root)',
                        'default' => '/'
                    ]
                ]
            ],
            'permission' => 'read',
            'requires_approval' => false
        ],

        [
            'name' => 'runCommand',
            'description' => 'Execute a terminal command in the workspace. IMPORTANT: For dev servers use port 3000 (e.g. "npm run dev -- --port 3000"). Port 5173 is reserved by the editor and must NOT be used.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'command' => [
                        'type' => 'string',
                        'description' => 'Command to execute. For Vite: always use "npm run dev -- --port 3000". Never use port 5173.'
                    ],
                    'cwd' => [
                        'type' => 'string',
                        'description' => 'Working directory (relative to workspace)',
                        'default' => './'
                    ]
                ],
                'required' => ['command']
            ],
            'permission' => 'execute',
            'requires_approval' => false,
            'allowed_commands' => [
                // Package managers
                'npm'     => true,
                'npx'     => true,
                'pnpm'    => true,
                'yarn'    => true,
                // Runtimes
                'node'    => true,
                'python'  => true,
                'python3' => true,
                'pip'     => true,
                'pip3'    => true,
                // PHP
                'php'      => true,
                'composer' => true,
                // Git
                'git'     => true,
                // Shell / file utilities
                'ls'      => true,
                'dir'     => true,
                'cat'     => true,
                'type'    => true,
                'pwd'     => true,
                'echo'    => true,
                'mkdir'   => true,
                'cp'      => true,
                'copy'    => true,
                'mv'      => true,
                'move'    => true,
                'rm'      => true,
                'del'     => true,
                'touch'   => true,
                'find'    => true,
                'grep'    => true,
                'findstr' => true,
                'which'   => true,
                'where'   => true,
                'whoami'  => true,
                'curl'    => true,
                'wget'    => true,
                // Network / port diagnostics
                'netstat' => true,
                'ss'      => true,
                'lsof'    => true,
                'kill'    => true,
                'taskkill'=> true,
                'tasklist'=> true,
                // Build tools
                'make'    => true,
                'rsbuild' => true,
                'vite'    => true,
                'tsc'     => true,
                // Process helpers
                'sleep'      => true,
                'timeout'    => true,
                'powershell' => true,
            ],
            'blocked_patterns' => [
                'rm -rf /',
                'rm -rf ~',
                'sudo',
                'su ',
                ':(){:|:&};:',
                'mkfs',
                'dd if=',
                // Block long-running servers — they hang as PHP child processes
                'npm run dev',
                'npm start',
                'node server',
                'node index',
                'nodemon',
                'vite dev',
                'vite preview',
            ]
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Settings
    |--------------------------------------------------------------------------
    */

    'security' => [
        'block_path_traversal' => true,
        'max_file_size' => 5242880, // 5MB
        'allowed_extensions' => [
            'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
            'php', 'py', 'rb', 'java',
            'html', 'htm', 'css', 'scss', 'sass', 'less',
            'json', 'xml', 'yaml', 'yml', 'toml',
            'md', 'txt', 'rst', 'mdx',
            'sql', 'sh', 'bash', 'zsh',
            'lock', 'env', 'env.example', 'example',
            // Extensionless dotfiles handled below — allow by name pattern
            'gitignore', 'gitattributes', 'prettierrc', 'eslintrc',
            'babelrc', 'editorconfig', 'nvmrc', 'npmrc',
        ],
        'blocked_paths' => [
            '.env',
            '.env.local',
            '.env.production',
            'config/database.php',
            '.git/config',
            'vendor/',
            'node_modules/',
        ],
    ],
];
