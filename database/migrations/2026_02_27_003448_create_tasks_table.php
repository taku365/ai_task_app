<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_tasks_T_tasks', function (Blueprint $table) {
            $table->id();                                           // BIGINT UNSIGNED AUTO_INCREMENT
            $table->text('input_text');                             // TEXT NOT NULL
            $table->string('ai_task', 500);                         // VARCHAR(500) NOT NULL
            $table->dateTime('due_date')->nullable();               // DATETIME NULL
            $table->unsignedBigInteger('assignee_id')->nullable(); // BIGINT UNSIGNED NULL
            $table->unsignedTinyInteger('priority_id')->nullable()->default(0); // TINYINT UNSIGNED NULL DEFAULT 0
            $table->unsignedBigInteger('created_by_id');            // BIGINT UNSIGNED NOT NULL
            $table->boolean('completed_flg')->default(false);       // TINYINT(1) NOT NULL DEFAULT 0
            $table->dateTime('completed_at')->nullable();           // DATETIME NULL
            $table->unsignedBigInteger('completed_by_id')->nullable(); // BIGINT UNSIGNED NULL
            $table->softDeletes();                                  // deleted_at TIMESTAMP NULL
            $table->timestamps();                                   // created_at, updated_at

            // 外部キー制約
            $table->foreign('assignee_id')->references('id')->on('ai_tasks_M_users');
            $table->foreign('priority_id')->references('id')->on('ai_tasks_M_priorities');
            $table->foreign('created_by_id')->references('id')->on('ai_tasks_M_users');
            $table->foreign('completed_by_id')->references('id')->on('ai_tasks_M_users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_tasks_T_tasks');
    }
};
