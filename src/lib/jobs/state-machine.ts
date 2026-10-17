import { ConversionJob, IConversionJob } from "@/lib/db/models/ConversionJob";
import { JobStatus } from "@/types/conversion";

export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  uploading: ["queued", "cancelled", "failed"],
  queued: ["processing", "cancelled"],
  processing: ["completed", "failed", "cancelled"],
  completed: ["expired"],
  failed: ["queued", "expired"],
  cancelled: ["queued", "expired"],
  expired: [],
};

export class InvalidStateTransitionError extends Error {
  public code = "INVALID_STATE";
  constructor(from: JobStatus, to: JobStatus) {
    super(`Cannot transition job from '${from}' to '${to}'.`);
    this.name = "InvalidStateTransitionError";
  }
}

export async function transitionJobState(
  jobId: string,
  fromState: JobStatus | JobStatus[],
  toState: JobStatus,
  updates: Partial<IConversionJob> = {}
): Promise<IConversionJob | null> {
  const allowedFrom = Array.isArray(fromState) ? fromState : [fromState];

  // Validate allowed state machine logic
  for (const from of allowedFrom) {
    if (!ALLOWED_TRANSITIONS[from]?.includes(toState)) {
      throw new InvalidStateTransitionError(from, toState);
    }
  }

  // Atomic conditional update
  const updatedJob = await ConversionJob.findOneAndUpdate(
    {
      _id: jobId,
      status: { $in: allowedFrom },
    },
    {
      $set: {
        status: toState,
        ...updates,
      },
    },
    { returnDocument: "after" }
  );

  return updatedJob;
}
