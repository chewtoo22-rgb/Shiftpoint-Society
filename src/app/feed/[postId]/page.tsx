import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../feed.module.css";
import { FeedMediaViewer } from "../feed-media-viewer";
import { addFeedComment, toggleFeedReaction } from "../actions";
import { PostShareButton } from "./post-share-button";
import { getCurrentMember } from "@/lib/current-member";
import { getCommunityFeedPost } from "@/lib/feed-repository";

const reactionOptions = [
  { type: "LIKE", label: "LIKE", icon: "♥" },
  { type: "FIRE", label: "FIRE", icon: "🔥" },
  { type: "WRENCH", label: "WRENCH", icon: "🔧" },
  { type: "RESPECT", label: "RESPECT", icon: "🤝" },
] as const;

type FeedPostPageProps = {
  params: Promise<{ postId: string }>;
};

function timeAgo(date: Date) {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatMediaSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}

function formatBuildDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export const dynamic = "force-dynamic";

export default async function FeedPostPage({ params }: FeedPostPageProps) {
  const [{ postId }, member] = await Promise.all([params, getCurrentMember()]);
  const post = await getCommunityFeedPost(postId);

  if (!post) notFound();

  return (
    <div className="shell">
      <section className={styles.header}>
        <div className="eyebrow">SOCIETY POST // DETAIL VIEW</div>
        <h1 className={styles.title}>POST DETAIL</h1>
        <p className="lead">Media, reactions and wrench talk for one Society update.</p>
      </section>

      <section className={styles.layout}>
        <div>
          <article className={`card ${styles.post}`} id={`post-${post.id}`}>
            <header className={styles.meta}>
              <div>
                <Link href={`/u/${post.author.handle}`} className={styles.author}>
                  {post.author.displayName || post.author.handle}
                </Link>
                <span>@{post.author.handle} · {timeAgo(post.createdAt)}</span>
              </div>
              <span className={styles.kind}>{post.kind}</span>
            </header>

            {post.car && (
              <Link href={`/u/${post.author.handle}`} className={styles.car}>
                {post.car.nickname ? `${post.car.nickname} // ` : ""}{post.car.year} {post.car.make} {post.car.model}
              </Link>
            )}

            <p className={styles.body}>{post.body}</p>

            {post.media.length > 0 && (
              <div
                className={styles.mediaGallery}
                data-count={post.media.length}
                aria-label={`${post.media.length} media ${post.media.length === 1 ? "item" : "items"}`}
              >
                {post.media.map((media, index) => (
                  <figure className={styles.persistedMedia} key={media.id}>
                    {media.type === "IMAGE" ? (
                      <FeedMediaViewer
                        src={media.url}
                        alt={media.originalName || `Shiftpoint post media ${index + 1}`}
                        positionLabel={post.media.length > 1 ? `${index + 1}/${post.media.length}` : undefined}
                      />
                    ) : (
                      <video controls preload="metadata">
                        <source src={media.url} type={media.mimeType} />
                        Your browser does not support this video.
                      </video>
                    )}
                    <figcaption>
                      <span>{media.originalName || `${media.type} // SOCIETY MEDIA`} · {formatMediaSize(media.sizeBytes)}</span>
                      {post.media.length > 1 && <strong>{index + 1}/{post.media.length}</strong>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            <div className={styles.reactions}>
              {reactionOptions.map((reaction) => {
                const count = post.reactions.filter((item) => item.type === reaction.type).length;
                const active = post.reactions.some(
                  (item) => item.type === reaction.type && item.userId === member.id,
                );

                return (
                  <form action={toggleFeedReaction} key={reaction.type}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="type" value={reaction.type} />
                    <button
                      className={`${styles.reactionButton} ${active ? styles.reactionActive : ""}`}
                      type="submit"
                      aria-pressed={active}
                      title={reaction.label}
                    >
                      <span>{reaction.icon}</span>
                      <strong>{count}</strong>
                    </button>
                  </form>
                );
              })}
            </div>

            <section className={styles.comments}>
              <div className={styles.commentHeader}>
                <span>WRENCH TALK</span>
                <span>{post._count.comments} {post._count.comments === 1 ? "COMMENT" : "COMMENTS"}</span>
              </div>

              {post.comments.length > 0 && (
                <div className={styles.commentStack}>
                  {post.comments.map((comment) => (
                    <div className={styles.comment} key={comment.id}>
                      <div>
                        <Link href={`/u/${comment.author.handle}`}>
                          {comment.author.displayName || comment.author.handle}
                        </Link>
                        <span>@{comment.author.handle} · {timeAgo(comment.createdAt)}</span>
                      </div>
                      <p>{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {post._count.comments > post.comments.length && (
                <p className={styles.moreComments}>
                  Showing latest thread entries · {post._count.comments - post.comments.length} more in the garage log
                </p>
              )}

              <form action={addFeedComment} className={styles.commentForm}>
                <input type="hidden" name="postId" value={post.id} />
                <input name="body" required maxLength={600} placeholder="Add to the wrench talk…" />
                <button type="submit">REPLY →</button>
              </form>
            </section>
          </article>
        </div>

        <aside className={styles.rail}>
          <div className="card">
            <div className="eyebrow">POST CONTEXT</div>
            <h2>{post.media.length} {post.media.length === 1 ? "MEDIA ITEM" : "MEDIA ITEMS"}</h2>
            <p>{post._count.comments} comments · {post.reactions.length} reactions</p>
            {post.car && (
              <>
                <div className="eyebrow">GARAGE CONTEXT</div>
                <p>
                  {post.car.nickname ? `${post.car.nickname} // ` : ""}{post.car.year} {post.car.make} {post.car.model}{post.car.trim ? ` ${post.car.trim}` : ""}
                </p>
                {(post.car.engine || post.car.drivetrain) && (
                  <p>{[post.car.engine, post.car.drivetrain].filter(Boolean).join(" · ")}</p>
                )}
                {(post.car.powerHp || post.car.torqueLbFt) && (
                  <p>
                    {post.car.powerHp ? `${post.car.powerHp} hp` : ""}
                    {post.car.powerHp && post.car.torqueLbFt ? " · " : ""}
                    {post.car.torqueLbFt ? `${post.car.torqueLbFt} lb-ft` : ""}
                  </p>
                )}
                {(post.car.quarterMileSeconds || post.car.quarterMileMph) && (
                  <p>
                    1/4 mile: {post.car.quarterMileSeconds ? `${post.car.quarterMileSeconds.toFixed(2)}s` : "—"}
                    {post.car.quarterMileMph ? ` @ ${post.car.quarterMileMph.toFixed(1)} mph` : ""}
                  </p>
                )}
                <p>{post.car._count.buildEntries} build updates · {post.car._count.carParts} tracked parts</p>

                {post.car.buildEntries.length > 0 && (
                  <>
                    <div className="eyebrow">LATEST BUILD LOG</div>
                    <div className={styles.commentStack}>
                      {post.car.buildEntries.map((entry) => (
                        <div className={styles.comment} key={entry.id}>
                          <div>
                            <strong>{entry.title}</strong>
                            <span>{formatBuildDate(entry.occurredAt)}</span>
                          </div>
                          {(entry.dynoHp || entry.dynoTorque || entry.mileage) && (
                            <p>
                              {entry.dynoHp ? `${entry.dynoHp} hp` : ""}
                              {entry.dynoHp && entry.dynoTorque ? " · " : ""}
                              {entry.dynoTorque ? `${entry.dynoTorque} lb-ft` : ""}
                              {(entry.dynoHp || entry.dynoTorque) && entry.mileage ? " · " : ""}
                              {entry.mileage ? `${entry.mileage.toLocaleString()} mi` : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <PostShareButton postId={post.id} authorHandle={post.author.handle} />
            <Link className="garageButton" href={`/feed#post-${post.id}`}>BACK TO FEED</Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
