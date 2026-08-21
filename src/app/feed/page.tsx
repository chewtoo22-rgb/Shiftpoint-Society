import Link from "next/link";
import styles from "./feed.module.css";
import { addFeedComment, createFeedPost, toggleFeedReaction } from "./actions";
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

const postKinds = [
  { value: "GENERAL", label: "GENERAL" },
  { value: "PULL", label: "PULL / RUN" },
  { value: "DYNO", label: "DYNO" },
  { value: "INSTALL", label: "INSTALL" },
  { value: "QUESTION", label: "QUESTION" },
  { value: "VIDEO", label: "VIDEO" },
  { value: "EVENT", label: "EVENT" },
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
          <form action={createFeedPost} className={`${styles.composer} card`}>
            <div className="eyebrow">POST TO THE SOCIETY</div>
            <textarea name="body" required maxLength={1200} placeholder="What are you working on?" />
            <div className={styles.composerRow}>
              <select name="carId" defaultValue="">
                <option value="">No car attached</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.nickname ? `${car.nickname} — ` : ""}{car.year} {car.make} {car.model}
                  </option>
                ))}
              </select>
              <select name="kind" defaultValue="GENERAL" aria-label="Post type">
                {postKinds.map((kind) => (
                  <option key={kind.value} value={kind.value}>{kind.label}</option>
                ))}
              </select>
              <button className="cta" type="submit">DROP UPDATE →</button>
            </div>
          </form>

          <div className={styles.stack}>
            {posts.length === 0 ? (
              <article className={`card ${styles.empty}`}>
                <span className="number">// 00</span>
                <h2>BE THE FIRST ONE IN</h2>
                <p>The Society wire is quiet. Drop the first garage update.</p>
              </article>
            ) : posts.map((post) => {
              const attachment = extractPostAttachment(post.body);

              return (
                <article className={`card ${styles.post}`} id={`post-${post.id}`} key={post.id}>
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

                  {post.car?.heroImageUrl && (
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
