import React, { useEffect, useRef, useState } from 'react';

const labels = {
  home: 'A person lifting a barbell during a workout',
  features: 'A barbell, meal plate, and progress trail connected in one record',
  signin: 'A person approaching a doorway to a training space',
  start: 'A person stretching before a workout',
  training: 'A barbell and a series of workout sets',
  nutrition: 'A plate divided into food groups beside a glass of water',
  progress: 'A rising trail marking workout progress',
  coaching: 'A trainer and client sharing a coaching conversation',
  plans: 'Three training paths with different levels of support',
  review: 'A checklist showing trainer application review steps',
  contact: 'An open envelope with a message for the FORGE team',
};

function IllustrationScene({ variant }) {
  if (variant === 'home') {
    return (
      <>
        <path className="forma-art__floor" d="M92 344h456" />
        <path className="forma-art__motion" d="M152 105c38-30 78-42 118-38M370 65c44 0 83 14 118 42" />
        <g className="forma-art__lift">
          <path className="forma-art__ember-stroke" d="M121 126h398" />
          <path className="forma-art__muted-stroke" d="M175 98v56m-13-45v34m303-45v56m13-45v34" />
          <circle className="forma-art__plate-fill" cx="162" cy="126" r="20" />
          <circle className="forma-art__plate-fill" cx="478" cy="126" r="20" />
        </g>
        <circle className="forma-art__teal-fill" cx="320" cy="166" r="22" />
        <path className="forma-art__body" d="M320 190l-20 66 40 22 17-62m-55-26-37-28-24 20m110 8 37-28 24 20" />
        <path className="forma-art__ember-stroke" d="M300 256l-36 44-42 22m138-44 35 46 45 13" />
        <circle className="forma-art__ember-fill" cx="220" cy="326" r="7" />
        <circle className="forma-art__ember-fill" cx="445" cy="317" r="7" />
        <path className="forma-art__teal-stroke" d="M101 370h76m286 0h76" />
      </>
    );
  }
  if (variant === 'training') {
    return (
      <>
        <path className="forma-art__floor" d="M88 313h464" />
        <path className="forma-art__ember-stroke" d="M112 200h416" />
        <path className="forma-art__muted-stroke" d="M160 159v82m-16-66v50m336-66v82m16-66v50" />
        <circle className="forma-art__plate-fill" cx="143" cy="200" r="23" />
        <circle className="forma-art__plate-fill" cx="497" cy="200" r="23" />
        <path className="forma-art__teal-stroke" d="M152 286c36-16 67-16 101 0s68 16 101 0 67-16 101 0" />
        <circle className="forma-art__teal-fill" cx="162" cy="282" r="7" />
        <circle className="forma-art__ember-fill" cx="320" cy="286" r="7" />
        <circle className="forma-art__teal-fill" cx="478" cy="282" r="7" />
        <text className="forma-art__label" x="143" y="346">SETS</text>
        <text className="forma-art__label" x="300" y="346">REPS</text>
        <text className="forma-art__label" x="450" y="346">LOAD</text>
      </>
    );
  }
  if (variant === 'features') {
    return (
      <>
        <path className="forma-art__floor" d="M92 310h456" />
        <path className="forma-art__teal-stroke" d="M177 196h122m94 0h72" />
        <path className="forma-art__ember-stroke" d="M101 196h132" />
        <path className="forma-art__muted-stroke" d="M120 166v60m-12-47v34m106-47v60m12-47v34" />
        <circle className="forma-art__plate-fill" cx="108" cy="196" r="20" />
        <circle className="forma-art__plate-fill" cx="228" cy="196" r="20" />
        <circle className="forma-art__plate" cx="346" cy="196" r="76" />
        <circle className="forma-art__plate-inner" cx="346" cy="196" r="58" />
        <path className="forma-art__ember-stroke" d="M346 138v58h-54m54 0h54" />
        <path className="forma-art__trail" d="M454 265c29-6 34-40 57-43s26-26 38-52" />
        <circle className="forma-art__teal-fill" cx="454" cy="265" r="9" />
        <circle className="forma-art__ember-fill" cx="549" cy="170" r="9" />
        <path className="forma-art__teal-stroke" d="M467 115h50" />
      </>
    );
  }
  if (variant === 'nutrition') {
    return (
      <>
        <circle className="forma-art__plate" cx="292" cy="218" r="132" />
        <circle className="forma-art__plate-inner" cx="292" cy="218" r="105" />
        <path className="forma-art__teal-stroke" d="M292 113v105h-99" />
        <path className="forma-art__ember-stroke" d="M292 218h105" />
        <path className="forma-art__muted-stroke" d="M292 218v104" />
        <path className="forma-art__utensil" d="M118 131v91m-14-91v28a14 14 0 0 0 28 0v-28m-14 47v91" />
        <path className="forma-art__glass" d="M464 144h62l-8 168h-46zM471 256h48" />
        <path className="forma-art__teal-stroke" d="M476 231h38" />
        <path className="forma-art__leaf" d="M476 118c9-25 29-34 51-32-3 23-19 38-42 39m-6 7 28-28" />
        <circle className="forma-art__ember-fill" cx="349" cy="171" r="7" />
        <circle className="forma-art__teal-fill" cx="235" cy="274" r="7" />
      </>
    );
  }
  if (variant === 'progress') {
    return (
      <>
        <path className="forma-art__trail" d="M104 320c70-8 77-75 145-65s80 25 123-27 79-47 164-116" />
        <path className="forma-art__muted-stroke" d="M104 350h440M112 350v-38m432 38v-38" />
        <circle className="forma-art__ember-fill" cx="249" cy="255" r="13" />
        <circle className="forma-art__teal-fill" cx="372" cy="228" r="13" />
        <circle className="forma-art__ember-fill" cx="536" cy="112" r="13" />
        <path className="forma-art__marker" d="m520 121 16-9 12 16" />
        <path className="forma-art__teal-stroke" d="M129 293h52m-30-14v28m-12-20v12m-12-8v4" />
        <circle className="forma-art__outline" cx="120" cy="320" r="10" />
        <text className="forma-art__label" x="102" y="385">YOUR TRAINING, OVER TIME</text>
      </>
    );
  }
  if (variant === 'coaching') {
    return (
      <>
        <path className="forma-art__ember-stroke" d="M90 318h460" />
        <circle className="forma-art__teal-fill" cx="197" cy="186" r="30" />
        <path className="forma-art__body" d="M140 305c5-53 24-80 57-80s52 27 57 80m126-119c0-17 13-30 30-30s30 13 30 30-13 30-30 30h-11l-17 15 3-19c-10-5-15-14-15-26z" />
        <circle className="forma-art__ember-fill" cx="382" cy="264" r="27" />
        <path className="forma-art__body" d="M337 318c4-37 18-56 45-56s41 19 45 56" />
        <path className="forma-art__bubble" d="M108 103h174c14 0 24 10 24 24v24c0 14-10 24-24 24h-89l-30 24 5-24h-60c-14 0-24-10-24-24v-24c0-14 10-24 24-24z" />
        <path className="forma-art__muted-stroke" d="M136 136h112m-112 17h74" />
      </>
    );
  }
  if (variant === 'signin') {
    return (
      <>
        <path className="forma-art__floor" d="M92 342h456" />
        <path className="forma-art__motion" d="M145 290c55-96 129-134 221-120s108 73 133 102" />
        <circle className="forma-art__teal-fill" cx="173" cy="264" r="32" />
        <path className="forma-art__body" d="M111 344c6-45 26-69 62-69s56 24 62 69" />
        <path className="forma-art__ember-stroke" d="M387 189v-53a69 69 0 0 1 138 0v53" />
        <rect className="forma-art__clipboard" x="367" y="185" width="178" height="139" rx="8" />
        <circle className="forma-art__outline" cx="456" cy="232" r="17" />
        <path className="forma-art__teal-stroke" d="M423 282c4-18 15-27 33-27s29 9 33 27" />
      </>
    );
  }
  if (variant === 'start') {
    return (
      <>
        <path className="forma-art__floor" d="M96 344h448" />
        <circle className="forma-art__ember-fill" cx="325" cy="143" r="26" />
        <path className="forma-art__body" d="m308 174-49 61 47 28 37-54m-43-34-72 23-38 45m116 80 38-60 39 36 49 18m-137-27-67 29-34 25" />
        <path className="forma-art__teal-stroke" d="M188 225h40m-20-20v40" />
        <path className="forma-art__motion" d="M389 111c26-20 53-26 83-20m-74 37c22-13 42-16 63-12" />
        <circle className="forma-art__teal-fill" cx="205" cy="225" r="6" />
        <circle className="forma-art__teal-fill" cx="469" cy="91" r="6" />
      </>
    );
  }
  if (variant === 'plans') {
    return (
      <>
        <path className="forma-art__path-one" d="M120 293c44 0 48-118 91-118h32" />
        <path className="forma-art__path-two" d="M120 293h245c39 0 40-67 81-67h63" />
        <path className="forma-art__path-three" d="M120 293h405" />
        <circle className="forma-art__ember-fill" cx="120" cy="293" r="15" />
        <circle className="forma-art__teal-fill" cx="243" cy="175" r="12" />
        <circle className="forma-art__ember-fill" cx="446" cy="226" r="12" />
        <circle className="forma-art__teal-fill" cx="525" cy="293" r="12" />
        <path className="forma-art__floor" d="M120 324h405" />
        <text className="forma-art__label" x="138" y="139">TRAIN</text>
        <text className="forma-art__label" x="359" y="197">TRACK</text>
        <text className="forma-art__label" x="437" y="344">COACH</text>
      </>
    );
  }
  if (variant === 'review') {
    return (
      <>
        <path className="forma-art__clipboard" d="M208 84h224v282H208zM270 70h100v29H270z" />
        <path className="forma-art__muted-stroke" d="M262 154h128m-128 67h128m-128 67h96" />
        <path className="forma-art__teal-stroke" d="m238 153 10 10 18-22m-28 78 10 10 18-22" />
        <circle className="forma-art__ember-fill" cx="246" cy="288" r="9" />
        <path className="forma-art__ember-stroke" d="M258 288h72" />
        <path className="forma-art__motion" d="M432 125c43 22 72 56 84 100" />
        <circle className="forma-art__teal-fill" cx="517" cy="234" r="7" />
      </>
    );
  }
  return (
    <>
      <path className="forma-art__envelope" d="M102 142h436v214H102z" />
      <path className="forma-art__muted-stroke" d="m105 151 215 147 214-147M106 350l143-111m285 111L390 239" />
      <path className="forma-art__teal-stroke" d="M320 298v-50c0-43 34-77 77-77h57" />
      <circle className="forma-art__ember-fill" cx="454" cy="171" r="12" />
      <path className="forma-art__motion" d="M470 128c22 8 38 23 48 43" />
    </>
  );
}

export default function PublicIllustration({ variant = 'training', className = '' }) {
  const illustrationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedVariant = Object.hasOwn(labels, variant) ? variant : 'training';

  useEffect(() => {
    const illustration = illustrationRef.current;
    if (!illustration) return undefined;
    let isInView = false;
    const updatePlaying = () => setIsPlaying(isInView && !document.hidden);
    if (typeof IntersectionObserver === 'undefined') {
      isInView = true;
      updatePlaying();
      document.addEventListener('visibilitychange', updatePlaying);
      return () => document.removeEventListener('visibilitychange', updatePlaying);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        updatePlaying();
      },
      { threshold: [0, 0.15] }
    );
    observer.observe(illustration);
    document.addEventListener('visibilitychange', updatePlaying);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updatePlaying);
    };
  }, []);

  return (
    <figure
      ref={illustrationRef}
      className={`forma-illustration forma-illustration--${selectedVariant} ${className}`.trim()}
      data-playing={isPlaying ? 'true' : 'false'}
      role="img"
      aria-label={labels[selectedVariant]}
    >
      <svg className="forma-illustration__art" viewBox="0 0 640 420" aria-hidden="true" focusable="false">
        <IllustrationScene variant={selectedVariant} />
      </svg>
    </figure>
  );
}
