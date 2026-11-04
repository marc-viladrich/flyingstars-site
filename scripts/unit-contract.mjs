// Ein Testvertrag für npm, CI und den Editor-Kandidatenbuild.
export const UNIT_DIRECTORIES=['editor','editor/core','editor/test','scripts','src/scripts/effects','src/scripts'];
export const UNIT_ARGS=['--test','--test-concurrency=2',...UNIT_DIRECTORIES.map(dir=>`${dir}/*.test.mjs`)];
