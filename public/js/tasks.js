//==============================================================================
// 0. 設定（定数）
//==============================================================================

/** タスク担当者として選択可能なメンバーリスト */
let MEMBERS = window.MEMBERS || [];
/** 現在のログインユーザー名 */
let CURRENT_USER = window.CURRENT_USER || "";

/** LaravelのCSRF保護用トークン */
const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");

//==============================================================================
// 1. グローバルState（画面/選択状態）
//==============================================================================

/**
 * 現在適用中のフィルター種別
 * @type {string} "self" | "member" | "unassigned" | "completed"
 */
let currentFilter = "self";

/**
 * 現在編集中のタスクオブジェクト
 * nullの場合はタスクが選択されていないことを示す
 * @type {Object|null}
 */
let currentTask = null;

/** タスク詳細モーダルを開いた時点のタスクのスナップショット（変更検知・元の担当者判定に使用） */
let snapshotTask = null;

/**
 * メンバー選択モーダルで現在選択されているメンバーID
 * @type {number|null}
 */
let selectedMember = null;

/**
 * 現在表示中のタスクリスト（フィルター適用後）
 * @type {Array<Object>}
 */
let currentTaskList = [];

/**
 * 日付選択モーダルで選択された日付
 * @type {Date|null}
 */
let selectedDate = null;

/**
 * 日付選択モーダルで選択された時間
 * @type {string|null} "HH:MM" 形式 (例: "11:30") または null
 */
let selectedTime = null;

/**
 * カレンダー表示中の年
 * @type {number}
 */
let currentYear = new Date().getFullYear();

/**
 * カレンダー表示中の月（0-11）
 * @type {number}
 */
let currentMonth = new Date().getMonth();

/**
 * アラートモーダルの確認ボタン押下時に実行されるコールバック関数
 * @type {Function|null}
 */
let alertCallback = null;

/**
 * モーダルがロックされているかどうか
 * @type {boolean}
 */
let isModalLocked = false;

//==============================================================================
// 2. ユーティリティ（共通関数）
//==============================================================================

/**
 * データベースの日付形式を日本語の年月日形式に変換
 * @param {string|null} dateString - YYYY-MM-DD HH:MM:SS形式の日付文字列
 * @returns {string} MM月DD日形式の文字列、またはnullの場合は「指定なし」
 */
function formatDate(dateString) {
    if (!dateString) return "指定なし";

    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}月${day}日`;
}

/**
 * XSS対策用のHTMLエスケープ
 * ユーザー入力をHTMLエンティティに変換し、安全にinnerHTMLへ挿入可能にする
 * @param {string} text - エスケープ対象の文字列
 * @returns {string} HTMLエスケープされた文字列
 */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/**
 * タスク一覧コンテナにエラーメッセージを表示
 * @param {string} message - 表示するエラーメッセージ
 */
function showErrorMessage(message) {
    const container = document.getElementById("taskListContainer");
    if (!container) return;

    container.innerHTML = `<div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${escapeHtml(message)}</p>
    </div>`;
}

/**
 * タスクを日付でグループ化
 * @param {Array<Object>} tasks - タスクの配列
 * @returns {Array<Object>} グループ化されたタスク配列
 */
function groupTasksByDate(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // グループを作成
    const groups = {
        overdue: [], // 期限切れ
        today: [], // 今日
        tomorrow: [], // 明日
        future: {}, // 以降の日付（日付ごとに分けたいためオブジェクト）
        noDate: [], // 期限なし
    };

    tasks.forEach((task) => {
        if (!task.dueDate || task.date === "指定なし") {
            groups.noDate.push(task);
            return;
        }

        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);

        if (taskDate < today) {
            // 期限切れ
            groups.overdue.push(task);
        } else if (taskDate.getTime() === today.getTime()) {
            // 今日
            groups.today.push(task);
        } else if (taskDate.getTime() === tomorrow.getTime()) {
            // 明日
            groups.tomorrow.push(task);
        } else {
            // 以降の日付 (YYYY-MM-DD形式の文字列)
            // const dateKey = taskDate.toISOString().split("T")[0]; // UTC基準になる可能性があるため使用しない
            // ローカル時間で YYYY-MM-DD を作成する
            const dateKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, "0")}-${String(taskDate.getDate()).padStart(2, "0")}`;

            // その日付の箱がなければ作って、そこにタスクを入れる
            if (!groups.future[dateKey]) {
                groups.future[dateKey] = [];
            }
            groups.future[dateKey].push(task);
        }
    });

    // グループ内でソート
    groups.overdue = sortTasksWithinGroup(groups.overdue, true); // 期限切れは古い順
    groups.today = sortTasksWithinGroup(groups.today);
    groups.tomorrow = sortTasksWithinGroup(groups.tomorrow);

    // 結果を配列に変換
    const result = [];

    // 期限切れ
    if (groups.overdue.length > 0) {
        result.push({
            type: "overdue",
            headerText: "期限切れ",
            tasks: groups.overdue,
        });
    }

    // 今日
    if (groups.today.length > 0) {
        result.push({
            type: "today",
            headerText: formatDateHeader(today, "today"),
            tasks: groups.today,
        });
    }

    // 明日
    if (groups.tomorrow.length > 0) {
        result.push({
            type: "tomorrow",
            headerText: formatDateHeader(tomorrow, "tomorrow"),
            tasks: groups.tomorrow,
        });
    }

    // 以降の日付（昇順）
    const futureDates = Object.keys(groups.future).sort();
    futureDates.forEach((dateKey) => {
        const date = new Date(dateKey);
        result.push({
            type: "future",
            headerText: formatDateHeader(date, "future"),
            tasks: sortTasksWithinGroup(groups.future[dateKey]),
        });
    });

    // 期限なし
    if (groups.noDate.length > 0) {
        result.push({
            type: "noDate",
            headerText: "期限なし",
            tasks: sortTasksWithinGroup(groups.noDate),
        });
    }

    return result;
}

/**
 * 日付ヘッダーのフォーマット
 * @param {Date} date - 日付オブジェクト
 * @param {string} type - グループタイプ ('today', 'tomorrow', 'future')
 * @returns {string} フォーマットされた日付ヘッダー文字列
 */
function formatDateHeader(date, type) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = [
        "日曜日",
        "月曜日",
        "火曜日",
        "水曜日",
        "木曜日",
        "金曜日",
        "土曜日",
    ];
    const weekday = weekdays[date.getDay()];

    let header = `${month}月${day}日`;

    if (type === "today") {
        header += "・今日";
    } else if (type === "tomorrow") {
        header += "・明日";
    }

    header += `・${weekday}`;

    return header;
}

/**
 * グループ内のタスクをソート
 * @param {Array<Object>} tasks - タスクの配列
 * @param {boolean} oldestFirst - 期限切れグループ用（古い順）
 * @returns {Array<Object>} ソートされたタスク配列
 */
function sortTasksWithinGroup(tasks, oldestFirst = false) {
    return tasks.sort((a, b) => {
        if (oldestFirst && a.dueDate && b.dueDate) {
            const aDate = new Date(a.dueDate);
            aDate.setHours(0, 0, 0, 0);
            const bDate = new Date(b.dueDate);
            bDate.setHours(0, 0, 0, 0);

            // ① 日付が違う → 古い順
            if (aDate.getTime() !== bDate.getTime()) {
                return aDate - bDate;
            }
            // ② 同じ日付内 → 時間ありを先に、時間順（古い順）
            const aHasTime = !!a.time;
            const bHasTime = !!b.time;
            if (aHasTime && !bHasTime) return -1;
            if (!aHasTime && bHasTime) return 1;
            if (aHasTime && bHasTime) {
                return a.time.localeCompare(b.time);
            }
            return 0;
        }
    });
}

/**
 * タスクの日付表示をフォーマット（グループ化表示用）
 * @param {Object} task - タスクオブジェクト
 * @param {string} groupType - グループタイプ
 * @returns {string} フォーマットされた日付文字列
 */
