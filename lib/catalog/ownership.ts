/**
 * Explicit Field Ownership Model
 * Defines how store values resolve against source values.
 */

export interface FieldState<T> {
  sourceValue: T | null;
  storeValue: T | null;
  isOverridden: boolean;
  effectiveValue: T | null;
  overriddenAt?: string;
  overriddenBy?: string;
}

export class FieldOwnershipResolver {
  /**
   * Resolves the effective value for any overridable field.
   * Rule: If an override is active and manual value is present, manual value wins.
   * Otherwise, fallback to the current source value.
   */
  public static resolve<T>(sourceValue: T | null, overrideValue: T | null, isOverridden: boolean): FieldState<T> {
    const effective = isOverridden && overrideValue !== null && overrideValue !== undefined
      ? overrideValue
      : sourceValue;

    return {
      sourceValue,
      storeValue: overrideValue,
      isOverridden,
      effectiveValue: effective,
    };
  }

  /**
   * Simulates an import update on an overridable field.
   * If overridden, the sourceValue updates, but the effectiveValue remains protected.
   */
  public static applySourceUpdate<T>(params: {
    newSourceValue: T;
    currentOverrideValue: T | null;
    isOverridden: boolean;
  }): {
    updatedSourceValue: T;
    effectiveValue: T | null;
    wasOverrideProtected: boolean;
  } {
    const { newSourceValue, currentOverrideValue, isOverridden } = params;

    if (isOverridden && currentOverrideValue !== null && currentOverrideValue !== undefined) {
      return {
        updatedSourceValue: newSourceValue,
        effectiveValue: currentOverrideValue,
        wasOverrideProtected: true,
      };
    }

    return {
      updatedSourceValue: newSourceValue,
      effectiveValue: newSourceValue,
      wasOverrideProtected: false,
    };
  }
}
