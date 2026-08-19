/**
 * One-time exercise library seed, sourced from the LifeBud exercise CSVs.
 * Run this once from the Apps Script editor (select `seedExercises`, click
 * Run) after `setup` has created the sheet tabs. Safe to re-run: it skips
 * any name that already exists in the Exercises sheet (case-insensitive).
 *
 * Weightlifting is the priority category for Pleak, so it's seeded first
 * and is the larger list; functional exercises round out the library.
 * Both log as exerciseType 'weights' (sets/reps/weight), matching the
 * default the manual "Add exercise" form already uses.
 */
// Movement type per weightlifting muscle group, restored from the original
// LifeBud CSV data (each exercise there carried an explicit Push/Pull/Legs
// tag keyed off the same muscle-group buckets used here).
var MUSCLE_GROUP_MOVEMENT_TYPE = {
  Chest: 'Push',
  Shoulders: 'Push',
  Triceps: 'Push',
  Back: 'Pull',
  'Rear Shoulders': 'Pull',
  Biceps: 'Pull',
  Quads: 'Legs',
  Hamstrings: 'Legs',
};

var EXERCISE_SEED_DATA = {
  weightlifting: [
    { name: 'Push-Ups', muscleGroups: ['Chest'] },
    { name: 'Dumbbell Bench Press', muscleGroups: ['Chest'] },
    { name: 'Barbell Bench Press', muscleGroups: ['Chest'] },
    { name: 'Incline Dumbbell Press', muscleGroups: ['Chest'] },
    { name: 'Machine Chest Press', muscleGroups: ['Chest'] },
    { name: 'Cable Chest Flyes', muscleGroups: ['Chest'] },
    { name: 'Pec Deck Machine (Chest Flyes)', muscleGroups: ['Chest'] },
    { name: 'Incline Machine Press', muscleGroups: ['Chest'] },
    { name: 'Low to High Cable Flyes', muscleGroups: ['Chest'] },
    { name: 'Single-Arm Cable Chest Press', muscleGroups: ['Chest'] },
    { name: 'Overhead Shoulder Press (DB or Barbell)', muscleGroups: ['Shoulders'] },
    { name: 'Arnold Press', muscleGroups: ['Shoulders'] },
    { name: 'Lateral Raises', muscleGroups: ['Shoulders'] },
    { name: 'Seated Dumbbell Shoulder Press', muscleGroups: ['Shoulders'] },
    { name: 'Front Raises', muscleGroups: ['Shoulders'] },
    { name: 'Machine Shoulder Press', muscleGroups: ['Shoulders'] },
    { name: 'Cable Lateral Raises', muscleGroups: ['Shoulders'] },
    { name: 'Barbell Overhead Press', muscleGroups: ['Shoulders'] },
    { name: 'Behind-the-Neck Press', muscleGroups: ['Shoulders'] },
    { name: 'Upright Rows', muscleGroups: ['Shoulders'] },
    { name: 'Dips (Bench or Machine)', muscleGroups: ['Triceps'] },
    { name: 'Close-Grip Push-Ups', muscleGroups: ['Triceps'] },
    { name: 'Overhead Tricep Extension (DB or Cable)', muscleGroups: ['Triceps'] },
    { name: 'Skull Crushers (EZ Bar or DB)', muscleGroups: ['Triceps'] },
    { name: 'Tricep Pushdowns', muscleGroups: ['Triceps'] },
    { name: 'Cable Kickbacks', muscleGroups: ['Triceps'] },
    { name: 'Close-Grip Bench Press', muscleGroups: ['Triceps'] },
    { name: 'Machine Tricep Extension', muscleGroups: ['Triceps'] },
    { name: 'Single-Arm Cable Pushdowns', muscleGroups: ['Triceps'] },
    { name: 'Reverse Grip Tricep Pushdowns', muscleGroups: ['Triceps'] },
    { name: 'Lat Pulldown', muscleGroups: ['Back'] },
    { name: 'Assisted Pull-Ups', muscleGroups: ['Back'] },
    { name: 'Dumbbell Rows', muscleGroups: ['Back'] },
    { name: 'Barbell Rows', muscleGroups: ['Back'] },
    { name: 'Seated Cable Row', muscleGroups: ['Back'] },
    { name: 'Inverted Rows', muscleGroups: ['Back'] },
    { name: 'Pull-Up (Unassisted)', muscleGroups: ['Back'] },
    { name: 'Cable Straight-Arm Pulldown', muscleGroups: ['Back'] },
    { name: 'T-Bar Row', muscleGroups: ['Back'] },
    { name: 'Single-Arm Cable Row', muscleGroups: ['Back'] },
    { name: 'Machine Row (Hammer Strength)', muscleGroups: ['Back'] },
    { name: 'Barbell Bent-Over Rows', muscleGroups: ['Back'] },
    { name: 'Face Pulls', muscleGroups: ['Rear Shoulders'] },
    { name: 'Reverse Flyes', muscleGroups: ['Rear Shoulders'] },
    { name: 'Rear Delt Cable Flyes', muscleGroups: ['Rear Shoulders'] },
    { name: 'Incline Reverse Dumbbell Flyes', muscleGroups: ['Rear Shoulders'] },
    { name: 'Rear Delt Machine', muscleGroups: ['Rear Shoulders'] },
    { name: 'Standing Cable Reverse Flyes', muscleGroups: ['Rear Shoulders'] },
    { name: 'Seated Bent-Over Rear Delt Raise', muscleGroups: ['Rear Shoulders'] },
    { name: 'Prone Rear Delt Raise', muscleGroups: ['Rear Shoulders'] },
    { name: 'Single-Arm Rear Delt Cable Pull', muscleGroups: ['Rear Shoulders'] },
    { name: 'Hammer Curls', muscleGroups: ['Biceps'] },
    { name: 'Barbell Curls', muscleGroups: ['Biceps'] },
    { name: 'Preacher Curls', muscleGroups: ['Biceps'] },
    { name: 'Concentration Curls', muscleGroups: ['Biceps'] },
    { name: 'Incline DB Curls', muscleGroups: ['Biceps'] },
    { name: 'Cable Curls', muscleGroups: ['Biceps'] },
    { name: 'Machine Bicep Curl', muscleGroups: ['Biceps'] },
    { name: 'Zottman Curls', muscleGroups: ['Biceps'] },
    { name: 'Spider Curls', muscleGroups: ['Biceps'] },
    { name: 'Drag Curls', muscleGroups: ['Biceps'] },
    { name: 'Bodyweight Squats', muscleGroups: ['Quads'] },
    { name: 'Goblet Squats', muscleGroups: ['Quads'] },
    { name: 'Barbell Back Squat', muscleGroups: ['Quads'] },
    { name: 'Leg Press Machine', muscleGroups: ['Quads'] },
    { name: 'Leg Extensions (Machine)', muscleGroups: ['Quads'] },
    { name: 'Step-Ups', muscleGroups: ['Quads'] },
    { name: 'Bulgarian Split Squat', muscleGroups: ['Quads'] },
    { name: 'Front Squat', muscleGroups: ['Quads'] },
    { name: 'Smith Machine Squat', muscleGroups: ['Quads'] },
    { name: 'Wall Sit', muscleGroups: ['Quads'] },
    { name: 'Dumbbell Lunges', muscleGroups: ['Hamstrings'] },
    { name: 'Walking Lunges', muscleGroups: ['Hamstrings'] },
    { name: 'Romanian Deadlifts', muscleGroups: ['Hamstrings'] },
    { name: 'Leg Curls (Machine)', muscleGroups: ['Hamstrings'] },
    { name: 'Barbell Good Mornings', muscleGroups: ['Hamstrings'] },
  ],
  functional: [
    { name: "Kettlebell Swings", muscleGroups: ['Full Body'] },
    { name: 'Burpees', muscleGroups: ['Full Body'] },
    { name: 'Battle Ropes', muscleGroups: ['Full Body'] },
    { name: "Farmer's Carries", muscleGroups: ['Full Body'] },
    { name: 'Jump Squats', muscleGroups: ['Full Body'] },
    { name: 'Wall Balls', muscleGroups: ['Full Body'] },
    { name: 'Mountain Climbers', muscleGroups: ['Full Body'] },
    { name: 'Box Jumps', muscleGroups: ['Full Body'] },
    { name: 'Medicine Ball Slams', muscleGroups: ['Full Body'] },
    { name: 'Bodyweight Circuits', muscleGroups: ['Full Body'] },
    { name: 'Turkish Get-Up', muscleGroups: ['Full Body'] },
    { name: 'Renegade Rows', muscleGroups: ['Full Body'] },
    { name: 'Jump Rope (HIIT Rounds)', muscleGroups: ['Full Body'] },
    { name: 'Kettlebell Cleans & Press', muscleGroups: ['Full Body'] },
    { name: 'Man Makers', muscleGroups: ['Full Body'] },
    { name: 'Rowing Machine (Intervals)', muscleGroups: ['Full Body'] },
    { name: 'Battle Rope Alternating Waves', muscleGroups: ['Full Body'] },
    { name: 'Jumping Jacks (High Intensity)', muscleGroups: ['Full Body'] },
    { name: 'Thrusters (DB or Barbell)', muscleGroups: ['Full Body'] },
    { name: 'Sprawls', muscleGroups: ['Full Body'] },
    { name: 'Medicine Ball Chest Pass', muscleGroups: ['Full Body'] },
    { name: 'Jumping Lunges', muscleGroups: ['Full Body'] },
    { name: 'Overhead Squat', muscleGroups: ['Full Body'] },
    { name: 'Ground-to-Overhead Plate Lift', muscleGroups: ['Full Body'] },
    { name: 'Bear Crawls', muscleGroups: ['Core', 'Shoulders'] },
    { name: 'Sled Push (if available)', muscleGroups: ['Core', 'Shoulders'] },
    { name: 'Plank to Pike', muscleGroups: ['Core', 'Shoulders'] },
    { name: 'Push-Up to Downward Dog', muscleGroups: ['Core', 'Shoulders'] },
    { name: 'Landmine Rainbow', muscleGroups: ['Core', 'Shoulders'] },
    { name: 'Banded Lateral Walks', muscleGroups: ['Legs', 'Glutes'] },
    { name: 'Walking Kettlebell Lunge', muscleGroups: ['Legs', 'Glutes'] },
    { name: 'Step-Ups with Knee Drive', muscleGroups: ['Legs', 'Glutes'] },
    { name: 'Barbell Glute Bridge', muscleGroups: ['Legs', 'Glutes'] },
    { name: 'Sumo Deadlift High Pull', muscleGroups: ['Legs', 'Glutes'] },
    { name: 'Deadlifts (Moderate Weight)', muscleGroups: ['Back', 'Core'] },
    { name: "Loaded Carries (Farmer's / Suitcase)", muscleGroups: ['Back', 'Core'] },
    { name: 'Superman Hold', muscleGroups: ['Back', 'Core'] },
    { name: 'Reverse Hyperextensions', muscleGroups: ['Back', 'Core'] },
    { name: 'Stability Ball Back Extension', muscleGroups: ['Back', 'Core'] },
    { name: 'Walking Lunges (Loaded)', muscleGroups: ['Legs', 'Core'] },
    { name: 'Lateral Lunge', muscleGroups: ['Legs', 'Core'] },
    { name: 'Step-Up to Overhead Press', muscleGroups: ['Legs', 'Core'] },
    { name: 'Wall Sit with Overhead Reach', muscleGroups: ['Legs', 'Core'] },
    { name: 'Single-Leg Box Squat', muscleGroups: ['Legs', 'Core'] },
    { name: 'Single-Leg RDL', muscleGroups: ['Hamstrings', 'Glutes'] },
    { name: 'Kettlebell RDL', muscleGroups: ['Hamstrings', 'Glutes'] },
    { name: 'Glute-Ham Raise', muscleGroups: ['Hamstrings', 'Glutes'] },
    { name: 'Stability Ball Leg Curl', muscleGroups: ['Hamstrings', 'Glutes'] },
    { name: 'Reverse Lunge to Knee Drive', muscleGroups: ['Hamstrings', 'Glutes'] },
    { name: 'Goblet Squat', muscleGroups: ['Glutes', 'Quads'] },
    { name: 'Front-Racked Kettlebell Lunge', muscleGroups: ['Glutes', 'Core'] },
    { name: 'Kettlebell Swing', muscleGroups: ['Glutes', 'Core'] },
    { name: 'Donkey Kicks', muscleGroups: ['Glutes', 'Core'] },
    { name: 'Single-Leg Hip Thrust', muscleGroups: ['Glutes', 'Core'] },
    { name: 'Bulgarian Split Squat', muscleGroups: ['Quads', 'Glutes'] },
    { name: 'Barbell Hip Thrust', muscleGroups: ['Glutes', 'Hamstrings'] },
    { name: 'Plank Pull-Through', muscleGroups: ['Core'] },
    { name: 'Med Ball Slam', muscleGroups: ['Core'] },
    { name: 'Med Ball Russian Twists', muscleGroups: ['Core'] },
    { name: 'Hanging Knee Raises', muscleGroups: ['Core'] },
    { name: 'Hanging Leg Raises', muscleGroups: ['Core'] },
    { name: 'Dead Bug', muscleGroups: ['Core'] },
    { name: 'Banded Dead Bug', muscleGroups: ['Core'] },
    { name: 'Plank Shoulder Taps', muscleGroups: ['Core'] },
    { name: 'Stir the Pot (on Stability Ball)', muscleGroups: ['Core'] },
    { name: 'Rotational Landmine Twist', muscleGroups: ['Core', 'Obliques'] },
    { name: 'Cable Woodchoppers', muscleGroups: ['Core', 'Obliques'] },
    { name: 'Banded Rotational Press', muscleGroups: ['Core', 'Obliques'] },
    { name: 'Side Plank with Reach Under', muscleGroups: ['Core', 'Obliques'] },
    { name: 'Landmine Press', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Half-Kneeling Overhead Press', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Push-Up to T', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Incline Push-Ups', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Renegade Row', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Single-Arm Overhead Carry', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'DB Lateral Raise to Front Raise', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Standing Arnold Press', muscleGroups: ['Shoulders', 'Core'] },
    { name: 'Single-Arm Dumbbell Row', muscleGroups: ['Back', 'Biceps'] },
    { name: 'Barbell Bent-Over Row', muscleGroups: ['Back', 'Biceps'] },
    { name: 'Rowing Machine Intervals', muscleGroups: ['Back', 'Cardio'] },
    { name: 'Jump Rope (HIIT Intervals)', muscleGroups: ['Cardio', 'Arms'] },
  ],
};

