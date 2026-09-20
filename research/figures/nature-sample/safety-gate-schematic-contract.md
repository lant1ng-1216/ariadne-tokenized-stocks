# Figure Contract — Safety Gate and Execution Boundary

## Core conclusion

Ariadne separates asset interpretation and safety checks from user confirmation, signing, and broadcast side effects.

## Evidence chain

- Source: `src/domain/action-plan.ts`, `src/domain/safety.ts`, `src/services/executor.ts`, and domain/MCP tests
- Nodes: verified action-plan states and external execution boundaries
- Branch: failed safety checks preserve an explicit blocking reason

## Archetype

Schematic-led workflow figure. This is a mechanistic product diagram, not a quantitative performance claim.

## Limitation

The diagram shows control logic and responsibility boundaries; it does not imply that every path has been exercised against a funded production wallet.

## Export contract

Editable SVG and PDF plus 600 dpi PNG/TIFF.