function formatTaskDateInGroup(task, groupType) {
    if (!task.dueDate) return "期限なし";

    const taskDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 期限切れグループの場合
    if (groupType === "overdue") {
        taskDate.setHours(0, 0, 0, 0);

        // 昨日かどうかチェック
        if (taskDate.getTime() === yesterday.getTime()) {
            return task.time ? `昨日 ${task.time}` : "昨日";
        }

        // それ以外は M月D日 形式
        const month = taskDate.getMonth() + 1;
        const day = taskDate.getDate();
        return task.time
            ? `${month}月${day}日 ${task.time}`
            : `${month}月${day}日`;
    }

    const month = taskDate.getMonth() + 1;
    const day = taskDate.getDate();
    return task.time ? `${month}月${day}日 ${task.time}` : `${month}月${day}日`;
}

/**
 * タスク一覧を再描画する共通関数
 * @param {Array<Object>} tasks - 表示するタスクの配列
 * @param {string} filter - 現在のフィルター
 */
function renderTaskList(tasks, filter) {
    const container = document.getElementById("taskListContainer");

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>タスクがありません</p>
            </div>
        `;
        return;
    }

    const isCompleted = filter === "completed";

    // self, member, unassigned フィルタの場合は日付でグループ化
    if (filter === "self" || filter === "member" || filter === "unassigned") {
        const groupedTasks = groupTasksByDate(tasks);

        container.innerHTML = groupedTasks
            .map((group) => {
                const header = `<div class="date-group-header">${group.headerText}</div>`;
                const taskItems = group.tasks
                    .map((task) =>
                        renderTaskItem(task, isCompleted, group.type),
                    )
                    .join("");
                return header + taskItems;
            })
            .join("");
    } else if (filter === "completed") {
        container.innerHTML = tasks
            .map((task) => renderTaskItem(task, true))
            .join("");
    } else {
        container.innerHTML = tasks
            .map((task) => renderTaskItem(task, task.completedFlg))
            .join("");
    }
}

/**
 * Laravel APIから返されたDB形式のタスクをフロントエンド形式に変換
 * @param {Object} dbTask - データベース形式のタスクオブジェクト
 * @returns {Object} フロントエンド表示用に変換されたタスクオブジェクト
 */
function transformTaskData(dbTask) {
    return {
        id: dbTask.id,
        aiTask: dbTask.ai_task,
        textInput: dbTask.text_input,
        dueDate: dbTask.due_date,
        date: formatDate(dbTask.due_date),
        time: dbTask.due_time ? dbTask.due_time.substring(0, 5) : null,
        assignee: dbTask.assignee?.name || "指定なし",
        priority: dbTask.priority?.name || "指定なし",
        priorityCode: dbTask.priority?.code || "none",
        completedFlg:
            dbTask.completed_flg === true || dbTask.completed_flg === 1,
        completedAt: dbTask.completed_at,
        completedBy: dbTask.completed_by?.name,
        createdBy: dbTask.created_by?.name,
        createdAt: dbTask.created_at,
    };
}

//==============================================================================
// 3. 初期化
//==============================================================================

/**
 * DOMの読み込み完了後にイベントリスナーを設定
 */
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();

    // Bladeからフィルタを取得
    const filterTabsContainer = document.querySelector(".filter-tabs");
    const filter = filterTabsContainer?.dataset.filter || "self";

    // 初期表示: 取得したフィルタでタスク一覧を表示
    filterTasks(filter);
});

//==============================================================================
// 4. イベント登録
//==============================================================================

/**
 * 全てのUIコンポーネントにイベントリスナーを設定
 */
function setupEventListeners() {
    const textInputBtn = document.getElementById("textInputBtn");
    if (textInputBtn) {
        textInputBtn.addEventListener("click", () => {
            openNewTaskModal();
        });
    }

    const closeInputModal = document.getElementById("closeInputModal");
    if (closeInputModal) {
        closeInputModal.addEventListener("click", () => {
            closeModal("inputModal");
        });
    }

    const closeTaskDetailModal = document.getElementById(
        "closeTaskDetailModal",
    );
    if (closeTaskDetailModal) {
        closeTaskDetailModal.addEventListener("click", () => {
            closeModal("taskDetailModal");
        });
    }

    const closeMemberModal = document.getElementById("closeMemberModal");
    if (closeMemberModal) {
        closeMemberModal.addEventListener("click", () => {
            closeModal("memberSelectModal");
        });
    }

    const closeDateModal = document.getElementById("closeDateModal");
    if (closeDateModal) {
        closeDateModal.addEventListener("click", () => {
            closeModal("dateSelectModal");
        });
    }

    const assigneeField = document.getElementById("assigneeField");
    if (assigneeField) {
        assigneeField.addEventListener("click", () => {
            if (isModalLocked) return;
            openMemberSelect();
        });
    }

    const dateField = document.getElementById("dateField");
    if (dateField) {
        dateField.addEventListener("click", () => {
            openDateSelectModal();
        });
    }

    const applyMemberBtn = document.getElementById("applyMemberBtn");
    if (applyMemberBtn) {
        applyMemberBtn.addEventListener(
            "click",
            applyMemberInMemberSelectModal,
        );
    }

    const clearMemberBtn = document.getElementById("clearMemberBtn");
    if (clearMemberBtn) {
        clearMemberBtn.addEventListener("click", () => {
            selectedMember = null;
            applyMemberInMemberSelectModal();
        });
    }

    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const isActive = e.target.classList.contains("active");
            document.querySelectorAll(".priority-btn").forEach((b) => {
                b.classList.remove("active", "high", "medium", "low");
            });
            // すでにアクティブだった場合は解除（指定なしに戻す）
            if (isActive) return;
            const priority = e.target.dataset.priority;
            e.target.classList.add("active");
            if (priority === "高") e.target.classList.add("high");
            if (priority === "中") e.target.classList.add("medium");
            if (priority === "低") e.target.classList.add("low");
        });
    });

    const completeTaskBtn = document.getElementById("completeTaskBtn");
    if (completeTaskBtn) {
        completeTaskBtn.addEventListener("click", completeTask);
    }

    const deleteTaskBtn = document.getElementById("deleteTaskBtn");
    if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener("click", confirmDeleteTask);
    }

    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.addEventListener("click", (e) => {
            const filter = e.target.dataset.filter;

            // 絞り込みフィルターパネルのセレクトをリセット
            const searchPriorityFilter = document.getElementById(
                "searchPriorityFilter",
            );
            const searchDueFilter = document.getElementById("searchDueFilter");
            if (searchPriorityFilter) searchPriorityFilter.value = "";
            if (searchDueFilter) searchDueFilter.value = "";
            document
                .querySelectorAll(".search-filter-select")
                .forEach((el) => el.classList.remove("active"));

            // タブに応じて担当者ドロップダウンを更新
            updateSearchAssigneeFilter(filter);
            updateSearchFilterBtnState();

            // フィルタ条件に応じてタスクを追加
            filterTasks(filter);
        });
    });

    const todayBtn = document.getElementById("todayBtn");
    if (todayBtn) {
        todayBtn.addEventListener("click", () => selectShortcut("today"));
    }

    const tomorrowBtn = document.getElementById("tomorrowBtn");
    if (tomorrowBtn) {
        tomorrowBtn.addEventListener("click", () => selectShortcut("tomorrow"));
    }

    const weekendBtn = document.getElementById("weekendBtn");
    if (weekendBtn) {
        weekendBtn.addEventListener("click", () => selectShortcut("weekend"));
    }

    const nextWeekBtn = document.getElementById("nextWeekBtn");
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener("click", () => selectShortcut("nextWeek"));
    }

    const prevMonth = document.getElementById("prevMonth");
    if (prevMonth) {
        prevMonth.addEventListener("click", () => changeMonth(-1));
    }

    const nextMonth = document.getElementById("nextMonth");
    if (nextMonth) {
        nextMonth.addEventListener("click", () => changeMonth(1));
    }

    const saveDateBtn = document.getElementById("saveDateBtn");
    if (saveDateBtn) {
        saveDateBtn.addEventListener("click", saveDateSelection);
    }

    const clearDateBtn = document.getElementById("clearDateBtn");
    if (clearDateBtn) {
        clearDateBtn.addEventListener("click", clearDateSelection);
    }

    // クリックで時間ピッカーの表示・非表示切替
    const timeBtn = document.getElementById("timeBtn");
    if (timeBtn) {
        timeBtn.addEventListener("click", toggleTimePicker);
    }

    // クリックで時間選択をクリア（時間ピッカー内の✕ボタン）
    const timeClearBtn = document.getElementById("timeClearBtn");
    if (timeClearBtn) {
        timeClearBtn.addEventListener("click", clearTimeSelection);
    }

    // 変更時に選択された'時間'を更新（時のドロップボタン）
    const hourSelect = document.getElementById("hourSelect");
    if (hourSelect) {
        hourSelect.addEventListener("change", updateTimeSelection);
    }

    // 変更時に選択された'分'を更新（分のドロップボタン）
    const minuteSelect = document.getElementById("minuteSelect");
    if (minuteSelect) {
        minuteSelect.addEventListener("change", updateTimeSelection);
    }

    const alertCancelBtn = document.getElementById("alertCancelBtn");
    if (alertCancelBtn) {
        alertCancelBtn.addEventListener("click", () => {
            closeModal("alertModal");
            alertCallback = null;
        });
    }

    const alertConfirmBtn = document.getElementById("alertConfirmBtn");
    if (alertConfirmBtn) {
        alertConfirmBtn.addEventListener("click", () => {
            if (alertCallback) {
                alertCallback();
            }
            closeModal("alertModal");
            alertCallback = null;
        });
    }

    const deleteConfirmCancelBtn = document.getElementById(
        "deleteConfirmCancelBtn",
    );
    if (deleteConfirmCancelBtn) {
        deleteConfirmCancelBtn.addEventListener("click", closeDeleteConfirm);
    }

    const deleteConfirmOkBtn = document.getElementById("deleteConfirmOkBtn");
    if (deleteConfirmOkBtn) {
        deleteConfirmOkBtn.addEventListener("click", () => {
            if (deleteConfirmCallback) {
                deleteConfirmCallback();
            }
            closeDeleteConfirm();
        });
    }

    // 保存ボタン（モーダル）ボタン
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener("click", handleSaveTask);
    }
}

//==============================================================================
// 5. モーダル/アラートUI
//==============================================================================

/**
 * モーダルを開く
 * @param {string} modalId - 開くモーダルのDOM要素ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
    }
}

/**
 * モーダルを閉じる
 * @param {string} modalId - 閉じるモーダルのDOM要素ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
    }
}

/**
 * 確認アラートモーダルを表示
 * @param {string} title - アラートのタイトル
 * @param {string} message - アラートのメッセージ（HTML可）
 * @param {string} confirmText - 確認ボタンのテキスト
 * @param {Function} callback - 確認ボタン押下時に実行される関数
 * @param {string} [iconClass="fas fa-user"] - アイコンのCSSクラス
 */
function showAlert(
    title,
    message,
    confirmText,
    callback,
    iconClass = "fas fa-user",
) {
    document.getElementById("alertTitle").textContent = title;
    document.getElementById("alertMessage").innerHTML = message;
    document.getElementById("alertConfirmBtn").textContent = confirmText;
    document.getElementById("alertIconContent").className = iconClass;

    alertCallback = callback;
    openModal("alertModal");
}

/**
 * 削除確認モーダルを表示
 * @param {Function} callback - 削除確認時に実行するコールバック
 */
let deleteConfirmCallback = null;

function showDeleteConfirm(callback) {
    deleteConfirmCallback = callback;
    document.getElementById("deleteConfirmModal").classList.add("active");
}

function closeDeleteConfirm() {
    deleteConfirmCallback = null;
    document.getElementById("deleteConfirmModal").classList.remove("active");
}

//==============================================================================
// 6. タスク操作
//==============================================================================

/**
 * 保存ボタンのハンドラー
 * currentTask.id の有無で新規作成か編集かを判定
 */
async function handleSaveTask() {
    if (!currentTask) {
        alert("エラー: タスク情報が見つかりません");
        return;
    }

    if (currentTask.id) {
        await confirmEditTask();
    } else {
        await textCreateTask();
    }
}

/**
 * 他メンバーに割り当てられたタスクかどうかを判定
 * @param {Object} task - 判定対象のタスクオブジェクト
 * @returns {boolean} 他メンバーのタスクの場合true
 */
function isOtherMemberTask(task) {
    return task.assignee !== CURRENT_USER && task.assignee !== "指定なし";
}

/**
 * 新規タスク作成モーダルを開く
 * 初期値として現在のユーザーを担当者に設定
 */
function openNewTaskModal() {
    const today = new Date();
    // 空のオブジェクトでcurrentTaskを初期化 (idなし)
    currentTask = {
        textInput: "",
        aiTask: "",
        date: formatDate(today.toISOString()),
        assignee: CURRENT_USER,
        priority: "指定なし",
        createdBy: CURRENT_USER,
        createdAt: new Date().toISOString(),
        completedFlg: false,
        completedAt: null,
        completedBy: null,
    };

    // 画面表示（初期）
    document.getElementById("textInputField").value = "";
    const detailDate = document.getElementById("detailDate");
    document.getElementById("detailDate").textContent = currentTask.date;
    detailDate.dataset.date = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    detailDate.dataset.time = "";
    document.getElementById("detailAssignee").textContent = CURRENT_USER;
    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.classList.remove("active", "high", "medium", "low");
    });

    // 編集可能モードに設定（新規作成時）
    setTaskDetailEditable(true);

    // 完了ボタン・削除ボタンを非表示にする（新規作成時）
    document.getElementById("completeTaskBtn").style.display = "none";
    document.getElementById("deleteTaskBtn").style.display = "none";

    openModal("taskDetailModal");
}

/**
 * 既存タスクの詳細モーダルを開く
 * @param {Object} task - 表示するタスクオブジェクト
 */
// ★★★ inline onclick を辞める必要がある
function openTaskDetailModal(taskId) {
    // currentTaskListから取得したタスクで初期化
    const task = currentTaskList.find((t) => t.id === taskId);
    if (!task) return;
    currentTask = task;

    // モーダルを開いた時点のスナップショットを保持
    snapshotTask = { ...currentTask };

    // 画面表示（編集）
    document.getElementById("textInputField").value = task.aiTask;

    const detailDate = document.getElementById("detailDate");
    const displayText = task.time ? `${task.date} ${task.time}` : task.date;
    detailDate.textContent = displayText;
    detailDate.dataset.date = task.dueDate || "";
    detailDate.dataset.time = task.time || "";

    document.getElementById("detailAssignee").textContent = task.assignee;

    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.classList.remove("active", "high", "medium", "low");
        if (btn.dataset.priority === task.priority) {
            btn.classList.add("active");
            if (task.priority === "高") btn.classList.add("high");
            if (task.priority === "中") btn.classList.add("medium");
            if (task.priority === "低") btn.classList.add("low");
        }
    });

    // 削除ボタンを表示（既存タスク）
    document.getElementById("deleteTaskBtn").style.display = "";

    // モーダルを開く
    openModal("taskDetailModal");

    // モーダルが開いた後に編集可/不可を設定
    setTimeout(() => {
        if (task.completedFlg) {
            setTaskDetailEditable(false);
        } else {
            setTaskDetailEditable(true);
        }
    }, 100);
}

/**
 * タスク詳細モーダルの編集可/不可を設定
 * @param {boolean} editable - true: 編集可能, false: 編集不可
 */
function setTaskDetailEditable(editable) {
    const textInputField = document.getElementById("textInputField");
    const taskDetailTitle = document.querySelector(".task-detail-title");
    const dateField = document.getElementById("dateField");
    const assigneeField = document.getElementById("assigneeField");
    const priorityField = document.getElementById("priorityField");
    const priorityButtons = document.querySelectorAll(".priority-btn");
    const completeBtn = document.getElementById("completeTaskBtn");
    const saveBtn = document.getElementById("saveTaskBtn");
    const uncompleteBtn = document.getElementById("uncompleteTaskBtn");

    if (editable) {
        // 編集可能モード
        if (textInputField) {
            textInputField.readOnly = false;
            textInputField.style.color = "";
        }

        if (taskDetailTitle) {
            taskDetailTitle.classList.remove("completed-style");
        }

        if (dateField) {
            dateField.classList.remove("disabled");
        }

        if (assigneeField) {
            assigneeField.classList.remove("disabled");
        }

        if (priorityField) {
            priorityField.classList.remove("disabled");
        }

        priorityButtons.forEach((btn) => {
            btn.disabled = false;
            btn.style.opacity = "";
        });

        if (completeBtn) {
            completeBtn.classList.remove("hidden");
            completeBtn.style.display = "";
        }

        if (saveBtn) {
            saveBtn.style.display = "";
            saveBtn.disabled = false;
        }

        if (uncompleteBtn) {
            uncompleteBtn.style.display = "none";
        }
    } else {
        // 編集不可モード（完了済み）
        if (textInputField) {
            textInputField.readOnly = true;
        }

        if (taskDetailTitle) {
            taskDetailTitle.classList.add("completed-style");
        }

        if (dateField) {
            dateField.classList.add("disabled");
        }

        if (assigneeField) {
            assigneeField.classList.add("disabled");
        }

        if (priorityField) {
            priorityField.classList.add("disabled");
        }

        priorityButtons.forEach((btn) => {
            btn.disabled = true;
            btn.style.opacity = "0.5";
        });

        if (completeBtn) {
            completeBtn.style.display = "none";
        }

        if (saveBtn) {
            saveBtn.style.display = "none";
        }

        if (uncompleteBtn) {
            uncompleteBtn.style.display = "";
            uncompleteBtn.onclick = uncompleteTask;
        }
    }
}

/**
 * モーダルをロックする
 * @param {boolean} locked - true: ロック, false: ロック解除
 */
function setModalLocked(locked) {
    // ✕ボタン
    const closeTaskDetailModal = document.getElementById(
        "closeTaskDetailModal",
    );
    closeTaskDetailModal.disabled = locked;

    // 削除ボタン
    const deleteTaskBtn = document.getElementById("deleteTaskBtn");
    deleteTaskBtn.disabled = locked;

    // タスク欄（テキスト入力欄）
    const textInputField = document.getElementById("textInputField");
    textInputField.disabled = locked;

    // 完了にするボタン
    const completeTaskBtn = document.getElementById("completeTaskBtn");
    completeTaskBtn.disabled = locked;

    // 保存ボタン
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    saveTaskBtn.disabled = locked;

    // divフィールドではCSSで操作を無効化
    const fields = ["dateField", "assigneeField", "priorityField"];
    fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.pointerEvents = locked ? "none" : "";
    });
}

/**
 * 新規タスクを作成（手入力）
 */
async function textCreateTask() {
    // handleSaveTask();

    // 入力チェック
    const textInput = document.getElementById("textInputField").value.trim();
    if (!textInput) {
        alert("タスク名を入力してください");
        return;
    }

    // 保存中はモーダル操作をロックし、ボタン表示を変更
    setModalLocked(true);
    const saveBtn = document.getElementById("saveTaskBtn");
    saveBtn.textContent = "保存中...";

    try {
        const detailDateElement = document.getElementById("detailDate");
        const date =
            detailDateElement.dataset.date ||
            detailDateElement.textContent ||
            "指定なし";
        const time =
            date != "指定なし" ? detailDateElement.dataset.time || null : null;
        const assignee =
            document.getElementById("detailAssignee").textContent || "指定なし";
        const priority =
            document.querySelector(".priority-btn.active")?.dataset.priority ||
            "指定なし";

        // 新規作成APIにリクエストを送信
        const saveResponse = await fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                ai_task: textInput,
                text_input: textInput,
                date,
                time,
                assignee,
                priority,
            }),
        });

        // 新規作成APIのレスポンス(JSON)を取得
        const saveResult = await saveResponse.json();
        // エラー
        if (!saveResult.success) {
            alert("作成に失敗しました: " + (saveResult.message || ""));
            return;
        }

        // 成功時はモーダルを閉じて、タスク一覧を更新
        closeModal("taskDetailModal");
        await filterTasks(currentFilter);
    } catch (error) {
        alert("エラー: " + error.message);
    } finally {
        setModalLocked(false);
        saveBtn.textContent = "保存";
    }
}

/**
 * 新規タスクを作成（音声入力）
 */
async function voiceCreateTask(transcript, skipUiSetup = false) {
    const recordingBar = document.getElementById("recordingBar");
    const recordingBarLabel = document.getElementById("recordingBarLabel");
    const analyzingOverlay = document.getElementById("analyzingOverlay");

    // 解析中UIに切り替え（Whisper経由の場合はUI設定済みのためスキップ）
    if (!skipUiSetup) {
        recordingBar.classList.add("active", "analyzing");
        recordingBarLabel.textContent = "解析中...";
        if (analyzingOverlay) analyzingOverlay.classList.add("active");
    }

    try {
        // AI解析APIにリクエストを送信
        const analyzeResponse = await fetch("/api/tasks/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                text_input: transcript,
            }),
        });

        // { success: true, message: "...", data: {...} }
        const analyzeResult = await analyzeResponse.json();

        if (!analyzeResult.success) {
            alert(
                "エラー: " + (analyzeResult.message || "AI解析に失敗しました"),
            );
            return;
        }

        // { aiTask: "...", date: "...", assignee: "...", priority: "..." }
        const parsedTask = analyzeResult.data;

        // 新規作成APIにリクエストを送信
        const saveResponse = await fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                ai_task: parsedTask.aiTask,
                text_input: transcript,
                date: parsedTask.date || "指定なし",
                time: parsedTask.time != "指定なし" ? parsedTask.time : null,
                assignee: parsedTask.assignee || "指定なし",
                priority: parsedTask.priority || "指定なし",
            }),
        });

        // 新規作成APIのレスポンス(JSON)を取得
        const saveResult = await saveResponse.json();
        // エラー
        if (!saveResult.success) {
            alert("作成に失敗しました: " + (saveResult.message || ""));
            return;
        }

        closeModal("taskDetailModal");
        await filterTasks(currentFilter);
    } catch (error) {
        alert("エラー: " + error.message);
    } finally {
        // UIを元に戻す（Whisper経由の場合はWhisper側のfinallyで処理するためスキップ）
        if (!skipUiSetup) {
            recordingBar.classList.remove("active", "analyzing");
            recordingBarLabel.textContent = "";
            if (analyzingOverlay) analyzingOverlay.classList.remove("active");
            const voiceBtn = document.getElementById("voiceInputBtn");
            if (voiceBtn) voiceBtn.disabled = false;
        }
    }
}

/**
 * タスク編集の確認ダイアログを表示
 * 他メンバーのタスクまたは担当者なしの場合はアラートを表示
 */
function confirmEditTask() {
    // currentTask.id の存在チェックは handleSaveTask() で済んでいる

    // 変更がない場合はモーダルを閉じるだけ
    const textInput = document.getElementById("textInputField").value.trim();
    const date = document.getElementById("detailDate").textContent;
    const priority =
        document.querySelector(".priority-btn.active")?.dataset.priority ||
        "指定なし";

    if (
        textInput === snapshotTask.textInput &&
        currentTask.assignee === snapshotTask.assignee &&
        date === snapshotTask.date &&
        priority === snapshotTask.priority
    ) {
        closeModal("taskDetailModal");
        return;
    }

    // 他メンバーのタスク
    if (isOtherMemberTask(snapshotTask)) {
        const assigneeName = snapshotTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `<strong>${assigneeName}</strong>さんに割り当てられています<br>編集してもよろしいですか?`,
            "編集する",
            () => executeEditTask(),
            "fas fa-edit",
        );
        return;
    }

    // 担当者なしのタスク
    if (snapshotTask.assignee === "指定なし") {
        showAlert(
            "担当者なしのタスクです",
            "担当者が指定されていません<br>編集してもよろしいですか?",
            "編集する",
            () => executeEditTask(),
            "fas fa-edit",
        );
        return;
    }

    // 自分のタスク
    executeEditTask();
}

/**
 * 既存タスクを編集（AI解析なし）
 * 1. ユーザーの手動入力を取得
 * 2. データベースに保存
 */
async function executeEditTask() {
    // 入力チェック
    const textInput = document.getElementById("textInputField").value.trim();
    if (!textInput) {
        alert("タスク名を入力してください");
        return;
    }

    const saveBtn = document.getElementById("saveTaskBtn");
    if (!saveBtn) {
        alert("エラー: 保存ボタンが見つかりません");
        return;
    }

    setModalLocked(true);
    saveBtn.textContent = "保存中...";
    try {
        // currentTaskを更新
        currentTask.textInput = textInput;
        currentTask.aiTask = textInput; // 編集時はテキスト入力をそのまま使用

        // ユーザーの手動入力を取得
        const detailDateElement = document.getElementById("detailDate");
        const manualDate =
            detailDateElement.dataset.date || detailDateElement.textContent;
        const manualTime = detailDateElement.dataset.time || null;

        currentTask.date = manualDate || "指定なし";
        // 日付なしの場合は時間も無効にする
        currentTask.time =
            currentTask.date && currentTask.date !== "指定なし"
                ? manualTime
                : null;

        const manualAssignee =
            document.getElementById("detailAssignee").textContent;
        currentTask.assignee = manualAssignee || "指定なし";

        const manualPriority = document.querySelector(".priority-btn.active")
            ?.dataset.priority;
        currentTask.priority = manualPriority || "指定なし";

        // 編集APIにリクエストを送信
        const saveResponse = await fetch(`/api/tasks/${currentTask.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                ai_task: currentTask.aiTask,
                text_input: currentTask.textInput,
                date: currentTask.date,
                time: currentTask.time,
                assignee: currentTask.assignee,
                priority: currentTask.priority,
            }),
        });
        const saveResult = await saveResponse.json();

        if (!saveResult.success) {
            alert("更新に失敗しました: " + (saveResult.message || ""));
            return;
        }

        if (!saveResult.task) {
            console.error("saveResult.task is missing:", saveResult);
            alert("エラー: サーバーからタスク情報が返されませんでした");
            return;
        }

        // モーダルを閉じる
        closeModal("taskDetailModal");

        // 更新されたタスクを取得
        const updatedTask = transformTaskData(saveResult.task);

        // 完了済みフィルタで、未完了に戻したタスクを保存した場合
        if (
            updatedTask.completedFlg === false &&
            currentFilter === "completed"
        ) {
            // 完了済みフィルタから削除（未完了に戻ったため）
            currentTaskList = currentTaskList.filter(
                (t) => t.id !== currentTask.id,
            );
        } else if (currentFilter === "completed") {
            // 完了済みフィルタで、完了状態を維持したまま編集した場合
            const editTaskIndex = currentTaskList.findIndex(
                (t) => t.id === currentTask.id,
            );
            if (editTaskIndex !== -1) {
                currentTaskList[editTaskIndex] = updatedTask;
            }
        } else {
            // 他のフィルタの場合
            const editTaskIndex = currentTaskList.findIndex(
                (t) => t.id === currentTask.id,
            );
            if (editTaskIndex !== -1) {
                currentTaskList[editTaskIndex] = updatedTask;
            }
        }

        // 画面を再描画
        renderTaskList(currentTaskList, currentFilter);
    } catch (error) {
        alert("エラー: " + error.message);
    } finally {
        setModalLocked(false);
        saveBtn.textContent = "保存";
    }
}

