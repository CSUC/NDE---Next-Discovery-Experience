import { AddonRuntimeProfile } from '../addon-profile.types';
import { CustomActionsToolbarComponent } from '../../app/custom-actions-toolbar/custom-actions-toolbar.component';

export const actionToolbarProfile: AddonRuntimeProfile = {
  key: 'action-toolbar',
  buildName: 'action-toolbar',
  selectorComponentMap: new Map<string, any>([
    ['nde-search-result-item-container', CustomActionsToolbarComponent]
  ])
};
