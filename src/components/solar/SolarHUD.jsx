import { useEffect, useRef, useState } from "react";
import { useLessonStore } from "../../store/useLessonStore";
import { bodyById, BODIES, TOUR_ORDER } from "../../data/solarData";
import { fetchTour, askDoubt } from "../../lib/api";
import { gestureState } from "../../lib/gestureState";
import "./Solar.css";

// Curated fallback narration (used if the AI proxy is unreachable).
function localTour() {
  return {
    stops: [
      {
        id: "overview",
        title: "Our Solar System",
        spoken: [
          "Welcome, space explorer! This is our whole solar system.",
          "In the middle burns the Sun, our very own star.",
          "Eight planets travel around it in giant circles called orbits.",
          "Let's fly closer and meet each one!",
        ],
        board: ["1 star: the Sun", "8 planets in orbit", "Everything moves around the Sun"],
      },
      ...BODIES.map((b) => ({
        id: b.id,
        title: b.name,
        spoken: b.facts,
        board: b.facts.map((f) => f.split("—")[0].split(".")[0]),
      })),
    ],
  };
}

export function SolarHUD() {
  const solarMode = useLessonStore((s) => s.solarMode);
  const setSolarMode = useLessonStore((s) => s.setSolarMode);
  const selectedBody = useLessonStore((s) => s.selectedBody);
  const setSelectedBody = useLessonStore((s) => s.setSelectedBody);
  const exitSolar = useLessonStore((s) => s.exitSolar);
  const tour = useLessonStore((s) => s.tour);
  const setTour = useLessonStore((s) => s.setTour);
  const setTourStep = useLessonStore((s) => s.setTourStep);
  const tourStep = useLessonStore((s) => s.tourStep);
  const caption = useLessonStore((s) => s.caption);
  const captionSpeaker = useLessonStore((s) => s.captionSpeaker);
  const config = useLessonStore((s) => s.config);
  const [loadingTour, setLoadingTour] = useState(false);
  const [askState, setAskState] = useState(null); // null | 'loading' | {answer}

  const body = selectedBody ? bodyById(selectedBody) : null;

  const startTour = async () => {
    setLoadingTour(true);
    let t = tour;
    if (!t) {
      try {
        const res = await fetchTour(config);
        t = res.data;
      } catch {
        t = localTour(); // curated offline narration
      }
      setTour(t);
    }
    setTourStep(0);
    setLoadingTour(false);
    setSolarMode("tour");
  };

  const askAboutPlanet = async () => {
    setAskState("loading");
    try {
      const { data } = await askDoubt(
        `Tell me one more amazing thing about ${body.name} that kids love!`,
        config
      );
      setAskState({ answer: data.spoken.join(" ") });
    } catch {
      setAskState({ answer: "Hmm, I can't reach the teacher right now. Try again!" });
    }
  };

  useEffect(() => setAskState(null), [selectedBody]);

  return (
    <div className="solar-hud">
      {/* top bar */}
      <div className="solar-top">
        <span>🪐 Immersive Study: The Solar System</span>
        {solarMode === "tour" && tour && (
          <span className="solar-progress">
            {tourStep + 1} / {tour.stops.length}
          </span>
        )}
        <button className="solar-btn small" onClick={exitSolar}>
          ← Back to classroom
        </button>
      </div>

      {/* mode chooser */}
      {solarMode === "choose" && (
        <div className="solar-choose">
          <h1>🌌 The Solar System</h1>
          <p>How do you want to explore?</p>
          <div className="solar-choose-row">
            <button className="solar-card" onClick={() => setSolarMode("interact")}>
              <span className="solar-card-emoji">🕹️</span>
              <strong>Interact</strong>
              <small>
                Fly around with your hand, pinch to zoom, and tap any planet to learn its secrets.
              </small>
            </button>
            <button className="solar-card" onClick={startTour} disabled={loadingTour}>
              <span className="solar-card-emoji">🎬</span>
              <strong>{loadingTour ? "Preparing the journey…" : "Play Animation"}</strong>
              <small>Your teacher flies you from the Sun to Neptune, planet by planet.</small>
            </button>
          </div>
        </div>
      )}

      {/* interact: hint + info card */}
      {solarMode === "interact" && !body && (
        <div className="solar-hint">
          🖐 move hand = fly around · 🤏 pinch = zoom · tap/click a planet to learn about it
        </div>
      )}
      {solarMode === "interact" && body && (
        <div className="solar-info">
          <h2 style={{ color: body.color }}>{body.name}</h2>
          <ul>
            {body.facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          {askState && askState !== "loading" && <p className="solar-ai">🧑‍🏫 {askState.answer}</p>}
          <div className="solar-info-row">
            <button className="solar-btn" onClick={askAboutPlanet} disabled={askState === "loading"}>
              {askState === "loading" ? "Asking teacher…" : "✨ Tell me more!"}
            </button>
            <button className="solar-btn ghost" onClick={() => setSelectedBody(null)}>
              ✕ Zoom out
            </button>
          </div>
        </div>
      )}

      {/* tour captions + controls */}
      {solarMode === "tour" && caption && (
        <div className="solar-caption">
          <span className="solar-speaker">{captionSpeaker}</span>
          {caption}
        </div>
      )}
      {solarMode === "tour" && tour && (
        <div className="solar-tour-controls">
          <button
            className="solar-btn"
            onClick={() => tourStep < tour.stops.length - 1 && setTourStep(tourStep + 1)}
          >
            ⏭ Next: {tour.stops[tourStep + 1]?.title ?? "Finish"}
          </button>
          <button className="solar-btn ghost" onClick={() => setSolarMode("choose")}>
            ⏹ Stop tour
          </button>
        </div>
      )}
    </div>
  );
}

