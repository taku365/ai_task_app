## MAMP／MySQLの接続設定

- ホスト名：localhost
- ポート：8889
- ユーザー名：root
- パスワード：root

<br>

生のMySQLコマンドを実行する

#### 現在の問題
なぜ /Applications/MAMP/Library/bin/ に移動して mysql コマンドを実行しても「コマンドが見つからない」と表示される

#### 解決
MAMPには複数のバーションがインストールされているため、どのバーションのmysqlコマンドを使用するかを指定する必要がある。

```bash
/Applications/MAMP/Library/bin/mysql80/bin/mysql -u root -p -h 127.0.0.1 -P 8889
```

文字セット指定付きでデータベースを作成する

```mysql
mysql> CREATE DATABASE ai_task_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

データベースを使用する

```mysql
mysql> USE ai_task_app;
```

データベースを確認する

```mysql
mysql> SHOW DATABASES;
```

<br>

### 優先度マスタテーブルを作成する

```mysql
CREATE TABLE ai_tasks_M_priorities (
    id TINYINT UNSIGNED PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    level TINYINT NOT NULL,
    color VARCHAR(7) NOT NULL
);
```

### 初期データを投入する

```mysql
INSERT INTO ai_tasks_M_priorities (id, name, level, color) VALUES
(0, '指定なし', 0, '#FF6B6B'),
(1, '低', 1, '#95A5A6'),
(2, '中', 2, '#F39C12'),
(3, '高', 3, '#28A745');
```

### ユーザーマスタテーブルを作成する

```mysql
CREATE TABLE ai_tasks_M_users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    active_flg TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### タスクテーブル（トランザクションテーブル）を作成する

```mysql
CREATE TABLE ai_tasks_T_tasks (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    input_text TEXT NOT NULL,
    ai_task VARCHAR(500) NOT NULL,
    due_date DATETIME DEFAULT NULL,
    assignee_id BIGINT UNSIGNED NOT NULL,
    priority_id TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_by_id BIGINT UNSIGNED NOT NULL,
    completed_flg TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME DEFAULT NULL,
    completed_by_id BIGINT UNSIGNED DEFAULT NULL,
    deleted_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (assignee_id) REFERENCES ai_tasks_M_users(id),
    FOREIGN KEY (priority_id) REFERENCES ai_tasks_M_priorities(id),
    FOREIGN KEY (created_by_id) REFERENCES ai_tasks_M_users(id),
    FOREIGN KEY (completed_by_id) REFERENCES ai_tasks_M_users(id)
);


### 進捗状況
コマンドからのテーブル作成を完了した
マイグレーションファイルは作成していない

ai_tasks_M_users テーブルにデータを投入しようと思っているところ
- テストがしやすいため
