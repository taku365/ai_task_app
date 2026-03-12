//==============================================================================
// 0. 設定（定数）
//==============================================================================

/** 現在のログインユーザー名 */
const CURRENT_USER = "松田";

/** タスク担当者として選択可能なメンバーリスト */
const MEMBERS = [
    { id: 1, name: "松本" },
    { id: 2, name: "野中" },
    { id: 3, name: "宮原" },
    { id: 4, name: "安岡" },
    { id: 5, name: "白石" },
    { id: 6, name: "松波" },
    { id: 7, name: "阪本" },
    { id: 8, name: "松田" },
];

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

//==============================================================================
// 2. ユーティリティ（共通関数）
//==============================================================================

/**
 * データベースの日付形式を日本語の年月日形式に変換
 * @param {string|null} dateString - YYYY-MM-DD HH:MM:SS形式の日付文字列
 * @returns {string} YYYY年MM月DD日形式の文字列、またはnullの場合は「指定なし」
 */
function formatDate(dateString) {
    if (!dateString) return "指定なし";

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${year}年${month}月${day}日`;
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
 * Laravel APIから返されたDB形式のタスクをフロントエンド形式に変換
 * @param {Object} dbTask - データベース形式のタスクオブジェクト
 * @returns {Object} フロントエンド表示用に変換されたタスクオブジェクト
 */
function transformTaskData(dbTask) {
    return {
        id: dbTask.id,
        aiTask: dbTask.ai_task,
        textInput: dbTask.text_input,
        date: formatDate(dbTask.due_date),
        assignee: dbTask.assignee?.name || "指定なし",
        priority: dbTask.priority?.name || "指定なし",
        priorityCode: dbTask.priority?.code || "none",
        completedFlg: dbTask.completed_flg === true,
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
    console.log("DOMContentLoaded fired");

    setupEventListeners();

    // Bladeからフィルタを取得
    const filterTabsContainer = document.querySelector(".filter-tabs");
    console.log("filterTabsContainer:", filterTabsContainer);
    const filter = filterTabsContainer?.dataset.filter || "self";

    // 初期表示: 取得したフィルタでタスク一覧を表示
    filterTasks(filter);
    console.log("initial filter:", filter);
});

//==============================================================================
// 4. イベント登録
//==============================================================================

/**
 * 全てのUIコンポーネントにイベントリスナーを設定
 */
function setupEventListeners() {
    const voiceInputBtn = document.getElementById("voiceInputBtn");
    if (voiceInputBtn) {
        voiceInputBtn.addEventListener("click", () => {
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
            renderMemberList();
        });
    }

    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".priority-btn").forEach((b) => {
                b.classList.remove("active", "high", "medium", "low");
            });
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
        deleteTaskBtn.addEventListener("click", deleteTask);
    }

    // ユーザーがフィルターをクリックした際の処理
    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.addEventListener("click", (e) => {
            const filter = e.target.dataset.filter;
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

//==============================================================================
// 6. タスク操作
//==============================================================================

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
    // 空のオブジェクトでcurrentTaskを初期化
    currentTask = {
        textInput: "",
        aiTask: "",
        date: "指定なし",
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
    document.getElementById("detailDate").textContent = "指定なし";
    document.getElementById("detailAssignee").textContent = CURRENT_USER;
    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.classList.remove("active", "high", "medium", "low");
    });

    // 完了ボタンを非表示にする（新規作成時）
    document.getElementById("completeTaskBtn").classList.add("hidden");

    // 保存ボタンのイベントリスナーを設定（新規作成用）
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    saveTaskBtn.addEventListener("click", createNewTask);

    openModal("taskDetailModal");
}

/**
 * 既存タスクの詳細モーダルを開く
 * @param {Object} task - 表示するタスクオブジェクト
 */
// ★★★ inline onclick を辞める必要がある
// eslint-disable-next-line no-unused-vars
function openTaskDetailModal(taskId) {
    // currentTaskListから取得したタスクで初期化
    const task = currentTaskList.find((t) => t.id === taskId);
    if (!task) return;
    currentTask = task;

    // 画面表示（編集）
    document.getElementById("textInputField").value = task.aiTask;
    document.getElementById("detailDate").textContent = task.date;
    document.getElementById("detailAssignee").textContent =
        task.assignee === CURRENT_USER ? CURRENT_USER : task.assignee;
    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.classList.remove("active", "high", "medium", "low");
        if (btn.dataset.priority === task.priority) {
            btn.classList.add("active");
            if (task.priority === "高") btn.classList.add("high");
            if (task.priority === "中") btn.classList.add("medium");
            if (task.priority === "低") btn.classList.add("low");
        }
    });

    // 保存ボタンのイベントリスナーを設定（編集用）
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    saveTaskBtn.addEventListener("click", editTask);

    openModal("taskDetailModal");
}

/**
 * 新規タスクを作成（AI解析あり）
 * 1. ユーザー入力をAI解析
 * 2. 解析結果とユーザーの手動入力をマージ
 * 3. データベースに保存
 */
async function createNewTask() {
    if (!currentTask) return;

    // 入力チェック
    const textInput = document.getElementById("textInputField").value.trim();
    if (!textInput) {
        alert("タスク名を入力してください");
        return;
    }

    // ボタンを「解析中...」に変更
    const saveBtn = document.getElementById("saveTaskBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "解析中...";

    try {
        // AI解析APIにリクエストを送信
        const response = await fetch("/api/tasks/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                text_input: textInput,
            }),
        });

        // AI解析APIのレスポンス(JSON)を取得
        // 例: { success: true, message: "...", data: {...} }
        const result = await response.json();

        if (!result.success) {
            alert("エラー: " + (result.message || "AI解析に失敗しました"));
            return;
        }

        // APIレスポンスの data 部分だけを取り出す(dataにAIが解析したタスク情報が入っている)
        // 例: { aiTask: "...", date: "...", assignee: "...", priority: "..." }
        const parsedTask = result.data;

        // AI解析結果をcurrentTaskに反映
        currentTask.textInput = textInput;
        currentTask.aiTask = parsedTask.aiTask || textInput;
        currentTask.date = parsedTask.date || "指定なし";
        currentTask.assignee = parsedTask.assignee || "指定なし";
        currentTask.priority = parsedTask.priority || "指定なし";

        // ユーザーの手動入力で上書き(日付、担当者、優先度)
        const manualDate = document.getElementById("detailDate").textContent;
        if (manualDate && manualDate !== "指定なし") {
            currentTask.date = manualDate;
        }

        const manualAssignee =
            document.getElementById("detailAssignee").textContent;
        if (manualAssignee) {
            currentTask.assignee = manualAssignee;
        }

        const manualPriority = document.querySelector(".priority-btn.active")
            ?.dataset.priority;
        if (manualPriority) {
            currentTask.priority = manualPriority;
        }

        // 新規作成APIにリクエストを送信
        const saveResponse = await fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken,
                Accept: "application/json",
            },
            body: JSON.stringify({
                ai_task: currentTask.aiTask,
                text_input: currentTask.textInput,
                date: currentTask.date,
                assignee: currentTask.assignee,
                priority: currentTask.priority,
            }),
        });

        // 新規作成APIのレスポンス(JSON)を取得
        const saveResult = await saveResponse.json();

        // エラー
        if (!saveResult.success) {
            alert("作成に失敗しました: " + (saveResult.message || ""));
            return;
        }

        // 成功時はモーダルを閉じる
        closeModal("taskDetailModal");

        // タスク一覧を更新 ※currentTaskListを更新
        await filterTasks(currentFilter);
    } catch (error) {
        alert("エラー: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "保存";
    }
}

/**
 * 既存タスクを編集（AI解析なし）
 * 1. ユーザーの手動入力を取得
 * 2. データベースに保存
 */
async function editTask() {
    if (!currentTask || !currentTask.id) return;

    // 入力チェック
    const textInput = document.getElementById("textInputField").value.trim();
    if (!textInput) {
        alert("タスク名を入力してください");
        return;
    }

    const saveBtn = document.getElementById("saveTaskBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "保存中...";
    try {
        // currentTaskを更新
        currentTask.textInput = textInput;
        currentTask.aiTask = textInput; // 編集時はテキスト入力をそのまま使用

        // ユーザーの手動入力を取得
        const manualDate = document.getElementById("detailDate").textContent;
        currentTask.date = manualDate || "指定なし";

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
                assignee: currentTask.assignee,
                priority: currentTask.priority,
            }),
        });
        const saveResult = await saveResponse.json();
        if (!saveResult.success) {
            alert("更新に失敗しました: " + (saveResult.message || ""));
            return;
        }
        // モーダルを閉じる
        closeModal("taskDetailModal");

        // currentTaskListの該当タスクを更新
        const editTaskIndex = currentTaskList.findIndex(
            (t) => t.id === currentTask.id,
        );
        if (editTaskIndex !== -1) {
            currentTaskList[editTaskIndex] = {
                ...currentTaskList[editTaskIndex],
                aiTask: currentTask.aiTask,
                textInput: currentTask.textInput,
                date: currentTask.date,
                assignee: currentTask.assignee,
                priority: currentTask.priority,
            };
        }

        // 画面を再描画
        const container = document.getElementById("taskListContainer");
        const isCompleted = currentFilter === "completed";
        container.innerHTML = currentTaskList
            .map((task) => renderTaskItem(task, isCompleted))
            .join("");
    } catch (error) {
        alert("エラー: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "保存";
    }
}

/**
 * タスク削除の確認ダイアログを表示
 * 他メンバーのタスクの場合は専用のアラートモーダルを表示
 */
function deleteTask() {
    if (!currentTask) return;

    // 他メンバーのタスクの場合は確認アラートを表示
    if (isOtherMemberTask(currentTask)) {
        const assigneeName = currentTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `このタスクは<strong>${assigneeName}</strong>さんに割り当てられています。削除してもよろしいですか?`,
            "削除する",
            () => executeDeleteTask(),
            "fas fa-trash",
        );
        return;
    }

    // 自分のタスクの場合は通常の確認ダイアログを表示
    if (confirm("このタスクを削除しますか?")) {
        executeDeleteTask();
    }
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

        // タスク一覧を描画するコンテナを取得
        const container = document.getElementById("taskListContainer");

        // タスクがない場合
        if (currentTaskList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>タスクがありません</p>
                </div>
            `;
            return;
        }

        // 現在のフィルター状態が 完了フィルターか判定
        const isCompleted = currentFilter === "completed";

        // タスク一覧HTMLを生成して、タスク表示エリアに表示
        container.innerHTML = currentTaskList
            .map((task) => renderTaskItem(task, isCompleted))
            .join("");
    } catch (error) {
        alert("エラー: " + error.message);
    }
}

