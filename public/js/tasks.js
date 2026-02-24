// 現在のログインユーザー
const CURRENT_USER = "松田";

// メンバーリスト
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

// 現在編集中のタスク
let currentTask = null;
let selectedMember = null;

// 日付選択用の変数
let selectedDate = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// アラート用の変数
let alertCallback = null;

// 初期化
document.addEventListener("DOMContentLoaded", () => {
    loadTasks();
    setupEventListeners();
});

// イベントリスナー設定
function setupEventListeners() {
    // 音声入力ボタン
    const voiceInputBtn = document.getElementById("voiceInputBtn");
    if (voiceInputBtn) {
        voiceInputBtn.addEventListener("click", () => {
            openNewTaskModal();
        });
    }

    // モーダルを閉じる
    const closeInputModal = document.getElementById("closeInputModal");
    if (closeInputModal) {
        closeInputModal.addEventListener("click", () => {
            closeModal("inputModal");
        });
    }

    const closeTaskDetailModal = document.getElementById("closeTaskDetailModal");
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

    // タスク送信
    const submitTask = document.getElementById("submitTask");
    if (submitTask) {
        submitTask.addEventListener("click", saveTaskWithoutAI);
    }

    // 担当者フィールドクリック
    const assigneeField = document.getElementById("assigneeField");
    if (assigneeField) {
        assigneeField.addEventListener("click", () => {
            openMemberSelect();
        });
    }

    // 日付フィールドクリック
    const dateField = document.getElementById("dateField");
    if (dateField) {
        dateField.addEventListener("click", () => {
            openDateSelectModal();
        });
    }

    // メンバー選択
    const applyMemberBtn = document.getElementById("applyMemberBtn");
    if (applyMemberBtn) {
        applyMemberBtn.addEventListener("click", applyMember);
    }

    const clearMemberBtn = document.getElementById("clearMemberBtn");
    if (clearMemberBtn) {
        clearMemberBtn.addEventListener("click", () => {
            selectedMember = null;
            renderMemberList();
        });
    }

    // 優先度ボタン
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

    // タスク保存
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener("click", saveTask);
    }

    // タスク完了
    const completeTaskBtn = document.getElementById("completeTaskBtn");
    if (completeTaskBtn) {
        completeTaskBtn.addEventListener("click", completeTask);
    }

    // タスク削除
    const deleteTaskBtn = document.getElementById("deleteTaskBtn");
    if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener("click", deleteTask);
    }

    // フィルタータブ
    document.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
            e.target.classList.add("active");
            const filter = e.target.dataset.filter;
            filterTasks(filter);
        });
    });

    // 日付選択モーダルのイベント
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

    // アラートモーダル
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

// モーダル開閉
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
    }
}

// アラート表示
function showAlert(title, message, confirmText, callback, iconClass = "fas fa-user") {
    document.getElementById("alertTitle").textContent = title;
    document.getElementById("alertMessage").innerHTML = message;
    document.getElementById("alertConfirmBtn").textContent = confirmText;
    document.getElementById("alertIconContent").className = iconClass;

    alertCallback = callback;
    openModal("alertModal");
}

// 他メンバーのタスクかチェック
function isOtherMemberTask(task) {
    return (
        task.assignee !== CURRENT_USER &&
        task.assignee !== "あなた" &&
        task.assignee !== "松田" &&
        task.assignee !== "指定なし"
    );
}

// 新規タスクモーダルを開く
function openNewTaskModal() {
    currentTask = {
        id: Date.now(),
        rawInput: "",
        task: "",
        date: "指定なし",
        assignee: CURRENT_USER,
        priority: "指定なし",
        createdBy: CURRENT_USER,
        createdAt: new Date().toISOString(),
        completed: false,
    };

    document.getElementById("detailTaskTitle").value = "";
    document.getElementById("detailDate").textContent = "指定なし";
    document.getElementById("detailAssignee").textContent = "あなた";

    // 優先度ボタンをリセット
    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.classList.remove("active", "high", "medium", "low");
    });

    openModal("taskDetailModal");
}

