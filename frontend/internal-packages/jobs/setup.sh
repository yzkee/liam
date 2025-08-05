#!/bin/bash

# Copy required WASM and data files for PGlite and Ruby Prism

# Copy prism.wasm from db-structure package
PRISM_WASM_SOURCE="../../packages/schema/node_modules/@ruby/prism/src/prism.wasm"
if [ -f "$PRISM_WASM_SOURCE" ]; then
    cp "$PRISM_WASM_SOURCE" prism.wasm
    echo "✓ Copied prism.wasm"
else
    echo "⚠ prism.wasm not found, skipping"
fi

# Copy pglite.data from pglite-server package
PGLITE_DATA_SOURCE="../../packages/pglite-server/node_modules/@electric-sql/pglite/dist/pglite.data"
if [ -f "$PGLITE_DATA_SOURCE" ]; then
    cp "$PGLITE_DATA_SOURCE" .
    echo "✓ Copied pglite.data"
else
    echo "⚠ pglite.data not found, skipping"
fi

# Copy pglite.wasm from pglite-server package
PGLITE_WASM_SOURCE="../../packages/pglite-server/node_modules/@electric-sql/pglite/dist/pglite.wasm"
if [ -f "$PGLITE_WASM_SOURCE" ]; then
    cp "$PGLITE_WASM_SOURCE" .
    echo "✓ Copied pglite.wasm"
else
    echo "⚠ pglite.wasm not found, skipping"
fi
