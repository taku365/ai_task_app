<?php

namespace App\Models;

// ファクトリ機能(データ生成用のメソッド)を使用するためのミックスイン
use Illuminate\Database\Eloquent\Factories\HasFactory;
// 認証機能(ログイン、ログアウト、パスワード管理)を使用するためのミックスイン
use Illuminate\Foundation\Auth\User as Authenticatable;
// 通知機能(メール送信、プッシュ通知)を使用するためのミックスイン
use Illuminate\Notifications\Notifiable;


// Laravelのログイン機能は「どのクラスがユーザーなのか」を指定する必要がある
// Authenticatableクラスを継承しているモデルをユーザーとして扱う
// AuthenticatableクラスはLaravelのログイン機能を提供するクラス
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */

    // ファクトリ機能(データ生成用のメソッド)と通知機能(メール送信、プッシュ通知)を使用するためのミックスイン
    use HasFactory, Notifiable;

    // テーブル名を指定
    protected $table = 'ai_tasks_M_users';

    // 一括代入可能なカラムを指定
    protected $fillable = [
        'name',
        'email',
        'password',
        'active_flg',
    ];

    // モデルを配列やJSONに変換する際（APIレスポンスなど）、非表示にするカラムを指定
    protected $hidden = [
        'password',
    ];

    // キャスト:データ型の変換
    protected function casts(): array
    {
        return [
            'password' => 'hashed', // 保存時に自動でハッシュ化される
            'active_flg' => 'boolean', // 取得時に 0/1 を true/false に変換
        ];
    }

    // リレーション
    // 担当者として関連付けられたタスク
    public function assignedTasks()
    {
        return $this->hasMany(Task::class, 'assignee_id');
    }

    // 作成者として関連付けられたタスク
    public function createdTasks()
    {
        return $this->hasMany(Task::class, 'created_by_id');
    }

    // 完了者として関連付けられたタスク
    public function completedTasks()
    {
        return $this->hasMany(Task::class, 'completed_by_id');
    }
}
