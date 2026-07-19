<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait AuthorizesWorkspace
{
    protected function authorizeWorkspace(Request $request, string $workspaceId): void
    {
        $hasAccess = $request->user()
            ->workspaces()
            ->where('workspaces.id', $workspaceId)
            ->exists();

        if (! $hasAccess) {
            abort(403, 'You do not have access to this workspace.');
        }
    }

    protected function authorizeWorkspaceResource(Request $request, Model $model): void
    {
        if (! isset($model->workspace_id)) {
            return;
        }

        $this->authorizeWorkspace($request, $model->workspace_id);
    }

    protected function scopeToUserWorkspaces(Request $request, $query): void
    {
        $workspaceIds = $request->user()->workspaces()->pluck('workspaces.id');
        $query->whereIn('workspace_id', $workspaceIds);
    }
}
