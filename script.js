let processes = [];
let processIdCounter = 1;

// Add custom number input controls on page load
document.addEventListener("DOMContentLoaded", function () {
  const numberInputs = document.querySelectorAll('input[type="number"]');

  numberInputs.forEach((input) => {
    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "number-input-wrapper";

    // Create controls container
    const controls = document.createElement("div");
    controls.className = "number-controls";

    // Create increment button
    const incrementBtn = document.createElement("div");
    incrementBtn.className = "number-btn";
    incrementBtn.innerHTML = "▲";
    incrementBtn.onclick = () => {
      const step = parseFloat(input.step) || 1;
      const max = input.max ? parseFloat(input.max) : Infinity;
      const current = parseFloat(input.value) || 0;
      if (current + step <= max) {
        input.value = current + step;
        input.dispatchEvent(new Event("change"));
      }
    };

    // Create decrement button
    const decrementBtn = document.createElement("div");
    decrementBtn.className = "number-btn";
    decrementBtn.innerHTML = "▼";
    decrementBtn.onclick = () => {
      const step = parseFloat(input.step) || 1;
      const min = input.min ? parseFloat(input.min) : -Infinity;
      const current = parseFloat(input.value) || 0;
      if (current - step >= min) {
        input.value = current - step;
        input.dispatchEvent(new Event("change"));
      }
    };

    // Assemble controls
    controls.appendChild(incrementBtn);
    controls.appendChild(decrementBtn);

    // Wrap input
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(controls);
  });
});

function toggleQuantum() {
  const algorithm = document.getElementById("algorithm").value;
  const quantumGroup = document.getElementById("quantumGroup");

  if (algorithm === "roundrobin") {
    quantumGroup.classList.add("show");
  } else {
    quantumGroup.classList.remove("show");
  }
}

function addProcess() {
  const name =
    document.getElementById("processName").value || `P${processIdCounter}`;
  const arrivalTime =
    parseInt(document.getElementById("arrivalTime").value) || 0;
  const burstTime = parseInt(document.getElementById("burstTime").value) || 1;
  const priority = parseInt(document.getElementById("priority").value) || 1;

  processes.push({
    id: processIdCounter++,
    name: name,
    arrivalTime: arrivalTime,
    burstTime: burstTime,
    priority: priority,
    completionTime: 0,
    turnaroundTime: 0,
    waitingTime: 0,
    serviceIndex: 0,
  });

  updateTable();
  clearInputs();
}

function clearInputs() {
  document.getElementById("processName").value = "";
  document.getElementById("arrivalTime").value = "0";
  document.getElementById("burstTime").value = "1";
  document.getElementById("priority").value = "1";
}

function generateRandomProcesses() {
  const count = Math.floor(Math.random() * 3) + 4; // 4 a 6 procesos

  for (let i = 0; i < count; i++) {
    processes.push({
      id: processIdCounter++,
      name: `P${processIdCounter - 1}`,
      arrivalTime: Math.floor(Math.random() * 10),
      burstTime: Math.floor(Math.random() * 10) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
      completionTime: 0,
      turnaroundTime: 0,
      waitingTime: 0,
      serviceIndex: 0,
    });
  }

  updateTable();
}

function clearAll() {
  processes = [];
  processIdCounter = 1;
  updateTable();
  document.getElementById("ganttChart").innerHTML = "";
  document.getElementById("stats").style.display = "none";
}

function deleteProcess(id) {
  processes = processes.filter((p) => p.id !== id);
  updateTable();
}

