import { createFeatureSelector, createSelector } from '@ngrx/store';

interface FullDisplayState {
  selectedRecordId: string | null;
}

interface SearchState {
  entities?: Record<string, unknown>;
}

const selectFullDisplay = createFeatureSelector<FullDisplayState>('full-display');
const selectSearchState = createFeatureSelector<SearchState>('Search');

export const selectFullDisplayRecordId = createSelector(
  selectFullDisplay,
  (fullDisplay: FullDisplayState | undefined) => fullDisplay?.selectedRecordId ?? null
);

export const selectSearchEntities = createSelector(
  selectSearchState,
  (searchState: SearchState | undefined) => searchState?.entities ?? {}
);

export const selectFullDisplayRecord = createSelector(
  selectFullDisplayRecordId,
  selectSearchEntities,
  (recordId: string | null, entities: Record<string, unknown>) => {
    if (!recordId) {
      return null;
    }

    const normalizedRecordId = recordId.replace(/^alma/i, '');
    return entities[recordId] ?? entities[normalizedRecordId] ?? entities[`alma${normalizedRecordId}`] ?? null;
  }
);


export const selectSearchRecordById = (recordId: string | null) => createSelector(
  selectSearchEntities,
  (entities: Record<string, unknown>) => {
    if (!recordId) {
      return null;
    }

    const normalizedRecordId = recordId.replace(/^alma/i, '');
    return entities[recordId] ?? entities[normalizedRecordId] ?? entities[`alma${normalizedRecordId}`] ?? null;
  }
);
