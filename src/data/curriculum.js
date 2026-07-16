// Classes 1-4 curriculum map. Each subject has a theme tint used by the scene.
export const CURRICULUM = {
  Math: {
    color: "#4f7cff",
    emoji: "🔢",
    topics: {
      1: ["Counting 1 to 100", "Shapes Around Us", "Simple Addition", "Simple Subtraction"],
      2: ["Two-Digit Addition", "Two-Digit Subtraction", "Skip Counting", "Telling Time"],
      3: ["Multiplication Tables", "Division Basics", "Fractions Introduction", "Money and Change"],
      4: ["Long Division", "Fractions and Decimals", "Perimeter and Area", "Factors and Multiples"],
    },
  },
  Science: {
    color: "#2fb36b",
    emoji: "🔬",
    topics: {
      1: ["The Solar System 🪐", "My Body", "Animals Around Us", "Plants Around Us", "Day and Night"],
      2: ["The Solar System 🪐", "Food and Nutrition", "Water and Its Uses", "Weather and Seasons", "Living and Non-Living Things"],
      3: ["The Solar System 🪐", "States of Matter", "Parts of a Plant", "Our Environment"],
      4: ["The Solar System 🪐", "Light and Shadows", "Force and Motion", "The Human Digestive System", "Air and Water Cycle"],
    },
  },
  English: {
    color: "#e5793a",
    emoji: "📖",
    topics: {
      1: ["The Alphabet and Sounds", "Naming Words (Nouns)", "Rhyming Words", "Simple Sentences"],
      2: ["Action Words (Verbs)", "Describing Words (Adjectives)", "Opposites", "Story Time: Comprehension"],
      3: ["Tenses Introduction", "Pronouns", "Punctuation Marks", "Writing a Paragraph"],
      4: ["Prepositions", "Conjunctions", "Letter Writing", "Reading Comprehension"],
    },
  },
  "Social Studies": {
    color: "#a05ad5",
    emoji: "🌍",
    topics: {
      1: ["My Family", "My School", "Festivals We Celebrate", "People Who Help Us"],
      2: ["Our Neighbourhood", "Means of Transport", "Our National Symbols", "Good Habits and Manners"],
      3: ["Maps and Directions", "Our Country India", "The Continents and Oceans", "Early Humans"],
      4: ["States of India", "Our Government", "Natural Resources", "Great Leaders of India"],
    },
  },
};

// Each teacher has ONE fixed neural voice: an Orpheus voice (most human,
// used when the Orpheus TTS server is up) + a Gemini prebuilt voice fallback.
export const TEACHER_PRESETS = [
  { name: "Miss Anaya", style: "warm and playful", voiceGender: "female", voiceName: "Kore", orpheusVoice: "tara", rate: 0.95, pitch: 1.15 },
  { name: "Mr. Vikram", style: "calm and encouraging", voiceGender: "male", voiceName: "Charon", orpheusVoice: "leo", rate: 0.92, pitch: 0.95 },
  { name: "Miss Sarah", style: "energetic and fun", voiceGender: "female", voiceName: "Aoede", orpheusVoice: "jess", rate: 1.0, pitch: 1.2 },
];

export const STUDENT_NAMES = ["Aarav", "Meera", "Kabir", "Zoya", "Ishaan", "Diya"];

// Every classmate gets their OWN voice (Orpheus + Gemini fallback + browser
// pitch/rate jitter) so the class sounds like different real children.
export const STUDENT_VOICES = [
  { voiceGender: "male", voiceName: "Puck", orpheusVoice: "zac", rate: 1.06, pitch: 1.4 },
  { voiceGender: "female", voiceName: "Leda", orpheusVoice: "mia", rate: 1.04, pitch: 1.5 },
  { voiceGender: "male", voiceName: "Zephyr", orpheusVoice: "dan", rate: 1.08, pitch: 1.35 },
  { voiceGender: "female", voiceName: "Callirrhoe", orpheusVoice: "zoe", rate: 1.02, pitch: 1.55 },
  { voiceGender: "male", voiceName: "Fenrir", orpheusVoice: "leo", rate: 1.1, pitch: 1.3 },
  { voiceGender: "female", voiceName: "Autonoe", orpheusVoice: "leah", rate: 1.0, pitch: 1.45 },
];

export const studentVoice = (index) => STUDENT_VOICES[Math.abs(index) % STUDENT_VOICES.length];
