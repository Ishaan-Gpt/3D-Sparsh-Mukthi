Project Context File: AI Virtual Classroom & Private Tuition App (Classes 1–4)
1. Project Vision
Build an affordable “Desktop VR” classroom simulator that gives children in Classes 1–4 the feeling of a physical school and high-quality private tuition using only a standard computer or smartphone. The system runs primarily on local AI and basic webcam-based gesture tracking, with Three.js as the core 3D rendering engine for the classroom scene.

The goal is to transform passive screen time into an active, structured, social learning experience that feels like a real school, even for children who cannot attend physical schools due to medical, geographic, safety, or economic reasons.

2. Core Problems Addressed
Missing the school feel: Many students feel lonely and disconnected when learning from home.

High cost of private tuition: Personalized 1-on-1 teaching is unaffordable for most families.

Passive screen fatigue: Recorded videos and standard video calls fail to hold young children’s attention.

Fear of asking doubts: Shy children hesitate to speak up in front of others.

High cost of VR EdTech: Real VR headsets and premium hardware are out of reach for most households.

3. Target Users
Children aged 6–10 (Classes 1–4).

Parents seeking affordable, high-quality private tuition experiences at home.

Students with medical, geographic, or safety constraints that limit physical school attendance.

Homeschooling families seeking an engaging virtual classroom ecosystem.

4. High-Level Architecture Overview
The application is structured as a modular, browser-based system with the following logical layers:

User Control Dashboard (Setup Layer):

Subject and topic selection.

Classroom size and composition.

Teacher persona configuration.

Lesson structure and duration.

Custom doubt question input.

Immersive 3D Classroom (Scene Layer):

One or more classroom scenes (rooms).

Teacher avatar.

Virtual classmates (AI-driven).

User’s perspective (first-person or third-person camera).

Dynamic environment theming based on subject/topic.

Interaction Layer:

Webcam-based gesture tracking (hand raise, pointing, pinch-to-zoom, swipe).

Voice input (speech-to-text).

Optional gyroscopic or touch controls (for mobile/VR phone frames).

Attention tracking (gaze/face direction).

AI Orchestration Layer:

Local AI models for teacher dialogue.

Peer-agent dialogue generation for virtual classmates.

Step-by-step solution generation for user doubts.

Safety and age-appropriateness filtering.

Integration with local speech-to-text and text-to-speech engines.

Lesson State Engine (Logic Layer):

Lesson phases (setup, intro, teaching, peer question, user doubt, solution, break, recap, end).

Timer management and break enforcement.

Distraction detection and correction cues.

Event-driven transitions between phases.

Rendering & Performance Layer (Three.js):

Scene management (room, props, lighting, materials).

Character loading and animation blending.

Camera control and zoom behavior.

Whiteboard rendering and overlay logic.

Mobile and desktop performance tuning.

5. Detailed Component Breakdown
5.1 Setup Dashboard
Purpose: Allow the user to configure the lesson before entering the classroom scene.

Key Configurations:

Subject → Topic mapping.

Classroom size (2–10 virtual students).

Gender mix of virtual classmates.

Teacher profile (gender, tone, strictness).

Study structure (total time, interval breaks).

Custom doubt input (typed or spoken).

Design Principles:

Kid-friendly, simple UI.

Parental guidance options.

Minimal cognitive load for children.

5.2 3D Classroom Scene (Three.js)
Purpose: Render an immersive, interactive classroom environment.

Key Elements:

Static environment: walls, floor, ceiling, windows, lighting, desks, whiteboard.

Animated actors: teacher avatar, virtual classmates.

User desk and perspective (camera position).

Whiteboard area for step-by-step explanations.

Optional dynamic background themes (e.g., underwater for oceans, space for astronomy).

Design Principles:

Stylized, kid-friendly art style.

Performance-first asset design (low-poly, baked lighting).

Modular asset pipeline for reuse across topics.

5.3 Avatar System
Purpose: Provide believable, animated characters for teacher and classmates.

Character Types:

Teacher: fully animated, expressive, lip-sync-enabled.

Classmates: simpler animations, idle/reaction behaviors.

User proxy (optional): non-visible or minimal representation.

Animation States:

Idle.

Listening.

Speaking.

Writing on board.

Raising hand.

Looking confused.

Reacting (nodding, smiling).

Design Principles:

Use animation blending for smooth transitions.

Prioritize teacher expressiveness; keep classmates lightweight.

Use LODs and bone reduction for mobile.

5.4 Interaction System
Purpose: Enable natural, controller-free interaction via gestures and voice.

Gesture Set:

Hand raise → Ask question.

Pointing → Direct attention.

Pinch → Zoom on whiteboard.

Swipe → Look around.

Idle/no hand → Passive listening.

Voice Interaction:

Speech-to-text for student questions.

Text-to-speech for AI responses.

Local/offline preferred for privacy and cost.

Attention Tracking:

Face direction detection for distraction cues.

Gaze-based attention monitoring.

Design Principles:

Run gesture detection at reduced resolution for performance.

