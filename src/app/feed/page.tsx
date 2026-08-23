import Link from "next/link";
import styles from "./feed.module.css";
import { addFeedComment, toggleFeedReaction } from "./actions";
import { FeedComposer } from "./feed-composer";
import { FeedMediaViewer } from "./feed-media-viewer";
import { getCurrentMember } from "@/lib/current-member";
import { db } from "@/lib/db";
import { getCommunityFeed } from "@/lib/feed-repository";
import { extractPostAttachment } from "@/lib/post-media";

const reactionOptions = [
  { type: "LIKE", label: "LIKE", icon: "♥" },
  { type: "FIRE", label: "FIRE", icon: "🔥" },
  { type: "WRENCH", label: "WRENCH", icon: "🔧" },
  { type: "RESPECT", label: "RESPECT", icon: "🤝" },
] as const;

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

export default async function FeedPage() {
  const member = await getCurrentMember();
  const [posts, cars] = await Promise.all([
    getCommunityFeed(),
    db.car.findMany({
      where: { ownerId: member.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, year: true, make: true, model: true, nickname: true },
    }),
  ]);

  return (
    <div className="shell">
      <section className={styles.header}>
        <div className="eyebrow">SOCIETY WIRE // LIVE GARAGE ACTIVITY</div>
        <h1 className={styles.title}>THE FEED</h1>
        <p className="lead">Build updates, pulls, questions and wrench talk from people who are actually in the garage.</p>
      </section>

      <section className={styles.layout}>
        <div>
          <FeedComposer cars={cars} />

          <div className={styles.stack}>
            {posts.length === 0 ? (
              <article className={`card ${styles.empty}`}>
                <span className="number">// 00</span>
                <h2>BE THE FIRST ONE IN</h2>
                <p>The Society wire is quiet. Drop the first garage update.</p>
              </article>
            ) : posts.map((post) => {
              const attachment = post.media.length === 0 ? extractPostAttachment(post.body) : null;

              return (
                <article className={`card ${styles.post}`} id={`post-${post.id}`} key={post.id}>
                  <header className={styles.meta}>
                    <div>
                      <Link href={`/u/${post.author.handle}`} className={styles.author}>
                        {post.author.displayName || post.author.handle}
                      </Link>
                      <span>@{post.author.handle} · {timeAgo(post.createdAt)}</span>
                    </div>
                    <Link
                      href={`/feed/${post.id}`}
                      className={styles.kind}
                      aria-label={`Open ${post.kind.toLowerCase()} post detail`}
                    >
                      {post.kind} ↗
                    </Link>
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
                            <span>
                              {media.originalName || `${media.type} // SOCIETY MEDIA`} · {formatMediaSize(media.sizeBytes)}
                            </span>
                            {post.media.length > 1 && <strong>{index + 1}/{post.media.length}</strong>}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}

                  {attachment && (
                    <a
                      className={styles.attachmentCard}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <span className={styles.attachmentKind}>{attachment.kind}</span>
                      <div>
                        <strong>{attachment.kind === "VIDEO" ? "WATCH ATTACHMENT" : attachment.kind === "IMAGE" ? "OPEN IMAGE" : "OPEN LINK"}</strong>
                        <span>{attachment.host}</span>
                      </div>
                      <span className={styles.attachmentArrow}>↗</span>
                    </a>
                  )}

                  {post.media.length === 0 && post.car?.heroImageUrl && (
                    <Link
                      href={`/u/${post.author.handle}`}
                      className={styles.mediaFrame}
                      aria-label={`Open ${post.car.nickname || `${post.car.year} ${post.car.make} ${post.car.model}`} garage`}
                    >
                      <img
                        src={post.car.heroImageUrl}
                        alt={post.car.nickname || `${post.car.year} ${post.car.make} ${post.car.model}`}
                        loading="lazy"
                      />
                      <span>GARAGE MEDIA // OPEN BUILD →</span>
                    </Link>
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
              );
            })}
          </div>
        </div>

        <aside className={styles.rail}>
          <div className="card">
            <div className="eyebrow">YOUR GARAGE</div>
            <h2>@{member.handle}</h2>
            <p>{cars.length} {cars.length === 1 ? "car" : "cars"} connected to your Society identity.</p>
            <Link className="garageButton" href="/garage">OPEN GARAGE</Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
