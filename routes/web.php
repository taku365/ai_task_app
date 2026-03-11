<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\AuthController;

// ログイン画面の表示
Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');

// ログイン処理（フォーム送信時）
Route::post('/login', [AuthController::class, 'login']);

Route::get('/', [TaskController::class, 'index'])->name('tasks.index');
Route::get('/settings',  [TaskController::class, 'settings'])->name('tasks.settings');
