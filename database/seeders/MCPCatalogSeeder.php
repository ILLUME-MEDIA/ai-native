<?php

namespace Database\Seeders;

use App\Models\MCPServer;
use Illuminate\Database\Seeder;

class MCPCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $servers = [
            // ── AI ─────────────────────────────────────────────────────────────
            [
                'slug'        => 'openai',
                'name'        => 'OpenAI',
                'description' => 'Access OpenAI models (GPT-4, DALL-E, Whisper) for completions, image generation, and transcription.',
                'category'    => 'AI',
                'author'      => 'openai',
                'npm_package' => '@modelcontextprotocol/server-openai',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-openai'],
                'env_schema'  => [
                    'OPENAI_API_KEY' => ['label' => 'OpenAI API Key', 'type' => 'password', 'required' => true, 'description' => 'Your OpenAI API key from platform.openai.com'],
                ],
                'docs_url'    => 'https://platform.openai.com/docs',
            ],
            [
                'slug'        => 'memory',
                'name'        => 'Memory',
                'description' => 'Persistent key-value memory store for AI agents across conversations.',
                'category'    => 'AI',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-memory',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-memory'],
                'env_schema'  => null,
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'sequential-thinking',
                'name'        => 'Sequential Thinking',
                'description' => 'Enables step-by-step reasoning for complex problem solving with dynamic thought revision.',
                'category'    => 'AI',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-sequential-thinking',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-sequential-thinking'],
                'env_schema'  => null,
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],

            // ── Data ───────────────────────────────────────────────────────────
            [
                'slug'        => 'postgres',
                'name'        => 'PostgreSQL',
                'description' => 'Connect to PostgreSQL databases. Execute queries, inspect schemas, and manage data.',
                'category'    => 'Data',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-postgres',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-postgres'],
                'env_schema'  => [
                    'POSTGRES_URL' => ['label' => 'Connection URL', 'type' => 'text', 'required' => true, 'description' => 'postgresql://user:pass@host:5432/db'],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'sqlite',
                'name'        => 'SQLite',
                'description' => 'Interact with SQLite databases. Run queries, manage tables, and inspect data.',
                'category'    => 'Data',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-sqlite',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-sqlite'],
                'args_schema' => [
                    'db_path' => ['label' => 'Database Path', 'type' => 'text', 'required' => true, 'description' => 'Path to the .db file'],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'redis',
                'name'        => 'Redis',
                'description' => 'Read and write to Redis. Manage keys, lists, hashes, and pub/sub channels.',
                'category'    => 'Data',
                'author'      => 'community',
                'npm_package' => 'mcp-server-redis',
                'command'     => ['npx', '-y', 'mcp-server-redis'],
                'env_schema'  => [
                    'REDIS_URL' => ['label' => 'Redis URL', 'type' => 'text', 'required' => true, 'description' => 'redis://localhost:6379'],
                ],
                'docs_url'    => null,
            ],
            [
                'slug'        => 'mongodb',
                'name'        => 'MongoDB',
                'description' => 'Query and manipulate MongoDB collections using natural language.',
                'category'    => 'Data',
                'author'      => 'community',
                'npm_package' => 'mcp-mongo-server',
                'command'     => ['npx', '-y', 'mcp-mongo-server'],
                'env_schema'  => [
                    'MONGODB_URI' => ['label' => 'MongoDB URI', 'type' => 'text', 'required' => true, 'description' => 'mongodb://localhost:27017/mydb'],
                ],
                'docs_url'    => null,
            ],

            // ── DevOps ─────────────────────────────────────────────────────────
            [
                'slug'        => 'filesystem',
                'name'        => 'Filesystem',
                'description' => 'Secure local filesystem access. Read, write, move, and search files with configurable access controls.',
                'category'    => 'DevOps',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-filesystem',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-filesystem'],
                'args_schema' => [
                    'allowed_dirs' => ['label' => 'Allowed Directories', 'type' => 'text', 'required' => true, 'description' => 'Comma-separated list of paths to allow access'],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'github',
                'name'        => 'GitHub',
                'description' => 'Manage GitHub repositories, issues, PRs, branches, and actions from your AI workspace.',
                'category'    => 'DevOps',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-github',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-github'],
                'env_schema'  => [
                    'GITHUB_PERSONAL_ACCESS_TOKEN' => ['label' => 'GitHub PAT', 'type' => 'password', 'required' => true, 'description' => 'Personal Access Token with repo scope'],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'docker',
                'name'        => 'Docker',
                'description' => 'Manage Docker containers, images, volumes, and networks directly from your AI chat.',
                'category'    => 'DevOps',
                'author'      => 'community',
                'npm_package' => 'mcp-server-docker',
                'command'     => ['npx', '-y', 'mcp-server-docker'],
                'env_schema'  => null,
                'docs_url'    => null,
            ],
            [
                'slug'        => 'aws-s3',
                'name'        => 'AWS S3',
                'description' => 'Upload, download, list, and manage files in AWS S3 buckets.',
                'category'    => 'DevOps',
                'author'      => 'community',
                'npm_package' => 'mcp-server-aws-s3',
                'command'     => ['npx', '-y', 'mcp-server-aws-s3'],
                'env_schema'  => [
                    'AWS_ACCESS_KEY_ID'     => ['label' => 'Access Key ID',     'type' => 'text',     'required' => true],
                    'AWS_SECRET_ACCESS_KEY' => ['label' => 'Secret Access Key', 'type' => 'password', 'required' => true],
                    'AWS_REGION'            => ['label' => 'Region',            'type' => 'text',     'required' => false, 'description' => 'e.g. us-east-1'],
                ],
                'docs_url'    => null,
            ],
            [
                'slug'        => 'vercel',
                'name'        => 'Vercel',
                'description' => 'Deploy projects, manage domains, inspect builds, and view logs on Vercel.',
                'category'    => 'DevOps',
                'author'      => 'community',
                'npm_package' => 'mcp-vercel',
                'command'     => ['npx', '-y', 'mcp-vercel'],
                'env_schema'  => [
                    'VERCEL_TOKEN' => ['label' => 'Vercel API Token', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => null,
            ],
            [
                'slug'        => 'sentry',
                'name'        => 'Sentry',
                'description' => 'Query Sentry error events, issues, performance data, and releases.',
                'category'    => 'DevOps',
                'author'      => 'community',
                'npm_package' => 'mcp-server-sentry',
                'command'     => ['npx', '-y', 'mcp-server-sentry'],
                'env_schema'  => [
                    'SENTRY_AUTH_TOKEN' => ['label' => 'Sentry Auth Token', 'type' => 'password', 'required' => true],
                    'SENTRY_ORG'        => ['label' => 'Organization Slug',  'type' => 'text',     'required' => true],
                ],
                'docs_url'    => null,
            ],

            // ── Browser ────────────────────────────────────────────────────────
            [
                'slug'        => 'puppeteer',
                'name'        => 'Puppeteer',
                'description' => 'Browser automation: navigate pages, take screenshots, fill forms, and scrape content.',
                'category'    => 'Browser',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-puppeteer',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-puppeteer'],
                'env_schema'  => null,
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'playwright',
                'name'        => 'Playwright',
                'description' => 'Cross-browser automation with Playwright. Test UI flows, scrape SPAs, and capture screenshots.',
                'category'    => 'Browser',
                'author'      => 'community',
                'npm_package' => 'mcp-playwright',
                'command'     => ['npx', '-y', 'mcp-playwright'],
                'env_schema'  => null,
                'docs_url'    => null,
            ],
            [
                'slug'        => 'brave-search',
                'name'        => 'Brave Search',
                'description' => 'Search the web using Brave\'s privacy-preserving search API. Get real-time results.',
                'category'    => 'Browser',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-brave-search',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-brave-search'],
                'env_schema'  => [
                    'BRAVE_API_KEY' => ['label' => 'Brave Search API Key', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'fetch',
                'name'        => 'Fetch',
                'description' => 'Make HTTP requests to any URL. Fetch web pages, APIs, and convert HTML to Markdown.',
                'category'    => 'Browser',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-fetch',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-fetch'],
                'env_schema'  => null,
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],

            // ── Communication ──────────────────────────────────────────────────
            [
                'slug'        => 'slack',
                'name'        => 'Slack',
                'description' => 'Send messages, list channels, search threads, and manage Slack workspaces.',
                'category'    => 'Communication',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-slack',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-slack'],
                'env_schema'  => [
                    'SLACK_BOT_TOKEN'  => ['label' => 'Bot Token',  'type' => 'password', 'required' => true, 'description' => 'xoxb-... token from Slack app settings'],
                    'SLACK_TEAM_ID'    => ['label' => 'Team ID',    'type' => 'text',     'required' => true],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'notion',
                'name'        => 'Notion',
                'description' => 'Read and write Notion pages, databases, and blocks. Search your workspace.',
                'category'    => 'Communication',
                'author'      => 'community',
                'npm_package' => 'mcp-notion-server',
                'command'     => ['npx', '-y', 'mcp-notion-server'],
                'env_schema'  => [
                    'NOTION_API_KEY' => ['label' => 'Notion Integration Token', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => null,
            ],
            [
                'slug'        => 'linear',
                'name'        => 'Linear',
                'description' => 'Create issues, update statuses, query projects, and manage sprints in Linear.',
                'category'    => 'Communication',
                'author'      => 'community',
                'npm_package' => 'mcp-linear',
                'command'     => ['npx', '-y', 'mcp-linear'],
                'env_schema'  => [
                    'LINEAR_API_KEY' => ['label' => 'Linear API Key', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => null,
            ],

            // ── Tools ──────────────────────────────────────────────────────────
            [
                'slug'        => 'google-maps',
                'name'        => 'Google Maps',
                'description' => 'Search places, get directions, geocode addresses, and explore location data.',
                'category'    => 'Tools',
                'author'      => 'anthropic',
                'npm_package' => '@modelcontextprotocol/server-google-maps',
                'command'     => ['npx', '-y', '@modelcontextprotocol/server-google-maps'],
                'env_schema'  => [
                    'GOOGLE_MAPS_API_KEY' => ['label' => 'Maps API Key', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => 'https://github.com/modelcontextprotocol/servers',
            ],
            [
                'slug'        => 'stripe',
                'name'        => 'Stripe',
                'description' => 'Query Stripe payments, customers, subscriptions, and invoices.',
                'category'    => 'Tools',
                'author'      => 'community',
                'npm_package' => 'mcp-server-stripe',
                'command'     => ['npx', '-y', 'mcp-server-stripe'],
                'env_schema'  => [
                    'STRIPE_SECRET_KEY' => ['label' => 'Stripe Secret Key', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => null,
            ],
            [
                'slug'        => 'figma',
                'name'        => 'Figma',
                'description' => 'Access Figma files, frames, components, and export assets programmatically.',
                'category'    => 'Tools',
                'author'      => 'community',
                'npm_package' => 'mcp-figma',
                'command'     => ['npx', '-y', 'mcp-figma'],
                'env_schema'  => [
                    'FIGMA_API_KEY' => ['label' => 'Figma Personal Access Token', 'type' => 'password', 'required' => true],
                ],
                'docs_url'    => null,
            ],
        ];

        foreach ($servers as $data) {
            MCPServer::updateOrCreate(['slug' => $data['slug']], $data);
        }

        $this->command->info('✓ Seeded ' . count($servers) . ' MCP servers');
    }
}
