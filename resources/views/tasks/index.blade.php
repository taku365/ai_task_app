@extends('layouts.app')

@section('title', 'タスク')

@section('content')
    <!-- メイン画面 -->
    <div class="screen" id="mainScreen">
        <!-- ヘッダー -->
        <div class="header">
            <h1>タスク</h1>
            <div class="header-icons">
                <i class="fas fa-search"></i>
                <i class="fas fa-bell"></i>
            </div>
        </div>

        <!-- フィルタータブ -->
        <div class="filter-tabs">
            <button class="filter-tab active" data-filter="self">自分</button>
            <button class="filter-tab" data-filter="member">メンバー</button>
            <button class="filter-tab" data-filter="unassigned">未割当</button>
            <button class="filter-tab" data-filter="completed">完了済み</button>
        </div>

        <!-- タスクリスト -->
        <div class="task-list-container" id="taskListContainer">
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>タスクがありません</p>
            </div>
        </div>

        <!-- 音声入力ボタン -->
        <button class="voice-input-btn" id="voiceInputBtn">
            <i class="fas fa-microphone"></i>
        </button>

        <!-- ボトムナビ -->
        <div class="bottom-nav">
            <a href="{{ route('tasks.index') }}" class="nav-item active" id="taskNavBtn">
                <i class="fas fa-clipboard-list"></i>
                <span>タスク</span>
            </a>
            <a href="{{ route('tasks.settings') }}" class="nav-item" id="settingsNavBtn">
                <i class="fas fa-cog"></i>
                <span>設定</span>
            </a>
        </div>
    </div>

    <!-- 入力モーダル -->
    <div class="modal" id="inputModal">
        <div class="modal-content">
            <div class="input-modal-header">
                <h2>タスクを入力</h2>
                <button class="close-btn" id="closeInputModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="input-area">
                <textarea id="taskInput" placeholder="例: 明日までに白石くんに報告書を提出"></textarea>
            </div>
            <button class="submit-btn" id="submitTask">解析して保存</button>
        </div>
    </div>

    <!-- タスク詳細モーダル -->
    <div class="modal" id="taskDetailModal">
        <div class="modal-content">
            <div class="task-detail-header">
                <button class="close-btn" id="closeTaskDetailModal">
                    <i class="fas fa-times"></i>
                </button>
                <button class="delete-btn" id="deleteTaskBtn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="task-detail-content">
                <div class="task-detail-title">
                    <div class="task-checkbox" id="detailCheckbox"></div>
                    <input type="text" id="detailTaskTitle" value="" placeholder="タスクを入力してください" />
                </div>

                <div class="detail-field" id="dateField">
                    <div class="detail-field-label">
                        <i class="fas fa-calendar"></i>
                        <span>期限</span>
                    </div>
                    <div class="detail-field-value" id="detailDate">2026/02/04</div>
                </div>

                <div class="detail-field" id="assigneeField">
                    <div class="detail-field-label">
                        <i class="fas fa-user"></i>
                        <span>担当者</span>
                    </div>
                    <div class="detail-field-value" id="detailAssignee">あなた</div>
                </div>

                <div class="detail-field">
                    <div class="detail-field-label">
                        <i class="fas fa-flag"></i>
                        <span>優先度</span>
                    </div>
                    <div class="priority-buttons">
                        <button class="priority-btn" data-priority="高">高</button>
                        <button class="priority-btn" data-priority="中">中</button>
                        <button class="priority-btn" data-priority="低">低</button>
                    </div>
                </div>
            </div>

            <div class="task-detail-actions">
                <button class="complete-btn" id="completeTaskBtn">完了にする</button>
                <button class="save-btn" id="saveTaskBtn">保存</button>
            </div>
        </div>
    </div>

    <!-- メンバー選択モーダル -->
    <div class="modal" id="memberSelectModal">
        <div class="modal-content">
            <div class="member-select-header">
                <h2>メンバーを選択</h2>
                <button class="close-btn" id="closeMemberModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="memberSearch" placeholder="名前で検索..." />
            </div>
            <div class="member-list" id="memberList">
                <!-- メンバーリストはJSで生成 -->
            </div>
            <div class="member-select-actions">
                <button class="clear-btn" id="clearMemberBtn">クリア</button>
                <button class="apply-btn" id="applyMemberBtn">適用する</button>
            </div>
        </div>
    </div>

    <!-- 日付選択モーダル -->
    <div class="modal" id="dateSelectModal">
        <div class="modal-content">
            <div class="date-select-header">
                <button class="close-btn" id="closeDateModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- ショートカットボタン -->
            <div class="date-shortcuts">
                <button class="shortcut-btn" id="todayBtn">
                    <i class="fas fa-sun"></i>
                    <span>今日</span>
                </button>
                <button class="shortcut-btn" id="tomorrowBtn">
                    <i class="fas fa-arrow-up"></i>
                    <span>明日</span>
                </button>
                <button class="shortcut-btn" id="weekendBtn">
                    <i class="fas fa-car"></i>
                    <span>週末</span>
                </button>
                <button class="shortcut-btn" id="nextWeekBtn">
                    <i class="fas fa-calendar"></i>
                    <span>来週</span>
                </button>
            </div>

            <!-- カレンダーヘッダー -->
            <div class="calendar-header">
                <button class="month-nav" id="prevMonth">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="current-month" id="currentMonth">2024年 2月</span>
                <button class="month-nav" id="nextMonth">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <!-- カレンダー -->
            <div class="calendar-container">
                <div class="calendar-weekdays">
                    <div class="weekday sunday">日</div>
                    <div class="weekday">月</div>
                    <div class="weekday">火</div>
                    <div class="weekday">水</div>
                    <div class="weekday">木</div>
                    <div class="weekday">金</div>
                    <div class="weekday saturday">土</div>
                </div>
                <div class="calendar-grid" id="calendarGrid">
                    <!-- 日付セルはJSで生成 -->
                </div>
            </div>

            <!-- アクション -->
            <div class="date-select-actions">
                <button class="time-btn" id="timeBtn">
                    <i class="far fa-clock"></i>
                    <span>時間を選択</span>
                </button>
                <button class="clear-date-btn" id="clearDateBtn">クリア</button>
                <button class="save-date-btn" id="saveDateBtn">保存</button>
            </div>
        </div>
    </div>

    <!-- アラートモーダル -->
    <div class="alert-modal" id="alertModal">
        <div class="alert-modal-content">
            <div class="alert-icon" id="alertIcon">
                <i class="fas fa-user" id="alertIconContent"></i>
            </div>
            <div class="alert-title" id="alertTitle">他メンバーのタスクです</div>
            <div class="alert-message" id="alertMessage">
                このタスクは<strong>田中美咲</strong>さんに割り当てられています。完了にしてもよろしいですか?
            </div>
            <div class="alert-actions">
                <button class="alert-btn cancel" id="alertCancelBtn">キャンセル</button>
                <button class="alert-btn confirm" id="alertConfirmBtn">完了にする</button>
            </div>
        </div>
    </div>
@endsection
