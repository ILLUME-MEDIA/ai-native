<?php

namespace App\Http\Middleware;

use App\Services\DynamicEntityService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMcpPermissions
{
    public function __construct(protected DynamicEntityService $service)
    {
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Authenticated users (e.g. Section Editor in admin) can always access entity CRUD
        if ($request->user()) {
            return $next($request);
        }

        // Extract entity slug/table from route parameter
        $entitySlug = $request->route('entity');

        if (!$entitySlug) {
            return $next($request);
        }

        // Resolve the entity
        $entity = $this->service->resolveEntity($entitySlug);

        if (!$entity) {
            return $next($request);
        }

        // If MCP is not enabled, deny access (for unauthenticated / MCP callers)
        if (!$entity->mcp_enabled) {
            return response()->json([
                'error' => 'MCP access is not enabled for this entity',
                'message' => 'This API endpoint requires MCP to be enabled'
            ], 403);
        }

        // Check permissions based on HTTP method
        $method = $request->method();
        $hasPermission = match ($method) {
            'GET', 'HEAD' => $entity->mcp_can_read,
            'POST' => $entity->mcp_can_create,
            'PUT', 'PATCH' => $entity->mcp_can_update,
            'DELETE' => $entity->mcp_can_delete,
            default => false,
        };

        if (!$hasPermission) {
            return response()->json([
                'error' => 'Insufficient MCP permissions',
                'message' => "You do not have permission to perform {$method} operations on this entity",
                'required_permission' => match ($method) {
                    'GET', 'HEAD' => 'mcp_can_read',
                    'POST' => 'mcp_can_create',
                    'PUT', 'PATCH' => 'mcp_can_update',
                    'DELETE' => 'mcp_can_delete',
                    default => 'unknown',
                }
            ], 403);
        }

        return $next($request);
    }
}
