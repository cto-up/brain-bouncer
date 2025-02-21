chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startChallenge") {
    showChallengePopup();
  }
});

function formatTimeRemaining(endTime) {
  const remaining = Math.max(0, endTime - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function showChallengePopup() {
  chrome.storage.local.get(["difficulty", "accessTimers"], function (data) {
    const currentDomain = window.location.hostname.replace(
      /^(.*\.)?([^.]+\.[^.]+)$/,
      "$2"
    );
    const accessTimers = data.accessTimers || {};
    const timeRemaining = accessTimers[currentDomain] - Date.now();

    if (timeRemaining > 0) {
      // Show a temporary message about remaining time
      const messageContainer = document.createElement("div");
      messageContainer.style.position = "fixed";
      messageContainer.style.top = "10px";
      messageContainer.style.right = "10px";
      messageContainer.style.padding = "10px";
      messageContainer.style.backgroundColor = "rgba(0,0,0,0.8)";
      messageContainer.style.color = "white";
      messageContainer.style.borderRadius = "5px";
      messageContainer.style.zIndex = "9999";

      const updateTime = () => {
        const remaining = formatTimeRemaining(accessTimers[currentDomain]);
        messageContainer.textContent = `Access granted: ${remaining} remaining`;

        if (Date.now() >= accessTimers[currentDomain]) {
          messageContainer.remove();
          window.location.reload();
        }
      };

      updateTime();
      const timer = setInterval(updateTime, 1000);
      setTimeout(() => {
        messageContainer.remove();
        clearInterval(timer);
      }, 5000);

      document.body.appendChild(messageContainer);
      return;
    }

    let difficulty = data.difficulty || "easy";

    let numRange;
    switch (difficulty) {
      case "easy":
        numRange = [1, 10];
        break;
      case "medium":
        numRange = [10, 50];
        break;
      case "hard":
        numRange = [50, 100];
        break;
    }
    function safeEvaluate(expression) {
      try {
        // Validate: Allow only numbers and basic math operators
        if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
          throw new Error("Invalid characters in expression");
        }

        // Convert infix notation (normal math expression) to postfix (Reverse Polish Notation)
        const postfix = infixToPostfix(expression);
        return evaluatePostfix(postfix);
      } catch (error) {
        console.error("Math evaluation error:", error);
        return null;
      }
    }

    // Convert infix notation to postfix using the Shunting Yard algorithm
    function infixToPostfix(expression) {
      const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
      const output = [];
      const operators = [];

      expression = expression.replace(/\s+/g, ""); // Remove spaces
      const tokens = expression.match(/\d+(\.\d+)?|[+\-*/()]/g); // Tokenize

      for (const token of tokens) {
        if (!isNaN(token)) {
          output.push(parseFloat(token)); // Numbers go to output
        } else if (token === "(") {
          operators.push(token);
        } else if (token === ")") {
          while (operators.length && operators[operators.length - 1] !== "(") {
            output.push(operators.pop());
          }
          operators.pop(); // Remove '('
        } else {
          while (
            operators.length &&
            precedence[operators[operators.length - 1]] >= precedence[token]
          ) {
            output.push(operators.pop());
          }
          operators.push(token);
        }
      }

      while (operators.length) {
        output.push(operators.pop());
      }

      return output;
    }

    // Evaluate postfix (Reverse Polish Notation)
    function evaluatePostfix(postfix) {
      const stack = [];

      for (const token of postfix) {
        if (!isNaN(token)) {
          stack.push(token);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          switch (token) {
            case "+":
              stack.push(a + b);
              break;
            case "-":
              stack.push(a - b);
              break;
            case "*":
              stack.push(a * b);
              break;
            case "/":
              stack.push(a / b);
              break;
          }
        }
      }

      return stack[0];
    }

    const challengeContainer = document.createElement("div");
    challengeContainer.style.position = "fixed";
    challengeContainer.style.top = "0";
    challengeContainer.style.left = "0";
    challengeContainer.style.width = "100%";
    challengeContainer.style.height = "100%";
    challengeContainer.style.backgroundColor = "rgba(0,0,0,0.8)";
    challengeContainer.style.color = "white";
    challengeContainer.style.display = "flex";
    challengeContainer.style.flexDirection = "column";
    challengeContainer.style.alignItems = "center";
    challengeContainer.style.justifyContent = "center";
    challengeContainer.style.zIndex = "9999";
    document.body.appendChild(challengeContainer);

    let failedAttempts = 0;

    const questions = [];
    const answers = [];
    for (let i = 0; i < 5; i++) {
      let num1 =
        Math.floor(Math.random() * (numRange[1] - numRange[0] + 1)) +
        numRange[0];
      let num2 =
        Math.floor(Math.random() * (numRange[1] - numRange[0] + 1)) +
        numRange[0];
      let operators = ["+", "-", "*"];
      let operator = operators[Math.floor(Math.random() * operators.length)];

      let question = `${num1} ${operator} ${num2}`;
      let answer = safeEvaluate(question);
      if (answer !== null) {
        answers.push(answer.toFixed(2));
      }
      questions.push(question);
    }

    let formHTML =
      "<div style='background: rgba(0, 0, 0, 0.7); padding: 20px; border-radius: 10px;'>";
    formHTML += "<h2 style='margin-bottom: 15px;'>Solve these to proceed</h2>";
    formHTML +=
      "<p id='errorMessage' style='color:rgb(170, 15, 15); margin-bottom: 10px; display: none;'>Wrong answers! Try again.</p>";

    questions.forEach((q, i) => {
      formHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <p style="margin-right: 10px; flex-grow: 1; word-wrap: break-word; max-width: 300px;">${q} = </p>
        <input type='text' id='q${i}' style="flex-shrink: 0; width: 80px; box-sizing: border-box; color: white; background-color: transparent; border: 1px solid #ccc; padding: 5px;">
      </div>`;
    });

    // Add a container for the submit button and align it to the right
    formHTML +=
      "<div style='display: flex; justify-content: flex-end; margin-top: 15px;'>";
    formHTML +=
      "<button id='submitAnswers' style='width: 80px; background-color: #0056b3; color: white; border: none; padding: 5px; cursor: pointer;'>Submit</button>";
    formHTML += "</div>";

    formHTML += "<p id='failedAttempts'></p>";
    formHTML += "</div>";
    challengeContainer.innerHTML = formHTML;

    function updateAttempts() {
      document.getElementById(
        "failedAttempts"
      ).innerText = `Failed Attempts: ${failedAttempts}`;
    }

    document
      .getElementById("submitAnswers")
      .addEventListener("click", function () {
        let correct = true;
        let errorMessage = document.getElementById("errorMessage");

        // Reset error message visibility
        errorMessage.style.display = "none";

        questions.forEach((q, i) => {
          let input = document.getElementById(`q${i}`);
          let userAnswer = input.value.trim();

          // Reset styles
          input.style.border = "1px solid #ccc";
          input.style.backgroundColor = "transparent";

          // Convert both answers to numbers
          userAnswer = parseFloat(userAnswer).toFixed(2);
          let correctAnswer = parseFloat(answers[i]).toFixed(2);

          if (userAnswer !== correctAnswer) {
            correct = false;
            input.style.border = "2px solid rgb(180, 14, 14)";
            input.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
          }
        });

        if (correct) {
          try {
            challengeContainer.remove();
            window.location.reload();
          } catch (e) {
            console.error("Error cleaning up:", e);
            // If we can't remove the container, at least try to reload
            window.location.reload();
          }

          try {
            console.log("Sending challengeSolved for domain:", currentDomain);

            chrome.runtime.sendMessage(
              {
                action: "challengeSolved",
                domain: currentDomain,
              },
              function (response) {
                console.log("Got response:", response);
                try {
                  if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError);
                  }
                } catch (e) {
                  console.error("Error handling response:", e);
                }
              }
            );
          } catch (e) {
            console.error("Error in challenge completion:", e);
            // Still try to clean up
            try {
              challengeContainer.remove();
            } catch (innerError) {
              console.error("Error removing container:", innerError);
            }
            window.location.reload();
          }
        } else {
          failedAttempts++;
          updateAttempts();
          errorMessage.style.display = "block";
        }
      });

    updateAttempts();
  });
}
