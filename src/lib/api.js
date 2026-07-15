const API_BASE = "http://localhost:3001";

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json;
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

/** Returns { provider, data: lessonPlan } */
export function fetchLesson(config) {
  return post("/api/lesson", {
    classLevel: config.classLevel,
    subject: config.subject,
    topic: config.topic,
    teacherName: config.teacher.name,
    teacherStyle: config.teacher.style,
    studentNames: config.studentNames,
    customDoubt: config.customDoubt,
    segmentCount: 3,
  });
}

/** Returns { provider, data: { stops:[{id,title,spoken,board}] } } */
export function fetchTour(config) {
  return post("/api/tour", {
    classLevel: config?.classLevel ?? 3,
    teacherName: config?.teacher?.name ?? "Miss Anaya",
  });
}

/** Returns { provider, data: { spoken:[], boardSteps:[] } } */
export function askDoubt(question, config, extra = {}) {
  return post("/api/doubt", {
    question,
    topic: config.topic,
    classLevel: config.classLevel,
    teacherName: config.teacher.name,
    studentName: extra.studentName ?? config.userName ?? "",
    reexplain: Boolean(extra.reexplain),
  });
}
