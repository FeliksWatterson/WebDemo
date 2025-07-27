// public/assets/js/taode.js (phiên bản đã sửa)
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-upload-input");
  const uploadButton = document.getElementById("upload-button");
  const fileNameDisplay = document.getElementById("file-name-display");
  const quizContainer = document.getElementById("generated-quiz-container");
  const progressContainer = document.getElementById("progress-container");
  const progressText = document.getElementById("progress-text");
  const progressBar = document.getElementById("progress-bar");

  uploadButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileUpload);

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = `Tệp đã chọn: ${file.name}`;
    quizContainer.innerHTML = "";
    progressContainer.style.display = "block";
    uploadButton.disabled = true;

    const formData = new FormData();
    formData.append("quizFile", file);

    try {
      updateProgress(0, "Đang tải tệp lên máy chủ...");
      const uploadResponse = await fetch(
        "http://localhost:4000/api/quiz/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Không thể tải tệp lên.");
      }
      const { taskId } = await uploadResponse.json();

      connectToProgressStream(taskId);
    } catch (error) {
      updateProgress(100, `Lỗi: ${error.message}`, true);
      uploadButton.disabled = false;
    }
  }

  function connectToProgressStream(taskId) {
    const eventSource = new EventSource(
      `http://localhost:4000/api/quiz/progress/${taskId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateProgress(data.progress, data.message);
    };

    eventSource.addEventListener("done", (event) => {
      const quizData = JSON.parse(event.data);
      updateProgress(100, "Hoàn thành!");

      sessionStorage.setItem("generatedQuiz", JSON.stringify(quizData));

      setTimeout(() => {
        progressContainer.style.display = "none";

        const startButtonHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; margin-top: 30px;">
                        <h3 style="margin-bottom: 20px;">Đã tạo đề thi thành công với ${quizData.length} câu hỏi!</h3>
                        <a href="lambai.html" class="btn has-before">
                            <ion-icon name="play-outline"></ion-icon>
                            <span class="span">Bắt đầu làm bài</span>
                        </a>
                    </div>
                `;
        quizContainer.innerHTML = startButtonHTML;
        uploadButton.disabled = false;
      }, 500);

      eventSource.close();
    });

    eventSource.onerror = (err) => {
      console.error("Lỗi SSE:", err);
      updateProgress(100, "Mất kết nối với máy chủ.", true);
      uploadButton.disabled = false;
      eventSource.close();
    };
  }

  function updateProgress(percent, message, isError = false) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${percent}%`;
    progressText.textContent = message;
    progressBar.style.backgroundColor = isError ? "red" : "var(--kappel)";
  }
});