Use lightweight CNN-based models (e.g., MediaPipe-style landmarks).

Map gestures to discrete events, not continuous raw data.

5.5 AI Orchestration
Purpose: Power the teacher dialogue, peer questions, and doubt-solving logic.

AI Roles:

Teacher agent: narrates lesson content, responds to doubts, enforces discipline.

Peer agents: ask interjections, simulate confusion, ask “silent student” doubts.

Whiteboard solver agent: generates step-by-step explanations.

AI Constraints:

Child-appropriate language and tone.

No hallucinations for factual content.

Strict adherence to lesson structure.

Design Principles:

Use local LLMs where possible.

Structure AI input/output with JSON schemas.

Use safety filters for age-appropriateness.

5.6 Lesson State Engine
Purpose: Control the flow and timing of the lesson.

Lesson Phases:

Setup.

Introduction.

Teaching segment.

Peer question.

User doubt.

Whiteboard solving.

Recap.

Break.

Resume.

End.

State Transitions:

Timer-driven (e.g., 15-minute teaching → break).

Event-driven (e.g., hand raise → user doubt phase).

Safety interventions (e.g., distraction → corrective cue).

Design Principles:

AI suggests content; state engine decides when to show it.

Enforce breaks and attention cues programmatically.

Maintain deterministic lesson structure for predictability.

5.7 Whiteboard System
Purpose: Display step-by-step solutions and explanations.

Modes:

Static text overlay (simplest).

Dynamic text rendering (font-based).

Stroke-based rendering (handwriting simulation).

Mixed media (text + diagrams).

Design Principles:

Prioritize legibility over realism.

Use zoom mode for detailed reading.

Sync with teacher speech timing.

5.8 Performance & Optimization Layer
Purpose: Ensure smooth performance on desktop and mobile devices.

Desktop Targets:

60 FPS on mid-range laptops.

Full classroom with 6–10 classmates.

Dynamic lighting and shadows (limited).

Mobile Targets:

30–60 FPS on mid-range phones.

Simplified classroom with 2–4 classmates.

Baked lighting, no dynamic shadows.

Low-poly avatars, compressed textures.

Optimization Techniques:

LOD meshes for characters and props.

Rig reduction (fewer bones for mobile).

Texture compression and atlas packing.

Animation budgeting (fewer concurrent animations).

Instanced rendering for repeated props (desks, chairs).

Reduced camera frustum for distant objects.

Conditional updates (skip animations for hidden characters).

Design Principles:

Define strict performance budgets per platform.

Provide “Desktop Full” and “Mobile Lite” scene modes.

Offer fallback modes for low-end devices.

6. End-to-End User Journey
Setup Phase: User selects subject, topic, classroom size, teacher profile, and study duration. Inputs a custom doubt if desired.

Immersive Entry: User enters the 3D classroom scene, either on desktop or via phone in VR frame.

Lesson Start: Teacher avatar introduces the topic; classroom environment reflects subject theme.

Peer Interaction: Virtual classmates ask questions, react, and simulate real classroom dynamics.

User Interaction: User raises hand or speaks; teacher pauses and responds directly.

Whiteboard Solving: User’s custom doubt is solved step-by-step on the virtual whiteboard.

Break Enforcement: Timer triggers a short break; lesson pauses, screen locks into calm mode.

Resumption: Lesson resumes; teacher continues with recap and practice.

Lesson End: Session concludes with summary and optional feedback.

7. Key Technical Decisions
Frontend: React + Three.js (or React Three Fiber).

3D Assets: Blender-authored, exported as glTF/GLB.

Animation: Blended state machine using Three.js animation system.

Gesture Tracking: Webcam-based, client-side (e.g., MediaPipe-style).

Speech: Local STT and TTS preferred.

AI Models: Local LLMs for teacher/peer dialogue.

State Management: Centralized lesson state machine.

Performance: Two-tier scene modes (Desktop Full, Mobile Lite).

8. Future Extensions
Multi-classroom support (science lab, library, playground).

Real human teacher integration via WebRTC fallback.

Parental dashboard and progress tracking.

Gamification layer (badges, rewards).

Multi-student synchronous sessions (networked classrooms).

9. Non-Functional Requirements
Privacy: No raw video or audio stored; local processing preferred.

Accessibility: Simple UI, large fonts, optional voice guidance.

Offline Capability: Core lesson flow should work without internet.

Scalability: Modular design for easy addition of topics and classrooms.

Maintainability: Clear separation of concerns between layers.

10. Summary
This project aims to recreate the emotional and social experience of a physical school inside a browser-based 3D classroom, powered by local AI and gesture tracking. The architecture prioritizes modularity, performance, and child-centered design. The Three.js rendering layer is optimized for both desktop and mobile, with strict performance budgets and asset constraints. The AI orchestration layer is structured to support teacher dialogue, peer simulation, and doubt solving while maintaining safety and age-appropriateness. The lesson state engine ensures deterministic, predictable flow, while the interaction layer enables natural, controller-free engagement.
