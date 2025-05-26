"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const testInterface = document.querySelector(".test-interface");
  const testSelectionArea = document.querySelector(".test-selection-area");
  const testHeaderTitle = document.querySelector(".test-header .section-title");
  const originalTestHeaderTitle = testHeaderTitle
    ? testHeaderTitle.innerHTML
    : 'Chọn một<span class="span"> bộ đề</span> để bắt đầu';
  const testListContainer = document.getElementById("test-list-container");

  let timeElement,
    currentQuestionNumberElement,
    totalQuestionsElement,
    questionTextElement,
    optionsContainer,
    prevQuestionButton,
    nextQuestionButton,
    submitTestButton;

  // Test Data (Sample)
  const tests = {
    de_toan_01: {
      name: "Đề thi thử Toán THPT Quốc Gia 2025 - Đề 01",
      timeLimit: 90 * 60,
      questions: [
        {
          text: "Trong không gian Oxyz, cho mặt cầu (S) có phương trình $x^2 + y^2 + z^2 - 2x + 4y - 6z - 11 = 0$. Tâm của (S) có tọa độ là:",
          options: [
            "$(-1, 2, -3)$",
            "$(1, -2, 3)$",
            "$(2, -4, 6)$",
            "$(-2, 4, -6)$",
          ],
          answer: "$(1, -2, 3)$",
        },
        {
          text: "Cho hàm số $y = x^3 - 3x + 2$. Mệnh đề nào dưới đây đúng?",
          options: [
            "Hàm số đồng biến trên khoảng $(-\\infty, -1)$",
            "Hàm số nghịch biến trên khoảng $(-1, 1)$",
            "Hàm số đồng biến trên khoảng $(1, +\\infty)$",
            "Cả B và C đều đúng",
          ],
          answer: "Cả B và C đều đúng",
        },
        {
          text: "Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0, 2]$ là:",
          options: ["$3$", "$2$", "$11$", "$7$"],
          answer: "$11$",
        },
      ],
    },
    de_ly_01: {
      name: "Đề thi thử Lý THPT Quốc Gia 2025 - Đề 01",
      timeLimit: 50 * 60,
      questions: [
        {
          text: "Một con lắc lò xo dao động điều hòa với tần số góc $\\omega$. Đại lượng $T = 2\\pi/\\omega$ được gọi là gì?",
          options: ["Tần số", "Chu kỳ", "Biên độ", "Pha ban đầu"],
          answer: "Chu kỳ",
        },
        {
          text: "Đặt điện áp xoay chiều $u = U_0 \\cos(\\omega t)$ vào hai đầu đoạn mạch chỉ có tụ điện. Dung kháng của tụ điện được tính bằng công thức nào?",
          options: [
            "$Z_C = \\omega C$",
            "$Z_C = 1/(\\omega C)$",
            "$Z_L = \\omega L$",
            "$Z_L = 1/(\\omega L)$",
          ],
          answer: "$Z_C = 1/(\\omega C)$",
        },
      ],
    },
  };

  let currentTestId = null;
  let currentQuestions = [];
  let currentQuestionIndex = 0;
  let userAnswers = [];
  let timerInterval;
  let timeLeft = 0;

  //Core Functions
  function assignTestInterfaceDOMElements() {
    timeElement = document.getElementById("time");
    currentQuestionNumberElement = document.getElementById(
      "current-question-number"
    );
    totalQuestionsElement = document.getElementById("total-questions");
    questionTextElement = document.getElementById("question-text");
    optionsContainer = document.getElementById("options-container");
    prevQuestionButton = document.getElementById("prev-question-btn");
    nextQuestionButton = document.getElementById("next-question-btn");
    submitTestButton = document.getElementById("submit-test-btn");

    if (prevQuestionButton) {
      prevQuestionButton.replaceWith(prevQuestionButton.cloneNode(true));
      prevQuestionButton = document.getElementById("prev-question-btn");
      prevQuestionButton.addEventListener("click", () => {
        if (currentQuestionIndex > 0) {
          currentQuestionIndex--;
          loadQuestion(currentQuestionIndex);
          updateNavigationButtons();
        }
      });
    }
    if (nextQuestionButton) {
      nextQuestionButton.replaceWith(nextQuestionButton.cloneNode(true));
      nextQuestionButton = document.getElementById("next-question-btn");
      nextQuestionButton.addEventListener("click", () => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
          currentQuestionIndex++;
          loadQuestion(currentQuestionIndex);
          updateNavigationButtons();
        }
      });
    }
    if (submitTestButton) {
      submitTestButton.replaceWith(submitTestButton.cloneNode(true));
      submitTestButton = document.getElementById("submit-test-btn");
      submitTestButton.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn nộp bài không?")) {
          submitTest();
        }
      });
    }
  }

  function loadTestList() {
    if (
      !testListContainer ||
      !testSelectionArea ||
      !testInterface ||
      !testHeaderTitle
    ) {
      console.error("Missing core elements for loadTestList");
      return;
    }

    testListContainer.innerHTML = "";
    if (Object.keys(tests).length === 0) {
      testSelectionArea.innerHTML =
        '<p class="section-text">Hiện tại chưa có bộ đề nào.</p>';
      testInterface.style.display = "none";
      testHeaderTitle.innerHTML = originalTestHeaderTitle;
      return;
    }

    for (const testId in tests) {
      const test = tests[testId];
      const testItem = document.createElement("li");
      const cardColor = testId.includes("toan")
        ? "170, 75%, 41%"
        : testId.includes("ly")
        ? "351, 83%, 61%"
        : "229, 75%, 58%";
      testItem.innerHTML = `
                <div class="category-card" style="--color: ${cardColor}; text-align:left; padding: 20px;">
                    <h3 class="h3"><a href="#" class="card-title" data-test-id="${testId}">${
        test.name
      }</a></h3>
                    <p class="card-text" style="text-align:left; margin-block: 10px 15px;">Thời gian: ${
                      test.timeLimit / 60
                    } phút | Số câu: ${test.questions.length}</p>
                    <button class="btn has-before select-test-btn" data-test-id="${testId}">
                        <span class="span">Vào thi</span>
                        <ion-icon name="play-outline" aria-hidden="true"></ion-icon>
                    </button>
                </div>
            `;
      testListContainer.appendChild(testItem);
    }

    document.querySelectorAll(".select-test-btn").forEach((button) => {
      button.replaceWith(button.cloneNode(true));
    });
    document.querySelectorAll(".select-test-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const selectedTestId = e.currentTarget.dataset.testId;
        startTest(selectedTestId);
      });
    });

    testInterface.style.display = "none";
    testSelectionArea.style.display = "block";
    testHeaderTitle.innerHTML = originalTestHeaderTitle;
  }

  function startTest(testId) {
    if (
      !tests[testId] ||
      !testInterface ||
      !testSelectionArea ||
      !testHeaderTitle
    )
      return;

    assignTestInterfaceDOMElements();

    currentTestId = testId;
    currentQuestions = tests[testId].questions;
    if (currentQuestions.length === 0) {
      alert("Bộ đề này hiện chưa có câu hỏi nào.");
      loadTestList();
      return;
    }
    timeLeft = tests[testId].timeLimit;
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);

    testSelectionArea.style.display = "none";
    testInterface.style.display = "block";
    testHeaderTitle.innerHTML = `Đang làm: <span class="span">${tests[testId].name}</span>`;

    loadQuestion(currentQuestionIndex);
    startTimer();
    updateNavigationButtons();
    if (totalQuestionsElement)
      totalQuestionsElement.textContent = currentQuestions.length;
    if (currentQuestionNumberElement)
      currentQuestionNumberElement.textContent = 1;
    if (timeElement)
      timeElement.textContent = `${Math.floor(timeLeft / 60)}:${
        timeLeft % 60 < 10 ? "0" : ""
      }${timeLeft % 60}`;
  }

  function loadQuestion(index) {
    if (
      index < 0 ||
      index >= currentQuestions.length ||
      !questionTextElement ||
      !optionsContainer ||
      !currentQuestionNumberElement
    )
      return;

    const question = currentQuestions[index];
    // Không cần .replace(/</g, "&lt;").replace(/>/g, "&gt;") cho text vì MathJax sẽ xử lý $...$
    questionTextElement.innerHTML = `Câu hỏi ${index + 1}: ${question.text}`;
    optionsContainer.innerHTML = "";

    question.options.forEach((option, i) => {
      const li = document.createElement("li");
      const inputId = `option-${index}-${i}`;
      const radioInput = document.createElement("input");
      radioInput.type = "radio";
      radioInput.name = "option";
      radioInput.value = option; // Giá trị value là chuỗi LaTeX gốc
      radioInput.id = inputId;
      if (userAnswers[index] === option) {
        radioInput.checked = true;
      }

      const label = document.createElement("label");
      label.htmlFor = inputId;

      const optionTextSpan = document.createElement("span");
      optionTextSpan.className = "option-text";
      // Không cần .replace(/</g, "&lt;").replace(/>/g, "&gt;") cho option vì MathJax sẽ xử lý $...$
      optionTextSpan.innerHTML = option;

      label.appendChild(radioInput);
      label.appendChild(optionTextSpan);
      li.appendChild(label);
      optionsContainer.appendChild(li);

      radioInput.addEventListener("change", (e) => {
        userAnswers[currentQuestionIndex] = e.target.value;
      });
    });

    currentQuestionNumberElement.textContent = index + 1;

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([
        questionTextElement,
        optionsContainer,
      ]).catch(function (err) {
        console.error("MathJax typesetting error: " + err.message);
      });
    } else if (
      window.MathJax &&
      typeof window.MathJax.Hub !== "undefined" &&
      typeof window.MathJax.Hub.Queue === "function"
    ) {
      // For MathJax v2
      window.MathJax.Hub.Queue([
        "Typeset",
        window.MathJax.Hub,
        questionTextElement,
      ]);
      window.MathJax.Hub.Queue([
        "Typeset",
        window.MathJax.Hub,
        optionsContainer,
      ]);
    }
  }

  function updateNavigationButtons() {
    if (!prevQuestionButton || !nextQuestionButton || !submitTestButton) return;
    prevQuestionButton.disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === currentQuestions.length - 1) {
      nextQuestionButton.style.display = "none";
      submitTestButton.style.display = "flex";
    } else {
      nextQuestionButton.style.display = "flex";
      nextQuestionButton.disabled = false;
      submitTestButton.style.display = "none";
    }
  }

  function startTimer() {
    if (!timeElement) return;
    clearInterval(timerInterval);
    timeElement.style.color = "var(--eerie-black-1)";

    timerInterval = setInterval(() => {
      timeLeft--;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timeElement.textContent = `${minutes}:${
        seconds < 10 ? "0" : ""
      }${seconds}`;

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timeElement.textContent = "Hết giờ!";
        timeElement.style.color = "var(--radical-red)";
        submitTest();
      } else if (timeLeft < 60 && timeLeft > 0) {
        timeElement.style.color = "var(--radical-red)";
      }
    }, 1000);
  }

  function submitTest() {
    clearInterval(timerInterval);
    let score = 0;
    userAnswers.forEach((answer, index) => {
      if (
        currentQuestions[index] &&
        answer === currentQuestions[index].answer
      ) {
        score++;
      }
    });
    renderResults(score);
  }

  function renderResults(score) {
    if (
      !testInterface ||
      !currentTestId ||
      !tests[currentTestId] ||
      !testHeaderTitle
    )
      return;
    clearInterval(timerInterval);

    let resultHTML = `
            <div class="test-results" style="text-align: center; padding: 40px 20px; background: var(--isabelline); border-radius: var(--radius-10);">
                <h2 class="h2 section-title">Kết quả bài thi</h2>
                <p class="section-text" style="font-size: var(--fs-3); margin-block: 20px 30px;">
                    Bạn đã trả lời đúng <span class="span" style="color: var(--kappel);">${score}</span>/${currentQuestions.length} câu.
                </p>
                <ul style="list-style: none; padding: 0; margin-top: 20px; text-align: left; max-height: 300px; overflow-y: auto;">`;

    currentQuestions.forEach((q, index) => {
      // Giữ nguyên chuỗi LaTeX gốc để MathJax xử lý sau khi chèn vào HTML
      const userAnswerDisplay = userAnswers[index] || "Chưa trả lời";
      const correctAnswerDisplay = q.answer;
      const questionTextDisplay = q.text;

      resultHTML += `
                <li style="padding: 10px; border-bottom: 1px solid var(--platinum); ${
                  userAnswers[index] === q.answer
                    ? "color: green;"
                    : "color: red;"
                }">
                    <strong>Câu ${
                      index + 1
                    }:</strong> ${questionTextDisplay} <br>
                    <em>Bạn chọn: ${userAnswerDisplay}</em> <br>
                    <em>Đáp án đúng: ${correctAnswerDisplay}</em>
                </li>`;
    });

    resultHTML += `
                </ul>
                <button class="btn has-before" id="back-to-selection-btn" style="margin-top: 30px;">
                    <span class="span">Chọn đề khác</span>
                    <ion-icon name="refresh-outline" aria-hidden="true"></ion-icon>
                </button>
            </div>`;
    testInterface.innerHTML = resultHTML;
    testHeaderTitle.innerHTML = `Kết quả: <span class="span">${tests[currentTestId].name}</span>`;

    // Gọi MathJax để render công thức trong kết quả
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([testInterface]).catch(function (err) {
        // Typeset toàn bộ testInterface chứa kết quả
        console.error("MathJax typesetting error in results: " + err.message);
      });
    } else if (
      window.MathJax &&
      typeof window.MathJax.Hub !== "undefined" &&
      typeof window.MathJax.Hub.Queue === "function"
    ) {
      // For MathJax v2
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, testInterface]);
    }

    const backButton = document.getElementById("back-to-selection-btn");
    if (backButton) {
      backButton.replaceWith(backButton.cloneNode(true));
      document
        .getElementById("back-to-selection-btn")
        .addEventListener("click", () => {
          currentTestId = null;
          currentQuestions = [];
          currentQuestionIndex = 0;
          userAnswers = [];
          timeLeft = 0;

          const originalInterfaceHTML = `
                    <div class="test-info">
                        <div class="timer">Thời gian còn lại: <span id="time">00:00</span></div>
                        <div class="question-count">Câu <span id="current-question-number">1</span>/<span id="total-questions">0</span></div>
                    </div>
                    <div class="question-area">
                        <h3 class="question-title" id="question-text">Câu hỏi</h3>
                        <ul class="options-list" id="options-container"></ul>
                    </div>
                    <div class="navigation-buttons">
                        <button class="btn has-before" id="prev-question-btn" disabled>
                            <ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon>
                            <span class="span">Câu trước</span>
                        </button>
                        <button class="btn has-before" id="next-question-btn">
                            <span class="span">Câu sau</span>
                            <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>
                        </button>
                        <button class="btn has-before btn-submit-test" id="submit-test-btn" style="display: none;">
                            <span class="span">Nộp bài</span>
                            <ion-icon name="checkmark-done-outline" aria-hidden="true"></ion-icon>
                        </button>
                    </div>`;
          if (testInterface) testInterface.innerHTML = originalInterfaceHTML;

          assignTestInterfaceDOMElements();
          loadTestList();
        });
    }
  }

  // --- Initialization ---
  if (testInterface && testSelectionArea) {
    assignTestInterfaceDOMElements();
    loadTestList();
  } else {
    console.error("ERROR!");
  }
});
