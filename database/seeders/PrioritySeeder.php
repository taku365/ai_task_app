<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PrioritySeeder extends Seeder
{
    public function run(): void
    {
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, level, color) VALUES (0, '指定なし', 0, '#FF6B6B')");
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, level, color) VALUES (1, '低', 1, '#95A5A6')");
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, level, color) VALUES (2, '中', 2, '#F39C12')");
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, level, color) VALUES (3, '高', 3, '#28A745')");
    }
}
