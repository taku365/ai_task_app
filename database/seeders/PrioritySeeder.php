<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PrioritySeeder extends Seeder
{
    public function run(): void
    {
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, code, level, color) VALUES (0, '指定なし', 'none', 0, '#95A5A6')");
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, code, level, color) VALUES (1, '低', 'low', 1, '#95A5A6')");
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, code, level, color) VALUES (2, '中', 'medium', 2, '#F39C12')");
        DB::insert("INSERT INTO ai_tasks_M_priorities (id, name, code, level, color) VALUES (3, '高', 'high', 3, '#E74C3C')");
    }
}
