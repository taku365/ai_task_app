<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;


Route::get('/', [TaskController::class, 'index'])->name('tasks.index');
Route::get('/settings',  [TaskController::class, 'settings'])->name('tasks.settings');

Route::get('/login', function () {
    return view('auth.login');
})->name('login');
