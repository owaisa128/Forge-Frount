import React, { useCallback, useEffect, useState } from 'react';
import {
  HugeiconsIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Utensils,
} from '../components/ui/icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';

const initialMeal = {
  mealType: 'breakfast',
  foodName: '',
  quantity: '1 serving',
  calories: '',
  protein: '0',
  carbs: '0',
  fat: '0',
  notes: '',
};

export default function TrainerMealPlans() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [mealPlans, setMealPlans] = useState([]);
  const [form, setForm] = useState(initialMeal);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/memberships/assigned-clients');
      if (!Array.isArray(data?.clients)) throw new Error('Assigned clients were not returned.');
      setClients(data.clients);
      setSelectedClientId((current) =>
        data.clients.some((client) => client._id === current)
          ? current
          : data.clients[0]?._id || ''
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load your clients.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMealPlans = useCallback(async () => {
    if (!selectedClientId) {
      setMealPlans([]);
      return;
    }
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/meal-plans', {
        params: { clientId: selectedClientId },
      });
      if (!Array.isArray(data?.mealPlans)) throw new Error('Meal plans were not returned.');
      setMealPlans(data.mealPlans);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to load this client’s meal plan.'
      );
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadMealPlans();
  }, [loadMealPlans]);

  const addMeal = async (event) => {
    event.preventDefault();
    if (!selectedClientId) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        clientId: selectedClientId,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
      };
      const { data } = await api.post('/trainer-workspace/meal-plans', payload);
      if (!data?.mealPlan) throw new Error('The new meal was not returned.');
      setMealPlans((current) => [data.mealPlan, ...current]);
      setForm(initialMeal);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || requestError.message || 'Unable to add this meal.'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeMeal = async (mealPlan) => {
    setDeletingId(mealPlan._id);
    setError('');
    try {
      await api.delete(`/trainer-workspace/meal-plans/${mealPlan._id}`);
      setMealPlans((current) => current.filter(({ _id }) => _id !== mealPlan._id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove this meal.');
    } finally {
      setDeletingId('');
    }
  };

  const selectClass =
    'flex h-10 w-full rounded-md border border-forma-border-subtle bg-forma-bg-surface-raised px-3 py-2 text-sm text-forma-text-primary outline-none focus:border-forma-brand-ember';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-forma-border-subtle bg-forma-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className="border-forma-brand-ember/30 bg-forma-brand-ember/10 font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
          >
            <HugeiconsIcon aria-hidden="true" icon={Utensils} className="mr-1.5 h-3 w-3" />
            NUTRITION GUIDANCE
          </Badge>
          <h1 className="font-display text-3xl font-normal tracking-tight text-forma-text-primary sm:text-4xl">
            CLIENT MEAL RECOMMENDATIONS
          </h1>
          <p className="text-sm text-forma-text-secondary">
            Assign structured meal recommendations and macro targets that your athletes view on their dashboard.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-forma-status-error/30 bg-forma-status-error/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center gap-2 text-sm text-forma-text-secondary">
          <HugeiconsIcon aria-hidden="true" icon={Loader2} className="h-5 w-5 animate-spin text-forma-brand-ember" />
          Loading assigned clients…
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          type="clients"
          sentence="You need active assigned clients before you can formulate meal recommendations."
          actionLabel="View clients"
          to="/trainer/clients"
        />
      ) : (
        <>
          {/* Client Selection Selector Bar */}
          <Card className="border-forma-border-subtle bg-forma-bg-surface">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="select-athlete-meal" className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                Selected Athlete:
              </label>
              <select
                id="select-athlete-meal"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="max-w-md flex-1 rounded-md border border-forma-border-subtle bg-forma-bg-surface-raised px-3 py-2 text-sm text-forma-text-primary outline-none focus:border-forma-brand-ember"
              >
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Add Meal Form Card */}
          <Card id="meal-form" className="border-forma-border-subtle bg-forma-bg-surface">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-forma-text-primary">
                Add Meal Recommendation
              </CardTitle>
              <CardDescription className="text-xs text-forma-text-secondary">
                Configure macros and instructions for the selected athlete.
              </CardDescription>
            </CardHeader>

            <form onSubmit={addMeal}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Meal Type
                    </label>
                    <select
                      value={form.mealType}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, mealType: e.target.value }))
                      }
                      className={selectClass}
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Food / Recipe Name <span className="text-forma-brand-ember">*</span>
                    </label>
                    <Input
                      required
                      maxLength={120}
                      value={form.foodName}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, foodName: e.target.value }))
                      }
                      placeholder="e.g. Grilled Chicken Breast with Brown Rice"
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Serving Size
                    </label>
                    <Input
                      maxLength={80}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, quantity: e.target.value }))
                      }
                      placeholder="e.g. 200g chicken, 150g rice"
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Calories (kcal) <span className="text-forma-brand-ember">*</span>
                    </label>
                    <Input
                      required
                      type="number"
                      min="0"
                      max="10000"
                      step="0.1"
                      value={form.calories}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, calories: e.target.value }))
                      }
                      placeholder="550"
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Protein (g)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={form.protein}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, protein: e.target.value }))
                      }
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Carbs (g)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={form.carbs}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, carbs: e.target.value }))
                      }
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Fat (g)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.1"
                      value={form.fat}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, fat: e.target.value }))
                      }
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary focus:border-forma-brand-ember"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                    <label className="font-mono text-xs uppercase tracking-wider text-forma-text-secondary">
                      Preparation Guidance <span className="text-forma-text-muted">· Optional</span>
                    </label>
                    <Textarea
                      maxLength={500}
                      rows={2}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, notes: e.target.value }))
                      }
                      placeholder="Seasoning recommendations, cooking style, or timing window..."
                      className="border-forma-border-subtle bg-forma-bg-surface-raised text-sm text-forma-text-primary placeholder:text-forma-text-muted focus:border-forma-brand-ember"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-forma-border-subtle pt-4">
                <Button
                  type="submit"
                  disabled={saving || !selectedClientId}
                  className="bg-forma-brand-ember font-semibold text-forma-text-on-ember hover:bg-forma-brand-ember-hover"
                >
                  {saving ? (
                    <>
                      <HugeiconsIcon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                      Saving Meal…
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Plus} className="mr-2 h-4 w-4" />
                      Add to Athlete&apos;s Plan
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Current Recommendations List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-normal tracking-wide text-forma-text-primary">
                CURRENT RECOMMENDATIONS
              </h2>
              <span className="font-mono text-xs text-forma-text-muted">
                {mealPlans.length} {mealPlans.length === 1 ? 'item' : 'items'} on plan
              </span>
            </div>

            {mealPlans.length === 0 ? (
              <EmptyState
                type="meals"
                sentence="No meals recommended for this athlete yet. Use the form above to add their first nutrition targets."
                actionLabel="Create meal"
                onAction={() =>
                  document
                    .getElementById('meal-form')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              />
            ) : (
              <div className="space-y-3">
                {mealPlans.map((meal) => (
                  <Card
                    key={meal._id}
                    className="border-forma-border-subtle bg-forma-bg-surface transition-colors hover:border-forma-border-subtle/80"
                  >
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-forma-bg-surface-raised font-mono text-[10px] uppercase tracking-wider text-forma-brand-ember"
                          >
                            {meal.mealType}
                          </Badge>
                          <span className="font-mono text-xs text-forma-text-muted">
                            {meal.quantity}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-forma-text-primary">
                          {meal.foodName}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-forma-text-secondary">
                          <span className="font-semibold text-forma-brand-teal">
                            {meal.calories} kcal
                          </span>
                          <span>·</span>
                          <span>P: {meal.protein}g</span>
                          <span>·</span>
                          <span>C: {meal.carbs}g</span>
                          <span>·</span>
                          <span>F: {meal.fat}g</span>
                        </div>

                        {meal.notes && (
                          <p className="pt-1 text-xs text-forma-text-secondary">
                            {meal.notes}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMeal(meal)}
                        disabled={Boolean(deletingId)}
                        aria-label={`Remove ${meal.foodName}`}
                        className="h-8 w-8 text-forma-text-secondary hover:text-forma-status-error"
                      >
                        {deletingId === meal._id ? (
                          <HugeiconsIcon icon={Loader2} className="h-4 w-4 animate-spin" />
                        ) : (
                          <HugeiconsIcon icon={Trash2} className="h-4 w-4" />
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
