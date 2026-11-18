// Ein Testvertrag für npm, CI und den Editor-Kandidatenbuild.
export const UNIT_ROOTS = ['editor', 'scripts', 'src/scripts'];
const concurrency = process.env.FLYINGSTARS_UNIT_CONCURRENCY ?? '2';
if (!/^[1-9]\d*$/.test(concurrency)) throw Error('FLYINGSTARS_UNIT_CONCURRENCY muss eine positive Ganzzahl sein.');

export const UNIT_ARGS = ['--test', `--test-concurrency=${concurrency}`,
  ...UNIT_ROOTS.map(root => `${root}/**/*.test.mjs`)];
