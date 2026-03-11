<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
// Laravelの認証機能を利用するFacade
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    // ログイン画面を表示するメソッド
    public function showLoginForm()
    {
        return view('auth.login');
    }

    // ログイン処理を行うメソッド
    public function login(Request $request)
    {
        // バリデーションチェック（入力チェック）
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        // チェックボックスの値を取得（ON なら true)
        $remember = $request->boolean('remember');

        // ログイン試行
        // Auth::attempt() : データベースのユーザー情報とメールアドレスとパスワード（ハッシュ化）が一致していたらtrueを返す
        // 第二引数に true / falseを指定することで、ログイン情報を保持するかどうかを指定できる
        if (Auth::attempt($credentials, $remember)) {
            // ログイン成功
            // session()->regenerate() : セッションIDを再生成する（セキュリティ対策）
            $request->session()->regenerate();
            // intended() : 元々アクセスしようとしていたページに移動（なければ /(トップページ) に移動）
            return redirect()->intended('/');
        }

        // ログイン失敗
        // back() : 前のページにリダイレクト
        // withErrors() : エラーメッセージをセッションに保存
        // onlyInput('email') : メールアドレスだけ入力を保持
        return back()->withErrors([
            'email' => 'メールアドレスまたはパスワードが正しくありません。',
        ])->onlyInput('email');
    }


    // ログアウト処理を行うメソッド
    public function logout(Request $request)
    {
        // ログアウト
        Auth::logout();

        // ログイン情報等のセッションデータを無効化
        $request->session()->invalidate();

        // CSRF トークンを再生成
        $request->session()->regenerateToken();

        // ログイン画面にリダイレクト
        return redirect()->route('login');
    }


    // 新規登録画面を表示するメソッド
    public function showRegisterForm()
    {
        return view('auth.register');
    }

    // 新規登録処理を行うメソッド
    public function register(Request $request)
    {
        // バリデーションチェック（入力チェック）
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:ai_tasks_M_users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        // ユーザーを作成
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'active_flg' => true,
        ]);

        // 作成したユーザーで自動ログイン
        Auth::login($user);

        // トップページにリダイレクト
        return redirect()->route('tasks.index');
    }
}
