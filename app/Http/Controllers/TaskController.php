<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;

use App\Models\Task;
use App\Models\User;
use App\Models\Priority;



class TaskController extends Controller
{
    // 一覧取得(共通化メソッド)
    private function getFilteredTasks(User $currentUser, string $filter, array $searchParams = [])
    {
        // タスク取得用のクエリビルダを作成
        $query = Task::with(['assignee', 'priority', 'createdBy', 'completedBy']);

        // filter の値に応じて検索条件を追加
        switch ($filter) {
            // 自分が担当しているタスク
            case 'self':
                $query->where('assignee_id', $currentUser->id)
                    ->whereNull('completed_at')
                    ->orderBy('created_at', 'desc');
                break;

            // 他メンバーが担当しているタスク
            case 'member':
                $query->where('assignee_id', '!=', $currentUser->id)
                    ->whereNotNull('assignee_id')
                    ->whereNull('completed_at')
                    ->orderBy('created_at', 'desc');
                break;

            // 担当者が未割当のタスク
            case 'unassigned':
                $query->where(function ($q) {
                    $q->whereNull('assignee_id')
                        ->orWhereNull('priority_id')
                        ->orWhereNull('due_date');
                })->whereNull('completed_at')
                    ->orderBy('created_at', 'desc');
                break;

            // 完了済みのタスク
            case 'completed':
                $query->whereNotNull('completed_at')
                    ->orderBy('completed_at', 'desc');
                break;

            // すべて
            case 'all':
                $query->orderBy('created_at', 'desc');
                break;
        }

        // 担当者フィルタ
        if (!empty($searchParams['assignee_id'])) {
            $query->where('assignee_id', $searchParams['assignee_id']);
        }

        // 優先度フィルタ
        if (!empty($searchParams['priority_id'])) {
            $query->where('priority_id', $searchParams['priority_id']);
        }

        // 期限フィルタ
        if (!empty($searchParams['due'])) {
            $today = now()->toDateString();
            $tomorrow = now()->addDay()->toDateString();
            $thisWeekEnd = now()->endOfWeek(0)->toDateString(); // 日曜
            $nextWeekEnd = now()->addWeek()->endOfWeek(0)->toDateString();

            switch ($searchParams['due']) {
                // 期限なし
                case 'none':
                    $query->whereNull('due_date');
                    break;
                // 期限切れ
                case 'overdue':
                    $query->where('due_date', '<', $today)->whereNull('completed_at');
                    break;
                // 今日
                case 'today':
                    $query->whereDate('due_date', $today);
                    break;
                // 明日まで
                case 'tomorrow':
                    $query->whereDate('due_date', '<=', $tomorrow)->whereNotNull('due_date');
                    break;
                // 今週中
                case 'this_week':
                    $query->whereDate('due_date', '<=', $thisWeekEnd)->whereNotNull('due_date');
                    break;
                // 来週中
                case 'next_week':
                    $query->whereDate('due_date', '>', $thisWeekEnd)
                        ->whereDate('due_date', '<=', $nextWeekEnd);
                    break;
            }
        }

        // SQLを実行し、条件に合うタスク一覧を取得して返す
        return $query->get();
    }


    // 一覧取得API : GET /api/tasks
    public function apiIndex(Request $request)
    {
        // ログインユーザーを取得
        $currentUser = Auth::user();
        // URLの ?filter=xxx を取得（未指定なら 'self'）
        $filter = $request->query('filter', 'self');

        // 絞り込みパラメータを取得
        $searchParams = [];

        if ($request->query('assignee_id')) {
            $searchParams['assignee_id'] = $request->query('assignee_id');
        }
        if ($request->query('priority_id')) {
            $searchParams['priority_id'] = $request->query('priority_id');
        }
        if ($request->query('due')) {
            $searchParams['due'] = $request->query('due');
        }

        // 共通化したロジックでタスクを取得
        $tasks = $this->getFilteredTasks($currentUser, $filter, $searchParams);

        // 全ユーザーを取得
        $users = User::select('id', 'name')->get()->sortByDesc(fn($u) => $u->id === $currentUser->id)->values();


        // JSONレスポンスを返す（画面ではなくデータ）
        return response()->json([
            'tasks' => $tasks,
            'filter' => $filter,
            'currentUser' => $currentUser,
            'users' => $users
        ]);
    }


