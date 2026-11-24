import React from "react";
import PublicFeatureCard from "./PublicFeatureCard";

const highlights = [
  {
    title: "FORGE assistant",
    description:
      "Built to help with workout ideas, exercise technique, nutrition and recovery.",
    label: "AI TRAINING SUPPORT",
  },
  {
    title: "Strength programs",
    description:
      "Progressive lifting plans built around your training numbers.",
  },
  {
    title: "Live coaching",
    description: "Message your trainer and book scheduled classes.",
  },
  {
    title: "Progress tracking",
    description: "Keep your training history and progress in view.",
  },
];

export default function FeatureHighlights() {
  return (
    <section
      className="forge-landing__highlights"
      aria-labelledby="feature-highlights-title"
    >
      <div className="forge-landing__container">
        <header className="forge-landing__section-heading">
          <p className="forge-landing__eyebrow">
            <span aria-hidden="true" />
            FEATURE HIGHLIGHTS
          </p>
          <h2 id="feature-highlights-title">
            A closer look at your training tools
          </h2>
        </header>
        <div className="forge-landing__cards forge-landing__highlight-cards">
          {highlights.map(({ title, description, label }) => (
            <PublicFeatureCard
              className="forge-landing__card forge-landing__highlight-card"
              key={title}
              title={title}
              description={description}
              eyebrow={label}
              eyebrowClassName="forge-landing__highlight-label"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
