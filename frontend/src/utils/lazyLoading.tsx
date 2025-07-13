/** @jsxImportSource react */
import React, { 
  Suspense, 
  ComponentType, 
  ReactNode,
  JSX
} from 'react';

type StrictComponentProps<T> = 
  T extends ComponentType<infer P> 
    ? JSX.LibraryManagedAttributes<T, P>
    : never;

interface LazyLoadingProps {
  loader: () => Promise<{ default: ComponentType<unknown> }>;
  loadingFallback?: ReactNode;
  componentProps?: Record<string, unknown>;
}

export function LazyLoading({
  loader,
  loadingFallback = null,
  componentProps
}: LazyLoadingProps): JSX.Element {
  const LazyComponent = React.useMemo(
    () => React.lazy(loader) as ComponentType<unknown>,
    [loader.toString()]
  );

  return (
    <Suspense fallback={loadingFallback}>
      {React.createElement(
        LazyComponent,
        componentProps
      )}
    </Suspense>
  );
}

// Preload helper (optional)
export const preloadLazyComponent = (
  loader: () => Promise<{ default: ComponentType<unknown> }>
) => loader();