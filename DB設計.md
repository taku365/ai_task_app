## ai_tasks テーブル

| No | カラム名        | データ型            | NULL許可 | デフォルト値                                   | 説明                     |
|----|-----------------|---------------------|----------|-----------------------------------------------|--------------------------|
| 1  | id              | BIGINT UNSIGNED     | NO       | AUTO_INCREMENT                                | 主キー                   |
| 2  | input_task      | TEXT                | NO       | -                                             | ユーザー元入力           |
| 3  | ai_task         | VARCHAR(500)        | NO       | -                                             | AI解析結果               |
| 4  | due_date        | DATETIME            | YES      | NULL                                          | 期限日時                 |
| 5  | assignee_id     | BIGINT UNSIGNED     | NO       | -                                             | 担当者ID                 |
| 6  | priority_id     | TINYINT UNSIGNED    | NO       | 0                                             | 優先度ID                 |
| 7  | created_by_id   | BIGINT UNSIGNED     | NO       | -                                             | 作成者ID                 |
| 8  | completed       | TINYINT(1)          | NO       | 0                                             | 完了フラグ               |
| 9  | completed_at    | DATETIME            | YES      | NULL                                          | 完了日時                 |
| 10 | completed_by_id | BIGINT UNSIGNED     | YES      | NULL                                          | 完了者ID                 |
| 11 | deleted_at      | TIMESTAMP           | YES      | NULL                                          | 削除日時（SoftDeletes）  |
| 12 | created_at      | TIMESTAMP           | NO       | CURRENT_TIMESTAMP                             | 作成日時                 |
| 13 | updated_at      | TIMESTAMP           | NO       | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時                 |

<br>

## 2. ユーザー管理テーブル

### ai_tasks_M_user（ユーザーマスター）

| No | カラム名       | データ型        | NULL許可 | デフォルト値                                   | 説明                         |
|----|----------------|----------------|----------|-----------------------------------------------|------------------------------|
| 1  | id             | BIGINT UNSIGNED | NO       | AUTO_INCREMENT                                | 主キー                       |
| 2  | name           | VARCHAR(50)    | NO       | -                                             | ユーザー名                   |
| 3  | email          | VARCHAR(255)   | NO       | -                                             | メールアドレス（ユニーク）   |
| 4  | password       | VARCHAR(255)   | NO       | -                                             | パスワード（ハッシュ化）     |
| 5  | active_flg     | TINYINT(1)     | NO       | 1                                             | 有効フラグ                   |
| 6  | created_at     | DATETIME       | NO       | CURRENT_TIMESTAMP                             | 作成日時                     |
| 7  | updated_at     | DATETIME       | NO       | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時                     |

<br>

## 3. マスターテーブル

### ai_tasks_M_priorities（優先度マスター）

| No | カラム名      | データ型         | NULL許可 | デフォルト値 | 説明                          |
|----|--------------|------------------|----------|--------------|-------------------------------|
| 1  | id           | TINYINT UNSIGNED | NO       | -            | 主キー                        |
| 2  | name         | VARCHAR(20)      | NO       | -            | 優先度名                      |
| 3  | level        | TINYINT          | NO       | -            | 優先度レベル                  |
| 4  | color        | VARCHAR(7)       | YES      | NULL         | 表示色（例: `#FF0000`形式）   |

<br>

## 優先度マスター初期データ

| id | name     | level | color     |
|----|----------|-------|-----------|
| 0  | 指定なし | 0     | #FF6B6B   |
| 1  | 低       | 1     | #95A5A6   |
| 2  | 中       | 2     | #F39C12   |
| 3  | 高       | 3     | #28A745   |
