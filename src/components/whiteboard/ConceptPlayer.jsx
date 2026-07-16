/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";

/**
 * The teacher's animated slide (Remotion Player). One slide per teaching
 * segment: heading typewriter + springing board points + a concept animation.
 * The whole deck is data-driven from the lesson plan, so every slide of
 * today's class exists the moment the plan arrives — the teacher simply
 * advances through them. If @remotion/player fails to load the strip
 * disappears and the written notes still carry the lesson.
 */
export function ConceptPlayer({ visual, heading = "", points = [] }) {
  const [mod, setMod] = useState(null); // { Player, ConceptAnim, ... } | "failed"

  // load once at mount so the first slide starts instantly
  useEffect(() => {
    let gone = false;
    Promise.all([import("@remotion/player"), import("./animations.jsx")])
      .then(([player, anims]) => {
        if (!gone) setMod({ Player: player.Player, ...anims });
      })
      .catch((err) => {
        console.warn("Remotion player unavailable:", err);
        if (!gone) setMod("failed");
      });
    return () => {
      gone = true;
    };
  }, []);

  if (!visual || !mod || mod === "failed") return null;
  const { Player, ConceptAnim, animDuration, ANIM_FPS } = mod;

  return (
    <div className="board-anim">
      <Player
        // remount per slide so each segment's animation starts from frame 0
        key={`${heading}|${visual.kind}`}
        component={ConceptAnim}
        inputProps={{
          kind: visual.kind,
          items: visual.items,
          caption: visual.caption,
          heading,
          points,
        }}
        durationInFrames={Math.round(animDuration(visual))}
        fps={ANIM_FPS}
        compositionWidth={1024}
        compositionHeight={380}
        autoPlay
        loop
        controls={false}
        style={{ width: "100%" }}
      />
    </div>
  );
}
