@extends('layouts.app')

@section('title', '設定')

@section('content')
    <!-- 設定画面 -->
    <div class="settings-screen active">
        <div class="settings-header">
            <h1>設定</h1>
        </div>

        <div class="settings-content">
            <div class="settings-section">
                <a href="{{ route('account.edit') }}" class="settings-item">
                    <div class="settings-item-icon account">
                        @if (Auth::user()->avatar)
                            <img src="{{ Storage::url(Auth::user()->avatar) }}" class="settings-avatar" alt="プロフィール画像">
                        @else
                            <i class="fas fa-user"></i>
                        @endif
                    </div>
                    <div class="settings-item-content">
                        <div class="settings-item-title">アカウント</div>
                        <div class="settings-item-subtitle">{{ Auth::user()->email }}</div>
                    </div>
                    <div class="settings-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </a>
            </div>

            <div class="settings-section">
                <div class="settings-item">
                    <div class="settings-item-icon general">
                        <i class="fas fa-cog"></i>
                    </div>
                    <div class="settings-item-content">
                        <div class="settings-item-title">一般設定</div>
                    </div>
                    <div class="settings-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="settings-item">
                    <div class="settings-item-icon notification">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="settings-item-content">
                        <div class="settings-item-title">通知</div>
                    </div>
                    <div class="settings-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <form method="POST" action="{{ route('logout') }}" id="logoutForm">
                    @csrf
                    <div class="settings-item" onclick="document.getElementById('logoutForm').submit();">
                        <div class="settings-item-icon logout">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                        <div class="settings-item-content">
                            <div class="settings-item-title">ログアウト</div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="settings-footer">
                <div class="app-version">VoiceTask v1.0.0</div>
                <div class="app-description">音声でタスクを管理</div>
            </div>
        </div>

        <!-- ボトムナビ -->
        <div class="bottom-nav">
            <a href="{{ route('tasks.index') }}" class="nav-item" id="taskNavBtnSettings">
                <i class="fas fa-clipboard-list"></i>
                <span>タスク</span>
            </a>
            <a href="{{ route('tasks.settings') }}" class="nav-item active" id="settingsNavBtnActive">
                <i class="fas fa-cog"></i>
                <span>設定</span>
            </a>
        </div>
    </div>
@endsection
