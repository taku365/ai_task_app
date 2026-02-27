<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_tasks_M_priorities', function (Blueprint $table) {
            $table->tinyInteger('id')->unsigned()->primary();   // TINYINT UNSIGNED PRIMARY KEY
            $table->string('name', 20);                         // VARCHAR(20) NOT NULL
            $table->tinyInteger('level');                       // TINYINT NOT NULL
            $table->string('color', 7);                         // VARCHAR(7) NOT NULL
            // マスターテーブルなのでtimestampsは不要
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_tasks_M_priorities');
    }
};
