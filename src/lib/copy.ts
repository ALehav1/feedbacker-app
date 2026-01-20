/**
 * Canonical copy strings for the Feedbacker app.
 * 
 * Working vs Live model:
 * - Working version = what the presenter is editing
 * - Live version = what participants see
 * - Publish updates = action that makes Working become Live
 * - Discard changes = revert Working back to Live
 */

export const TERMS = {
  working: "Working version",
  live: "Live version",
  publish: "Publish updates",
  discard: "Discard changes",
};

export const UNPUBLISHED_CHANGES_BAR = {
  title: "Updates ready to publish",

  body:
    "Participants currently see the live version. Your edits stay in your working version until you publish.",

  primaryAction: "Publish updates",
  secondaryAction: "Discard changes",

  helper:
    "Publishing updates refreshes the participant page and applies to future submissions.",

  viewLiveLink: "View live version",

  activeReassurance:
    "Feedback collection stays on while you edit.",
};

export const SESSION_STATUS = {
  sessionStatusLabel: "Session status",
  participantViewLabel: "Participant view",
  editsLabel: "Edits",

  participantViewValue: "Live",

  editsUpToDate: "Working · Up to date",
  editsUnpublished: "Working · Unpublished updates",
};

export const SECTION_INDICATORS = {
  edited: "Edited",
};

export const DASHBOARD_BADGES = {
  active: "Active",
  draft: "Draft",
  completed: "Completed",
  archived: "Archived",

  updatesPending: "Updates pending",

  updatesPendingTooltip:
    "You have unpublished updates. Participants still see the live version.",
};

export const ACTIVATION_COPY = {
  activateButton: "Start collecting feedback",

  activateHelper:
    "Publishing creates the live participant version. You can keep editing after this and publish updates anytime.",
};

export const NAVIGATION_GUARDRAIL = {
  title: "Leave without publishing?",

  body:
    "Your edits stay saved in your working version. Participants will keep seeing the live version until you publish.",

  stayButton: "Keep editing",
  leaveButton: "Leave",
};

export const PARTICIPANT_COPY = {
  instructions:
    "Tell the presenter which topics to cover more and which to cover less.",

  setupInProgressTitle: "Session setup in progress",
  setupInProgressBody: "Topics will appear soon.",
};

export const COPY_RULES = {
  noDraftLanguageInEditor:
    "Do not use 'draft' to describe editable content inside an Active session.",

  noParticipantWorkflowLanguage:
    "Do not describe publishing or editing mechanics to participants.",

  publishIsExplicit:
    "Publishing must always be a deliberate action with visible confirmation.",
};