function updateTable() {
  const tbody = document.getElementById("processTableBody");
  tbody.innerHTML = "";

  processes.forEach((process) => {
    const row = tbody.insertRow();
    row.innerHTML = `
            <td>${process.name}</td>
            <td>${process.arrivalTime}</td>
            <td>${process.burstTime}</td>
            <td>${process.priority}</td>
            <td>${process.completionTime || "-"}</td>
            <td>${process.turnaroundTime || "-"}</td>
            <td>${process.waitingTime || "-"}</td>
            <td>${
              process.serviceIndex ? process.serviceIndex.toFixed(2) : "-"
            }</td>
            <td><button class="danger" onclick="deleteProcess(${
              process.id
            })">Eliminar</button></td>
        `;
  });

  // Add average row if there are calculated processes
  const calculatedProcesses = processes.filter(
    (p) => p.turnaroundTime !== undefined
  );
  if (calculatedProcesses.length > 0) {
    const avgTAT = (
      calculatedProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0) /
      calculatedProcesses.length
    ).toFixed(2);
    const avgWT = (
      calculatedProcesses.reduce((sum, p) => sum + p.waitingTime, 0) /
      calculatedProcesses.length
    ).toFixed(2);
    const avgSI = (
      calculatedProcesses.reduce((sum, p) => sum + p.serviceIndex, 0) /
      calculatedProcesses.length
    ).toFixed(2);

    const avgRow = tbody.insertRow();
    avgRow.style.fontWeight = "700";
    avgRow.style.background = "rgba(255, 255, 255, 0.08)";
    avgRow.innerHTML = `
            <td colspan="5" style="text-align: right; padding-right: 2rem;">Promedio:</td>
            <td>${avgTAT}</td>
            <td>${avgWT}</td>
            <td>${avgSI}</td>
            <td></td>
        `;
  }
}

function calculate() {
  if (processes.length === 0) {
    alert("Por favor, agregue al menos un proceso");
    return;
  }

  const algorithm = document.getElementById("algorithm").value;
  let ganttData = [];

  switch (algorithm) {
    case "fcfs":
      ganttData = fcfs();
      break;
    case "sjf":
      ganttData = sjf();
      break;
    case "srtf":
      ganttData = srtf();
      break;
    case "priority":
      ganttData = priorityNonPreemptive();
      break;
    case "priorityPreemptive":
      ganttData = priorityPreemptive();
      break;
    case "roundrobin":
      const quantum = parseInt(document.getElementById("quantum").value) || 2;
      ganttData = roundRobin(quantum);
      break;
  }

  calculateMetrics();
  updateTable();
  drawGanttChart(ganttData);
  displayStats();
}

function fcfs() {
  const sortedProcesses = [...processes].sort(
    (a, b) => a.arrivalTime - b.arrivalTime
  );
  let currentTime = 0;
  let ganttData = [];

  sortedProcesses.forEach((process) => {
    if (currentTime < process.arrivalTime) {
      currentTime = process.arrivalTime;
    }

    ganttData.push({
      process: process.name,
      start: currentTime,
      end: currentTime + process.burstTime,
    });

    currentTime += process.burstTime;
    process.completionTime = currentTime;
  });

  return ganttData;
}

function sjf() {
  const sortedProcesses = [...processes].sort((a, b) => {
    if (a.arrivalTime === b.arrivalTime) {
      return a.burstTime - b.burstTime;
    }
    return a.arrivalTime - b.arrivalTime;
  });

  let currentTime = 0;
  let completed = [];
  let ganttData = [];

  while (completed.length < sortedProcesses.length) {
    let available = sortedProcesses.filter(
      (p) => p.arrivalTime <= currentTime && !completed.includes(p.id)
    );

    if (available.length === 0) {
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.burstTime - b.burstTime);
    let process = available[0];

    ganttData.push({
      process: process.name,
      start: currentTime,
      end: currentTime + process.burstTime,
    });

    currentTime += process.burstTime;
    process.completionTime = currentTime;
    completed.push(process.id);
  }

  return ganttData;
}

function srtf() {
  let processesWork = processes.map((p) => ({
    ...p,
    remainingTime: p.burstTime,
  }));

  let currentTime = 0;
  let completed = 0;
  let ganttData = [];
  let lastProcess = null;
  let lastStart = 0;

  while (completed < processesWork.length) {
    let available = processesWork.filter(
      (p) => p.arrivalTime <= currentTime && p.remainingTime > 0
    );

    if (available.length === 0) {
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.remainingTime - b.remainingTime);
    let process = available[0];

    if (lastProcess !== process.name) {
      if (lastProcess !== null) {
        ganttData.push({
          process: lastProcess,
          start: lastStart,
          end: currentTime,
        });
      }
      lastProcess = process.name;
      lastStart = currentTime;
    }

    process.remainingTime--;
    currentTime++;

    if (process.remainingTime === 0) {
      process.completionTime = currentTime;
      const originalProcess = processes.find((p) => p.id === process.id);
      originalProcess.completionTime = currentTime;
      completed++;
    }
  }

  if (lastProcess !== null) {
    ganttData.push({
      process: lastProcess,
      start: lastStart,
      end: currentTime,
    });
  }

  return ganttData;
}

