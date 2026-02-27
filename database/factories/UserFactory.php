<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

// テスト用のダミーデータを作るクラス
class UserFactory extends Factory
{
    // 1回だけハッシュ化して、全ユーザーで共有する
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password123'),
            'active_flg' => true,
        ];
    }

    // definition()メソッドをオーバーライドして、テスト用のダミーデータを作る
    public function testUser(): static
    {
        return $this->state(fn(array $attributes) => [
            'name' => 'テストユーザー',
            'email' => 'test@example.com',
        ]);
    }
}
