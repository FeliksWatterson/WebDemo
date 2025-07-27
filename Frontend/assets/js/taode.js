// public/assets/js/taode.js (phiên bản đã sửa để khớp với server.js)
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-upload-input");
  const uploadButton = document.getElementById("upload-button");
  const fileNameDisplay = document.getElementById("file-name-display");
  const quizContainer = document.getElementById("generated-quiz-container");
  const progressContainer = document.getElementById("progress-container");
  const progressText = document.getElementById("progress-text");
  const progressBar = document.getElementById("progress-bar");

  let correctAnswers = [];

  uploadButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileUpload);

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = `Tệp đã chọn: ${file.name}`;
    quizContainer.innerHTML = "";
    uploadButton.disabled = true;

    // Hiển thị tiến trình giả lập
    progressContainer.style.display = "block";
    updateProgress(
      50,
      "Đang gửi tệp và chờ AI xử lý... Quá trình này có thể mất vài phút."
    );

    const formData = new FormData();
    formData.append("quizFile", file);

    try {
      // Sử dụng AbortController để xử lý timeout phía client
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // Timeout 5 phút

      // Gọi đến đúng endpoint của server
      const response = await fetch(
        "http://localhost:4000/api/quiz/generate-from-file",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId); // Xóa timeout nếu nhận được phản hồi

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể tạo đề thi.");
      }

      const quizData = await response.json();

      updateProgress(100, "Hoàn thành!");

      setTimeout(() => {
        progressContainer.style.display = "none";
        if (quizData.length === 0) {
          // Hiển thị thông báo nếu không có câu hỏi
          const statusDiv = document.createElement("p");
          statusDiv.textContent = "Không tìm thấy câu hỏi nào trong tệp.";
          quizContainer.appendChild(statusDiv);
        } else {
          correctAnswers = quizData.map((q) => q.correctAnswer);
          displayQuiz(quizData);
        }
      }, 500);
    } catch (error) {
      let errorMessage = error.message;
      if (error.name === "AbortError") {
        errorMessage = "Yêu cầu đã hết thời gian chờ (5 phút).";
      }
      updateProgress(100, `Lỗi: ${errorMessage}`, true);
    } finally {
      uploadButton.disabled = false;
    }
  }

  function updateProgress(percent, message, isError = false) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = isError ? "Lỗi" : `${percent}%`;
    progressText.textContent = message;
    progressBar.style.backgroundColor = isError ? "red" : "var(--kappel)";
  }

  // Hàm displayQuiz và checkAnswers giữ nguyên
  function displayQuiz(questions) {
    quizContainer.innerHTML = "";
    questions.forEach((q, index) => {
      const questionDiv = document.createElement("div");
      questionDiv.className = "quiz-question";
      let optionsHTML = '<ul class="quiz-options">';
      q.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);
        optionsHTML += `<li><label><input type="radio" name="question-${index}" value="${optionLetter}"><strong>${optionLetter}.</strong> ${option}</label></li>`;
      });
      optionsHTML += "</ul>";
      questionDiv.innerHTML = `<p>${index + 1}. ${
        q.question
      }</p>${optionsHTML}`;
      quizContainer.appendChild(questionDiv);
    });
    const submitButton = document.createElement("button");
    submitButton.id = "submit-quiz-btn";
    submitButton.className = "btn has-before";
    submitButton.innerHTML = '<span class="span">Nộp Bài</span>';
    submitButton.onclick = checkAnswers;
    const resultDiv = document.createElement("div");
    resultDiv.id = "quiz-results";
    resultDiv.className = "quiz-results";
    quizContainer.appendChild(submitButton);
    quizContainer.appendChild(resultDiv);
  }

  function checkAnswers() {
    let score = 0;
    const totalQuestions = correctAnswers.length;
    quizContainer.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.disabled = true;
    });
    const allQuestions = quizContainer.querySelectorAll(".quiz-question");
    allQuestions.forEach((questionEl, index) => {
      const userChoice = questionEl.querySelector(
        'input[type="radio"]:checked'
      );
      const correctOption = correctAnswers[index];
      if (userChoice) {
        if (userChoice.value === correctOption) {
          score++;
          userChoice.parentElement.style.color = "green";
          userChoice.parentElement.style.fontWeight = "bold";
        } else {
          userChoice.parentElement.style.color = "red";
          const correctLabel = questionEl.querySelector(
            `input[value="${correctOption}"]`
          ).parentElement;
          correctLabel.style.color = "green";
          correctLabel.style.fontWeight = "bold";
        }
      } else {
        const correctLabel = questionEl.querySelector(
          `input[value="${correctOption}"]`
        ).parentElement;
        correctLabel.style.color = "blue";
        correctLabel.style.fontWeight = "bold";
      }
    });
    const resultDiv = document.getElementById("quiz-results");
    resultDiv.textContent = `Kết quả của bạn: ${score} / ${totalQuestions} câu đúng!`;
    document.getElementById("submit-quiz-btn").disabled = true;
  }
});
