# Execution Contracts

> 7 contracts governing tool usage. Each exists because violating it caused a real defect.

## Contract 1: SCHEMA_QUERY
Before any data mutation, query the live schema. Column names from source, not memory.

## Contract 2: API_READ
Before importing any component/module, read its source. Check exports and interfaces haven't changed.

## Contract 3: FILE_WRITE
New files only. Never overwrite existing files with Write. Use Edit for existing files.

## Contract 4: FILE_EDIT
Surgical patches on existing content. Read back after every edit to confirm.

## Contract 5: FILE_PUSH
Max 5 files per push. Smaller pushes = easier diagnosis on failure.

## Contract 6: SQL_APPLY
Apply database changes, then run verification query. Verification written BEFORE the change.

## Contract 7: BROWSER_VERIFY
For frontend changes, verify in the browser. Snapshots, not file reads. The browser is the truth.
