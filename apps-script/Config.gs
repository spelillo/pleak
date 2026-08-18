/**
 * Pleak API — a small JSON API in front of a Google Sheet, replacing the
 * old Express backend for a GitHub Pages static deploy.
 *
 * One sheet tab per resource, one row per record. Column order is defined
 * in RESOURCES below and is the single source of truth for both reading
 * and writing rows. See ../docs/apps-script-setup.md for deployment steps.
 *
 * Endpoints (all through this one Web App URL):
 *   GET  ?resource=<name>&action=list[&<field>=<value> ...]
 *   GET  ?resource=<name>&action=get&id=<id>
 *   POST ?resource=<name>&action=create   body: JSON record (text/plain)
 *   POST ?resource=<name>&action=update   body: JSON { id, ...patch }
 *   POST ?resource=<name>&action=delete   body: JSON { id }
 *
 * This project is split across several small .gs files (Config, Router,
 * SheetHelpers, CrudHelpers) purely to keep each file short to paste —
 * Apps Script shares one global scope across all files in a project, so
 * this split changes nothing about how the code runs.
 */

var RESOURCES = {
  users: {
    sheet: 'Users',
    headers: ['id', 'googleId', 'email', 'displayName', 'dateOfBirth', 'sex', 'height', 'weight', 'age', 'streak', 'createdAt'],
    json: [],
    bool: [],
  },
  exercises: {
    sheet: 'Exercises',
    headers: ['id', 'name', 'category', 'exerciseType', 'muscleGroups', 'instructions', 'equipment', 'userId', 'createdAt'],
    json: ['muscleGroups'],
    bool: [],
  },
  workoutPlans: {
    sheet: 'WorkoutPlans',
    headers: ['id', 'name', 'description', 'category', 'exercises', 'estimatedDuration', 'difficulty', 'createdAt'],
    json: ['exercises'],
    bool: [],
  },
  workoutSessions: {
    sheet: 'WorkoutSessions',
    headers: ['id', 'userId', 'username', 'planId', 'name', 'startTime', 'endTime', 'totalDuration', 'durationMins', 'exercises', 'isActive'],
    json: ['exercises'],
    bool: ['isActive'],
  },
  scheduledWorkouts: {
    sheet: 'ScheduledWorkouts',
    headers: ['id', 'userId', 'name', 'category', 'scheduledDate', 'scheduledDay', 'exercises', 'createdAt'],
    json: ['exercises'],
    bool: [],
  },
  goals: {
    sheet: 'Goals',
    headers: ['id', 'userId', 'title', 'description', 'type', 'category', 'targetValue', 'currentValue', 'startingValue', 'unit', 'deadline', 'status', 'priority', 'exerciseId', 'targetExerciseWeight', 'targetTime', 'targetDistance', 'createdAt', 'updatedAt'],
    json: [],
    bool: [],
  },
  personalRecords: {
    sheet: 'PersonalRecords',
    headers: ['id', 'userId', 'exerciseName', 'exerciseType', 'weight', 'reps', 'duration', 'distance', 'achievedAt', 'workoutSessionId', 'createdAt'],
    json: [],
    bool: [],
  },
  weeklyWorkoutPlans: {
    sheet: 'WeeklyWorkoutPlans',
    headers: ['id', 'userId', 'name', 'isActive', 'createdAt', 'updatedAt'],
    json: [],
    bool: ['isActive'],
  },
  weeklyPlanDays: {
    sheet: 'WeeklyPlanDays',
    headers: ['id', 'weeklyPlanId', 'weekStartDate', 'dayOfWeek', 'title', 'isRestDay', 'exercises', 'createdAt'],
    json: ['exercises'],
    bool: ['isRestDay'],
  },
  weeklyPlanCompletions: {
    sheet: 'WeeklyPlanCompletions',
    headers: ['id', 'weeklyPlanId', 'userId', 'weekStartDate', 'dayOfWeek', 'sessionId', 'completedAt', 'createdAt'],
    json: [],
    bool: [],
  },
};
