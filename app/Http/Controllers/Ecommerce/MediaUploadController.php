<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MediaUploadController extends Controller
{
    /**
     * POST /api/ecommerce/upload
     * Body (multipart): file, folder? (businesses|menu-items|discovery-users|ecommerce)
     * Returns: { url: string, path: string }
     *
     * Files are stored in public/uploads/ecommerce/{folder}/ — a real directory
     * inside the web root, no symlink required. This avoids 403 errors on shared
     * hosting where Apache's FollowSymLinks is disabled for the storage symlink.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'   => ['required', 'file', 'max:20480'], // 20 MB
            'folder' => ['sometimes', 'string', 'in:businesses,menu-items,discovery-users,ecommerce'],
        ]);

        $file   = $request->file('file');
        $folder = $request->input('folder', 'ecommerce');
        $ext    = strtolower($file->getClientOriginalExtension() ?: 'bin');
        $name   = Str::uuid() . '.' . $ext;

        // Real directory inside public/ — no symlink, no 403 on shared hosting.
        $dir = public_path("uploads/ecommerce/{$folder}");

        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $file->move($dir, $name);
        @chmod("{$dir}/{$name}", 0644);

        $path = "ecommerce/{$folder}/{$name}";

        return response()->json([
            'url'  => url("uploads/{$path}"),
            'path' => $path,
        ]);
    }
}
