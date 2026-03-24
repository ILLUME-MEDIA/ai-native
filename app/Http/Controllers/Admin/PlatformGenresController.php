<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformGenre;
use Illuminate\Http\Request;

class PlatformGenresController extends Controller
{
    /**
     * GET /api/admin/platform-genres
     * List all platforms with their genres.
     */
    public function index()
    {
        $platforms = PlatformGenre::orderBy('sort_order')->orderBy('platform_name')->get();

        return response()->json($platforms);
    }

    /**
     * POST /api/admin/platform-genres
     * Create a new platform.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'platform_name' => 'required|string|max:100|unique:platform_genres,platform_name',
            'genres'        => 'nullable|array',
            'genres.*'      => 'string|max:200',
            'sort_order'    => 'nullable|integer',
        ]);

        $platform = PlatformGenre::create([
            'platform_name' => $data['platform_name'],
            'genres'        => $data['genres'] ?? [],
            'sort_order'    => $data['sort_order'] ?? PlatformGenre::max('sort_order') + 1,
        ]);

        return response()->json($platform, 201);
    }

    /**
     * PUT /api/admin/platform-genres/{id}
     * Update platform name and/or genres.
     */
    public function update(Request $request, PlatformGenre $platformGenre)
    {
        $data = $request->validate([
            'platform_name' => 'sometimes|string|max:100|unique:platform_genres,platform_name,' . $platformGenre->id,
            'genres'        => 'sometimes|array',
            'genres.*'      => 'string|max:200',
            'sort_order'    => 'sometimes|integer',
        ]);

        $platformGenre->update($data);

        return response()->json($platformGenre->fresh());
    }

    /**
     * DELETE /api/admin/platform-genres/{id}
     */
    public function destroy(PlatformGenre $platformGenre)
    {
        $platformGenre->delete();

        return response()->json(['message' => 'Platform deleted']);
    }

    /**
     * POST /api/admin/platform-genres/{id}/genres
     * Add a single genre to a platform.
     */
    public function addGenre(Request $request, PlatformGenre $platformGenre)
    {
        $data = $request->validate([
            'genre' => 'required|string|max:200',
        ]);

        $genres = $platformGenre->genres ?? [];
        $genre  = trim($data['genre']);

        if (!in_array($genre, $genres)) {
            $genres[] = $genre;
            $platformGenre->update(['genres' => $genres]);
        }

        return response()->json($platformGenre->fresh());
    }

    /**
     * DELETE /api/admin/platform-genres/{id}/genres
     * Remove a single genre from a platform.
     */
    public function removeGenre(Request $request, PlatformGenre $platformGenre)
    {
        $data = $request->validate([
            'genre' => 'required|string',
        ]);

        $genres = array_values(array_filter(
            $platformGenre->genres ?? [],
            fn($g) => $g !== $data['genre']
        ));

        $platformGenre->update(['genres' => $genres]);

        return response()->json($platformGenre->fresh());
    }

    /**
     * POST /api/admin/platform-genres/reorder
     * Update sort_order for multiple platforms.
     */
    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer|exists:platform_genres,id',
        ]);

        foreach ($data['order'] as $index => $id) {
            PlatformGenre::where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['message' => 'Reordered']);
    }
}
