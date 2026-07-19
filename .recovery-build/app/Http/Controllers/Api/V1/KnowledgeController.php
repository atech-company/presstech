<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesWorkspace;
use App\Http\Controllers\Controller;
use App\Jobs\ProcessKnowledgeSource;
use App\Models\KnowledgeSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeController extends Controller
{
    use AuthorizesWorkspace;

    public function index(Request $request): JsonResponse
    {
        $query = KnowledgeSource::query()->withCount('chunks');
        $this->scopeToUserWorkspaces($request, $query);

        if ($wsId = $request->query('workspace_id')) {
            $this->authorizeWorkspace($request, $wsId);
            $query->where('workspace_id', $wsId);
        }

        if ($botId = $request->query('bot_id')) {
            $query->where('bot_id', $botId);
        }

        $sources = $query->latest()->get()->map(fn ($s) => $this->formatSource($s));

        return $this->success($sources);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workspace_id' => 'required|uuid|exists:workspaces,id',
            'bot_id' => 'nullable|uuid|exists:bots,id',
            'name' => 'required|string|max:255',
            'type' => 'required|in:pdf,docx,txt,markdown,csv,website,sitemap,youtube',
            'source_url' => 'nullable|url',
            'file' => 'nullable|file|max:10240',
        ]);

        $this->authorizeWorkspace($request, $validated['workspace_id']);

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('knowledge', 'local');
        }

        $source = KnowledgeSource::create([
            'workspace_id' => $validated['workspace_id'],
            'bot_id' => $validated['bot_id'] ?? null,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'status' => 'pending',
            'file_path' => $filePath,
            'source_url' => $validated['source_url'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        ProcessKnowledgeSource::dispatchSync($source);

        $source->refresh();

        return $this->success($this->formatSource($source), 'Knowledge source processed', 201);
    }

    public function show(Request $request, KnowledgeSource $knowledge): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $knowledge);
        $knowledge->load(['chunks' => fn ($q) => $q->orderBy('position')->limit(50)]);

        return $this->success([
            ...$this->formatSource($knowledge),
            'chunks' => $knowledge->chunks->map(fn ($c) => [
                'id' => $c->id,
                'content' => $c->content,
                'position' => $c->position,
                'token_count' => $c->token_count,
            ]),
        ]);
    }

    public function update(Request $request, KnowledgeSource $knowledge): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $knowledge);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'bot_id' => 'nullable|uuid|exists:bots,id',
            'recrawl' => 'sometimes|boolean',
            'reprocess' => 'sometimes|boolean',
        ]);

        if ($request->boolean('recrawl') || $request->boolean('reprocess')) {
            $knowledge->update(['status' => 'pending']);
            ProcessKnowledgeSource::dispatchSync($knowledge);

            return $this->success(
                $this->formatSource($knowledge->fresh()),
                $request->boolean('recrawl') ? 'Knowledge source re-crawled' : 'Knowledge source reprocessed'
            );
        }

        $knowledge->update($validated);

        return $this->success($this->formatSource($knowledge->fresh()));
    }

    public function recrawl(Request $request, KnowledgeSource $knowledge): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $knowledge);

        $knowledge->update(['status' => 'pending']);
        ProcessKnowledgeSource::dispatchSync($knowledge);

        return $this->success($this->formatSource($knowledge->fresh()), 'Knowledge source re-crawled');
    }

    public function destroy(Request $request, KnowledgeSource $knowledge): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $knowledge);
        $knowledge->chunks()->delete();
        $knowledge->delete();

        return $this->success(null, 'Knowledge source deleted');
    }

    public function reprocess(Request $request, KnowledgeSource $knowledge): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $knowledge);

        $knowledge->update(['status' => 'pending']);

        ProcessKnowledgeSource::dispatchSync($knowledge);

        return $this->success($this->formatSource($knowledge->fresh()), 'Knowledge source reprocessed');
    }

    private function formatSource(KnowledgeSource $source): array
    {
        return [
            'id' => $source->id,
            'workspace_id' => $source->workspace_id,
            'bot_id' => $source->bot_id,
            'name' => $source->name,
            'type' => $source->type,
            'status' => $source->status,
            'source_url' => $source->source_url,
            'chunk_count' => $source->chunk_count ?? $source->chunks_count ?? 0,
            'metadata' => $source->metadata,
            'created_at' => $source->created_at->toIso8601String(),
            'updated_at' => $source->updated_at->toIso8601String(),
        ];
    }
}
