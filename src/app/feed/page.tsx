import Link from "next/link";
import styles from "./feed.module.css";
import { createFeedPost } from "./actions";
import { getCurrentMember } from "@/lib/current-member";
import { db } from "@/lib/db";
import { getCommunityFeed } from "@/lib/feed-repository";

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
            ) : posts.map((post) => (
              <article className={`card ${styles.post}`} key={post.id}>
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
                <footer className={styles.stats}>
                  <span>{post.reactions.length} reactions</span>
                  <span>{post.comments.length} comments</span>
                </footer>
              </article>
            ))}
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
