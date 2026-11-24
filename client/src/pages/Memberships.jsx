import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HugeiconsIcon,
  AlertCircle,
  Check,
  Loader2,
  UserRound,
} from "../components/ui/icons";
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Button, Card } from '../components/ui';
import PricingPlansSkeleton from '../components/PricingPlansSkeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { getMembershipRank } from '../utils/membershipAccess';

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;

const COMPARISON_FEATURES = [
  {
    key: 'trainer',
    label: 'Assigned certified trainer',
    matches: /trainer/i,
  },
  {
    key: 'trainerMessages',
    label: 'Direct trainer messages',
    matches: /direct messages|trainer messages/i,
  },
  {
    key: 'zoomClasses',
    label: 'Live classes',
    matches: /live.*classes|zoom classes/i,
  },
  {
    key: 'aiChat',
    label: '24/7 AI fitness assistant',
    matches: /ai.*assistant|ai coaching/i,
  },
  {
    key: 'liveTracking',
    label: 'Live GPS workout tracking',
    matches: /live gps|gps.*tracking/i,
  },
  {
    key: 'videoTechniqueReview',
    label: '1-on-1 video technique review',
    matches: /video.*technique review|technique review/i,
  },
];

const planIncludesFeature = (plan, comparisonFeature) => {
  const featureKeys = Array.isArray(plan.featureKeys) ? plan.featureKeys : [];
  const features = Array.isArray(plan.features) ? plan.features.join(' ') : '';

  return (
    featureKeys.includes(comparisonFeature.key) ||
    (comparisonFeature.key === 'trainer' && plan.trainerIncluded === true) ||
    comparisonFeature.matches.test(features)
  );
};

