// src/components/detail/preset/DetailPresetArticle.tsx
//
// Concept-preset detail renderer (Phase B-1) — 1:1 React port of
// docs/design/aroma_L3_detail_reference.html.
//
// Pure presentational (no 'use client', no hooks) so it works in both
// renderToStaticMarkup (publish HTML, B-3) and client previews. The visual
// skin comes entirely from the [data-preset]/data-intensity token cascade in
// globals.css (Phase A) + this CSS module; ALL copy comes from `content`
// props (no Korean literals here, CLAUDE.md §3-1). Section order is fixed
// (DETAIL_PAGE_PLAYBOOK §2); L3 keeps the layered hero, intensity tunes density.

import type { CSSProperties } from 'react';
import {
  Frame, Wind, Sparkles, Leaf, Droplet, ShieldCheck, Snowflake,
  Utensils, Ruler, Heart, Package, Palette, Sprout,
  Truck, RefreshCw, MessageCircle, ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import styles from './preset-detail.module.css';
import type {
  DetailPresetArticleProps, ValueIcon, NoticeIcon, ScentSwatch,
} from './types';

const VALUE_ICONS: Record<ValueIcon, LucideIcon> = {
  frame: Frame, wind: Wind, sparkles: Sparkles, leaf: Leaf, droplet: Droplet,
  'shield-check': ShieldCheck, snowflake: Snowflake, utensils: Utensils,
  ruler: Ruler, heart: Heart, package: Package, palette: Palette, sprout: Sprout,
};

const NOTICE_ICONS: Record<NoticeIcon, LucideIcon> = {
  delivery: Truck, exchange: RefreshCw, support: MessageCircle,
};

const SWATCH_CLASS: Record<ScentSwatch, string> = {
  lemon: styles.vLemon, a: styles.vLemon,
  april: styles.vApril, b: styles.vApril,
  cherry: styles.vCherry, c: styles.vCherry,
};

export function DetailPresetArticle({
  preset,
  intensity,
  content,
  overrides,
  heroProductImage,
}: DetailPresetArticleProps) {
  const c = content;
  const rootStyle = overrides?.accent
    ? ({ ['--accent']: overrides.accent } as CSSProperties)
    : undefined;

  const heroArtStyle = overrides?.moodImage
    ? ({ backgroundImage: `url(${overrides.moodImage})` } as CSSProperties)
    : undefined;

  return (
    <article
      className={styles.root}
      data-preset={preset}
      data-intensity={intensity}
      style={rootStyle}
    >
      {/* S1 hook */}
      <section className={styles.hero}>
        <div
          className={overrides?.moodImage ? `${styles.heroArt} ${styles.heroArtImage}` : styles.heroArt}
          style={heroArtStyle}
        >
          {c.tagA ? <span className={`${styles.layerTag} ${styles.tagA}`}>{c.tagA}</span> : null}
          {c.tagC ? <span className={`${styles.layerTag} ${styles.tagC}`}>{c.tagC}</span> : null}
          <div className={styles.heroProduct}>
            {heroProductImage
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={heroProductImage} alt="" />
              : c.heroProductLabel}
          </div>
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h1>
            {overrides?.heroCopy
              ? overrides.heroCopy
              : (
                <>
                  {c.headlineLead}
                  {c.headlineEm ? <><br /><em>{c.headlineEm}</em></> : null}
                  {c.headlineTail ? c.headlineTail : null}
                </>
              )}
          </h1>
          <p className={styles.heroSub}>{c.heroSub}</p>
          <div className={styles.heroTrust}>
            {c.heroChips.map((chip, i) => (
              <span key={i} className={styles.chip}>{chip}</span>
            ))}
          </div>
        </div>
      </section>

      {/* S2 value */}
      <section className={styles.values}>
        <div className={styles.vh}>
          <p className={`${styles.eyebrow} ${styles.center}`}>{c.valueEyebrow}</p>
          <h2>{c.valueTitle}</h2>
        </div>
        <div className={styles.valueGrid}>
          {c.values.map((v, i) => {
            const Icon = VALUE_ICONS[v.icon] ?? Sparkles;
            return (
              <div key={i} className={styles.valueCard}>
                <div className={styles.valueIcon}><Icon /></div>
                <span className={styles.valueNum}>{v.num}</span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* S3 scents (optional) + spec */}
      <section className={styles.scents}>
        <div className={styles.sh}>
          <span className={styles.eyebrow}>{c.specEyebrow}</span>
          <h2>{c.specTitle}</h2>
        </div>
        {c.scents?.map((s, i) => (
          <div key={i} className={styles.scent}>
            <div className={`${styles.scentVisual} ${SWATCH_CLASS[s.swatch] ?? styles.vLemon}`}>
              {s.visualNote ? <span>{s.visualNote}</span> : null}
            </div>
            <div className={styles.scentText}>
              <div className={styles.scentName}>
                {s.name} <span className={styles.scentEn}>{s.en}</span>
              </div>
              <p className={styles.scentLine}>{s.line}</p>
              <p className={styles.scentDesc}>{s.desc}</p>
            </div>
          </div>
        ))}
        <div className={styles.specCard}>
          <h3>{c.specHeader}</h3>
          <dl>
            {c.specRows.map((row, i) => (
              <div key={i} className={styles.specRow}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* S4 usage */}
      <section className={styles.usage}>
        <div className={styles.uh}>
          <span className={`${styles.eyebrow} ${styles.center}`}>{c.usageEyebrow}</span>
          <h2>{c.usageTitle}</h2>
        </div>
        <div className={styles.stepGrid}>
          {c.steps.map((step, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.stepNo}>{step.no}</div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* S5 story + trust */}
      <section className={styles.story}>
        <div className={styles.storyWrap}>
          <div className={styles.storyArt}>
            {c.storyArtCaption ? <span className={styles.caption}>{c.storyArtCaption}</span> : null}
          </div>
          <h2>{c.storyTitle}</h2>
          <p>{c.storyBody}</p>
          <p className={styles.sign}>{c.storySign}</p>
        </div>
        <div className={styles.trustBadges}>
          {c.trustBadges.map((b, i) => (
            <div key={i} className={styles.tb}>
              <div className={styles.k}>{b.k}</div>
              <div className={styles.v}>{b.v}</div>
            </div>
          ))}
        </div>
        {c.reviewSlotBody ? (
          <div className={styles.reviewSlot}>
            {c.reviewSlotEyebrow ? <span className={`${styles.eyebrow} ${styles.center}`}>{c.reviewSlotEyebrow}</span> : null}
            <p>{c.reviewSlotBody}</p>
          </div>
        ) : null}
      </section>

      {/* S6 cta */}
      <section className={styles.cta}>
        <h2>{c.ctaTitle}</h2>
        <p>{c.ctaSub}</p>
        <div className={styles.ctaPrice}>
          <div className={styles.won}>{c.priceText}</div>
          <div className={styles.ship}>{c.shipText}</div>
        </div>
        <button type="button" className={styles.ctaBtn}>
          <ShoppingCart />
          {c.ctaButton}
        </button>
        <p className={styles.ctaReassure}>{c.ctaReassure}</p>
      </section>

      {/* S7 notice + brand */}
      <section className={styles.notice}>
        <div className={styles.noticeGrid}>
          {c.noticeCards.map((card, i) => {
            const Icon = NOTICE_ICONS[card.icon] ?? Truck;
            return (
              <div key={i} className={styles.noticeCard}>
                <h4><Icon />{card.title}</h4>
                <p>{card.body}</p>
              </div>
            );
          })}
        </div>
        <div className={styles.noticeSlot}>{c.noticeSlotLabel}</div>
      </section>

      <div className={styles.brandbar}>
        <div className={styles.mark}><b>{c.brandMarkLead}</b> {c.brandMarkTail}</div>
        <div className={styles.tip}>{c.brandTip}</div>
      </div>

      {/* mobile sticky CTA (desktop hidden) */}
      <div className={styles.stickyBuy}>
        <span className={styles.p}>{c.stickyPrice}</span>
        <button type="button">{c.stickyButton}</button>
      </div>
    </article>
  );
}

export default DetailPresetArticle;
