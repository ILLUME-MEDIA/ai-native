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

    'max_execution_turns' => env('AI_MAX_TOOL_TURNS', 10),

    'tools' => [
        [
            'name' => 'createFile',
            'description' => 'Create a new file or directory in the workspace with the specified content',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'path' => [
                        'type' => 'string',
                        'description' => 'Relative path from workspace root (e.g., "src/app.js" or "components/")'
                    ],
                    'content' => [
                        'type' => 'string',
                        'description' => 'File content (empty string for directories)'
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
                'required' => ['path', 'type']
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
            'requires_approval' => true,
            'approval_rules' => [
                'patterns' => [
                    'src/**/*.{js,jsx,ts,tsx,css}' => false, // Auto-approve frontend files
                    'resources/**/*.{js,jsx}' => false,
                    '*.md' => false, // Auto-approve docs
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
            'description' => 'Execute a terminal command in the workspace (restricted to whitelisted commands)',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'command' => [
                        'type' => 'string',
                        'description' => 'Command to execute (must be whitelisted)'
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
                // Shell utilities
                'ls'      => true,
                'cat'     => true,
                'pwd'     => true,
                'echo'    => true,
                'mkdir'   => true,
                'cp'      => true,
                'mv'      => true,
                'rm'      => true,
                'touch'   => true,
                'find'    => true,
                'grep'    => true,
                'which'   => true,
                'whoami'  => true,
                // Build tools
                'make'    => true,
                'rsbuild' => true,
                'vite'    => true,
                'tsc'     => true,
            ],
            'blocked_patterns' => [
                'rm -rf /',
                'rm -rf ~',
                'sudo',
                'su ',
                ':(){:|:&};:',
                'mkfs',
                'dd if=',
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
            'js', 'jsx', 'ts', 'tsx',
            'php', 'py', 'rb', 'java',
            'html', 'htm', 'css', 'scss', 'sass', 'less',
            'json', 'xml', 'yaml', 'yml',
            'md', 'txt', 'rst',
            'sql', 'sh', 'bash',
            'lock', 'env.example'
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
