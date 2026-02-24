<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TaskController;


Route::get('/', [TaskController::class, 'index'])->name('tasks.index');
Route::get('/settings',  [TaskController::class, 'settings'])->name('tasks.settings');
