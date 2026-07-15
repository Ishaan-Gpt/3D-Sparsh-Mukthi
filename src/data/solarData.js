// Solar system module data: compressed distances (not to scale, but ordered),
// kid-friendly real facts, and procedural texture recipes.
export const BODIES = [
  {
    id: "sun", name: "The Sun", kind: "sun", radius: 6, distance: 0, orbitSpeed: 0,
    spinSpeed: 0.02, color: "#ffb347",
    facts: [
      "The Sun is a star — a giant ball of burning hot gas!",
      "It is so big that 1.3 million Earths could fit inside it.",
      "Sunlight takes about 8 minutes to reach Earth.",
      "Never look at the Sun directly — it can hurt your eyes!",
    ],
  },
  {
    id: "mercury", name: "Mercury", kind: "rocky", radius: 0.55, distance: 11,
    orbitSpeed: 0.08, spinSpeed: 0.1, color: "#b5a08c",
    facts: [
      "Mercury is the smallest planet and the closest to the Sun.",
      "A year on Mercury is only 88 Earth days!",
      "It has no air, so its sky is always black.",
    ],
  },
  {
    id: "venus", name: "Venus", kind: "rocky", radius: 0.95, distance: 15,
    orbitSpeed: 0.06, spinSpeed: 0.05, color: "#e8c07a",
    facts: [
      "Venus is the hottest planet — hotter than an oven!",
      "It shines so brightly we call it the Evening Star.",
      "A day on Venus is longer than its whole year!",
    ],
  },
  {
    id: "earth", name: "Earth", kind: "earth", radius: 1, distance: 19,
    orbitSpeed: 0.05, spinSpeed: 0.3, color: "#4f7cff", hasMoon: true,
    facts: [
      "Earth is our home — the only planet with life that we know!",
      "It looks blue from space because of its big oceans.",
      "Earth spins once every 24 hours — that's one day!",
      "Our Moon travels all the way around Earth every month.",
    ],
  },
  {
    id: "mars", name: "Mars", kind: "rocky", radius: 0.75, distance: 23,
    orbitSpeed: 0.04, spinSpeed: 0.28, color: "#d1603d",
    facts: [
      "Mars is called the Red Planet because of its rusty dust.",
      "It has the biggest volcano in the whole solar system!",
      "Robots from Earth are exploring Mars right now.",
    ],
  },
  {
    id: "jupiter", name: "Jupiter", kind: "gas", radius: 2.8, distance: 31,
    orbitSpeed: 0.022, spinSpeed: 0.5, color: "#d8a56f",
    facts: [
      "Jupiter is the biggest planet — a giant ball of gas!",
      "Its Great Red Spot is a storm bigger than Earth.",
      "Jupiter has more than 90 moons!",
    ],
  },
  {
    id: "saturn", name: "Saturn", kind: "gas", radius: 2.4, distance: 40,
    orbitSpeed: 0.016, spinSpeed: 0.45, color: "#e3cd9a", hasRings: true,
    facts: [
      "Saturn has beautiful rings made of ice and rock pieces.",
      "It is so light it could float in a giant bathtub!",
      "Saturn's rings are wider than 20 Earths side by side.",
    ],
  },
  {
    id: "uranus", name: "Uranus", kind: "gas", radius: 1.6, distance: 48,
    orbitSpeed: 0.011, spinSpeed: 0.35, color: "#9ad6de",
    facts: [
      "Uranus spins lying on its side — like a rolling ball!",
      "It is a freezing cold, icy-blue planet.",
      "One year on Uranus lasts 84 Earth years.",
    ],
  },
  {
    id: "neptune", name: "Neptune", kind: "gas", radius: 1.55, distance: 55,
    orbitSpeed: 0.009, spinSpeed: 0.4, color: "#4666e0",
    facts: [
      "Neptune is the farthest planet from the Sun.",
      "It has the fastest winds in the solar system!",
      "Neptune looks deep blue, like the ocean.",
    ],
  },
];

export const bodyById = (id) => BODIES.find((b) => b.id === id);
export const TOUR_ORDER = ["overview", ...BODIES.map((b) => b.id)];
