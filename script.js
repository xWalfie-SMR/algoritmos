let processes = [];
let processIdCounter = 1;

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

  // Crear línea de tiempo
  const timeline = document.createElement("div");
  timeline.style.display = "flex";
  timeline.style.marginBottom = "10px";

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

  ganttData.forEach((item, index) => {
    if (!processColors[item.process]) {
      processColors[item.process] = colors[colorIndex % colors.length];
      colorIndex++;
    }

    const bar = document.createElement("div");
    bar.className = "gantt-bar";
    bar.style.background = processColors[item.process];
    bar.style.width = `${(item.end - item.start) * 50}px`;
    bar.innerHTML = `${item.process}<br><small>${item.start}-${item.end}</small>`;
    timeline.appendChild(bar);
  });

  ganttChart.appendChild(timeline);

  // Crear escala de tiempo
  const scale = document.createElement("div");
  scale.style.display = "flex";
  scale.style.marginTop = "10px";

  let maxTime = Math.max(...ganttData.map((d) => d.end));
  for (let i = 0; i <= maxTime; i++) {
    const tick = document.createElement("div");
    tick.style.width = "50px";
    tick.style.textAlign = "left";
    tick.style.fontSize = "12px";
    tick.style.color = "#666";
    tick.innerHTML = i;
    scale.appendChild(tick);
  }

  ganttChart.appendChild(scale);
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
