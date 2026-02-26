# ⚛️ React Scaffolder - Complete Guide

## Overview

Your code editor now includes a **powerful React scaffolding system** that can automatically create full React application structures with one command. The AI agent understands React scaffolding commands and can create complete projects for you.

---

## ✨ Features

### 1. **Full React Project Generation**
- Complete directory structure
- Package.json with all dependencies
- Vite configuration
- ESLint setup
- Git ignore file
- README with instructions

### 2. **Multiple Templates**
Choose from 5 pre-configured templates:

- **Basic** - Simple React app with Vite
- **Router** - React app with React Router
- **TypeScript** - Type-safe React with TypeScript
- **Redux** - React with Redux Toolkit
- **Zustand** - React with Zustand state management

### 3. **Customizable Options**
- TypeScript support
- React Router integration
- State management (Context, Redux, Zustand)
- Component structure
- Hooks and utilities

### 4. **AI Agent Integration**
The AI agent can create React apps through natural language commands like:
- "Create a React app called my-store"
- "Scaffold a React project with Redux and TypeScript"
- "Make a new React app with router"

---

## 🚀 Quick Start

### Method 1: Using the AI Agent (Easiest)

1. Open the Code Editor
2. Select a workspace
3. Open the AI Chat panel
4. Type a command:

```
Create a React app called my-app
```

or

```
Create a React application named shop-dashboard with React Router and Redux
```

The AI will automatically:
- Create the project structure
- Generate all necessary files
- Set up configuration
- Create sample components
- Generate a README

### Method 2: Using the API Directly

```bash
# Via cURL
curl -X POST http://localhost:8000/api/workspaces/{workspace_id}/react/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "app_name": "my-react-app",
    "typescript": false,
    "router": true,
    "state": "context"
  }'
```

### Method 3: Using a Template

```bash
curl -X POST http://localhost:8000/api/workspaces/{workspace_id}/react/create-from-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "template": "redux",
    "app_name": "my-redux-app"
  }'
```

---

## 📋 Available Templates

### 1. Basic Template
**Perfect for:** Learning React, simple projects

**Features:**
- React 18
- Vite
- ESLint
- No routing
- No state management

**Command:**
```
Create a basic React app called my-app
```

### 2. Router Template
**Perfect for:** Multi-page applications

**Features:**
- React 18
- React Router v6
- Vite
- ESLint
- Context API for state

**Command:**
```
Create a React app with router called my-site
```

### 3. TypeScript Template
**Perfect for:** Type-safe applications

**Features:**
- React 18
- TypeScript 5
- React Router v6
- Vite
- ESLint
- Context API

**Command:**
```
Create a TypeScript React app called my-ts-app
```

### 4. Redux Template
**Perfect for:** Complex state management

**Features:**
- React 18
- Redux Toolkit
- React Router v6
- Vite
- ESLint

**Command:**
```
Create a React app with Redux called my-store
```

### 5. Zustand Template
**Perfect for:** Lightweight state management

**Features:**
- React 18
- Zustand
- React Router v6
- Vite
- ESLint

**Command:**
```
Create a React app with Zustand called my-zustand-app
```

---

## 🎯 AI Command Examples

The AI agent understands various phrasings:

### Basic Commands
```
Create a React app
Make a new React project
Scaffold a React application
Generate a React app
```

### With Name
```
Create a React app called shop-frontend
Make a React project named blog-cms
Generate a React app called dashboard
```

### With Features
```
Create a React app with TypeScript
Make a React project with Router and Redux
Create a React app with Zustand state management
Build a TypeScript React app with Router
```

### Specific Configurations
```
Create a React app called store-app with:
- TypeScript
- React Router
- Redux Toolkit
- ESLint configuration
```

---

## 📁 Generated Project Structure

```
my-react-app/
├── public/
│   └── index.html              # Main HTML file
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Header component
│   │   └── Footer.jsx          # Footer component
│   ├── hooks/
│   │   └── useApp.jsx          # Custom hook (if Context)
│   ├── utils/                  # Utility functions
│   ├── styles/
│   │   └── index.css           # Global styles
│   ├── assets/                 # Images, fonts, etc.
│   ├── App.jsx                 # Main App component
│   └── main.jsx                # Entry point
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
└── README.md                  # Project documentation
```

---

## 🔧 After Generation

### Step 1: Install Dependencies

```bash
cd my-react-app
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### Step 3: Available Scripts

- **`npm run dev`** - Start development server
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build
- **`npm run lint`** - Run ESLint

---

## 📚 Generated Files Explained

### package.json
Contains all dependencies and scripts:

```json
{
  "name": "my-react-app",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  }
}
```

### vite.config.js
Vite configuration:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
```

### src/App.jsx
Main application component with Router (if enabled):

```jsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

function Home() {
  return <div><h1>Home Page</h1></div>
}

function About() {
  return <div><h1>About Page</h1></div>
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
```

