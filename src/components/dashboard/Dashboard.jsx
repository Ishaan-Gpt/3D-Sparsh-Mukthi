import { useState } from "react";
import { CURRICULUM, TEACHER_PRESETS, STUDENT_NAMES } from "../../data/curriculum";
import { useLessonStore } from "../../store/useLessonStore";
import { fetchLesson } from "../../lib/api";
import "./Dashboard.css";

export function Dashboard() {
  const { setConfig, setLesson, setPhase } = useLessonStore();
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
      {/* animated cosmic backdrop */}
      <div className="dash-bg">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="dash-stars" />
      </div>

      <main className="dash-page">
        {/* ---------- hero ---------- */}
        <header className="dash-hero">
          <div className="dash-logo">🏫</div>
          <h1>
            Sparsh <em>Mukthi</em>
          </h1>
          <p className="dash-sub">
            A living 3D classroom with a real AI teacher — she knows your name, answers your
            doubts, watches that you&apos;re following, and takes you flying through space.
          </p>
          <div className="dash-usp-row">
            <span className="usp-chip">👀 Attention-aware teaching</span>
            <span className="usp-chip">✋ Doubt-safe participation</span>
            <span className="usp-chip">🧒 Classroom social presence</span>
            <span className="usp-chip">🖐 Gesture-first control</span>
          </div>
        </header>

        {/* ---------- setup card ---------- */}
        <section className="dash-card">
          <h2>Set up today&apos;s class</h2>

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
              <input type="range" min={10} max={40} step={5} value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} />
            </div>
            <div className="dash-section">
              <label>Break every: {breakEveryMinutes} min</label>
              <input type="range" min={5} max={20} step={5} value={breakEveryMinutes} onChange={(e) => setBreakEveryMinutes(Number(e.target.value))} />
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

          {loadError && <p className="dash-error">😕 {loadError} — is the AI server running?</p>}

          <button className="enter-btn" onClick={enterClassroom} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Your teacher is preparing the class…
              </>
            ) : (
              "🚪 Enter Classroom"
            )}
          </button>
        </section>

        {/* ---------- feature cards ---------- */}
        <section className="dash-features">
          <article className="feat">
            <span className="feat-emoji">🧑‍🏫</span>
            <h3>A teacher who sees you</h3>
            <p>
              She pauses when you look away, calls you by name, and never moves on until your
              doubt is truly clear.
            </p>
          </article>
          <article className="feat">
            <span className="feat-emoji">🖐</span>
            <h3>Touch nothing, control everything</h3>
            <p>
              Point to move the cursor, join two fingers to click, pinch to zoom into the board,
              raise your hand to speak.
            </p>
          </article>
          <article className="feat">
            <span className="feat-emoji">🪐</span>
            <h3>Lessons you can step inside</h3>
            <p>
              One tap turns the classroom into a particle solar system you can fly through —
              guided by your teacher&apos;s voice.
            </p>
          </article>
        </section>

        {/* ---------- footer ---------- */}
        <footer className="dash-footer">
          <div className="foot-grid">
            <div className="foot-brand">
              <span className="foot-logo">🏫</span>
              <h4>
                Sparsh <em>Mukthi</em>
              </h4>
              <p>
                Desktop-VR education for Classes 1–4. Real AI, real voice, real attention — no
                headset, no keyboard, just you and your hands.
              </p>
            </div>
            <div className="foot-col">
              <h5>Gestures</h5>
              <ul>
                <li>✋ Hold palm up 3s — ask a doubt</li>
                <li>🖐 Move open palm — look around</li>
                <li>☝️ Point — move the cursor</li>
                <li>✌️ Join two fingers — click</li>
                <li>🤏 Pinch — zoom the board</li>
              </ul>
            </div>
            <div className="foot-col">
              <h5>Inside the class</h5>
              <ul>
                <li>📚 AI-planned live lessons</li>
                <li>🙋 Classmates who ask questions</li>
                <li>📝 A whiteboard that writes itself</li>
                <li>🧘 Enforced eye-rest breaks</li>
                <li>🪐 Immersive Study modules</li>
              </ul>
            </div>
            <div className="foot-col">
              <h5>Powered by</h5>
              <ul>
                <li>Gemini · lesson &amp; voice AI</li>
                <li>Three.js · React Three Fiber</li>
                <li>MediaPipe · on-device vision</li>
                <li>Web Speech · voice input</li>
              </ul>
            </div>
          </div>
          <div className="foot-bar">
            <span>Made with ❤️ for curious kids</span>
            <span className="foot-dot">•</span>
            <span>Your camera never leaves your computer</span>
            <span className="foot-dot">•</span>
            <span>© {new Date().getFullYear()} Sparsh Mukthi</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
