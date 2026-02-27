<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    public function definition(): array
    {
        $taskPairs = [
            ['input' => '来週の会議資料を作成してください', 'ai' => '会議資料作成'],
            ['input' => 'システムのテストをお願いします', 'ai' => 'システムテスト実行'],
            ['input' => 'データベースの最適化を行ってください', 'ai' => 'DB最適化'],
            ['input' => '月次報告書を提出してください', 'ai' => '月次報告書作成'],
            ['input' => 'プレゼン資料を準備してください', 'ai' => 'プレゼン資料準備'],
            ['input' => '顧客への提案書を作成してください', 'ai' => '提案書作成'],
            ['input' => 'バグの修正をお願いします', 'ai' => 'バグ修正対応'],
            ['input' => '新機能の設計書を作成してください', 'ai' => '設計書作成'],
            ['input' => 'コードレビューをお願いします', 'ai' => 'コードレビュー実施'],
            ['input' => 'サーバーの監視設定を確認してください', 'ai' => 'サーバー監視設定確認'],
            ['input' => 'ユーザーマニュアルを更新してください', 'ai' => 'マニュアル更新'],
            ['input' => 'セキュリティパッチを適用してください', 'ai' => 'セキュリティパッチ適用'],
            ['input' => 'テストケースを追加してください', 'ai' => 'テストケース追加'],
            ['input' => 'パフォーマンスの改善をお願いします', 'ai' => 'パフォーマンス改善'],
            ['input' => 'ログの分析をしてください', 'ai' => 'ログ分析'],
        ];

        $selectedTask = fake()->randomElement($taskPairs);

        return [
            'input_text' => $selectedTask['input'],
            'ai_task' => $selectedTask['ai'],
            'due_date' => fake()->optional(0.7)->dateTimeBetween('now', '+30 days'),
            'assignee_id' => null,
            'priority_id' => fake()->numberBetween(0, 3),
            'created_by_id' => null,
            'completed_flg' => false,
            'completed_at' => null,
            'completed_by_id' => null,
        ];
    }

    // 完了済みタスク用の状態
    public function completed(): static
    {
        return $this->state(fn(array $attributes) => [
            'completed_flg' => true,
            'completed_at' => fake()->dateTimeBetween('-30 days', 'now'),
            'completed_by_id' => $attributes['assignee_id'], // 担当者が完了
        ]);
    }

    // 未割当タスク用の状態（期限なし・優先度指定なし）
    public function unassigned(): static
    {
        return $this->state(fn(array $attributes) => [
            'due_date' => null,
            'priority_id' => 0, // 指定なし
        ]);
    }

    // 高優先度タスク用の状態
    public function highPriority(): static
    {
        return $this->state(fn(array $attributes) => [
            'priority_id' => 3, // 高
            'due_date' => fake()->dateTimeBetween('now', '+7 days'), // 1週間以内
        ]);
    }

    // 期限切れタスク用の状態
    public function overdue(): static
    {
        return $this->state(fn(array $attributes) => [
            'due_date' => fake()->dateTimeBetween('-7 days', '-1 day'), // 過去の日付
            'priority_id' => fake()->numberBetween(2, 3), // 中〜高優先度
        ]);
    }
}
