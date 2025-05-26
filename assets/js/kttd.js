"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const assessmentInterface = document.querySelector(".test-interface"); // Class dung lai tu luyen de
  const assessmentSelectionArea = document.querySelector(
    ".test-selection-area"
  );
  const assessmentHeaderTitle = document.querySelector(
    ".test-header .section-title"
  );
  const originalAssessmentHeaderTitle = assessmentHeaderTitle
    ? assessmentHeaderTitle.innerHTML
    : 'Chọn bài <span class="span">kiểm tra</span> để bắt đầu';
  const assessmentListContainer = document.getElementById(
    "assessment-list-container"
  );
  const assessmentResultsArea = document.getElementById(
    "assessment-results-area"
  );

  // Elements trong assessmentInterface
  let timeElement,
    currentQuestionNumberElement,
    totalQuestionsElement,
    questionTextElement,
    optionsContainer,
    prevQuestionButton,
    nextQuestionButton,
    submitTestButton;

  // Elements trong assessmentResultsArea
  const assessmentResultTitle = document.getElementById(
    "assessment-result-title"
  );
  const assessmentScoreDisplay = document.getElementById("assessment-score");
  const aiStrengthsDisplay = document.getElementById("ai-strengths");
  const aiWeaknessesDisplay = document.getElementById("ai-weaknesses");
  const aiLearningStyleDisplay = document.getElementById("ai-learning-style");
  const aiRecommendationsList = document.getElementById(
    "ai-recommendations-list"
  );
  const backToAssessmentSelectionBtn = document.getElementById(
    "back-to-assessment-selection-btn"
  );

  // Assessment Data (Sample)
  const assessments = {
    toan_dg: {
      name: "Đánh giá nhanh Toán",
      timeLimit: 15 * 60,
      questions: [
        {
          id: "t1",
          text: "Kết quả của phép tính $2^3 + 3 \\times (5-2)$ là gì?",
          options: ["15", "17", "19", "12"],
          answer: "17",
          topic: "Biểu thức số học",
        },
        {
          id: "t2",
          text: "Giải phương trình $2x - 5 = 3$.",
          options: ["$x=1$", "$x=2$", "$x=3$", "$x=4$"],
          answer: "$x=4$",
          topic: "Phương trình bậc nhất",
        },
        {
          id: "t3",
          text: "Một hình chữ nhật có chiều dài 8cm và chiều rộng 5cm. Chu vi của nó là?",
          options: ["13cm", "26cm", "40cm", "32cm"],
          answer: "26cm",
          topic: "Hình học phẳng",
        },
        // Thêm 7-12 câu nữa cho đủ bài 10-15 phút
      ],
      // P=Phân tích AI
      aiAnalysisRules: [
        {
          topic: "Biểu thức số học",
          weaknessThreshold: 0.5,
          suggestion:
            "Ôn lại thứ tự thực hiện phép tính và các phép tính cơ bản.",
        },
        {
          topic: "Phương trình bậc nhất",
          weaknessThreshold: 0.5,
          suggestion:
            "Luyện tập thêm các bài toán giải phương trình bậc nhất một ẩn.",
        },
      ],
    },
    van_dg: {
      name: "Đánh giá nhanh Ngữ Văn",
      timeLimit: 15 * 60,
      questions: [
        {
          id: "v1",
          text: "Tác phẩm 'Truyện Kiều' của Nguyễn Du được viết bằng thể thơ nào?",
          options: [
            "Lục bát",
            "Song thất lục bát",
            "Thất ngôn bát cú",
            "Tự do",
          ],
          answer: "Lục bát",
          topic: "Tác phẩm văn học",
        },
        {
          id: "v2",
          text: "Xác định biện pháp tu từ trong câu: 'Mặt trời xuống biển như hòn lửa.'",
          options: ["So sánh", "Nhân hóa", "Ẩn dụ", "Hoán dụ"],
          answer: "So sánh",
          topic: "Biện pháp tu từ",
        },
      ],
      aiAnalysisRules: [],
    },
    anh_dg: {
      name: "Đánh giá nhanh Tiếng Anh",
      timeLimit: 10 * 60,
      questions: [
        {
          id: "a1",
          text: "Choose the correct word: 'She ___ a doctor.'",
          options: ["is", "are", "am", "be"],
          answer: "is",
          topic: "Động từ to be",
        },
        {
          id: "a2",
          text: "What is the past tense of 'go'?",
          options: ["goed", "gone", "went", "going"],
          answer: "went",
          topic: "Thì quá khứ đơn",
        },
      ],
      aiAnalysisRules: [],
    },
    // Thêm các môn khác: ly_dg, hoa_dg, sinh_dg, su_dg, dia_dg
    logic_dg: {
      name: "Đánh giá Tư duy Logic",
      timeLimit: 10 * 60,
      questions: [
        {
          id: "l1",
          text: "Nếu tất cả A là B, và một số B là C, thì có thể kết luận gì chắc chắn về A và C?",
          options: [
            "Tất cả A là C",
            "Một số A là C",
            "Không có A nào là C",
            "Chưa thể kết luận",
          ],
          answer: "Chưa thể kết luận",
          topic: "Suy luận logic",
        },
      ],
      aiAnalysisRules: [],
    },
  };

  let currentAssessmentId = null;
  let currentAssessmentQuestions = [];
  let currentQuestionIndex = 0;
  let userAnswers = []; // Sẽ lưu { questionId: 't1', answer: '17', isCorrect: true/false, topic: '...' }
  let timerInterval;
  let timeLeft = 0;

  function assignDOMElements() {
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

    const reAttachListener = (buttonId, callback) => {
      let button = document.getElementById(buttonId);
      if (button) {
        button.replaceWith(button.cloneNode(true));
        button = document.getElementById(buttonId);
        button.addEventListener("click", callback);
      }
      return button;
    };

    prevQuestionButton = reAttachListener("prev-question-btn", () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadAssessmentQuestion(currentQuestionIndex);
        updateAssessmentNavigationButtons();
      }
    });
    nextQuestionButton = reAttachListener("next-question-btn", () => {
      if (currentQuestionIndex < currentAssessmentQuestions.length - 1) {
        currentQuestionIndex++;
        loadAssessmentQuestion(currentQuestionIndex);
        updateAssessmentNavigationButtons();
      }
    });
    submitTestButton = reAttachListener("submit-test-btn", () => {
      if (confirm("Bạn có chắc chắn muốn nộp bài không?")) {
        submitAssessment();
      }
    });
  }

  function loadAssessmentList() {
    if (
      !assessmentListContainer ||
      !assessmentSelectionArea ||
      !assessmentInterface ||
      !assessmentHeaderTitle
    ) {
      console.error(
        "Thiếu một số DOM element cần thiết cho loadAssessmentList"
      );
      return;
    }
    assessmentListContainer.innerHTML = "";
    for (const assessmentId in assessments) {
      const assessment = assessments[assessmentId];
      const item = document.createElement("li");
      item.innerHTML = `
                <div class="category-card" style="--color: ${Math.floor(
                  Math.random() * 360
                )}, 75%, 60%; text-align:left; padding: 20px;">
                    <h3 class="h3 card-title">${assessment.name}</h3>
                    <p class="card-text" style="text-align:left; margin-block: 10px 15px;">Thời gian: ${
                      assessment.timeLimit / 60
                    } phút | Số câu: ${assessment.questions.length}</p>
                    <button class="btn has-before select-assessment-btn" data-assessment-id="${assessmentId}">
                        <span class="span">Bắt đầu</span>
                        <ion-icon name="play-outline" aria-hidden="true"></ion-icon>
                    </button>
                </div>
            `;
      assessmentListContainer.appendChild(item);
    }

    document.querySelectorAll(".select-assessment-btn").forEach((button) => {
      button.replaceWith(button.cloneNode(true));
    });
    document.querySelectorAll(".select-assessment-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        startAssessment(e.currentTarget.dataset.assessmentId);
      });
    });

    assessmentInterface.style.display = "none";
    assessmentResultsArea.style.display = "none";
    assessmentSelectionArea.style.display = "block";
    assessmentHeaderTitle.innerHTML = originalAssessmentHeaderTitle;
  }

  function startAssessment(assessmentId) {
    if (!assessments[assessmentId]) return;

    assignDOMElements(); // Gán lại các DOM element và listener

    currentAssessmentId = assessmentId;
    currentAssessmentQuestions = assessments[assessmentId].questions;
    timeLeft = assessments[assessmentId].timeLimit;
    currentQuestionIndex = 0;
    userAnswers = new Array(currentAssessmentQuestions.length)
      .fill(null)
      .map(() => ({
        answer: null,
        isCorrect: null,
        topic: null,
        questionId: null,
      }));

    if (totalQuestionsElement)
      totalQuestionsElement.textContent = currentAssessmentQuestions.length;
    if (currentQuestionNumberElement)
      currentQuestionNumberElement.textContent = 1;
    if (timeElement)
      timeElement.textContent = `${Math.floor(timeLeft / 60)}:${
        timeLeft % 60 < 10 ? "0" : ""
      }${timeLeft % 60}`;

    assessmentSelectionArea.style.display = "none";
    assessmentResultsArea.style.display = "none";
    assessmentInterface.style.display = "block";
    assessmentHeaderTitle.innerHTML = `Đang làm: <span class="span">${assessments[assessmentId].name}</span>`;

    loadAssessmentQuestion(currentQuestionIndex);
    startAssessmentTimer();
    updateAssessmentNavigationButtons();
  }

  function loadAssessmentQuestion(index) {
    if (
      !questionTextElement ||
      !optionsContainer ||
      !currentQuestionNumberElement ||
      index < 0 ||
      index >= currentAssessmentQuestions.length
    )
      return;

    const question = currentAssessmentQuestions[index];
    questionTextElement.innerHTML = `Câu hỏi ${index + 1}: ${question.text}`;
    optionsContainer.innerHTML = "";
    question.options.forEach((option, i) => {
      const li = document.createElement("li");
      // ... (Tạo radio button và label tương tự luyende.js)
      const inputId = `option-${index}-${i}`;
      const radioInput = document.createElement("input");
      radioInput.type = "radio";
      radioInput.name = "option";
      radioInput.value = option;
      radioInput.id = inputId;

      const storedAnswerData = userAnswers[index];
      if (storedAnswerData && storedAnswerData.answer === option) {
        radioInput.checked = true;
      }

      const label = document.createElement("label");
      label.htmlFor = inputId;
      const optionTextSpan = document.createElement("span");
      optionTextSpan.className = "option-text";
      optionTextSpan.innerHTML = option;
      label.appendChild(radioInput);
      label.appendChild(optionTextSpan);
      li.appendChild(label);
      optionsContainer.appendChild(li);

      radioInput.addEventListener("change", (e) => {
        userAnswers[currentQuestionIndex] = {
          questionId: question.id,
          answer: e.target.value,
          isCorrect: e.target.value === question.answer,
          topic: question.topic,
        };
      });
    });
    currentQuestionNumberElement.textContent = index + 1;
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([
        questionTextElement,
        optionsContainer,
      ]).catch((err) => console.error("MathJax error:", err));
    }
  }

  function updateAssessmentNavigationButtons() {
    if (!prevQuestionButton || !nextQuestionButton || !submitTestButton) return;
    prevQuestionButton.disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === currentAssessmentQuestions.length - 1) {
      nextQuestionButton.style.display = "none";
      submitTestButton.style.display = "flex";
    } else {
      nextQuestionButton.style.display = "flex";
      submitTestButton.style.display = "none";
    }
  }

  function startAssessmentTimer() {
    // ... (Tương tự startTimer trong luyende.js, gọi submitAssessment khi hết giờ)
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
        submitAssessment();
      } else if (timeLeft < 60) {
        timeElement.style.color = "var(--radical-red)";
      }
    }, 1000);
  }

  function submitAssessment() {
    clearInterval(timerInterval);
    let score = 0;
    userAnswers.forEach((ans, index) => {
      // Check cau hoi truoc khi truy cap ans
      if (
        ans &&
        currentAssessmentQuestions[index] &&
        ans.answer === currentAssessmentQuestions[index].answer
      ) {
        ans.isCorrect = true; // Update lai neu k co
        score++;
      } else if (ans) {
        ans.isCorrect = false; // Update lai
      }
    });

    assessmentInterface.style.display = "none";
    assessmentResultsArea.style.display = "block";
    assessmentHeaderTitle.innerHTML = `Kết quả: <span class="span">${assessments[currentAssessmentId].name}</span>`;

    if (assessmentScoreDisplay) {
      assessmentScoreDisplay.innerHTML = `
    <p class="score-display">
        <span>Bạn đã trả lời đúng </span>
        <span class="score-value">${score}</span>
        <span>/${currentAssessmentQuestions.length} câu.</span>
    </p>`;
    }

    // AI DEMO
    analyzeResultsAndSuggest(
      userAnswers,
      assessments[currentAssessmentId].aiAnalysisRules || []
    );
  }

  function analyzeResultsAndSuggest(answers, rules) {
    console.log("analyzeResultsAndSuggest CALLED");
    console.log("Input Answers:", JSON.parse(JSON.stringify(answers)));
    console.log("Input AI Rules:", rules);

    let strengths = [];
    let weaknesses = [];
    let learningStyleHints = [
      "Nên kết hợp nhiều phương pháp học tập để đạt hiệu quả tốt nhất.",
    ];
    let recommendations = [];

    const topicStats = {};
    let correctAnswersCount = 0;
    let totalAnsweredQuestions = 0;

    answers.forEach((ans) => {
      if (!ans || ans.answer === null) return;
      totalAnsweredQuestions++;

      if (ans.topic) {
        if (!topicStats[ans.topic]) {
          topicStats[ans.topic] = { correct: 0, total: 0 };
        }
        topicStats[ans.topic].total++;
        if (ans.isCorrect) {
          topicStats[ans.topic].correct++;
          correctAnswersCount++;
        }
      } else if (ans.isCorrect) {
        correctAnswersCount++;
      }
    });

    for (const topic in topicStats) {
      const accuracy =
        topicStats[topic].total > 0
          ? topicStats[topic].correct / topicStats[topic].total
          : 0;
      if (accuracy >= 0.7) {
        strengths.push(
          `Làm tốt chủ đề: ${topic} (${topicStats[topic].correct}/${topicStats[topic].total})`
        );
      } else {
        weaknesses.push(
          `Cần cải thiện chủ đề: ${topic} (${topicStats[topic].correct}/${topicStats[topic].total})`
        );
        const rule = rules.find((r) => r.topic === topic);
        if (rule && accuracy < rule.weaknessThreshold) {
          recommendations.push(rule.suggestion);
        }
      }
    }

    // currentAssessmentQuestions là biến toàn cục
    let overallAccuracy = 0;
    if (currentAssessmentQuestions && currentAssessmentQuestions.length > 0) {
      overallAccuracy = correctAnswersCount / currentAssessmentQuestions.length;
    } else if (totalAnsweredQuestions > 0) {
      // Fallback nếu currentAssessmentQuestions có vấn đề
      overallAccuracy = correctAnswersCount / totalAnsweredQuestions;
    }

    if (overallAccuracy > 0.6) {
      learningStyleHints.unshift(
        "Có vẻ bạn tiếp thu kiến thức khá nhanh qua dạng bài tập trắc nghiệm."
      );
    } else if (totalAnsweredQuestions > 0) {
      learningStyleHints.unshift(
        "Hãy thử đa dạng hóa cách học: xem video bài giảng, đọc thêm tài liệu, và làm thêm bài tập tự luận."
      );
    }

    console.log("Final Strengths:", strengths);
    console.log("Final Weaknesses:", weaknesses);
    console.log("Final Recommendations:", recommendations);
    console.log("Final LearningStyleHints:", learningStyleHints);

    if (aiStrengthsDisplay)
      aiStrengthsDisplay.innerHTML = `<strong>Điểm mạnh:</strong> ${
        strengths.length > 0
          ? strengths.join(", ")
          : "Cần làm thêm bài để xác định rõ hơn."
      }`;
    if (aiWeaknessesDisplay)
      aiWeaknessesDisplay.innerHTML = `<strong>Điểm cần cải thiện:</strong> ${
        weaknesses.length > 0
          ? weaknesses.join(", ")
          : "Không có điểm yếu rõ rệt ở các chủ đề đã kiểm tra!"
      }`;
    if (aiLearningStyleDisplay)
      aiLearningStyleDisplay.innerHTML = `<strong>Gợi ý phong cách học:</strong> ${learningStyleHints.join(
        " "
      )}`;

    if (aiRecommendationsList) {
      aiRecommendationsList.innerHTML = "";
      if (
        recommendations.length === 0 &&
        weaknesses.length === 0 &&
        strengths.length > 0
      ) {
        const li = document.createElement("li");
        li.textContent =
          "Xuất sắc! Bạn đã nắm vững các kiến thức được kiểm tra. Hãy thử các bài nâng cao hơn.";
        aiRecommendationsList.appendChild(li);
      } else if (recommendations.length === 0 && weaknesses.length > 0) {
        const li = document.createElement("li");
        li.textContent =
          "Hãy tập trung ôn lại các chủ đề bạn chưa làm tốt. Tìm thêm tài liệu và bài tập để củng cố kiến thức.";
        aiRecommendationsList.appendChild(li);
      } else if (recommendations.length > 0) {
        recommendations.forEach((rec) => {
          const li = document.createElement("li");
          li.textContent = rec;
          aiRecommendationsList.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent =
          "Hoàn thành bài kiểm tra! Hãy xem lại điểm số và các câu trả lời để tự đánh giá thêm.";
        aiRecommendationsList.appendChild(li);
      }
    }
  }

  if (backToAssessmentSelectionBtn) {
    backToAssessmentSelectionBtn.addEventListener("click", () => {
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
      if (assessmentInterface)
        assessmentInterface.innerHTML = originalInterfaceHTML;
      assignDOMElements();
      loadAssessmentList();
    });
  }

  if (assessmentInterface && assessmentSelectionArea) {
    assignDOMElements();
    loadAssessmentList();
  } else {
    console.error(
      "Không tìm thấy các DOM element cần thiết cho trang Thi Thử."
    );
  }
});
