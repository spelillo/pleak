import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useExercises } from "@/lib/queries/exercises";
import { useStartWorkoutSession } from "@/lib/queries/workoutSessions";
import { generateDraftExercises, toWorkoutExercise, type WorkoutTypeOption } from "@/lib/workoutGeneration";
import { WorkoutTypeModal } from "@/components/workout/WorkoutTypeModal";
import { WorkoutDraftModal } from "@/components/workout/WorkoutDraftModal";
import { Modal } from "@/components/ui/Modal";
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
  const { data: library, isLoading: isLibraryLoading } = useExercises();
  const startSession = useStartWorkoutSession(userId);
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<WorkoutTypeOption | null>(null);
  const [draft, setDraft] = useState<WorkoutExercise[] | null>(null);

  // Generation needs the exercise library loaded. If the user picks a type
  // before that query resolves, wait for it here rather than generating
  // from an empty list — this only fires once (draft stays null until the
  // first successful generation), so it won't clobber later edits.
  useEffect(() => {
    if (selectedType && draft === null && library) {
      setDraft(generateDraftExercises(library, selectedType));
    }
  }, [selectedType, draft, library]);

  function handleSelectType(type: WorkoutTypeOption) {
    setSelectedType(type);
    if (library) setDraft(generateDraftExercises(library, type));
  }

  function handleBack() {
    setSelectedType(null);
    setDraft(null);
  }

  function handleShuffle() {
    if (selectedType && library) setDraft(generateDraftExercises(library, selectedType));
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

  if (selectedType && isLibraryLoading) {
    return (
      <Modal onClose={onClose} ariaLabel="Loading exercises" className="max-w-sm p-8">
        <p className="text-center text-sm text-muted">Loading exercises…</p>
      </Modal>
    );
  }

  return <WorkoutTypeModal onClose={onClose} onSelect={handleSelectType} />;
}
