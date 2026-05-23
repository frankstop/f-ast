# Compact Output

`f-ast` defaults to compact output because AI agents usually need a structural
map before they need full JSON.

```bash
f-ast examples/legacy-mixed
```

Compact output is line-oriented:

```text
project files=2 decls=11 refs=7 links=2 flow=26 hints=5 diagnostics=5
file examples/legacy-mixed/java/CustomerService.java lang=java parser=tree-sitter
decl class CustomerService file=examples/legacy-mixed/java/CustomerService.java span=5:14-5:29
ref call CustomerService.findCustomer.findById qualifier=repository resolved=no file=...
edge calls CustomerService.findCustomer -> repository.findById file=...
hint object-shape target=repository confidence=medium evidence="repository.findById()"
diag symbol.unresolved.member warning file=... msg="Unresolved call reference 'findById' on 'repository'."
```

## Profiles

- `agent`: default compact structural map.
- `full`: full CommonAST, SymbolGraph, FlowGraph, type hints, diagnostics.
- `symbols`: SymbolGraph only.
- `diagnostics`: diagnostics only.

```bash
f-ast examples/legacy-mixed --profile full
f-ast examples/legacy-mixed --symbols
f-ast examples/legacy-mixed --diagnostics
```

## JSON And YAML

JSON and YAML are explicit:

```bash
f-ast examples/legacy-mixed --json --profile full
f-ast examples/legacy-mixed --yaml --profile agent
f-ast examples/legacy-mixed --format compact
```

Use compact for prompts and retrieval summaries. Use JSON when another program
needs exact schemas.