function priorityNonPreemptive() {
  const sortedProcesses = [...processes].sort((a, b) => {
    if (a.arrivalTime === b.arrivalTime) {
      return a.priority - b.priority;
    }
    return a.arrivalTime - b.arrivalTime;
  });

  let currentTime = 0;
  let completed = [];
  let ganttData = [];

  while (completed.length < sortedProcesses.length) {
    let available = sortedProcesses.filter(
      (p) => p.arrivalTime <= currentTime && !completed.includes(p.id)
    );

    if (available.length === 0) {
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.priority - b.priority);
    let process = available[0];

    ganttData.push({
      process: process.name,
      start: currentTime,
      end: currentTime + process.burstTime,
    });

    currentTime += process.burstTime;
    process.completionTime = currentTime;
    completed.push(process.id);
  }

  return ganttData;
}

function priorityPreemptive() {
  let processesWork = processes.map((p) => ({
    ...p,
    remainingTime: p.burstTime,
  }));

  let currentTime = 0;
  let completed = 0;
  let ganttData = [];
  let lastProcess = null;
  let lastStart = 0;

  while (completed < processesWork.length) {
    let available = processesWork.filter(
      (p) => p.arrivalTime <= currentTime && p.remainingTime > 0
    );

    if (available.length === 0) {
      currentTime++;
      continue;
    }

    available.sort((a, b) => a.priority - b.priority);
    let process = available[0];

    if (lastProcess !== process.name) {
      if (lastProcess !== null) {
        ganttData.push({
          process: lastProcess,
          start: lastStart,
          end: currentTime,
        });
      }
      lastProcess = process.name;
      lastStart = currentTime;
    }

    process.remainingTime--;
    currentTime++;

    if (process.remainingTime === 0) {
      process.completionTime = currentTime;
      const originalProcess = processes.find((p) => p.id === process.id);
      originalProcess.completionTime = currentTime;
      completed++;
    }
  }

  if (lastProcess !== null) {
    ganttData.push({
      process: lastProcess,
      start: lastStart,
      end: currentTime,
    });
  }

  return ganttData;
}

function roundRobin(quantum) {
  let processesWork = processes.map((p) => ({
    ...p,
    remainingTime: p.burstTime,
  }));

  processesWork.sort((a, b) => a.arrivalTime - b.arrivalTime);

  let currentTime = 0;
  let queue = [];
  let ganttData = [];
  let completed = 0;

  // Agregar procesos iniciales a la cola
  processesWork.forEach((p) => {
    if (p.arrivalTime === 0) {
      queue.push(p);
    }
  });

  while (completed < processesWork.length) {
    if (queue.length === 0) {
      // Si no hay procesos en la cola, avanzar al siguiente tiempo de llegada
      let nextArrival = processesWork
        .filter((p) => p.arrivalTime > currentTime && p.remainingTime > 0)
        .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];

      if (nextArrival) {
        currentTime = nextArrival.arrivalTime;
        queue.push(nextArrival);
      } else {
        break;
      }
    }

    let process = queue.shift();
    let executeTime = Math.min(quantum, process.remainingTime);

    ganttData.push({
      process: process.name,
      start: currentTime,
      end: currentTime + executeTime,
    });

    currentTime += executeTime;
    process.remainingTime -= executeTime;

    // Agregar nuevos procesos que llegaron durante la ejecución
    processesWork.forEach((p) => {
      if (
        p.arrivalTime > currentTime - executeTime &&
        p.arrivalTime <= currentTime &&
        p.remainingTime > 0 &&
        p.id !== process.id &&
        !queue.some((q) => q.id === p.id)
      ) {
        queue.push(p);
      }
    });

    if (process.remainingTime === 0) {
      process.completionTime = currentTime;
      const originalProcess = processes.find((p) => p.id === process.id);
      originalProcess.completionTime = currentTime;
      completed++;
    } else {
      queue.push(process);
    }
  }

  return ganttData;
}

function calculateMetrics() {
  processes.forEach((process) => {
    process.turnaroundTime = process.completionTime - process.arrivalTime;
    process.waitingTime = process.turnaroundTime - process.burstTime;
    process.serviceIndex = process.burstTime / process.turnaroundTime;
  });
}

