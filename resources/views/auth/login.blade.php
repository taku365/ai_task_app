@extends('layouts.app')

@section('title', 'ログイン')

@section('content')
    <div class="auth-container">
        <div class="auth-content">
            <!-- ロゴエリア -->
            <div class="auth-logo">
                <div class="auth-logo-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h1 class="auth-logo-title">タスク管理</h1>
                <p class="auth-logo-subtitle">AIタスク管理アプリ</p>
            </div>

            <!-- ログインフォーム -->
            <form method="POST" action="#" class="auth-form">
                <!-- メールアドレス -->
                <div class="auth-field">
                    <label for="email" class="auth-label">
                        <i class="fas fa-envelope"></i>
                        <span>メールアドレス</span>
                    </label>
                    <input type="email" id="email" name="email" 
                           class="auth-input" placeholder="example@example.com" required autofocus>
                </div>

                <!-- パスワード -->
                <div class="auth-field">
                    <label for="password" class="auth-label">
                        <i class="fas fa-lock"></i>
                        <span>パスワード</span>
                    </label>
                    <input type="password" id="password" name="password" 
                           class="auth-input" placeholder="8文字以上" required>
                </div>

                <!-- ログイン状態を保持 -->
                <div class="auth-checkbox">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">ログイン状態を保持</label>
                </div>

                <!-- ログインボタン -->
                <button type="submit" class="auth-btn primary">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>ログイン</span>
                </button>

                <!-- パスワードを忘れた方 -->
                <div class="auth-link-container">
                    <a href="#" class="auth-link">
                        パスワードを忘れた方
                    </a>
                </div>

                <!-- 区切り線 -->
                <div class="auth-divider">
                    <span>または</span>
                </div>

                <!-- 新規登録リンク -->
                <div class="auth-footer">
                    <p>アカウントをお持ちでない方</p>
                    <a href="#" class="auth-link-primary">
                        新規登録はこちら
                    </a>
                </div>
            </form>
        </div>
    </div>
@endsection
