import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import "./Landing.css";

function Landing() {
  function goToLogin() {
    window.history.pushState(
      {},
      "",
      "/login"
    );

    window.dispatchEvent(
      new PopStateEvent("popstate")
    );
  }

  function goToSignup() {
    window.history.pushState(
      {},
      "",
      "/signup"
    );

    window.dispatchEvent(
      new PopStateEvent("popstate")
    );
  }

  return (
    <div className="landing-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="landing-nav">

        <button
          className="landing-brand"
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >

          <span className="landing-brand-mark">
            D
          </span>

          <span>

            <strong>
              DumbDue
            </strong>

            <small>
              subscription tracker
            </small>

          </span>

        </button>

        <div className="landing-nav-actions">

          <button
            className="landing-login-button"
            type="button"
            onClick={
              goToLogin
            }
          >
            Log in
          </button>

          <button
            className="landing-nav-cta"
            type="button"
            onClick={
              goToSignup
            }
          >
            Get started
          </button>

        </div>

      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <main>

        <section className="landing-hero">

          <div className="landing-glow landing-glow-one" />
          <div className="landing-glow landing-glow-two" />

          <div className="landing-hero-copy">

            <div className="landing-kicker">

              <Sparkles
                size={15}
              />

              LESS CHAOS.
              MORE CONTROL.

            </div>

            <h1>

              Know exactly
              <span>
                what you're paying for.
              </span>

            </h1>

            <p>

              DumbDue helps you track subscriptions,
              upcoming payments, free trials, and
              recurring spending without making you
              wrestle with a spreadsheet.

            </p>

            <div className="landing-hero-actions">

              <button
                className="landing-primary-button"
                type="button"
                onClick={
                  goToSignup
                }
              >

                Start tracking for free

                <ArrowRight
                  size={18}
                />

              </button>

              <button
                className="landing-secondary-button"
                type="button"
                onClick={
                  goToLogin
                }
              >
                I already have an account
              </button>

            </div>

            <div className="landing-trust-row">

              <div>

                <Check
                  size={15}
                />

                Simple to use

              </div>

              <div>

                <ShieldCheck
                  size={15}
                />

                Your data stays yours

              </div>

            </div>

          </div>

          {/* =================================================
              HERO MOCKUP
          ================================================= */}

          <div className="landing-dashboard-wrap">

            <div className="landing-dashboard-card">

              <div className="landing-dashboard-top">

                <div>

                  <span>
                    PAYMENT OVERVIEW
                  </span>

                  <h3>
                    Good morning.
                  </h3>

                </div>

                <div className="landing-mini-profile">
                  D
                </div>

              </div>

              <div className="landing-stat-grid">

                <div className="landing-stat-card highlighted">

                  <span>
                    Monthly spending
                  </span>

                  <strong>
                    ₹948.00
                  </strong>

                  <small>
                    recurring subscriptions
                  </small>

                </div>

                <div className="landing-stat-card">

                  <span>
                    Yearly projection
                  </span>

                  <strong>
                    ₹11,376
                  </strong>

                  <small>
                    if nothing changes
                  </small>

                </div>

                <div className="landing-stat-card">

                  <span>
                    Active trials
                  </span>

                  <strong>
                    2
                  </strong>

                  <small>
                    currently free
                  </small>

                </div>

              </div>

              <div className="landing-dashboard-section">

                <div className="landing-dashboard-section-title">

                  <div>

                    <span>
                      COMING UP
                    </span>

                    <strong>
                      Upcoming payments
                    </strong>

                  </div>

                  <CalendarDays
                    size={17}
                  />

                </div>

                <div className="landing-payment-row">

                  <div className="landing-service-letter">
                    N
                  </div>

                  <div className="landing-payment-info">

                    <strong>
                      Netflix
                    </strong>

                    <span>
                      Entertainment
                    </span>

                  </div>

                  <div className="landing-payment-date">

                    <strong>
                      In 3 days
                    </strong>

                    <span>
                      16 Sep 2026
                    </span>

                  </div>

                  <strong className="landing-payment-price">
                    ₹649
                  </strong>

                </div>

                <div className="landing-payment-row">

                  <div className="landing-service-letter">
                    C
                  </div>

                  <div className="landing-payment-info">

                    <strong>
                      Canva
                    </strong>

                    <span>
                      Software
                    </span>

                  </div>

                  <div className="landing-payment-date">

                    <strong>
                      In 8 days
                    </strong>

                    <span>
                      21 Sep 2026
                    </span>

                  </div>

                  <strong className="landing-payment-price">
                    ₹299
                  </strong>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            FEATURES
        =================================================== */}

        <section className="landing-features">

          <div className="landing-section-heading">

            <span>
              EVERYTHING IN ONE PLACE
            </span>

            <h2>
              Your recurring payments,
              finally organized.
            </h2>

            <p>
              No spreadsheet archaeology.
              No mystery charges lurking
              in your bank statement.
            </p>

          </div>

          <div className="landing-feature-grid">

            <LandingFeature
              icon={
                <WalletCards
                  size={21}
                />
              }
              title="Track subscriptions"
              text="Keep your recurring services, billing cycles, payment dates, and amounts together."
            />

            <LandingFeature
              icon={
                <CalendarDays
                  size={21}
                />
              }
              title="See what's coming"
              text="Know which payments are approaching before they quietly raid your balance."
            />

            <LandingFeature
              icon={
                <Bell
                  size={21}
                />
              }
              title="Catch reminders"
              text="Get useful reminders for upcoming payments and free trials."
            />

            <LandingFeature
              icon={
                <ChartNoAxesColumnIncreasing
                  size={21}
                />
              }
              title="Understand spending"
              text="See monthly costs, yearly projections, and where your recurring money goes."
            />

          </div>

        </section>

        {/* ===================================================
            HOW IT WORKS
        =================================================== */}

        <section className="landing-how">

          <div className="landing-section-heading">

            <span>
              HOW IT WORKS
            </span>

            <h2>
              Three steps. No financial
              detective work.
            </h2>

          </div>

          <div className="landing-steps">

            <LandingStep
              number="01"
              title="Add your subscriptions"
              text="Enter the services you already pay for and their billing details."
            />

            <LandingStep
              number="02"
              title="DumbDue organizes them"
              text="Your dashboard turns those scattered payments into one clear picture."
            />

            <LandingStep
              number="03"
              title="Stay ahead"
              text="Check what's due, track trials, and understand your recurring spending."
            />

          </div>

        </section>

        {/* ===================================================
            CTA
        =================================================== */}

        <section className="landing-final-cta">

          <div>

            <span>
              READY WHEN YOU ARE
            </span>

            <h2>
              Stop guessing where
              your money is going.
            </h2>

            <p>
              Start tracking your subscriptions
              with DumbDue.
            </p>

          </div>

          <button
            className="landing-primary-button"
            type="button"
            onClick={
              goToSignup
            }
          >

            Create your account

            <ArrowRight
              size={18}
            />

          </button>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="landing-footer">

        <div>

          <strong>
            DumbDue
          </strong>

          <span>
            subscription tracker
          </span>

        </div>

        <span>
          © 2026 DumbDue
        </span>

      </footer>

    </div>
  );
}

/* =========================================================
   FEATURE
========================================================= */

function LandingFeature({
  icon,
  title,
  text,
}) {
  return (
    <div className="landing-feature-card">

      <div className="landing-feature-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   STEP
========================================================= */

function LandingStep({
  number,
  title,
  text,
}) {
  return (
    <div className="landing-step">

      <div className="landing-step-number">
        {number}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  );
}

export default Landing;