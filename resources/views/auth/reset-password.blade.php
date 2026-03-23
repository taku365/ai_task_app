@extends('layouts.app')

@section('title', 'パスワード再設定')

@section('content')
    <div class="auth-container">
        <div class="auth-content">
            <!-- ヘッダー -->
            <div class="auth-header">
                <a href="{{ route('login') }}" class="auth-back-btn">
                    <i class="fas fa-arrow-left"></i>
                </a>
                <h1 class="auth-header-title">パスワード再設定</h1>
                <div class="auth-header-spacer"></div>
            </div>

            <!-- 説明文 -->
            <div class="auth-description">
                <p>新しいパスワードを設定してください。</p>
            </div>

            <!-- フォーム -->
            <form method="POST" action="{{ route('password.update') }}" class="auth-form">
                @csrf

                <input type="hidden" name="token" value="{{ $token }}">
                <input type="hidden" name="email" value="{{ $email }}">

                <!-- エラーメッセージ -->
                @if ($errors->any())
                    <div class="auth-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <div class="auth-error-content">
                            @foreach ($errors->all() as $error)
                                <p>{{ $error }}</p>
                            @endforeach
                        </div>
                    </div>
                @endif

                <!-- メールアドレス（表示のみ） -->
                <div class="auth-field">
                    <label for="email_display" class="auth-label">
                        <i class="fas fa-envelope"></i>
                        <span>メールアドレス</span>
                    </label>
                    <input type="email" id="email_display" value="{{ $email }}"
                        class="auth-input auth-input-disabled" disabled>
                </div>

                <!-- 新しいパスワード -->
                <div class="auth-field">
                    <label for="password" class="auth-label">
                        <i class="fas fa-lock"></i>
                        <span>新しいパスワード</span>
                    </label>
                    <div class="auth-input-wrapper">
                        <input type="password" id="password" name="password" class="auth-input" placeholder="8文字以上"
                            required minlength="8" autofocus>
                        <button type="button" class="password-toggle-btn" onclick="togglePassword('password')">
                            <i id="password-toggle-icon" class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <!-- パスワード確認 -->
                <div class="auth-field">
                    <label for="password_confirmation" class="auth-label">
                        <i class="fas fa-lock"></i>
                        <span>パスワード（確認）</span>
                    </label>
                    <div class="auth-input-wrapper">
                        <input type="password" id="password_confirmation" name="password_confirmation" class="auth-input"
                            placeholder="もう一度入力してください" required minlength="8">
                        <button type="button" class="password-toggle-btn"
                            onclick="togglePassword('password_confirmation')">
                            <i id="password_confirmation-toggle-icon" class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <!-- 再設定ボタン -->
                <button type="submit" class="auth-btn primary">
                    <i class="fas fa-key"></i>
                    <span>パスワードを再設定</span>
                </button>
            </form>
        </div>
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('js/auth.js') }}"></script>
@endpush
