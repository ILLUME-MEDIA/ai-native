<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Support\ReactScaffolder;
use Illuminate\Http\Request;

class ReactScaffolderController extends Controller
{
    /**
     * Create a new React application
     */
    public function createReactApp(Request $request, Workspace $workspace)
    {
        $request->validate([
            'app_name' => 'required|string|regex:/^[a-z0-9-]+$/',
            'typescript' => 'nullable|boolean',
            'router' => 'nullable|boolean',
            'state' => 'nullable|in:context,redux,zustand,none',
        ]);

        $scaffolder = new ReactScaffolder($workspace);

        $result = $scaffolder->createReactApp($request->app_name, [
            'typescript' => $request->input('typescript', false),
            'router' => $request->input('router', true),
            'state' => $request->input('state', 'context'),
        ]);

        return response()->json($result);
    }

    /**
     * Get available React templates
     */
    public function getTemplates()
    {
        $templates = [
            [
                'id' => 'basic',
                'name' => 'Basic React App',
                'description' => 'Simple React app with Vite, no routing',
                'features' => ['React 18', 'Vite', 'ESLint'],
                'options' => [
                    'typescript' => false,
                    'router' => false,
                    'state' => 'none',
                ],
            ],
            [
                'id' => 'router',
                'name' => 'React Router App',
                'description' => 'React app with React Router for multiple pages',
                'features' => ['React 18', 'Vite', 'React Router', 'ESLint'],
                'options' => [
                    'typescript' => false,
                    'router' => true,
                    'state' => 'context',
                ],
            ],
            [
                'id' => 'typescript',
                'name' => 'TypeScript React App',
                'description' => 'Type-safe React app with TypeScript',
                'features' => ['React 18', 'TypeScript', 'Vite', 'React Router', 'ESLint'],
                'options' => [
                    'typescript' => true,
                    'router' => true,
                    'state' => 'context',
                ],
            ],
            [
                'id' => 'redux',
                'name' => 'React + Redux Toolkit',
                'description' => 'React app with Redux Toolkit for state management',
                'features' => ['React 18', 'Redux Toolkit', 'React Router', 'Vite', 'ESLint'],
                'options' => [
                    'typescript' => false,
                    'router' => true,
                    'state' => 'redux',
                ],
            ],
            [
                'id' => 'zustand',
                'name' => 'React + Zustand',
                'description' => 'React app with Zustand for lightweight state management',
                'features' => ['React 18', 'Zustand', 'React Router', 'Vite', 'ESLint'],
                'options' => [
                    'typescript' => false,
                    'router' => true,
                    'state' => 'zustand',
                ],
            ],
        ];

        return response()->json([
            'templates' => $templates,
        ]);
    }

    /**
     * Create React app from template
     */
    public function createFromTemplate(Request $request, Workspace $workspace)
    {
        $request->validate([
            'template' => 'required|in:basic,router,typescript,redux,zustand',
            'app_name' => 'required|string|regex:/^[a-z0-9-]+$/',
        ]);

        $templates = [
            'basic' => ['typescript' => false, 'router' => false, 'state' => 'none'],
            'router' => ['typescript' => false, 'router' => true, 'state' => 'context'],
            'typescript' => ['typescript' => true, 'router' => true, 'state' => 'context'],
            'redux' => ['typescript' => false, 'router' => true, 'state' => 'redux'],
            'zustand' => ['typescript' => false, 'router' => true, 'state' => 'zustand'],
        ];

        $options = $templates[$request->template];

        $scaffolder = new ReactScaffolder($workspace);
        $result = $scaffolder->createReactApp($request->app_name, $options);

        return response()->json($result);
    }
}
