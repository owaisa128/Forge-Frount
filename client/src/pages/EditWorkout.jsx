import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { HugeiconsIcon, Dumbbell, Plus, Trash2, ArrowLeft, AlertCircle, Loader2, Save } from "../components/ui/icons";
const CATEGORIES = ['Strength', 'Cardio', 'Flexibility', 'HIIT', 'Endurance', 'Other'];
export default function EditWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Strength');
  const [tagsInput, setTagsInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [removeVideo, setRemoveVideo] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageFileId, setImageFileId] = useState(null);
  const [imageFileName, setImageFileName] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl]
  );
  useEffect(() => {
    const fetchWorkout = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/workouts/${id}`);
        if (response.data && response.data.success) {
          const w = response.data.workout;
          if (w.isTrainerAssigned) {
            navigate(`/workouts/${id}`, { replace: true });
            return;
          }
          setTitle(w.title || '');
          setDescription(w.description || '');
          setCategory(w.category || 'General');
          setTagsInput(w.tags ? w.tags.join(', ') : '');
          setVideoUrl(w.videoUrl || '');
          setVideoFileName(w.videoFileName || '');
          setImageFileId(w.imageFileId || null);
          setImageFileName(w.imageFileName || '');
          setExercises(
            w.exercises && w.exercises.length > 0
              ? w.exercises
              : [{ name: '', sets: 3, reps: 10, weight: 0, notes: '' }]
          );
        }
      } catch (err) {
        console.error('Fetch workout details failed:', err);
        setError(err.response?.data?.message || 'Failed to load workout for editing.');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkout();
  }, [id, navigate]);
  useEffect(() => {
    if (!imageFileId) return undefined;
    let active = true;
    let objectUrl;
    api
      .get(`/workouts/${id}/image`, { responseType: 'blob' })
      .then(({ data }) => {
        if (active) {
          objectUrl = URL.createObjectURL(data);
          setCurrentImageUrl(objectUrl);
        }
      })
      .catch((requestError) => {
        console.error('Load workout image for editing failed:', requestError);
        if (active)
          setError(
            requestError.response?.data?.message || 'Unable to load the current workout image.'
          );
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, imageFileId]);
  const handleAddExercise = () => {
    setExercises((prev) => [...prev, { name: '', sets: 3, reps: 10, weight: 0, notes: '' }]);
  };
  const handleRemoveExercise = (index) => {
    if (exercises.length === 1) {
      setError('A workout must contain at least one exercise.');
      return;
    }
    setError('');
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };
  const handleExerciseChange = (index, field, value) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const handleVideoFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
      setError('Workout video must be 50 MiB or smaller.');
      event.target.value = '';
      setVideoFile(null);
      return;
    }
    setError('');
    setVideoFile(selectedFile);
    if (selectedFile) setRemoveVideo(false);
  };
  const handleImageFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError('Workout image must be 10 MiB or smaller.');
      event.target.value = '';
      setImageFile(null);
      setImagePreviewUrl('');
      return;
    }
    setError('');
    setImageFile(selectedFile);
    setImagePreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : '');
    if (selectedFile) setRemoveImage(false);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Workout title is required.');
      return;
    }
    if (exercises.length === 0) {
      setError('Please add at least one exercise.');
      return;
    }
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex.name.trim()) {
        setError(`Exercise #${i + 1} requires a name.`);
        return;
      }
      if (Number(ex.sets) < 1) {
        setError(`Exercise #${i + 1} sets must be at least 1.`);
        return;
      }
      if (Number(ex.reps) < 1) {
        setError(`Exercise #${i + 1} reps must be at least 1.`);
        return;
      }
      if (Number(ex.weight) < 0) {
        setError(`Exercise #${i + 1} weight cannot be negative.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tagsArray,
        videoUrl: videoUrl.trim(),
        removeVideo,
        removeImage,
        exercises: exercises.map((ex) => ({
          name: ex.name.trim(),
          sets: Number(ex.sets) || 1,
          reps: Number(ex.reps) || 1,
          weight: Number(ex.weight) || 0,
          notes: ex.notes ? ex.notes.trim() : '',
        })),
      };
      const requestPayload = videoFile || imageFile ? new FormData() : payload;
      if (requestPayload instanceof FormData) {
        Object.entries(payload).forEach(([key, value]) => {
          requestPayload.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
        });
        if (videoFile) requestPayload.append('video', videoFile);
        if (imageFile) requestPayload.append('image', imageFile);
      }
      const response = await api.put(
        `/workouts/${id}`,
        requestPayload,
        requestPayload instanceof FormData
          ? { headers: { 'Content-Type': 'multipart/form-data' } }
          : undefined
      );
      if (response.data && response.data.success) {
        navigate(`/workouts/${id}`);
      }
    } catch (err) {
      console.error('Update workout failed:', err);
      setError(err.response?.data?.message || 'Failed to update workout.');
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-forma-text-secondary">
        {' '}
        <HugeiconsIcon aria-hidden="true" icon={Loader2} className="w-8 h-8 animate-spin text-forma-brand-ember" />{' '}
        <p className="text-sm font-semibold">Loading workout data...</p>{' '}
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {' '}
      <Link
        to={`/workouts/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-forma-text-secondary hover:text-forma-brand-ember transition-colors mb-6"
      >
        {' '}
        <HugeiconsIcon aria-hidden="true" icon={ArrowLeft} className="w-4 h-4" /> Cancel & Back to Workout{' '}
      </Link>{' '}
      <div className="mb-8">
        {' '}
        <h1 className="text-3xl font-black text-forma-text-primary uppercase tracking-tight flex items-center gap-3">
          {' '}
          <div className="p-2 rounded-xl bg-forma-brand-ember/10 border border-forma-brand-ember/30 text-forma-brand-ember">
            {' '}
            <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="w-6 h-6" />{' '}
          </div>{' '}
          EDIT <span className="text-[var(--primary)]">WORKOUT</span>{' '}
        </h1>{' '}
        <p className="text-forma-text-secondary text-sm mt-1">
          {' '}
          Modify workout details, target weights, reps, or exercise lists.{' '}
        </p>{' '}
      </div>{' '}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-forma-status-error/10 border border-forma-status-error/20 text-forma-status-error text-sm flex items-center gap-3">
          {' '}
          <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="w-5 h-5 text-forma-status-error shrink-0" />{' '}
          <span>{error}</span>{' '}
        </div>
      )}{' '}
      <form onSubmit={handleSubmit} className="space-y-8">
        {' '}
        {/* General Info */}{' '}
        <div className="bg-forma-bg-surface rounded-2xl p-6 border border-forma-brand-ember/25 space-y-5 transition-all duration-200 hover:-translate-y-1 hover:border-forma-brand-ember/50 ">
          {' '}
          <h3 className="text-base font-bold text-forma-text-primary uppercase tracking-wide border-b border-forma-brand-ember/20 pb-3 flex items-center gap-2">
            {' '}
            <HugeiconsIcon aria-hidden="true" icon={Dumbbell} className="w-4 h-4 text-forma-brand-ember" /> General Information{' '}
          </h3>{' '}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {' '}
            <div className="md:col-span-2">
              {' '}
              <label className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider">
                {' '}
                Workout Title *{' '}
              </label>{' '}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-xl text-forma-text-primary placeholder:text-forma-text-secondary/60 focus:outline-none focus:border-forma-brand-ember focus:ring-1 focus:ring-forma-brand-ember text-sm transition-all"
              />{' '}
            </div>{' '}
            <div>
              {' '}
              <label className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider">
                {' '}
                Category{' '}
              </label>{' '}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-xl text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember transition-all"
              >
                {' '}
                {CATEGORIES.map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                    className="bg-forma-bg-surface text-forma-text-primary"
                  >
                    {' '}
                    {cat}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
            </div>{' '}
            <div>
              {' '}
              <label className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider">
                {' '}
                Tags (comma separated){' '}
              </label>{' '}
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="chest, arms, heavy"
                className="w-full px-4 py-3 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-xl text-forma-text-primary placeholder:text-forma-text-secondary/60 focus:outline-none focus:border-forma-brand-ember focus:ring-1 focus:ring-forma-brand-ember text-sm transition-all"
              />{' '}
            </div>{' '}
            <div className="md:col-span-2">
              {' '}
              <label className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider">
                {' '}
                Description (Optional){' '}
              </label>{' '}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-xl text-forma-text-primary placeholder:text-forma-text-secondary/60 focus:outline-none focus:border-forma-brand-ember focus:ring-1 focus:ring-forma-brand-ember text-sm resize-none transition-all"
              />{' '}
            </div>{' '}
            <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
              {' '}
              <div>
                {' '}
                <label
                  htmlFor="workout-image-file"
                  className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider"
                >
                  {' '}
                  Cover Image (Optional){' '}
                </label>{' '}
                <input
                  id="workout-image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="block w-full rounded-xl border border-forma-brand-ember/25 bg-forma-bg-surface px-3 py-2.5 text-sm text-forma-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-forma-brand-ember/15 file:px-3 file:py-2 file:text-xs file:font-bold file:text-forma-status-error"
                />{' '}
                <p className="mt-1.5 text-xs text-forma-text-secondary">
                  {' '}
                  {imageFile
                    ? `${imageFile.name} · ${(imageFile.size / (1024 * 1024)).toFixed(1)} MiB`
                    : imageFileName
                      ? `Current image: ${imageFileName}`
                      : 'JPEG, PNG or WebP · maximum 10 MiB. Shown on the workout card.'}{' '}
                </p>{' '}
                {imagePreviewUrl && !removeImage && (
                  <img
                    src={imagePreviewUrl}
                    alt="Workout cover preview"
                    className="mt-3 h-32 w-full rounded-xl object-cover"
                  />
                )}{' '}
                {!imageFile && imageFileId && !removeImage && currentImageUrl && (
                  <img
                    src={currentImageUrl}
                    alt="Current workout cover"
                    className="mt-3 h-32 w-full rounded-xl object-cover"
                  />
                )}{' '}
                {imageFileId && !imageFile && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-forma-text-secondary">
                    {' '}
                    <input
                      type="checkbox"
                      checked={removeImage}
                      onChange={(event) => setRemoveImage(event.target.checked)}
                      className="accent-forma-brand-ember"
                    />{' '}
                    Remove cover image{' '}
                  </label>
                )}{' '}
              </div>{' '}
              <div>
                {' '}
                <label
                  htmlFor="workout-video-url"
                  className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider"
                >
                  {' '}
                  Video URL (Optional){' '}
                </label>{' '}
                <input
                  id="workout-video-url"
                  type="url"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://example.com/workout-video.mp4"
                  className="w-full rounded-xl border border-forma-brand-ember/25 bg-forma-bg-surface px-4 py-3 text-sm text-forma-text-primary placeholder:text-forma-text-secondary/60 focus:border-forma-brand-ember focus:outline-none"
                />{' '}
                <p className="mt-1.5 text-xs text-forma-text-secondary">
                  {' '}
                  Add a YouTube link or a direct video link.{' '}
                </p>{' '}
              </div>{' '}
              <div>
                {' '}
                <label
                  htmlFor="workout-video-file"
                  className="block text-xs font-semibold text-forma-text-primary mb-1.5 uppercase tracking-wider"
                >
                  {' '}
                  Upload Video (Optional){' '}
                </label>{' '}
                <input
                  id="workout-video-file"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/ogg"
                  onChange={handleVideoFileChange}
                  className="block w-full rounded-xl border border-forma-brand-ember/25 bg-forma-bg-surface px-3 py-2.5 text-sm text-forma-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-forma-brand-ember/15 file:px-3 file:py-2 file:text-xs file:font-bold file:text-forma-status-error"
                />{' '}
                <p className="mt-1.5 text-xs text-forma-text-secondary">
                  {' '}
                  {videoFile
                    ? `${videoFile.name} · ${(videoFile.size / (1024 * 1024)).toFixed(1)} MiB`
                    : videoFileName
                      ? `Current upload: ${videoFileName}`
                      : 'MP4, WebM, MOV or OGG · maximum 50 MiB.'}{' '}
                </p>{' '}
                {videoFileName && !videoFile && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-forma-text-secondary">
                    {' '}
                    <input
                      type="checkbox"
                      checked={removeVideo}
                      onChange={(event) => setRemoveVideo(event.target.checked)}
                      className="accent-forma-brand-ember"
                    />{' '}
                    Remove uploaded video{videoUrl && ' and URL'}{' '}
                  </label>
                )}{' '}
              </div>{' '}
            </div>{' '}
          </div>{' '}
        </div>{' '}
        {/* Exercises */}{' '}
        <div className="bg-forma-bg-surface rounded-2xl p-6 border border-forma-brand-ember/25 space-y-6">
          {' '}
          <div className="flex items-center justify-between border-b border-forma-brand-ember/20 pb-3">
            {' '}
            <h3 className="text-base font-bold text-forma-text-primary uppercase tracking-wide flex items-center gap-2">
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={Plus} className="w-4 h-4 text-forma-brand-ember" /> Exercises List ({exercises.length}
              ){' '}
            </h3>{' '}
            <button
              type="button"
              onClick={handleAddExercise}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forma-brand-ember/10 hover:bg-forma-brand-ember/20 border border-forma-brand-ember/30 text-xs font-bold text-forma-brand-ember transition-all cursor-pointer"
            >
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={Plus} className="w-3.5 h-3.5" /> Add Exercise{' '}
            </button>{' '}
          </div>{' '}
          <div className="space-y-6">
            {' '}
            {exercises.map((ex, index) => (
              <div
                key={index}
                className="p-5 rounded-xl bg-forma-bg-surface border border-forma-brand-ember/20 space-y-4 relative"
              >
                {' '}
                <div className="flex items-center justify-between border-b border-forma-brand-ember/15 pb-2">
                  {' '}
                  <span className="text-xs font-extrabold text-forma-brand-ember-hover uppercase tracking-wider">
                    {' '}
                    Exercise #{index + 1}{' '}
                  </span>{' '}
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(index)}
                      className="text-xs text-forma-status-error hover:text-forma-status-error flex items-center gap-1 cursor-pointer"
                    >
                      {' '}
                      <HugeiconsIcon aria-hidden="true" icon={Trash2} className="w-3.5 h-3.5" /> Remove{' '}
                    </button>
                  )}{' '}
                </div>{' '}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {' '}
                  <div className="sm:col-span-2">
                    {' '}
                    <label className="block text-xs font-semibold text-forma-text-secondary mb-1">
                      {' '}
                      Exercise Name *{' '}
                    </label>{' '}
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-lg text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember"
                    />{' '}
                  </div>{' '}
                  <div>
                    {' '}
                    <label className="block text-xs font-semibold text-forma-text-secondary mb-1">
                      {' '}
                      Sets *{' '}
                    </label>{' '}
                    <input
                      type="number"
                      min={1}
                      value={ex.sets}
                      onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-lg text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember"
                    />{' '}
                  </div>{' '}
                  <div>
                    {' '}
                    <label className="block text-xs font-semibold text-forma-text-secondary mb-1">
                      {' '}
                      Reps *{' '}
                    </label>{' '}
                    <input
                      type="number"
                      min={1}
                      value={ex.reps}
                      onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-lg text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember"
                    />{' '}
                  </div>{' '}
                  <div>
                    {' '}
                    <label className="block text-xs font-semibold text-forma-text-secondary mb-1">
                      {' '}
                      Weight (kg / lbs){' '}
                    </label>{' '}
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={ex.weight}
                      onChange={(e) => handleExerciseChange(index, 'weight', e.target.value)}
                      className="w-full px-3 py-2 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-lg text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember"
                    />{' '}
                  </div>{' '}
                  <div className="sm:col-span-2 lg:col-span-3">
                    {' '}
                    <label className="block text-xs font-semibold text-forma-text-secondary mb-1">
                      {' '}
                      Notes (Optional){' '}
                    </label>{' '}
                    <input
                      type="text"
                      value={ex.notes || ''}
                      onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 bg-forma-bg-surface border border-forma-brand-ember/25 rounded-lg text-forma-text-primary text-sm focus:outline-none focus:border-forma-brand-ember"
                    />{' '}
                  </div>{' '}
                </div>{' '}
              </div>
            ))}{' '}
          </div>{' '}
          <button
            type="button"
            onClick={handleAddExercise}
            className="w-full py-3 border border-dashed border-forma-brand-ember/30 hover:border-forma-brand-ember/60 rounded-xl text-xs font-bold text-forma-brand-ember hover:bg-forma-brand-ember/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {' '}
            <HugeiconsIcon aria-hidden="true" icon={Plus} className="w-4 h-4" /> Add Another Exercise{' '}
          </button>{' '}
        </div>{' '}
        {/* Submit */}{' '}
        <div className="flex items-center justify-end gap-4">
          {' '}
          <Link
            to={`/workouts/${id}`}
            className="px-5 py-3 rounded-xl bg-forma-bg-surface hover:bg-forma-bg-surface border border-forma-brand-ember/20 text-xs font-semibold text-forma-text-primary transition-colors"
          >
            {' '}
            Cancel{' '}
          </Link>{' '}
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-forma-brand-ember hover:opacity-90 text-forma-text-primary font-extrabold text-sm tracking-wide uppercase transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {' '}
            {submitting ? (
              <>
                {' '}
                <HugeiconsIcon aria-hidden="true" icon={Loader2} className="w-4 h-4 animate-spin text-forma-text-primary" /> Updating
                Workout...{' '}
              </>
            ) : (
              <>
                {' '}
                <HugeiconsIcon aria-hidden="true" icon={Save} className="w-4 h-4" /> Update Workout{' '}
              </>
            )}{' '}
          </button>{' '}
        </div>{' '}
      </form>{' '}
    </div>
  );
}
