<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Task;
use Illuminate\Database\Seeder;

class DevSeeder extends Seeder
{
    public function run(): void
    {
        // 開発用固定ユーザー（実際のメンバー）
        $matsuda = User::factory()->create([
            'name' => '松田',
            'email' => 'matsuda@example.com',
        ]);
        
        $nonaka = User::factory()->create([
            'name' => '野中',
            'email' => 'nonaka@example.com',
        ]);
        
        $shiraishi = User::factory()->create([
            'name' => '白石',
            'email' => 'shiraishi@example.com',
        ]);
        
        $matsunami = User::factory()->create([
            'name' => '松波',
            'email' => 'matsunami@example.com',
        ]);
        
        $miyahara = User::factory()->create([
            'name' => '宮原',
            'email' => 'miyahara@example.com',
        ]);
        
        $yasuoka = User::factory()->create([
            'name' => '安岡',
            'email' => 'yasuoka@example.com',
        ]);
        
        $sakamoto = User::factory()->create([
            'name' => '阪本',
            'email' => 'sakamoto@example.com',
        ]);
        
        $matsumoto = User::factory()->create([
            'name' => '松本',
            'email' => 'matsumoto@example.com',
        ]);
        
        $allUsers = collect([$matsuda, $nonaka, $shiraishi, $matsunami, $miyahara, $yasuoka, $sakamoto, $matsumoto]);
        
        // テストケース1: 松田担当のタスク（自分用タスクのテスト）
        Task::factory(10)->create([
            'assignee_id' => $matsuda->id,
            'created_by_id' => $allUsers->random()->id,
        ]);
        
        // テストケース2: 他メンバー担当のタスク
        foreach ([$nonaka, $shiraishi, $matsunami, $miyahara] as $member) {
            Task::factory(3)->create([
                'assignee_id' => $member->id,
                'created_by_id' => $allUsers->random()->id,
            ]);
        }
        
        // テストケース3: 未割当タスク（担当者なし）
        Task::factory(8)->unassigned()->create([
            'created_by_id' => $allUsers->random()->id,
        ]);
        
        // テストケース4: 完了済みタスク
        Task::factory(12)->completed()->create([
            'assignee_id' => $allUsers->random()->id,
            'created_by_id' => $allUsers->random()->id,
        ]);
        
        // テストケース5: 高優先度タスク
        Task::factory(5)->highPriority()->create([
            'assignee_id' => $allUsers->random()->id,
            'created_by_id' => $allUsers->random()->id,
        ]);
        
        // テストケース6: 期限切れタスク
        Task::factory(4)->overdue()->create([
            'assignee_id' => $allUsers->random()->id,
            'created_by_id' => $allUsers->random()->id,
        ]);
    }
}