export default function Memberships({ embedded = false, onClose }) {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(user?.membership || null);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMembershipData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const plansResponse = await api.get('/memberships/plans');
      if (!Array.isArray(plansResponse.data?.plans)) {
        throw new Error('Membership plans response was invalid.');
      }
      setPlans(plansResponse.data.plans);
      if (user) {
        const currentResponse = await api.get('/memberships/current');
        setMembership(currentResponse.data.membership || null);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || requestError.message || 'Unable to load plans.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMembershipData();
  }, [loadMembershipData]);

  const switchToFree = async () => {
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/memberships/purchase', {
        planSlug: 'free',
        billingInterval: 'monthly',
        paymentMethod: 'free',
      });
      setMembership(data.membership);
      updateUser((currentUser) => ({ ...currentUser, membership: data.membership }));
      setNotice(data.message || 'You are now on the Free plan.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to switch plans.');
    } finally {
      setProcessing(false);
    }
  };

  const handleChoosePlan = (plan) => {
    const annualAvailable =
      plan.annualPrice != null && Number.isFinite(Number(plan.annualPrice));
    const interval = annualBilling && annualAvailable ? 'annual' : 'monthly';
    if (!user) {
      navigate('/login', {
        state: {
          from: { pathname: '/checkout', search: `?plan=${plan.slug}&interval=${interval}` },
        },
      });
      return;
    }
    if (user.role !== 'user') {
      setError('Membership plans can only be purchased by client accounts.');
      return;
    }
    setNotice('');
    if (plan.slug === 'free') {
      switchToFree();
      return;
    }
    onClose?.();
    navigate(`/checkout?plan=${plan.slug}&interval=${interval}`);
  };

  const activePlanSlug = membership?.planSlug || 'free';
  const currentTrainer = membership?.assignedTrainer;
  const paidActive =
    getMembershipRank(membership) >= 1 &&
    membership?.endsAt &&
    new Date(membership.endsAt) > new Date();

  return (
    <div className={`forma-public forma-pricing${embedded ? ' forma-pricing--dialog' : ''}`}>
      <header className="forma-public__container forma-public__section forma-pricing__intro">
        <div>
          <h1 className="forma-public__title">See what’s in every membership.</h1>
          <p className="forma-public__lead">
            Pick the level of coaching that fits your training. Compare trainer
            access, classes and tracking.
          </p>
        </div>
        <div className="forma-pricing__billing" role="group" aria-label="Billing interval">
          <button
            type="button"
            aria-pressed={!annualBilling}
            onClick={() => setAnnualBilling(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={annualBilling}
            onClick={() => setAnnualBilling(true)}
          >
            Annual billing
          </button>
        </div>
      </header>

      <section className="forma-public__container forma-pricing__content">
        {user && (
          <div className="forma-pricing__membership" role="status">
            <span>Your current plan</span>
            <strong>{membership?.planName || 'Free Starter'}</strong>
            {membership?.endsAt && (
              <span>Ends {new Date(membership.endsAt).toLocaleDateString()}</span>
            )}
            {currentTrainer && (
              <span>
                Trainer: {currentTrainer.name}
                {currentTrainer.trainerProfile?.specialization
                  ? ` · ${currentTrainer.trainerProfile.specialization}`
                  : ''}
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="forma-pricing__message is-error" role="alert">
            <HugeiconsIcon icon={AlertCircle} aria-hidden="true" />
            {error}
          </p>
        )}
        {notice && (
          <p className="forma-pricing__message is-success" role="status">
            {notice}
          </p>
        )}
        {user?.role === 'user' && paidActive && !currentTrainer && (
          <p className="forma-pricing__message is-note">
            <HugeiconsIcon icon={UserRound} aria-hidden="true" />
            Your plan includes a trainer, but you have not chosen one yet.
            <Link to="/my-trainer" onClick={onClose}>Choose your trainer</Link>
          </p>
        )}

        <h2 className="sr-only">Membership options</h2>
        {loading ? (
          <PricingPlansSkeleton />
        ) : plans.length === 0 ? (
          <div className="forma-pricing__empty">
            <p>Membership plans are temporarily unavailable.</p>
            <Button type="button" variant="secondary" onClick={loadMembershipData}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="forma-pricing__grid" id="plans">
            {plans.map((plan) => {
              const annualAvailable =
                plan.annualPrice != null && Number.isFinite(Number(plan.annualPrice));
              const usingAnnualPrice = annualBilling && annualAvailable && plan.slug !== 'free';
              const unitPrice = usingAnnualPrice ? plan.annualPrice : plan.monthlyPrice;
              const isCurrentPlan = Boolean(user) && activePlanSlug === plan.slug;
              const isPopular = Boolean(plan.highlight);
              const features = Array.isArray(plan.features) ? plan.features : [];
              const visibleFeatures = features.slice(0, 5);
              const remainingFeatures = features.slice(5);
              const cardClasses = [
                'forma-pricing__card',
                isCurrentPlan && 'is-current',
                isPopular && 'is-popular',
              ].filter(Boolean).join(' ');

              return (
                <Card
                  key={plan.slug}
                  className={cardClasses}
                >
                  {isPopular && (
                    <span className="forma-pricing__popular">Most popular</span>
                  )}
                  <div className="forma-pricing__plan-heading">
                    <h3>{plan.name}</h3>
                    {isCurrentPlan && <span className="forma-pricing__current">Your plan</span>}
                  </div>
                  <p className="forma-pricing__description">{plan.description}</p>
                  <div className="forma-pricing__price">
                    <strong>{money(unitPrice)}</strong>
                    <span>{plan.slug === 'free' ? 'forever' : 'per month'}</span>
                  </div>
                  {usingAnnualPrice && (
                    <p className="forma-pricing__billing-note">
                      {money(unitPrice * 12)} billed yearly
                    </p>
                  )}
                  {annualBilling && plan.slug !== 'free' && !annualAvailable && (
                    <p className="forma-pricing__billing-note">
                      Annual billing is not available for this plan; monthly rate shown.
                    </p>
                  )}
                  <ul className="forma-pricing__features">
                    {visibleFeatures.map((feature) => (
                      <li key={feature}>
                        <HugeiconsIcon icon={Check} aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {remainingFeatures.length > 0 && (
                    <details className="forma-pricing__more-features">
                      <summary>Show {remainingFeatures.length} more</summary>
                      <ul className="forma-pricing__features">
                        {remainingFeatures.map((feature) => (
                          <li key={feature}>
                            <HugeiconsIcon icon={Check} aria-hidden="true" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <Button
                    type="button"
                    variant={isPopular ? 'primary' : 'secondary'}
                    className="forma-pricing__choose"
                    onClick={() => handleChoosePlan(plan)}
                    disabled={processing || isCurrentPlan}
                  >
                    {processing && plan.slug === 'free' ? (
                      <HugeiconsIcon icon={Loader2} className="animate-spin" aria-label="Switching plan" />
                    ) : isCurrentPlan ? (
                      'Current plan'
                    ) : plan.slug === 'free' ? (
                      'Switch to Free'
                    ) : (
                      'Choose plan'
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <section className="forma-pricing__cta" aria-labelledby="pricing-help-title">
          <div className="forma-pricing__cta-inner">
            <h2 id="pricing-help-title">Not sure which plan fits?</h2>
            <p>
              Start with Free Starter. Choose trainer-led coaching when you want more support.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="forma-pricing__cta-link"
                >
                  Compare plans in detail
                </Button>
              </DialogTrigger>
              <DialogContent className="grid-rows-[auto_minmax(0,1fr)] max-h-[90vh] max-w-5xl gap-0 overflow-hidden border border-forma-border-subtle bg-forma-bg-base p-0 text-forma-text-primary sm:max-w-5xl">
                <DialogHeader className="border-b border-forma-border-subtle px-5 py-5 pr-14 sm:px-7">
                  <DialogTitle className="forma-pricing__compare-title">
                    Compare plans
                  </DialogTitle>
                </DialogHeader>
                {loading ? (
                  <div className="forma-pricing__compare-state" role="status">
                    <HugeiconsIcon icon={Loader2} className="animate-spin" aria-hidden="true" />
                    Loading plan comparison...
                  </div>
                ) : plans.length === 0 ? (
                  <div className="forma-pricing__compare-state">
                    <p>Membership comparisons are temporarily unavailable.</p>
                    <Button type="button" variant="secondary" onClick={loadMembershipData}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <div
                    className="forma-pricing__compare-scroll"
                    role="region"
                    aria-label="Plan feature comparison"
                    tabIndex={0}
                  >
                    <table className="forma-pricing__compare-table">
                      <caption className="sr-only">
                        Features included with each FORGE membership plan
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">
                            <span className="sr-only">Feature</span>
                          </th>
                          {plans.map((plan) => (
                            <th scope="col" key={plan.slug}>
                              {plan.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_FEATURES.map((comparisonFeature) => (
                          <tr key={comparisonFeature.key}>
                            <th scope="row">{comparisonFeature.label}</th>
                            {plans.map((plan) => {
                              const included = planIncludesFeature(plan, comparisonFeature);

                              return (
                                <td key={`${plan.slug}-${comparisonFeature.key}`}>
                                  {included ? (
                                    <>
                                      <HugeiconsIcon icon={Check} aria-hidden="true" />
                                      <span className="sr-only">Included</span>
                                    </>
                                  ) : (
                                    <>
                                      <span aria-hidden="true">—</span>
                                      <span className="sr-only">Not included</span>
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <aside className="forma-pricing__demo" aria-label="About checkout">
          <p className="forma-pricing__demo-label">
            <strong>About checkout</strong>
          </p>
          <p>
            Payment is simulated for this project. Full card numbers are never sent to or stored
            by the server, and no real money is charged.
          </p>
        </aside>
      </section>
    </div>
  );
}
