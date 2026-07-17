import { AddonRuntimeProfile } from './addon-profile.types';
import { actionToolbarProfile } from './action-toolbar';

const addonProfiles: Record<string, AddonRuntimeProfile> = {
  'action-toolbar': actionToolbarProfile
};

export function resolveAddonRuntimeProfile(addonKey: string): AddonRuntimeProfile {
  const profile = addonProfiles[addonKey];

  if (!profile) {
    throw new Error(`Unknown add-on runtime profile "${addonKey}".`);
  }

  return profile;
}
