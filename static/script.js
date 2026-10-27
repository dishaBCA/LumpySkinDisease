document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  menuToggle?.addEventListener("click", () => nav.classList.toggle("open"));
  nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => nav.classList.remove("open")));

  const animalForm = document.getElementById("animalForm");
  const animalRows = document.getElementById("animalRows");
  const registerMessage = document.getElementById("registerMessage");
  const STORAGE_KEY = "lumpySkinCareAnimals";

  function getAnimals() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }
  function renderAnimals() {
    const animals = getAnimals();
    animalRows.replaceChildren();
    if (!animals.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5; cell.className = "empty-state"; cell.textContent = "No animals registered yet.";
      row.appendChild(cell); animalRows.appendChild(row); return;
    }
    animals.forEach((animal, index) => {
      const row = document.createElement("tr");
      [animal.id, animal.type, animal.age || "—", animal.owner || "—"].forEach(value => {
        const cell = document.createElement("td"); cell.textContent = value; row.appendChild(cell);
      });
      const actionCell = document.createElement("td");
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "delete-button"; remove.textContent = "Delete";
      remove.addEventListener("click", () => { const current = getAnimals(); current.splice(index, 1); localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); renderAnimals(); });
      actionCell.appendChild(remove); row.appendChild(actionCell); animalRows.appendChild(row);
    });
  }
  animalForm.addEventListener("submit", event => {
    event.preventDefault();
    const id = document.getElementById("animalId").value.trim();
    if (!id) return;
    const animals = getAnimals();
    if (animals.some(animal => animal.id.toLowerCase() === id.toLowerCase())) {
      registerMessage.textContent = "That animal ID is already registered."; registerMessage.className = "status-message error"; return;
    }
    animals.push({ id, type: document.getElementById("animalType").value, age: document.getElementById("animalAge").value, owner: document.getElementById("ownerName").value.trim() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(animals)); animalForm.reset();
    registerMessage.textContent = "Animal record saved in this browser."; registerMessage.className = "status-message success"; renderAnimals();
  });
  renderAnimals();

  const predictionForm = document.getElementById("predictionForm");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const predictionMessage = document.getElementById("predictionMessage");
  const predictionResult = document.getElementById("predictionResult");
  const predictButton = document.getElementById("predictButton");
  let previewUrl = null;

  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    predictionResult.classList.add("hidden"); predictionMessage.textContent = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) { imagePreview.classList.add("hidden"); return; }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      imageInput.value = ""; imagePreview.classList.add("hidden");
      predictionMessage.textContent = "Please select a JPG or PNG image."; predictionMessage.className = "status-message error"; return;
    }
    if (file.size > 8 * 1024 * 1024) {
      imageInput.value = ""; imagePreview.classList.add("hidden");
      predictionMessage.textContent = "The image must be smaller than 8 MB."; predictionMessage.className = "status-message error"; return;
    }
    previewUrl = URL.createObjectURL(file); imagePreview.src = previewUrl; imagePreview.classList.remove("hidden");
  });

  predictionForm.addEventListener("submit", async event => {
    event.preventDefault();
    const file = imageInput.files?.[0];
    if (!file) { predictionMessage.textContent = "Choose an image first."; predictionMessage.className = "status-message error"; return; }
    const data = new FormData(); data.append("image", file);
    predictButton.disabled = true; predictButton.textContent = "Analyzing…";
    predictionMessage.textContent = "Sending image to the model service…"; predictionMessage.className = "status-message";
    predictionResult.classList.add("hidden");
    try {
      const response = await fetch("/predict", { method: "POST", body: data });
      const raw = await response.text();
      let result;
      try { result = JSON.parse(raw); }
      catch { throw new Error("The prediction server returned an incomplete response. It may be restarting or processing slowly. Please try again."); }
      if (!response.ok) throw new Error(result.error || "Prediction failed.");
      const title = document.createElement("h3"); title.textContent = "Screening result";
      const label = document.createElement("p"); label.className = "result-label"; label.textContent = result.prediction;
      const confidence = document.createElement("p"); confidence.className = "confidence"; confidence.textContent = "Model confidence: " + Number(result.confidence).toFixed(1) + "%";
      const scores = document.createElement("div");
      if (result.class_scores && typeof result.class_scores === "object") {
        Object.entries(result.class_scores).forEach(([name, value]) => {
          const pct = Math.max(0, Math.min(100, Number(value) || 0));
          const row = document.createElement("div"); row.className = "score-row";
          const heading = document.createElement("div"); heading.className = "score-heading";
          const nameEl = document.createElement("span"); nameEl.textContent = name;
          const valueEl = document.createElement("span"); valueEl.textContent = pct.toFixed(1) + "%";
          heading.append(nameEl, valueEl);
          const track = document.createElement("div"); track.className = "score-track";
          const fill = document.createElement("div"); fill.className = "score-fill"; fill.style.width = pct + "%";
          track.appendChild(fill); row.append(heading, track); scores.appendChild(row);
        });
      }
      const note = document.createElement("p"); note.textContent = "This result is not a veterinary diagnosis. Ask a qualified veterinarian to assess the animal.";
      predictionResult.replaceChildren(title, label, confidence, scores, note); predictionResult.classList.remove("hidden");
      predictionMessage.textContent = "Analysis complete."; predictionMessage.className = "status-message success";
    } catch (error) {
      predictionMessage.textContent = error.message || "Could not connect to the prediction server. Check that the Flask app is running and the model file is installed."; predictionMessage.className = "status-message error";
    } finally {
      predictButton.disabled = false; predictButton.textContent = "Run AI screening →";
    }
  });
});