import { useState } from "react";
import { CURRICULUM, TEACHER_PRESETS, STUDENT_NAMES } from "../../data/curriculum";
import { useLessonStore } from "../../store/useLessonStore";
import { fetchLesson } from "../../lib/api";
import "./Dashboard.css";

export function Dashboard() {
  const { setConfig, setLesson, setPhase, setError } = useLessonStore();
  const [userName, setUserName] = useState("");
  const [classLevel, setClassLevel] = useState(2);
  const [subject, setSubject] = useState("Science");
  const [topic, setTopic] = useState(CURRICULUM.Science.topics[2][0]);
  const [teacherIdx, setTeacherIdx] = useState(0);
  const [classSize, setClassSize] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(20);
  const [breakEveryMinutes, setBreakEveryMinutes] = useState(10);
  const [customDoubt, setCustomDoubt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const topics = CURRICULUM[subject].topics[classLevel];

  const pickSubject = (s) => {
    setSubject(s);
    setTopic(CURRICULUM[s].topics[classLevel][0]);
  };
  const pickClass = (c) => {
    setClassLevel(c);
    setTopic(CURRICULUM[subject].topics[c][0]);
  };

  const enterClassroom = async () => {
    const config = {
      userName: userName.trim() || "Explorer",
      classLevel,
      subject,
      topic,
      teacher: TEACHER_PRESETS[teacherIdx],
      studentNames: STUDENT_NAMES.slice(0, classSize),
      customDoubt: customDoubt.trim(),
      sessionMinutes,
      breakEveryMinutes,
    };
    setLoading(true);
    setLoadError("");
    setConfig(config);
    setPhase("loading");
    try {
      const { data } = await fetchLesson(config);
      setLesson(data);
      setPhase("intro");
    } catch (err) {
      setLoading(false);
      setLoadError(err.message);
      setPhase("dashboard");
    }
  };

  const theme = CURRICULUM[subject].color;

  return (
    <div className="dashboard" style={{ "--theme": theme }}>
      <div className="dash-card">
        <h1>🏫 My Magic Classroom</h1>
        <p className="tagline">Set up your class, then step inside!</p>

        <div className="dash-section">
          <label>My name is</label>
          <input
            type="text"
            placeholder="Type your name so the teacher knows you!"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="dash-section">
          <label>I am in Class</label>
          <div className="pill-row">
            {[1, 2, 3, 4].map((c) => (
              <button key={c} className={c === classLevel ? "pill active" : "pill"} onClick={() => pickClass(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="dash-section">
          <label>Subject</label>
          <div className="pill-row">
            {Object.keys(CURRICULUM).map((s) => (
              <button key={s} className={s === subject ? "pill active" : "pill"} onClick={() => pickSubject(s)}>
                {CURRICULUM[s].emoji} {s}
              </button>
            ))}
          </div>
        </div>

        <div className="dash-section">
          <label>Today&apos;s Topic</label>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="dash-grid">
          <div className="dash-section">
            <label>My Teacher</label>
            <select value={teacherIdx} onChange={(e) => setTeacherIdx(Number(e.target.value))}>
              {TEACHER_PRESETS.map((t, i) => (
                <option key={t.name} value={i}>
                  {t.name} — {t.style}
                </option>
              ))}
            </select>
          </div>
          <div className="dash-section">
            <label>Classmates: {classSize}</label>
            <input type="range" min={2} max={6} value={classSize} onChange={(e) => setClassSize(Number(e.target.value))} />
          </div>
          <div className="dash-section">
            <label>Class length: {sessionMinutes} min</label>
            <input
              type="range"
              min={10}
              max={40}
              step={5}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value))}
            />
          </div>
          <div className="dash-section">
            <label>Break every: {breakEveryMinutes} min</label>
            <input
              type="range"
              min={5}
              max={20}
              step={5}
              value={breakEveryMinutes}
              onChange={(e) => setBreakEveryMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="dash-section">
          <label>Anything you want the teacher to solve on the board? (optional)</label>
          <input
            type="text"
            placeholder="e.g. Why does the moon change shape?"
            value={customDoubt}
            onChange={(e) => setCustomDoubt(e.target.value)}
          />
        </div>

        {loadError && <p className="dash-error">😕 {loadError}</p>}

        <button className="enter-btn" onClick={enterClassroom} disabled={loading}>
          {loading ? "Your teacher is preparing the class…" : "🚪 Enter Classroom"}
        </button>
      </div>
    </div>
  );
}
