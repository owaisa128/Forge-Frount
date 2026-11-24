const images = {
  homeHero: {
    src: '/images/home-hero.jfif',
    alt: 'Athlete performing a barbell squat in a gym.',
  },
  coaching: {
    src: '/images/coaching-sessions.jfif',
    alt: 'Trainer and client reviewing a workout plan together.',
  },
  workoutTracking: {
    src: '/images/workout-traking.jfif',
    alt: 'Athlete logging a workout on a phone in a gym.',
  },
  nutrition: {
    src: '/images/neturation-logging.jfif',
    alt: 'Athlete reviewing a meal and nutrition log while eating.',
  },
  progressAnalytics: {
    src: '/images/Progress-analytics.jfif',
    alt: 'Athlete checking training data on a phone after a workout.',
  },
  progressPhotos: {
    src: '/images/Progress%20photo.jfif',
    alt: 'Athlete taking a progress photo in a gym mirror.',
  },
  hydration: {
    src: '/images/Hydration.jfif',
    alt: 'Water bottle and gym bag beside workout equipment.',
  },
  gpsRunning: {
    src: '/images/GPS%20running.jfif',
    alt: 'Runner tracking an outdoor run with a phone.',
  },
  fitnessChat: {
    src: '/images/Fitness%20chat.jfif',
    alt: 'Person reading a fitness conversation on a smartphone.',
  },
  trainerMessaging: {
    src: '/images/Trainer%20messaging.jfif',
    alt: 'Trainer messaging a client from a laptop.',
  },
  trainerClasses: {
    src: '/images/Trainer%20classes.jfif',
    alt: 'Trainer coaching a client during a strength class.',
  },
  membership: {
    src: '/images/Membershipplans.jfif',
    alt: 'Athlete preparing for a workout beside a gym bag.',
  },
};

export default function FeatureImage({ name, className = '', loading = 'lazy' }) {
  const image = images[name];
  if (!image) throw new RangeError(`Unknown feature image: ${name}`);

  return (
    <img
      className={`forma-feature-image ${className}`.trim()}
      src={image.src}
      alt={image.alt}
      loading={loading}
      decoding="async"
    />
  );
}
