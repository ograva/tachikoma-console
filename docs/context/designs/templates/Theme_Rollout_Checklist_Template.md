# Theme Rollout Checklist Template

## Rollout Metadata

- Rollout ID:
- Phase:
- Owner:
- Date:

## Phase Scope

- [ ] Shell and navigation
- [ ] Authentication
- [ ] Dashboard
- [ ] Chat
- [ ] Profiles
- [ ] Profile

## Token Adoption Checklist

- [ ] All updated components use canonical token variables.
- [ ] No hard-coded non-semantic color values remain in changed files.
- [ ] Role colors map consistently across message and status elements.
- [ ] Focus ring token is consistently applied.

## Interaction Consistency Checklist

- [ ] Primary action hierarchy is consistent.
- [ ] Secondary and destructive actions are visually distinct.
- [ ] Loading and error states follow shared pattern.
- [ ] Motion timings match theme contract.

## Mobile and Accessibility Checklist

- [ ] Controls maintain 44x44 minimum touch target size.
- [ ] No clipping or unreachable controls on 375px width.
- [ ] Typography remains readable without zoom.
- [ ] Screen reader and keyboard behavior verified.

## Testability Checklist

- [ ] New or changed controls include data-test-id.
- [ ] Existing test selectors remain stable or are migrated.
- [ ] Regression suite references updated selectors.

## Completion Gate

- [ ] All checks complete.
- [ ] QA sign-off complete.
- [ ] Design sign-off complete.
- [ ] Ready for merge recommendation.