// タスク詳細を表示
function showTaskDetail(task) {
    currentTask = task;
    document.getElementById("detailTaskTitle").value = task.task;
    document.getElementById("detailDate").textContent = task.date;
    document.getElementById("detailAssignee").textContent =
        task.assignee === CURRENT_USER ||
        task.assignee === "松田" ||
        task.assignee === "あなた"
            ? "あなた"
            : task.assignee;

    // 優先度ボタンを設定
    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.classList.remove("active", "high", "medium", "low");
        if (btn.dataset.priority === task.priority) {
            btn.classList.add("active");
            if (task.priority === "高") btn.classList.add("high");
            if (task.priority === "中") btn.classList.add("medium");
            if (task.priority === "低") btn.classList.add("low");
        }
    });

    openModal("taskDetailModal");
}

// タスク保存（AI解析なし - 一時的）
function saveTaskWithoutAI() {
    if (!currentTask) return;

    const taskTitle = document.getElementById("detailTaskTitle").value.trim();
    if (!taskTitle) {
        alert("タスク名を入力してください");
        return;
    }

    currentTask.task = taskTitle;
    currentTask.rawInput = taskTitle;

    // localStorageに保存
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const existingIndex = tasks.findIndex((t) => t.id === currentTask.id);

    if (existingIndex >= 0) {
        tasks[existingIndex] = currentTask;
    } else {
        tasks.push(currentTask);
    }

    localStorage.setItem("tasks", JSON.stringify(tasks));

    closeModal("taskDetailModal");
    loadTasks();
}

// タスク保存（AI解析あり）
async function saveTask() {
    if (!currentTask) return;

    const taskTitle = document.getElementById("detailTaskTitle").value.trim();
    if (!taskTitle) {
        alert("タスク名を入力してください");
        return;
    }

    const saveBtn = document.getElementById("saveTaskBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "解析中...";

    try {
        // CSRFトークンを取得
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        // LaravelのAPIエンドポイントを呼び出し
        const response = await fetch('/api/tasks/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                task_input: taskTitle
            })
        });

        const result = await response.json();

        if (!result.success) {
            alert('エラー: ' + (result.message || 'AI解析に失敗しました'));
            return;
        }

        // AI解析結果を取得
        const parsedTask = result.data;

        // 現在のタスクを更新
        currentTask.rawInput = taskTitle;
        currentTask.task = parsedTask.task || taskTitle;
        currentTask.date = parsedTask.date || "指定なし";
        currentTask.assignee = parsedTask.assignee || "指定なし";
        currentTask.priority = parsedTask.priority || "指定なし";

        // 手動選択があればそれで上書き
        const manualDate = document.getElementById("detailDate").textContent;
        if (manualDate && manualDate !== "指定なし") {
            currentTask.date = manualDate;
        }

        const manualAssignee = document.getElementById("detailAssignee").textContent;
        if (manualAssignee && manualAssignee !== "あなた") {
            currentTask.assignee = manualAssignee;
        }

        // 優先度の手動選択チェック
        const manualPriority = document.querySelector(".priority-btn.active")?.dataset.priority;
        if (manualPriority) {
            currentTask.priority = manualPriority;
        }

        // localStorageに保存
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        const existingIndex = tasks.findIndex((t) => t.id === currentTask.id);

        if (existingIndex >= 0) {
            tasks[existingIndex] = currentTask;
        } else {
            tasks.push(currentTask);
        }

        localStorage.setItem("tasks", JSON.stringify(tasks));

        closeModal("taskDetailModal");
        loadTasks();
    } catch (error) {
        alert("エラー: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "保存";
    }
}

// タスク削除
function deleteTask() {
    if (!currentTask) return;

    // 他メンバーのタスクの場合はアラート表示
    if (isOtherMemberTask(currentTask)) {
        const assigneeName = currentTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `このタスクは<strong>${assigneeName}</strong>さんに割り当てられています。削除してもよろしいですか?`,
            "削除する",
            () => executeDeleteTask(),
            "fas fa-trash"
        );
        return;
    }

    // 自分のタスクの場合は通常の確認ダイアログ
    if (confirm("このタスクを削除しますか?")) {
        executeDeleteTask();
    }
}

