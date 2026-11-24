import React from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon, ArrowLeft, Dumbbell } from "../components/ui/icons";
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
      {' '}
      <div className="mb-6 rounded-2xl border border-forma-status-error/25 bg-forma-status-error/10 p-4 text-forma-status-error">
        {' '}
        <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="h-8 w-8" />{' '}
      </div>{' '}
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-forma-status-error">
        {' '}
        404 · Page not found{' '}
      </p>{' '}
      <h1 className="mt-3 text-4xl font-black tracking-tight text-forma-text-primary sm:text-6xl">
        {' '}
        This path doesn’t exist.{' '}
      </h1>{' '}
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-forma-text-secondary">
        {' '}
        The page may have moved, or the address may be incorrect. Head back and keep your training
        on track.{' '}
      </p>{' '}
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-forma-brand-ember px-5 py-3 text-sm font-bold text-forma-text-primary transition "
      >
        {' '}
        <HugeiconsIcon aria-hidden="true" icon={ArrowLeft} className="h-4 w-4" /> Back to FORGE{' '}
      </Link>{' '}
    </div>
  );
}
