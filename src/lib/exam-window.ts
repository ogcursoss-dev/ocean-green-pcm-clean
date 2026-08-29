/**
 * Helpers de validação de janela temporal para provas oficiais.
 */
import { ExamAssignment, Exam } from "@prisma/client";

export type AssignmentLike = Pick<
  ExamAssignment,
  "id" | "userId" | "customStart" | "customEnd" | "customDuration"
>;

export type ExamLike = Pick<
  Exam,
  "startDateTime" | "endDateTime" | "durationMinutes"
>;

export interface ResolvedWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
  isIndividual: boolean;
}

/** Resolve a janela final considerando override individual. */
export function resolveWindow(
  exam: ExamLike,
  assignment: AssignmentLike | null
): ResolvedWindow {
  const isIndividual = !!assignment?.userId;
  const start =
    (isIndividual && assignment?.customStart) || exam.startDateTime;
  const end = (isIndividual && assignment?.customEnd) || exam.endDateTime;
  const durationMinutes =
    (isIndividual && assignment?.customDuration) || exam.durationMinutes;
  return {
    start: new Date(start),
    end: new Date(end),
    durationMinutes,
    isIndividual,
  };
}

export type ExamStatus = "SCHEDULED" | "AVAILABLE" | "CLOSED";

export function getExamStatus(
  exam: ExamLike,
  assignment: AssignmentLike | null,
  now: Date = new Date()
): ExamStatus {
  const { start, end } = resolveWindow(exam, assignment);
  if (now < start) return "SCHEDULED";
  if (now > end) return "CLOSED";
  return "AVAILABLE";
}

export function secondsLeft(
  exam: ExamLike,
  assignment: AssignmentLike | null,
  now: Date = new Date()
): number {
  const { end } = resolveWindow(exam, assignment);
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
  return Math.max(0, diff);
}

export const STATUS_LABEL: Record<ExamStatus, string> = {
  SCHEDULED: "Agendada",
  AVAILABLE: "Disponível",
  CLOSED: "Encerrada",
};

export const STATUS_VARIANT: Record<
  ExamStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SCHEDULED: "secondary",
  AVAILABLE: "default",
  CLOSED: "destructive",
};