// タスク削除実行
function executeDeleteTask() {
    if (!currentTask) return;

    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const filteredTasks = tasks.filter((t) => t.id !== currentTask.id);
    localStorage.setItem("tasks", JSON.stringify(filteredTasks));

    closeModal("taskDetailModal");
    loadTasks();
}

// タスク完了
function completeTask() {
    if (!currentTask) return;

    // 他メンバーのタスクの場合はアラート表示
    if (isOtherMemberTask(currentTask)) {
        const assigneeName = currentTask.assignee;
        showAlert(
            "他メンバーのタスクです",
            `このタスクは<strong>${assigneeName}</strong>さんに割り当てられています。完了にしてもよろしいですか?`,
            "完了にする",
            () => executeCompleteTask(),
            "fas fa-user"
        );
        return;
    }

    executeCompleteTask();
}

// タスク完了実行
function executeCompleteTask() {
    if (!currentTask) return;

    // 完了情報を追加
    currentTask.completed = true;
    currentTask.completedAt = new Date().toISOString();
    currentTask.completedBy = CURRENT_USER;

    // localStorageを更新
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const taskIndex = tasks.findIndex((t) => t.id === currentTask.id);

    if (taskIndex >= 0) {
        tasks[taskIndex] = currentTask;
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }

    closeModal("taskDetailModal");
    loadTasks();
}

