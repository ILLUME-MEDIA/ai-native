<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class ReactScaffolder
{
    protected $workspace;
    protected $basePath;

    public function __construct($workspace)
    {
        $this->workspace = $workspace;
        $this->basePath = "workspaces/{$workspace->id}";
    }

    /**
     * Create a full React application structure
     */
    public function createReactApp($appName = 'my-react-app', $options = [])
    {
        $appPath = "{$this->basePath}/{$appName}";

        // Create directory structure
        $this->createDirectories($appPath);

        // Create package.json
        $this->createPackageJson($appPath, $appName, $options);

        // Create configuration files
        $this->createConfigFiles($appPath, $options);

        // Create source files
        $this->createSourceFiles($appPath, $options);

        // Create public files
        $this->createPublicFiles($appPath, $appName);

        // Create README
        $this->createReadme($appPath, $appName);

        return [
            'success' => true,
            'message' => "React app '{$appName}' created successfully",
            'path' => $appName,
            'next_steps' => [
                "cd {$appName}",
                "npm install",
                "npm start",
            ],
        ];
    }

    /**
     * Create directory structure
     */
    protected function createDirectories($appPath)
    {
        $directories = [
            'src',
            'src/components',
            'src/hooks',
            'src/utils',
            'src/styles',
            'src/assets',
            'public',
        ];

        foreach ($directories as $dir) {
            Storage::disk('local')->makeDirectory("{$appPath}/{$dir}");
        }
    }

    /**
     * Create package.json
     */
    protected function createPackageJson($appPath, $appName, $options)
    {
        $useTypeScript = $options['typescript'] ?? false;
        $useRouter = $options['router'] ?? true;
        $useState = $options['state'] ?? 'context';

        $dependencies = [
            'react' => '^18.2.0',
            'react-dom' => '^18.2.0',
        ];

        if ($useRouter) {
            $dependencies['react-router-dom'] = '^6.20.0';
        }

        if ($useState === 'redux') {
            $dependencies['@reduxjs/toolkit'] = '^2.0.0';
            $dependencies['react-redux'] = '^9.0.0';
        } elseif ($useState === 'zustand') {
            $dependencies['zustand'] = '^4.4.0';
        }

        $devDependencies = [
            '@vitejs/plugin-react' => '^4.2.0',
            'vite' => '^5.0.0',
            'eslint' => '^8.55.0',
            'eslint-plugin-react' => '^7.33.0',
        ];

        if ($useTypeScript) {
            $devDependencies['typescript'] = '^5.3.0';
            $devDependencies['@types/react'] = '^18.2.0';
            $devDependencies['@types/react-dom'] = '^18.2.0';
        }

        $packageJson = [
            'name' => $appName,
            'private' => true,
            'version' => '0.1.0',
            'type' => 'module',
            'scripts' => [
                'dev' => 'vite',
                'build' => 'vite build',
                'preview' => 'vite preview',
                'lint' => 'eslint . --ext js,jsx',
            ],
            'dependencies' => $dependencies,
            'devDependencies' => $devDependencies,
        ];

        Storage::disk('local')->put(
            "{$appPath}/package.json",
            json_encode($packageJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
    }

    /**
     * Create configuration files
     */
    protected function createConfigFiles($appPath, $options)
    {
        // vite.config.js
        $viteConfig = <<<'JS'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
JS;
        Storage::disk('local')->put("{$appPath}/vite.config.js", $viteConfig);

        // .gitignore
        $gitignore = <<<'TXT'
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Production
build
dist

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
TXT;
        Storage::disk('local')->put("{$appPath}/.gitignore", $gitignore);

        // .eslintrc.json
        $eslintConfig = [
            'env' => [
                'browser' => true,
                'es2021' => true,
            ],
            'extends' => [
                'eslint:recommended',
                'plugin:react/recommended',
            ],
            'parserOptions' => [
                'ecmaVersion' => 'latest',
                'sourceType' => 'module',
            ],
            'rules' => [
                'react/react-in-jsx-scope' => 'off',
            ],
        ];
        Storage::disk('local')->put(
            "{$appPath}/.eslintrc.json",
            json_encode($eslintConfig, JSON_PRETTY_PRINT)
        );
    }

    /**
     * Create source files
     */
    protected function createSourceFiles($appPath, $options)
    {
        $useRouter = $options['router'] ?? true;
        $useState = $options['state'] ?? 'context';

        // main.jsx
        $mainJsx = <<<'JSX'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
JSX;
        Storage::disk('local')->put("{$appPath}/src/main.jsx", $mainJsx);

        // App.jsx
        if ($useRouter) {
            $appJsx = $this->getAppWithRouter();
        } else {
            $appJsx = $this->getBasicApp();
        }
        Storage::disk('local')->put("{$appPath}/src/App.jsx", $appJsx);

        // Component: Header
        $headerComponent = <<<'JSX'
import React from 'react'

function Header() {
  return (
    <header style={styles.header}>
      <h1>My React App</h1>
      <nav>
        <a href="/" style={styles.link}>Home</a>
        <a href="/about" style={styles.link}>About</a>
      </nav>
    </header>
  )
}

const styles = {
  header: {
    background: '#282c34',
    padding: '20px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    marginLeft: '20px',
  },
}

export default Header
JSX;
        Storage::disk('local')->put("{$appPath}/src/components/Header.jsx", $headerComponent);

        // Component: Footer
        $footerComponent = <<<'JSX'
import React from 'react'

function Footer() {
  return (
    <footer style={styles.footer}>
      <p>&copy; 2026 My React App. All rights reserved.</p>
    </footer>
  )
}

const styles = {
  footer: {
    background: '#282c34',
    color: 'white',
    textAlign: 'center',
    padding: '20px',
    marginTop: 'auto',
  },
}

export default Footer
JSX;
        Storage::disk('local')->put("{$appPath}/src/components/Footer.jsx", $footerComponent);

        // Styles
        $indexCss = <<<'CSS'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  flex: 1;
}
CSS;
        Storage::disk('local')->put("{$appPath}/src/styles/index.css", $indexCss);

        // Context example (if useState === 'context')
        if ($useState === 'context') {
            $this->createContextExample($appPath);
        }
    }

    /**
     * Create public files
     */
    protected function createPublicFiles($appPath, $appName)
    {
        // index.html
        $indexHtml = <<<HTML
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{$appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
HTML;
        Storage::disk('local')->put("{$appPath}/index.html", $indexHtml);
    }

    /**
     * Create README
     */
    protected function createReadme($appPath, $appName)
    {
        $readme = <<<MD
# {$appName}

React application created with custom scaffolder.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit http://localhost:3000

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
{$appName}/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utility functions
│   ├── styles/          # CSS files
│   ├── assets/          # Images, fonts, etc.
│   ├── App.jsx          # Main App component
│   └── main.jsx         # Entry point
├── package.json
├── vite.config.js
└── README.md
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
MD;
        Storage::disk('local')->put("{$appPath}/README.md", $readme);
    }

    /**
     * Get basic App component
     */
    protected function getBasicApp()
    {
        return <<<'JSX'
import React, { useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Header />
      <main className="container">
        <h1>Welcome to React</h1>
        <p>Edit src/App.jsx to get started.</p>

        <div style={{ marginTop: '20px' }}>
          <button onClick={() => setCount(count + 1)}>
            Count: {count}
          </button>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default App
JSX;
    }

    /**
     * Get App component with Router
     */
    protected function getAppWithRouter()
    {
        return <<<'JSX'
import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to your React application!</p>
    </div>
  )
}

function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is a React app created with custom scaffolder.</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App
JSX;
    }

    /**
     * Create Context example
     */
    protected function createContextExample($appPath)
    {
        $appContext = <<<'JSX'
import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')

  const value = {
    user,
    setUser,
    theme,
    setTheme,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
JSX;
        Storage::disk('local')->put("{$appPath}/src/hooks/useApp.jsx", $appContext);
    }
}
