import { useEffect, useRef } from "react";

const COMPARISON_ROWS = [
  {
    feature: "AI-powered mock interviews, not just Q&A banks",
    other: "—",
    otherLabel: "No",
  },
  {
    feature: "Voice + video responses, not just text",
    other: "—",
    otherLabel: "No",
  },
  {
    feature: "Scored against expert rubrics",
    other: "Pass / fail only",
    otherLabel: "Pass / fail only",
  },
  {
    feature: "Behavioral + System Design + DSA + ML tracks",
    other: "DSA only",
    otherLabel: "DSA only",
  },
  {
    feature: "Real-time feedback in <5s",
    other: "Peer-graded, hours",
    otherLabel: "Peer-graded, hours",
  },
] as const;

export default function ComparisonSection() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const checkmarks = Array.from(section.querySelectorAll<HTMLElement>("[data-checkmark]"));
    if (!checkmarks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          checkmarks.forEach((checkmark, index) => {
            window.setTimeout(() => {
              checkmark.dataset.visible = "true";
            }, index * 80);
          });

          observer.disconnect();
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="comparison-section" aria-labelledby="comparison-section-heading">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Space+Mono:wght@400;700&display=swap');

        .comparison-section {
          --bg: #0A0A0A;
          --surface: #111;
          --border: #1F1F1F;
          --neon-green: #39FF14;
          --neon-cyan: #00F0FF;
          --muted: #555;
          --text: #E5E5E5;
          width: 100%;
          background: var(--bg);
          padding: 120px 24px;
          color: var(--text);
        }

        .comparison-section__inner {
          width: min(100%, 1100px);
          margin: 0 auto;
        }

        .comparison-section__eyebrow {
          margin: 0 0 18px;
          color: var(--neon-green);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .comparison-section__headline {
          margin: 0 0 40px;
          font-family: 'Space Mono', monospace;
          font-size: clamp(2.5rem, 6vw, 5rem);
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }

        .comparison-section__headline-primary {
          color: #FFFFFF;
        }

        .comparison-section__headline-secondary {
          color: var(--muted);
        }

        .comparison-section__table-wrap {
          border: 1px solid var(--border);
          background: var(--bg);
          overflow: hidden;
        }

        .comparison-section__table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
        }

        .comparison-section__table th,
        .comparison-section__table td {
          padding: 28px 32px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }

        .comparison-section__table th:last-child,
        .comparison-section__table td:last-child {
          border-right: 0;
        }

        .comparison-section__table tbody tr:last-child td {
          border-bottom: 0;
        }

        .comparison-section__table thead th {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-align: left;
        }

        .comparison-section__feature-head {
          color: #888;
        }

        .comparison-section__ours-head {
          color: var(--neon-green);
          background: rgba(57, 255, 20, 0.04);
          text-align: center;
          text-shadow: 0 0 12px rgba(57, 255, 20, 0.5);
        }

        .comparison-section__others-head {
          color: #666;
          text-align: center;
        }

        .comparison-section__feature-cell {
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 1rem;
          line-height: 1.45;
        }

        .comparison-section__ours-cell {
          background: rgba(57, 255, 20, 0.04);
          text-align: center;
        }

        .comparison-section__others-cell {
          text-align: center;
        }

        .comparison-section__check {
          display: inline-block;
          color: var(--neon-green);
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1;
          opacity: 0;
          transform: scale(0.5);
          transition: opacity 0.4s ease, transform 0.4s ease;
          text-shadow: 0 0 14px rgba(57, 255, 20, 0.45);
        }

        .comparison-section__check[data-visible="true"] {
          opacity: 1;
          transform: scale(1);
        }

        .comparison-section__other {
          color: #666;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-style: italic;
          line-height: 1.45;
        }

        .comparison-section__other-dash {
          font-size: 1.1rem;
          letter-spacing: 0.08em;
        }

        .comparison-section__table tbody tr {
          transition: background 0.2s ease;
        }

        .comparison-section__table tbody tr:hover {
          background: rgba(57, 255, 20, 0.03);
        }

        @media (max-width: 820px) {
          .comparison-section {
            padding: 88px 18px;
          }

          .comparison-section__headline {
            margin-bottom: 28px;
          }

          .comparison-section__table th,
          .comparison-section__table td {
            padding: 20px 16px;
          }

          .comparison-section__feature-cell {
            font-size: 0.88rem;
          }

          .comparison-section__table thead th {
            font-size: 0.68rem;
          }
        }

        @media (max-width: 640px) {
          .comparison-section__table {
            table-layout: auto;
          }

          .comparison-section__table th,
          .comparison-section__table td {
            padding: 18px 12px;
          }

          .comparison-section__feature-cell {
            font-size: 0.82rem;
          }

          .comparison-section__check {
            font-size: 1.28rem;
          }

          .comparison-section__other {
            font-size: 0.74rem;
          }
        }
      `}</style>

      <div className="comparison-section__inner">
        <p className="comparison-section__eyebrow">// 05 — DIFF</p>
        <h2 id="comparison-section-heading" className="comparison-section__headline">
          <span className="comparison-section__headline-primary">INTERVIEWAI</span>{" "}
          <span className="comparison-section__headline-secondary">VS THE REST.</span>
        </h2>

        <div className="comparison-section__table-wrap">
          <table className="comparison-section__table">
            <thead>
              <tr>
                <th scope="col" className="comparison-section__feature-head">Feature</th>
                <th scope="col" className="comparison-section__ours-head">InterviewAI</th>
                <th scope="col" className="comparison-section__others-head">Others</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => {
                const isDash = row.other === "—";

                return (
                  <tr key={row.feature}>
                    <td className="comparison-section__feature-cell">{row.feature}</td>
                    <td className="comparison-section__ours-cell">
                      <span
                        className="comparison-section__check"
                        data-checkmark="true"
                        aria-label="Yes"
                      >
                        ✓
                      </span>
                    </td>
                    <td className="comparison-section__others-cell">
                      <span
                        className={`comparison-section__other${isDash ? " comparison-section__other-dash" : ""}`}
                        aria-label={row.otherLabel}
                      >
                        {row.other}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
