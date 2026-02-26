<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Priority extends Model
{
    protected $table = 'ai_tasks_M_priorities';

    // 主キーの型を指定（デフォルトではBIGINT、ここではTINYINT）
    // 書かなくてもいいが明示的に指定しておく
    protected $keyType = 'int';

    // マスターデータなので基本的に更新しない
    protected $fillable = [
        'name',
        'level',
        'color',
    ];

    // created_at, updated_atカラムを使わない
    public $timestamps = false;

    // 逆方向のリレーション
    // このPriorityには複数のTaskが関連付けられる
    // hasMany(関連モデル::class, 自分側の外部キー, 関連モデルの主キー(省略可))
    public function tasks()
    {
        return $this->hasMany(Task::class, 'priority_id');
    }
}
