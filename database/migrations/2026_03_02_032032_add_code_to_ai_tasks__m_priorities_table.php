<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_tasks_M_priorities', function (Blueprint $table) {
            $table->string('code', 20)->after('name');  // nameの後にcodeカラムを追加
        });
    }

    public function down(): void
    {
        Schema::table('ai_tasks_M_priorities', function (Blueprint $table) {
            $table->dropColumn('code');
        });
    }
};