// タスク一覧を読み込み
function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const container = document.getElementById("taskListContainer");

    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>タスクがありません</p>
            </div>
        `;
        return;
    }

    // 自分のタスクのみ表示（デフォルトフィルター）
    const filteredTasks = tasks.filter(
        (t) =>
            !t.completed &&
            (t.assignee === CURRENT_USER ||
                t.assignee === "あなた" ||
                t.assignee === "松田" ||
                t.assignee === "指定なし")
    );

    renderTaskList(filteredTasks, container, false);
}

// タスク編集
function editTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
        showTaskDetail(task);
    }
}

// 優先度クラス取得
function getPriorityClass(priority) {
    if (priority === "高") return "priority-high";
    if (priority === "中") return "priority-medium";
    return "";
}

// タスクフィルター
function filterTasks(filter) {
    const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    const container = document.getElementById("taskListContainer");

    if (!container) return;

    let filteredTasks = [];

    switch (filter) {
        case "self":
            filteredTasks = tasks.filter(
                (t) =>
                    !t.completed &&
                    (t.assignee === CURRENT_USER ||
                        t.assignee === "あなた" ||
                        t.assignee === "松田" ||
                        t.assignee === "指定なし")
            );
            renderTaskList(filteredTasks, container, false);
            break;
        case "member":
            filteredTasks = tasks.filter(
                (t) =>
                    !t.completed &&
                    t.assignee !== CURRENT_USER &&
                    t.assignee !== "あなた" &&
                    t.assignee !== "松田" &&
                    t.assignee !== "指定なし"
            );
            renderTaskList(filteredTasks, container, false);
            break;
        case "unassigned":
            filteredTasks = tasks.filter(
                (t) =>
                    !t.completed &&
                    (t.assignee === "指定なし" || t.priority === "指定なし")
            );
            renderUnassignedTasks(filteredTasks, container);
            break;
        case "completed":
            filteredTasks = tasks.filter((t) => t.completed);
            renderCompletedTasks(filteredTasks, container);
            break;
    }
}

// 通常のタスクリスト表示
function renderTaskList(tasks, container, isCompleted = false) {
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>タスクがありません</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks
        .reverse()
        .map((task) => renderTaskItem(task, isCompleted))
        .join("");
}

// タスクアイテムのHTML生成
function renderTaskItem(task, isCompleted = false) {
    const completedClass = isCompleted ? "completed-task" : "";
    const checkboxContent = isCompleted ? '<i class="fas fa-check"></i>' : "";

    return `
        <div class="task-item ${completedClass}" onclick="editTask(${task.id})">
            ${isCompleted ? renderCompletedInfo(task, checkboxContent, getPriorityClass(task.priority)) : ""}
            <div class="task-item-top">
                ${!isCompleted ? `<div class="task-checkbox ${getPriorityClass(task.priority)}">${checkboxContent}</div>` : ""}
                <div class="task-title">${task.task}</div>
            </div>
            <div class="task-meta">
                <div class="task-meta-item">
                    <i class="far fa-calendar"></i>
                    <span>${task.date}</span>
                </div>
                <div class="task-meta-item">
                    <i class="far fa-user"></i>
                    <span>${task.assignee === CURRENT_USER || task.assignee === "松田" || task.assignee === "あなた" ? "あなた" : task.assignee}</span>
                </div>
                <div class="task-meta-item ${getPriorityClass(task.priority)}">
                    <i class="fas fa-flag"></i>
                    <span>${task.priority}</span>
                </div>
            </div>
        </div>
    `;
}

// 完了情報の表示
function renderCompletedInfo(task, checkboxContent, priorityClass) {
    if (!task.completedAt) return "";

    const completedDate = new Date(task.completedAt);
    const timeString = completedDate.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const completedByName = task.completedBy === CURRENT_USER ? "あなた" : task.completedBy;

    return `
        <div class="completed-info">
            <div class="task-checkbox ${priorityClass}">${checkboxContent}</div>
            <span class="completed-time">${timeString}</span>
            <span class="completed-by"><strong class="completed-by-name">${completedByName}</strong>がタスクを完了しました</span>
        </div>
    `;
}

// 未割当タスクのグループ表示
function renderUnassignedTasks(tasks, container) {
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>未割当のタスクがありません</p>
            </div>
        `;
        return;
    }

    const noAssignee = tasks.filter((t) => t.assignee === "指定なし");
    const noPriority = tasks.filter((t) => t.priority === "指定なし" && t.assignee !== "指定なし");

    let html = "";

    if (noAssignee.length > 0) {
        html += `
            <div class="task-group">
                <div class="task-group-header">
                    <span class="task-group-title">担当者なし</span>
                    <span class="task-group-count">${noAssignee.length}</span>
                </div>
                <div class="task-group-items">
                    ${noAssignee.map((task) => renderTaskItem(task)).join("")}
                </div>
            </div>
        `;
    }

    if (noPriority.length > 0) {
        html += `
            <div class="task-group">
                <div class="task-group-header">
                    <span class="task-group-title">優先度なし</span>
                    <span class="task-group-count">${noPriority.length}</span>
                </div>
                <div class="task-group-items">
                    ${noPriority.map((task) => renderTaskItem(task)).join("")}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// 完了済みタスクの日付別グループ表示
function renderCompletedTasks(tasks, container) {
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>完了済みのタスクがありません</p>
            </div>
        `;
        return;
    }

    const groupedTasks = groupTasksByCompletedDate(tasks);

    let html = "";
    Object.keys(groupedTasks).forEach((dateKey) => {
        const tasksInGroup = groupedTasks[dateKey];
        html += `
            <div class="task-group">
                <div class="task-group-header">
                    <span class="task-group-title">${dateKey}</span>
                    <span class="task-group-count">${tasksInGroup.length}</span>
                </div>
                <div class="task-group-items">
                    ${tasksInGroup.map((task) => renderTaskItem(task, true)).join("")}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 完了日時でタスクをグループ分け
function groupTasksByCompletedDate(tasks) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const groups = {};

    tasks.forEach((task) => {
        if (!task.completedAt) return;

        const completedDate = new Date(task.completedAt);
        const dateKey = getDateGroupKey(completedDate, today, tomorrow);

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(task);
    });

    Object.keys(groups).forEach((key) => {
        groups[key].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    });

    return groups;
}

// 日付グループのキーを取得
function getDateGroupKey(date, today, tomorrow) {
    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const tomorrowStr = tomorrow.toDateString();

    if (dateStr === todayStr) {
        return "今日";
    } else if (dateStr === tomorrowStr) {
        return "明日";
    } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
}

// メンバー選択モーダルを開く
function openMemberSelect() {
    renderMemberList();
    openModal("memberSelectModal");
}

// メンバーリストを描画
function renderMemberList() {
    const memberList = document.getElementById("memberList");
    if (!memberList) return;

    memberList.innerHTML = MEMBERS.map(
        (member) => `
            <div class="member-item" onclick="selectMember(${member.id})">
                <div class="member-avatar">${member.name.charAt(0)}</div>
                <div class="member-name">${member.name}</div>
                <div class="member-check ${selectedMember === member.id ? "selected" : ""}">
                    ${selectedMember === member.id ? '<i class="fas fa-check"></i>' : ""}
                </div>
            </div>
        `
    ).join("");
}

// メンバー選択
function selectMember(memberId) {
    selectedMember = memberId;
    renderMemberList();
}

// メンバー適用
function applyMember() {
    if (selectedMember) {
        const member = MEMBERS.find((m) => m.id === selectedMember);
        if (member) {
            document.getElementById("detailAssignee").textContent = member.name;
        }
    }
    closeModal("memberSelectModal");
}

// 日付選択モーダルを開く
function openDateSelectModal() {
    const today = new Date();
    selectedDate = today;
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();

    renderCalendar();
    openModal("dateSelectModal");
}

// カレンダーを描画
function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    const currentMonthEl = document.getElementById("currentMonth");
    if (currentMonthEl) {
        currentMonthEl.textContent = `${currentYear}年 ${monthNames[currentMonth]}`;
    }

    const calendarGrid = document.getElementById("calendarGrid");
    if (!calendarGrid) return;

    calendarGrid.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 前月の日付
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        const date = new Date(currentYear, currentMonth - 1, day);
        calendarGrid.innerHTML += createDayCell(day, date, true);
    }

    // 当月の日付
    for (let day = 1; day <= lastDate; day++) {
        const date = new Date(currentYear, currentMonth, day);
        calendarGrid.innerHTML += createDayCell(day, date, false);
    }

    // 次月の日付
    const remainingCells = 42 - (firstDayOfWeek + lastDate);
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(currentYear, currentMonth + 1, day);
        calendarGrid.innerHTML += createDayCell(day, date, true);
    }

    // 日付クリックイベントを追加
    document.querySelectorAll(".calendar-day").forEach((dayElement) => {
        dayElement.addEventListener("click", function () {
            const dateStr = this.dataset.date;
            selectedDate = new Date(dateStr);
            renderCalendar();
        });
    });
}

// 日付セルを作成
function createDayCell(day, date, isOtherMonth) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
    const dayOfWeek = date.getDay();

    let classes = ["calendar-day"];
    if (isOtherMonth) classes.push("other-month");
    if (isToday) classes.push("today");
    if (isSelected) classes.push("selected");
    if (dayOfWeek === 0) classes.push("sunday");
    if (dayOfWeek === 6) classes.push("saturday");

    return `<div class="${classes.join(" ")}" data-date="${date.toISOString()}">${day}</div>`;
}

// ショートカット選択
function selectShortcut(type) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (type) {
        case "today":
            selectedDate = today;
            break;
        case "tomorrow":
            selectedDate = new Date(today);
            selectedDate.setDate(today.getDate() + 1);
            break;
        case "weekend":
            selectedDate = new Date(today);
            const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
            selectedDate.setDate(today.getDate() + daysUntilSaturday);
            break;
        case "nextWeek":
            selectedDate = new Date(today);
            const daysUntilNextMonday = (8 - today.getDay()) % 7 || 7;
            selectedDate.setDate(today.getDate() + daysUntilNextMonday);
            break;
    }

    currentYear = selectedDate.getFullYear();
    currentMonth = selectedDate.getMonth();
    renderCalendar();
}

// 月を変更
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

// 日付選択を保存
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

// 日付選択をクリア
function clearDateSelection() {
    selectedDate = null;
    const detailDate = document.getElementById("detailDate");
    if (detailDate) {
        detailDate.textContent = "指定なし";
    }
    closeModal("dateSelectModal");
}