/**
 * タスク完了の確認処理
 * 他メンバーのタスクの場合は確認アラートを表示
 */
function completeTask() {
    if (!currentTask) return;

    if (isOtherMemberTask(currentTask)) {
        const assigneeName = currentTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `このタスクは<strong>${assigneeName}</strong>さんに割り当てられています。完了にしてもよろしいですか?`,
            "完了にする",
            () => executeCompleteTask(),
            "fas fa-user",
        );
        return;
    }

    executeCompleteTask();
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

        // "self" | "member" | "unassigned" の場合
        // currentTaskListから完了したタスクを除外
        if (currentFilter !== "completed") {
            currentTaskList = currentTaskList.filter(
                (t) => t.id !== completedTaskId,
            );
        }

        // タスク一覧を描画するコンテナを取得
        const container = document.getElementById("taskListContainer");

        // タスクがない場合
        if (currentTaskList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>タスクがありません</p>
                </div>
            `;
            return;
        }

        // 現在のフィルター状態が 完了フィルターか判定
        const isCompleted = currentFilter === "completed";

        // タスク一覧HTMLを生成して、タスク表示エリアに表示
        container.innerHTML = currentTaskList
            .map((task) => renderTaskItem(task, isCompleted))
            .join("");
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
    // 同じフィルタで、かつ既にデータがある場合のみスキップ
    if (currentFilter === filter && currentTaskList.length > 0) return;

    // 現在のフィルタ変数を更新
    currentFilter = filter;

    // URLを更新（リロード時に状態を保持するため）
    const url = new URL(window.location);
    url.searchParams.set("filter", filter); // URLのクエリパラメータfilterに変数のfilterをセットする
    window.history.pushState({}, "", url); // ブラウザを再読み込みせず、表示中のURLだけ書き換える

    // タブのactive状態を更新（画面の見た目)
    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.classList.remove("active");
        if (tab.dataset.filter === filter) {
            tab.classList.add("active");
        }
    });

    try {
        // タスク一覧取得APIにリクエストを送信（フィルター条件付き）
        const response = await fetch(`/api/tasks?filter=${filter}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // APIレスポンス(JSON)を取得
        const data = await response.json();
        // - レスポンスの tasks 配列を取り出し、画面表示用データに変換
        const transformedTasks = data.tasks.map(transformTaskData);
        // - currentTaskListに保持する
        currentTaskList = transformedTasks;

        // タスク一覧を描画するコンテナを取得
        const container = document.getElementById("taskListContainer");

        // タスクがない場合
        if (transformedTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>タスクがありません</p>
                </div>
            `;
            return;
        }

        // 完了タスク表示モードかどうかを判定
        const isCompleted = filter === "completed";

        // タスク一覧HTMLを生成して、タスク表示エリアに表示
        container.innerHTML = transformedTasks
            .map((task) => renderTaskItem(task, isCompleted))
            .join("");
    } catch (error) {
        console.error("タスクの取得に失敗しました:", error);
        showErrorMessage("タスクの読み込みに失敗しました");
    }
}

/**
 * タスクアイテムのHTMLを生成
 * @param {Object} task - タスクオブジェクト
 * @param {boolean} [isCompleted=false] - 完了タスク表示モードかどうか
 * @returns {string} タスクアイテムのHTML文字列
 */
function renderTaskItem(task, isCompleted = false) {
    const completedClass = isCompleted ? "completed-task" : "";
    const checkboxContent = isCompleted ? '<i class="fas fa-check"></i>' : "";

    return `
        <div class="task-item ${completedClass}" onclick="openTaskDetailModal(${task.id})">
            ${isCompleted ? renderCompletedInfo(task, checkboxContent, getPriorityClass(task.priority)) : ""}
            <div class="task-item-top">
                ${!isCompleted ? `<div class="task-checkbox ${getPriorityClass(task.priority)}">${checkboxContent}</div>` : ""}
                <div class="task-title">${task.aiTask}</div>
            </div>
            <div class="task-meta">
                <div class="task-meta-item">
                    <i class="far fa-calendar"></i>
                    <span>${task.date}</span>
                </div>
                <div class="task-meta-item">
                    <i class="far fa-user"></i>
                    <span>${task.assignee}</span>
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
            <span class="completed-by"><strong class="completed-by-name">${completedByName}</strong>がタスクを完了しました</span>
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

    memberList.innerHTML = MEMBERS.map(
        (member) => `
            <div class="member-item" onclick="selectMemberInMemberSelectModal(${member.id})">
                <div class="member-avatar">${member.name.charAt(0)}</div>
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
// eslint-disable-next-line no-unused-vars
function selectMemberInMemberSelectModal(memberId) {
    selectedMember = memberId;
    renderMemberList();
}

/**
 * 選択中のメンバーをタスクの担当者フィールドに適用
 */
function applyMemberInMemberSelectModal() {
    if (selectedMember) {
        const member = MEMBERS.find((m) => m.id === selectedMember);
        if (member) {
            document.getElementById("detailAssignee").textContent = member.name;
        }
    }
    closeModal("memberSelectModal");
}

/**
 * 日付選択モーダルを開く
 * 初期表示は今日の日付を選択状態にする
 */
function openDateSelectModal() {
    const today = new Date();
    selectedDate = today;
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    initializeTimePicker();
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
        const formatted = `${year}年${month}月${day}日`;

        const detailDate = document.getElementById("detailDate");
        if (detailDate) {
            detailDate.textContent = formatted;
        }
    }
    closeModal("dateSelectModal");
}

/**
 * 日付選択をクリアして「指定なし」に戻す
 */
function clearDateSelection() {
    selectedDate = null;
    const detailDate = document.getElementById("detailDate");
    if (detailDate) {
        detailDate.textContent = "指定なし";
    }
    closeModal("dateSelectModal");
}
