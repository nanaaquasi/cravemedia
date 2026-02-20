# Commit and Push

Stage all modified and new source files, commit with a descriptive message, and push to the remote.

## Instructions

1. **Check status** – Run `git status` to see what has changed.

2. **Stage changes** – Add all relevant source files (exclude `.cursor/settings.json`, `.cursor/commands/`, and other IDE/config files unless explicitly requested). Use proper quoting for paths with brackets, e.g. `"src/app/collections/[id]/page.tsx"`.

3. **Commit** – Create a commit with a clear, descriptive message that summarizes the changes (e.g. feature added, bug fixed, refactor).

4. **Push** – Push the commit to the current branch on the remote.

## Notes

- Request `git_write` permission when staging and committing.
- Request `network` and `git_write` permissions when pushing.
- If the user provides a custom commit message, use it instead of generating one.
