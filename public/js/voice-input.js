// ----------------------------------------------------------------
// 音声入力（Web Speech API）
// ----------------------------------------------------------------
function initVoiceInput(voiceCreateTask) {
    const voiceBtn = document.getElementById("voiceInputBtn");
    const recordingBar = document.getElementById("recordingBar");
    const stopBtn = document.getElementById("recordingBarStopBtn");
    if (!recordingBar || !stopBtn) return;

    // Web Speech API 非対応ブラウザはボタンを非表示にする
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (voiceBtn) voiceBtn.style.display = "none";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.continuous = true; // 無音でも自動停止しない

    let transcript = "";

    // 音声入力ボタン：録音開始
    if (voiceBtn) {
        voiceBtn.addEventListener("click", () => {
            transcript = "";
            recognition.start();
        });
    }

    // 停止ボタン：録音停止
    stopBtn.addEventListener("click", () => {
        recognition.stop();
    });

    // 録音開始時：録音バーを表示・ボタンを無効化
    recognition.onstart = () => {
        recordingBar.classList.add("active");
        if (voiceBtn) voiceBtn.disabled = true;
    };

    // 音声認識結果：文字起こしを貯める
    recognition.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
                transcript += e.results[i][0].transcript;
            }
        }
    };

    // 録音終了時：録音バーを非表示にして保存
    // ボタンの再有効化は voiceCreateTask の finally で行う（解析完了まで無効のまま）
    recognition.onend = () => {
        recordingBar.classList.remove("active");
        if (transcript) {
            console.log("[Web Speech API] 文字起こし結果:", transcript);
            voiceCreateTask(transcript);
        } else {
            // 何も喋らなかった場合はここでボタンを戻す
            if (voiceBtn) voiceBtn.disabled = false;
        }
    };

    // エラー処理
    recognition.onerror = (e) => {
        console.error("音声認識エラー:", e.error);
        if (e.error === "not-allowed") {
            alert(
                "マイクの使用が許可されていません。ブラウザの設定を確認してください。",
            );
        }
    };
}

// ----------------------------------------------------------------
// Whisper音声入力（OpenAI Whisper API）
// ----------------------------------------------------------------
function initWhisperInput(csrfToken, voiceCreateTask) {
    const whisperBtn = document.getElementById("whisperInputBtn");
    const recordingBar = document.getElementById("recordingBar");
    const recordingBarLabel = document.getElementById("recordingBarLabel");
    const stopBtn = document.getElementById("recordingBarStopBtn");
    if (!whisperBtn || !recordingBar || !stopBtn) return;

    // MediaRecorder非対応ブラウザは非表示
    if (!navigator.mediaDevices || !window.MediaRecorder) {
        whisperBtn.style.display = "none";
        return;
    }

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    whisperBtn.addEventListener("click", async () => {
        if (isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : "audio/mp4";

            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                // マイクを解放
                stream.getTracks().forEach((t) => t.stop());
                isRecording = false;

                if (audioChunks.length === 0) {
                    whisperBtn.disabled = false;
                    recordingBar.classList.remove("active");
                    return;
                }

                const ext = mimeType.includes("webm") ? "webm" : "mp4";
                const audioBlob = new Blob(audioChunks, { type: mimeType });
                const formData = new FormData();
                formData.append("audio", audioBlob, `audio.${ext}`);
                formData.append("_token", csrfToken);

                // 解析中UIに切り替え
                recordingBar.classList.add("active", "analyzing");
                recordingBarLabel.textContent = "Whisper解析中...";
                const analyzingOverlay = document.getElementById("analyzingOverlay");
                if (analyzingOverlay) analyzingOverlay.classList.add("active");

                try {
                    const res = await fetch("/api/tasks/transcribe", {
                        method: "POST",
                        headers: { "X-CSRF-TOKEN": csrfToken },
                        body: formData,
                    });
                    const result = await res.json();

                    if (!result.success) {
                        alert("文字起こしに失敗しました: " + (result.message || ""));
                        return;
                    }

                    if (!result.transcript || result.transcript.trim() === "") {
                        alert("音声が認識できませんでした。もう一度お試しください。");
                        return;
                    }

                    console.log("[Whisper API] 文字起こし結果:", result.transcript);
                    // 文字起こし結果を既存のAI解析フローに流す（UI設定済みのためスキップ）
                    await voiceCreateTask(result.transcript, true);
                } catch (err) {
                    alert("エラー: " + err.message);
                } finally {
                    recordingBar.classList.remove("active", "analyzing");
                    recordingBarLabel.textContent = "";
                    if (analyzingOverlay) analyzingOverlay.classList.remove("active");
                    whisperBtn.disabled = false;
                }
            };

            mediaRecorder.start();
            isRecording = true;
            whisperBtn.disabled = true;
            recordingBar.classList.add("active");
            recordingBar.classList.remove("analyzing");
            recordingBarLabel.textContent = "録音中（Whisper）...";
        } catch (err) {
            alert("マイクの使用が許可されていません。ブラウザの設定を確認してください。");
        }
    });

    // 停止ボタン共用
    stopBtn.addEventListener("click", () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            recordingBar.classList.remove("active");
        }
    });
}

/* global csrfToken, voiceCreateTask */
// tasks.js で定義された csrfToken・voiceCreateTask を渡して初期化
initVoiceInput(voiceCreateTask);
initWhisperInput(csrfToken, voiceCreateTask);
