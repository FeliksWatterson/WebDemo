document.addEventListener("DOMContentLoaded", () => {
  const quizJSON = sessionStorage.getItem("generatedQuiz");
  const quizFileName = sessionStorage.getItem("quizFileName");

  const quizTitleElement = document.querySelector(".h2.section-title");
  const fileNameElement = document.getElementById("quiz-filename");
  const currentQElement = document.getElementById("current-question-number");
  const totalQElement = document.getElementById("total-questions");
  const questionTextElement = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const prevBtn = document.getElementById("prev-question-btn");
  const nextBtn = document.getElementById("next-question-btn");
  const submitBtn = document.getElementById("submit-test-btn");
  const testInterface = document.querySelector(".test-interface");
  const testResultsContainer = document.querySelector(".test-results");
  const scoreTextElement = document.getElementById("score-text");

  if (!quizJSON) {
    document.body.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h1>Lỗi: Không tìm thấy dữ liệu bài thi.</h1>
        <p>Vui lòng quay lại trang Tạo đề thông minh và thử lại.</p>
        <a href="taode.html" class="btn has-before"><span class="span">Quay lại</span></a>
      </div>
    `;
    return;
  }

  if (fileNameElement && quizFileName) {
    fileNameElement.textContent = quizFileName;
  }

  const questions = JSON.parse(quizJSON);
  const userAnswers = new Array(questions.length).fill(null);
  let currentQuestionIndex = 0;

  function renderQuestion(index) {
    currentQuestionIndex = index;
    const question = questions[index];

    questionTextElement.textContent = `Câu hỏi ${index + 1}: ${
      question.question
    }`;
    currentQElement.textContent = index + 1;
    totalQElement.textContent = questions.length;

    optionsContainer.innerHTML = "";
    question.options.forEach((option, optionIndex) => {
      const optionLetter = String.fromCharCode(65 + optionIndex);
      const li = document.createElement("li");
      const isChecked = userAnswers[index] === optionLetter;

      li.innerHTML = `
        <label>
          <input type="radio" name="option-${index}" value="${optionLetter}" ${
        isChecked ? "checked" : ""
      }>
          <span class="option-text">${optionLetter}. ${option}</span>
        </label>
      `;
      optionsContainer.appendChild(li);
    });

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === questions.length - 1;
    submitBtn.style.display = index === questions.length - 1 ? "flex" : "none";
  }

  optionsContainer.addEventListener("change", (event) => {
    if (event.target.type === "radio") {
      const questionIndex = parseInt(event.target.name.split("-")[1]);
      userAnswers[questionIndex] = event.target.value;
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length - 1) {
      renderQuestion(currentQuestionIndex + 1);
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      renderQuestion(currentQuestionIndex - 1);
    }
  });

  submitBtn.addEventListener("click", () => {
    showResults();
  });

  function showResults() {
    let score = 0;
    // Xóa giao diện làm bài cũ và các nút điều hướng
    testInterface.innerHTML = "";
    quizTitleElement.textContent = "Kết quả và Chi tiết Bài làm";

    // Hiển thị lại tất cả các câu hỏi với đáp án đã được tô màu
    questions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      const correctAnswer = q.correctAnswer;

      if (userAnswer === correctAnswer) {
        score++;
      }

      const questionReviewDiv = document.createElement("div");
      questionReviewDiv.className = "question-area";
      questionReviewDiv.style.marginBottom = "20px";

      let optionsHTML = '<ul class="quiz-options">';
      q.options.forEach((option, optionIndex) => {
        const optionLetter = String.fromCharCode(65 + optionIndex);

        // [THAY ĐỔI] Logic tô màu chữ
        let spanClass = "option-text"; // Lớp mặc định
        if (optionLetter === correctAnswer) {
          spanClass += " correct"; // Đáp án đúng luôn có màu xanh
        } else if (optionLetter === userAnswer) {
          spanClass += " incorrect"; // Đáp án người dùng chọn sai có màu đỏ
        }

        optionsHTML += `
              <li>
                <label>
                  <input type="radio" name="review-${index}" ${
          userAnswer === optionLetter ? "checked" : ""
        } disabled>
                  <span class="${spanClass}">${optionLetter}. ${option}</span>
                </label>
              </li>`;
      });
      optionsHTML += "</ul>";

      questionReviewDiv.innerHTML = `<h3 class="question-title">Câu ${
        index + 1
      }: ${q.question}</h3>${optionsHTML}`;
      testInterface.appendChild(questionReviewDiv);
    });

    testInterface.style.display = "block";

    // Hiển thị điểm số
    scoreTextElement.textContent = `Bạn đã trả lời đúng ${score}/${questions.length} câu!`;
    testResultsContainer.style.display = "block";
  }

  // Khởi động
  if (quizTitleElement) quizTitleElement.textContent = "Đề thi tự tạo";
  renderQuestion(0);
});
