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
        $request->validate([
            'text_input' => 'required|string|max:500',
        ]);

        $textInput = $request->input('text_input');

        // 今日の日付情報を取得
        $today = now();
        $weekdays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        $weekday = $weekdays[$today->dayOfWeek];
        $todayString = $today->format('Y年n月j日') . "（{$weekday}）";

        // OpenAI APIに送信するプロンプト
        $systemPrompt = "あなたはタスク管理の専門家です。
        以下の入力テキストから、タスク管理に必要な情報を抽出してください。

        【前提】
        - この入力はログインユーザー本人が行っています
        - 推測や補完は行わず、明示されている情報のみを使用してください
        - 判断できない項目は「指定なし」としてください

        【抽出項目】

        1. 入力内容
        - 入力されたテキストをそのまま出力してください

        2. タスク
        - 入力文の中から「やることの内容」を簡潔に抽出してください

        3. 日付
        - 期限や実施日が明示されている場合のみ抽出してください
        - 緊急度の表現が含まれている場合は日付を「今日」としてください
        - これらの表現と日付が明示されている場合は、日付を優先してください
        - 今日は {$todayString} です
        - 週の定義：月曜日が週の始まり、金曜日が週の終わりです
        - 「今週中」「来週中」はその週の金曜日を期限としてください

        4. 担当者
        - 以下の候補から選んでください
        - ASSIGNEE_LIST = [松本, 野中, 白石, 松波, 宮原, 安岡, 阪本, 松田]
        - 人名が明示されていない場合、または「自分」「私」「俺」などの表現は「あなた」としてください

        5. 優先度
        - 高・中・低 のいずれかで出力してください
        - 判断できない場合は「指定なし」としてください
        - 「なるはや」「至急」「急ぎ」などは優先度「高」としてください

        【出力形式】
        以下のJSON形式で出力してください:
        {
        \"aiTask\": \"タスク名\",
        \"date\": \"yyyy年mm月dd日 または 指定なし\",
        \"assignee\": \"担当者名 または 指定なし\",
        \"priority\": \"高 または 中 または 低 または 指定なし\"
        }";

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

            // AI解析結果をJSONでフロントエンドに返す
            return response()->json([
                'success' => true,
                'data' => $parsedTask,
            ]);
        } catch (\Exception $e) {
            // エラーが発生した場合はエラーを返す
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    // POST /api/tasks タスクを保存するメソッド
    public function store(Request $request) {}


    // ★★★ DELETE /api/tasks/{id} タスクを削除するメソッド

    // ★★★ PATCH /api/tasks/{id}/complete タスクを完了にするメソッド
    // ・完了に日時を記録する
    // ・完了者を記録する
    // ・完了フラグを立てる
}
