<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_tasks_T_tasks', function (Blueprint $table) {
            $table->renameColumn('input_text', 'text_input');
        });
    }

    public function down(): void
    {
        Schema::table('ai_tasks_T_tasks', function (Blueprint $table) {
            $table->renameColumn('text_input', 'input_text');
        });
    }
};
