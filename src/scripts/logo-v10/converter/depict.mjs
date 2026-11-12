// v5 (Part 3): the depiction score used to choose the spacing. The implementation is the validated proxy in
// eval/proxy (pure JavaScript, no Node APIs); see eval/proxy/VALIDATION.md for how well it predicts the blind
// reviewers. It is imported, not copied, so that the converter is judged by exactly the validated code.
// v8: the converter's own copy of the proxy (src-v8/proxy, runtime modules only), so internal speed-ups never change the
// yardstick in eval/proxy that the benchmarks and blind comparisons judge with
import { analyse, depiction as depict } from './proxy/score.mjs';

export const depictTarget = image => analyse(image);
export const depiction = (T, result) => depict(T, result);

// Expected share of blind reviewers who name the logo from a picture with this depiction score: logistic fit
// (IRLS) of every reviewer verdict in eval/labels.json on the score of its picture (eval/proxy/VALIDATION.md).
export const NAMING = { a: -1.24, b: 5.11 };
export const namingProbability = score => 1 / (1 + Math.exp(-(NAMING.a + NAMING.b * score)));
