import { deepClone, parseCandidateValue, serializeCandidateValue } from "./utils.js";

export const DISCOVERY_VERSION = "u1-local-seed-v1";

export function decideCandidate(candidates, key, decision, editedRawValue) {
  const allowed = new Set(["pending", "accepted", "edited", "rejected"]);
  if (!allowed.has(decision)) throw new Error(`Decisión inválida: ${decision}`);

  return candidates.map(candidate => {
    if (candidate.key !== key) return candidate;
    const updated = { ...candidate, decision };
    if (decision === "edited") {
      updated.editedValue = parseCandidateValue(editedRawValue, candidate.proposedValue);
    } else {
      updated.editedValue = undefined;
    }
    return updated;
  });
}

export function candidateDisplayValue(candidate) {
  const value = candidate.decision === "edited" ? candidate.editedValue : candidate.proposedValue;
  return serializeCandidateValue(value);
}

export function acceptedCandidates(candidates) {
  return candidates.filter(candidate => candidate.decision === "accepted" || candidate.decision === "edited");
}

export function rejectedCandidates(candidates) {
  return candidates.filter(candidate => candidate.decision === "rejected");
}

export function buildDiscoveryReceipt(candidates, consentedAt = new Date().toISOString()) {
  const completedAt = new Date().toISOString();
  return {
    version: DISCOVERY_VERSION,
    completedAt,
    consentedAt,
    sourceMode: "local-seed",
    acceptedFieldKeys: acceptedCandidates(candidates).map(candidate => candidate.key),
    rejectedFieldKeys: rejectedCandidates(candidates).map(candidate => candidate.key),
    sourceLabels: [...new Set(candidates.map(candidate => candidate.sourceLabel))]
  };
}

export function applyCandidatesToProfile(profile, candidates) {
  const next = deepClone(profile);
  for (const candidate of acceptedCandidates(candidates)) {
    const value = candidate.decision === "edited" ? candidate.editedValue : candidate.proposedValue;
    switch (candidate.key) {
      case "displayName": next.displayName = String(value); break;
      case "productInstance": next.instanceName = String(value); break;
      case "locationGeneral": next.locationGeneral = String(value); break;
      case "languages": next.languages = Array.isArray(value) ? value : [String(value)]; break;
      case "currentWork": next.currentWork = String(value); break;
      case "builderProfile": next.builderProfile = String(value); break;
      case "ecosystemRole": next.ecosystemRole = String(value); break;
      case "goals": next.goals = Array.isArray(value) ? value : [String(value)]; break;
      case "principles": next.principles = Array.isArray(value) ? value : [String(value)]; break;
      case "preferences": next.preferences = Array.isArray(value) ? value : [String(value)]; break;
      case "ecosystem": next.ecosystem = Array.isArray(value) ? value : [String(value)]; break;
      default: break;
    }
  }
  return next;
}

export function hasMinimumDecisions(candidates) {
  return candidates.some(candidate => candidate.decision === "accepted" || candidate.decision === "edited");
}
