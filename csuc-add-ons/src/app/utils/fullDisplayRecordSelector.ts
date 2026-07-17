import { createFeatureSelector, createSelector } from '@ngrx/store';

interface FullDisplayState {
  selectedRecordId: string | null;
}

interface SearchState {
  entities?: Record<string, unknown>;
}

const selectFullDisplay = createFeatureSelector<FullDisplayState>('full-display');
const selectSearchState = createFeatureSelector<SearchState>('Search');

const selectFullDisplayRecordId = createSelector(
  selectFullDisplay,
  (fullDisplay: FullDisplayState | undefined) => fullDisplay?.selectedRecordId ?? null
);

export const selectFullDisplayRecord = createSelector(
  selectFullDisplayRecordId,
  selectSearchState,
  (recordId: string | null, searchState: SearchState | undefined) => recordId ? searchState?.entities?.[recordId] ?? null : null
);
