<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Task;
use App\Models\Priority;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevSeeder extends Seeder
{
    public function run(): void
    {
        // 固定ユーザー3人
        $user1 = User::factory()->create([
            'name'     => 'テスト1',
            'email'    => 'test1@test.com',
            'password' => Hash::make('password'),
        ]);
        $user2 = User::factory()->create([
            'name'     => 'テスト2',
            'email'    => 'test2@test.com',
            'password' => Hash::make('password'),
        ]);
        $user3 = User::factory()->create([
            'name'     => 'テスト3',
            'email'    => 'test3@test.com',
            'password' => Hash::make('password'),
        ]);

        $users = collect([$user1, $user2, $user3]);

        $highPriority   = Priority::where('code', 'high')->first()?->id;
        $mediumPriority = Priority::where('code', 'medium')->first()?->id;
        $lowPriority    = Priority::where('code', 'low')->first()?->id;

        $today    = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();
        $dayAfter = now()->addDays(2)->toDateString();
        $overdue  = now()->subDays(3)->toDateString();

        // 期限切れ × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "期限切れタスク {$i}",
                'ai_task'       => "期限切れタスク {$i}",
                'due_date'      => $overdue,
                'assignee_id'   => $users->random()->id,
                'priority_id'   => $mediumPriority,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 今日 × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "今日のタスク {$i}",
                'ai_task'       => "今日のタスク {$i}",
                'due_date'      => $today,
                'assignee_id'   => $users->random()->id,
                'priority_id'   => $highPriority,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 明日 × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "明日のタスク {$i}",
                'ai_task'       => "明日のタスク {$i}",
                'due_date'      => $tomorrow,
                'assignee_id'   => $users->random()->id,
                'priority_id'   => $lowPriority,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 明後日 × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "明後日のタスク {$i}",
                'ai_task'       => "明後日のタスク {$i}",
                'due_date'      => $dayAfter,
                'assignee_id'   => $users->random()->id,
                'priority_id'   => $mediumPriority,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 期限なし × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "期限なしタスク {$i}",
                'ai_task'       => "期限なしタスク {$i}",
                'due_date'      => null,
                'assignee_id'   => $users->random()->id,
                'priority_id'   => $lowPriority,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 優先度なし × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "優先度なしタスク {$i}",
                'ai_task'       => "優先度なしタスク {$i}",
                'due_date'      => $tomorrow,
                'assignee_id'   => $users->random()->id,
                'priority_id'   => null,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 担当者なし × 2件
        foreach (range(1, 2) as $i) {
            Task::create([
                'text_input'    => "担当者なしタスク {$i}",
                'ai_task'       => "担当者なしタスク {$i}",
                'due_date'      => $today,
                'assignee_id'   => null,
                'priority_id'   => $mediumPriority,
                'created_by_id' => $users->random()->id,
            ]);
        }

        // 完了済み × 5件
        foreach (range(1, 5) as $i) {
            $assignee = $users->random();
            Task::create([
                'text_input'      => "完了済みタスク {$i}",
                'ai_task'         => "完了済みタスク {$i}",
                'due_date'        => now()->subDays(rand(1, 10))->toDateString(),
                'assignee_id'     => $assignee->id,
                'priority_id'     => $mediumPriority,
                'created_by_id'   => $users->random()->id,
                'completed_flg'   => true,
                'completed_at'    => now()->subDays(rand(0, 5)),
                'completed_by_id' => $assignee->id,
            ]);
        }
    }
}
