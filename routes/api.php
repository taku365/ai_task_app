<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;

// webミドルウェアとauthミドルウェアを適用
// webミドルウェア: セッション、CSRF保護、Cookie暗号化など
// authミドルウェア: ログイン認証チェック
Route::middleware(['web', 'auth'])->group(function () {
    // 一覧取得(JSON API方式)
    Route::get('/tasks', [TaskController::class, 'apiIndex']);

    // AI解析
    Route::post('/tasks/analyze', [TaskController::class, 'analyzeTask']);

    // 新規作成
    Route::post('/tasks', [TaskController::class, 'createNewTask']);

    // 編集
    Route::put('/tasks/{id}', [TaskController::class, 'editTask']);

    // 削除
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);

    // 完了
    Route::patch('/tasks/{id}/complete', [TaskController::class, 'complete']);

    // 未完了に戻す
    Route::patch('/tasks/{id}/uncomplete', [TaskController::class, 'uncomplete']);
});
