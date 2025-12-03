import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAnalytics, EVENTS } from '../analytics/AnalyticsProvider';

/**
 * A/B Testing Framework
 * Simple yet powerful for experimentation
 */

const ABTestContext = createContext(null);

// Active experiments configuration
const EXPERIMENTS = {
  'onboarding-flow': {
    name: 'Onboarding Flow Test',
    variants: ['control', 'streamlined'],
    weights: [0.5, 0.5], // 50/50 split
  },
  'task-card-layout': {
    name: 'Task Card Layout',
    variants: ['compact', 'detailed'],
    weights: [0.5, 0.5],
  },
  'dashboard-widgets': {
    name: 'Dashboard Widget Layout',
    variants: ['grid', 'masonry'],
    weights: [0.7, 0.3], // 70/30 split
  },
};

export function ABTestProvider({ children }) {
  const [assignments, setAssignments] = useState({});
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = () => {
    // Load from localStorage or assign new variants
    const stored = localStorage.getItem('ab-test-assignments');
    if (stored) {
      setAssignments(JSON.parse(stored));
    } else {
      assignVariants();
    }
  };

  const assignVariants = () => {
    const newAssignments = {};
    
    Object.keys(EXPERIMENTS).forEach(experimentId => {
      const experiment = EXPERIMENTS[experimentId];
      const variant = selectVariant(experiment.variants, experiment.weights);
      newAssignments[experimentId] = variant;
      
      // Track assignment
      trackEvent('experiment_assigned', {
        experiment_id: experimentId,
        experiment_name: experiment.name,
        variant,
      });
    });
    
    setAssignments(newAssignments);
    localStorage.setItem('ab-test-assignments', JSON.stringify(newAssignments));
  };

  const selectVariant = (variants, weights) => {
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < variants.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return variants[i];
      }
    }
    
    return variants[0]; // Fallback
  };

  const getVariant = (experimentId) => {
    return assignments[experimentId] || EXPERIMENTS[experimentId]?.variants[0] || 'control';
  };

  const trackConversion = (experimentId, metricName, value = 1) => {
    const variant = getVariant(experimentId);
    trackEvent('experiment_conversion', {
      experiment_id: experimentId,
      experiment_name: EXPERIMENTS[experimentId]?.name,
      variant,
      metric_name: metricName,
      value,
    });
  };

  const value = {
    getVariant,
    trackConversion,
    experiments: EXPERIMENTS,
    assignments,
  };

  return (
    <ABTestContext.Provider value={value}>
      {children}
    </ABTestContext.Provider>
  );
}

export function useABTest(experimentId) {
  const context = useContext(ABTestContext);
  if (!context) {
    throw new Error('useABTest must be used within ABTestProvider');
  }
  
  const variant = context.getVariant(experimentId);
  const trackConversion = (metricName, value) => 
    context.trackConversion(experimentId, metricName, value);
  
  return { variant, trackConversion };
}

// Component for variant-based rendering
export function ABTestVariant({ experiment, variant, children }) {
  const { variant: activeVariant } = useABTest(experiment);
  return activeVariant === variant ? children : null;
}

// HOC for A/B tested components
export function withABTest(experimentId) {
  return function (VariantComponents) {
    return function ABTestedComponent(props) {
      const { variant } = useABTest(experimentId);
      const Component = VariantComponents[variant] || VariantComponents.control;
      return Component ? <Component {...props} /> : null;
    };
  };
}

export default ABTestProvider;