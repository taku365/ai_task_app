<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
// Laravelの認証機能を利用するFacade
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;

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
        // バリデーションチェック
        $rules = [
            'name' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:ai_tasks_M_users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];

        $message = [
            'name.required' => 'ユーザー名を入力してください。',
            'name.max' => 'ユーザー名は50文字以内で入力してください。',
            'email.required' => 'メールアドレスを入力してください。',
            'email.email' => '有効なメールアドレスを入力してください。',
            'email.unique' => 'このメールアドレスは既に登録されています。',
            'password.required' => 'パスワードを入力してください。',
            'password.min' => 'パスワードは8文字以上で入力してください。',
            'password.confirmed' => 'パスワードが一致しません。',
        ];

        $validated = $request->validate($rules, $message);

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


    // パスワードリセット申請画面表示
    public function showForgotPasswordForm()
    {
        return view('auth.forgot-password');
    }


    // パスワードリセットメール送信
    public function sendResetLinkEmail(Request $request)
    {
        // メールアドレスのバリデーション
        $request->validate(['email' => 'required|email']);
        // パスワードリセットリンクを送信
        $status = Password::sendResetLink(
            $request->only('email')
        );
        // 送信結果に応じてメッセージを表示
        return $status === Password::RESET_LINK_SENT
            ? back()->with(['status' => 'パスワードリセット用のリンクをメールで送信しました。'])
            : back()->withErrors(['email' => 'このメールアドレスは登録されていません。']);
    }


    // パスワードリセット画面表示
    public function showResetPasswordForm(Request $request, string $token)
    {
        return view('auth.reset-password', [
            'token' => $token,
            'email' => $request->email
        ]);
    }


    // パスワードリセット処理
    public function resetPassword(Request $request)
    {
        // バリデーション
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);
        // パスワードをリセット
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password
                ])->save();
            }
        );
        // リセット結果に応じてリダイレクト
        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', 'パスワードを再設定しました。ログインしてください。')
            : back()->withErrors(['email' => 'パスワードのリセットに失敗しました。']);
    }


    // アカウント編集画面を表示
    public function showAccountForm()
    {
        return view('auth.account');
    }


    // アカウント情報更新処理　
    public function updateAccount(Request $request)
    {
        $user = Auth::user();

        $rules = [
            'name' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:ai_tasks_M_users,email,' . $user->id],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,gif', 'max:2048'],
        ];

        // パスワード変更がある場合のバリデーション
        if ($request->filled('current_password') || $request->filled('password')) {
            $rules['current_password'] = ['required', 'current_password'];
            $rules['password'] = ['required', 'string', 'min:8', 'confirmed', 'different:current_password'];
        }

        // エラーメッセージ
        $message = [
            'current_password.required' => '現在のパスワードを入力してください。',
            'current_password.current_password' => '現在のパスワードが正しくありません。',
            'password.required' => '新しいパスワードを入力してください。',
            'password.min' => '新しいパスワードは:min文字以上で入力してください。',
            'password.confirmed' => 'パスワード確認が一致しません。',
            'password.different' => '現在のパスワードと異なるものを入力してください',
            'name.required' => 'ユーザー名を入力してください。',
            'name.max' => 'ユーザー名は:max文字以内で入力してください。',
            'email.required' => 'メールアドレスを入力してください。',
            'email.email' => '有効なメールアドレスを入力してください。',
            'email.unique' => 'このメールアドレスは既に使用されています。',
            'avatar.image' => 'プロフィール画像は画像ファイルを選択してください。',
            'avatar.mimes' => 'プロフィール画像はjpeg、png、gif形式のみ使用できます。',
            'avatar.max'   => 'プロフィール画像は2MB以下にしてください。',
        ];

        // validate([ フィールド名 => バリデーションルール ]) : フォームの入力がルールを満たすか検証する
        $validated = $request->validate($rules, $message);

        // 名前とメールアドレスを更新
        $user->name = $validated['name'];
        $user->email = $validated['email'];

        // バスワード変更がある場合は更新
        if ($request->filled('password')) {
            $user->password = $validated['password'];
        }

        // プロフィール画像の保存処理
        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $extension = $request->file('avatar')->getClientOriginalExtension();
            $user->avatar = $request->file('avatar')->storeAs('avatars', $user->id . "." . $extension, 'public');
        }

        /** @var \App\Models\User $user */
        $user->save();

        // セッションにメッセージを保存（次の1リクエストだけ使える)
        return back()->with('status', 'アカウント情報を更新しました。');
    }


    // プロフィール画像のアップロード処理
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,gif', 'max:2048'],
        ]);

        $user = Auth::user();

        // 古い画像を削除
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        // アップロードされたアバター画像ファイルを取得
        $file = $request->file('avatar');

        // 拡張子('jpg')を取得
        $extension = $file->getClientOriginalExtension();
        // storage/app/public/avatars/ に保存
        $user->avatar = $file->storeAs(
            'avatars',                                    // 保存フォルダ
            $user->id . '_' . time() . '.' . $extension, // ファイル名
            'public'                                      // ディスク
        );

        /** @var \App\Models\User $user */
        $user->save();

        return response()->json(['message' => 'アバターを更新しました。']);
    }


    // プロフィール画像削除処理
    public function deleteAvatar()
    {
        $user = Auth::user();

        if ($user->avatar) {
            // storage/app/public/avatars/ から画像ファイル本体を削除
            Storage::disk('public')->delete($user->avatar);
            $user->avatar = null;

            /** @var \App\Models\User $user */
            $user->save();
        }

        return response()->json(['message' => 'プロフィール画像を削除しました。']);
    }
}
