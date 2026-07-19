<?php



use App\Http\Controllers\Api\V1\AIController;

use App\Http\Controllers\Api\V1\AnalyticsController;

use App\Http\Controllers\Api\V1\AuthController;

use App\Http\Controllers\Api\V1\BillingController;

use App\Http\Controllers\Api\V1\BotController;

use App\Http\Controllers\Api\V1\ConversationController;

use App\Http\Controllers\Api\V1\IntegrationController;

use App\Http\Controllers\Api\V1\KnowledgeController;

use App\Http\Controllers\Api\V1\MarketplaceController;

use App\Http\Controllers\Api\V1\TableController;

use App\Http\Controllers\Api\V1\WebhookController;

use App\Http\Controllers\Api\V1\WidgetController;

use App\Http\Controllers\Api\V1\WorkflowController;

use App\Http\Controllers\Api\V1\WorkspaceController;

use Illuminate\Support\Facades\Route;



Route::prefix('v1')->group(function () {

  Route::post('/auth/register', [AuthController::class, 'register']);
  Route::post('/auth/login', [AuthController::class, 'login']);
  Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);

  Route::post('/webhooks/{integration}', [WebhookController::class, 'handle']);

  Route::get('/widget/{bot}/config', [WidgetController::class, 'config']);

  Route::post('/widget/{bot}/conversations', [WidgetController::class, 'startConversation']);

  Route::post('/widget/conversations/{conversation}/messages', [WidgetController::class, 'sendMessage']);

  Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/auth/user', [AuthController::class, 'user']);

    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

    Route::get('/auth/api-keys', [AuthController::class, 'apiKeys']);

    Route::post('/auth/api-keys', [AuthController::class, 'createApiKey']);

    Route::delete('/auth/api-keys/{id}', [AuthController::class, 'deleteApiKey']);

    Route::get('/auth/sessions', [AuthController::class, 'sessions']);

    Route::delete('/auth/sessions/{id}', [AuthController::class, 'revokeSession']);



    Route::get('/organizations', [AuthController::class, 'organizations']);

    Route::get('/organizations/{orgId}/workspaces', [AuthController::class, 'workspaces']);



    Route::post('/workspaces', [WorkspaceController::class, 'store']);

    Route::get('/workspaces/{workspace}/team', [WorkspaceController::class, 'team']);

    Route::post('/workspaces/{workspace}/team', [WorkspaceController::class, 'inviteMember']);

    Route::put('/workspaces/{workspace}/team/{user}', [WorkspaceController::class, 'updateMember']);

    Route::delete('/workspaces/{workspace}/team/{user}', [WorkspaceController::class, 'removeMember']);



    Route::apiResource('bots', BotController::class);

    Route::post('/bots/{bot}/archive', [BotController::class, 'archive']);

    Route::post('/bots/{bot}/duplicate', [BotController::class, 'duplicate']);

    Route::get('/bots/{bot}/conversations', [ConversationController::class, 'index']);

    Route::post('/bots/{bot}/conversations', [ConversationController::class, 'store']);



    Route::apiResource('workflows', WorkflowController::class);

    Route::post('/workflows/{workflow}/publish', [WorkflowController::class, 'publish']);

    Route::post('/workflows/{workflow}/run', [WorkflowController::class, 'run']);

    Route::get('/workflows/{workflow}/executions', [WorkflowController::class, 'executions']);



    Route::post('/knowledge/{knowledge}/recrawl', [KnowledgeController::class, 'recrawl']);

    Route::post('/knowledge/{knowledge}/reprocess', [KnowledgeController::class, 'reprocess']);

    Route::apiResource('knowledge', KnowledgeController::class);



    Route::apiResource('tables', TableController::class);

    Route::post('/tables/{table}/rows', [TableController::class, 'storeRow']);

    Route::put('/tables/{table}/rows/{row}', [TableController::class, 'updateRow']);

    Route::delete('/tables/{table}/rows/{row}', [TableController::class, 'destroyRow']);



    Route::get('/ai/providers', [AIController::class, 'providers']);



    Route::get('/integrations/catalog', [IntegrationController::class, 'catalog']);

    Route::post('/integrations/{integration}/test', [IntegrationController::class, 'test']);

    Route::post('/integrations/{integration}/whatsapp/setup', [IntegrationController::class, 'whatsappSetup']);

    Route::post('/integrations/{integration}/whatsapp/sync', [IntegrationController::class, 'whatsappSync']);

    Route::post('/integrations/{integration}/whatsapp/connect', [IntegrationController::class, 'whatsappConnect']);

    Route::get('/integrations/{integration}/whatsapp/sessions', [IntegrationController::class, 'whatsappSessions']);

    Route::get('/integrations/{integration}/whatsapp/qrcode', [IntegrationController::class, 'whatsappQrCode']);

    Route::get('/integrations/{integration}/whatsapp/status', [IntegrationController::class, 'whatsappStatus']);

    Route::apiResource('integrations', IntegrationController::class);



    Route::get('/analytics', [AnalyticsController::class, 'index']);

    Route::get('/analytics/bots/{bot}', [AnalyticsController::class, 'bot']);



    Route::get('/billing', [BillingController::class, 'index']);

    Route::post('/billing/checkout', [BillingController::class, 'checkout']);



    Route::get('/marketplace', [MarketplaceController::class, 'index']);

    Route::post('/marketplace/{template}/install', [MarketplaceController::class, 'install']);



    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);

    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);

  });

});


