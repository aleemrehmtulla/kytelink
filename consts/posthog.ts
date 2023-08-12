export enum PosthogEvents {
  KYTE_PAGE_HIT = 'server: kyte page hit',
  KYTE_LINK_HIT = 'server: kyte link hit',

  CREATED_ACCOUNT = 'server: created account',
  LOGGED_IN = 'server: logged in',

  HIT_LANDING = 'client: hit landing',
  HIT_AUTH = 'client: hit auth',
  HIT_EDIT = 'client: hit edit',

  CLICKED_GET_STARTED = 'client: clicked get started',
  CLICKED_SIGN_IN = 'client: clicked sign in',
  CLICKED_SIGN_UP = 'client: clicked sign up',
  CLICKED_VIEW_EXAMPLE = 'client: clicked view example',
  CLICKED_EXAMPLE_KYTE = 'client: clicked example kyte',

  UPDATED_USERNAME = 'client: updated username',
  UPDATED_AVATAR = 'client: updated avatar',
  ADDED_LINK = 'client: added link',

  ONBOARDING_STEP_1 = 'client: onboarding step 1',
  ONBOARDING_STEP_2 = 'client: onboarding step 2',
  ONBOARDING_STEP_3 = 'client: onboarding step 3',
  ONBOARDING_STEP_4 = 'client: onboarding step 4',
}