/**
 * タスク削除の確認ダイアログを表示
 * 他メンバーのタスクの場合は専用のアラートモーダルを表示
 */
function confirmDeleteTask() {
    if (!currentTask) return;

    // 他メンバーのタスクの場合は確認アラートを表示
    if (isOtherMemberTask(currentTask)) {
        const assigneeName = currentTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `<strong>${assigneeName}</strong>さんに割り当てられています<br>削除してもよろしいですか?`,
            "削除する",
            () => executeDeleteTask(),
            "fas fa-trash",
        );
        return;
    }

    // 担当者なしのタスクの場合は確認アラートを表示
    if (currentTask.assignee === "指定なし") {
        showAlert(
            "担当者なしのタスクです",
            "担当者が指定されていません<br>削除してもよろしいですか?",
            "削除する",
            () => executeDeleteTask(),
            "fas fa-trash",
        );
        return;
    }

    // 自分・完了タスクの場合は削除確認モーダルを表示
    showDeleteConfirm(() => executeDeleteTask());
}

/**
 * タスク削除をサーバーに送信して実行
 * @async
 */
async function executeDeleteTask() {
    // 1. currentTaskが存在するかチェック
    if (!currentTask) return;

    // 2. 削除するタスクのIDを保持
    const deletedTaskId = currentTask.id;

    try {
        // 3. タスク削除APIにリクエストを送信
        const response = await fetch(`/api/tasks/${currentTask.id}`, {
            method: "DELETE",
            headers: {
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
        });

        // APIレスポンス(JSON)を取得
        const result = await response.json();

        if (!result.success) {
            alert("削除に失敗しました: " + (result.message || ""));
            return;
        }

        // 4.成功レスポンスが返ってきた場合

        // モーダルを閉じる
        closeModal("taskDetailModal");

        // currentTaskListから削除したタスクを除外
        currentTaskList = currentTaskList.filter((t) => t.id !== deletedTaskId);

        // 画面を再描画
        renderTaskList(currentTaskList, currentFilter);
    } catch (error) {
        alert("エラー: " + error.message);
    }
}

/**
 * リスト画面のチェックボックスクリック処理
 * @param {Event} event - クリックイベント
 * @param {number} taskId - タスクID
 */
function handleCheckboxClick(event, taskId) {
    event.stopPropagation();

    const task = currentTaskList.find((t) => t.id === taskId);
    if (!task) return;

    currentTask = task;

    const taskElement = event.target.closest(".task-item");
    const checkboxElement = event.target.closest(".task-checkbox");

    if (isOtherMemberTask(task)) {
        const assigneeName = task.assignee;
        showAlert(
            "他メンバーのタスクです",
            `<strong>${assigneeName}</strong>さんに割り当てられています<br>完了にしてもよろしいですか?`,
            "完了にする",
            () =>
                executeCompleteTaskWithAnimation(
                    taskId,
                    taskElement,
                    checkboxElement,
                ),
            "fas fa-user",
        );
        return;
    }

    executeCompleteTaskWithAnimation(taskId, taskElement, checkboxElement);
}

/**
 * タスク完了の確認処理
 * 他メンバーのタスクの場合は確認アラートを表示
 */
async function completeTask() {
    if (!currentTask) return;

    // まず編集内容を保存
    const textInput = document.getElementById("textInputField").value.trim();
    if (!textInput) {
        alert("タスク名を入力してください");
        return;
    }

    // currentTaskを更新
    currentTask.textInput = textInput;
    currentTask.aiTask = textInput;

    const detailDateElement = document.getElementById("detailDate");
    const manualDate =
        detailDateElement.dataset.date || detailDateElement.textContent;
    console.log("dataset.date:", detailDateElement.dataset.date);
    console.log("textContent:", detailDateElement.textContent);
    console.log("manualDate:", manualDate);
    const manualTime = detailDateElement.dataset.time || null;

    currentTask.date = manualDate || "指定なし";
    // 日付なしの場合は時間も無効にする
    currentTask.time =
        currentTask.date && currentTask.date !== "指定なし" ? manualTime : null;

    const manualAssignee =
        document.getElementById("detailAssignee").textContent;
    currentTask.assignee = manualAssignee || "指定なし";

    const manualPriority = document.querySelector(".priority-btn.active")
        ?.dataset.priority;
    currentTask.priority = manualPriority || "指定なし";

    try {
        // 編集内容を保存
        const saveResponse = await fetch(`/api/tasks/${currentTask.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                ai_task: currentTask.aiTask,
                text_input: currentTask.textInput,
                date: currentTask.date,
                time: currentTask.time,
                assignee: currentTask.assignee,
                priority: currentTask.priority,
            }),
        });

        const saveResult = await saveResponse.json();
        if (!saveResult.success) {
            alert("更新に失敗しました: " + (saveResult.message || ""));
            return;
        }

        // 保存後、完了処理を実行
        currentTask = transformTaskData(saveResult.task);

        if (isOtherMemberTask(currentTask)) {
            const assigneeName = currentTask.assignee;
            showAlert(
                "他メンバーのタスクです",
                `<strong>${assigneeName}</strong>さんに割り当てられています<br>完了にしてもよろしいですか?`,
                "完了にする",
                () => executeCompleteTask(),
                "fas fa-user",
            );
            return;
        }

        executeCompleteTask();
    } catch (error) {
        alert("エラー: " + error.message);
    }
}

/**
 * タスク完了を実行（アニメーション付き）
 * リスト画面のチェックボックスクリック時に使用
 * @param {number} taskId - タスクID
 */
async function executeCompleteTaskWithAnimation(
    taskId,
    taskElement,
    checkboxElement,
) {
    if (!currentTask) return;

    if (!taskElement || !checkboxElement) return;

    try {
        checkboxElement.classList.add("completing");
        checkboxElement.innerHTML = '<i class="fas fa-check"></i>';

        await new Promise((resolve) => setTimeout(resolve, 300));

        const response = await fetch(`/api/tasks/${taskId}/complete`, {
            method: "PATCH",
            headers: {
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
        });

        const result = await response.json();

        if (!result.success) {
            checkboxElement.classList.remove("completing");
            checkboxElement.innerHTML = "";
            alert("完了処理に失敗しました: " + (result.message || ""));
            return;
        }

        taskElement.classList.add("completing");

        await new Promise((resolve) => setTimeout(resolve, 400));

        currentTask = transformTaskData(result.task);

        if (currentFilter === "all") {
            // "all" フィルタの場合はリストを更新（完了済み状態に差し替え）
            currentTaskList = currentTaskList.map((t) =>
                t.id === taskId ? currentTask : t,
            );
        } else if (currentFilter !== "completed") {
            currentTaskList = currentTaskList.filter((t) => t.id !== taskId);
        }

        renderTaskList(currentTaskList, currentFilter);
    } catch (error) {
        if (checkboxElement) {
            checkboxElement.classList.remove("completing");
            checkboxElement.innerHTML = "";
        }
        if (taskElement) {
            taskElement.classList.remove("completing");
        }
        alert("エラー: " + error.message);
    }
}

/**
 * タスク完了を実行
 * 完了フラグと完了日時、完了者を設定
 */
async function executeCompleteTask() {
    if (!currentTask) return;

    const completedTaskId = currentTask.id;

    try {
        // タスク完了APIにリクエストを送信
        const response = await fetch(`/api/tasks/${currentTask.id}/complete`, {
            method: "PATCH",
            headers: {
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
        });

        // APIレスポンス(JSON)を取得
        const result = await response.json();

        if (!result.success) {
            alert("完了処理に失敗しました: " + (result.message || ""));
            return;
        }

        // モーダルを閉じる
        closeModal("taskDetailModal");

        // ローカルのcurrentTaskを更新(APIレスポンスを使用する)
        currentTask = transformTaskData(result.task);

        if (currentFilter === "all") {
            // "all" フィルタの場合はリストを更新（完了済み状態に差し替え）
            currentTaskList = currentTaskList.map((t) =>
                t.id === completedTaskId ? currentTask : t,
            );
        } else if (currentFilter !== "completed") {
            // "self" | "member" | "unassigned" の場合
            // currentTaskListから完了したタスクを除外
            currentTaskList = currentTaskList.filter(
                (t) => t.id !== completedTaskId,
            );
        }

        // 画面を再描画
        renderTaskList(currentTaskList, currentFilter);
    } catch (error) {
        alert("エラー: " + error.message);
    }
}

/**
 * タスクを未完了に戻す確認処理
 * 他メンバーのタスクの場合は確認アラートを表示
 */
function uncompleteTask() {
    if (!currentTask) return;

    if (isOtherMemberTask(currentTask)) {
        const assigneeName = currentTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `<strong>${assigneeName}</strong>さんに割り当てられています<br>未完了に戻してもよろしいですか?`,
            "未完了に戻す",
            () => executeUncompleteTask(),
            "fas fa-user",
        );
        return;
    }

    executeUncompleteTask();
}

/**
 * タスクを未完了に戻す処理を実行
 */
async function executeUncompleteTask() {
    if (!currentTask) return;

    try {
        const response = await fetch(
            `/api/tasks/${currentTask.id}/uncomplete`,
            {
                method: "PATCH",
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                    Accept: "application/json",
                },
            },
        );

        const result = await response.json();

        if (!result.success) {
            alert("未完了に戻す処理に失敗しました: " + (result.message || ""));
            return;
        }

        // currentTaskを更新
        currentTask = transformTaskData(result.task);

        // 編集可能モードに切り替え
        setTaskDetailEditable(true);
    } catch (error) {
        alert("エラー: " + error.message);
    }
}

//==============================================================================
// 7. タスク一覧描画
//==============================================================================

/**
 * 優先度に対応するCSSクラス名を取得
 * @param {string} priority - 優先度（"高"、"中"、"低"、"指定なし"）
 * @returns {string} CSSクラス名
 */
function getPriorityClass(priority) {
    if (priority === "高") return "priority-high";
    if (priority === "中") return "priority-medium";
    return "";
}

/**
 * フィルター条件に基づいてタスクを取得し、画面に表示
 * @param {string} filter - フィルター種別（"self", "member", "unassigned", "completed"）
 * @async
 */
async function filterTasks(filter) {
    // 現在のフィルタ変数を更新
    currentFilter = filter;

    // タブのactive状態を更新（画面の見た目)
    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.classList.remove("active");
        if (tab.dataset.filter === filter) {
            tab.classList.add("active");
        }
    });

    try {
        // タスク一覧取得APIにリクエストを送信（フィルター条件付き）
        // const response = await fetch(`/api/tasks?filter=${filter}`);
        const searchAssigneeFilter = document.getElementById(
            "searchAssigneeFilter",
        );
        const assigneeName =
            searchAssigneeFilter?.disabled && filter !== "unassigned"
                ? CURRENT_USER
                : searchAssigneeFilter?.disabled
                  ? ""
                  : searchAssigneeFilter?.value || "";
        const priorityLabel =
            document.getElementById("searchPriorityFilter")?.value || "";
        const due = document.getElementById("searchDueFilter")?.value || "";

        const assigneeId = assigneeName
            ? MEMBERS.find((m) => m.name === assigneeName)?.id || ""
            : "";
        const priorityMap = { none: 0, low: 1, medium: 2, high: 3 };
        const priorityId =
            priorityLabel !== "" ? priorityMap[priorityLabel] || "" : "";

        const params = new URLSearchParams({ filter });
        if (assigneeId) params.append("assignee_id", assigneeId);
        if (priorityId !== "") params.append("priority_id", priorityId);
        if (due) params.append("due", due);

        const response = await fetch(`/api/tasks?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // APIレスポンス(JSON)を取得
        const data = await response.json();

        // - レスポンスの tasks 配列を取り出し、画面表示用データに変換
        const transformedTasks = data.tasks.map(transformTaskData);
        // - currentTaskListに保持する
        currentTaskList = transformedTasks;

        // タスク一覧を描画
        renderTaskList(transformedTasks, filter);
    } catch (error) {
        console.error("タスクの取得に失敗しました:", error);
        showErrorMessage("タスクの読み込みに失敗しました");
    }
}

/**
 * タスクアイテムのHTMLを生成
 * @param {Object} task - タスクオブジェクト
 * @param {boolean} [isCompleted=false] - 完了タスク表示モードかどうか
 * @param {string} [groupType=null] - グループタイプ（'overdue', 'today', 'tomorrow', 'future'）
 * @returns {string} タスクアイテムのHTML文字列
 */
function renderTaskItem(task, isCompleted = false, groupType = null) {
    const completedClass = isCompleted ? "completed-task" : "";
    const checkboxContent = isCompleted ? '<i class="fas fa-check"></i>' : "";

    // groupTypeあり (self / member / unassigned)
    let dateTimeDisplay;
    if (groupType) {
        dateTimeDisplay = formatTaskDateInGroup(task, groupType);
    } else {
        // groupTypeなし (completed)
        const dateLabel = task.date === "指定なし" ? "期限なし" : task.date;
        dateTimeDisplay = task.time ? `${dateLabel} ${task.time}` : dateLabel;
    }

    // 期限切れ判定（完了済みは除く）
    // 日付が過去、または今日かつ時刻が設定されていて現在時刻を過ぎている場合
    const isOverdue =
        !isCompleted &&
        (() => {
            if (!task.dueDate) return false;
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            if (taskDate < today) return true;
            if (taskDate.getTime() === today.getTime() && task.time) {
                const [hours, minutes] = task.time.split(":").map(Number);
                const taskDateTime = new Date(task.dueDate);
                taskDateTime.setHours(hours, minutes, 0, 0);
                return taskDateTime < now;
            }
            return false;
        })();
    const overdueDateClass = isOverdue ? "overdue-date" : "";

    return `
        <div class="task-item ${completedClass}" onclick="openTaskDetailModal(${task.id})">
            ${isCompleted ? renderCompletedInfo(task, checkboxContent, getPriorityClass(task.priority)) : ""}
            <div class="task-item-top">
                ${!isCompleted ? `<div class="task-checkbox ${getPriorityClass(task.priority)}" onclick="handleCheckboxClick(event, ${task.id})">${checkboxContent}</div>` : ""}
                <div class="task-title">${task.aiTask}</div>
            </div>
            <div class="task-meta">
                ${
                    dateTimeDisplay
                        ? `
                <div class="task-meta-item ${overdueDateClass}">
                    <i class="far fa-calendar"></i>
                    <span>${dateTimeDisplay}</span>
                </div>
                `
                        : ""
                }
                <div class="task-meta-item">
                    <i class="far fa-user"></i>
                    <span>${task.assignee === "指定なし" ? "指定なし" : task.createdBy && task.createdBy !== task.assignee ? `${task.createdBy} → ${task.assignee}` : task.assignee}</span>
                </div>
                <div class="task-meta-item ${getPriorityClass(task.priority)}">
                    <i class="fas fa-flag"></i>
                    <span>${task.priority}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 完了タスクの完了情報（完了時刻、完了者）を表示するHTMLを生成
 * @param {Object} task - タスクオブジェクト
 * @param {string} checkboxContent - チェックボックス内のHTML
 * @param {string} priorityClass - 優先度のCSSクラス名
 * @returns {string} 完了情報のHTML文字列、completedAtがない場合は空文字列
 */
function renderCompletedInfo(task, checkboxContent, priorityClass) {
    if (!task.completedAt) return "";

    const completedDate = new Date(task.completedAt);
    const timeString = completedDate.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const completedByName = task.completedBy;

    return `
        <div class="completed-info">
            <div class="task-checkbox ${priorityClass}">${checkboxContent}</div>
            <span class="completed-time">${timeString}</span>
            <span class="completed-by"><strong class="completed-by-name">${completedByName}</strong> がタスクを完了しました</span>
        </div>
    `;
}

//==============================================================================
// 8. メンバー選択
//==============================================================================

/**
 * メンバー選択モーダルを開く
 */
function openMemberSelect() {
    const matched = MEMBERS.find((m) => m.name === currentTask.assignee);
    selectedMember = matched ? matched.id : null;
    renderMemberList();
    openModal("memberSelectModal");
}

/**
 * メンバーリストをモーダル内に描画
 * 選択中のメンバーにはチェックマークを表示
 */
function renderMemberList() {
    const memberList = document.getElementById("memberList");
    if (!memberList) return;
    console.log(MEMBERS);

    memberList.innerHTML = MEMBERS.map(
        (member) => `
            <div class="member-item" onclick="selectMemberInMemberSelectModal(${member.id})">
                <div class="member-avatar">
                    ${
                        member.avatar
                            ? `<img src="${member.avatar}" class="member-avatar-img" alt="${member.name}">`
                            : member.name.charAt(0)
                    }
                </div>
                <div class="member-name">${member.name}</div>
                <div class="member-check ${selectedMember === member.id ? "selected" : ""}">
                    ${selectedMember === member.id ? '<i class="fas fa-check"></i>' : ""}
                </div>
            </div>
        `,
    ).join("");
}

/**
 * メンバーを選択状態にする
 * @param {number} memberId - 選択するメンバーのID
 */
// ★★★ inline onclick を辞める必要がある
function selectMemberInMemberSelectModal(memberId) {
    if (selectedMember === memberId) {
        selectedMember = null;
    } else {
        selectedMember = memberId;
    }
    renderMemberList();
}

/**
 * 選択中のメンバーをタスクの担当者フィールドに適用
 */
function applyMemberInMemberSelectModal() {
    if (selectedMember) {
        const member = MEMBERS.find((m) => m.id === selectedMember);
        if (member) {
            currentTask.assignee = member.name;
            document.getElementById("detailAssignee").textContent = member.name;
        }
    } else {
        currentTask.assignee = "指定なし";
        document.getElementById("detailAssignee").textContent = "指定なし";
    }
    closeModal("memberSelectModal");
}

/**
 * 日付選択モーダルを開く
 * 初期表示は「既存の期限日」→「今日」→「未選択」の優先順で決定
 */
function openDateSelectModal() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingDueDate = currentTask.dueDate
        ? new Date(currentTask.dueDate)
        : null;
    const detailDate = document.getElementById("detailDate");
    const hasDate = detailDate?.dataset.date !== "";
    selectedDate = existingDueDate || (hasDate ? today : null);
    currentYear = (selectedDate || today).getFullYear();
    currentMonth = (selectedDate || today).getMonth();

    const existingTime = detailDate?.dataset.time || null;

    initializeTimePicker();

    // 既存の時間があれば時間ピッカーに反映
    if (existingTime) {
        const [hour, minute] = existingTime.split(":");
        document.getElementById("hourSelect").value = hour;
        document.getElementById("minuteSelect").value = minute;
        selectedTime = existingTime;
        updateTimeBtnText();
    }

    renderCalendar();
    openModal("dateSelectModal");
}

/**
 * 時間ピッカーを初期化
 * 時のドロップダウンに0-23の選択肢を追加
 */
function initializeTimePicker() {
    const hourSelect = document.getElementById("hourSelect");
    if (!hourSelect) return;

    // 時のドロップダウンに0-23の選択肢を追加（初回のみ）
    if (hourSelect.options.length <= 1) {
        for (let i = 0; i < 24; i++) {
            const option = document.createElement("option");
            option.value = String(i).padStart(2, "0");
            option.textContent = String(i).padStart(2, "0");
            hourSelect.appendChild(option);
        }
    }

    // 選択状態をリセット
    hourSelect.value = "";
    document.getElementById("minuteSelect").value = "";
    selectedTime = null;

    // 時間ピッカーを非表示にする
    const timePickerContainer = document.getElementById("timePickerContainer");
    if (timePickerContainer) {
        timePickerContainer.style.display = "none";
    }

    // 時間選択ボタンのアクティブ状態を解除
    const timeBtn = document.getElementById("timeBtn");
    if (timeBtn) {
        timeBtn.classList.remove("active");
    }

    updateTimeBtnText();
}

/**
 * 時間ピッカーの表示/非表示を切り替え
 */
function toggleTimePicker() {
    const timePickerContainer = document.getElementById("timePickerContainer");
    const timeBtn = document.getElementById("timeBtn");

    if (!timePickerContainer) return;

    if (timePickerContainer.style.display === "none") {
        timePickerContainer.style.display = "block";
        if (timeBtn) timeBtn.classList.add("active");
    } else {
        timePickerContainer.style.display = "none";
        if (timeBtn) timeBtn.classList.remove("active");
    }
}

/**
 * 時間選択を更新
 * 時と分の両方が選択されている場合のみ selectedTime を更新
 */
function updateTimeSelection() {
    const hourSelect = document.getElementById("hourSelect");
    const minuteSelect = document.getElementById("minuteSelect");

    if (!hourSelect || !minuteSelect) return;

    const hour = hourSelect.value;
    const minute = minuteSelect.value;

    if (hour && minute) {
        selectedTime = `${hour}:${minute}`;
    } else {
        selectedTime = null;
    }

    updateTimeBtnText();
}

/**
 * 時間選択をクリア
 */
function clearTimeSelection() {
    const hourSelect = document.getElementById("hourSelect");
    const minuteSelect = document.getElementById("minuteSelect");

    if (hourSelect) hourSelect.value = "";
    if (minuteSelect) minuteSelect.value = "";

    selectedTime = null;
    updateTimeBtnText();
}

/**
 * 時間選択ボタンのテキストを更新
 */
function updateTimeBtnText() {
    const timeBtnText = document.getElementById("timeBtnText");
    if (!timeBtnText) return;

    if (selectedTime) {
        timeBtnText.textContent = selectedTime;
    } else {
        timeBtnText.textContent = "時間を選択";
    }
}

/**
 * カレンダーを描画
 * 前月・当月・次月の日付を含む6週間分のカレンダーグリッドを生成
 */
function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const monthNames = [
        "1月",
        "2月",
        "3月",
        "4月",
        "5月",
        "6月",
        "7月",
        "8月",
        "9月",
        "10月",
        "11月",
        "12月",
    ];
    const currentMonthEl = document.getElementById("currentMonth");
    if (currentMonthEl) {
        currentMonthEl.textContent = `${currentYear}年 ${monthNames[currentMonth]}`;
    }

    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    calendarGrid.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        const date = new Date(currentYear, currentMonth - 1, day);
        calendarGrid.innerHTML += createDayCell(day, date, true);
    }

    for (let day = 1; day <= lastDate; day++) {
        const date = new Date(currentYear, currentMonth, day);
        calendarGrid.innerHTML += createDayCell(day, date, false);
    }

    const remainingCells = 42 - (firstDayOfWeek + lastDate);
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(currentYear, currentMonth + 1, day);
        calendarGrid.innerHTML += createDayCell(day, date, true);
    }

    document.querySelectorAll(".calendar-day").forEach((dayElement) => {
        dayElement.addEventListener("click", function () {
            const dateStr = this.dataset.date;
            selectedDate = new Date(dateStr);
            renderCalendar();
        });
    });
}

/**
 * カレンダーの日付セルHTMLを生成
 * @param {number} day - 日
 * @param {Date} date - 日付オブジェクト
 * @param {boolean} isOtherMonth - 前月または次月の日付かどうか
 * @returns {string} 日付セルのHTML文字列
 */
function createDayCell(day, date, isOtherMonth) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    // 日付のみで比較する
    const isToday = date.getTime() === today.getTime();
    const isSelected =
        selectedDate && date.getTime() === selectedDate.getTime();
    const dayOfWeek = date.getDay();

    let classes = ["calendar-day"];
    if (isOtherMonth) classes.push("other-month");
    if (isToday) classes.push("today");
    if (isSelected) classes.push("selected");
    if (dayOfWeek === 0) classes.push("sunday");
    if (dayOfWeek === 6) classes.push("saturday");

    return `<div class="${classes.join(" ")}" data-date="${date.toISOString()}">${day}</div>`;
}

/**
 * 日付ショートカットを選択する関数
 * today / tomorrow / weekend / nextWeek の種類に応じて selectedDate を更新する
 */
function selectShortcut(type) {
    // 今日の日付を取得
    const date = new Date();
    // 時刻を 00:00:00 にリセット（時間のズレを防ぐため）
    date.setHours(0, 0, 0, 0);

    if (type === "today") {
        // baseがすでに'今日'なので何もしない
    }

    if (type === "tomorrow") {
        date.setDate(date.getDate() + 1);
    }

    if (type === "weekend") {
        const diff = (5 - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + diff);
    }

    if (type === "nextWeek") {
        const diff = (8 - date.getDay()) % 7 || 7;
        date.setDate(date.getDate() + diff);
    }

    selectedDate = date;
    currentYear = date.getFullYear();
    currentMonth = date.getMonth();

    renderCalendar();
}

/**
 * カレンダーの表示月を変更
 * @param {number} delta - 月の増減値（-1で前月、+1で次月）
 */
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

/**
 * 選択された日付をタスクの期限フィールドに適用
 */
function saveDateSelection() {
    if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const day = selectedDate.getDate();

        // 表示形式（MM月DD日）
        let formattedDate = `${month}月${day}日`;

        // 時間が選択されている場合は追加
        if (selectedTime) {
            formattedDate += ` ${selectedTime}`;
        }

        const detailDate = document.getElementById("detailDate");
        if (detailDate) {
            detailDate.textContent = formattedDate;
            // 日付と時間を分離（API送信用）
            detailDate.dataset.date = `${year}年${month}月${day}日`;
            detailDate.dataset.time = selectedTime || "";
        }
    }
    closeModal("dateSelectModal");
}

/**
 * 日付選択をクリアして「指定なし」に戻す
 */
function clearDateSelection() {
    selectedDate = null;
    selectedTime = null;
    const detailDate = document.getElementById("detailDate");
    if (detailDate) {
        detailDate.textContent = "指定なし";
        // API送信時に空のデータを送るため
        detailDate.dataset.date = "";
        detailDate.dataset.time = "";
    }
    closeModal("dateSelectModal");
}

//==============================================================================
// 9. 絞り込みフィルター
//==============================================================================

/**
 *  検索フィルタパネルの開閉
 */
function toggleSearchFilter() {
    const panel = document.getElementById("searchFilterPanel");
    panel.classList.toggle("open");
}

/**
 * 検索フィルター変更時の処理
 */
function onSearchFilterChange() {
    document.querySelectorAll(".search-filter-select").forEach((el) => {
        el.classList.toggle("active", el.value !== "" && !el.disabled);
    });
    updateSearchFilterBtnState();
    filterTasks(currentFilter);
}

// 検索フィルターのイベント登録
document.addEventListener("DOMContentLoaded", () => {
    const searchFilterToggleBtn = document.getElementById(
        "searchFilterToggleBtn",
    );
    if (searchFilterToggleBtn) {
        searchFilterToggleBtn.addEventListener("click", toggleSearchFilter);
    }

    const searchAssigneeFilter = document.getElementById(
        "searchAssigneeFilter",
    );
    const searchPriorityFilter = document.getElementById(
        "searchPriorityFilter",
    );
    const searchDueFilter = document.getElementById("searchDueFilter");

    if (searchAssigneeFilter)
        searchAssigneeFilter.addEventListener("change", onSearchFilterChange);
    if (searchPriorityFilter)
        searchPriorityFilter.addEventListener("change", onSearchFilterChange);
    if (searchDueFilter)
        searchDueFilter.addEventListener("change", onSearchFilterChange);

    // 初期タブ（self）に合わせて担当者ドロップダウンを設定
    updateSearchAssigneeFilter("self");
});

/**
 * タブに応じて担当者ドロップダウンを更新 'self'は ログインユーザーを固定
 */
function updateSearchAssigneeFilter(filter) {
    const searchAssigneeFilter = document.getElementById(
        "searchAssigneeFilter",
    );
    if (!searchAssigneeFilter) return;

    searchAssigneeFilter.innerHTML = "";
    searchAssigneeFilter.classList.remove("active");

    if (filter === "self") {
        const opt = document.createElement("option");
        opt.value = CURRENT_USER;
        opt.textContent = CURRENT_USER;
        searchAssigneeFilter.appendChild(opt);
        searchAssigneeFilter.disabled = true;
    } else if (filter === "member") {
        searchAssigneeFilter.disabled = false;
        const members = MEMBERS.filter((m) => m.name !== CURRENT_USER);
        [
            { value: "", label: "担当者" },
            ...members.map((m) => ({ value: m.name, label: m.name })),
        ].forEach(({ value, label }) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = label;
            searchAssigneeFilter.appendChild(opt);
        });
    } else if (filter === "unassigned") {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "担当者なし";
        searchAssigneeFilter.appendChild(opt);
        searchAssigneeFilter.disabled = true;
    } else {
        searchAssigneeFilter.disabled = false;
        [
            { value: "", label: "担当者" },
            ...MEMBERS.map((m) => ({ value: m.name, label: m.name })),
        ].forEach(({ value, label }) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = label;
            searchAssigneeFilter.appendChild(opt);
        });
    }
}

/**
 * 絞り込みボタンの状態を更新（絞り込み中ラベルの切り替え）
 */
function updateSearchFilterBtnState() {
    const searchAssigneeFilter = document.getElementById(
        "searchAssigneeFilter",
    );
    const priority = document.getElementById("searchPriorityFilter").value;
    const due = document.getElementById("searchDueFilter").value;
    const hasFilter =
        (!searchAssigneeFilter.disabled && searchAssigneeFilter.value !== "") ||
        priority !== "" ||
        due !== "";

    document
        .getElementById("searchFilterToggleBtn")
        .classList.toggle("has-filter", hasFilter);
}
