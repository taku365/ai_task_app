<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

use App\Models\Task;
use App\Models\User;
use App\Models\Priority;

class TaskController extends Controller
{
    // タスク一覧を取得(共通化メソッド)
    private function getFilteredTasks(User $currentUser, string $filter)
    {
        // タスク取得用のクエリビルダを作成
        $query = Task::with(['assignee', 'priority', 'createdBy'])
            ->orderBy('created_at', 'desc');

        // filter の値に応じて検索条件を追加
        switch ($filter) {
            // 自分が担当しているタスク
            case 'self':
                $query->where('assignee_id', $currentUser->id)
                    ->whereNull('completed_at');
                break;

            // 他メンバーが担当しているタスク
            case 'member':
                $query->where('assignee_id', '!=', $currentUser->id)
                    ->whereNotNull('assignee_id')
                    ->whereNull('completed_at');
                break;

            // 担当者が未割当のタスク
            case 'unassigned':
                $query->where(function ($q) {
                    $q->whereNull('assignee_id')
                        ->orWhereNull('priority_id')
                        ->orWhereNull('due_date');
                })->whereNull('completed_at');
                break;

            // 完了済みのタスク
            case 'completed':
                $query->whereNotNull('completed_at');
                break;
        }

        // SQLを実行し、条件に合うタスク一覧を取得して返す
        return $query->get();
    }


    // JSON API方式でタスク一覧を返すAPI用メソッド
    public function apiIndex(Request $request)
    {
        // 仮のログインユーザーを取得
        $currentUser = User::where('email', 'matsuda@example.com')->first();
        // URLの ?filter=xxx を取得（未指定なら 'self'）
        $filter = $request->query('filter', 'self');
        // 共通化したロジックでタスクを取得
        $tasks = $this->getFilteredTasks($currentUser, $filter);

        // JSONレスポンスを返す（画面ではなくデータ）
        return response()->json([
            'tasks' => $tasks,
            'filter' => $filter,
            'currentUser' => $currentUser
        ]);
    }


    // Blade（HTML）でタスク一覧を表示するメソッド
    public function index(Request $request)
    {
        $currentUser = User::where('email', 'matsuda@example.com')->first();
        $filter = $request->query('filter', 'self');
        $tasks = $this->getFilteredTasks($currentUser, $filter);

        // Bladeテンプレートにデータを渡してHTMLを生成
        return view('tasks.index', compact('tasks', 'filter', 'currentUser'));
    }


    public function settings()
    {
        return view('tasks.settings');
    }

    // POST /api/tasks/analyze タスクをAI解析するメソッド
    public function analyzeTask(Request $request)
    {
        // 入力バリデーション
        $request->validate([
            'text_input' => 'required|string|max:500',
        ]);

        // 入力テキストを取得
        $textInput = $request->input('text_input');

        // 今日の日付情報を取得
        $today = now();
        $weekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        $weekday = $weekdays[$today->dayOfWeek];
        $todayString = $today->format('Y年n月j日') . "（{$weekday}）";

        // ★★★ログインユーザーを取得
        $currentUser = User::where('email', 'matsuda@example.com')->first();

        // ★★★ データベースから全ユーザー名を取得
        $userNames = User::pluck('name')->implode(', ');

        // OpenAI APIに送信するプロンプト
        $systemPrompt = <<<PROMPT
            あなたはタスク管理アプリ用の情報抽出器です。
            ユーザー入力から必要情報を抽出し、必ずJSONオブジェクト1つだけを返してください（説明文・コードブロック禁止）。

            【絶対ルール】
            - 推測・補完は禁止。入力に明示された情報のみ使用。
            - 不明な項目は必ず "指定なし"（nullや空文字は使わない）。
            - 出力はJSONのみ。前後に文章を付けない。

            【コンテキスト】
            - 入力者（ログインユーザー）: {$currentUser->name}
            - 今日: {$todayString}
            - 週の定義: 月曜開始、金曜終了

            【抽出ルール】

            1) aiTask
            - 入力文から「やることの内容」を簡潔に抽出してください。