    // 一覧表示(初回表示用) : GET /tasks
    public function index(Request $request)
    {
        $currentUser = Auth::user();
        $filter = $request->query('filter', 'self');
        $tasks = $this->getFilteredTasks($currentUser, $filter);

        // 全ユーザーを取得　sortByDesc() は「指定した条件の結果を基準に降順で並べる」
        $users = User::select('id', 'name')->get()->sortByDesc(fn($u) => $u->id === $currentUser->id)->values();

        // Bladeテンプレートにデータを渡してHTMLを生成
        return view('tasks.index', compact('tasks', 'filter', 'currentUser', 'users'));
    }

    // AI解析 : POST /api/tasks/analyze
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
        $currentUser = Auth::user();

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


    // 新規作成 : POST /api/tasks
    public function createNewTask(Request $request)
    {
        // 1. 入力バリデーション
        $validated = $request->validate([
            // ★ id は不要（新規作成なので）
            'ai_task' => 'required|string|max:500',
            'text_input' => 'required|string|max:500',
            'date' => 'nullable|string',        // "2026年3月1日"または"指定なし"
            'time' => 'nullable|string',
            'assignee' => 'nullable|string', // "松田"または"指定なし"
            'priority' => 'nullable|string', // "高"または"指定なし"
        ]);

        try {
            // ★★★ ログインユーザーを取得
            $currentUser = Auth::user();

            // 3. データ変換 (日付, 担当者, 優先度)
            $dueDate = $this->convertDateStringToDate($validated['date'] ?? null);
            $dueTime = $this->convertTimeStringToTime($validated['time'] ?? null);
            $assigneeId = $this->findUserIdByName($validated['assignee'] ?? null);
            $priorityId = $this->findPriorityIdByName($validated['priority'] ?? null);

            // 4. DB保存（新規作成)
            $task = Task::create([
                'ai_task' => $validated['ai_task'],
                'text_input' => $validated['text_input'],
                'due_date' => $dueDate,
                'due_time' => $dueTime,
                'assignee_id' => $assigneeId,
                'priority_id' => $priorityId,
                'created_by_id' => $currentUser->id, // 作成者を記録
            ]);

            // 5. リレーションを読み込む
            // tasksテーブルには assignee_id / priority_id / created_by_id のIDしか保存されていないため、
            // 担当者・優先度・作成者の情報（名前など）を取得してレスポンスに含める
            $task->load(['assignee', 'priority', 'createdBy']);

            // 6. レスポンス
            return response()->json([
                'success' => true,
                'message' => 'タスクを作成しました',
                'data' => $task
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'タスクの作成に失敗しました: ' . $e->getMessage()
            ], 500);
        }
    }


    // 編集 : PUT /api/tasks/{id}
    public function editTask(Request $request, $id)
    {
        // 1. バリデーション
        $validated = $request->validate([
            'ai_task' => 'required|string|max:500',
            'text_input' => 'required|string|max:500',
            'date' => 'nullable|string',
            'time' => 'nullable|string',
            'assignee' => 'nullable|string',
            'priority' => 'nullable|string',
        ]);

        try {
            // 2. idをもとにタスクを検索(なければ404エラー)
            $task = Task::findOrFail($id);

            // 3. DB更新
            $task->update([
                'ai_task' => $validated['ai_task'],
                'text_input' => $validated['text_input'],
                'due_date' => $this->convertDateStringToDate($validated['date'] ?? null),
                'due_time' => $this->convertTimeStringToTime($validated['time'] ?? null),
                'assignee_id' => $this->findUserIdByName($validated['assignee'] ?? null),
                'priority_id' => $this->findPriorityIdByName($validated['priority'] ?? null),
            ]);

            // 4. リレーションを読み込む
            $task->load(['assignee', 'priority', 'createdBy', 'completedBy']);

            // 5. レスポンス
            return response()->json([
                'success' => true,
                'message' => 'タスクを更新しました',
                'task' => $task
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'タスクの更新に失敗しました: ' . $e->getMessage()
            ], 500);
        }
    }

