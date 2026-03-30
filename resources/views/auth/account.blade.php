@use(Illuminate\Support\Facades\Storage)
@extends('layouts.app')

@section('title', 'アカウント設定')

@section('content')
    <div class="auth-container">
        <div class="auth-content">
            <!-- ヘッダー -->
            <div class="auth-header">
                <a href="{{ route('tasks.settings') }}" class="auth-back-btn">
                    <i class="fas fa-arrow-left"></i>
                </a>
                <h1 class="auth-header-title">アカウント設定</h1>
                <div class="auth-header-spacer"></div>
            </div>

            <!-- フォーム -->
            <form method="POST" action="{{ route('account.update') }}" class="auth-form account-form"
                enctype="multipart/form-data">

                @csrf

                <!-- 成功メッセージ -->
                @if (session('status'))
                    <div class="auth-success">
                        <i class="fas fa-check-circle"></i>
                        <span>{{ session('status') }}</span>
                    </div>
                @endif

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

                <!-- セクション: 基本情報 -->
                <div class="account-section">
                    <h2 class="account-section-title">基本情報</h2>

                    <!-- プロフィール画像 -->
                    <div class="auth-field">
                        <label class="auth-label">
                            <i class="fas fa-camera"></i>
                            <span>プロフィール画像</span>
                        </label>
                        <div class="avatar-preview-wrapper">
                            <div class="avatar-upload-area" onclick="document.getElementById('avatar').click()">
                                @if (Auth::user()->avatar)
                                    <img src="{{ Storage::url(Auth::user()->avatar) }}" class="avatar-preview"
                                        alt="プロフィール画像">
                                @else
                                    <div class="avatar-preview avatar-placeholder">
                                        <i class="fas fa-user"></i>
                                    </div>
                                @endif
                                <div class="avatar-camera-icon">
                                    <i class="fas fa-camera"></i>
                                </div>
                            </div>
                            @if (Auth::user()->avatar)
                                <button type="button" class="avatar-delete-btn" onclick="deleteAvatar()">
                                    <i class="fas fa-trash"></i>
                                    <span>画像を削除</span>
                                </button>
                            @endif
                        </div>
                        <input type="file" id="avatar" name="avatar" class="auth-input"
                            accept="image/jpeg,image/png,image/gif" style="display: none">
                    </div>

                    <!-- ユーザー名 -->
                    <div class="auth-field">
                        <label for="name" class="auth-label">
                            <i class="fas fa-user"></i>
                            <span>ユーザー名</span>
                        </label>
                        <input type="text" id="name" name="name" value="{{ old('name', Auth::user()->name) }}"
                            class="auth-input" placeholder="山田太郎" required maxlength="50">
                    </div>

                    <!-- メールアドレス -->
                    <div class="auth-field">
                        <label for="email" class="auth-label">
                            <i class="fas fa-envelope"></i>
                            <span>メールアドレス</span>
                        </label>
                        <input type="email" id="email" name="email" value="{{ old('email', Auth::user()->email) }}"
                            class="auth-input" placeholder="example@example.com" required>
                    </div>
                </div>

                <!-- セクション: パスワード変更 -->
                <div class="account-section">
                    <h2 class="account-section-title">パスワード変更</h2>
                    <p class="account-section-description">パスワードを変更する場合のみ入力してください</p>

                    <!-- 現在のパスワード -->
                    <div class="auth-field">
                        <label for="current_password" class="auth-label">
                            <i class="fas fa-lock"></i>
                            <span>現在のパスワード</span>
                        </label>
                        <div class="auth-input-wrapper">
                            <input type="password" id="current_password" name="current_password" class="auth-input"
                                placeholder="現在のパスワード">
                            <button type="button" class="password-toggle-btn" onclick="togglePassword('current_password')">
                                <i id="current_password-toggle-icon" class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 新しいパスワード -->
                    <div class="auth-field">
                        <label for="password" class="auth-label">
                            <i class="fas fa-lock"></i>
                            <span>新しいパスワード</span>
                        </label>
                        <div class="auth-input-wrapper">
                            <input type="password" id="password" name="password" class="auth-input" placeholder="8文字以上"
                                minlength="8">
                            <button type="button" class="password-toggle-btn" onclick="togglePassword('password')">
                                <i id="password-toggle-icon" class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <!-- 新しいパスワード（確認） -->
                    <div class="auth-field">
                        <label for="password_confirmation" class="auth-label">
                            <i class="fas fa-lock"></i>
                            <span>新しいパスワード（確認）</span>
                        </label>
                        <div class="auth-input-wrapper">
                            <input type="password" id="password_confirmation" name="password_confirmation"
                                class="auth-input" placeholder="もう一度入力してください" minlength="8">
                            <button type="button" class="password-toggle-btn"
                                onclick="togglePassword('password_confirmation')">
                                <i id="password_confirmation-toggle-icon" class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 保存ボタン -->
                <button type="submit" class="auth-btn primary">
                    <i class="fas fa-save"></i>
                    <span>変更を保存</span>
                </button>
            </form>
        </div>
    </div>
@endsection

<!-- トリミングモーダル -->
<div id="cropModal"
    style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; flex-direction:column; align-items:center; justify-content:center;">
    <div style="background:#fff; border-radius:12px; padding:20px; width:90%; max-width:400px;">
        <h3 style="margin-bottom:16px; text-align:center;">画像を調整</h3>
        <div style="width:100%; height:300px;">
            <img id="cropImage" style="max-width:100%;">
        </div>
        <div style="display:flex; gap:12px; margin-top:16px;">
            <button type="button" onclick="closeCropModal()"
                style="flex:1; padding:12px; border:1px solid #ccc; border-radius:8px; background:#fff; cursor:pointer;">キャンセル</button>
            <button type="button" onclick="applyCrop()"
                style="flex:1; padding:12px; border:none; border-radius:8px; background:#e74c3c; color:#fff; cursor:pointer;">適用</button>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        window.AVATAR_DELETE_URL = '{{ route('account.avatar.delete') }}';
        window.AVATAR_UPLOAD_URL = '{{ route('account.avatar.upload') }}';
    </script>
    <script src="{{ asset('js/auth.js') }}"></script>
@endpush
