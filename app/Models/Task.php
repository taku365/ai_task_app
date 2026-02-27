<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Task extends Model
{
    // 論理削除(deleted_atカラム)を使用するためのミックスイン
    // 論理削除:データを物理的に削除せずに、削除フラグを立てることでデータを保持する方法
    use HasFactory, SoftDeletes;

    // テーブル名を指定
    protected $table = 'ai_tasks_T_tasks';

    // フィルタリング対象のカラムを指定
    protected $fillable = [
        'input_text',
        'ai_task',
        'due_date',
        'assignee_id',
        'priority_id',
        'created_by_id',
    ];

    // リレーション:テーブル同士の関係を表すもの
    // $this-> は今のオブジェクト（Taskインスタンス）が持っているメソッドを呼び出す
    // Task = Modelの子クラスなので $this->belongsTo()は Taskインスタンス→Modelクラスにある belongsToメソッドを使う
    // belongsTo(関連モデル::class, 自分側の外部キー, 関連モデルの主キー(省略可))

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function priority()
    {
        return $this->belongsTo(Priority::class, 'priority_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by_id');
    }
}