function drawGanttChart(ganttData) {
  const ganttChart = document.getElementById("ganttChart");
  ganttChart.innerHTML = "";

  if (ganttData.length === 0) return;

  // Colores para los procesos
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#6C5CE7",
    "#A29BFE",
    "#FD79A8",
  ];

  const processColors = {};
  let colorIndex = 0;

  // Asignar colores a los procesos
  const processList = [...new Set(ganttData.map((item) => item.process))];
  processList.forEach((processName) => {
    processColors[processName] = colors[colorIndex % colors.length];
    colorIndex++;
  });

  // Calcular tiempo máximo
  const maxTime = Math.max(...ganttData.map((d) => d.end));
  const pixelsPerUnit = 60; // Píxeles por unidad de tiempo (cuadrado 1:1)

  // Crear escala de tiempo superior
  const timeScale = document.createElement("div");
  timeScale.style.display = "flex";
  timeScale.style.marginBottom = "10px";
  timeScale.style.paddingLeft = "120px"; // Espacio para las etiquetas
  timeScale.style.color = "#ffffff";
  timeScale.style.fontWeight = "700";
  timeScale.style.fontSize = "12px";
  timeScale.style.borderBottom = "1px solid rgba(255, 255, 255, 0.2)";
  timeScale.style.paddingBottom = "5px";
  timeScale.style.position = "relative";
  timeScale.style.height = "20px";

  for (let i = 0; i <= maxTime; i++) {
    const tick = document.createElement("div");
    tick.style.position = "absolute";
    tick.style.left = `${120 + i * pixelsPerUnit}px`;
    tick.style.transform = "translateX(-50%)";
    tick.textContent = i;
    timeScale.appendChild(tick);
  }

  ganttChart.appendChild(timeScale);

  // Crear una fila por cada proceso (en orden inverso EDCBA)
  const reversedProcessList = [...processList].reverse();
  reversedProcessList.forEach((processName) => {
    const row = document.createElement("div");
    row.className = "gantt-row";

    // Label del proceso
    const label = document.createElement("div");
    label.className = "gantt-label";
    label.textContent = processName;

    // Timeline del proceso
    const timeline = document.createElement("div");
    timeline.className = "gantt-timeline";
    timeline.style.position = "relative";
    timeline.style.height = `${pixelsPerUnit}px`;
    timeline.style.width = `${(maxTime + 1) * pixelsPerUnit}px`;
    timeline.style.backgroundImage = `
      linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
    `;
    timeline.style.backgroundSize = `${pixelsPerUnit}px ${pixelsPerUnit}px`;

    // Agregar todas las barras de este proceso
    ganttData
      .filter((item) => item.process === processName)
      .forEach((item) => {
        const duration = item.end - item.start;
        const bar = document.createElement("div");
        bar.className = "gantt-bar";
        bar.style.position = "absolute";
        bar.style.left = `${item.start * pixelsPerUnit}px`;
        bar.style.width = `${duration * pixelsPerUnit}px`;
        bar.style.height = `${pixelsPerUnit}px`;
        bar.style.backgroundColor = processColors[processName];
        bar.innerHTML = `<small>${item.start} - ${item.end}</small>`;
        timeline.appendChild(bar);
      });

    row.appendChild(label);
    row.appendChild(timeline);
    ganttChart.appendChild(row);
  });
}

function displayStats() {
  const stats = document.getElementById("stats");
  stats.style.display = "grid";

  const avgTAT =
    processes.reduce((sum, p) => sum + p.turnaroundTime, 0) / processes.length;
  const avgWT =
    processes.reduce((sum, p) => sum + p.waitingTime, 0) / processes.length;
  const avgSI =
    processes.reduce((sum, p) => sum + p.serviceIndex, 0) / processes.length;

  const totalBurstTime = processes.reduce((sum, p) => sum + p.burstTime, 0);
  const totalTime = Math.max(...processes.map((p) => p.completionTime));
  const cpuUtilization = (totalBurstTime / totalTime) * 100;

  document.getElementById("avgTAT").textContent = avgTAT.toFixed(2);
  document.getElementById("avgWT").textContent = avgWT.toFixed(2);
  document.getElementById("avgSI").textContent = avgSI.toFixed(2);
  document.getElementById("cpuUtil").textContent =
    cpuUtilization.toFixed(1) + "%";
}

// Inicializar la página
document.addEventListener("DOMContentLoaded", function () {
  toggleQuantum();
});