function seedExercises() {
  var config = RESOURCES.exercises;
  var sheet = getSheet_(config.sheet, config.headers);
  var existingNames = {};
  sheet
    .getDataRange()
    .getValues()
    .slice(1)
    .forEach(function (row) {
      var name = row[config.headers.indexOf('name')];
      if (name) existingNames[String(name).toLowerCase()] = true;
    });

  var now = new Date().toISOString();
  var rowsToAdd = [];
  var added = 0;
  var skipped = 0;

  ['weightlifting', 'functional'].forEach(function (category) {
    EXERCISE_SEED_DATA[category].forEach(function (exercise) {
      if (existingNames[exercise.name.toLowerCase()]) {
        skipped++;
        return;
      }
      rowsToAdd.push(
        objectToRow_(config, {
          id: Utilities.getUuid(),
          name: exercise.name,
          category: category,
          exerciseType: 'weights',
          muscleGroups: exercise.muscleGroups,
          movementType: category === 'weightlifting' ? MUSCLE_GROUP_MOVEMENT_TYPE[exercise.muscleGroups[0]] || '' : '',
          instructions: 'Perform ' + exercise.name + ' with proper form and control.',
          equipment: 'Varies',
          userId: null,
          createdAt: now,
        }),
      );
      existingNames[exercise.name.toLowerCase()] = true;
      added++;
    });
  });

  if (rowsToAdd.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, config.headers.length)
      .setValues(rowsToAdd);
  }

  Logger.log('Exercise seed complete: %s added, %s already present.', added, skipped);
}
