import React from 'react';

export default function PublicFeatureCard({
  as: Element = 'article',
  title,
  description,
  eyebrow,
  eyebrowClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  className = '',
  ...props
}) {
  return (
    <Element className={`forge-public-feature-card ${className}`.trim()} {...props}>
      {eyebrow && (
        <p className={`forge-public-feature-card__eyebrow ${eyebrowClassName}`.trim()}>
          {eyebrow}
        </p>
      )}
      <h3 className={`forge-public-feature-card__title ${titleClassName}`.trim()}>
        {title}
      </h3>
      <p className={`forge-public-feature-card__description ${descriptionClassName}`.trim()}>
        {description}
      </p>
    </Element>
  );
}
