const habitInput = document.getElementById("habitInput");
const addHabitBtn = document.getElementById("addHabitBtn");
const habitList = document.getElementById("habitList");

let habits = JSON.parse(localStorage.getItem("habits")) || [];

function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function calculateStreak(history) {
  let streak = 0;
  const d = new Date();

  while (true) {
    const key = d.toISOString().split("T")[0];
    if (history[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function renderHabits() {
  habitList.innerHTML = "";

  if (habits.length === 0) {
    habitList.innerHTML = "<p>No habits yet.</p>";
    return;
  }

  habits.forEach((habit, index) => {
    const today = todayKey();
    const doneToday = !!habit.history[today];
    const streak = calculateStreak(habit.history);

    const card = document.createElement("div");
    card.className = "habit-card";

    card.innerHTML = `
      <div class="row">
        <h3>${habit.name}</h3>
        <button class="delete-btn" data-index="${index}">Delete</button>
      </div>
      <p>Streak: <strong>${streak}</strong></p>
      <button class="done-btn" data-index="${index}">
        ${doneToday ? "Undo Today" : "Mark Done"}
      </button>
    `;

    habitList.appendChild(card);
  });

  document.querySelectorAll(".done-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = Number(e.target.dataset.index);
      const key = todayKey();
      habits[i].history[key] = !habits[i].history[key];
      saveHabits();
      renderHabits();
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const i = Number(e.target.dataset.index);
      habits.splice(i, 1);
      saveHabits();
      renderHabits();
    });
  });
}

addHabitBtn.addEventListener("click", () => {
  const name = habitInput.value.trim();
  if (!name) return;

  habits.push({
    name,
    history: {}
  });

  habitInput.value = "";
  saveHabits();
  renderHabits();
});

renderHabits();
