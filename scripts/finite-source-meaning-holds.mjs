// Exact frozen finite semantics only. A photograph review cannot release them.
import{isMetalBeadCandidate,isMetalBeadEligible}from'./prepare-metal-bead-finite.mjs';
import{isNaturalStoneCandidate,isNaturalStoneEligible}from'./prepare-natural-stone-finite.mjs';
import{isPearlBodyCandidate,isPearlBodyEligible}from'./prepare-pearl-body-finite.mjs';
import{isOfficialPhotoCandidate,isOfficialPhotoEligible}from'./prepare-official-dimension-finite.mjs';
export const isFiniteSourceMeaningHeld=id=>
 (isMetalBeadCandidate(id)&&!isMetalBeadEligible(id))||
 (isNaturalStoneCandidate(id)&&!isNaturalStoneEligible(id))||
 (isPearlBodyCandidate(id)&&!isPearlBodyEligible(id))||
 (isOfficialPhotoCandidate(id)&&!isOfficialPhotoEligible(id));
export function assertFiniteSourceMeaningEligible(id){if(isFiniteSourceMeaningHeld(id))throw Error('FINITE_SOURCE_MEANING_HELD');}