    // 削除 : DELETE /api/tasks/{id}
    public function destroy($id)
    {
        try {
            // タスクを検索 (なければ404エラー)
            $task = Task::findOrFail($id);

            // タスクを削除 (論理削除)
            $task->delete();

            // 成功レスポンス
            return response()->json([
                'success' => true,
                'message' => 'タスクを削除しました'
            ]);
        } catch (\Exception $e) {
            // エラーレスポンス
            return response()->json([
                'success' => false,
                'message' => 'タスクの削除に失敗しました: ' . $e->getMessage()
            ], 500);
        }
    }

    // 完了 : PATCH /api/tasks/{id}/complete
    public function complete($id)
    {
        try {
            // タスクを検索 (なければ404エラー)
            $task = Task::findOrFail($id);

            $currentUser = Auth::user();

            // DBを更新
            $task->update([
                'completed_flg' => true,
                'completed_at' => now(),
                'completed_by_id' => $currentUser->id
            ]);

            // リレーションを読み込む（フロントで使うため）
            $task->load(['assignee', 'priority', 'createdBy', 'completedBy']);

            // 成功レスポンス
            return response()->json([
                'success' => true,
                'message' => 'タスクを完了しました',
                'task' => $task
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'タスクの完了に失敗しました: ' . $e->getMessage()
            ], 500);
        }
    }

    // タスクを未完了に戻す : PATCH /api/tasks/{id}/uncomplete
    public function uncomplete($id)
    {
        try {
            $task = Task::findOrFail($id);

            // 完了フラグをfalseに戻す
            $task->completed_flg = false;
            $task->completed_at = null;
            $task->completed_by_id = null;
            $task->save();

            // 更新後のタスクをリレーション込みで取得
            $task->load(['assignee', 'priority', 'createdBy']);

            return response()->json([
                'success' => true,
                'message' => 'タスクを未完了に戻しました',
                'task' => $task
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'タスクを未完了に戻す処理に失敗しました: ' . $e->getMessage()
            ], 500);
        }
    }


    // 設定画面 : GET /settings
    public function settings()
    {
        return view('tasks.settings');
    }


    //==============================================================================
    // ヘルパーメソッド (AIが返した文字列をDB保存用フォーマットへ変換) ★★★ Serviceクラスに分離してもいいかも
    //==============================================================================

    // 日付変換(YYYY年MM月DD日 → YYYY-MM-DD)
    private function convertDateStringToDate($dateString)
    {
        // "指定なし" または空なら null
        if (empty($dateString) || $dateString === '指定なし') {
            return null;
        }

        // パターン① "2026年3月1日" 形式（AIが返す形式）
        if (preg_match('/(\d{4})年(\d{1,2})月(\d{1,2})日/', $dateString, $matches)) {
            // sprintf で "2026-03-01" 形式に整形
            return sprintf('%04d-%02d-%02d', $matches[1], $matches[2], $matches[3]);
        }
        // パターン② "2026-03-01" または "2026-03-01 00:00:00" 形式（DBの値をそのまま送った場合）
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $dateString, $matches)) {
            return $matches[1];
        }

        return null;
    }

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


    // 担当者名 → User ID 変換
    private function findUserIdByName($name)
    {
        // "指定なし" の場合は null を返す
        if (empty($name) || $name === '指定なし') {
            return null;
        }

        // 名前でユーザーを検索
        $user = User::where('name', $name)->first();
        return $user ? $user->id : null;
    }

    // 優先度名 → Priority ID 変換
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
}
