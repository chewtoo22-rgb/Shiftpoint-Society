import {
  executePostMediaOrphanCleanup,
  type PostMediaDeletionAdapter,
  type PostMediaOrphanCleanupReconciler,
  type PostMediaOrphanCleanupResult,
} from "./post-media-orphan-cleanup";
import { reconcileDeletedPostMediaOrphan } from "./post-media-orphan-reconciliation";
import {
  findPostMediaOrphanIntentCandidates,
  type PostMediaOrphanIntentCandidate,
} from "./post-media-orphan-repository";

export type PostMediaOrphanCandidateFinder = (options?: {
  now?: Date;
  limit?: number;
}) => Promise<PostMediaOrphanIntentCandidate[]>;

type RunPostMediaOrphanCleanupOptions = {
  now?: Date;
  limit?: number;
  /** Dry-run is the default and must be explicitly disabled for deletion. */
  dryRun?: boolean;
  /** Separate kill switch required in addition to dryRun=false. */
  destructiveEnabled?: boolean;
  /** Deliberately supplied by server-only infrastructure; never constructed from UI input. */
  deletionAdapter?: PostMediaDeletionAdapter;
};

type PostMediaOrphanServiceDependencies = {
  findCandidates?: PostMediaOrphanCandidateFinder;
  reconciler?: PostMediaOrphanCleanupReconciler;
};

const prismaReconciler: PostMediaOrphanCleanupReconciler = {
  reconcileDeletedObject: reconcileDeletedPostMediaOrphan,
};

/**
 * Narrow server orchestration boundary for post-media orphan cleanup.
 *
 * Nothing in the app/UI calls this service. It defaults to a non-destructive
 * dry run, reads only server-issued upload intents, and wires successful
 * provider deletion to the real conditional Prisma reconciliation path.
 *
 * A destructive run still requires all three independent conditions:
 *   1. dryRun === false
 *   2. destructiveEnabled === true
 *   3. an explicit server-provided deletion adapter
 *
 * This function intentionally does not construct a deletion adapter from an
 * environment variable, request body, or client input. That keeps live cleanup
 * unavailable from normal application paths until a dedicated operator-only
 * invocation is reviewed and explicitly enabled later.
 */
export async function runPostMediaOrphanCleanup(
  options: RunPostMediaOrphanCleanupOptions = {},
  dependencies: PostMediaOrphanServiceDependencies = {},
): Promise<PostMediaOrphanCleanupResult> {
  const findCandidates = dependencies.findCandidates ?? findPostMediaOrphanIntentCandidates;
  const reconciler = dependencies.reconciler ?? prismaReconciler;

  const candidates = await findCandidates({
    now: options.now,
    limit: options.limit,
  });

  return executePostMediaOrphanCleanup({
    candidates,
    dryRun: options.dryRun,
    destructiveEnabled: options.destructiveEnabled,
    adapter: options.deletionAdapter,
    reconciler,
  });
}
