// Same-origin: Vite dev server proxies /api → the AI proxy (port 3001).
const API_BASE = "";
const CACHE_PREFIX = "sparsh_mukthi_cache_";

function getCachedItem(key) {
  try {
    const data = localStorage.getItem(CACHE_PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function setCachedItem(key, val) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    // Silent catch of quota errors
  }
}

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
export async function fetchLesson(config) {
  const hasCustomDoubt = Boolean(config.customDoubt && config.customDoubt.trim());
  const normalizedTopic = String(config.topic || "").replace(/\s+/g, "_");
  const cacheKey = `lesson_${config.classLevel}_${config.subject}_${normalizedTopic}_${config.teacher.name}`;

  if (!hasCustomDoubt) {
    const cached = getCachedItem(cacheKey);
    if (cached) {
      console.log("[api-cache] Instant hit for lesson:", cacheKey);
      return cached;
    }
  }

  const result = await post("/api/lesson", {
    classLevel: config.classLevel,
    subject: config.subject,
    topic: config.topic,
    teacherName: config.teacher.name,
    teacherStyle: config.teacher.style,
    studentNames: config.studentNames,
    customDoubt: config.customDoubt,
    segmentCount: 3,
  });

  if (!hasCustomDoubt) {
    setCachedItem(cacheKey, result);
  }
  return result;
}

/** Returns { provider, data: { stops:[{id,title,spoken,board}] } } */
export async function fetchTour(config) {
  const cacheKey = `tour_${config?.classLevel ?? 3}_${config?.teacher?.name ?? "Miss_Anaya"}`;

  const cached = getCachedItem(cacheKey);
  if (cached) {
    console.log("[api-cache] Instant hit for tour:", cacheKey);
    return cached;
  }

  const result = await post("/api/tour", {
    classLevel: config?.classLevel ?? 3,
    teacherName: config?.teacher?.name ?? "Miss Anaya",
  });

  setCachedItem(cacheKey, result);
  return result;
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
