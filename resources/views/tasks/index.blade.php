@extends('layouts.app')

@section('title', 'タスク')

@section('content')
    <!-- メイン画面 -->
    <div class="screen" id="mainScreen">
        <!-- ヘッダー -->
        <div class="header">
            <div class="header-top">
                <h1>タスク</h1>
                <div class="header-icons">
                    <i class="fas fa-search" id="searchFilterToggleBtn"></i>
                    <i class="fas fa-bell"></i>
                </div>
            </div>
        </div>


        @php
            $currentFilter = request()->query('filter', 'self');
        @endphp

        <!-- フィルタータブ -->
        <div class="filter-tabs" data-filter="{{ $currentFilter }}">
            <button class="filter-tab {{ $currentFilter === 'self' ? 'active' : '' }}" data-filter="self">自分</button>
            <button class="filter-tab {{ $currentFilter === 'member' ? 'active' : '' }}" data-filter="member">メンバー</button>
            <button class="filter-tab {{ $currentFilter === 'unassigned' ? 'active' : '' }}"
                data-filter="unassigned">未割当</button>
            <button class="filter-tab {{ $currentFilter === 'completed' ? 'active' : '' }}"
                data-filter="completed">完了</button>
            <button class="filter-tab {{ $currentFilter === 'all' ? 'active' : '' }}" data-filter="all">すべて</button>
        </div>

        <!-- フィルターパネル（折りたたみ） -->
        <div class="search-filter-panel" id="searchFilterPanel">
            <div class="search-filter-panel-inner">
                <select class="search-filter-select" id="searchAssigneeFilter">
                    <option value="">担当者</option>
                </select>
                <select class="search-filter-select" id="searchPriorityFilter">
                    <option value="">優先度</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                    <option value="none">指定なし</option>
                </select>
                <select class="search-filter-select" id="searchDueFilter">
                    <option value="">期限</option>
                    <option value="today">今日</option>
                    <option value="tomorrow">明日まで</option>
                    <option value="this_week">今週中</option>
                    <option value="next_week">来週中</option>
                    <option value="overdue">期限切れ</option>
                    <option value="none">期限なし</option>
                </select>
            </div>
        </div>



        <!-- タスクリスト -->
        <div class="task-list-container" id="taskListContainer">
            {{-- $tasks が空かどうかを判定 --}}
            @if ($tasks->isEmpty())
                {{-- タスクが1件もない場合の表示 --}}
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>タスクがありません</p>
                </div>
            @else
                {{-- $tasks（コレクション）から1件ずつ $task として取り出す --}}
                @foreach ($tasks as $task)
                    {{-- 1つのタスク全体のコンテナクリックすると editTask(タスクID) をJSに渡す --}}
                    <div class="task-item" onclick="editTask({{ $task->id }})">
                        <div class="task-item-top">
                            {{-- 優先度があればclass="priority-優先度名" を追加（例: priority-high） --}}
                            <div class="task-checkbox priority-{{ $task->priority->code ?? 'none' }}">
                            </div>
                            {{-- タスクのタイトル（ai_taskカラム）を表示 --}}
                            <div class="task-title">
                                {{ $task->ai_task }}
                            </div>
                        </div>
                        <div class="task-meta">
                            {{-- 期限表示エリア --}}
                            <div class="task-meta-item">
                                <i class="far fa-calendar"></i>
                                {{-- 期限があれば日付フォーマットして表示なければ「指定なし」 --}}
                                <span>
                                    {{ $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('Y年n月j日') : '指定なし' }}
                                </span>
                            </div>

                            {{-- 担当者表示エリア --}}
                            <div class="task-meta-item">
                                <i class="far fa-user"></i>
                                <span>
                                    {{-- 担当者が存在する場合 --}}
                                    @if ($task->assignee)
                                        {{ $task->assignee->name }}
                                    @else
                                        {{-- 担当者がいない場合 --}}
                                        未割当
                                    @endif
                                </span>
                            </div>

                            {{-- 優先度表示エリア --}}
                            {{-- 優先度に応じたCSSクラスを追加 --}}
                            <div class="task-meta-item priority-{{ $task->priority->code ?? 'none' }}">
                                <i class="fas fa-flag"></i>
                                {{-- 優先度名があれば表示なければ「指定なし」 --}}
                                <span>
                                    {{ $task->priority->name ?? '指定なし' }}
                                </span>
                            </div>
                        </div>
                    </div>
                @endforeach
            @endif
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
                    <input type="text" id="textInputField" value="" placeholder="タスクを入力してください" />
                </div>

                <div class="detail-field" id="dateField">
                    <div class="detail-field-label">
                        <i class="fas fa-calendar"></i>
                        <span>期限</span>
                    </div>
                    <div class="detail-field-value" id="detailDate">指定なし</div>
                </div>

                <div class="detail-field" id="assigneeField">
                    <div class="detail-field-label">
                        <i class="fas fa-user"></i>
                        <span>担当者</span>
                    </div>
                    <div class="detail-field-value" id="detailAssignee">{{ $currentUser->name }}</div>
                </div>

                <div class="detail-field" id="priorityField">
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

            <!-- 時間選択エリア（初期非表示） -->
            <div class="time-picker-container" id="timePickerContainer" style="display: none;">
                <div class="time-picker-header">
                    <span>時間を選択</span>
                    <button class="time-clear-btn" id="timeClearBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="time-picker-selectors">
                    <div class="time-selector">
                        <label>時</label>
                        <select id="hourSelect" class="time-select">
                            <option value="">--</option>
                        </select>
                    </div>
                    <div class="time-separator">:</div>
                    <div class="time-selector">
                        <label>分</label>
                        <select id="minuteSelect" class="time-select">
                            <option value="">--</option>
                            <option value="00">00</option>
                            <option value="15">15</option>
                            <option value="30">30</option>
                            <option value="45">45</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- アクション -->
            <div class="date-select-actions">
                <button class="time-btn" id="timeBtn">
                    <i class="far fa-clock"></i>
                    <span id="timeBtnText">時間を選択</span>
                </button>
                <button class="clear-date-btn" id="clearDateBtn">クリア</button>
                <button class="save-date-btn" id="saveDateBtn">保存</button>
            </div>
        </div>
    </div>

    <!-- 削除確認モーダル -->
    <div class="confirm-modal" id="deleteConfirmModal">
        <div class="confirm-modal-content">
            <p class="confirm-modal-message">このタスクを削除しますか？</p>
            <div class="confirm-modal-actions">
                <button class="confirm-modal-btn cancel" id="deleteConfirmCancelBtn">キャンセル</button>
                <button class="confirm-modal-btn delete" id="deleteConfirmOkBtn">削除する</button>
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
    @push('scripts')
        <script>
            window.CURRENT_USER = @json($currentUser->name);
            window.MEMBERS = @json($users->map(fn($u) => ['id' => $u->id, 'name' => $u->name]));
        </script>
        <script src="{{ asset('js/tasks.js') }}"></script>
    @endpush
@endsection