### src/components/Header.jsx
Pre-built header component:

```jsx
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

export default Header
```

### src/hooks/useApp.jsx
Context API hook (if Context state management):

```jsx
import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')

  const value = { user, setUser, theme, setTheme }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
```

---

## 🎨 Customization Options

### TypeScript
Add TypeScript support to your project:

**Command:**
```
Create a TypeScript React app
```

**What it adds:**
- TypeScript compiler
- Type definitions for React
- TSConfig.json
- .tsx file extensions

### React Router
Add routing for multi-page apps:

**Command:**
```
Create a React app with router
```

**What it adds:**
- React Router v6
- Pre-configured routes
- Navigation components
- Route examples (Home, About)

### State Management

#### Context API
**Command:** `Create a React app with Context`

**What it adds:**
- Custom hook (useApp)
- Context Provider
- State management example

#### Redux Toolkit
**Command:** `Create a React app with Redux`

**What it adds:**
- Redux Toolkit
- React-Redux bindings
- Store configuration
- Slice examples

#### Zustand
**Command:** `Create a React app with Zustand`

**What it adds:**
- Zustand library
- Store example
- Hook integration

---

## 🔌 API Reference

### Get Available Templates

```http
GET /api/workspaces/{workspace_id}/react/templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "basic",
      "name": "Basic React App",
      "description": "Simple React app with Vite",
      "features": ["React 18", "Vite", "ESLint"],
      "options": {
        "typescript": false,
        "router": false,
        "state": "none"
      }
    }
  ]
}
```

### Create React App

```http
POST /api/workspaces/{workspace_id}/react/create
Content-Type: application/json

{
  "app_name": "my-react-app",
  "typescript": false,
  "router": true,
  "state": "context"
}
```

**Response:**
```json
{
  "success": true,
  "message": "React app 'my-react-app' created successfully",
  "path": "my-react-app",
  "next_steps": [
    "cd my-react-app",
    "npm install",
    "npm start"
  ]
}
```

### Create from Template

```http
POST /api/workspaces/{workspace_id}/react/create-from-template
Content-Type: application/json

{
  "template": "redux",
  "app_name": "my-redux-app"
}
```

---

## 💡 Best Practices

### Naming Conventions
- Use lowercase with hyphens: `my-react-app`
- Avoid spaces and special characters
- Keep names descriptive but concise

### After Generation
1. **Install dependencies** immediately
2. **Initialize Git** if not already done
3. **Test the app** before modifying
4. **Read the generated README** for specific instructions

### Development Workflow
1. Generate the app
2. Install dependencies
3. Start dev server
4. Make changes
5. Test frequently
6. Build for production

---

## 🐛 Troubleshooting

### Error: "App name already exists"

**Solution:** Choose a different app name or delete the existing directory

```bash
rm -rf my-react-app
```

### Error: "Failed to create directory"

**Solution:** Check workspace permissions

```bash
icacls storage\workspaces /grant "IIS_IUSRS:(OI)(CI)F" /T
```

### Error: "npm install fails"

**Solution:**
1. Ensure Node.js is installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Try yarn instead: `yarn install`

### Port 3000 already in use

**Solution:** Change port in `vite.config.js`:

```javascript
export default defineConfig({
  server: {
    port: 3001,  // Change port
  }
})
```

---

## 🚀 Advanced Usage

### Custom Templates

You can extend the `ReactScaffolder` class to create your own templates:

1. Edit `app/Support/ReactScaffolder.php`
2. Add your custom template logic
3. Update the controller to expose it

### Integration with CI/CD

Generated apps work seamlessly with:
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI

Just add a `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
```

---

## 📞 Support

### Common Issues

1. **AI doesn't understand command**
   - Be more specific: "Create a React app called X with Y features"
   - Use keywords: React, TypeScript, Router, Redux, Zustand

2. **Generated files have errors**
   - Run `npm install` first
   - Check Node.js version (requires v18+)
   - Clear caches: `npm cache clean --force`

3. **Workspace permissions**
   - Ensure workspace directory is writable
   - Check Laravel storage permissions

---

## 🎓 Learning Resources

After generating your React app:

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Router Docs](https://reactrouter.com)
- [Redux Toolkit Docs](https://redux-toolkit.js.org)
- [Zustand Docs](https://zustand-demo.pmnd.rs)

---

## ✨ Summary

### What You Can Do

1. **Create React apps** with one AI command
2. **Choose from 5 templates** or customize
3. **Add features** like TypeScript, Router, Redux
4. **Get production-ready** code structure
5. **Start developing** immediately

### Next Steps

1. Try creating a basic React app
2. Experiment with different templates
3. Add your own components
4. Deploy to production

---

**Last Updated:** 2026-02-12
**Status:** Production Ready
**Version:** 1.0.0
