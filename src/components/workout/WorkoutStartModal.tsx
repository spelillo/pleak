import { useState } from "react";
import { useLocation } from "wouter";
import { useExercises } from "@/lib/queries/exercises";
import { useStartWorkoutSession } from "@/lib/queries/workoutSessions";
import { generateDraftExercises, toWorkoutExercise, type WorkoutTypeOption } from "@/lib/workoutGeneration";
import { WorkoutTypeModal } from "@/components/workout/WorkoutTypeModal";
import { WorkoutDraftModal } from "@/components/workout/WorkoutDraftModal";
import type { Exercise, WorkoutExercise } from "@/lib/types";

export function WorkoutStartModal({
  userId,
  username,
  onClose,
  onStarted,
}: {
  userId: string;
  username: string;
  onClose: () => void;
  onStarted: () => void;
}) {
  const { data: library } = useExercises();
  const startSession = useStartWorkoutSession(userId);
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<WorkoutTypeOption | null>(null);
  const [draft, setDraft] = useState<WorkoutExercise[] | null>(null);

  function handleSelectType(type: WorkoutTypeOption) {
    setSelectedType(type);
    setDraft(generateDraftExercises(library ?? [], type));
  }

  function handleBack() {
    setSelectedType(null);
    setDraft(null);
  }

  function handleShuffle() {
    if (selectedType) setDraft(generateDraftExercises(library ?? [], selectedType));
  }

  function handleUpdateExercise(index: number, next: WorkoutExercise) {
    setDraft((prev) => prev?.map((ex, i) => (i === index ? next : ex)) ?? prev);
  }

  function handleRemoveExercise(index: number) {
    setDraft((prev) => prev?.filter((_, i) => i !== index) ?? prev);
  }

  function handleAddExercise(exercise: Exercise) {
    setDraft((prev) => (prev ? [...prev, toWorkoutExercise(exercise)] : prev));
  }

  function handleBackToHome() {
    onClose();
    setLocation("/");
  }

  function handleStart() {
    if (!draft || draft.length === 0 || !selectedType) return;
    startSession.mutate(
      { username, name: `${selectedType.label} Day`, exercises: draft },
      { onSuccess: () => onStarted() },
    );
  }

  if (selectedType && draft) {
    return (
      <WorkoutDraftModal
        type={selectedType}
        draft={draft}
        library={library ?? []}
        onBack={handleBack}
        onClose={onClose}
        onBackToHome={handleBackToHome}
        onShuffle={handleShuffle}
        onUpdateExercise={handleUpdateExercise}
        onRemoveExercise={handleRemoveExercise}
        onAddExercise={handleAddExercise}
        onStart={handleStart}
        isStarting={startSession.isPending}
      />
    );
  }

  return <WorkoutTypeModal onClose={onClose} onSelect={handleSelectType} />;
}
