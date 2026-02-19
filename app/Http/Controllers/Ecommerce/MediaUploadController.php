<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadController extends Controller
{
    /**
     * POST /api/ecommerce/upload
     * Body (multipart): file, folder? (businesses|menu-items|discovery-users)
     * Returns: { url: string }
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'   => ['required', 'file', 'max:20480'], // 20 MB
            'folder' => ['sometimes', 'string', 'in:businesses,menu-items,discovery-users,ecommerce'],
        ]);

        $file   = $request->file('file');
        $folder = $request->input('folder', 'ecommerce');
        $ext    = strtolower($file->getClientOriginalExtension());
        $name   = Str::uuid() . '.' . $ext;

        $path = $file->storeAs("public/ecommerce/{$folder}", $name);

        return response()->json([
            'url'  => Storage::url($path),
            'path' => $path,
        ]);
    }
}
