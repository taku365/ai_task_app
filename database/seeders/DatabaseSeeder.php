<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // $this は DatabaseSeeder クラスのインスタンス
        // call() は Seeder クラスが持っているメソッド
        // call() は 指定した Seeder クラスの run() を実行する命令

        // ★PrioritySeeder クラスを実行する
        // （Laravel が内部でインスタンスを生成し、run() を呼び出す）
        $this->call([
            PrioritySeeder::class,  // 優先度マスターデータ（必須）
            DevSeeder::class,       // 開発用テストデータ
        ]);
    }
}
