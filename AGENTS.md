# TypeScript Rules

1. Avoid `any` at all costs.
2. Avoid casting stuff using `as unknown as X`. Always use correct types and let the compiler do inference.
3. Always specify input and output types of a function.
4. Prefer functional programming style to OO design.
5. Always mark fields of types/interfaces as `readonly`.
6. NEVER MUTATE FUNCTION ARGUMENTS.
7. Prefer immutable data to mutations. Do not use `let` variables.

# General rules

1. Keep @MEMORY.md file with all your important decisions, findings, and ideas. Never overwrite this file, only append.
2. Always verify your work by running `npm run build` to check types and `npm run lint` to lint your code.
3. Before attempting to fix your code manually, run `npm run lin -- --fix` to attempt automatic fixing.
4. Do not do `cd ${PWD}`, assume you operate in the project directory directly.
5. Before attempting to do a feature, plan its execution and write to `project/FEATURE-X.md` with `X` being the next consequitive number of all implemented features.
6. Treat `project/` directory as a Project Management system. Keep you plans, TODOs, notes there if needed.