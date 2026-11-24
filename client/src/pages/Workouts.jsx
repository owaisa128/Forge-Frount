import PageHeader from '../components/PageHeader';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import WorkoutImage from '../components/WorkoutImage';
import PlanFeaturesPanel from '../components/PlanFeaturesPanel';
import { HugeiconsIcon, Dumbbell, Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Layers, Tag, AlertCircle, Loader2, X } from "../components/ui/icons";
import EmptyState from '../components/EmptyState';
const CATEGORIES = ['All', 'Strength', 'Cardio', 'Flexibility', 'HIIT', 'Endurance', 'Other'];

function DeleteConfirmationModal({ workout, deleting, onConfirm, onCancel }) {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (workout) {
      const raf = requestAnimationFrame(() => setAnimationClass('is-open'));
      return () => cancelAnimationFrame(raf);
    }
  }, [workout]);

  const handleClose = () => {
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')
      ) || 150;
    setAnimationClass('is-closing');
    setTimeout(() => {
      setAnimationClass('');
      onCancel();
    }, closeMs);
  };

  if (!workout) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) handleClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-forma-bg-base/80 transition-opacity duration-150 ${animationClass === 'is-closing' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-workout-dialog-title"
        className={`t-modal bg-forma-bg-surface max-w-md w-full rounded-2xl p-6 border border-forma-brand-ember/30 relative ${animationClass}`.trim()}
      >
        <button
          onClick={handleClose}
          disabled={deleting}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-forma-text-secondary hover:text-forma-text-primary"
        >
          <HugeiconsIcon aria-hidden="true" icon={X} className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-xl bg-forma-status-error/10 border border-forma-status-error/20 text-forma-status-error flex items-center justify-center mb-4">
          <HugeiconsIcon aria-hidden="true" icon={Trash2} className="w-6 h-6" />
        </div>
        <h3 id="delete-workout-dialog-title" className="text-lg font-bold text-forma-text-primary uppercase">
          Delete Workout?
        </h3>
        <p className="text-xs text-forma-text-secondary mt-2">
          Are you sure you want to delete{' '}
          <span className="text-forma-text-primary font-bold">"{workout.title}"</span>? This action cannot be undone.
        </p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-forma-bg-surface hover:bg-forma-bg-surface border border-forma-brand-ember/20 text-xs font-semibold text-forma-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-forma-status-error hover:bg-forma-brand-ember text-xs font-bold text-forma-text-primary transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <HugeiconsIcon aria-hidden="true" icon={Loader2} className="w-4 h-4 animate-spin text-forma-text-primary" /> Deleting...
              </>
            ) : (
              'Yes, Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); // Modal for delete confirmation
  const [workoutToDelete, setWorkoutToDelete] = useState(null); const [deleting, setDeleting] = useState(false); const fetchWorkouts = async (searchTerm = search, categoryTerm = selectedCategory) => { setLoading(true); setError(''); try { const params = {}; if (searchTerm.trim()) params.search = searchTerm.trim(); if (categoryTerm && categoryTerm !== 'All') params.category = categoryTerm; const response = await api.get('/workouts', { params }); if (response.data && response.data.success) { setWorkouts(response.data.workouts || []); } } catch (err) { console.error('Fetch workouts failed:', err); setError(err.response?.data?.message || 'Failed to load workouts.'); } finally { setLoading(false); } }; useEffect(() => { fetchWorkouts(search, selectedCategory); }, [selectedCategory]); const handleSearchSubmit = (e) => { e.preventDefault(); fetchWorkouts(search, selectedCategory); }; const handleDelete = async () => { if (!workoutToDelete) return; setDeleting(true); try { await api.delete(`/workouts/${workoutToDelete._id}`); setWorkouts((prev) => prev.filter((w) => w._id !== workoutToDelete._id)); setWorkoutToDelete(null); } catch (err) { console.error('Delete workout failed:', err); alert(err.response?.data?.message || 'Failed to delete workout'); } finally { setDeleting(false); } }; return ( <div className="vf-theme-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"> {/* Header Banner */} <PageHeader as="div" className="vf-page-banner flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface p-6" > <div> <h1 className="text-3xl font-black text-forma-text-primary uppercase tracking-tight flex items-center gap-3"> <div className="p-2 rounded-xl bg-forma-brand-ember/10 border border-forma-brand-ember/30 text-forma-brand-ember"> <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="w-6 h-6" /> </div> MY <span className="text-[var(--primary)]">WORKOUTS</span> </h1> <p className="text-forma-text-secondary text-sm mt-1"> Track, manage, and inspect your custom workout routines. </p> </div> <Link to="/workouts/create" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-forma-brand-ember hover:opacity-90 text-forma-text-primary font-extrabold text-sm tracking-wider uppercase transition-all cursor-pointer shrink-0" > <HugeiconsIcon aria-hidden="true" icon={Plus} className="w-5 h-5" /> CREATE YOUR OWN WORKOUT </Link> </PageHeader> <PlanFeaturesPanel category="workouts" /> {/* Filter and Search Bar */} <div className="bg-forma-bg-surface rounded-2xl p-4 border border-forma-brand-ember/25 mb-8 "> <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-between" > {/* Search Input */} <div className="relative flex-1 w-full"> <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-forma-text-secondary"> <HugeiconsIcon aria-hidden="true" icon={Search} className="w-4 h-4" /> </div> <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description, tags, or exercise name..." className="w-full pl-10 pr-4 py-2.5 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-xl text-forma-text-primary placeholder:text-forma-text-secondary/60 text-sm focus:outline-none focus:border-forma-brand-ember focus:ring-1 focus:ring-forma-brand-ember transition-all" /> </div> {/* Category Dropdown */} <div className="flex items-center gap-2 w-full sm:w-auto"> <HugeiconsIcon aria-hidden="true" icon={Filter} className="w-4 h-4 text-forma-brand-ember shrink-0 hidden sm:block" /> <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full sm:w-44 px-3 py-2.5 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-xl text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember transition-all" > {CATEGORIES.map((cat) => ( <option key={cat} value={cat} className="bg-forma-bg-surface text-forma-text-primary" > {cat === 'All' ? 'All Categories' : cat} </option> ))} </select> <button type="submit" className="px-4 py-2.5 rounded-xl bg-forma-bg-surface hover:bg-forma-bg-surface text-forma-text-primary text-sm font-semibold border border-forma-brand-ember/30 hover:border-forma-brand-ember/60 transition-colors cursor-pointer shrink-0" > Search </button> </div> </form> </div> {/* Error Alert */} {error && ( <div className="mb-6 p-4 rounded-xl bg-forma-status-error/10 border border-forma-status-error/20 text-forma-status-error text-sm flex items-center gap-3"> <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="w-5 h-5 text-forma-status-error" /> <span>{error}</span> </div> )} {/* Content Grid / Loading / Empty State */} {loading ? ( <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-forma-text-secondary"> <HugeiconsIcon aria-hidden="true" icon={Loader2} className="w-8 h-8 animate-spin text-forma-brand-ember" /> <p className="text-sm font-semibold">Loading your workouts...</p> </div> ) : workouts.length === 0 ? ( <EmptyState type="workouts" sentence={ search || selectedCategory !== 'All' ? 'No workouts match your search. Reset filters to see your routines.' : 'Your training log is empty — log your first workout to start tracking progress.' } actionLabel={search || selectedCategory !== 'All' ? 'Reset filters' : 'Log a workout'} to={search || selectedCategory !== 'All' ? undefined : '/workout-tracker'} onAction={ search || selectedCategory !== 'All' ? () => { setSearch(''); setSelectedCategory('All'); fetchWorkouts('', 'All'); } : undefined } className="max-w-lg mx-auto my-12" /> ) : ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {workouts.map((workout) => { const hasCardImage = Boolean(workout.imageFileId); return ( <div key={workout._id} className="bg-forma-bg-surface rounded-2xl p-5 border border-forma-brand-ember/25 flex flex-col justify-between" > <div className="vf-workout-card-image relative -mx-6 -mt-6 mb-4 flex h-64 items-center justify-center overflow-hidden rounded-t-2xl bg-[var(--surface-2)]"> <WorkoutImage workoutId={workout._id} hasImage={hasCardImage} alt={`${workout.title} workout cover`} className="absolute inset-0 h-full w-full object-cover object-center" /> {hasCardImage && ( <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" /> )} {hasCardImage && ( <div className="absolute inset-x-4 bottom-4"> <div className="mb-3 flex items-center justify-between gap-2"> <span className="rounded-full border border-forma-status-error/40 bg-forma-bg-base/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-forma-status-error"> {workout.category || 'General'} </span> <span className="flex items-center gap-1 font-mono text-xs text-forma-text-primary "> <HugeiconsIcon aria-hidden="true" icon={Calendar} className="h-3 w-3 text-forma-status-error" /> {new Date(workout.createdAt).toLocaleDateString()} </span> </div> <h3 className="break-words text-lg font-bold uppercase text-forma-text-primary "> {workout.title} </h3> </div> )} </div> <div> {!hasCardImage && ( <> <div className="mb-3 flex items-center justify-between gap-2"> <span className="rounded-full border border-forma-brand-ember/30 bg-forma-brand-ember/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-forma-brand-ember-hover"> {workout.category || 'General'} </span> <span className="flex items-center gap-1 font-mono text-xs text-forma-text-secondary"> <HugeiconsIcon aria-hidden="true" icon={Calendar} className="h-3 w-3 text-forma-brand-ember" /> {new Date(workout.createdAt).toLocaleDateString()} </span> </div> <h3 className="break-words text-lg font-bold uppercase text-forma-text-primary"> {workout.title} </h3> </> )} {workout.isTrainerAssigned && ( <p className="text-xs font-semibold text-forma-brand-ember-hover mt-1"> Assigned by {workout.assignedByTrainer || 'your trainer'} - Read only </p> )} {/* Description Snippet */} {workout.description && ( <p className="text-xs text-forma-text-secondary mt-1.5 line-clamp-2"> {workout.description} </p> )} {/* Exercises Count Badge */} <div className="mt-4 pt-3 border-t border-forma-brand-ember/20 flex items-center justify-between text-xs text-forma-text-secondary"> <span className="flex items-center gap-1.5 font-semibold text-forma-text-primary"> <HugeiconsIcon aria-hidden="true" icon={Layers} className="w-3.5 h-3.5 text-forma-status-error" /> {workout.exercises ? workout.exercises.length : 0} Exercises </span> </div> {/* Tags */} {workout.tags && workout.tags.length > 0 && ( <div className="flex flex-wrap gap-1.5 mt-3"> {workout.tags.map((tag, idx) => ( <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-forma-bg-surface text-forma-status-error border border-forma-brand-ember/20 font-mono" > <HugeiconsIcon aria-hidden="true" icon={Tag} className="w-2.5 h-2.5 text-forma-brand-ember" /> {tag} </span> ))} </div> )} </div> {/* Action Buttons */} <div className="flex items-center gap-2 mt-6 pt-4 border-t border-forma-brand-ember/20"> <Link to={`/workouts/${workout._id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-forma-bg-surface hover:bg-forma-bg-surface border border-forma-brand-ember/30 text-xs font-semibold text-forma-text-primary transition-colors" > <HugeiconsIcon aria-hidden="true" icon={Eye} className="w-3.5 h-3.5 text-forma-brand-ember" /> View </Link> {!workout.isTrainerAssigned && ( <> <Link to={`/workouts/${workout._id}/edit`} className="p-2 rounded-xl bg-forma-bg-surface hover:bg-forma-bg-surface border border-forma-brand-ember/30 text-forma-status-error transition-colors" title="Edit Workout" > <HugeiconsIcon aria-hidden="true" icon={Edit} className="w-3.5 h-3.5 text-forma-status-error" /> </Link> <button onClick={() => setWorkoutToDelete(workout)} className="p-2 rounded-xl bg-forma-status-error/10 hover:bg-forma-status-error/20 border border-forma-status-error/20 text-forma-status-error transition-colors cursor-pointer" title="Delete Workout" > <HugeiconsIcon aria-hidden="true" icon={Trash2} className="w-3.5 h-3.5" /> </button> </> )} </div> </div> ); })} </div> )} {/* Delete Confirmation Modal */} <DeleteConfirmationModal workout={workoutToDelete} deleting={deleting} onConfirm={handleDelete} onCancel={() => setWorkoutToDelete(null)} /> </div> );
}