            2) date（yyyy年m月d日 or 指定なし）
            - 優先順位: (A) 明示日付 > (B) 相対表現 > (C) 緊急語
            (A) 明示日付:
            - 「2026年3月10日」「3/10」「2026-03-10」などがあればそれを採用し、yyyy年m月d日に統一
            (B) 相対表現（入力にあれば変換）:
            - 今日 = 今日
            - 明日 = 今日+1日
            - 今週中 / 今週末 = 今週の金曜日
            - 来週中 = 来週の金曜日
            (C) 緊急語:
            - 「至急」「急ぎ」「なるはや」などがあり、日付が明示されていない場合は date="今日"
            - 該当なしは "指定なし"

            3) assignee
            - 担当者候補（この中から選ぶ）: [{$userNames}]
            - 人名がない、または「自分/私/俺」などの表現なら {$currentUser->name}
            - 候補にない名前は "指定なし"

            4) priority
            - 優先度候補: ["高","中","低","指定なし"]
            - 入力に「高/中/低」が明示されていればそれを採用
            - 「至急/急ぎ/なるはや」などは "高"
            - それ以外は "指定なし"
        PROMPT;

        // 処理
        try {
            // OpenAI APIを呼び出し
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-5',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt,
                    ],
                    [
                        'role' => 'user',
                        'content' => $textInput,
                    ],
                ],
                'response_format' => [
                    'type' => 'json_object',
                ],
            ]);

            // HTTPステータスが4xx / 5xx の場合はエラーを返す
            if ($response->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'OpenAI APIへのリクエストが失敗しました',
                    'error' => $response->json(),
                ], 500);
            }

            // APIレスポンス(JSON)をPHP配列として取得
            $data = $response->json();

            // APIレスポンスにエラーが含まれている場合はエラーを返す
            if (isset($data['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => $data['error']['message'] ?? 'APIエラーが発生しました',
                ], 500);
            }

            // OpenAIのレスポンスからAI回答(content)を取得
            $aiResponse = $data['choices'][0]['message']['content'] ?? '';

            // AIが返したJSON文字列をPHP配列に変換
            $parsedTask = json_decode($aiResponse, true);

            // JSON解析エラーが発生した場合はエラーを返す
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'success' => false,
                    'message' => 'JSON解析エラー: ' . json_last_error_msg(),
                ], 500);
            }

            // 入力テキストを解析結果に追加
            $parsedTask['textInput'] = $textInput;


            // 成功時：AI解析結果をJSONでフロントエンドに返す
            return response()->json([
                'success' => true,
                'data' => $parsedTask,
            ]);
        } catch (\Exception $e) {
            // エラー時：エラーが発生した場合はエラーを返す
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    // POST /api/tasks タスクを保存するメソッド
    public function store(Request $request)
    {

        // 1. 入力バリデーション
        $validated = $request->validate([
            'id' => 'nullable|integer', // 編集時のみ存在
            'ai_task' => 'required|string|max:500',
            'text_input' => 'required|string|max:500',
            'date' => 'nullable|string',        // "2026年3月1日"または"指定なし"
            'assignee' => 'nullable|string', // "松田"または"指定なし"
            'priority' => 'nullable|string', // "高"または"指定なし"
        ]);

        try {
            // ★★★ 2. ログインユーザーを取得（created_by_idに使用)
            $currentUser = User::where('email', 'matsuda@example.com')->first();

            // 3. データ変換 (日付, 担当者, 優先度)
            $dueDate = $this->convertDateStringToDate($validated['date'] ?? null);
            $assigneeId = $this->findUserIdByName($validated['assignee'] ?? null);
            $priorityId = $this->findPriorityIdByName($validated['priority'] ?? null);

            // 4. DB保存(新規作成 or 編集)
            if ($request->filled('id')) {
                //既存のタスクを更新
                $task = Task::findOrFail($validated['id']);
                $task->update([
                    'ai_task' => $validated['ai_task'],
                    'text_input' => $validated['text_input'],
                    'due_date' => $dueDate,
                    'assignee_id' => $assigneeId,
                    'priority_id' => $priorityId,
                    // created_by_id は含めない（元の値を保持）
                ]);
            } else {
                $task = Task::create([
                    'ai_task' => $validated['ai_task'],
                    'text_input' => $validated['text_input'],
                    'due_date' => $dueDate,
                    'assignee_id' => $assigneeId,
                    'priority_id' => $priorityId,
                    'created_by_id' => $currentUser->id, //作成者を記録
                ]);
            }
            // 5. リレーションを読み込む
            // tasksテーブルには assignee_id / priority_id / created_by_id のIDしか保存されていないため、
            // 担当者・優先度・作成者の情報（名前など）を取得してレスポンスに含める
            $task->load(['assignee', 'priority', 'createdBy']);

            // 6. 成功レスポンス
            return response()->json([
                'success' => true,
                'message' => 'タスクを保存しました',
                'data' => $task
            ]);
        } catch (\Exception $e) {
            // 7. エラーレスポンス
            return response()->json([
                'success' => false,
                'message' => 'タスクの保存に失敗しました: ' . $e->getMessage()
            ], 500);
        }
    }

    // ヘルパーメソッド1: 日付変換(YYYY年MM月DD日 → YYYY-MM-DD)
    private function convertDateStringToDate($dateString)
    {
        // "指定なし" または空なら null
        if (empty($dateString) || $dateString === '指定なし') {
            return null;
        }

        // "2026年3月1日" から年月日を取得
        if (preg_match('/(\d{4})年(\d{1,2})月(\d{1,2})日/', $dateString, $matches)) {
            // sprintf で "2026-03-01" 形式に整形
            return sprintf('%04d-%02d-%02d', $matches[1], $matches[2], $matches[3]);
        }

        return null;
    }

    // ヘルパーメソッド2: 担当者名 → User ID 変換
    private function findUserIdByName($name)
    {
        // "指定なし" の場合
        if (empty($name) || $name === '指定なし') {
            return null;
        }

        // 名前でユーザーを検索
        $user = User::where('name', $name)->first();
        return $user ? $user->id : null;
    }

    // ヘルパーメソッド3: 優先度名 → Priority ID 変換
    private function findPriorityIdByName($priorityName)
    {
        // "指定なし" の場合
        if (empty($priorityName) || $priorityName === '指定なし') {
            return null;
        }

        // 優先度名で検索
        $priority = Priority::where('name', $priorityName)->first();
        return $priority ? $priority->id : null;
    }


    // ★★★ DELETE /api/tasks/{id} タスクを削除するメソッド

    // ★★★ PATCH /api/tasks/{id}/complete タスクを完了にするメソッド
    // ・完了に日時を記録する
    // ・完了者を記録する
    // ・完了フラグを立てる
}
