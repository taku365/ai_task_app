<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TaskController extends Controller
{
    public function index()
    {
        $tasks = [];
        return view('tasks.index', compact('tasks'));
    }

    public function settings()
    {
        return view('tasks.settings');
    }

    public function analyzeTask(Request $request)
    {
        $request->validate([
            'task_input' => 'required|string|max:1000',
        ]);

        $taskInput = $request->input('task_input');

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
        以下の形式で出力してください。

        入力内容：xxx
        タスク：xxx
        日付：yyyy年mm月dd日 または 指定なし
        担当者：xxx
        優先度：高 / 中 / 低 / 指定なし";

        try {
            // OpenAI APIを呼び出し
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt,
                    ],
                    [
                        'role' => 'user',
                        'content' => $taskInput,
                    ],
                ],
            ]);

            if ($response->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'OpenAI APIへのリクエストが失敗しました',
                    'error' => $response->json(),
                ], 500);
            }

            $data = $response->json();

            if (isset($data['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => $data['error']['message'] ?? 'APIエラーが発生しました',
                ], 500);
            }

            $aiResponse = $data['choices'][0]['message']['content'] ?? '';

            // AI応答を解析
            $parsedTask = $this->parseTaskResponse($aiResponse, $taskInput);

            return response()->json([
                'success' => true,
                'data' => $parsedTask,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'エラーが発生しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function parseTaskResponse($responseText, $rawInput)
    {
        // 正規表現でAI応答から情報を抽出
        preg_match('/タスク[：:]\s*(.+)/u', $responseText, $taskMatch);
        preg_match('/日付[：:]\s*(.+)/u', $responseText, $dateMatch);
        preg_match('/担当者[：:]\s*(.+)/u', $responseText, $assigneeMatch);
        preg_match('/優先度[：:]\s*(.+)/u', $responseText, $priorityMatch);

        return [
            'rawInput' => $rawInput,
            'task' => isset($taskMatch[1]) ? trim($taskMatch[1]) : '',
            'date' => isset($dateMatch[1]) ? trim($dateMatch[1]) : '指定なし',
            'assignee' => isset($assigneeMatch[1]) ? trim($assigneeMatch[1]) : '指定なし',
            'priority' => isset($priorityMatch[1]) ? trim($priorityMatch[1]) : '指定なし',
        ];
    }
}
