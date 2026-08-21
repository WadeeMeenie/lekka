# Managed Android Build Status

The authenticated Expo dashboard exposes the existing Lekka project at `@wmeenies-team/lekka`. The onboarding page supplied project ID `0e8876f7-32c7-49a9-a920-18677e401aa7` and directed release builds through EAS Build.

The verified GitHub release-candidate commit is `c52e0c0c38cd62978e31ed74c70808fbdfcec87b` on `main`.

The sandbox EAS CLI is not authenticated. Managed build submission is therefore being investigated through the authenticated project dashboard rather than changing product source or retrying the known constrained local worker.

The authenticated project dashboard shows no previous production builds. Its Builds page exposes a `Build from GitHub` entry but, after activation, only presents an empty-state message and no commit selector or submit button. The project’s GitHub connection therefore needs to be inspected before the managed build can be submitted from the browser.

The project GitHub settings page confirms that Expo has not yet been authorized to access the user’s GitHub repositories. This authorization is required before Expo can select commit `c52e0c0c38cd62978e31ed74c70808fbdfcec87b` and submit it to a managed build worker.

The user completed GitHub sign-in in the authorization flow. The browser returned to the authenticated GitHub dashboard; Expo’s final project-link state must now be rechecked.

The retried flow reached GitHub’s Expo authorization page for the authenticated `WadeeMeenie` account. It requests identity and email-read access and states that authorization redirects back to Expo. The user explicitly confirmed this authorization step.

After OAuth authorization, GitHub presented a separate Expo App installation screen. It offers either all-repository access or selected-repository access and requests read/write repository permissions for actions, administration, checks, code, commit statuses, deployments, issues, pull requests, hooks, and workflows. This broader installation has not been approved or completed.

The user confirmed a limited installation. The `Only select repositories` option is selected; the remaining step is to choose `WadeeMeenie/lekka` in GitHub’s repository selector and complete the already confirmed installation.

GitHub now confirms that exactly one repository, `WadeeMeenie/lekka`, is selected for the Expo App installation. No other user repository is selected.

The user-confirmed restricted installation completed and GitHub redirected to Expo with installation ID `155494860`. The callback page did not render a completion control, so the build workflow will continue by reopening the Expo project dashboard directly.

Expo now lists the connected `WadeeMeenie` account and preselects the sole authorized repository, `WadeeMeenie/lekka`, for attachment to the Lekka Expo project. The repository connection is ready to be finalized.

The restricted connection has completed: Expo reports `WadeeMeenie/lekka` as connected. It exposes managed build automation through EAS Workflows and GitHub build labels. The next action is to use the Builds flow to submit the existing release-candidate commit rather than changing application source.

The managed build form is available for the connected repository. It accepts a Git ref and a production build profile, but reports that no Android signing credentials are stored in EAS and that an Android build would fail until credentials are configured. The form leaves store submission disabled, so any build will produce a distribution artifact only.

The confirmed Expo-managed Android credential wizard is open. It has been given the existing application identifier `com.app.localradarsa`; no package identity, source code, user experience, or store-submission setting has been changed.
