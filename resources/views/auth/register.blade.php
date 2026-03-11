@extends('layouts.app')

@section('title', '新規登録')

@section('content')
    <div class="auth-container">
        <div class="auth-content">
            <!-- ヘッダー -->
            <div class="auth-header">
                <h1 class="auth-header-title">新規登録</h1>
                <div class="auth-header-spacer"></div>
            </div>

            <!-- 登録フォーム -->
            <form method="POST" action="#" class="auth-form">
                <!-- ユーザー名 -->
                <div class="auth-field">
                    <label for="name" class="auth-label">
                        <i class="fas fa-user"></i>
                        <span>ユーザー名</span>
                    </label>
                    <input type="text" id="name" name="name" class="auth-input" placeholder="山田太郎" required
                        autofocus maxlength="50">
                </div>

                <!-- メールアドレス -->
                <div class="auth-field">
                    <label for="email" class="auth-label">
                        <i class="fas fa-envelope"></i>
                        <span>メールアドレス</span>
                    </label>
                    <input type="email" id="email" name="email" class="auth-input" placeholder="example@example.com"
                        required>
                </div>

                <!-- パスワード -->
                <div class="auth-field">
                    <label for="password" class="auth-label">
                        <i class="fas fa-lock"></i>
                        <span>パスワード</span>
                    </label>
                    <input type="password" id="password" name="password" class="auth-input" placeholder="8文字以上" required
                        minlength="8">
                    <p class="auth-field-hint">8文字以上で入力してください</p>
                </div>

                <!-- パスワード確認 -->
                <div class="auth-field">
                    <label for="password_confirmation" class="auth-label">
                        <i class="fas fa-lock"></i>
                        <span>パスワード（確認）</span>
                    </label>
                    <input type="password" id="password_confirmation" name="password_confirmation" class="auth-input"
                        placeholder="もう一度入力してください" required minlength="8">
                </div>

                <!-- 登録ボタン -->
                <button type="submit" class="auth-btn primary">
                    <i class="fas fa-user-plus"></i>
                    <span>登録する</span>
                </button>

                <!-- ログインリンク -->
                <div class="auth-footer">
                    <p>すでにアカウントをお持ちの方</p>
                    <a href="{{ route('login') }}" class="auth-link-primary">
                        ログインはこちら
                    </a>
                </div>
            </form>
        </div>
    </div>
@endsection
