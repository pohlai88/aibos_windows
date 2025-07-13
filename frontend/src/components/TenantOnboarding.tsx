import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { aibosPlatformService, Tenant } from '../services/aibos-platform.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { useUIState } from '../store/uiState.ts';
import { animation } from '../utils/designTokens.ts';

export interface TenantOnboardingProps {
  onTenantCreated?: (tenant: Tenant) => void;
  onSkip?: () => void;
  onComplete?: () => void;
}

interface TenantFormData {
  name: string;
  slug: string;
  description: string;
  website: string;
  contactEmail: string;
  planType: 'free' | 'basic' | 'pro' | 'enterprise';
}

interface ValidationState {
  name: boolean;
  slug: boolean;
  email: boolean;
}

const TenantOnboarding: React.FC<TenantOnboardingProps> = ({ 
  onTenantCreated, 
  onSkip,
  onComplete 
}) => {
  const { colorMode } = useUIState();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState<boolean>(false);
  
  // Form data
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    description: '',
    website: '',
    contactEmail: '',
    planType: 'free'
  });

  // Validation
  const [validation, setValidation] = useState<ValidationState>({
    name: true,
    slug: true,
    email: true
  });

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Memoized theme styles for consistent theming
  const themeStyles = useMemo(() => ({
    container: {
      backgroundColor: getColor('gray.50', colorMode),
    },
    card: {
      backgroundColor: getColor('white', colorMode),
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    input: {
      backgroundColor: getColor('white', colorMode),
      border: `1px solid ${getColor('gray.300', colorMode)}`,
      color: getColor('gray.900', colorMode),
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    },
    inputError: {
      backgroundColor: getColor('white', colorMode),
      border: `1px solid ${getColor('error.300', colorMode)}`,
      color: getColor('gray.900', colorMode),
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    },
    button: {
      primary: {
        backgroundColor: getColor('primary.600', colorMode),
        color: getColor('white', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
      secondary: {
        backgroundColor: getColor('gray.100', colorMode),
        color: getColor('gray.700', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
    },
    planCard: (isSelected: boolean) => ({
      border: `2px solid ${isSelected ? getColor('primary.500', colorMode) : getColor('gray.200', colorMode)}`,
      backgroundColor: isSelected ? getColor('primary.50', colorMode) : getColor('white', colorMode),
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    }),
  }), [colorMode, prefersReducedMotion]);

  // Update form data
  const updateFormData = useCallback((field: keyof TenantFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validation[field as keyof ValidationState] === false) {
      setValidation(prev => ({ ...prev, [field]: true }));
    }
  }, [validation]);

  // Generate slug from name
  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, []);

  // Check slug availability (placeholder for future implementation)
  const checkSlugAvailability = useCallback(async (slug: string): Promise<boolean> => {
    // In a real implementation, this would call the API
    // For now, we'll simulate a check
    setIsCheckingSlug(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    setIsCheckingSlug(false);
    return slug.length >= 2; // Basic validation
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newValidation: ValidationState = {
      name: formData.name.trim().length >= 2,
      slug: formData.slug.trim().length >= 2 && /^[a-z0-9-]+$/.test(formData.slug),
      email: !formData.contactEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)
    };

    setValidation(newValidation);
    return Object.values(newValidation).every(Boolean);
  }, [formData]);

  // Create tenant
  const createTenant = useCallback(async () => {
    if (!validateForm()) {
      setError('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await aibosPlatformService.createTenant(
        formData.name.trim(),
        formData.slug.trim(),
        formData.description.trim() || undefined
      );

      if (response.success && response.data) {
        // Update tenant with additional info
        const updateData: Partial<Tenant> = {};
        if (formData.website) updateData.website_url = formData.website;
        if (formData.contactEmail) updateData.contact_email = formData.contactEmail;
        if (formData.planType !== 'free') updateData.plan_type = formData.planType;

        // Note: In a real implementation, you'd update the tenant here
        // For now, we'll just proceed with the created tenant

        onTenantCreated?.(response.data);
        setStep(4); // Success step
      } else {
        setError(response.error || 'Failed to create tenant');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error creating tenant:', err);
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, onTenantCreated]);

  // Auto-generate slug when name changes (only if not manually edited)
  useEffect(() => {
    if (formData.name && !isSlugManuallyEdited) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.name) }));
    }
  }, [formData.name, isSlugManuallyEdited, generateSlug]);

  // Check slug availability when slug changes
  useEffect(() => {
    if (formData.slug && formData.slug.length >= 2) {
      checkSlugAvailability(formData.slug);
    }
  }, [formData.slug, checkSlugAvailability]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center">
            <div className="text-6xl mb-6">🚀</div>
            <h1 
              className="text-3xl font-bold mb-4"
              style={{ color: getColor('gray.900', colorMode) }}
            >
              Welcome to AI-BOS Platform
            </h1>
            <p 
              className="text-lg mb-8 max-w-2xl mx-auto"
              style={{ color: getColor('gray.600', colorMode) }}
            >
              Let's set up your workspace. You'll be able to install apps, collaborate with your team, 
              and manage your projects all in one place.
            </p>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                style={themeStyles.button.primary}
                className="px-8 py-3 rounded-lg hover:bg-opacity-80 transition-colors"
              >
                Get Started
              </button>
              {onSkip && (
                <div>
                  <button
                    type="button"
                    onClick={onSkip}
                    className="underline"
                    style={{ color: getColor('gray.500', colorMode) }}
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-2xl mx-auto">
            <h2 
              className="text-2xl font-bold mb-6"
              style={{ color: getColor('gray.900', colorMode) }}
            >
              Create Your Workspace
            </h2>
            
            <div className="space-y-6">
              {/* Workspace Name */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: getColor('gray.700', colorMode) }}
                >
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  style={!validation.name ? themeStyles.inputError : themeStyles.input}
                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your workspace name"
                  aria-describedby={!validation.name ? 'name-error' : undefined}
                />
                {!validation.name && (
                  <p 
                    id="name-error"
                    className="mt-1 text-sm"
                    style={{ color: getColor('error.600', colorMode) }}
                    aria-live="assertive"
                  >
                    Workspace name must be at least 2 characters
                  </p>
                )}
              </div>

              {/* Workspace Slug */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: getColor('gray.700', colorMode) }}
                >
                  Workspace URL *
                </label>
                <div className="flex">
                  <span 
                    className="inline-flex items-center px-3 rounded-l-lg border border-r-0 text-sm"
                    style={{ 
                      borderColor: getColor('gray.300', colorMode),
                      backgroundColor: getColor('gray.50', colorMode),
                      color: getColor('gray.500', colorMode)
                    }}
                  >
                    aibos.com/
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => {
                        updateFormData('slug', e.target.value);
                        setIsSlugManuallyEdited(true);
                      }}
                      style={!validation.slug ? themeStyles.inputError : themeStyles.input}
                      className="w-full px-4 py-2 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your-workspace"
                      aria-describedby={!validation.slug ? 'slug-error' : undefined}
                    />
                    {isCheckingSlug && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                </div>
                {!validation.slug && (
                  <p 
                    id="slug-error"
                    className="mt-1 text-sm"
                    style={{ color: getColor('error.600', colorMode) }}
                    aria-live="assertive"
                  >
                    URL must be at least 2 characters and contain only letters, numbers, and hyphens
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: getColor('gray.700', colorMode) }}
                >
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  style={themeStyles.input}
                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about your workspace (optional)"
                />
              </div>

              {/* Website */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: getColor('gray.700', colorMode) }}
                >
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateFormData('website', e.target.value)}
                  style={themeStyles.input}
                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-website.com"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: getColor('gray.700', colorMode) }}
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => updateFormData('contactEmail', e.target.value)}
                  style={!validation.email ? themeStyles.inputError : themeStyles.input}
                  className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contact@your-workspace.com"
                  aria-describedby={formData.contactEmail && !validation.email ? 'email-error' : undefined}
                />
                {formData.contactEmail && !validation.email && (
                  <p 
                    id="email-error"
                    className="mt-1 text-sm"
                    style={{ color: getColor('error.600', colorMode) }}
                    aria-live="assertive"
                  >
                    Please enter a valid email address
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2 hover:underline"
                style={{ color: getColor('gray.600', colorMode) }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={themeStyles.button.primary}
                className="px-6 py-2 rounded-lg hover:bg-opacity-80 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-2xl mx-auto">
            <h2 
              className="text-2xl font-bold mb-6"
              style={{ color: getColor('gray.900', colorMode) }}
            >
              Choose Your Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Free Plan */}
              <div 
                className="rounded-lg p-6 cursor-pointer transition-colors"
                style={themeStyles.planCard(formData.planType === 'free')}
                onClick={() => updateFormData('planType', 'free')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    updateFormData('planType', 'free');
                  }
                }}
                aria-label="Select Free plan"
              >
                <div className="text-center">
                  <h3 
                    className="text-xl font-semibold mb-2"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    Free
                  </h3>
                  <div 
                    className="text-3xl font-bold mb-4"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    $0<span 
                      className="text-lg"
                      style={{ color: getColor('gray.500', colorMode) }}
                    >
                      /month
                    </span>
                  </div>
                  <ul 
                    className="text-sm space-y-2"
                    style={{ color: getColor('gray.600', colorMode) }}
                  >
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      Up to 5 team members
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      1GB storage
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      Basic apps
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      Community support
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro Plan */}
              <div 
                className="rounded-lg p-6 cursor-pointer transition-colors"
                style={themeStyles.planCard(formData.planType === 'pro')}
                onClick={() => updateFormData('planType', 'pro')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    updateFormData('planType', 'pro');
                  }
                }}
                aria-label="Select Pro plan"
              >
                <div className="text-center">
                  <h3 
                    className="text-xl font-semibold mb-2"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    Pro
                  </h3>
                  <div 
                    className="text-3xl font-bold mb-4"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    $29<span 
                      className="text-lg"
                      style={{ color: getColor('gray.500', colorMode) }}
                    >
                      /month
                    </span>
                  </div>
                  <ul 
                    className="text-sm space-y-2"
                    style={{ color: getColor('gray.600', colorMode) }}
                  >
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      Up to 25 team members
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      10GB storage
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      All apps
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <span style={{ color: getColor('success.500', colorMode) }}>✓</span>
                      Advanced analytics
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div 
              className="rounded-lg p-4 mb-6"
              style={{ backgroundColor: getColor('gray.50', colorMode) }}
            >
              <h4 
                className="font-medium mb-2"
                style={{ color: getColor('gray.900', colorMode) }}
              >
                What's included in your plan:
              </h4>
              <ul 
                className="text-sm space-y-1"
                style={{ color: getColor('gray.600', colorMode) }}
              >
                {formData.planType === 'free' ? (
                  <>
                    <li>• Up to 5 team members</li>
                    <li>• 1GB storage space</li>
                    <li>• Access to basic apps</li>
                    <li>• Community support</li>
                  </>
                ) : (
                  <>
                    <li>• Up to 25 team members</li>
                    <li>• 10GB storage space</li>
                    <li>• Access to all apps</li>
                    <li>• Priority support</li>
                    <li>• Advanced analytics and insights</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 hover:underline"
                style={{ color: getColor('gray.600', colorMode) }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={createTenant}
                disabled={loading}
                style={loading ? themeStyles.button.secondary : themeStyles.button.primary}
                className="px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-6">🎉</div>
            <h1 
              className="text-3xl font-bold mb-4"
              style={{ color: getColor('gray.900', colorMode) }}
            >
              Welcome to {formData.name}!
            </h1>
            <p 
              className="text-lg mb-8"
              style={{ color: getColor('gray.600', colorMode) }}
            >
              Your workspace has been created successfully. You can now start installing apps, 
              inviting team members, and building your digital workspace.
            </p>
            
            <div 
              className="border rounded-lg p-6 mb-8"
              style={{ 
                backgroundColor: getColor('success.50', colorMode),
                borderColor: getColor('success.200', colorMode)
              }}
            >
              <h3 
                className="font-medium mb-2"
                style={{ color: getColor('success.900', colorMode) }}
              >
                Your workspace is ready at:
              </h3>
              <p 
                className="font-mono"
                style={{ color: getColor('success.700', colorMode) }}
              >
                aibos.com/{formData.slug}
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={onComplete}
                style={themeStyles.button.primary}
                className="px-8 py-3 rounded-lg hover:bg-opacity-80 transition-colors"
              >
                Go to Dashboard
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="underline"
                  style={{ color: getColor('gray.500', colorMode) }}
                >
                  Create another workspace
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={themeStyles.container}
    >
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between overflow-x-auto">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'text-white'
                      : 'text-gray-600'
                  }`}
                  style={{
                    backgroundColor: step >= stepNumber 
                      ? getColor('primary.600', colorMode) 
                      : getColor('gray.200', colorMode)
                  }}
                >
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div 
                    className="w-16 h-1 mx-2"
                    style={{
                      backgroundColor: step >= stepNumber + 1 
                        ? getColor('primary.600', colorMode) 
                        : getColor('gray.200', colorMode)
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div 
            className="flex justify-between text-xs mt-2"
            style={{ color: getColor('gray.500', colorMode) }}
          >
            <span>Welcome</span>
            <span>Workspace</span>
            <span>Plan</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mb-6 p-4 border rounded-lg flex items-center"
            style={{ 
              backgroundColor: getColor('error.50', colorMode),
              borderColor: getColor('error.200', colorMode)
            }}
          >
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5" 
                viewBox="0 0 20 20" 
                fill="currentColor"
                style={{ color: getColor('error.400', colorMode) }}
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p 
                className="text-sm"
                style={{ color: getColor('error.800', colorMode) }}
                aria-live="assertive"
              >
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-sm hover:underline"
              style={{ color: getColor('error.600', colorMode) }}
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Content */}
        <div 
          className="rounded-lg shadow-lg p-8"
          style={themeStyles.card}
        >
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default TenantOnboarding; 