# バックエンド実装ガイド - 時間選択機能

## 実装済み（フロントエンド）

✅ 日付選択モーダルに時間ピッカーUI追加
✅ 時間選択・クリア機能
✅ タスク作成・編集時に時間データをAPI送信
✅ タスク一覧で時間表示

---

## 実装が必要な部分（バックエンド）

### 1. データベースマイグレーション

#### ファイル作成
```bash
php artisan make:migration add_due_time_to_tasks_table
```

#### マイグレーション内容
`database/migrations/YYYY_MM_DD_HHMMSS_add_due_time_to_tasks_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_tasks_T_tasks', function (Blueprint $table) {
            $table->time('due_time')->nullable()->after('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('ai_tasks_T_tasks', function (Blueprint $table) {
            $table->dropColumn('due_time');
        });
    }
};
```

#### マイグレーション実行
```bash
php artisan migrate
```

---

### 2. モデル更新

#### ファイル: `app/Models/Task.php`

`$fillable` 配列に `due_time` を追加：

```php
protected $fillable = [
    'text_input',
    'ai_task',
    'due_date',
    'due_time',  // ← 追加
    'assignee_id',
    'priority_id',
    'created_by_id',
    'completed_flg',
    'completed_at',
    'completed_by_id'
];
```

---

### 3. コントローラー更新

#### ファイル: `app/Http/Controllers/TaskController.php`

#### 3-1. 新規作成API（`createNewTask`メソッド）

**バリデーション追加**（237行目付近）：
```php
$validated = $request->validate([
    'ai_task' => 'required|string|max:500',
    'text_input' => 'required|string|max:500',
    'date' => 'nullable|string',
    'time' => 'nullable|string',  // ← 追加
    'assignee' => 'nullable|string',
    'priority' => 'nullable|string',
]);
```

**時間変換処理追加**（251行目付近）：
```php
$dueDate = $this->convertDateStringToDate($validated['date'] ?? null);
$dueTime = $this->convertTimeStringToTime($validated['time'] ?? null);  // ← 追加
$assigneeId = $this->findUserIdByName($validated['assignee'] ?? null);
$priorityId = $this->findPriorityIdByName($validated['priority'] ?? null);
```

**DB保存時に時間を含める**（256行目付近）：
```php
$task = Task::create([
    'ai_task' => $validated['ai_task'],
    'text_input' => $validated['text_input'],
    'due_date' => $dueDate,
    'due_time' => $dueTime,  // ← 追加
    'assignee_id' => $assigneeId,
    'priority_id' => $priorityId,
    'created_by_id' => $currentUser->id,
]);
```

#### 3-2. 編集API（`editTask`メソッド）

**バリデーション追加**（289行目付近）：
```php
$validated = $request->validate([
    'ai_task' => 'required|string|max:500',
    'text_input' => 'required|string|max:500',
    'date' => 'nullable|string',
    'time' => 'nullable|string',  // ← 追加
    'assignee' => 'nullable|string',
    'priority' => 'nullable|string',
]);
```

**DB更新時に時間を含める**（302行目付近）：
```php
$task->update([
    'ai_task' => $validated['ai_task'],
    'text_input' => $validated['text_input'],
    'due_date' => $this->convertDateStringToDate($validated['date'] ?? null),
    'due_time' => $this->convertTimeStringToTime($validated['time'] ?? null),  // ← 追加
    'assignee_id' => $this->findUserIdByName($validated['assignee'] ?? null),
    'priority_id' => $this->findPriorityIdByName($validated['priority'] ?? null),
]);
```

#### 3-3. ヘルパーメソッド追加

**ファイル末尾（437行目付近）に追加**：

```php
// 時間変換 (HH:MM → HH:MM:SS)
private function convertTimeStringToTime($timeString)
{
    // null または空文字の場合
    if (empty($timeString)) {
        return null;
    }

    // "HH:MM" 形式の場合、秒を追加して "HH:MM:SS" にする
    if (preg_match('/^(\d{2}):(\d{2})$/', $timeString, $matches)) {
        return sprintf('%02d:%02d:00', $matches[1], $matches[2]);
    }

    // すでに "HH:MM:SS" 形式の場合はそのまま返す
    if (preg_match('/^(\d{2}):(\d{2}):(\d{2})$/', $timeString)) {
        return $timeString;
    }

    return null;
}
```

---

## 動作確認手順

### 1. マイグレーション実行確認
```bash
php artisan migrate:status
```

### 2. データベース確認
```sql
DESCRIBE ai_tasks_T_tasks;
-- due_time カラムが追加されていることを確認
```

### 3. 動作テスト

#### テスト1: 新規タスク作成（時間あり）
1. 音声入力ボタンをクリック
2. タスク名を入力
3. 期限フィールドをクリック
4. 日付を選択
5. 「時間を選択」をクリック
6. 時と分を選択（例: 11:30）
7. 「保存」をクリック
8. タスク一覧に「2026年3月12日 11:30」と表示されることを確認

#### テスト2: 新規タスク作成（時間なし）
1. 時間を選択せずに保存
2. タスク一覧に時間が表示されないことを確認

#### テスト3: 既存タスク編集
1. 時間ありのタスクをクリック
2. 期限フィールドをクリック
3. 時間ピッカーに既存の時間が表示されることを確認
4. 時間を変更して保存
5. 変更が反映されることを確認

#### テスト4: 時間クリア
1. 時間ありのタスクを編集
2. 時間ピッカーの×ボタンをクリック
3. 保存
4. 時間が削除されることを確認

---

## トラブルシューティング

### エラー: Column 'due_time' not found
→ マイグレーションが実行されていません
```bash
php artisan migrate
```

### エラー: Mass assignment error
→ モデルの `$fillable` に `due_time` を追加してください

### 時間が保存されない
→ コントローラーの `convertTimeStringToTime` メソッドが実装されているか確認

### 時間が表示されない
→ ブラウザのキャッシュをクリアして、JavaScriptファイルを再読み込み
```
Cmd + Shift + R (Mac) / Ctrl + Shift + R (Windows)
```

---

## 次のステップ（フェーズ2: UI変更）

バックエンドの実装が完了したら、次はTodoist風のグループリストUIに変更します。

1. タスクを日付でグループ化
2. グループヘッダーの追加（期限切れ/今日/明日/以降の日付）
3. グループ内で時間順にソート
4. 日付フォーマットの変更（`2026年3月12日` → `3月12日`）

詳細は別途実装します。
