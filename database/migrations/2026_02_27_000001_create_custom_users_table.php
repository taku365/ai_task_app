<?php
// マイグレーションファイルを作成するためのクラス
use Illuminate\Database\Migrations\Migration;
// テーブル設計を書くためのクラス $table->string()などを定義できる
use Illuminate\Database\Schema\Blueprint;
// データベース操作を行うためのクラス Schema::create()などを定義できる
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // migration実行時に呼ばれるメソッド
    public function up(): void
    {
        /* $table は Blueprintクラスのインスタンスである
           $table->id(); は Blueprint クラスの id() メソッドを呼んでいる */
        Schema::create('ai_tasks_M_users', function (Blueprint $table) {
            $table->id();                                    // BIGINT UNSIGNED AUTO_INCREMENT
            $table->string('name', 50);                      // VARCHAR(50) NOT NULL
            $table->string('email')->unique();               // VARCHAR(255) NOT NULL UNIQUE
            $table->string('password');                      // VARCHAR(255) NOT NULL
            $table->boolean('active_flg')->default(true);    // TINYINT(1) NOT NULL DEFAULT 1
            $table->timestamps();                            // created_at, updated_at
        });
    }

    // migrationを取り消す時に呼ばれるメソッド
    public function down(): void
    {
        // テーブルを削除する
        Schema::dropIfExists('ai_tasks_M_users');
    }
};
