import { useState, useEffect, useMemo } from "react";

// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "fittrack_workouts_v2";
async function loadWorkouts() {
  try { const r = await window.storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveWorkouts(ws) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(ws)); } catch {}
}

// Saved workout templates for "quick add" — workouts you do regularly.
// Each template: { id, name, type, exercises: [{ exerciseId, sets, reps, weight }] }
const TEMPLATES_KEY = "fittrack_templates_v1";
async function loadTemplates() {
  try { const r = await window.storage.get(TEMPLATES_KEY); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveTemplates(ts) {
  try { await window.storage.set(TEMPLATES_KEY, JSON.stringify(ts)); } catch {}
}

// ── Exercise database ────────────────────────────────────────────────────────
// Each exercise: { id, name, primaryMuscles: [svgRegion...], secondaryMuscles: [svgRegion...] }
// SVG regions: back_upper, back_lower, lats, shoulder_l/r, chest_l/r,
//   biceps_l/r, triceps_l/r, abs_upper, abs_lower, obliques_l/r,
//   quads_l/r, hamstrings_l/r, glutes_l/r, calves_l/r
const EXERCISES = {
  back: [
    { id: "deadlift",        name: "Deadlift",              primary: ["back_lower","back_upper"], secondary: ["hamstrings_l","hamstrings_r","glutes_l","glutes_r"] },
    { id: "pullup",          name: "Pull-up",               primary: ["lats","back_upper"],       secondary: ["biceps_l","biceps_r"] },
    { id: "barbell_row",     name: "Barbell Row",           primary: ["back_upper","lats"],       secondary: ["biceps_l","biceps_r","back_lower"] },
    { id: "cable_row",       name: "Seated Cable Row",      primary: ["back_upper","lats"],       secondary: ["biceps_l","biceps_r"] },
    { id: "lat_pulldown",    name: "Lat Pulldown",          primary: ["lats"],                    secondary: ["back_upper","biceps_l","biceps_r"] },
    { id: "tbar_row",        name: "T-Bar Row",             primary: ["back_upper","lats"],       secondary: ["back_lower","biceps_l","biceps_r"] },
    { id: "db_row",          name: "Dumbbell Row",          primary: ["lats","back_upper"],       secondary: ["biceps_l","biceps_r"] },
    { id: "facepull",        name: "Face Pull",             primary: ["back_upper","shoulder_l","shoulder_r"], secondary: [] },
    { id: "goodmorning",     name: "Good Morning",          primary: ["back_lower","hamstrings_l","hamstrings_r"], secondary: ["glutes_l","glutes_r"] },
    { id: "hyperextension",  name: "Hyperextension",        primary: ["back_lower"],              secondary: ["glutes_l","glutes_r","hamstrings_l","hamstrings_r"] },
    { id: "chinup",          name: "Chin-up",               primary: ["lats","biceps_l","biceps_r"], secondary: ["back_upper"] },
    { id: "pendlay_row",     name: "Pendlay Row",           primary: ["back_upper","lats"],       secondary: ["back_lower"] },
    { id: "rack_pull",       name: "Rack Pull",             primary: ["back_upper","back_lower"], secondary: ["lats"] },
    { id: "cable_pullover",  name: "Cable Pullover",        primary: ["lats"],                    secondary: ["back_upper"] },
    { id: "straight_arm_pd", name: "Straight-Arm Pulldown", primary: ["lats"],                   secondary: ["back_upper","triceps_l","triceps_r"] },
    { id: "shrug",           name: "Barbell Shrug",         primary: ["back_upper"],              secondary: [] },
    { id: "inverted_row",    name: "Inverted Row",          primary: ["back_upper","lats"],       secondary: ["biceps_l","biceps_r"] },
    { id: "meadows_row",     name: "Meadows Row",           primary: ["lats","back_upper"],       secondary: ["biceps_l","biceps_r"] },
    { id: "db_pullover",     name: "DB Pullover",           primary: ["lats"],                    secondary: ["chest_l","chest_r","triceps_l","triceps_r"] },
    { id: "snatch_grip_dl",  name: "Snatch-Grip Deadlift",  primary: ["back_upper","back_lower","lats"], secondary: ["hamstrings_l","hamstrings_r"] },
  ],
  chest: [
    { id: "bench_press",     name: "Barbell Bench Press",   primary: ["chest_l","chest_r"],       secondary: ["shoulder_l","shoulder_r","triceps_l","triceps_r"] },
    { id: "incline_bench",   name: "Incline Bench Press",   primary: ["chest_l","chest_r"],       secondary: ["shoulder_l","shoulder_r","triceps_l","triceps_r"] },
    { id: "db_bench",        name: "DB Bench Press",        primary: ["chest_l","chest_r"],       secondary: ["shoulder_l","shoulder_r","triceps_l","triceps_r"] },
    { id: "db_flye",         name: "DB Flye",               primary: ["chest_l","chest_r"],       secondary: [] },
    { id: "cable_flye",      name: "Cable Flye",            primary: ["chest_l","chest_r"],       secondary: [] },
    { id: "pushup",          name: "Push-up",               primary: ["chest_l","chest_r"],       secondary: ["triceps_l","triceps_r","shoulder_l","shoulder_r"] },
    { id: "dip",             name: "Dip",                   primary: ["chest_l","chest_r","triceps_l","triceps_r"], secondary: ["shoulder_l","shoulder_r"] },
    { id: "pec_deck",        name: "Pec Deck",              primary: ["chest_l","chest_r"],       secondary: [] },
    { id: "decline_bench",   name: "Decline Bench Press",   primary: ["chest_l","chest_r"],       secondary: ["triceps_l","triceps_r"] },
    { id: "incline_flye",    name: "Incline DB Flye",       primary: ["chest_l","chest_r"],       secondary: [] },
    { id: "low_cable_flye",  name: "Low Cable Flye",        primary: ["chest_l","chest_r"],       secondary: [] },
    { id: "landmine_press",  name: "Landmine Press",        primary: ["chest_l","chest_r"],       secondary: ["shoulder_l","shoulder_r","triceps_l","triceps_r"] },
    { id: "svend_press",     name: "Svend Press",           primary: ["chest_l","chest_r"],       secondary: [] },
    { id: "db_pullover_ch",  name: "DB Pullover (chest)",   primary: ["chest_l","chest_r"],       secondary: ["lats"] },
    { id: "machine_press",   name: "Machine Chest Press",   primary: ["chest_l","chest_r"],       secondary: ["triceps_l","triceps_r"] },
  ],
  shoulders: [
    { id: "ohp",             name: "Overhead Press",        primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r","back_upper"] },
    { id: "db_ohp",          name: "DB Shoulder Press",     primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r"] },
    { id: "lateral_raise",   name: "Lateral Raise",         primary: ["shoulder_l","shoulder_r"], secondary: [] },
    { id: "front_raise",     name: "Front Raise",           primary: ["shoulder_l","shoulder_r"], secondary: [] },
    { id: "rear_delt_flye",  name: "Rear Delt Flye",        primary: ["back_upper","shoulder_l","shoulder_r"], secondary: [] },
    { id: "arnold_press",    name: "Arnold Press",          primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r"] },
    { id: "upright_row",     name: "Upright Row",           primary: ["shoulder_l","shoulder_r","back_upper"], secondary: ["biceps_l","biceps_r"] },
    { id: "cable_lateral",   name: "Cable Lateral Raise",   primary: ["shoulder_l","shoulder_r"], secondary: [] },
    { id: "machine_press_s", name: "Machine Shoulder Press",primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r"] },
    { id: "push_press",      name: "Push Press",            primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r","quads_l","quads_r"] },
    { id: "db_rear_delt",    name: "DB Rear Delt Row",      primary: ["back_upper","shoulder_l","shoulder_r"], secondary: [] },
    { id: "plate_raise",     name: "Plate Front Raise",     primary: ["shoulder_l","shoulder_r"], secondary: [] },
    { id: "cable_facepull",  name: "Cable Face Pull",       primary: ["back_upper","shoulder_l","shoulder_r"], secondary: [] },
    { id: "handstand_pu",    name: "Handstand Push-up",     primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r"] },
    { id: "seated_ohp",      name: "Seated Barbell Press",  primary: ["shoulder_l","shoulder_r"], secondary: ["triceps_l","triceps_r"] },
  ],
  arms: [
    { id: "barbell_curl",    name: "Barbell Curl",          primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "db_curl",         name: "Dumbbell Curl",         primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "hammer_curl",     name: "Hammer Curl",           primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "preacher_curl",   name: "Preacher Curl",         primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "cable_curl",      name: "Cable Curl",            primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "incline_db_curl", name: "Incline DB Curl",       primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "conc_curl",       name: "Concentration Curl",    primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "skull_crusher",   name: "Skull Crusher",         primary: ["triceps_l","triceps_r"],   secondary: [] },
    { id: "tricep_pushdown", name: "Tricep Pushdown",       primary: ["triceps_l","triceps_r"],   secondary: [] },
    { id: "overhead_ext",    name: "Overhead Tricep Ext.",  primary: ["triceps_l","triceps_r"],   secondary: [] },
    { id: "close_grip_bp",   name: "Close-Grip Bench",      primary: ["triceps_l","triceps_r"],   secondary: ["chest_l","chest_r"] },
    { id: "tricep_kickback", name: "Tricep Kickback",       primary: ["triceps_l","triceps_r"],   secondary: [] },
    { id: "rope_pushdown",   name: "Rope Pushdown",         primary: ["triceps_l","triceps_r"],   secondary: [] },
    { id: "dip_arms",        name: "Bench Dip",             primary: ["triceps_l","triceps_r"],   secondary: ["chest_l","chest_r"] },
    { id: "zz_bar_curl",     name: "EZ-Bar Curl",           primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "reverse_curl",    name: "Reverse Curl",          primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "wrist_curl",      name: "Wrist Curl",            primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "spider_curl",     name: "Spider Curl",           primary: ["biceps_l","biceps_r"],     secondary: [] },
    { id: "jm_press",        name: "JM Press",              primary: ["triceps_l","triceps_r"],   secondary: [] },
    { id: "cable_overhead_t",name: "Cable Overhead Ext.",   primary: ["triceps_l","triceps_r"],   secondary: [] },
  ],
  legs: [
    { id: "squat",           name: "Back Squat",            primary: ["quads_l","quads_r"],       secondary: ["glutes_l","glutes_r","hamstrings_l","hamstrings_r"] },
    { id: "rdl",             name: "Romanian Deadlift",     primary: ["hamstrings_l","hamstrings_r","glutes_l","glutes_r"], secondary: ["back_lower"] },
    { id: "leg_press",       name: "Leg Press",             primary: ["quads_l","quads_r"],       secondary: ["glutes_l","glutes_r","hamstrings_l","hamstrings_r"] },
    { id: "leg_curl",        name: "Leg Curl",              primary: ["hamstrings_l","hamstrings_r"], secondary: [] },
    { id: "leg_ext",         name: "Leg Extension",         primary: ["quads_l","quads_r"],       secondary: [] },
    { id: "lunge",           name: "Lunge",                 primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: ["hamstrings_l","hamstrings_r"] },
    { id: "bulgarian_split", name: "Bulgarian Split Squat", primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: ["hamstrings_l","hamstrings_r"] },
    { id: "hip_thrust",      name: "Hip Thrust",            primary: ["glutes_l","glutes_r"],     secondary: ["hamstrings_l","hamstrings_r"] },
    { id: "calf_raise",      name: "Calf Raise",            primary: ["calves_l","calves_r"],     secondary: [] },
    { id: "front_squat",     name: "Front Squat",           primary: ["quads_l","quads_r"],       secondary: ["glutes_l","glutes_r"] },
    { id: "hack_squat",      name: "Hack Squat",            primary: ["quads_l","quads_r"],       secondary: ["glutes_l","glutes_r"] },
    { id: "sumo_dl",         name: "Sumo Deadlift",         primary: ["glutes_l","glutes_r","hamstrings_l","hamstrings_r"], secondary: ["quads_l","quads_r","back_lower"] },
    { id: "glute_bridge",    name: "Glute Bridge",          primary: ["glutes_l","glutes_r"],     secondary: ["hamstrings_l","hamstrings_r"] },
    { id: "box_squat",       name: "Box Squat",             primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: [] },
    { id: "step_up",         name: "Step-Up",               primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: [] },
    { id: "goblet_squat",    name: "Goblet Squat",          primary: ["quads_l","quads_r"],       secondary: ["glutes_l","glutes_r"] },
    { id: "seated_leg_curl", name: "Seated Leg Curl",       primary: ["hamstrings_l","hamstrings_r"], secondary: [] },
    { id: "nordic_curl",     name: "Nordic Curl",           primary: ["hamstrings_l","hamstrings_r"], secondary: [] },
    { id: "walking_lunge",   name: "Walking Lunge",         primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: ["hamstrings_l","hamstrings_r"] },
    { id: "seated_calf",     name: "Seated Calf Raise",     primary: ["calves_l","calves_r"],     secondary: [] },
  ],
  abs: [
    { id: "crunch",          name: "Crunch",                primary: ["abs_upper"],               secondary: [] },
    { id: "plank",           name: "Plank",                 primary: ["abs_upper","abs_lower"],   secondary: ["obliques_l","obliques_r"] },
    { id: "leg_raise",       name: "Hanging Leg Raise",     primary: ["abs_lower"],               secondary: ["abs_upper"] },
    { id: "cable_crunch",    name: "Cable Crunch",          primary: ["abs_upper","abs_lower"],   secondary: [] },
    { id: "russian_twist",   name: "Russian Twist",         primary: ["obliques_l","obliques_r"], secondary: ["abs_upper"] },
    { id: "ab_wheel",        name: "Ab Wheel Rollout",      primary: ["abs_upper","abs_lower"],   secondary: ["back_lower"] },
    { id: "bicycle_crunch",  name: "Bicycle Crunch",        primary: ["obliques_l","obliques_r","abs_upper"], secondary: [] },
    { id: "side_plank",      name: "Side Plank",            primary: ["obliques_l","obliques_r"], secondary: ["abs_upper"] },
    { id: "v_up",            name: "V-Up",                  primary: ["abs_upper","abs_lower"],   secondary: [] },
    { id: "dead_bug",        name: "Dead Bug",              primary: ["abs_lower","abs_upper"],   secondary: [] },
    { id: "hollow_hold",     name: "Hollow Hold",           primary: ["abs_upper","abs_lower"],   secondary: [] },
    { id: "toe_to_bar",      name: "Toes-to-Bar",           primary: ["abs_lower"],               secondary: ["abs_upper","obliques_l","obliques_r"] },
    { id: "situp",           name: "Sit-up",                primary: ["abs_upper"],               secondary: [] },
    { id: "woodchop",        name: "Cable Woodchop",        primary: ["obliques_l","obliques_r"], secondary: ["abs_upper"] },
    { id: "flutter_kick",    name: "Flutter Kick",          primary: ["abs_lower"],               secondary: [] },
    { id: "dragon_flag",     name: "Dragon Flag",           primary: ["abs_upper","abs_lower"],   secondary: [] },
  ],
  cardio: [
    { id: "run",             name: "Run",                   primary: ["quads_l","quads_r","hamstrings_l","hamstrings_r","calves_l","calves_r"], secondary: ["glutes_l","glutes_r"] },
    { id: "cycling",         name: "Cycling",               primary: ["quads_l","quads_r"],       secondary: ["hamstrings_l","hamstrings_r","calves_l","calves_r"] },
    { id: "rowing",          name: "Rowing",                primary: ["back_upper","lats"],        secondary: ["quads_l","quads_r","hamstrings_l","hamstrings_r"] },
    { id: "jump_rope",       name: "Jump Rope",             primary: ["calves_l","calves_r"],     secondary: ["quads_l","quads_r"] },
    { id: "stair_climber",   name: "Stair Climber",         primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: ["calves_l","calves_r"] },
    { id: "elliptical",      name: "Elliptical",            primary: ["quads_l","quads_r","hamstrings_l","hamstrings_r"], secondary: [] },
    { id: "swimming",        name: "Swimming",              primary: ["back_upper","lats","shoulder_l","shoulder_r"], secondary: ["chest_l","chest_r"] },
    { id: "hiit",            name: "HIIT",                  primary: ["quads_l","quads_r","glutes_l","glutes_r"], secondary: ["abs_upper","abs_lower"] },
  ],
};

// ── Compute heatmap from exercise-level data ──────────────────────────────────
function getRegionHeat(workouts) {
  const now = Date.now();
  const heat = {};
  workouts.forEach(w => {
    const daysAgo = (now - new Date(w.date).getTime()) / 86400000;
    const decay = daysAgo < 1 ? 1.0 : daysAgo < 2 ? 0.85 : daysAgo < 3 ? 0.65 : daysAgo < 5 ? 0.4 : daysAgo < 7 ? 0.2 : 0;
    if (!decay) return;
    (w.exercises || []).forEach(ex => {
      const def = Object.values(EXERCISES).flat().find(e => e.id === ex.exerciseId);
      if (!def) return;
      // Volume proxy: sets × reps (weight scales it slightly)
      const vol = (ex.sets || 1) * (ex.reps || 10);
      const norm = Math.min(1, vol / 40); // 40 = "full" activation baseline
      const contribution = decay * norm;
      def.primary.forEach(r => { heat[r] = Math.min(1, (heat[r] || 0) + contribution); });
      def.secondary.forEach(r => { heat[r] = Math.min(1, (heat[r] || 0) + contribution * 0.4); });
    });
  });
  return heat;
}

function heatColor(v) {
  if (v <= 0)   return "var(--muscle-rest)";
  if (v < 0.2)  return "#fde0ec";
  if (v < 0.4)  return "#f9b5d2";
  if (v < 0.6)  return "#f582b3";
  if (v < 0.8)  return "#ec4f93";
  return "#d61f6f";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgoLabel(d) {
  const diff = Math.round((Date.now() - new Date(d).getTime()) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;
}
function weekStart() {
  const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10);
}

const MUSCLE_GROUPS = {
  back: "Back", chest: "Chest", shoulders: "Shoulders",
  arms: "Arms", legs: "Legs", abs: "Abs / Core", cardio: "Cardio",
};

const TYPE_COLORS = {
  back: "#7c6fcd", chest: "#d94a4a", shoulders: "#c07ad9",
  arms: "#4a90d9", legs: "#2eaa72", abs: "#e07a2a", cardio: "#d4a017",
};

// ── Body SVG ──────────────────────────────────────────────────────────────────
function BodySVG({ heat }) {
  const r = id => ({ fill: heatColor(heat[id] || 0), transition: "fill 0.5s ease" });
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
      {[
        { label: "FRONT", side: "front" },
        { label: "BACK",  side: "back"  },
      ].map(({ label, side }) => (
        <div key={side} style={{ textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 4px", letterSpacing: 1.5, fontWeight: 600 }}>{label}</p>
          <svg width="152" viewBox="0 0 120 300" xmlns="http://www.w3.org/2000/svg">
            <style>{`.mb{stroke:var(--muscle-stroke);stroke-width:0.7}.sk{fill:var(--skin);stroke:var(--body-line);stroke-width:0.8}.bl{fill:none;stroke:var(--body-line);stroke-width:0.7;stroke-linecap:round;opacity:0.6}`}</style>

            {/* ── Skin silhouette (drawn first; muscle gaps reveal it) ── */}
            <path className="sk" d="M53 46 L67 46 L66 60 Q60 64 54 60 Z"/>
            <path className="sk" d="M44 58 Q60 52 76 58 Q81 72 79 90 Q85 116 77 140 Q73 151 79 160 Q81 168 77 178 Q60 184 43 178 Q39 168 41 160 Q47 151 43 140 Q35 116 41 90 Q39 72 44 58 Z"/>
            <path className="sk" d="M45 60 Q31 62 28 80 Q23 104 23 126 Q23 144 27 154 L25 164 Q27 172 33 170 Q39 169 39 161 L41 152 Q43 128 42 104 Q42 82 47 64 Z"/>
            <path className="sk" d="M75 60 Q89 62 92 80 Q97 104 97 126 Q97 144 93 154 L95 164 Q93 172 87 170 Q81 169 81 161 L79 152 Q77 128 78 104 Q78 82 73 64 Z"/>
            <ellipse className="sk" cx="30" cy="170" rx="6" ry="7"/>
            <ellipse className="sk" cx="90" cy="170" rx="6" ry="7"/>
            <path className="sk" d="M44 172 Q34 204 38 238 Q35 260 40 282 L39 290 Q41 297 49 296 Q55 295 55 287 L55 282 Q58 258 55 238 Q58 204 56 172 Q50 176 44 172 Z"/>
            <path className="sk" d="M76 172 Q86 204 82 238 Q85 260 80 282 L81 290 Q79 297 71 296 Q65 295 65 287 L65 282 Q62 258 65 238 Q62 204 64 172 Q70 176 76 172 Z"/>
            <ellipse className="sk" cx="46" cy="295" rx="8" ry="4"/>
            <ellipse className="sk" cx="74" cy="295" rx="8" ry="4"/>

            {/* ── Deltoids (both views) ── */}
            <path className="mb" style={r("shoulder_l")} d="M45 58 Q32 60 30 74 Q31 84 41 84 Q47 82 47 70 Q47 60 45 58 Z"/>
            <path className="mb" style={r("shoulder_r")} d="M75 58 Q88 60 90 74 Q89 84 79 84 Q73 82 73 70 Q73 60 75 58 Z"/>

            {side === "front" ? <>
              {/* Pectorals */}
              <path className="mb" style={r("chest_l")} d="M46 61 Q59 57 59 65 L59 89 Q57 95 47 92 Q43 82 45 71 Q45 64 46 61 Z"/>
              <path className="mb" style={r("chest_r")} d="M74 61 Q61 57 61 65 L61 89 Q63 95 73 92 Q77 82 75 71 Q75 64 74 61 Z"/>
              {/* Obliques */}
              <path className="mb" style={r("obliques_l")} d="M45 92 Q41 116 46 142 Q50 148 52 142 L52 96 Q48 92 45 92 Z"/>
              <path className="mb" style={r("obliques_r")} d="M75 92 Q79 116 74 142 Q70 148 68 142 L68 96 Q72 92 75 92 Z"/>
              {/* Rectus abdominis (upper / lower) */}
              <path className="mb" style={r("abs_upper")} d="M52 95 Q51 108 52 121 L59 121 L59 95 Q55 93 52 95 Z"/>
              <path className="mb" style={r("abs_upper")} d="M68 95 Q69 108 68 121 L61 121 L61 95 Q65 93 68 95 Z"/>
              <path className="mb" style={r("abs_lower")} d="M52 122 Q51 138 57 150 Q59 152 59 149 L59 122 Z"/>
              <path className="mb" style={r("abs_lower")} d="M68 122 Q69 138 63 150 Q61 152 61 149 L61 122 Z"/>
              {/* Biceps */}
              <path className="mb" style={r("biceps_l")} d="M31 80 Q25 96 28 114 Q34 118 40 114 Q42 96 38 80 Q35 78 31 80 Z"/>
              <path className="mb" style={r("biceps_r")} d="M89 80 Q95 96 92 114 Q86 118 80 114 Q78 96 82 80 Q85 78 89 80 Z"/>
              {/* Quadriceps */}
              <path className="mb" style={r("quads_l")} d="M44 173 Q35 205 39 238 Q46 244 54 238 Q58 205 56 173 Q50 177 44 173 Z"/>
              <path className="mb" style={r("quads_r")} d="M76 173 Q85 205 81 238 Q74 244 66 238 Q62 205 64 173 Q70 177 76 173 Z"/>
              {/* Tibialis / front lower leg */}
              <path className="mb" style={r("calves_l")} d="M41 244 Q37 264 41 283 Q47 287 51 283 Q53 264 51 244 Q46 247 41 244 Z"/>
              <path className="mb" style={r("calves_r")} d="M79 244 Q83 264 79 283 Q73 287 69 283 Q67 264 69 244 Q74 247 79 244 Z"/>
              {/* Definition lines */}
              <path className="bl" d="M60 95 L60 150"/>
              <path className="bl" d="M52 108 L68 108"/>
              <path className="bl" d="M52 122 L68 122"/>
              <path className="bl" d="M50 200 Q52 218 50 236"/>
              <path className="bl" d="M70 200 Q68 218 70 236"/>
            </> : <>
              {/* Trapezius + rhomboids (upper back) */}
              <path className="mb" style={r("back_upper")} d="M48 52 Q60 48 72 52 Q70 62 65 74 Q60 70 55 74 Q50 62 48 52 Z"/>
              <path className="mb" style={r("back_upper")} d="M48 74 Q60 70 72 74 L71 100 Q60 104 49 100 Z"/>
              {/* Latissimus dorsi */}
              <path className="mb" style={r("lats")} d="M48 84 Q36 104 40 128 Q48 132 52 126 L52 88 Q50 84 48 84 Z"/>
              <path className="mb" style={r("lats")} d="M72 84 Q84 104 80 128 Q72 132 68 126 L68 88 Q70 84 72 84 Z"/>
              {/* Lower back / erector spinae */}
              <path className="mb" style={r("back_lower")} d="M49 102 L71 102 Q73 122 67 140 Q60 144 53 140 Q47 122 49 102 Z"/>
              {/* Triceps */}
              <path className="mb" style={r("triceps_l")} d="M31 80 Q25 96 28 114 Q34 118 40 114 Q42 96 38 80 Q35 78 31 80 Z"/>
              <path className="mb" style={r("triceps_r")} d="M89 80 Q95 96 92 114 Q86 118 80 114 Q78 96 82 80 Q85 78 89 80 Z"/>
              {/* Glutes */}
              <path className="mb" style={r("glutes_l")} d="M45 150 Q36 160 39 174 Q47 182 58 177 Q60 162 55 150 Q50 148 45 150 Z"/>
              <path className="mb" style={r("glutes_r")} d="M75 150 Q84 160 81 174 Q73 182 62 177 Q60 162 65 150 Q70 148 75 150 Z"/>
              {/* Hamstrings */}
              <path className="mb" style={r("hamstrings_l")} d="M44 178 Q35 208 39 238 Q46 244 54 238 Q58 208 56 178 Q50 182 44 178 Z"/>
              <path className="mb" style={r("hamstrings_r")} d="M76 178 Q85 208 81 238 Q74 244 66 238 Q62 208 64 178 Q70 182 76 178 Z"/>
              {/* Gastrocnemius (calves) */}
              <path className="mb" style={r("calves_l")} d="M41 240 Q37 262 41 283 Q47 287 51 283 Q53 262 51 240 Q46 244 41 240 Z"/>
              <path className="mb" style={r("calves_r")} d="M79 240 Q83 262 79 283 Q73 287 69 283 Q67 262 69 240 Q74 244 79 240 Z"/>
              {/* Definition lines */}
              <path className="bl" d="M60 100 L60 142"/>
              <path className="bl" d="M46 246 L46 280"/>
              <path className="bl" d="M74 246 L74 280"/>
            </>}

            {/* ── Head + hair (feminine, no bow) ── */}
            {side === "front" && (
              <path d="M45 30 Q44 9 60 7 Q76 9 75 30 Q79 52 70 60 Q67 40 60 38 Q53 40 50 60 Q41 52 45 30 Z" fill="var(--hair)"/>
            )}
            <ellipse cx="60" cy="30" rx="13" ry="16" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            {side === "back" && (
              <path d="M45 28 Q44 7 60 5 Q76 7 75 28 Q81 56 73 66 L47 66 Q39 56 45 28 Z" fill="var(--hair)" stroke="var(--body-line)" strokeWidth="0.6"/>
            )}
          </svg>
        </div>
      ))}
    </div>
  );
}

function HeatLegend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", margin: "8px 0 0" }}>
      {[0, 0.2, 0.45, 0.7, 0.95].map((v, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: 22, height: 8, borderRadius: 2, background: heatColor(v), border: "0.5px solid var(--color-border-tertiary)" }}/>
          <span style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>{["Rest","Low","Mid","High","Peak"][i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Exercise row — two-step: pick exercise first, then sets/reps/weight ───────
function ExerciseRow({ ex, category, onChange, onRemove, index }) {
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(!ex.exerciseId);
  const options = EXERCISES[category] || [];
  const filtered = query
    ? options.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : options;
  const selected = options.find(e => e.id === ex.exerciseId);
  const muscleTags = selected
    ? [...new Set([...selected.primary, ...selected.secondary].map(m => m.replace(/_[lr]$/, "").replace(/_/g, " ")))]
    : [];

  // STEP 1: pick an exercise
  if (picking) {
    return (
      <div style={{
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-md)",
        background: "var(--color-background-secondary)",
        overflow: "hidden",
      }}>
        {/* Search input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, flexShrink: 0 }}>#{index + 1}</span>
          <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 14, color: "var(--color-text-tertiary)", flexShrink: 0 }}/>
          <input
            autoFocus
            placeholder="Search exercise…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--color-text-primary)" }}
          />
          <button onClick={onRemove} style={{ padding: "2px 6px", opacity: 0.4, flexShrink: 0 }}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>
        {/* Exercise chips */}
        <div style={{ padding: "10px", maxHeight: 200, overflowY: "auto" }}>
          {filtered.length === 0
            ? <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No results</div>
            : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {filtered.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { onChange({ ...ex, exerciseId: e.id }); setPicking(false); setQuery(""); }}
                    style={{
                      fontSize: 12, padding: "5px 12px",
                      borderRadius: 20,
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-primary)",
                      color: "var(--color-text-primary)",
                      cursor: "pointer", fontWeight: 400,
                    }}
                    onMouseEnter={ev => { ev.currentTarget.style.background = "#fce8e8"; ev.currentTarget.style.borderColor = "#f0b0b0"; }}
                    onMouseLeave={ev => { ev.currentTarget.style.background = "var(--color-background-primary)"; ev.currentTarget.style.borderColor = "var(--color-border-secondary)"; }}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )
          }
        </div>
      </div>
    );
  }

  // STEP 2: sets / reps / weight
  return (
    <div style={{
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "10px 12px",
      background: "var(--color-background-secondary)",
    }}>
      {/* Exercise name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, minWidth: 20, flexShrink: 0 }}>#{index + 1}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{selected?.name}</span>
        <button onClick={() => { setPicking(true); setQuery(""); }} style={{ fontSize: 11, padding: "2px 8px", color: "var(--color-text-tertiary)", flexShrink: 0 }}>change</button>
        <button onClick={onRemove} style={{ padding: "2px 6px", opacity: 0.4, flexShrink: 0 }}>
          <i className="ti ti-x" aria-hidden="true"/>
        </button>
      </div>

      {/* Sets / reps / weight */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[
          { label: "Sets",       key: "sets",   placeholder: "e.g. 4"  },
          { label: "Reps",       key: "reps",   placeholder: "e.g. 10" },
          { label: "Weight (lbs)", key: "weight", placeholder: "0 = BW" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: 10, color: "var(--color-text-tertiary)", display: "block", marginBottom: 3 }}>{label}</label>
            <input
              type="number" min={0}
              placeholder={placeholder}
              value={ex[key] === "" || ex[key] == null ? "" : ex[key]}
              onChange={e => onChange({ ...ex, [key]: e.target.value === "" ? "" : Number(e.target.value) })}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
        ))}
      </div>

      {/* Muscle tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {muscleTags.map(m => (
          <span key={m} style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 3,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-secondary)",
            color: "var(--color-text-secondary)",
          }}>{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── Log form ──────────────────────────────────────────────────────────────────
function LogForm({ onSave, onCancel, onSaveTemplate }) {
  const [category, setCategory] = useState("back");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState([{ id: Date.now(), exerciseId: "", sets: "", reps: "", weight: "" }]);
  const [asTemplate, setAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  function addExercise() {
    setExercises(ex => [...ex, { id: Date.now() + Math.random(), exerciseId: "", sets: "", reps: "", weight: "" }]);
  }
  function removeExercise(idx) {
    setExercises(ex => ex.filter((_, i) => i !== idx));
  }
  function updateExercise(idx, val) {
    setExercises(ex => ex.map((e, i) => i === idx ? val : e));
  }

  function handleSave() {
    const filled = exercises.filter(e => e.exerciseId);
    if (!filled.length) return;
    if (asTemplate && templateName.trim()) {
      onSaveTemplate({
        name: templateName.trim(),
        type: category,
        exercises: filled.map(({ exerciseId, sets, reps, weight }) => ({ exerciseId, sets, reps, weight })),
      });
    }
    onSave({ type: category, date, notes, exercises: filled });
  }

  const canSave = exercises.some(e => e.exerciseId);

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "2.5px solid var(--color-accent)",
      borderRadius: "var(--border-radius-lg)",
      boxShadow: "0 5px 0 var(--color-accent-strong), 0 10px 18px rgba(255,45,134,0.25)",
      padding: "1.25rem",
    }}>
      <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 1rem" }}>Log workout</p>

      {/* Category + date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Category</label>
          <select value={category} onChange={e => { setCategory(e.target.value); setExercises([{ id: Date.now(), exerciseId: "", sets: "", reps: "", weight: "" }]); }} style={{ width: "100%" }}>
            {Object.entries(MUSCLE_GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Date</label>
          <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} style={{ width: "100%" }}/>
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, position: "relative", zIndex: 1 }}>
        {exercises.map((ex, i) => (
          <ExerciseRow
            key={ex.id}
            ex={ex}
            category={category}
            index={i}
            onChange={val => updateExercise(i, val)}
            onRemove={() => removeExercise(i)}
          />
        ))}
      </div>

      <button onClick={addExercise} style={{ width: "100%", marginBottom: "1rem", fontSize: 13, color: "var(--color-text-secondary)" }}>
        <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: 4 }}/> Add exercise
      </button>

      {/* Notes */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Notes (optional)</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. PR on deadlift, felt good…"
          rows={2}
          style={{
            width: "100%", resize: "vertical", fontSize: 13, padding: "6px 10px", boxSizing: "border-box",
            border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
            background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
          }}
        />
      </div>

      {/* Save as quick-add template */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={asTemplate} onChange={e => setAsTemplate(e.target.checked)} />
          Save as quick-add (a workout you do regularly)
        </label>
        {asTemplate && (
          <input
            placeholder="Template name — e.g. Push Day A"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 8, fontSize: 13, padding: "6px 10px",
              border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={!canSave} className="btn-primary" style={{ flex: 1, opacity: canSave ? 1 : 0.4 }}>Save workout</button>
        <button onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Workout card in history ───────────────────────────────────────────────────
function WorkoutCard({ w, onDelete, onSaveTemplate }) {
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplName, setTplName] = useState("");
  const color = TYPE_COLORS[w.type] || "#888";
  const totalSets = (w.exercises || []).reduce((a, e) => a + (Number(e.sets) || 0), 0);

  function saveTemplate() {
    if (!tplName.trim()) return;
    onSaveTemplate({
      name: tplName.trim(),
      type: w.type,
      exercises: (w.exercises || []).map(({ exerciseId, sets, reps, weight }) => ({ exerciseId, sets, reps, weight })),
    });
    setSavingTpl(false);
    setTplName("");
  }

  return (
    <div style={{
      padding: "10px 14px",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 0.5, padding: "2px 7px",
          borderRadius: 4, background: color + "22", color, border: `0.5px solid ${color}55`,
          textTransform: "uppercase", flexShrink: 0
        }}>{MUSCLE_GROUPS[w.type] || w.type}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {(w.exercises || []).length} exercise{(w.exercises||[]).length !== 1 ? "s" : ""}
          {totalSets > 0 && ` · ${totalSets} sets`}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>{daysAgoLabel(w.date)}</span>
        <button onClick={() => setExpanded(e => !e)} style={{ padding: "2px 6px", opacity: 0.5 }}>
          <i className={`ti ti-chevron-${expanded ? "up" : "down"}`} aria-hidden="true"/>
        </button>
        {confirm
          ? <><button onClick={() => onDelete(w.id)} style={{ fontSize: 11, padding: "2px 8px", color: "var(--color-text-danger)" }}>Delete</button>
              <button onClick={() => setConfirm(false)} style={{ fontSize: 11, padding: "2px 6px" }}>×</button></>
          : <button onClick={() => setConfirm(true)} style={{ padding: "2px 6px", opacity: 0.35 }}><i className="ti ti-trash" aria-hidden="true"/></button>
        }
      </div>
      {expanded && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {(w.exercises || []).map((ex, i) => {
            const def = Object.values(EXERCISES).flat().find(e => e.id === ex.exerciseId);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ color: "var(--color-text-primary)", flex: 1 }}>{def?.name || ex.exerciseId}</span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                  {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                  {ex.weight ? ` @ ${ex.weight}lbs` : ex.weight === 0 ? " BW" : ""}
                </span>
              </div>
            );
          })}
          {w.notes && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "4px 0 0", fontStyle: "italic" }}>{w.notes}</p>}
          {onSaveTemplate && (
            savingTpl ? (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  autoFocus
                  placeholder="Quick-add name…"
                  value={tplName}
                  onChange={e => setTplName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveTemplate(); if (e.key === "Escape") { setSavingTpl(false); setTplName(""); } }}
                  style={{
                    flex: 1, fontSize: 12, padding: "4px 8px",
                    border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
                    background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
                  }}
                />
                <button onClick={saveTemplate} style={{ fontSize: 12, padding: "4px 10px" }}>Save</button>
                <button onClick={() => { setSavingTpl(false); setTplName(""); }} style={{ fontSize: 12, padding: "4px 8px" }}>×</button>
              </div>
            ) : (
              <button onClick={() => setSavingTpl(true)} style={{ alignSelf: "flex-start", marginTop: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                <i className="ti ti-bookmark-plus" aria-hidden="true" style={{ marginRight: 4 }}/> Save as quick-add
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────
function WeeklyChart({ workouts }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 56, padding: "0 4px" }}>
      {days.map(day => {
        const ws = workouts.filter(w => w.date === day);
        const totalSets = ws.reduce((a, w) => a + (w.exercises||[]).reduce((b, e) => b + (Number(e.sets)||0), 0), 0);
        const barH = totalSets ? Math.min(48, Math.max(6, Math.round((totalSets / 20) * 44))) : 2;
        const isToday = day === today();
        const d = new Date(day + "T12:00:00");
        return (
          <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div style={{ width: "100%", height: barH, borderRadius: 3, transition: "height 0.4s ease",
                background: ws.length ? isToday ? "#e05a1a" : "var(--color-text-secondary)" : "var(--color-border-tertiary)" }}/>
            </div>
            <span style={{ fontSize: 10, color: isToday ? "var(--color-text-primary)" : "var(--color-text-tertiary)", fontWeight: isToday ? 600 : 400 }}>
              {DAY[d.getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────
function StatsStrip({ workouts }) {
  const ws = weekStart();
  const week = workouts.filter(w => w.date >= ws);
  const totalSets = week.reduce((a, w) => a + (w.exercises||[]).reduce((b, e) => b + (Number(e.sets)||0), 0), 0);
  const groups = new Set(week.map(w => w.type)).size;
  const exercises = new Set(week.flatMap(w => (w.exercises||[]).map(e => e.exerciseId))).size;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {[
        { label: "Sessions", value: week.length },
        { label: "Total sets", value: totalSets || "—" },
        { label: "Exercises", value: exercises || "—" },
        { label: "Muscle groups", value: groups || "—" },
      ].map(s => (
        <div key={s.label} style={{ background: "var(--color-background-primary)", border: "2px solid var(--color-border-secondary)", boxShadow: "0 3px 0 rgba(91,62,199,0.18)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 500, margin: "0 0 2px" }}>{s.value}</p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Coverage tags ─────────────────────────────────────────────────────────────
function CoverageBar({ workouts }) {
  const ws = weekStart();
  const trained = new Set(workouts.filter(w => w.date >= ws).map(w => w.type));
  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 8px", fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>This week</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Object.entries(MUSCLE_GROUPS).map(([k, v]) => (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 8px",
            borderRadius: "var(--border-radius-md)",
            border: `0.5px solid ${trained.has(k) ? TYPE_COLORS[k]+"88" : "var(--color-border-tertiary)"}`,
            background: trained.has(k) ? TYPE_COLORS[k]+"18" : "transparent",
            color: trained.has(k) ? TYPE_COLORS[k] : "var(--color-text-tertiary)",
          }}>
            {trained.has(k) && <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 11 }}/>}
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick add — log a saved workout in one tap ────────────────────────────────
function QuickAdd({ templates, onQuickAdd, onDelete }) {
  if (!templates.length) return null;
  return (
    <div style={{ background: "var(--color-background-primary)", border: "2.5px solid var(--color-panel-border)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--panel-shadow)", padding: "1rem 1.25rem" }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 12px", letterSpacing: 0.5, textTransform: "uppercase" }}>Quick add</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {templates.map(t => {
          const color = TYPE_COLORS[t.type] || "#888";
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-secondary)", overflow: "hidden",
            }}>
              <button
                onClick={() => onQuickAdd(t)}
                title={`Log "${t.name}" for today`}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", borderRadius: 0, cursor: "pointer", padding: "8px 12px" }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: 0.5, padding: "2px 6px", borderRadius: 4,
                  background: color + "22", color, border: `0.5px solid ${color}55`, textTransform: "uppercase",
                }}>{MUSCLE_GROUPS[t.type] || t.type}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.name}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {t.exercises.length} ex
                </span>
                <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14, color }}/>
              </button>
              <button
                onClick={() => onDelete(t.id)}
                title="Remove quick-add"
                style={{ padding: "8px 10px", opacity: 0.4, borderRadius: 0, borderLeft: "0.5px solid var(--color-border-tertiary)" }}
              >
                <i className="ti ti-x" aria-hidden="true" style={{ fontSize: 12 }}/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Exercise finder — describe a movement, AI identifies it ───────────────────
function ExerciseFinder() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Flat catalog sent to the model so it can map to a known exercise id.
  const catalog = useMemo(
    () => Object.entries(EXERCISES).flatMap(([category, list]) =>
      list.map(e => ({ id: e.id, name: e.name, category }))
    ),
    []
  );

  async function identify() {
    if (!query.trim() || loading) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/identify-exercise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, exercises: catalog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // If the model matched a catalog exercise, pull its muscle tags to display.
  const matchedDef = result?.found
    ? Object.values(EXERCISES).flat().find(e => e.id === result.exerciseId)
    : null;
  const muscleTags = matchedDef
    ? [...new Set([...matchedDef.primary, ...matchedDef.secondary].map(m => m.replace(/_[lr]$/, "").replace(/_/g, " ")))]
    : [];
  const color = result ? (TYPE_COLORS[result.category] || "#888") : "#888";

  return (
    <div style={{ background: "var(--color-background-primary)", border: "2.5px solid var(--color-panel-border)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--panel-shadow)", padding: "1.25rem" }}>
      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 4px", letterSpacing: 0.5, textTransform: "uppercase" }}>Find an exercise</p>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
        Don't know what it's called? Describe the movement and AI will identify it.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
          <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 14, color: "var(--color-text-tertiary)", flexShrink: 0 }}/>
          <input
            placeholder="e.g. lying down, curl heels to butt against a pad"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") identify(); }}
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--color-text-primary)" }}
          />
        </div>
        <button onClick={identify} disabled={!query.trim() || loading} className="btn-primary" style={{ opacity: !query.trim() || loading ? 0.4 : 1 }}>
          {loading ? "Identifying…" : "Identify"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--color-text-danger)" }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" style={{ marginRight: 6 }}/>{error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14, padding: "12px 14px", border: `0.5px solid ${color}55`, borderRadius: "var(--border-radius-md)", background: color + "12" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{result.exerciseName}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, padding: "2px 7px", borderRadius: 4, background: color + "22", color, border: `0.5px solid ${color}55`, textTransform: "uppercase" }}>
              {MUSCLE_GROUPS[result.category] || result.category}
            </span>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>
              {result.found ? "in your catalog" : "not in catalog"} · {result.confidence} confidence
            </span>
          </div>
          {muscleTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {muscleTags.map(m => (
                <span key={m} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>{m}</span>
              ))}
            </div>
          )}
          {result.note && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "8px 0 0" }}>{result.note}</p>}
          {!result.found && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "8px 0 0", fontStyle: "italic" }}>
              This one isn't in the catalog yet — log it under {MUSCLE_GROUPS[result.category] || result.category} with the closest match.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function FitTrack() {
  const [workouts, setWorkouts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    Promise.all([loadWorkouts(), loadTemplates()]).then(([ws, ts]) => {
      setWorkouts(ws); setTemplates(ts); setLoaded(true);
    });
  }, []);

  const heat = useMemo(() => getRegionHeat(workouts), [workouts]);
  const sorted = useMemo(() => [...workouts].sort((a, b) => b.date.localeCompare(a.date)), [workouts]);

  async function handleSave(form) {
    const w = { ...form, id: Date.now().toString() };
    const updated = [w, ...workouts];
    setWorkouts(updated);
    await saveWorkouts(updated);
    setShowForm(false);
  }

  async function handleDelete(id) {
    const updated = workouts.filter(w => w.id !== id);
    setWorkouts(updated);
    await saveWorkouts(updated);
  }

  async function handleSaveTemplate(tpl) {
    const t = { ...tpl, id: Date.now().toString() };
    const updated = [...templates, t];
    setTemplates(updated);
    await saveTemplates(updated);
  }

  async function handleDeleteTemplate(id) {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    await saveTemplates(updated);
  }

  async function handleQuickAdd(tpl) {
    const w = {
      id: Date.now().toString(),
      type: tpl.type,
      date: today(),
      notes: "",
      exercises: tpl.exercises.map(e => ({ ...e })),
    };
    const updated = [w, ...workouts];
    setWorkouts(updated);
    await saveWorkouts(updated);
  }

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <p style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>Loading…</p>
    </div>
  );

  return (
    <div style={{
      "--skin": "var(--color-background-secondary)",
      "--body-line": "var(--color-border-secondary)",
      "--muscle-rest": "var(--color-background-secondary)",
      "--muscle-stroke": "var(--color-border-secondary)",
      "--hair": "#7a5b52",
      "--bow": "var(--color-accent)",
      fontFamily: "var(--font-sans)", maxWidth: 680, margin: "0 auto", padding: "1rem 0"
    }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, color: "var(--color-accent)", textShadow: "0 2px 0 var(--color-accent-strong)", letterSpacing: 0.5 }}>FitTrack</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {showForm && <div style={{ marginBottom: "1.25rem" }}><LogForm onSave={handleSave} onCancel={() => setShowForm(false)} onSaveTemplate={handleSaveTemplate}/></div>}

      {/* Tabs — chunky pill selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
        {[["dashboard","Dashboard"],["find","Find"],["history","History"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={tab === id ? "btn-primary" : ""}
            style={{ fontSize: 14, padding: "8px 18px" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <QuickAdd templates={templates} onQuickAdd={handleQuickAdd} onDelete={handleDeleteTemplate}/>

          {/* Heatmap */}
          <div style={{ background: "var(--color-background-primary)", border: "2.5px solid var(--color-panel-border)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--panel-shadow)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 12px", letterSpacing: 0.5, textTransform: "uppercase" }}>Muscle activation · last 7 days</p>
            <BodySVG heat={heat}/>
            <HeatLegend/>
          </div>

          <StatsStrip workouts={workouts}/>

          {/* Chart + coverage */}
          <div style={{ background: "var(--color-background-primary)", border: "2.5px solid var(--color-panel-border)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--panel-shadow)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 12px", letterSpacing: 0.5, textTransform: "uppercase" }}>Activity · last 7 days</p>
            <WeeklyChart workouts={workouts}/>
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 14 }}>
              <CoverageBar workouts={workouts}/>
            </div>
          </div>

          {/* Recent */}
          {sorted.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "2.5px solid var(--color-panel-border)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--panel-shadow)", overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: 0, padding: "12px 14px 10px", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>Recent</p>
              {sorted.slice(0, 5).map(w => <WorkoutCard key={w.id} w={w} onDelete={handleDelete} onSaveTemplate={handleSaveTemplate}/>)}
              {sorted.length > 5 && (
                <button onClick={() => setTab("history")} style={{ width: "100%", fontSize: 12, padding: "10px", borderRadius: 0, border: "none", borderTop: "0.5px solid var(--color-border-tertiary)", background: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  View all {sorted.length} workouts ↗
                </button>
              )}
            </div>
          )}

          {workouts.length === 0 && !showForm && (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>
              <i className="ti ti-barbell" aria-hidden="true" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: 0.4 }}/>
              No workouts yet. Hit <strong style={{ color: "var(--color-text-secondary)" }}>Log workout</strong> to get started.
            </div>
          )}
        </div>
      )}

      {tab === "find" && <ExerciseFinder/>}

      {tab === "history" && (
        <div style={{ background: "var(--color-background-primary)", border: "2.5px solid var(--color-panel-border)", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--panel-shadow)", overflow: "hidden" }}>
          {sorted.length === 0
            ? <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>No workouts logged yet.</p>
            : sorted.map(w => <WorkoutCard key={w.id} w={w} onDelete={handleDelete} onSaveTemplate={handleSaveTemplate}/>)
          }
        </div>
      )}

      {/* Floating "Log workout" bubble */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setTab("dashboard"); }}
          aria-label="Log workout"
          title="Log workout"
          className="btn-primary"
          style={{
            position: "fixed", right: 22, bottom: 22, zIndex: 50,
            width: 62, height: 62, borderRadius: 999, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}
        >
          <i className="ti ti-plus" aria-hidden="true"/>
        </button>
      )}
    </div>
  );
}
