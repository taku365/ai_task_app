<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\AuthController;

// ゲスト用ルート（ログインしていない人だけアクセス可能）
Route::middleware('guest')->group(function () {
    // ログイン画面の表示
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');

    // ログイン処理（フォーム送信時）
    Route::post('/login', [AuthController::class, 'login']);
});

// ログアウト処理 (ログイン済みの人だけ)
Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// 認証が必要なルート（ログインしている人だけアクセス可能）
Route::middleware('auth')->group(function () {
    Route::get('/', [TaskController::class, 'index'])->name('tasks.index');
    Route::get('/settings',  [TaskController::class, 'settings'])->name('tasks.settings');
});

Route::get('/register', function () {
    return view('auth.register');
})->name('register');
