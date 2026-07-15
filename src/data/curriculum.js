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

// Each teacher has ONE fixed neural voice (Gemini TTS prebuilt voices).
export const TEACHER_PRESETS = [
  { name: "Miss Anaya", style: "warm and playful", voiceGender: "female", voiceName: "Kore", rate: 0.95, pitch: 1.15 },
  { name: "Mr. Vikram", style: "calm and encouraging", voiceGender: "male", voiceName: "Charon", rate: 0.92, pitch: 0.95 },
  { name: "Miss Sarah", style: "energetic and fun", voiceGender: "female", voiceName: "Aoede", rate: 1.0, pitch: 1.2 },
];

export const STUDENT_NAMES = ["Aarav", "Meera", "Kabir", "Zoya", "Ishaan", "Diya"];
