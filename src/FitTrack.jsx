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
  if (v < 0.2)  return "#f9ddd0";
  if (v < 0.4)  return "#f5b48a";
  if (v < 0.6)  return "#f08040";
  if (v < 0.8)  return "#e05a1a";
  return "#c23000";
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
    <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
      {[
        { label: "FRONT", side: "front" },
        { label: "BACK",  side: "back"  },
      ].map(({ label, side }) => (
        <div key={side} style={{ textAlign: "center" }}>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "0 0 4px", letterSpacing: 1 }}>{label}</p>
          <svg width="105" viewBox="0 0 110 280" xmlns="http://www.w3.org/2000/svg">
            <style>{`.mb{stroke:var(--muscle-stroke);stroke-width:0.8}.bl{fill:none;stroke:var(--body-line);stroke-width:0.8}`}</style>
            <ellipse cx="55" cy="18" rx="14" ry="17" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <rect x="50" y="34" width="10" height="10" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <ellipse cx="24" cy="52" rx="12" ry="8" className="mb" style={r("shoulder_l")}/>
            <ellipse cx="86" cy="52" rx="12" ry="8" className="mb" style={r("shoulder_r")}/>
            {side === "front" ? <>
              <path d="M36 44 Q55 40 55 44 L55 66 Q55 70 36 66 Z" className="mb" style={r("chest_l")}/>
              <path d="M74 44 Q55 40 55 44 L55 66 Q55 70 74 66 Z" className="mb" style={r("chest_r")}/>
              <rect x="42" y="68" width="13" height="14" rx="3" className="mb" style={r("abs_upper")}/>
              <rect x="56" y="68" width="13" height="14" rx="3" className="mb" style={r("abs_upper")}/>
              <rect x="42" y="84" width="13" height="14" rx="3" className="mb" style={r("abs_lower")}/>
              <rect x="56" y="84" width="13" height="14" rx="3" className="mb" style={r("abs_lower")}/>
              <path d="M36 68 Q38 82 36 98 Q30 90 30 80 Z" className="mb" style={r("obliques_l")}/>
              <path d="M74 68 Q72 82 74 98 Q80 90 80 80 Z" className="mb" style={r("obliques_r")}/>
              <path d="M18 52 Q12 65 14 80 Q20 82 26 80 Q28 66 24 52 Z" className="mb" style={r("biceps_l")}/>
              <path d="M92 52 Q98 65 96 80 Q90 82 84 80 Q82 66 86 52 Z" className="mb" style={r("biceps_r")}/>
              <path d="M36 112 Q30 140 32 168 Q42 172 48 168 Q50 140 46 112 Z" className="mb" style={r("quads_l")}/>
              <path d="M74 112 Q80 140 78 168 Q68 172 62 168 Q60 140 64 112 Z" className="mb" style={r("quads_r")}/>
              <path d="M32 178 Q28 202 30 222 Q38 226 46 222 Q48 202 48 178 Z" className="mb" style={r("calves_l")}/>
              <path d="M78 178 Q82 202 80 222 Q72 226 64 222 Q62 202 62 178 Z" className="mb" style={r("calves_r")}/>
            </> : <>
              <path d="M36 44 Q55 38 74 44 L68 60 Q55 56 42 60 Z" className="mb" style={r("back_upper")}/>
              <path d="M36 55 Q26 75 28 95 Q38 100 42 95 Q44 75 40 58 Z" className="mb" style={r("lats")}/>
              <path d="M74 55 Q84 75 82 95 Q72 100 68 95 Q66 75 70 58 Z" className="mb" style={r("lats")}/>
              <rect x="42" y="60" width="26" height="22" rx="3" className="mb" style={r("back_upper")}/>
              <rect x="40" y="84" width="30" height="20" rx="3" className="mb" style={r("back_lower")}/>
              <path d="M18 52 Q12 65 14 80 Q20 82 26 80 Q28 66 24 52 Z" className="mb" style={r("triceps_l")}/>
              <path d="M92 52 Q98 65 96 80 Q90 82 84 80 Q82 66 86 52 Z" className="mb" style={r("triceps_r")}/>
              <path d="M36 112 Q32 128 36 140 Q46 144 55 140 Q55 128 46 112 Z" className="mb" style={r("glutes_l")}/>
              <path d="M74 112 Q78 128 74 140 Q64 144 55 140 Q55 128 64 112 Z" className="mb" style={r("glutes_r")}/>
              <path d="M36 142 Q30 162 32 180 Q42 184 48 180 Q50 162 48 142 Z" className="mb" style={r("hamstrings_l")}/>
              <path d="M74 142 Q80 162 78 180 Q68 184 62 180 Q60 162 62 142 Z" className="mb" style={r("hamstrings_r")}/>
              <path d="M32 188 Q28 208 30 226 Q38 230 46 226 Q48 208 48 188 Z" className="mb" style={r("calves_l")}/>
              <path d="M78 188 Q82 208 80 226 Q72 230 64 226 Q62 208 62 188 Z" className="mb" style={r("calves_r")}/>
            </>}
            <path d="M36 44 L22 100 L36 100 L36 44" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.5"/>
            <path d="M74 44 L88 100 L74 100 L74 44" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.5"/>
            <rect x="36" y="100" width="38" height="12" rx="4" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <path d="M14 82 Q10 96 12 110 Q18 112 24 110 Q26 96 26 82 Z" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <path d="M96 82 Q100 96 98 110 Q92 112 86 110 Q84 96 84 82 Z" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <ellipse cx="40" cy={side==="front"?172:182} rx="8" ry="6" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <ellipse cx="70" cy={side==="front"?172:182} rx="8" ry="6" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <ellipse cx="38" cy={side==="front"?228:232} rx="9" ry="5" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
            <ellipse cx="72" cy={side==="front"?228:232} rx="9" ry="5" fill="var(--skin)" stroke="var(--body-line)" strokeWidth="0.8"/>
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
function LogForm({ onSave, onCancel }) {
  const [category, setCategory] = useState("back");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState([{ id: Date.now(), exerciseId: "", sets: "", reps: "", weight: "" }]);

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
    onSave({ type: category, date, notes, exercises: filled });
  }

  const canSave = exercises.some(e => e.exerciseId);

  return (
    <div style={{
      background: "#fff0f0",
      border: "0.5px solid #f5c0c0",
      borderRadius: "var(--border-radius-lg)",
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

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={!canSave} style={{ flex: 1, fontWeight: 500, opacity: canSave ? 1 : 0.4 }}>Save workout</button>
        <button onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Workout card in history ───────────────────────────────────────────────────
function WorkoutCard({ w, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[w.type] || "#888";
  const totalSets = (w.exercises || []).reduce((a, e) => a + (Number(e.sets) || 0), 0);

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
        <div key={s.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", textAlign: "center" }}>
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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function FitTrack() {
  const [workouts, setWorkouts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => { loadWorkouts().then(ws => { setWorkouts(ws); setLoaded(true); }); }, []);

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
      fontFamily: "var(--font-sans)", maxWidth: 680, margin: "0 auto", padding: "1rem 0"
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>FitTrack</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setTab("dashboard"); }} style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-plus" aria-hidden="true"/> Log workout
        </button>
      </div>

      {showForm && <div style={{ marginBottom: "1.25rem" }}><LogForm onSave={handleSave} onCancel={() => setShowForm(false)}/></div>}

      {/* Tabs */}
      <div style={{ display: "flex", marginBottom: "1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {[["dashboard","Dashboard"],["history","History"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: "none", border: "none",
            borderBottom: tab === id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            borderRadius: 0, padding: "8px 16px", fontSize: 14, cursor: "pointer", marginBottom: -1,
            color: tab === id ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            fontWeight: tab === id ? 500 : 400,
          }}>{label}</button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Heatmap */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 12px", letterSpacing: 0.5, textTransform: "uppercase" }}>Muscle activation · last 7 days</p>
            <BodySVG heat={heat}/>
            <HeatLegend/>
          </div>

          <StatsStrip workouts={workouts}/>

          {/* Chart + coverage */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 12px", letterSpacing: 0.5, textTransform: "uppercase" }}>Activity · last 7 days</p>
            <WeeklyChart workouts={workouts}/>
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 14 }}>
              <CoverageBar workouts={workouts}/>
            </div>
          </div>

          {/* Recent */}
          {sorted.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: 0, padding: "12px 14px 10px", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>Recent</p>
              {sorted.slice(0, 5).map(w => <WorkoutCard key={w.id} w={w} onDelete={handleDelete}/>)}
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

      {tab === "history" && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
          {sorted.length === 0
            ? <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>No workouts logged yet.</p>
            : sorted.map(w => <WorkoutCard key={w.id} w={w} onDelete={handleDelete}/>)
          }
        </div>
      )}
    </div>
  );
}
