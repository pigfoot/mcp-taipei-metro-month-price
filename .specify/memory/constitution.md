<!--
═══════════════════════════════════════════════════════════════════════════════
SYNC IMPACT REPORT
═══════════════════════════════════════════════════════════════════════════════

VERSION CHANGE: 0.0.0 → 1.0.0

RATIONALE: Initial constitution creation for new greenfield PoC project.
  - MAJOR version (1.0.0) chosen as this is the first ratification
  - Establishes foundational governance for Taipei Metro MCP project

MODIFIED PRINCIPLES:
  - N/A (initial creation)

ADDED SECTIONS:
  - I. PoC-First Simplicity
  - II. TypeScript + Bun Foundation
  - III. MCP Protocol Compliance
  - IV. Dual Integration (MCP + OpenAI Apps)
  - V. Iterative Validation
  - Technical Constraints
  - Quality Standards
  - Governance

REMOVED SECTIONS:
  - N/A (initial creation)

TEMPLATES REQUIRING UPDATES:
  ✅ .specify/templates/plan-template.md (reviewed - compatible)
  ✅ .specify/templates/spec-template.md (reviewed - compatible)
  ✅ .specify/templates/tasks-template.md (reviewed - compatible)
  ⚠️  Future command templates should reference this constitution for compliance gates

FOLLOW-UP TODOS:
  - None at this time
  - Future amendments should increment version per semantic versioning rules in Governance

═══════════════════════════════════════════════════════════════════════════════
-->

# Taipei Metro Month Price MCP Constitution

## Core Principles

### I. PoC-First Simplicity

**This is a proof-of-concept project.** All decisions prioritize demonstrating feasibility over production readiness.

- Simplest working implementation wins over optimized solutions
- Direct implementation preferred over abstraction layers
- Hardcoded test data acceptable for initial validation
- Performance optimization deferred unless blocking PoC validation
- Comprehensive testing deferred - focus on happy path validation only

**Rationale**: PoC projects must rapidly validate technical feasibility. Premature optimization, extensive testing, or over-engineering waste time on features that may be discarded after validation.

### II. TypeScript + Bun Foundation

**Technology stack is fixed:** TypeScript compiled/executed with Bun runtime from scratch.

- No framework dependencies unless essential for MCP/OpenAI integration
- Pure TypeScript implementation for all core logic
- Bun-native APIs preferred over Node.js compatibility shims
- ES modules (`import`/`export`) mandatory - no CommonJS
- Type safety enforced (`strict: true` in tsconfig) but `any` acceptable for rapid prototyping

**Rationale**: Consistency in tooling reduces cognitive load and build complexity. Bun's speed enables faster iteration cycles critical for PoC work.

### III. MCP Protocol Compliance

**Model Context Protocol (MCP) server implementation must adhere to official specification.**

- Server must expose tools/resources per MCP schema
- Request/response payloads must validate against MCP JSON-RPC format
- Transport layer must support stdio (minimum) for local testing
- Client integration tested with official MCP client (e.g., Claude Desktop)

**Rationale**: Non-compliant implementations fail integration with MCP clients, invalidating the entire PoC objective.

### IV. Dual Integration (MCP + OpenAI Apps)

**Server must support both MCP clients AND OpenAI Apps SDK (2025).**

- Same core fare calculation logic shared between integrations
- Separate adapter layers for MCP protocol vs OpenAI Apps API
- OpenAI Apps integration validated with official SDK test harness
- Transport independence - MCP stdio, OpenAI Apps HTTP/WebSocket

**Rationale**: Demonstrating cross-platform AI assistant integration is a primary PoC success criterion. Shared logic prevents divergent implementations.

### V. Iterative Validation

**Each feature increment must be independently demonstrable.**

- Implement one fare calculation scenario completely before adding complexity
- Manual testing via CLI/REPL acceptable before automated tests
- Document validation steps in quickstart or testing notes
- Break changes into smallest possible demonstrable units

**Rationale**: PoC projects risk scope creep. Incremental validation ensures core value is proven before expanding features.

## Technical Constraints

### Data & Business Logic

- **Fare data**: Taipei Metro fare rules may be hardcoded or loaded from static JSON files
- **Frequent rider discounts**: Simplified discount logic acceptable (e.g., flat percentage vs. tiered)
- **Station database**: Minimal station data sufficient for PoC (10-20 stations acceptable)
- **Real-time data**: NOT required - static schedules/fares sufficient

### Integration Points

- **MCP server**: Expose `calculate_fare` and `get_discount_info` tools minimum
- **OpenAI Apps**: Provide equivalent endpoints/functions via Apps SDK adapters
- **Error handling**: Return descriptive error messages; detailed error taxonomy deferred
- **Authentication**: NOT required for PoC

### Performance & Scale

- **Latency**: Sub-second response acceptable for PoC
- **Concurrency**: Single-threaded execution acceptable
- **Data volume**: Support <100 station pairs
- **Optimization**: Defer unless response time exceeds 5 seconds

## Quality Standards

### Code Quality (Relaxed for PoC)

- **Formatting**: Use Prettier with default config
- **Linting**: ESLint with TypeScript recommended rules (warnings acceptable, not blockers)
- **Testing**: Manual validation sufficient; automated tests optional
- **Documentation**: Inline comments for complex logic; external docs deferred

### Validation Gates

Every commit MUST:
- Compile without TypeScript errors (`bun build` or `bun run type-check`)
- Run without runtime crashes for implemented scenarios
- Include updated usage examples if public API changed

Every commit SHOULD (not blockers):
- Pass linter checks
- Include test coverage
- Update documentation

### Complexity Justification

**ANY** of the following require explicit justification in plan.md:

- Adding npm dependencies beyond MCP SDK, OpenAI SDK, and dev tools
- Introducing database storage (SQLite, PostgreSQL, etc.)
- Implementing caching layers
- Adding authentication/authorization
- Performance optimizations (indexing, memoization, etc.)

**Rationale**: PoC scope creep is fatal. Complexity must serve PoC validation objectives.

## Governance

### Amendment Process

1. Propose amendment with rationale in PR/discussion
2. Update constitution.md with changes
3. Increment CONSTITUTION_VERSION per semantic versioning:
   - **MAJOR**: Principle removal or backward-incompatible changes (e.g., removing PoC-First)
   - **MINOR**: New principle added or significant expansion (e.g., adding Security principle)
   - **PATCH**: Clarifications, wording fixes, non-semantic changes
4. Update LAST_AMENDED_DATE to amendment date
5. Propagate changes to dependent templates (plan, spec, tasks)

### Compliance

- All `/speckit.plan` outputs must include Constitution Check gate referencing these principles
- All `/speckit.tasks` outputs must flag complexity violations for justification
- Constitution supersedes all other practices - when in conflict, constitution wins

### Migration to Production

**When PoC graduates to production project**, re-ratify constitution with:

- Replace Principle I (PoC-First) with Production-Ready principles (testing, performance, security)
- Add authentication, observability, versioning requirements
- Update Technical Constraints for production scale
- MAJOR version bump to 2.0.0

**Version**: 1.0.0 | **Ratified**: 2025-10-28 | **Last Amended**: 2025-10-28
