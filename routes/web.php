<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\AuthController;

// ゲスト用ルート（ログインしていない人だけアクセス可能）
Route::middleware(['guest', 'no-cache'])->group(function () {
    // ログイン画面の表示
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');

    // ログイン処理（フォーム送信時）
    Route::post('/login', [AuthController::class, 'login']);

    // 新規登録画面の表示
    Route::get('/register', [AuthController::class, 'showRegisterForm'])->name('register');

    // 新規登録処理（フォーム送信時）
    Route::post('/register', [AuthController::class, 'register']);

    // パスワードリセット申請画面
    Route::get('/forgot-password', [AuthController::class, 'showForgotPasswordForm'])->name('password.request');

    // パスワードリセットメール送信
    Route::post('/forgot-password', [AuthController::class, 'sendResetLinkEmail'])->name('password.email');

    // パスワードリセット画面
    Route::get('/reset-password/{token}', [AuthController::class, 'showResetPasswordForm'])->name('password.reset');

    // パスワードリセット処理
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');
});

// ログアウト処理 (ログイン済みの人だけ)
Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// 認証が必要なルート（ログインしている人だけアクセス可能）
Route::middleware(['auth', 'no-cache'])->group(function () {
    // タスク画面
    Route::get('/', [TaskController::class, 'index'])->name('tasks.index');

    // 設定画面
    Route::get('/settings',  [TaskController::class, 'settings'])->name('tasks.settings');

    // アカウント編集画面
    Route::get('/account', [AuthController::class, 'showAccountForm'])->name('account.edit');

    // アカウント情報更新（名前・メール・パスワード用）
    Route::post('/account', [AuthController::class, 'updateAccount'])->name('account.update');

    // プロフィール画像の登録（トリミング後に即送信）
    Route::post('/account/avatar', [AuthController::class, 'uploadAvatar'])->name('account.avatar.upload');

    // プロフィール画像削除
    Route::delete('/account/avatar', [AuthController::class, 'deleteAvatar'])->name('account.avatar.delete');
});
