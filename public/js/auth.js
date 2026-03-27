// パスワードの表示・非表示切り替え
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + "-toggle-icon");
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

// プロフィール画像の削除
function deleteAvatar() {
    if (!confirm("プロフィール画像を削除しますか？")) return;

    fetch(window.AVATAR_DELETE_URL, {
        method: "DELETE",
        headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')
                .content,
            Accept: "application/json",
        },
    })
        .then((res) => res.json())
        .then(() => {
            location.reload();
        });
}
