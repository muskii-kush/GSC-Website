# Restore the application Sheet after IMPORTDATA exceeds its limit

The production Sheet's A1 import reported `Resource at url contents exceeded maximum size` on 11 November 2026. The authenticated source CSV remained available: 334 unique applications, 85 columns and 2,968,224 bytes. These figures describe the diagnostic download, not a fixed expected count.

The replacement reads that same private CSV through Apps Script, validates it, writes a hidden staging tab in batches of 100 rows, then publishes values into the original Sheet1 in one atomic Google Sheets API request. New applications appear on the next successful scheduled refresh. No website deployment, new Cloudflare binding, new Sheet or public Apps Script web app is required.

## One-time setup by the Sheet owner

1. Open [GSC 2027 Applications](https://docs.google.com/spreadsheets/d/1YkL9tQyJrpG4sUsNDl7XVIQag9VvEGCowMY0MMnhT5c/edit#gid=0), using the Google Workspace account that should own the scheduled refresh.
2. Select **Extensions → Apps Script**. Add a **new script file** named `gsc_sheet_sync` and paste the complete contents of [gsc_sheet_sync.gs](./apps-script/gsc_sheet_sync.gs). Preserve any existing mailer, receiver and other script files.
3. In the Apps Script editor, next to **Services**, select **+**, choose **Google Sheets API** (identifier `Sheets`, version `v4`), and select **Add**. For the default Apps Script Cloud project, Google enables the API automatically. A custom Cloud project requires its owner to enable the Sheets API there too. [Google instructions](https://developers.google.com/apps-script/guides/services/advanced)
4. Save, select **setupGscSheetSync** from the function dropdown, then select **Run** and approve the requested access. Leave the existing A1 formula in place until this run finishes: setup reads its private key automatically into Script Properties. Do not paste the key into source code or a message.
5. Allow the first full download to finish; the production export can take a few minutes. Check **Executions** for `gsc-sheet-sync-completed` followed by `gsc-sheet-schedule-installed`. Reload Sheet1 and verify the application rows and pitch-deck links. A1's note shows the last successful sync time (UTC) and row count.
6. In Apps Script **Triggers**, confirm one `syncGscApplications` time-driven trigger running every **15 minutes**. Run setup from one owner account only: triggers are owned by their creator, and one account cannot remove another account's triggers. [Google trigger documentation](https://developers.google.com/apps-script/guides/triggers/installable)

**Do not deploy this as a web app. Do not delete the old formula manually first.** Setup replaces it only after downloading and validating the full data. Once the initial sync succeeds, run `syncGscApplications` whenever an immediate refresh is needed. Re-running setup from the same account replaces only this script's scheduled trigger and preserves unrelated triggers.

## Data preservation and failure handling

- The original spreadsheet, Sheet1 ID, column order, formatting and frozen header are preserved. The hidden `__GSC_SYNC_STAGING` tab is managed by the script; leave it in place. Source application records in R2 are read only.
- Feed HTTP errors, HTML/challenge pages, malformed CSV, duplicate IDs, empty feeds, missing existing application IDs and failed staging writes abort before publishing. The previous Sheet1 data remains visible.
- Publishing clears/replaces only the CSV-managed values in one atomic batch, so a failed API request cannot leave Sheet1 cleared halfway through. The sync does not alter other tabs or columns to the right of the export. Keep review notes in a separate tab, because the exported columns are refreshed from source.
- A schema/header change or a changed Sheet1 formula stops the sync for review. Do not bypass this check by clearing the tab. If the feed key is rotated, update **Project Settings → Script Properties → GSC_SHEET_KEY** to the production `SHEET_KEY`.
- Execution logs contain stage, result, row/column counts, time and a support reference when available. They omit raw provider errors, feed URLs, secrets and application answers. An HTTP 403 needs Cloudflare Security Events investigation using the logged support reference.
- The schedule remains subject to [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas), including the execution-time and URL-fetch response limits. Use the Workspace owner account. A timeout leaves the prior Sheet1 snapshot available; inspect Executions rather than clearing the Sheet. If the export outgrows the fetch/runtime limits, move to paginated/incremental sync.

Google documents that a Sheets batch is [validated and applied atomically](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate). This script uses that API only for the final publish, after staging is complete.

## Verification

Run `node --test tests/sheet-sync.test.mjs` for failure isolation, preservation of existing application IDs, batching, formula safety and repeatable trigger setup. These tests simulate Apps Script services locally; the owner must complete the first authorized Google execution and verify Sheet1 to activate the live schedule.
