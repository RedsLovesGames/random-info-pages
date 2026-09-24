import {landingRotationForIndex} from './geometry.js';
export function easeOutQuint(t){const x=Math.min(1,Math.max(0,t));return 1-(1-x)**5}
export function createSpinPlan({segments,winnerIndex,currentRotation=0,durationMs=5200,extraTurns=6,reducedMotion=false}){const turns=reducedMotion?0:extraTurns;return{initialRotation:currentRotation,finalRotation:landingRotationForIndex(segments,winnerIndex,currentRotation,turns),durationMs:reducedMotion?Math.min(300,durationMs):Math.max(250,durationMs)}}
